// ==========================================
// HECKTECK StateManager.ts (Fixed)
// ==========================================

const StateManager = {
    /**
     * SAVES state before an operation (for Undo).
     */
    saveForUndo: function (range) {
        try {
            const sheet = range.getSheet();
            const values = range.getValues();
            // Limit check to prevent cache errors (100kb limit)
            if (JSON.stringify(values).length > 90000) return;
            
            const undoData = {
                sheetName: sheet.getName(),
                rangeA1: range.getA1Notation(),
                values: values
            };
            CacheService.getUserCache().put("LAST_ACTION_UNDO", JSON.stringify(undoData), 3600);
        } catch (e) {
            console.error("Undo save failed:", e);
        }
    },

    /**
     * RESTORES the previous state.
     */
    undo: function () {
        const json = CacheService.getUserCache().get("LAST_ACTION_UNDO");
        if (!json) {
            SpreadsheetApp.getActiveSpreadsheet().toast("Nothing to undo.", "Undo");
            return;
        }
        
        const data = JSON.parse(json);
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(data.sheetName);
        if (!sheet) return;
        
        const range = sheet.getRange(data.rangeA1);
        range.setValues(data.values);
        
        // Reset style to "Clean" state (White text)
        range.setFontColor("#FFFFFF"); 
        range.setFontWeight("normal");
        
        SpreadsheetApp.getActiveSpreadsheet().toast("Last action undone.", "Success");
        CacheService.getUserCache().remove("LAST_ACTION_UNDO");
    },

    /**
     * FINALIZE: The "Cleaner"
     * Strictly converts text to WHITE (#FFFFFF) and makes it BOLD.
     * DOES NOT touch the background color.
     */
    finalize: function () {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
        
        // Use Smart Selection if available to detect the column
        let range = sheet.getActiveRange();
        if (range.getNumRows() === 1 && typeof SelectionProcessor !== 'undefined') {
             range = SelectionProcessor.getSmartSelection();
        }

        if (range) {
            // ONLY change Text Color and Weight
            range.setFontColor("#FFFFFF");
            range.setFontWeight("bold");
            
            // DO NOT change background
            // range.setBackground(null); <--- REMOVED TO PROTECT DARK THEME
            
            SpreadsheetApp.getActiveSpreadsheet().toast("✅ Text is now White.", "Finalized");
        }
    },
    
    detectBaseStyles: function() { return; }
};