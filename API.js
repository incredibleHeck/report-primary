/**
 * Centralized API Management - SuperBatch with Retry Logic
 * HECKTECK API.js
 */
const APICache = {
    get: (key) => {
        try {
            return CacheService.getDocumentCache().get(key);
        } catch (e) {
            logSysError("Cache Get Failed", e.message);
            return null;
        }
    },
    set: (key, value) => {
        try {
            // TTL: 6 hours
            CacheService.getDocumentCache().put(key, value, 21600);
        } catch (e) {
            logSysError("Cache Set Failed", e.message);
        }
    }
};

/**
 * Helper to log critical errors to a hidden SYS_LOGS sheet.
 */
function logSysError(action, message) {
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        let sheet = ss.getSheetByName("SYS_LOGS");
        if (!sheet) {
            sheet = ss.insertSheet("SYS_LOGS");
            sheet.hideSheet();
            sheet.appendRow(["Timestamp", "User", "Action", "Error"]);
        }
        sheet.appendRow([new Date(), Session.getActiveUser().getEmail(), action, message]);
    } catch (e) {
        console.error("Failed to write to SYS_LOGS", e);
    }
}

/**
 * User-friendly error messages for common API issues
 */
const APIErrors = {
    NO_API_KEY: "Gemini API Key not configured. Please run Setup from the HeckTeck menu.",
    INVALID_API_KEY: "Invalid API Key. Please check your Gemini API Key in Script Properties.",
    RATE_LIMITED: "AI service is busy. Please wait a moment and try again.",
    CONTENT_BLOCKED: "AI could not generate a response for this content. Try modifying the input.",
    NETWORK_ERROR: "Network error connecting to AI service. Check your internet connection.",
    QUOTA_EXCEEDED: "API quota exceeded. Please check your Gemini API usage limits.",
    
    getUserMessage: function(code, defaultMsg) {
        switch(code) {
            case 400: return this.INVALID_API_KEY;
            case 401: return this.INVALID_API_KEY;
            case 403: return this.INVALID_API_KEY;
            case 429: return this.RATE_LIMITED;
            case 500: return "AI service error. Please try again.";
            case 503: return this.RATE_LIMITED;
            default: return defaultMsg || "An unexpected error occurred.";
        }
    }
};

/**
 * Shows a toast notification for API errors
 */
function showAPIError(message) {
    try {
        SpreadsheetApp.getActiveSpreadsheet().toast(message, "⚠️ AI Error", 10);
    } catch(e) {
        console.error("Could not show toast:", message);
    }
}

/**
 * Validates API key before making requests
 */
function validateAPIKey(key) {
    if (!key || key.includes("YOUR_") || key.length < 20) {
        showAPIError(APIErrors.NO_API_KEY);
        return false;
    }
    return true;
}

/**
 * Base function for fetching Gemini API responses.
 */
function fetchGeminiResponse(payload, model, key) {
    const safeModel = model || "gemini-2.5-pro";
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${safeModel}:generateContent?key=${key}`;
    const options = {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
    };

    let response;
    try {
        response = UrlFetchApp.fetch(url, options);
    } catch (e) {
        return { error: true, isRetryable: true, code: 0, message: APIErrors.NETWORK_ERROR };
    }
    
    const statusCode = response.getResponseCode();
    const contentText = response.getContentText();

    let json;
    try {
        json = JSON.parse(contentText);
    } catch (e) {
        return { error: true, isRetryable: false, code: statusCode, message: `Invalid response from AI (${statusCode})` };
    }

    if (json.error || statusCode >= 400) {
        const errorCode = json.error ? json.error.code : statusCode;
        const errorMessage = json.error ? json.error.message : contentText;
        const isRetryable = (errorCode === 503 || errorCode === 429 || errorCode === 500);
        
        return { 
            error: true, 
            isRetryable: isRetryable, 
            code: errorCode, 
            message: errorMessage,
            userMessage: APIErrors.getUserMessage(errorCode, errorMessage)
        };
    }
    
    const result = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!result) {
        const blockReason = json.candidates?.[0]?.finishReason;
        const message = blockReason === "SAFETY" 
            ? "Content was blocked by safety filters." 
            : APIErrors.CONTENT_BLOCKED;
        return { error: true, isRetryable: false, message: message, userMessage: message };
    }
    
    return { error: false, text: result };
}

// ==========================================
// 1. JSON BATCH API (Generic & Prompt-Agnostic)
// ==========================================
/**
 * Main batch API function with improved error handling
 */
function callGeminiJsonBatch(data, model, key, promptFn, retryCount = 0) {
    if (!data || (Array.isArray(data) && data.length === 0)) return [];
    
    // Validate API key before proceeding
    if (!validateAPIKey(key)) {
        return [];
    }

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
                console.warn(`Gemini Busy (${result.code}). Retry ${retryCount + 1}/3...`);
                Utilities.sleep(Math.pow(2, retryCount) * 1000);
                return callGeminiJsonBatch(data, model, key, promptFn, retryCount + 1);
            }
            
            // Show user-friendly error on final failure
            showAPIError(result.userMessage || result.message);
            console.error("API Error:", result.message);
            return [];
        }

        // Clean JSON formatting
        let rawText = result.text.replace(/```json/g, "").replace(/```/g, "").trim();
        
        try {
            return JSON.parse(rawText);
        } catch (parseError) {
            console.error("JSON Parse Error:", parseError, "Raw:", rawText.substring(0, 500));
            showAPIError("AI returned invalid data format. Please try again.");
            return [];
        }

    } catch (e) {
        console.error("JSON Batch Failed:", e);
        if (retryCount < 3) {
            Utilities.sleep(1000);
            return callGeminiJsonBatch(data, model, key, promptFn, retryCount + 1);
        }
        showAPIError("Failed to get AI response after multiple attempts.");
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