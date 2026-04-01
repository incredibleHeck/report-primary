// ==========================================
// HECTECH SubjectContextManager.js
// ==========================================

const SubjectContextManager = {
    contextStorageKeyFromSheetName: function (sheetName, ssId) {
        return `CTX_${sheetName.toUpperCase().replace(/\s+/g, '_')}_${ssId}`;
    },

    contextStorageKeyFromSubjectName: function (subjectName, ssId) {
        return `CTX_${subjectName.toUpperCase().replace(/\s+/g, '_')}_${ssId}`;
    },

    openSidebar: function () {
        const html = HtmlService.createHtmlOutputFromFile('SubjectContextSidebar')
            .setTitle('Subject Context Manager')
            .setWidth(300);
        SpreadsheetApp.getUi().showSidebar(html);
    },

    /**
     * Saves context (legacy: library Script Properties when shell does not wrap save).
     */
    saveContext: function (data) {
        const ssId = SpreadsheetApp.getActiveSpreadsheet().getId();
        const props = PropertiesService.getScriptProperties();
        const storageKey = SubjectContextManager.contextStorageKeyFromSubjectName(data.subjectName, ssId);
        const contextPayload = JSON.stringify({
            grade: data.grade,
            topics: data.topics
        });

        props.setProperty(storageKey, contextPayload);

        return `✅ Saved context for ${data.subjectName}!`;
    },

    getContext: function () {
        const sheet = SpreadsheetApp.getActiveSheet();
        const sheetName = sheet.getName();
        const ssId = SpreadsheetApp.getActiveSpreadsheet().getId();
        const storageKey = SubjectContextManager.contextStorageKeyFromSheetName(sheetName, ssId);

        let storedJson = null;
        if (typeof ClientScriptPropertiesBridge !== 'undefined' && ClientScriptPropertiesBridge.isHydrated()) {
            storedJson = ClientScriptPropertiesBridge.getRawProperty(storageKey);
        }
        if (!storedJson) {
            storedJson = PropertiesService.getScriptProperties().getProperty(storageKey);
        }

        let parsedData = { grade: "", topics: "" };
        if (storedJson) {
            try { parsedData = JSON.parse(storedJson); } catch (e) {}
        }

        return {
            currentSheetName: sheetName,
            grade: parsedData.grade,
            topics: parsedData.topics
        };
    }
};

// Hooks for HTML (library-only installs)
function saveSubjectContext(data) { return SubjectContextManager.saveContext(data); }
function getSubjectContext() { return SubjectContextManager.getContext(); }

/** Container shell: build key/value for Script Properties.setProperty */
function buildSubjectContextSaveEntry(data) {
    const ssId = SpreadsheetApp.getActiveSpreadsheet().getId();
    const key = SubjectContextManager.contextStorageKeyFromSubjectName(data.subjectName, ssId);
    const value = JSON.stringify({
        grade: data.grade,
        topics: data.topics
    });
    return {
        key: key,
        value: value,
        message: `✅ Saved context for ${data.subjectName}!`
    };
}

/** Container shell: read active sheet context from a property map */
function getSubjectContextFromPropertyMap(map) {
    const sheet = SpreadsheetApp.getActiveSheet();
    const sheetName = sheet.getName();
    const ssId = SpreadsheetApp.getActiveSpreadsheet().getId();
    const storageKey = SubjectContextManager.contextStorageKeyFromSheetName(sheetName, ssId);
    const storedJson = map[storageKey];
    let parsedData = { grade: "", topics: "" };
    if (storedJson) {
        try { parsedData = JSON.parse(storedJson); } catch (e) {}
    }
    return {
        currentSheetName: sheetName,
        grade: parsedData.grade,
        topics: parsedData.topics
    };
}
