 /**
 * Centralized API Management - SuperBatch with Retry Logic
 * Updated: Modular Prompts & Error Handling
 */

const APICache = {
    get: (key) => {
        try {
            return CacheService.getUserCache().get(key);
        } catch (e) {
            return null;
        }
    },
    set: (key, value) => {
        try {
            // TTL: 6 hours
            CacheService.getUserCache().put(key, value, 21600);
        } catch (e) { }
    }
};

/**
 * Base function for fetching Gemini API responses.
 */
function fetchGeminiResponse(payload, model, key) {
    const safeModel = model || "gemini-2.0-flash"; // 🟢 STABLE FALLBACK
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${safeModel}:generateContent?key=${key}`;
    const options = {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();
    const contentText = response.getContentText();

    let json;
    try {
        json = JSON.parse(contentText);
    } catch (e) {
        throw new Error(`Invalid JSON response: ${statusCode}`);
    }

    if (json.error || statusCode >= 400) {
        const errorCode = json.error ? json.error.code : statusCode;
        const errorMessage = json.error ? json.error.message : contentText;
        if (errorCode === 503 || errorCode === 429) {
             return { error: true, isRetryable: true, code: errorCode, message: errorMessage };
        }
        return { error: true, isRetryable: false, code: errorCode, message: errorMessage };
    }
    
    const result = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!result) {
        return { error: true, message: "Content blocked or no response from AI." };
    }
    
    return { error: false, text: result };
}

// ==========================================
// 1. JSON BATCH API (Generic & Prompt-Agnostic)
// ==========================================
/**
 * Now accepts a promptFn argument so it doesn't rely on a global 'Prompts' object.
 */
function callGeminiJsonBatch(data, model, key, promptFn, retryCount = 0) {
    if (!data || (Array.isArray(data) && data.length === 0)) return [];
    if (!key) throw new Error("API Key is missing.");

    // Generate prompt using the passed-in function
    const prompt = (typeof promptFn === 'function') ? promptFn(data) : promptFn;
    
    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
            maxOutputTokens: 8192 
        }
    };

    try {
        const result = fetchGeminiResponse(payload, model, key);
        
        if (result.error) {
            if (result.isRetryable && retryCount < 3) {
                console.warn(`Gemini Busy (${result.code}). Retrying...`);
                Utilities.sleep(Math.pow(2, retryCount) * 1000);
                return callGeminiJsonBatch(data, model, key, promptFn, retryCount + 1);
            }
            throw new Error(`API Error: ${result.message}`);
        }

        // Clean JSON formatting
        let rawText = result.text.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(rawText);
        
        return parsed;

    } catch (e) {
        console.error("JSON Batch Failed:", e);
        if (retryCount < 3) {
            Utilities.sleep(1000);
            return callGeminiJsonBatch(data, model, key, promptFn, retryCount + 1);
        }
        return []; 
    }
}

// ==========================================
// 2. BACKWARD COMPATIBLE WRAPPERS
// ==========================================
// These wrappers now accept 'promptFn' from your new split files.

function callGeminiReportBatch(students, model, key, promptFn) {
    return callGeminiJsonBatch(students, model, key, promptFn);
}

function callGeminiAnalysisBatch(items, model, key, promptFn) {
    return callGeminiJsonBatch(items, model, key, promptFn);
}

function callGeminiPronounBatch(items, model, key, promptFn) {
    return callGeminiJsonBatch(items, model, key, promptFn);
}

function callGeminiCommentBatch(items, model, key, promptFn) {
    return callGeminiJsonBatch(items, model, key, promptFn);
}