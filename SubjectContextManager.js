// ==========================================
// HECTECH SubjectContextManager.js (Hardened)
// ==========================================

const SubjectContextManager = {

    /**
     * Centralized Key Normalizer (Source of Truth Alignment)
     * Forces clean uppercase string parity and strips out whitespace irregularities
     */
    buildStorageKey: function (rawName, ssId) {
        const cleanName = String(rawName).toUpperCase().trim().replace(/\s+/g, '_');
        return `CTX_${cleanName}_${ssId}`;
    },

    openSidebar: function () {
        const html = HtmlService.createHtmlOutputFromFile('SubjectContextSidebar')
            .setTitle('Subject Context Manager')
            .setWidth(300)
            .addMetaTag('viewport', 'width=device-width, initial-scale=1'); // Enforces high-fidelity fluid scaling
        SpreadsheetApp.getUi().showSidebar(html);
    },

    /**
     * Saves context metrics cleanly synced to the active sheet name target
     */
    saveContext: function (data) {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const ssId = ss.getId();
        
        // Use provided subject name fallback, but anchor strictly to active sheet if matching tab isn't specified
        const subjectTarget = data.subjectName || ss.getActiveSheet().getName();
        const storageKey = this.buildStorageKey(subjectTarget, ssId);
        
        // Cleanse topic inputs to protect prompt parsing sequences against unescaped formatting breaks
        const cleanTopics = String(data.topics || "")
            .replace(/[\u201C\u201D]/g, '"') // Normalize smart curly quotes to standard double quotes
            .trim();

        const contextPayload = JSON.stringify({
            grade: String(data.grade || "").trim(),
            topics: cleanTopics
        });

        const props = PropertiesService.getDocumentProperties();
        props.setProperty(storageKey, contextPayload);

        return `✅ Saved context for ${subjectTarget}!`;
    },

    getContext: function () {
        const sheet = SpreadsheetApp.getActiveSheet();
        const sheetName = sheet.getName();
        const ssId = SpreadsheetApp.getActiveSpreadsheet().getId();
        const storageKey = this.buildStorageKey(sheetName, ssId);

        let storedJson = PropertiesService.getDocumentProperties().getProperty(storageKey);
        
        // Optional state recovery using hydration caching or script fallback vectors
        if (!storedJson && typeof ClientScriptPropertiesBridge !== 'undefined' && ClientScriptPropertiesBridge.isHydrated()) {
            storedJson = ClientScriptPropertiesBridge.getRawProperty(storageKey);
        }
        
        if (!storedJson) {
            storedJson = PropertiesService.getScriptProperties().getProperty(storageKey);
        }

        let parsedData = { grade: "", topics: "" };
        if (storedJson) {
            try { 
                parsedData = JSON.parse(storedJson); 
            } catch (e) {
                console.error("Context parsing aborted due to malformed payload layout:", e);
            }
        }

        return {
            currentSheetName: sheetName,
            grade: parsedData.grade || "",
            topics: parsedData.topics || ""
        };
    }
};

// ==========================================
// HTML PANEL HOOKS
// ==========================================
function saveSubjectContext(data) { verifyLicenseAuthorization(); return SubjectContextManager.saveContext(data); }
function getSubjectContext() { verifyLicenseAuthorization(); return SubjectContextManager.getContext(); }

/** Container shell: build key/value properties map serialization object */
function buildSubjectContextSaveEntry(data) {
    verifyLicenseAuthorization();
    const ssId = SpreadsheetApp.getActiveSpreadsheet().getId();
    const subjectTarget = data.subjectName || SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getName();
    const key = SubjectContextManager.buildStorageKey(subjectTarget, ssId);
    const value = JSON.stringify({
        grade: String(data.grade || "").trim(),
        topics: String(data.topics || "").trim()
    });
    return {
        key: key,
        value: value,
        message: `✅ Saved context for ${subjectTarget}!`
    };
}

/** Container shell: read active sheet context arrays from localized static property maps */
function getSubjectContextFromPropertyMap(map) {
    verifyLicenseAuthorization();
    const sheet = SpreadsheetApp.getActiveSheet();
    const sheetName = sheet.getName();
    const ssId = SpreadsheetApp.getActiveSpreadsheet().getId();
    const storageKey = SubjectContextManager.buildStorageKey(sheetName, ssId);
    const storedJson = map[storageKey];
    
    let parsedData = { grade: "", topics: "" };
    if (storedJson) {
        try { parsedData = JSON.parse(storedJson); } catch (e) {}
    }
    return {
        currentSheetName: sheetName,
        grade: parsedData.grade || "",
        topics: parsedData.topics || ""
    };
}
