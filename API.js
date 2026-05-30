/**
 * Centralized API Management - SuperBatch with Retry Logic
 * HECTECH API.js (Hardened Production Architecture)
 */

/**
 * Helper to log critical errors to a hidden SYS_LOGS sheet.
 * Hardened to prevent sheet-bloat from massive raw exception payloads.
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
        
        // 🟢 FIXED: Safe truncation limits error cell characters to prevent spreadsheet performance drag
        const cleanMessage = typeof message === 'object' ? JSON.stringify(message) : String(message);
        const truncatedMessage = cleanMessage.length > 1500 ? cleanMessage.substring(0, 1500) + "... [Truncated for Size]" : cleanMessage;
        
        sheet.appendRow([new Date(), Session.getActiveUser().getEmail(), action, truncatedMessage]);
    } catch (e) {
        console.error("Failed to write to SYS_LOGS", e);
    }
}

/**
 * User-friendly error messages for common API issues
 */
const APIErrors = {
    NO_API_KEY: "Gemini API Key not configured. Please run Setup from the HecTech menu.",
    INVALID_API_KEY: "Invalid API Key. Please check your Gemini API Key configuration parameters.",
    RATE_LIMITED: "AI service is busy. Please wait a moment while the system handles your background request...",
    CONTENT_BLOCKED: "AI could not generate a response for this content. Try modifying the evaluation parameters.",
    NETWORK_ERROR: "Network error connecting to AI service. Check your workbook internet connection.",
    QUOTA_EXCEEDED: "API quota exceeded. Please verify your current Gemini production usage thresholds.",
    
    getUserMessage: function(code, defaultMsg) {
        const numericCode = parseInt(code, 10);
        switch(numericCode) {
            case 400: case 401: case 403: return this.INVALID_API_KEY;
            case 429: return this.RATE_LIMITED;
            case 408: case 502: case 503: case 504: return this.RATE_LIMITED;
            case 500: return "AI service experienced an internal error. Retrying operations...";
            default: return defaultMsg || "An unexpected processing error occurred.";
        }
    }
};

/**
 * Shows a temporary user toast notification for API errors
 */
function showAPIError(message) {
    try {
        SpreadsheetApp.getActiveSpreadsheet().toast(message, "⚠️ AI Sync Alert", 8);
    } catch(e) {
        console.error("Could not display dashboard interface toast:", message);
    }
}

/**
 * Validates API key structural properties before initiating active pipelines
 */
function validateAPIKey(key) {
    if (!key || String(key).includes("YOUR_") || String(key).trim().length < 20) {
        showAPIError(APIErrors.NO_API_KEY);
        return false;
    }
    return true;
}

/**
 * Base infrastructure engine for delivering Gemini API payloads.
 */
function fetchGeminiResponse(payload, model, key) {
    // 🟢 FIXED: Sync model configuration fallbacks to your centralized source of truth
    const safeModel = model || (typeof Config !== 'undefined' ? Config.MODEL_NAME : "gemini-3.5-flash");
    
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
        logSysError("UrlFetchApp_Physical_Drop", e.message);
        return { error: true, isRetryable: true, code: 0, message: APIErrors.NETWORK_ERROR };
    }
    
    const statusCode = response.getResponseCode();
    const contentText = response.getContentText();

    let json;
    try {
        json = JSON.parse(contentText);
    } catch (e) {
        return { error: true, isRetryable: false, code: statusCode, message: `Invalid JSON payload signature (${statusCode})` };
    }

    if (json.error || statusCode >= 400) {
        const errorCode = json.error ? parseInt(json.error.code, 10) : statusCode;
        const errorMessage = json.error ? json.error.message : contentText;
        
        // 🟢 FIXED: Expanded tracking matrix accounts for intermittent proxy/gateway drops
        const retryableCodes = [408, 429, 500, 502, 503, 504];
        const isRetryable = retryableCodes.indexOf(errorCode) !== -1;
        
        if (!isRetryable) {
            logSysError(`API_Fatal_Status_${errorCode}`, errorMessage);
        }
        
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
            ? "Content skipped by safety filters. Review evaluating parameters." 
            : APIErrors.CONTENT_BLOCKED;
        
        logSysError("Content_Block_Interception", `Reason: ${blockReason}`);
        return { error: true, isRetryable: false, message: message, userMessage: message };
    }
    
    return { error: false, text: result };
}

// ==========================================
// 1. JSON BATCH API (Generic & Prompt-Agnostic)
// ==========================================
/**
 * Main batch processing coordination loop featuring exponential backoff logic.
 */
function callGeminiJsonBatch(data, model, key, promptFn, retryCount = 0) {
    if (!data || (Array.isArray(data) && data.length === 0)) return [];
    if (!validateAPIKey(key)) return [];

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
                const waitTime = Math.pow(2, retryCount) * 1000;
                console.warn(`Gemini Endpoint Busy (${result.code}). Triggering Backoff Step ${retryCount + 1}/3. Waiting ${waitTime}ms...`);
                Utilities.sleep(waitTime);
                return callGeminiJsonBatch(data, model, key, promptFn, retryCount + 1);
            }
            
            showAPIError(result.userMessage || result.message);
            return [];
        }

        let rawText = result.text.replace(/```json/g, "").replace(/```/g, "").trim();
        
        // Match string array encapsulation bounds securely
        const startIndex = rawText.indexOf('[');
        const endIndex = rawText.lastIndexOf(']');
        
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            rawText = rawText.substring(startIndex, endIndex + 1);
        } else {
            const objStart = rawText.indexOf('{');
            const objEnd = rawText.lastIndexOf('}');
            if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
                rawText = "[" + rawText.substring(objStart, objEnd + 1) + "]";
            }
        }

        try {
            return JSON.parse(rawText);
        } catch (parseError) {
            console.warn("Primary array decoding failed. Initializing deep tracking object parsing fallback...", parseError);
            
            // Fallback Tokenizer: Extract individual JSON object components using a localized balance matrix
            const jsonObjects = [];
            let braceCount = 0;
            let startIdx = -1;
            
            for (let i = 0; i < rawText.length; i++) {
                if (rawText[i] === '{') {
                    if (braceCount === 0) startIdx = i;
                    braceCount++;
                } else if (rawText[i] === '}') {
                    braceCount--;
                    if (braceCount === 0 && startIdx !== -1) {
                        let objStr = rawText.substring(startIdx, i + 1);
                        
                        // Clean trailing comma anomalies before finalizing extraction checks
                        objStr = objStr.replace(/,\s*([\]}])/g, '$1');
                        try {
                            const obj = JSON.parse(objStr);
                            jsonObjects.push(obj);
                        } catch (innerParseError) {
                            console.warn("Fragment structural token match dropped out:", objStr.substring(0, 100));
                        }
                        
                        startIdx = -1;
                    }
                }
            }
            
            if (jsonObjects.length > 0) {
                console.log(`Successfully recovered ${jsonObjects.length} structural records from broken container stream.`);
                return jsonObjects;
            }

            showAPIError("AI output data pattern broken. Please rerun active sequence rows.");
            return [];
        }

    } catch (e) {
        logSysError("Execution_Batch_Loop_Exception", e.message);
        if (retryCount < 3) {
            Utilities.sleep(1500);
            return callGeminiJsonBatch(data, model, key, promptFn, retryCount + 1);
        }
        showAPIError("Connection pool depleted. Processing transaction terminated.");
        return []; 
    }
}

// ==========================================
// 2. BACKWARD COMPATIBLE WRAPPERS
// ==========================================
function callGeminiReportBatch(students, model, key, promptFn) { return callGeminiJsonBatch(students, model, key, promptFn); }
function callGeminiAnalysisBatch(items, model, key, promptFn) { return callGeminiJsonBatch(items, model, key, promptFn); }
function callGeminiPronounBatch(items, model, key, promptFn) { return callGeminiJsonBatch(items, model, key, promptFn); }
function callGeminiCommentBatch(items, model, key, promptFn) { return callGeminiJsonBatch(items, model, key, promptFn); }