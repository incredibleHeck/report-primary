// ==========================================
// HECTECH CleanupManager.js (Hardened)
// ==========================================

const CleanupManager = {
    /**
     * Approves and finalizes selected student remarks.
     * Converts text states cleanly to high-contrast white bold, flushes audit markers,
     * and guarantees background layout theme preservation.
     */
    runFinalize: function() {
        const ui = SpreadsheetApp.getUi();
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        
        // 1. Fetch Dynamic Smart Selection Bounds
        let selection = null;
        if (typeof SelectionProcessor !== 'undefined') {
            selection = SelectionProcessor.getSmartSelection();
        } else {
            selection = ss.getActiveSheet().getActiveRange();
        }

        if (!selection) {
            ui.alert("⚠️ Finalization Blocked\n\nPlease select a valid column containing generated student remarks to finalize.");
            return;
        }

        // 2. Validate Target Data Ranges Defensively
        let range = selection;
        if (typeof RangeValidator !== 'undefined' && RangeValidator.getValidDataRange) {
            range = RangeValidator.getValidDataRange(selection);
        }

        // Intercept execution with an actionable alert if range validations drop out
        if (!range) {
            ui.alert("⚠️ Validation Error\n\nThe highlighted cell bounds do not match the standardized student report rows. Please reselect your target remarks column.");
            return;
        }

        // 3. Performance Optimization: Clip range boundaries to actual sheet content limits
        const sheet = range.getSheet();
        const lastContentRow = sheet.getLastRow();
        const rangeStartRow = range.getRow();
        const totalRowsInRange = range.getNumRows();

        // Prevent performance degradation if a user captures thousands of empty rows at the bottom
        if (rangeStartRow + totalRowsInRange - 1 > lastContentRow) {
            const prunedRowCount = Math.max(1, (lastContentRow - rangeStartRow) + 1);
            range = sheet.getRange(rangeStartRow, range.getColumn(), prunedRowCount, range.getNumColumns());
        }

        // 4. Multi-User UX Safety Handshake
        const response = ui.alert(
            "🎨 Approve & Finalize Selected Remarks?",
            `This will normalize text blocks across your selection to standard high-contrast BOLD WHITE for dark mode reporting backgrounds.\n\n⚠️ CRITICAL: This action clears all active validation overlays and red audit flags permanently. Proceed?`,
            ui.ButtonSet.YES_NO
        );

        if (response !== ui.Button.YES) {
            ss.toast("Finalization sweep cancelled.", "HecTech");
            return;
        }

        // 5. State Ledger Ledger Caching (Undo Insurance)
        if (typeof StateManager !== 'undefined' && StateManager.saveForUndo) {
            StateManager.saveForUndo(range);
        }

        try {
            ss.toast("Applying final layout transformations...", "System Matrix", -1);

            // 6. Apply Premium Uniform Styles
            range.setFontColor("#FFFFFF");        // High-contrast clean text visibility
            range.setFontWeight("bold");          // Readability enhancement
            range.setVerticalAlignment("middle"); // Standard layout grid centering
            range.setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);

            // 7. Structural Deep Clean (Wipe Validation Overlays)
            range.clearNote(); 

            // Force immediate sheet recalculation update
            SpreadsheetApp.flush();
            ss.toast("✅ Selection finalized and styled.", "HecTech Success");

        } catch (err) {
            console.error("Critical error encountered during cleanup pass execution:", err);
            ui.alert(`❌ Execution Error\n\nFailed to finalize cell attributes cleanly: ${err.message}`);
        }
    }
};