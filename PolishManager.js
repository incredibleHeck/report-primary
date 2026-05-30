// ==========================================
// HECTECH PolishManager.js (Production Ready)
// ==========================================

const PolishManager = {
    process: function () {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
        const sheetName = sheet.getName().toUpperCase();

        // Safety: Prevent running on Report/Dashboard sheets
        if (sheetName.includes("REPORT") || sheetName.includes("DASHBOARD")) {
            SpreadsheetApp.getUi().alert("🚫 REPORT SHEET LOCKED.\n\nPlease go to a Subject Sheet to polish comments.");
            return;
        }

        const selection = SelectionProcessor.getSmartSelection();
        if (!selection) return;

        // Use RangeValidator to avoid processing empty rows or headers
        const range = RangeValidator.getValidDataRange(selection);
        if (!range) return;

        if (typeof StateManager !== 'undefined') StateManager.saveForUndo(range);

        const result = this.processRange(range);
        
        if (result && result.success) {
            if (result.changes > 0) {
                 SpreadsheetApp.getActiveSpreadsheet().toast(`✨ Polished ${result.changes} comments!`, "Success");
            } else {
                 SpreadsheetApp.getActiveSpreadsheet().toast("✨ No changes needed.", "HecTech");
            }
        }
    },

    processRange: function (range) {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = range.getSheet();
        
        // 1. CONFIG: Use Global Config as Source of Truth
        const classlistSheet = ss.getSheetByName(Config.CLASSLIST_SHEET_NAME);
        if (!classlistSheet) throw new Error(`❌ Missing Classlist Sheet: "${Config.CLASSLIST_SHEET_NAME}"`);
        
        const data = range.getValues();
        const fontColors = range.getFontColors();
        const fontWeights = range.getFontWeights();
        
        const startRow = range.getRow();
        const numRows = range.getNumRows();
        const numCols = range.getNumColumns();

        // 2. HARDENED ROW ALIGNMENT (Data-to-Data Row 3 Parity)
        const subjectDataStart = Config.DATA_START_ROW; // 3
        const classlistDataStart = 3; // Standardized to Row 3 to align tracking lines
        const rowOffset = subjectDataStart - classlistDataStart; // 0
        
        const startRowInClasslist = startRow - rowOffset;

        // Safety boundary check
        if (startRowInClasslist < 3) throw new Error("Selection header overlap. Please select student rows only (Row 3+).");

        // 3. DYNAMIC COLUMN FETCHING
        const nameColIndex = Config.CLASSLIST_NAME_COL;    
        const genderColIndex = Config.CLASSLIST_GENDER_COL; 
        const maxColNeeded = Math.max(nameColIndex, genderColIndex);

        const masterData = classlistSheet.getRange(startRowInClasslist, 1, numRows, maxColNeeded).getValues();

        const students = [];
        const mapping = []; 

        // 4. BUILD UNIFIED STUDENT PAYLOAD LIST
        for (let r = 0; r < numRows; r++) {
            if (!masterData[r]) continue;

            const fullName = masterData[r][nameColIndex - 1]; 
            const genderRaw = masterData[r][genderColIndex - 1]; 
            const gender = (genderRaw && String(genderRaw).trim().toUpperCase().startsWith("F")) ? "Female" : "Male";

            if (!fullName || String(fullName).trim() === "") continue;

            const cleanId = `row_${r}`;
            const studentObj = {
                id: cleanId,         // Defensive: Include 'id' for model output mapping stability
                studentId: cleanId,  // Preserve matching schema properties
                name: Config.extractFirstName(fullName), // Extract first name for style rules alignment
                gender: gender,
                comments: {}
            };

            // Only queue fields that contain valid text blocks (> 3 characters)
            let hasComments = false;
            for (let c = 0; c < numCols; c++) {
                const val = data[r][c];
                if (typeof val === 'string' && val.trim().length > 3) {
                    studentObj.comments[c.toString()] = val;
                    hasComments = true;
                }
            }

            if (hasComments) {
                students.push(studentObj);
                mapping.push({ rowIndex: r, studentId: cleanId });
            }
        }

        if (students.length === 0) return { success: true, changes: 0 };

        try {
            const model = Config.MODEL_NAME;
            const key = Config.API_KEY;
            
            // 5. CALL GEMINI REPORT BATCH
            const results = callGeminiReportBatch(
                students, 
                model, 
                key, 
                () => PromptPolish.getReportPolishPrompt(students)
            );

            let changesCount = 0;
            
            // 6. MAP AND PROCESS REWRITE DATA BACK TO INDICES
            if (Array.isArray(results)) {
                results.forEach((pStudent) => {
                    if (!pStudent) return;
                    
                    // Defensive extraction block resolves both standard 'id' and 'studentId' object properties safely
                    const receivedId = pStudent.studentId || pStudent.id;
                    if (!receivedId) return;

                    const mapEntry = mapping.find(m => m.studentId === receivedId.toString());
                    if (!mapEntry) return;

                    const r = mapEntry.rowIndex;
                    const pComments = pStudent.comments || {};

                    for (let c = 0; c < numCols; c++) {
                        const colKey = c.toString();
                        const original = data[r][c];
                        let polished = pComments[colKey];

                        // Handle exception edge case where API maps strings into sub-objects
                        if (typeof polished === 'object' && polished !== null) {
                            polished = polished.text || polished.comment || original;
                        }

                        // If cell text updated, overwrite layout and flag status style
                        if (polished && polished.trim() !== original.trim()) {
                            data[r][c] = polished.trim();
                            
                            // High-contrast neon green layout indicator for dark backgrounds
                            fontColors[r][c] = "#39FF14"; 
                            fontWeights[r][c] = "bold";
                            changesCount++;
                        }
                    }
                });
            }

            if (changesCount > 0) {
                range.setValues(data);
                range.setFontColors(fontColors);
                range.setFontWeights(fontWeights);
            }
            return { success: true, changes: changesCount };

        } catch (e) {
            console.error("Polish Failed:", e);
            throw e;
        }
    }
};