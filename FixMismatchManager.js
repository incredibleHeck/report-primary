// ==========================================
// HECTECH FixMismatchManager.js
// ==========================================

const FixMismatchManager = {
    run: function () {
        const selection = SelectionProcessor.getSmartSelection();
        if (!selection) return;
        
        // 🟢 PREFERRED: Using the Centralized RangeValidator
        // This handles the Row 3 check and cleans the selection automatically.
        const range = RangeValidator.getValidDataRange(selection);
        if (!range) return;

        // Save State for Undo (if StateManager exists)
        if (typeof StateManager !== 'undefined') StateManager.saveForUndo(range);
        
        // 1. FRESH SLATE RESET
        range.setFontColor("#FFFFFF"); // Reset to white for dark background visibility
        range.clearNote();
        SpreadsheetApp.flush();

        const result = this.fixRange(range);
        if (result.success) {
            if (result.changes > 0) {
                SpreadsheetApp.getActiveSpreadsheet().toast(`✅ Auto-Fixed ${result.changes} identity errors!`, "Complete");
            } else {
                SpreadsheetApp.getActiveSpreadsheet().toast("✨ No identity mismatches found.", "HecTech");
            }
        }
    },

    fixRange: function (range) {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        
        // 2. CONFIG: Source of Truth
        const classlistSheet = ss.getSheetByName(Config.CLASSLIST_SHEET_NAME);
        if (!classlistSheet) throw new Error(`❌ Missing Classlist Sheet: "${Config.CLASSLIST_SHEET_NAME}"`);

        const subjectData = range.getValues();
        const startRow = range.getRow();
        const numRows = range.getNumRows();
        
        // 3. ALIGNMENT LOGIC (Row 3 Awareness)
        const rowOffset = Config.DATA_START_ROW - 2; // Offset is 1 for Row 3 start
        const startRowInClasslist = startRow - rowOffset;

        // 4. FETCH DATA
        const nameColIndex = Config.CLASSLIST_NAME_COL;    
        const genderColIndex = Config.CLASSLIST_GENDER_COL; 
        const maxColNeeded = Math.max(nameColIndex, genderColIndex);
        const masterData = classlistSheet.getRange(startRowInClasslist, 1, numRows, maxColNeeded).getValues();

        let batchRequest = [];

        // 5. BUILD BATCH
        for (let r = 0; r < subjectData.length; r++) {
            if (!masterData[r]) continue;

            const fullName = masterData[r][nameColIndex - 1]; 
            const genderRaw = masterData[r][genderColIndex - 1];
            const gender = (String(genderRaw).toUpperCase().startsWith("F")) ? "Female" : "Male";

            if (!fullName || String(fullName).trim() === "") continue;
            
            const firstName = this.extractFirstName(fullName);

            for (let c = 0; c < subjectData[0].length; c++) {
                const comment = subjectData[r][c];
                if (typeof comment === 'string' && comment.trim().length > 10) {
                    batchRequest.push({
                        name: firstName,
                        gender: gender,
                        comment: comment,
                        rowIndex: r,
                        colIndex: c
                    });
                }
            }
        }

        if (batchRequest.length === 0) return { success: true, changes: 0 };

        try {
            // 6. CALL GEMINI
            const fixedComments = callGeminiJsonBatch(
                batchRequest, 
                Config.MODEL_NAME, 
                Config.API_KEY,
                () => PromptFixMismatch.getFixMismatchPrompt(batchRequest)
            );

            let changesCount = 0;
            const fontColors = range.getFontColors();
            const fontWeights = range.getFontWeights();

            // 7. APPLY FIXES
            batchRequest.forEach((item, index) => {
                const original = item.comment;
                let fixed = fixedComments[index];
                
                if (typeof fixed === 'object' && fixed !== null) {
                    fixed = fixed.comment || fixed.text || original;
                }
                
                if (fixed && fixed.trim() !== original.trim()) {
                    changesCount++;
                    subjectData[item.rowIndex][item.colIndex] = fixed;
                    fontColors[item.rowIndex][item.colIndex] = "#ff9900"; // Orange highlight
                    fontWeights[item.rowIndex][item.colIndex] = "bold";
                }
            });

            if (changesCount > 0) {
                range.setValues(subjectData);
                range.setFontColors(fontColors);
                range.setFontWeights(fontWeights);
            }
            return { success: true, changes: changesCount };
            
        } catch (e) { 
            console.error("Mismatch Fix Error:", e);
            throw e; 
        }
    },

    extractFirstName: function(fullName) {
        if (!fullName) return "Student";
        const parts = fullName.toString().trim().split(/\s+/);
        // Returns 2nd part if exists (e.g. "Doe John" -> "John"), else 1st part
        return (parts.length > 1) ? parts[1] : parts[0];
    }
};