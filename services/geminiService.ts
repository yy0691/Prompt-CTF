import { GoogleGenAI, Type } from "@google/genai";
import { Level, RunResult, Language } from "../types";

// NOTE: In a real app, this should be handled via backend proxy to hide API keys.
// For this demo, we assume the environment variable is present or the user provides it.
const getClient = () => {
    let apiKey = '';
    // Safety check for process.env access to avoid ReferenceError in browser
    try {
        if (typeof process !== 'undefined' && process.env) {
            apiKey = process.env.API_KEY || '';
        }
    } catch (e) {
        console.warn("Unable to access process.env");
    }

    if (!apiKey) {
        console.warn("API Key is missing. Calls will fail.");
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