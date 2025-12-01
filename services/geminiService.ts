
import { GoogleGenAI, Type, RequestOptions } from "@google/genai";
import { Level, RunResult, Language } from "../types";

// NOTE: In a production app, it is strictly recommended to move API calls to a backend 
// (e.g. Vercel Serverless Functions) to keep the API_KEY secret.
// Since this is a client-side demo, the Key is embedded in the JS bundle at BUILD time.

export interface ApiConfig {
    apiKey: string;
    baseUrl?: string;
    customModel?: string;
    isCustom: boolean;
}

// Helper to check multiple env var permutations
const getEnvVar = (key: string): string | undefined => {
    // Check standard, NEXT_PUBLIC_, VITE_, and REACT_APP_ prefixes
    // Parcel typically inlines process.env.KEY, so we must access them explicitly or hope the bundler maps them.
    // NOTE: Direct access is required for most bundlers (Vite/Parcel) to statically analyze and replace.
    
    // We try direct access first (most common)
    if (process.env[key]) return process.env[key];
    if (process.env[`NEXT_PUBLIC_${key}`]) return process.env[`NEXT_PUBLIC_${key}`];
    if (process.env[`VITE_${key}`]) return process.env[`VITE_${key}`];
    if (process.env[`REACT_APP_${key}`]) return process.env[`REACT_APP_${key}`];
    
    return undefined;
}

export const getConfig = (): ApiConfig => {
    try {
        // Prioritize Custom Keys
        const xKey = getEnvVar('X_API_KEY');
        const stdKey = getEnvVar('API_KEY');
        
        // Support both X_API_URL and X_BASE_URL
        let xUrl = getEnvVar('X_API_URL') || getEnvVar('X_BASE_URL');
        
        // Sanitization: Remove trailing slash
        if (xUrl && xUrl.endsWith('/')) {
            xUrl = xUrl.slice(0, -1);
        }

        const xModel = getEnvVar('X_API_MODEL');

        const config = {
            apiKey: xKey || stdKey || '',
            baseUrl: xUrl || undefined, 
            customModel: xModel || undefined,
            isCustom: !!xUrl
        };

        // Debug Log (Visible in Browser Console)
        if (typeof window !== 'undefined') {
             // Only log once to avoid spam
             if (!(window as any).__GEMINI_CONFIG_LOGGED__) {
                 console.log(`[GeminiService] Config Loaded:`, {
                     hasKey: !!config.apiKey,
                     baseUrl: config.baseUrl || 'DEFAULT (Google)',
                     model: config.customModel || 'DEFAULT',
                     isCustom: config.isCustom
                 });
                 (window as any).__GEMINI_CONFIG_LOGGED__ = true;
             }
        }

        return config;
    } catch (e) {
        return { apiKey: '', isCustom: false };
    }
};

const getClient = () => {
    const { apiKey, baseUrl } = getConfig();

    if (!apiKey) {
        console.warn("API Key is missing. Please check your Vercel Environment Variables and REDEPLOY.");
    }
    
    const options: any = { apiKey };
    
    if (baseUrl) {
        options.baseUrl = baseUrl;
        
        // COMPATIBILITY FIX for Third-Party Proxies (OneAPI, NewAPI, etc.)
        // These proxies often require the key in the 'Authorization' header.
        // We add both 'x-goog-api-key' (SDK default) and 'Authorization' to be safe.
        options.defaultRequestOptions = {
            customHeaders: {
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://prompt-ctf.vercel.app',
                'X-Title': 'PromptCTF',
                // Some proxies require forcing the content type
                'Content-Type': 'application/json' 
            }
        };
    }

    return new GoogleGenAI(options);
}

export const generateResponse = async (prompt: string, modelId: string): Promise<string> => {
    try {
        const client = getClient();
        const { customModel, baseUrl } = getConfig();
        
        // If user defined X_API_MODEL, force use that model instead of the game's selection
        const targetModel = customModel || modelId;

        console.log(`[GeminiService] Generating... URL: ${baseUrl || 'Google'}, Model: ${targetModel}`);

        const response = await client.models.generateContent({
            model: targetModel,
            contents: prompt,
        });
        return response.text || "No response generated.";
    } catch (error: any) {
        console.error("Generation Error Details:", error);
        
        let errorMsg = `Error: ${error.message}`;
        if (error.message?.includes('404')) {
            errorMsg += " (404 Not Found: Check your X_BASE_URL. It should likely not have /v1beta at the end, or your proxy doesn't support the Gemini Protocol.)";
        }
        if (error.message?.includes('400') && error.message?.includes('API key')) {
             errorMsg += " (400 Invalid Key: The request reached the server, but the Key was rejected. If using a Proxy, ensure the Proxy accepts this Key format.)";
        }
        
        return errorMsg;
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
