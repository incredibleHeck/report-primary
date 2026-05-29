// ==========================================
// HECTECH SubjectCommentManager.js (Updated)
// ==========================================

const SubjectCommentManager = {
    process: function () {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
        const selection = SelectionProcessor.getSmartSelection();
        if (!selection) return;

        const scoreCol = selection.getColumn();
        let commentColIndex = Config.getColByName(sheet.getName(), "COMMENT", -1);
        
        if (commentColIndex === -1) {
            commentColIndex = scoreCol + 2;
            console.warn("Could not find 'COMMENT' header. Defaulting to scoreCol + 2.");
        }

        if (typeof StateManager !== 'undefined') {
            const undoRange = sheet.getRange(selection.getRow(), commentColIndex, selection.getNumRows(), 1);
            StateManager.saveForUndo(undoRange);
        }

        const result = this.generateBatch(selection, commentColIndex);
        
        if (result && result.success) {
            SpreadsheetApp.getActiveSpreadsheet().toast(`📝 Generated ${result.count} comments.`, "Success");
        }
    },

    processRange: function (chunkRange) {
        const sheet = chunkRange.getSheet();
        let commentColIndex = Config.getColByName(sheet.getName(), "COMMENT", -1);
        
        if (commentColIndex === -1) {
            commentColIndex = chunkRange.getColumn() + 2;
        }

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

        // 2. FETCH CONTEXT
        const ssId = ss.getId();
        const storageKey = `CTX_${sheetName.toUpperCase().replace(/\s+/g, '_')}_${ssId}`;
        let storedJson = PropertiesService.getDocumentProperties().getProperty(storageKey);
        if (!storedJson && typeof ClientScriptPropertiesBridge !== 'undefined' && ClientScriptPropertiesBridge.isHydrated()) {
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

        // 3. ALIGNMENT LOGIC
        const scores = scoreRange.getValues();
        const startRow = scoreRange.getRow();
        const numRows = scoreRange.getNumRows();

        const subjectDataStart = Config.DATA_START_ROW; 
        const classlistDataStart = 3; 
        
        const rowOffset = subjectDataStart - classlistDataStart; 
        const startRowInClasslist = startRow - rowOffset; 

        // 4. FETCH CLASSLIST DATA
        const nameColIndex = Config.CLASSLIST_NAME_COL;    
        const genderColIndex = Config.CLASSLIST_GENDER_COL; 
        const maxColNeeded = Math.max(nameColIndex, genderColIndex);
        
        if (startRowInClasslist < 3) throw new Error("Selection in header zone. Please select student data (Row 3+).");

        const masterData = classlistSheet.getRange(startRowInClasslist, 1, numRows, maxColNeeded).getValues();

        // 🟢 HARDENED DRILLDOWN: Check if this is a Club Sheet and locate the Dropdown Column
        const isPracticalSubject = (sheetName.includes("PE") || sheetName.includes("PHYSICAL") || sheetName.includes("CLUB"));
        let clubValues = [];
        if (sheetName.includes("CLUB")) {
            let clubColIndex = Config.getColByName(sheet.getName(), "CLUB NAME", -1);
            if (clubColIndex === -1) clubColIndex = Config.getColByName(sheet.getName(), "CLUB", -1);
            if (clubColIndex !== -1) {
                // Read the row range values specifically from the dropdown column
                clubValues = sheet.getRange(startRow, clubColIndex, numRows, 1).getValues();
            }
        }

        let batchRequest = [];

        // 5. BUILD BATCH WITH CUSTOM SUB-SUBJECT NAMES
        for (let r = 0; r < numRows; r++) {
            const fullName = masterData[r][nameColIndex - 1]; 
            const genderRaw = masterData[r][genderColIndex - 1]; 
            const score = scores[r][0];

            const gender = (String(genderRaw).toUpperCase().startsWith("F")) ? "Female" : "Male";

            if (!fullName || score === "" || score == null) continue;

            // Determine if row has a specific dropdown club assigned
            let assignedSubject = sheetName;
            if (sheetName.includes("CLUB") && clubValues.length > 0 && clubValues[r] && clubValues[r][0]) {
                let extractedClub = String(clubValues[r][0]).trim();
                if (extractedClub) {
                    // Title Case normalization (e.g. "coding" -> "Coding")
                    extractedClub = extractedClub.replace(/\b\w/g, c => c.toUpperCase());
                    // Append "Club" safely if missing
                    assignedSubject = extractedClub.toUpperCase().includes("CLUB") ? extractedClub : extractedClub + " Club";
                }
            }

            batchRequest.push({
                id: r.toString(), 
                name: Config.extractFirstName(fullName),
                gender: gender,
                score: score,
                subject: assignedSubject, // Dynamic Assignment (e.g., "Coding Club")
                isPractical: isPracticalSubject 
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
            targetCommentRange.setFontColor("#39FF14"); 
            targetCommentRange.setFontWeight("bold");
            
            return { success: true, count: successCount };

        } catch (e) {
            console.error(e);
            throw e;
        }
    }
};