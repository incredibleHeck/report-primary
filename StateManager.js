// ==========================================
// HECTECH StateManager.js (Production Ready)
// ==========================================

const StateManager = {

    // 🟢 L1 RUNTIME MEM STATE BUFFER: Guarantees zero-latency multi-property undo states for massive batches
    _runtimeUndoBuffer: null,

    _undoKey: function() {
        return "UNDO_STATE_" + SpreadsheetApp.getActiveSpreadsheet().getId();
    },

    /**
     * Captures a comprehensive multi-property database snapshot of the target range prior to execution.
     * Preserves values, text neon colors, weights, and validation audit notes.
     */
    saveForUndo: function (range) {
        try {
            const sheet = range.getSheet();
            
            // Harvest comprehensive structural matrix arrays
            const snapshot = {
                sheetName: sheet.getName(),
                rangeA1: range.getA1Notation(),
                values: range.getValues(),
                fontColors: range.getFontColors(),
                fontWeights: range.getFontWeights(),
                notes: range.getNotes()
            };

            // Commit to high-speed L1 local memory instantly
            this._runtimeUndoBuffer = snapshot;

            // Prepare L2 cross-session persistent backup payload
            const payload = JSON.stringify(snapshot);
            
            // Verify safe 100KB string payload limits for Google Cache Service
            if (payload.length < 100000) {
                CacheService.getUserCache().put(this._undoKey(), payload, 3600); // Retained for 1 hour
            } else {
                if (typeof DEBUG_LOG !== 'undefined') {
                    console.warn("Large data range detected. System routing undo state exclusively through L1 Runtime buffer protection.");
                }
            }
        } catch (e) {
            console.error("Critical Failure: Undo state snapshot tracking interrupted:", e);
        }
    },

    /**
     * Restores the exact multi-property state footprint back to the active workbook ledger.
     */
    undo: function () {
        let snapshot = this._runtimeUndoBuffer; // Check L1 memory space first
        const ss = SpreadsheetApp.getActiveSpreadsheet();

        // Fall back to L2 user cache storage mapping if local state has cleared
        if (!snapshot) {
            const cachedJson = CacheService.getUserCache().get(this._undoKey());
            if (cachedJson) {
                try {
                    snapshot = JSON.parse(cachedJson);
                } catch (e) {
                    console.error("Failed to parse L2 undo payload structure:", e);
                }
            }
        }

        // Intercept action if no valid state maps are found
        if (!snapshot) {
            ss.toast("❌ No recent operations available to undo.", "HecTech State Manager");
            return;
        }
        
        const sheet = ss.getSheetByName(snapshot.sheetName);
        if (!sheet) {
            ss.toast(`❌ Undo aborted: Sheet tab "${snapshot.sheetName}" can no longer be resolved.`, "Error");
            return;
        }
        
        try {
            const range = sheet.getRange(snapshot.rangeA1);
            
            // Clean restoration sequence avoids breaking dimensional alignment loops
            range.setValues(snapshot.values);
            range.setFontColors(snapshot.fontColors);
            range.setFontWeights(snapshot.fontWeights);
            range.setNotes(snapshot.notes);
            
            ss.toast("🔄 Last action successfully reverted.", "Undo Success");
            
            // Clear tracking registers cleanly
            this.clearRegisters();
        } catch (err) {
            console.error("Undo rewrite tracking broken:", err);
            ss.toast("❌ Critical breakdown occurred during state rewrite pass.", "Undo Failure");
        }
    },

    /**
     * FINALIZE: The "Cleaner"
     * Clears validation notes and normalizes the target comment text cells cleanly for dark modes.
     * Strictly preserves background layouts.
     */
    finalize: function () {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
        let range = sheet.getActiveRange();
        
        // Dynamic smart column selection expansion check
        if (range.getNumRows() === 1 && typeof SelectionProcessor !== 'undefined') {
            range = SelectionProcessor.getSmartSelection();
        }

        if (range) {
            // Save current stylistic profile parameters to enable rolling back cleaner runs
            this.saveForUndo(range);

            // Clean up old audit indicators and normalize lookups
            range.setFontColor("#FFFFFF"); // Reset text to high-contrast white
            range.setFontWeight("bold");   // Standard clear bold readable view
            range.clearNote();             // Wipe flag overlays cleanly
            
            SpreadsheetApp.getActiveSpreadsheet().toast("✅ Comments finalized and styled.", "HecTech");
        }
    },
    
    /**
     * Flushes local runtime pointers and cross-session caching keys
     */
    clearRegisters: function() {
        this._runtimeUndoBuffer = null;
        const cache = CacheService.getUserCache();
        if (cache) cache.remove(this._undoKey());
    }
};