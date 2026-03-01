// ==========================================
// HECKTECK CleanupManager.js
// ==========================================

const CleanupManager = {
    runFinalize: function() {
        const ui = SpreadsheetApp.getUi();
        
        // 1. Get Smart Selection
        const selection = SelectionProcessor.getSmartSelection();
        if (!selection) {
            ui.alert("⚠️ Selection Error: Please select the comments you wish to finalize.");
            return;
        }

        // 2. Validate Range
        const range = RangeValidator.getValidDataRange(selection);
        if (!range) return;

        // 3. UX Safety
        const response = ui.alert(
            "Approve & Finalize?",
            "This will turn all selected text BOLD WHITE and permanently clear all Audit Notes.\n\nDo you want to proceed?",
            ui.ButtonSet.YES_NO
        );

        if (response !== ui.Button.YES) return;

        // 4. Save for Undo
        if (typeof StateManager !== 'undefined') StateManager.saveForUndo(range);

        // 5. Apply Style
        range.setFontColor("#FFFFFF");        // White
        range.setFontWeight("bold");          // Bold
        range.setVerticalAlignment("middle"); 
        
        // 6. Deep Clean (Remove Red Flags)
        range.clearNote(); 

        // 7. Final Polish
        range.setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
        
        SpreadsheetApp.getActiveSpreadsheet().toast("✅ Reports Finalized", "Success");
    }
};