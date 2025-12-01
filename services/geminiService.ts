
import { GoogleGenAI, Type, RequestOptions } from "@google/genai";
import { Level, RunResult, Language } from "../types";

// --- Configuration Types ---
export interface ServiceConfig {
    apiKey: string;
    baseUrl?: string;
    model?: string;
}

export interface AppConfig {
    official: ServiceConfig;
    custom: ServiceConfig;
    hasOfficial: boolean;
    hasCustom: boolean;
}

// --- Environment Variable Access ---
// CRITICAL: Bundlers (Parcel/Webpack/Next.js) replace `process.env.VAR` with strings at build time.
// We MUST access them explicitly. Dynamic access like `process.env[key]` often returns undefined.
const ENV = {
    // Official
    API_KEY: process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY || process.env.VITE_API_KEY || process.env.REACT_APP_API_KEY,
    
    // Custom Base URL
    X_BASE_URL: process.env.X_BASE_URL || process.env.NEXT_PUBLIC_X_BASE_URL || process.env.VITE_X_BASE_URL || process.env.REACT_APP_X_BASE_URL || 
                process.env.X_API_URL || process.env.NEXT_PUBLIC_X_API_URL,
    
    // Custom API Key
    X_API_KEY: process.env.X_API_KEY || process.env.NEXT_PUBLIC_X_API_KEY || process.env.VITE_X_API_KEY || process.env.REACT_APP_X_API_KEY,
    
    // Custom Model
    X_API_MODEL: process.env.X_API_MODEL || process.env.NEXT_PUBLIC_X_API_MODEL || process.env.VITE_X_API_MODEL || process.env.REACT_APP_X_API_MODEL,
};

// --- Configuration Loader ---
export const getAppConfig = (): AppConfig => {
    // 1. Official Config
    const officialKey = ENV.API_KEY || '';

    // 2. Custom Config
    let customUrl = ENV.X_BASE_URL || '';
    // If user didn't provide a specific custom key, try to use the official key for the proxy
    const customKey = ENV.X_API_KEY || officialKey;
    const customModel = ENV.X_API_MODEL;

    // 3. Clean up Custom URL
    if (customUrl) {
        // Remove trailing slash
        if (customUrl.endsWith('/')) {
            customUrl = customUrl.slice(0, -1);
        }
        // Remove standard SDK suffixes if user pasted the full endpoint
        // The SDK adds /v1beta/models/... automatically. We need the ROOT or BASE path.
        // e.g. https://x666.me/v1beta -> https://x666.me
        customUrl = customUrl.replace(/\/v1beta\/models.*$/, '');
        customUrl = customUrl.replace(/\/v1beta$/, '');
        customUrl = customUrl.replace(/\/goog$/, ''); // Some proxies use /goog
    }

    return {
        official: {
            apiKey: officialKey,
        },
        custom: {
            apiKey: customKey,
            baseUrl: customUrl,
            model: customModel
        },
        hasOfficial: !!officialKey,
        hasCustom: !!customUrl // We consider custom available if a URL is provided
    };
};

// --- Client Factory ---
const getClient = (mode: 'official' | 'custom') => {
    const config = getAppConfig();
    const targetConfig = mode === 'custom' ? config.custom : config.official;

    if (!targetConfig.apiKey) {
        console.warn(`[GeminiService] Missing API Key for mode: ${mode}`);
    }

    const options: any = { 
        apiKey: targetConfig.apiKey 
    };

    if (mode === 'custom' && targetConfig.baseUrl) {
        // console.log(`[GeminiService] Using Custom Proxy: ${targetConfig.baseUrl}`);
        options.baseUrl = targetConfig.baseUrl;
        
        // CUSTOM PROXY HEADERS
        // 1. Authorization: Bearer <key> (Required by OneAPI/NewAPI/Kong)
        // 2. Origin: Fake origin to bypass some CORS checks on restricted proxies
        options.defaultRequestOptions = {
            customHeaders: {
                'Authorization': `Bearer ${targetConfig.apiKey}`,
                'Content-Type': 'application/json',
                // 'Origin': 'http://localhost:1234' // Optional: Uncomment if proxy requires specific origin
            }
        };
    }

    return new GoogleGenAI(options);
};

// --- Public API ---

export const generateResponse = async (
    prompt: string, 
    modelId: string, 
    provider: 'official' | 'custom' = 'official'
): Promise<string> => {
    try {
        const config = getAppConfig();
        
        // If user selected custom but no URL is set, fallback to official (or fail if official missing)
        const effectiveProvider = (provider === 'custom' && !config.hasCustom) ? 'official' : provider;
        
        const client = getClient(effectiveProvider);
        
        // Determine model: Custom mode can override the model selection via Env Var
        let targetModel = modelId;
        if (effectiveProvider === 'custom' && config.custom.model) {
            targetModel = config.custom.model;
        }

        console.log(`[GeminiService] Generating... Provider: ${effectiveProvider.toUpperCase()} | URL: ${effectiveProvider === 'custom' ? config.custom.baseUrl : 'Google'} | Model: ${targetModel}`);

        const response = await client.models.generateContent({
            model: targetModel,
            contents: prompt,
        });
        
        return response.text || "No response generated.";
    } catch (error: any) {
        console.error("Generation Error:", error);
        
        let hint = "";
        if (provider === 'custom') {
            hint = `\n[Check X_BASE_URL]: Current is "${getAppConfig().custom.baseUrl}". Ensure it is the root (e.g. https://api.proxy.com) NOT including /v1beta/models.`;
        }
        
        return `System Error (${provider.toUpperCase()}): ${error.message}${hint}`;
    }
};

export const judgeSubmission = async (
    level: Level, 
    userPrompt: string, 
    modelOutput: string, 
    lang: Language,
    provider: 'official' | 'custom' = 'official'
): Promise<RunResult> => {
    try {
        const config = getAppConfig();
        
        // Use the same provider logic as generation
        const effectiveProvider = (provider === 'custom' && !config.hasCustom) ? 'official' : provider;
        const client = getClient(effectiveProvider);
        
        let targetModel = 'gemini-2.5-flash';
        if (effectiveProvider === 'custom' && config.custom.model) {
            targetModel = config.custom.model;
        }

        const judgeSystemPrompt = `
        You are an impartial CTF Judge.
        Language: ${lang === 'zh' ? 'Chinese' : 'English'}
        
        LEVEL: ${level.description}
        CRITERIA: ${level.winCriteria}
        
        PROMPT:
        """
        ${userPrompt}
        """
        
        OUTPUT:
        """
        ${modelOutput}
        """
        
        Return JSON:
        {
            "success": boolean,
            "feedback": "string",
            "flag": "string (optional)"
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
            feedback: `Judge System Error (${provider}): ${error.message}`,
            output: modelOutput
        };
    }
};
