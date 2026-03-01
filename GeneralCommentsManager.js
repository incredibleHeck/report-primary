// ==========================================
// HECKTECK GeneralCommentsManager.js
// ==========================================

const GeneralCommentsManager = {

    // 🟢 STRICT CONFIG: Only these sheets are checked for "Areas of Improvement"
    SUBJECT_SHEETS: ["ENGLISH", "MATHEMATICS", "SCIENCE", "FRENCH", "COMPUTING", "HUMANITIES", "BIBLE KNOWLEDGE"],

    openSidebar: function() {
        const template = HtmlService.createTemplateFromFile('GCSidebar_Main');
        const html = template.evaluate()
            .setTitle('Class Teacher General Comment')
            .setWidth(420)
            .addMetaTag('viewport', 'width=device-width, initial-scale=1');
        SpreadsheetApp.getUi().showSidebar(html);
    },

    pollCurrentStudent: function() {
        const sheet = SpreadsheetApp.getActiveSheet();
        const range = sheet.getActiveRange();
        if (!range) return { valid: false };

        const row = range.getRow();
        // 🛡️ Safety: Ensure Config is loaded, default to 3 if not
        const minRow = (typeof Config !== 'undefined' && Config.DATA_START_ROW) ? Config.DATA_START_ROW : 3; 
        
        if (row < minRow) return { valid: false, rowIndex: row }; 
        return { valid: true, rowIndex: row };
    },

    getSidebarData: function() {
        try {
            const sheet = SpreadsheetApp.getActiveSheet();
            const activeRange = sheet.getActiveRange();
            if (!activeRange) return { error: "Please click on a student row." };
            
            const row = activeRange.getRow();
            const minRow = (typeof Config !== 'undefined' && Config.DATA_START_ROW) ? Config.DATA_START_ROW : 3; 

            if (row < minRow) return { error: `Please select a valid student (Row ${minRow}+).` };

            const ss = SpreadsheetApp.getActiveSpreadsheet();
            // 🛡️ Safety: Hardcoded fallback if Config fails
            const classSheetName = (typeof Config !== 'undefined' && Config.CLASSLIST_SHEET_NAME) ? Config.CLASSLIST_SHEET_NAME : "CLASSLIST";
            const classlist = ss.getSheetByName(classSheetName);
            
            if (!classlist) return { error: `Critical: '${classSheetName}' sheet not found.` };
            
            // 🟢 HARDENED ROW ALIGNMENT
            const subjectDataStart = minRow; 
            const classlistDataStart = 2; 
            const rowOffset = subjectDataStart - classlistDataStart; 
            const classlistRow = row - rowOffset;

            // 🛡️ CRITICAL FIX: Ensure Column Index is a Number
            let nameCol = (typeof Config !== 'undefined' && Config.CLASSLIST_NAME_COL) ? Config.CLASSLIST_NAME_COL : 2;
            if (!nameCol || isNaN(nameCol)) nameCol = 2; // Fallback to Column B

            const fullName = classlist.getRange(classlistRow, nameCol).getValue(); 

            if (!fullName || fullName === "") return { error: `No student found at Row ${row} (Classlist Row ${classlistRow}).` };

            return {
                studentName: this.extractFirstName(fullName),
                rowIndex: row,
                traits: TraitsConfig.categories 
            };
        } catch (e) {
            console.error("Sidebar Error:", e);
            return { error: "System Error: " + e.message };
        }
    },

    processWithTraits: function(selectedTraits, targetRowIndex) {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getActiveSheet();
        // 🛡️ Fix: Ensure row is integer
        const row = parseInt(targetRowIndex) || sheet.getActiveRange().getRow();

        // 1. GATHER DATA 
        const studentSummary = this.gatherCrossSheetData(ss, row);
        studentSummary.traits = selectedTraits;

        try {
            const model = Config.MODEL_NAME;
            const key = Config.API_KEY;

            // 2. CALL AI
            const response = callGeminiJsonBatch(
                [studentSummary], 
                model, 
                key, 
                () => PromptGenerateGeneral.getGeneralCommentPrompt([studentSummary])
            );

            let outputText = response[0];
            if (typeof outputText === 'object' && outputText !== null) {
                outputText = outputText.comment || outputText.text || JSON.stringify(outputText);
            }

            // 3. WRITE RESULT
            const activeCol = sheet.getActiveRange().getColumn();
            const targetCell = sheet.getRange(row, activeCol);

            targetCell.setValue(outputText);
            targetCell.setFontColor("#1155CC"); 
            targetCell.setFontWeight("bold");
            targetCell.setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);

            return "Done";
        } catch (e) {
            console.error("General Comment Failed:", e);
            throw e;
        }
    },

    gatherCrossSheetData: function(ss, row) {
        const classSheetName = (typeof Config !== 'undefined' && Config.CLASSLIST_SHEET_NAME) ? Config.CLASSLIST_SHEET_NAME : "CLASSLIST";
        const classlist = ss.getSheetByName(classSheetName);
        
        // Alignment
        const minRow = (typeof Config !== 'undefined' && Config.DATA_START_ROW) ? Config.DATA_START_ROW : 3;
        const rowOffset = minRow - 2;
        const classlistRow = row - rowOffset;

        // 🛡️ Safety: Fallback Columns
        let nameCol = (typeof Config !== 'undefined' && Config.CLASSLIST_NAME_COL) ? Config.CLASSLIST_NAME_COL : 2;
        let genderCol = (typeof Config !== 'undefined' && Config.CLASSLIST_GENDER_COL) ? Config.CLASSLIST_GENDER_COL : 5;

        const fullName = classlist.getRange(classlistRow, nameCol).getValue();
        const genderRaw = classlist.getRange(classlistRow, genderCol).getValue();
        
        let summary = {
            id: row.toString(),
            name: this.extractFirstName(fullName),
            gender: (String(genderRaw).toUpperCase().startsWith("F")) ? "Female" : "Male",
            scores: {},
            lowestSubjects: "", 
            performanceBand: "Average",
            averageScore: 0
        };

        // 🟢 DYNAMIC SCORE FETCHING
        let totalScore = 0;
        let count = 0;

        this.SUBJECT_SHEETS.forEach(sheetName => {
            const sheet = ss.getSheetByName(sheetName);
            if (sheet) {
                try {
                    // 🛡️ Safety: Ensure Column is Number
                    let scoreCol = -1;
                    if (typeof Config !== 'undefined') {
                        // Primary: Look for "TOTAL SCORE" column (header: "TOTAL SCORE (100)")
                        scoreCol = Config.getColByName(sheetName, "TOTAL SCORE", -1);
                    }
                    
                    // If Smart Discovery fails, skip this subject
                    if (scoreCol === -1) {
                         console.warn(`Could not find TOTAL SCORE column for ${sheetName}`);
                         return;
                    }
                    
                    if (scoreCol > 0) {
                        const score = sheet.getRange(row, scoreCol).getValue(); 
                        if (score !== "" && !isNaN(score)) {
                            const numScore = parseFloat(score);
                            summary.scores[sheetName] = numScore; 
                            totalScore += numScore;
                            count++;
                        }
                    }
                } catch(e) { console.warn(`Error fetching ${sheetName}: ${e.message}`); }
            }
        });

        if (count > 0) {
            summary.averageScore = Math.round(totalScore / count);
            if (summary.averageScore >= 80) summary.performanceBand = "Excellent";
            else if (summary.averageScore >= 70) summary.performanceBand = "Above Average";
            else if (summary.averageScore >= 60) summary.performanceBand = "Average";
            else summary.performanceBand = "Below Average";
        }

        summary.lowestSubjects = this.getAreasForImprovement(summary.scores);

        return summary;
    },

    getAreasForImprovement: function(scoresObj) {
        const entries = Object.entries(scoresObj);
        if (entries.length === 0) return null; 

        const candidates = entries.filter(e => e[1] < 80);

        if (candidates.length === 0) return "ALL_EXCELLENT"; 

        candidates.sort((a, b) => a[1] - b[1]);

        const formatName = (name) => name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        
        const bottom3 = candidates.slice(0, 3).map(e => formatName(e[0]));
        
        if (bottom3.length === 1) return bottom3[0];
        const last = bottom3.pop();
        return `${bottom3.join(", ")} and ${last}`;
    },

    extractFirstName: function(fullName) {
        if (!fullName) return "Student";
        const nameStr = fullName.toString().trim();
        const parts = nameStr.split(/[\s,]+/);
        return (parts.length > 1) ? parts[1] : parts[0];
    }
};

// ==========================================
// GLOBAL HOOKS
// ==========================================
function getSidebarData() { return GeneralCommentsManager.getSidebarData(); }
function pollCurrentStudent() { return GeneralCommentsManager.pollCurrentStudent(); }
function processGeneralCommentWithTraits(traits, rowIndex) { return GeneralCommentsManager.processWithTraits(traits, rowIndex); }