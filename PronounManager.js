// ==========================================
// HECTECH PronounManager.js (Production Ready)
// ==========================================

const PronounManager = {
    process: function () {
        const selection = SelectionProcessor.getSmartSelection(); 
        if (!selection) return;

        const range = RangeValidator.getValidDataRange(selection);
        if (!range) return;

        // Save State for Undo protection
        if (typeof StateManager !== 'undefined') StateManager.saveForUndo(range);

        const result = this.processRange(range);
        
        if (result && result.success) {
            if (result.changes > 0) {
                SpreadsheetApp.getActiveSpreadsheet().toast(`✅ Fixed pronouns in ${result.changes} comments.`, "Success");
            } else {
                SpreadsheetApp.getActiveSpreadsheet().toast("✨ No pronoun errors found.", "HecTech");
            }
        }
    },

    processRange: function (range) {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        
        // 1. CONFIG: Central Source of Truth Alignment
        const classlistSheet = ss.getSheetByName(Config.CLASSLIST_SHEET_NAME);
        if (!classlistSheet) throw new Error(`❌ Missing Classlist Sheet: "${Config.CLASSLIST_SHEET_NAME}"`);

        const subjectData = range.getValues();
        const startRow = range.getRow();
        const numRows = range.getNumRows();

        // 2. HARDENED ROW ALIGNMENT (Data-to-Data Row 3 Parity)
        const subjectDataStart = Config.DATA_START_ROW; // 3
        const classlistDataStart = 3; // Standardized to Row 3 to prevent lookup displacement
        const rowOffset = subjectDataStart - classlistDataStart; // 0
        
        const startRowInClasslist = startRow - rowOffset;

        // Safety header-zone boundary check
        if (startRowInClasslist < 3) throw new Error("Selection header overlap. Please select student data rows only (Row 3+).");

        // 3. DYNAMIC COLUMN INDEX FETCHING
        const nameColIndex = Config.CLASSLIST_NAME_COL;    
        const genderColIndex = Config.CLASSLIST_GENDER_COL; 
        const maxColNeeded = Math.max(nameColIndex, genderColIndex);

        // Fetch matched Classlist Batch rows
        const masterData = classlistSheet.getRange(startRowInClasslist, 1, numRows, maxColNeeded).getValues();

        let batchRequest = [];

        // 4. BUILD SYSTEM AUDIT BATCH
        for (let r = 0; r < subjectData.length; r++) {
            if (!masterData[r]) continue;

            const fullName = masterData[r][nameColIndex - 1]; 
            const genderRaw = masterData[r][genderColIndex - 1];
            const gender = (genderRaw && String(genderRaw).trim().toUpperCase().startsWith("F")) ? "Female" : "Male";

            if (!fullName || String(fullName).trim() === "") continue;

            for (let c = 0; c < subjectData[0].length; c++) {
                const comment = subjectData[r][c];
                // Process string items containing valid evaluation comments (> 10 characters)
                if (typeof comment === 'string' && comment.trim().length > 10) {
                    batchRequest.push({
                        id: `${r}_${c}`,
                        name: Config.extractFirstName(fullName), // Pass conversational first name for alignment verification
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
            const model = Config.MODEL_NAME;
            const key = Config.API_KEY;

            // 5. CALL GEMINI IDENTITY REPAIR PIPELINE
            const fixedComments = callGeminiPronounBatch(
                batchRequest, 
                model, 
                key,
                () => PromptPronouns.getPronounFixPrompt(batchRequest) 
            );

            // Assemble translation map index
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

            // 6. OVERWRITE CELLS WITH CORRECTED TEXT FIELDS
            batchRequest.forEach((item) => {
                const original = item.comment;
                let fixed = resultMap[item.id.toString()];

                // Protect lookup against wrapped sub-objects
                if (typeof fixed === 'object' && fixed !== null) {
                    fixed = fixed.comment || fixed.correction || fixed.text || original;
                }

                // Normalization verification (ignores trailing whitespace differences)
                if (fixed && fixed.trim() !== original.trim()) {
                    changesCount++;
                    subjectData[item.rowIndex][item.colIndex] = fixed.trim();
                    
                    // Style Overlay: Electric Neon Cyan looks beautiful and clear on dark themes
                    fontColors[item.rowIndex][item.colIndex] = "#00f9ff"; 
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
            console.error("Pronoun fix failed:", e);
            throw e;
        }
    }
};