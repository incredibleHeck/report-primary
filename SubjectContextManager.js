// ==========================================
// HECTECH SubjectContextManager.js
// ==========================================

const SubjectContextManager = {
    openSidebar: function() {
        const html = HtmlService.createHtmlOutputFromFile('SubjectContextSidebar')
            .setTitle('Subject Context Manager')
            .setWidth(300);
        SpreadsheetApp.getUi().showSidebar(html);
    },

    /**
     * Saves context SPECIFIC to the provided sheet name
     */
    saveContext: function(data) {
        const ssId = SpreadsheetApp.getActiveSpreadsheet().getId();
        const props = PropertiesService.getScriptProperties();
        
        // We use a unique key for every subject + client (e.g., "CTX_MATHEMATICS_1abc...")
        const storageKey = `CTX_${data.subjectName.toUpperCase().replace(/\s+/g, '_')}_${ssId}`;
        
        const contextPayload = JSON.stringify({
            grade: data.grade,
            topics: data.topics
        });

        props.setProperty(storageKey, contextPayload);
        
        return `✅ Saved context for ${data.subjectName}!`;
    },

    /**
     * Gets context for the CURRENTLY ACTIVE sheet
     */
    getContext: function() {
        const sheet = SpreadsheetApp.getActiveSheet();
        const sheetName = sheet.getName();
        const ssId = SpreadsheetApp.getActiveSpreadsheet().getId();
        
        const props = PropertiesService.getScriptProperties();
        const storageKey = `CTX_${sheetName.toUpperCase().replace(/\s+/g, '_')}_${ssId}`;
        
        const storedJson = props.getProperty(storageKey);
        let parsedData = { grade: "", topics: "" };

        if (storedJson) {
            try { parsedData = JSON.parse(storedJson); } catch(e) {}
        }

        return {
            currentSheetName: sheetName, // Send name to UI
            grade: parsedData.grade,
            topics: parsedData.topics
        };
    }
};

// Hooks for HTML
function saveSubjectContext(data) { return SubjectContextManager.saveContext(data); }
function getSubjectContext() { return SubjectContextManager.getContext(); }