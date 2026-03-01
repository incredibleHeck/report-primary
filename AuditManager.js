// ==========================================
// HECKTECK AuditManager.js
// ==========================================

const AuditManager = {
    process: function () {
        const selection = SelectionProcessor.getSmartSelection();
        if (!selection) return;
        
        // 🟢 HARDENED: Use Centralized RangeValidator
        // This automatically handles the Row 3 vs Row 4 check and header protection.
        const range = RangeValidator.getValidDataRange(selection);
        
        if (!range) {
            // RangeValidator handles the toast warning if invalid
            return;
        }

        // 1. FRESH SLATE RESET
        range.setFontColor("#000000"); // Reset to Black
        range.setFontWeight("normal"); // Reset Weight
        range.clearNote();             // Clear old flags
        SpreadsheetApp.flush(); 
        
        SpreadsheetApp.getActiveSpreadsheet().toast("🔍 Running Professional Audit...", "HeckTeck AI", -1);

        const result = this.processRange(range);
        
        if (result.success && result.issues === 0) {
            SpreadsheetApp.getActiveSpreadsheet().toast("✅ Audit Complete: Clean.", "Success");
        } else if (result.success) {
            SpreadsheetApp.getActiveSpreadsheet().toast(`⚠️ Found ${result.issues} issues. Hover over RED cells.`, "Audit Done", -1);
        }
    },

    processRange: function (range) {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        
        // 2. CONFIG
        const classlistSheet = ss.getSheetByName(Config.CLASSLIST_SHEET_NAME);
        if (!classlistSheet) throw new Error(`❌ Missing Classlist Sheet: "${Config.CLASSLIST_SHEET_NAME}"`);

        const subjectData = range.getValues();
        const startRow = range.getRow();
        const numRows = range.getNumRows();

        // 3. ALIGNMENT LOGIC (Row 3 Awareness)
        const rowOffset = Config.DATA_START_ROW - 2; // (3 - 2 = 1)
        const startRowInClasslist = startRow - rowOffset;

        if (startRowInClasslist < 2) return { success: false, issues: 0 };

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
            const gender = (genderRaw && String(genderRaw).trim().toUpperCase().startsWith("F")) ? "Female" : "Male";
            
            if (!fullName) continue;

            for (let c = 0; c < subjectData[0].length; c++) {
                const comment = subjectData[r][c];
                if (typeof comment === 'string' && comment.trim().length > 5) {
                    batchRequest.push({
                        id: `${r}_${c}`, 
                        name: fullName,   
                        gender: gender,
                        comment: comment,
                        rowIndex: r,
                        colIndex: c
                    });
                }
            }
        }

        if (batchRequest.length === 0) return { success: true, issues: 0 };

        try {
            // 6. CALL GEMINI (Force gemini-2.5-pro for Audit tasks)
            const results = callGeminiAnalysisBatch(
                batchRequest,
                "gemini-2.5-pro",
                Config.API_KEY,
                () => PromptAudit.getAnalysisPrompt(batchRequest)
            );
            const resultMap = {};
            if (Array.isArray(results)) {
                results.forEach(res => { if (res && res.id) resultMap[res.id] = res; });
            }

            let issuesFound = 0;
            const fontColors = range.getFontColors();
            const notes = range.getNotes();

            // 7. APPLY RESULTS
            batchRequest.forEach((item) => {
                const result = resultMap[item.id];
                if (result && (result.hasError === true || String(result.hasError) === "true")) {
                    issuesFound++;
                    fontColors[item.rowIndex][item.colIndex] = "#FF0000"; 
                    const type = result.errorType || "ISSUE";
                    notes[item.rowIndex][item.colIndex] = `🚩 ${type}:\n${result.feedback}`;
                }
            });

            range.setFontColors(fontColors);
            range.setNotes(notes);
            
            return { success: true, issues: issuesFound };

        } catch (e) { 
            console.error("Audit Error:", e);
            throw e; 
        }
    }
};