// ==========================================
// HECTECH SubjectCommentManager.js
// ==========================================

const SubjectCommentManager = {
    process: function () {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
        const selection = SelectionProcessor.getSmartSelection();
        if (!selection) return;

        // 🟢 HARDENED: Dynamic Discovery (No more +4)
        // We look for a header containing "COMMENT" on Row 2
        // If not found, we fallback to scoreCol + 3 (Legacy compatibility)
        const scoreCol = selection.getColumn();
        let commentColIndex = Config.getColByName(sheet.getName(), "COMMENT", -1);
        
        if (commentColIndex === -1) {
            commentColIndex = scoreCol + 2;
            console.warn("Could not find 'COMMENT' header. Defaulting to scoreCol + 2.");
        }

        // Save State for Undo
        if (typeof StateManager !== 'undefined') {
            const undoRange = sheet.getRange(selection.getRow(), commentColIndex, selection.getNumRows(), 1);
            StateManager.saveForUndo(undoRange);
        }

        const result = this.generateBatch(selection, commentColIndex);
        
        if (result && result.success) {
            SpreadsheetApp.getActiveSpreadsheet().toast(`📝 Generated ${result.count} comments.`, "Success");
        }
    },

    // 🟢 NEW: Process a specific chunk range from the sidebar
    processRange: function (chunkRange) {
        const sheet = chunkRange.getSheet();
        let commentColIndex = Config.getColByName(sheet.getName(), "COMMENT", -1);
        
        if (commentColIndex === -1) {
            // Default to 2 columns to the right of the score column
            commentColIndex = chunkRange.getColumn() + 2;
        }

        // Save State for Undo
        if (typeof StateManager !== 'undefined') {
            const undoRange = sheet.getRange(chunkRange.getRow(), commentColIndex, chunkRange.getNumRows(), 1);
            StateManager.saveForUndo(undoRange);
        }

        const result = this.generateBatch(chunkRange, commentColIndex);
        return result ? "Done" : "Failed";
    },

    generateBatch: function (scoreRange, commentColIndex) {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = scoreRange.getSheet();
        const sheetName = sheet.getName().toUpperCase();
        
        // 1. CONFIG & SHEETS
        const classlistSheet = ss.getSheetByName(Config.CLASSLIST_SHEET_NAME);
        if (!classlistSheet) throw new Error(`❌ Missing Classlist Sheet: "${Config.CLASSLIST_SHEET_NAME}"`);

        // 2. FETCH CONTEXT (container snapshot first, then legacy library props)
        const ssId = ss.getId();
        const storageKey = `CTX_${sheetName.toUpperCase().replace(/\s+/g, '_')}_${ssId}`;
        let storedJson = null;
        if (typeof ClientScriptPropertiesBridge !== 'undefined' && ClientScriptPropertiesBridge.isHydrated()) {
            storedJson = ClientScriptPropertiesBridge.getRawProperty(storageKey);
        }
        if (!storedJson) {
            storedJson = PropertiesService.getScriptProperties().getProperty(storageKey);
        }
        
        let contextData = { grade: "", topics: "" };
        if (storedJson) {
            try {
                const parsed = JSON.parse(storedJson);
                contextData.grade = parsed.grade;
                contextData.topics = parsed.topics;
            } catch (e) {}
        }

        // 3. ALIGNMENT LOGIC (Hardened for Row 3 Data)
        const scores = scoreRange.getValues();
        const startRow = scoreRange.getRow();
        const numRows = scoreRange.getNumRows();

        const subjectDataStart = Config.DATA_START_ROW; // 3
        const classlistDataStart = 2; // Classlist data starts at Row 2
        
        // Offset = 3 - 2 = 1.
        // If I am on Row 3 (Subject), I need Row 2 (Classlist).
        const rowOffset = subjectDataStart - classlistDataStart; 
        const startRowInClasslist = startRow - rowOffset; 

        // 4. FETCH CLASSLIST DATA
        const nameColIndex = Config.CLASSLIST_NAME_COL;    
        const genderColIndex = Config.CLASSLIST_GENDER_COL; 
        const maxColNeeded = Math.max(nameColIndex, genderColIndex);
        
        if (startRowInClasslist < 1) throw new Error("Selection in header zone. Please select student data (Row 3+).");

        const masterData = classlistSheet.getRange(startRowInClasslist, 1, numRows, maxColNeeded).getValues();

        let batchRequest = [];

        // 🟢 NUANCE DETECTION: PE & Clubs
        const isPracticalSubject = (sheetName.includes("PE") || sheetName.includes("PHYSICAL") || sheetName.includes("CLUB"));

        // 5. BUILD BATCH
        for (let r = 0; r < numRows; r++) {
            const fullName = masterData[r][nameColIndex - 1]; 
            const genderRaw = masterData[r][genderColIndex - 1]; 
            const score = scores[r][0];

            const gender = (String(genderRaw).toUpperCase().startsWith("F")) ? "Female" : "Male";

            if (!fullName || score === "" || score == null) continue;

            batchRequest.push({
                id: r.toString(), 
                name: this.extractFirstName(fullName),
                gender: gender,
                score: score,
                subject: sheetName,
                isPractical: isPracticalSubject // Pass flag to Prompt
            });
        }

        if (batchRequest.length === 0) return { success: true, count: 0 };

        try {
            const model = Config.MODEL_NAME;
            const key = Config.API_KEY;

            // 6. CALL GEMINI
            const aiResponseArray = callGeminiCommentBatch(
                batchRequest, 
                model, 
                key,
                () => PromptGenerateSubject.getCommentGenerationPrompt(batchRequest, contextData)
            );

            // 7. WRITE TO SHEET
            const responseMap = {};
            if (Array.isArray(aiResponseArray)) {
                aiResponseArray.forEach(item => {
                    if (item && item.id !== undefined) {
                        const text = item.comment || item.text;
                        if (text) responseMap[item.id.toString()] = text;
                    }
                });
            }

            const targetCommentRange = sheet.getRange(startRow, commentColIndex, numRows, 1);
            const currentCommentValues = targetCommentRange.getValues();
            let successCount = 0;

            batchRequest.forEach((requestItem) => {
                const id = requestItem.id;
                if (responseMap[id]) {
                    currentCommentValues[parseInt(id)][0] = responseMap[id];
                    successCount++;
                }
            });

            targetCommentRange.setValues(currentCommentValues);
            // Draft Style: Neon Green for visibility
            targetCommentRange.setFontColor("#39FF14"); 
            targetCommentRange.setFontWeight("bold");
            
            return { success: true, count: successCount };

        } catch (e) {
            console.error(e);
            throw e;
        }
    },

    extractFirstName: function(fullName) {
        if (!fullName) return "Student";
        const parts = fullName.toString().trim().split(/\s+/);
        // Region logic: usually second name is the "calling name"
        return (parts.length > 1) ? parts[1] : parts[0];
    }
};