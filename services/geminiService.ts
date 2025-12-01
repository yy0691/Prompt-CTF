import { GoogleGenAI, Type } from "@google/genai";
import { Level, RunResult, Language } from "../types";

// NOTE: In a production app, it is strictly recommended to move API calls to a backend 
// (e.g. Vercel Serverless Functions) to keep the API_KEY secret.
// Since this is a client-side demo, the Key is embedded in the JS bundle at BUILD time.

const getApiKey = () => {
    try {
        // Parcel/Vite will replace 'process.env.API_KEY' with the actual string value during the build process.
        // If the variable is not set during build, this usually resolves to undefined.
        return process.env.API_KEY || '';
    } catch (e) {
        // Fallback for environments where process is not defined at all
        return '';
    }
};

const getClient = () => {
    const apiKey = getApiKey();

    if (!apiKey) {
        console.warn("API Key is missing. Please check your Vercel Environment Variables and REDEPLOY.");
    }
    
    return new GoogleGenAI({ apiKey });
}

export const generateResponse = async (prompt: string, modelId: string): Promise<string> => {
    try {
        const client = getClient();
        const response = await client.models.generateContent({
            model: modelId,
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
            model: 'gemini-2.5-flash',
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