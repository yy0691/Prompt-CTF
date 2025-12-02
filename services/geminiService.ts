
import { GoogleGenAI, Type } from "@google/genai";
import { Level, RunResult, Language } from "../types";

// --- Storage Keys ---
export const STORAGE_KEYS = {
    API_KEY: 'prompt_ctf_api_key',
    OFFICIAL_BASE_URL: 'prompt_ctf_official_base_url',
    CUSTOM_URL: 'prompt_ctf_custom_url',
    CUSTOM_KEY: 'prompt_ctf_custom_key',
    CUSTOM_MODEL: 'prompt_ctf_custom_model'
};

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
    // Check LocalStorage first, then Env
    const localApiKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.API_KEY) : null;
    const localOfficialBaseUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.OFFICIAL_BASE_URL) : null;
    
    const localCustomUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.CUSTOM_URL) : null;
    const localCustomKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.CUSTOM_KEY) : null;
    const localCustomModel = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.CUSTOM_MODEL) : null;

    const officialKey = localApiKey || ENV.API_KEY || '';
    const officialBaseUrl = localOfficialBaseUrl || undefined;

    let customUrl = localCustomUrl || ENV.X_BASE_URL || '';
    const customKey = localCustomKey || ENV.X_API_KEY || officialKey;
    const customModel = localCustomModel || ENV.X_API_MODEL;

    if (customUrl) {
        if (customUrl.endsWith('/')) {
            customUrl = customUrl.slice(0, -1);
        }
        // Normalize: We want the ROOT of the proxy, not the /v1beta part if user pasted it
        customUrl = customUrl.replace(/\/v1beta\/models.*$/, '');
        customUrl = customUrl.replace(/\/v1beta$/, '');
        customUrl = customUrl.replace(/\/goog$/, ''); 
    }

    return {
        official: { apiKey: officialKey, baseUrl: officialBaseUrl },
        custom: { apiKey: customKey, baseUrl: customUrl, model: customModel },
        hasOfficial: !!officialKey,
        hasCustom: !!customUrl
    };
};

// --- Official Client Factory ---
const getOfficialClient = () => {
    const config = getAppConfig();
    if (!config.official.apiKey) {
        console.warn(`[GeminiService] Missing Official API Key`);
    }
    // Pass baseUrl if configured (allows proxying the official SDK)
    return new GoogleGenAI({ 
        apiKey: config.official.apiKey,
        baseUrl: config.official.baseUrl 
    });
};

// --- Custom Fetch Implementation ---
// Completely independent from @google/genai SDK to ensure maximum compatibility with proxies
const fetchCustomGemini = async (
    baseUrl: string, 
    apiKey: string, 
    model: string, 
    body: any
) => {
    // 1. Construct URL
    // We strictly assume the proxy supports the standard Google Gemini REST API signature:
    // POST /v1beta/models/{model}:generateContent
    const cleanBase = baseUrl.replace(/\/+$/, '');
    const endpoint = `${cleanBase}/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // 2. Prepare Headers
    // We send Auth in multiple places to satisfy different proxy requirements (OneAPI, Kong, Nginx, etc.)
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,   // Standard for OpenAI-compatible / OneAPI proxies
        'x-goog-api-key': apiKey               // Standard for Google-compatible proxies
    };

    console.log(`[CustomService] POST ${endpoint}`);

    // 3. Execute Request
    const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const text = await response.text();
        let errorMsg = text;
        try {
            const json = JSON.parse(text);
            // Try to dig out the error message from various common error formats
            errorMsg = json.error?.message || 
                       json.error?.details?.[0]?.message || 
                       JSON.stringify(json.error) || 
                       text;
        } catch (e) {
            // Raw text
        }
        throw new Error(`Proxy Error (${response.status}): ${errorMsg}`);
    }

    return response.json();
};


// --- Public API ---

export const generateResponse = async (
    prompt: string, 
    modelId: string, 
    provider: 'official' | 'custom' = 'official'
): Promise<string> => {
    try {
        const config = getAppConfig();
        const effectiveProvider = (provider === 'custom' && !config.hasCustom) ? 'official' : provider;
        
        // --- CUSTOM PATH ---
        if (effectiveProvider === 'custom') {
            const { baseUrl, apiKey, model: customModel } = config.custom;
            const targetModel = customModel || modelId;
            
            if (!baseUrl || !apiKey) throw new Error("Custom URL or API Key missing.");

            const data = await fetchCustomGemini(baseUrl, apiKey, targetModel, {
                contents: [{ parts: [{ text: prompt }] }]
            });

            // Parse Response
            const candidate = data.candidates?.[0];
            if (candidate?.content?.parts?.[0]?.text) {
                return candidate.content.parts[0].text;
            }
            return "No text content in response.";
        }

        // --- OFFICIAL PATH ---
        const client = getOfficialClient();
        const response = await client.models.generateContent({
            model: modelId,
            contents: prompt,
        });
        return response.text || "No response generated.";

    } catch (error: any) {
        console.error("Generation Error:", error);
        return `System Error (${provider.toUpperCase()}): ${error.message}`;
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
        const effectiveProvider = (provider === 'custom' && !config.hasCustom) ? 'official' : provider;
        
        let targetModel = 'gemini-2.5-flash';
        
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

        // --- CUSTOM PATH ---
        if (effectiveProvider === 'custom') {
            const { baseUrl, apiKey, model: customModel } = config.custom;
            if (customModel) targetModel = customModel;

            if (!baseUrl || !apiKey) throw new Error("Custom URL or API Key missing.");

            const data = await fetchCustomGemini(baseUrl, apiKey, targetModel, {
                contents: [{ parts: [{ text: judgeSystemPrompt }] }],
                generationConfig: {
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

            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error("Empty response from Judge AI");
            
            const resultJson = JSON.parse(text);
            const finalFlag = resultJson.success ? `CTF{${level.id}_CLEARED_${Math.floor(Math.random() * 9999)}}` : undefined;

            return {
                success: resultJson.success,
                feedback: resultJson.feedback || "Analysis complete.",
                flag: finalFlag,
                output: modelOutput
            };
        }

        // --- OFFICIAL PATH ---
        const client = getOfficialClient();
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
