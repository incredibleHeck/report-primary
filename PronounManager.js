// ==========================================
// HECKTECK PronounManager.ts (Hardened Architecture)
// ==========================================

const PronounManager = {
    process: function () {
        const selection = SelectionProcessor.getSmartSelection(); 
        if (!selection) return;

        // 🟢 HARDENED: Inline Validation (Removes dependency on missing RangeValidator)
        const sheet = selection.getSheet();
        const row = selection.getRow();
        if (row < Config.DATA_START_ROW) {
            SpreadsheetApp.getUi().alert(`⚠️ Please select student data starting from Row ${Config.DATA_START_ROW}.`);
            return;
        }

        // Save State for Undo
        if (typeof StateManager !== 'undefined') StateManager.saveForUndo(selection);

        const result = this.processRange(selection);
        
        if (result && result.success) {
            if (result.changes > 0) {
                SpreadsheetApp.getActiveSpreadsheet().toast(`✅ Fixed pronouns for ${result.changes} students.`, "Success");
            } else {
                SpreadsheetApp.getActiveSpreadsheet().toast("✨ No pronoun errors found.", "HeckTeck");
            }
        }
    },

    processRange: function (range) {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        
        // 1. CONFIG: Use Global Config
        const classlistSheet = ss.getSheetByName(Config.CLASSLIST_SHEET_NAME);
        if (!classlistSheet) throw new Error(`❌ Missing Classlist Sheet: "${Config.CLASSLIST_SHEET_NAME}"`);

        const subjectData = range.getValues();
        const startRow = range.getRow();
        const numRows = range.getNumRows();

        // 2. ALIGNMENT LOGIC (Row 3 Awareness)
        const subjectDataStart = Config.DATA_START_ROW; // 3
        const classlistDataStart = 2; // Classlist data starts on Row 2
        const rowOffset = subjectDataStart - classlistDataStart; // 1
        
        const startRowInClasslist = startRow - rowOffset;

        // Safety Check
        if (startRowInClasslist < 2) throw new Error("Selection header overlap. Please select student rows only.");

        // 3. DYNAMIC COLUMN FETCHING
        const nameColIndex = Config.CLASSLIST_NAME_COL;    
        const genderColIndex = Config.CLASSLIST_GENDER_COL; 
        const maxColNeeded = Math.max(nameColIndex, genderColIndex);

        // Fetch Classlist Batch
        const masterData = classlistSheet.getRange(startRowInClasslist, 1, numRows, maxColNeeded).getValues();

        let batchRequest = [];

        // 4. BUILD BATCH
        for (let r = 0; r < subjectData.length; r++) {
            // Map columns correctly (0-based index)
            const fullName = masterData[r][nameColIndex - 1]; 
            const genderRaw = masterData[r][genderColIndex - 1];
            const gender = (String(genderRaw).toUpperCase().startsWith("F")) ? "Female" : "Male";

            if (!fullName || String(fullName).trim() === "") continue;

            for (let c = 0; c < subjectData[0].length; c++) {
                const comment = subjectData[r][c];
                // Only fix strings longer than 10 chars (ignore empty cells or grades)
                if (typeof comment === 'string' && comment.trim().length > 10) {
                    batchRequest.push({
                        name: this.extractFirstName(fullName),
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

            // 5. CALL GEMINI
            const fixedComments = callGeminiPronounBatch(
                batchRequest, 
                model, 
                key,
                () => PromptPronouns.getPronounFixPrompt(batchRequest) 
            );

            let changesCount = 0;
            const fontColors = range.getFontColors();
            const fontWeights = range.getFontWeights();

            // 6. APPLY CHANGES
            batchRequest.forEach((item, index) => {
                const original = item.comment;
                let fixed = fixedComments[index];

                // Handle JSON object wrappers
                if (typeof fixed === 'object' && fixed !== null) {
                    fixed = fixed.comment || fixed.correction || fixed.text || original;
                }

                // Normalization for comparison (ignore whitespace diffs)
                if (fixed && fixed.trim() !== original.trim()) {
                    changesCount++;
                    subjectData[item.rowIndex][item.colIndex] = fixed;
                    
                    // Visual Feedback: Cyan + Bold
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
    },

    extractFirstName: function(fullName) {
        if (!fullName) return "Student";
        const parts = fullName.toString().trim().split(/\s+/);
        // Returns 2nd part if exists (e.g. "Doe John" -> "John"), else 1st part
        return (parts.length > 1) ? parts[1] : parts[0];
    }
};