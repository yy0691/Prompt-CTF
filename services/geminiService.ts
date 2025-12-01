
import { GoogleGenAI, Type, RequestOptions } from "@google/genai";
import { Level, RunResult, Language } from "../types";

// NOTE: In a production app, it is strictly recommended to move API calls to a backend 
// (e.g. Vercel Serverless Functions) to keep the API_KEY secret.
// Since this is a client-side demo, the Key is embedded in the JS bundle at BUILD time.

interface ApiConfig {
    apiKey: string;
    baseUrl?: string;
    customModel?: string;
}

const getConfig = (): ApiConfig => {
    try {
        // Prioritize X_API_... variables if set (User custom proxy settings)
        // We access process.env directly to ensure bundlers (Parcel/Vite) pick them up during build.
        const xKey = process.env.X_API_KEY;
        const stdKey = process.env.API_KEY;
        
        // Support both X_API_URL (documented) and X_BASE_URL (common user preference)
        // Sanitization: Remove trailing slash to prevent double slashes in SDK constructed paths
        let xUrl = process.env.X_API_URL || process.env.X_BASE_URL;
        if (xUrl && xUrl.endsWith('/')) {
            xUrl = xUrl.slice(0, -1);
        }

        const xModel = process.env.X_API_MODEL;

        return {
            apiKey: xKey || stdKey || '',
            baseUrl: xUrl || undefined, 
            customModel: xModel || undefined
        };
    } catch (e) {
        return { apiKey: '' };
    }
};

const getClient = () => {
    const { apiKey, baseUrl } = getConfig();

    if (!apiKey) {
        console.warn("API Key is missing. Please check your Vercel Environment Variables and REDEPLOY.");
    }
    
    // Construct options object dynamically. 
    // Passing 'undefined' as baseUrl to the SDK can sometimes cause it to fail to fallback to default.
    const options: any = { apiKey };
    
    if (baseUrl) {
        // IMPORTANT: The SDK expects the base URL to NOT have a version path usually, 
        // but for some proxies, we might need to be specific.
        // However, standard Google GenAI behavior is baseUrl + /v1beta/...
        options.baseUrl = baseUrl;
        console.log(`[GeminiService] Using Custom Base URL: ${baseUrl}`);

        // COMPATIBILITY FIX: 
        // Many 3rd party proxies (OneAPI/NewAPI) expect 'Authorization: Bearer <KEY>' 
        // even for Gemini endpoints, whereas Google native uses 'x-goog-api-key'.
        // We add the Bearer token to ensure the proxy authenticates the request correctly.
        options.defaultRequestOptions = {
            customHeaders: {
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://prompt-ctf.vercel.app', // Some proxies require referer
                'X-Title': 'PromptCTF'
            }
        };
    }

    return new GoogleGenAI(options);
}

export const generateResponse = async (prompt: string, modelId: string): Promise<string> => {
    try {
        const client = getClient();
        const { customModel } = getConfig();
        
        // If user defined X_API_MODEL, force use that model instead of the game's selection
        const targetModel = customModel || modelId;

        console.log(`[GeminiService] Generating with model: ${targetModel}`);

        const response = await client.models.generateContent({
            model: targetModel,
            contents: prompt,
        });
        return response.text || "No response generated.";
    } catch (error: any) {
        console.error("Generation Error", error);
        return `Error: ${error.message}`;
    }
};

export const judgeSubmission = async (level: Level, userPrompt: string, modelOutput: string, lang: Language): Promise<RunResult> => {
    try {
        const client = getClient();
        const { customModel } = getConfig();
        
        // Use custom model if defined, otherwise default to flash for judging
        const targetModel = customModel || 'gemini-2.5-flash';

        const judgeSystemPrompt = `
        You are an impartial CTF Judge (Capture The Flag) for a prompt engineering competition.
        
        Current Language Context: ${lang === 'zh' ? 'Chinese (Simplified)' : 'English'}
        Please provide feedback in ${lang === 'zh' ? 'Chinese' : 'English'}.

        LEVEL OBJECTIVE: ${level.description}
        WIN CRITERIA: ${level.winCriteria}
        
        PLAYER'S PROMPT:
        """
        ${userPrompt}
        """
        
        MODEL'S OUTPUT (Result of player's prompt):
        """
        ${modelOutput}
        """
        
        Analyze if the Model's Output successfully meets the Win Criteria based on the Player's Prompt.
        Be strict but fair. 
        
        Return JSON structure:
        {
            "success": boolean,
            "feedback": "Short explanation of why they passed or failed (in ${lang === 'zh' ? 'Chinese' : 'English'}).",
            "flag": "Flag string (only if success is true)"
        }
        `;

        const response = await client.models.generateContent({
            model: targetModel,
            contents: judgeSystemPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        success: { type: Type.BOOLEAN },
                        feedback: { type: Type.STRING },
                        flag: { type: Type.STRING },
                    },
                    required: ["success", "feedback"]
                }
            }
        });

        const resultJson = JSON.parse(response.text || "{}");
        
        // Generate a synthetic flag if one wasn't provided by the judge model logic
        const finalFlag = resultJson.success ? `CTF{${level.id}_CLEARED_${Math.floor(Math.random() * 9999)}}` : undefined;

        return {
            success: resultJson.success,
            feedback: resultJson.feedback || "Analysis complete.",
            flag: finalFlag,
            output: modelOutput
        };

    } catch (error: any) {
        return {
            success: false,
            feedback: `Judge System Error: ${error.message}`,
            output: modelOutput
        };
    }
};
