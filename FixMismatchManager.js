// ==========================================
// HECTECH FixMismatchManager.js (Hardened)
// ==========================================

const FixMismatchManager = {
    run: function () {
        const selection = SelectionProcessor.getSmartSelection();
        if (!selection) return;
        
        // 🟢 PREFERRED: Using Centralized RangeValidator
        // This handles Row 3 checks and cleans bounds automatically.
        const range = RangeValidator.getValidDataRange(selection);
        if (!range) return;

        // Save State for Undo protection
        if (typeof StateManager !== 'undefined') StateManager.saveForUndo(range);
        
        // 1. FRESH SLATE RESET
        range.setFontColor("#FFFFFF"); // Reset to high-contrast white text for dark sheets
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
        const sheet = range.getSheet();
        
        // 2. CONFIG: Global Source of Truth
        const classlistSheet = ss.getSheetByName(Config.CLASSLIST_SHEET_NAME);
        if (!classlistSheet) throw new Error(`❌ Missing Classlist Sheet: "${Config.CLASSLIST_SHEET_NAME}"`);

        const subjectData = range.getValues();
        const startRow = range.getRow();
        const numRows = range.getNumRows();
        
        // 3. HARDENED ROW ALIGNMENT (Data-to-Data Row 3 Parity)
        const subjectDataStart = Config.DATA_START_ROW; // 3
        const classlistDataStart = 3; // Standardized to Row 3 to eliminate lookup offset drift
        const rowOffset = subjectDataStart - classlistDataStart; // 0
        const startRowInClasslist = startRow - rowOffset;

        // Safety header-zone boundary check
        if (startRowInClasslist < 3) throw new Error("Selection header overlap. Please select student rows only (Row 3+).");

        // 4. FETCH DATA
        const nameColIndex = Config.CLASSLIST_NAME_COL;    
        const genderColIndex = Config.CLASSLIST_GENDER_COL; 
        const maxColNeeded = Math.max(nameColIndex, genderColIndex);
        const masterData = classlistSheet.getRange(startRowInClasslist, 1, numRows, maxColNeeded).getValues();

        let batchRequest = [];

        // 5. BUILD PAYLOAD BATCH
        for (let r = 0; r < subjectData.length; r++) {
            if (!masterData[r]) continue;

            const fullName = masterData[r][nameColIndex - 1]; 
            const genderRaw = masterData[r][genderColIndex - 1];
            const gender = (genderRaw && String(genderRaw).trim().toUpperCase().startsWith("F")) ? "Female" : "Male";

            if (!fullName || String(fullName).trim() === "") continue;
            
            const firstName = Config.extractFirstName(fullName);

            for (let c = 0; c < subjectData[0].length; c++) {
                const comment = subjectData[r][c];
                // Process only valid comment fields containing evaluation text (> 10 characters)
                if (typeof comment === 'string' && comment.trim().length > 10) {
                    batchRequest.push({
                        id: `${r}_${c}`,
                        name: firstName, // Pass conversational first name for alignment processing
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
            // 6. CALL GEMINI MISMATCH PIPELINE
            const fixedComments = callGeminiJsonBatch(
                batchRequest, 
                Config.MODEL_NAME, 
                Config.API_KEY,
                () => PromptFixMismatch.getFixMismatchPrompt(batchRequest)
            );

            // Create string-safe ID map of fixed comments
            const resultMap = {};
            if (Array.isArray(fixedComments)) {
                fixedComments.forEach(item => {
                    if (item && item.id !== undefined) {
                        const text = item.comment || item.text;
                        if (text) resultMap[item.id.toString()] = text;
                    }
                });
            }

            let changesCount = 0;
            const fontColors = range.getFontColors();
            const fontWeights = range.getFontWeights();

            // 7. APPLY REPAIRED DATA OVERLAYS
            batchRequest.forEach((item) => {
                const original = item.comment;
                let fixed = resultMap[item.id.toString()];
                
                // Protect parsing loop against sub-object string wrappers
                if (typeof fixed === 'object' && fixed !== null) {
                    fixed = fixed.comment || fixed.text || original;
                }
                
                // Normalization check strips trailing whitespaces before matching values
                if (fixed && fixed.trim() !== original.trim()) {
                    changesCount++;
                    subjectData[item.rowIndex][item.colIndex] = fixed.trim();
                    
                    // Style Feedback: High-intensity Electric Neon Orange pops beautifully on black grids
                    fontColors[item.rowIndex][item.colIndex] = "#FF6600"; 
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
    }
};