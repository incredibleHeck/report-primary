// ==========================================
// HECTECH GeneralCommentsManager.js
// ==========================================

const GeneralCommentsManager = {

    // 🟢 STRICT CONFIG: Only these sheets are checked for "Areas of Improvement"
    SUBJECT_SHEETS: ["ENGLISH", "MATHEMATICS", "SCIENCE", "FRENCH", "COMPUTING", "HUMANITIES", "BIBLE KNOWLEDGE"],

    openSidebar: function() {
        const template = HtmlService.createTemplateFromFile('GCSidebar_Main');
        const html = template.evaluate()
            .setTitle('Class Teacher General Comment')
            .setWidth(300)
            .addMetaTag('viewport', 'width=device-width, initial-scale=1');
        SpreadsheetApp.getUi().showSidebar(html);
    },

    pollCurrentStudent: function() {
        const sheet = SpreadsheetApp.getActiveSheet();
        const range = sheet.getActiveRange();
        if (!range) return { valid: false };

        const row = range.getRow();
        // 🛡️ Safety: Ensure Config is loaded, default to 3 if not
        const minRow = 3; // 🟢 HARDCODED for General Comments Sheet which starts on Row 3 
        
        if (row < minRow) return { valid: false, rowIndex: row }; 
        return { valid: true, rowIndex: row };
    },

    getSidebarData: function() {
        try {
            const sheet = SpreadsheetApp.getActiveSheet();
            const activeRange = sheet.getActiveRange();
            if (!activeRange) return { error: "Please click on a student row." };
            
            const row = activeRange.getRow();
            const minRow = 3; // 🟢 HARDCODED for General Comments Sheet which starts on Row 3 

            if (row < minRow) return { error: `Please select a valid student (Row ${minRow}+).` };

            const ss = SpreadsheetApp.getActiveSpreadsheet();
            // 🛡️ Safety: Hardcoded fallback if Config fails
            const classSheetName = (typeof Config !== 'undefined' && Config.CLASSLIST_SHEET_NAME) ? Config.CLASSLIST_SHEET_NAME : "CLASSLIST";
            const classlist = ss.getSheetByName(classSheetName);
            
            if (!classlist) return { error: `Critical: '${classSheetName}' sheet not found.` };
            
            // 🟢 HARDENED ROW ALIGNMENT
            const subjectDataStart = minRow; 
            const classlistDataStart = 3; 
            const rowOffset = subjectDataStart - classlistDataStart; 
            const classlistRow = row - rowOffset;

            // 🛡️ CRITICAL FIX: Ensure Column Index is a Number
            let nameCol = (typeof Config !== 'undefined' && Config.CLASSLIST_NAME_COL) ? Config.CLASSLIST_NAME_COL : 2;
            if (!nameCol || isNaN(nameCol)) nameCol = 2; // Fallback to Column B

            const fullName = classlist.getRange(classlistRow, nameCol).getValue(); 

            if (!fullName || fullName === "") return { error: `No student found at Row ${row} (Classlist Row ${classlistRow}).` };

            return {
                studentName: Config.extractFirstName(fullName),
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
        
        // Dynamic Alignment
        const reportFirstRow = (typeof Config !== 'undefined' && Config.REPORT_DATA_FIRST_ROW) ? Config.REPORT_DATA_FIRST_ROW : 3;
        const rowOffset = reportFirstRow - 3;
        const classlistRow = row - rowOffset;

        // Safety: Fallback Columns
        let nameCol = (typeof Config !== 'undefined' && Config.CLASSLIST_NAME_COL) ? Config.CLASSLIST_NAME_COL : 2;
        let genderCol = (typeof Config !== 'undefined' && Config.CLASSLIST_GENDER_COL) ? Config.CLASSLIST_GENDER_COL : 5;

        const fullName = classlist.getRange(classlistRow, nameCol).getValue();
        const genderRaw = classlist.getRange(classlistRow, genderCol).getValue();
        
        const reportSheet = ss.getSheetByName(typeof Config !== 'undefined' ? Config.REPORT_SHEET_NAME : "REPORT DATA");
        const reportRowData = reportSheet.getRange(row, 1, 1, reportSheet.getLastColumn()).getValues()[0];

        let summary = {
            id: row.toString(),
            name: Config.extractFirstName(fullName),
            gender: (String(genderRaw).toUpperCase().startsWith("F")) ? "Female" : "Male",
            scores: {},
            lowestSubjects: "", 
            performanceBand: "Average",
            averageScore: 0
        };

        let totalScore = 0;
        let count = 0;
        let weakSubjects = [];

        const subjects = (typeof Config !== 'undefined') ? Config.SUBJECT_CONFIG : {};
        for (const subj in subjects) {
            const startIdx = subjects[subj].startIdx;
            // Bound check
            if (reportRowData.length > startIdx + 4) {
                const scoreVal = reportRowData[startIdx + 3]; // Total 100 (e.g. Col 6 relative to startIdx)
                const gradeVal = reportRowData[startIdx + 4]; // Grade (e.g. Col 7 relative to startIdx)
                
                if (scoreVal !== "" && !isNaN(scoreVal)) {
                    const numScore = parseFloat(scoreVal);
                    summary.scores[subj] = numScore;
                    totalScore += numScore;
                    count++;
                }

                if (gradeVal) {
                    const g = String(gradeVal).trim().toUpperCase();
                    // Below B means C, D, E, U
                    if (["C", "D", "E", "U"].indexOf(g) !== -1) {
                        weakSubjects.push(subj);
                    }
                }
            }
        }

        if (count > 0) {
            summary.averageScore = Math.round(totalScore / count);
            if (summary.averageScore >= 80) summary.performanceBand = "Excellent";
            else if (summary.averageScore >= 70) summary.performanceBand = "Above Average";
            else if (summary.averageScore >= 60) summary.performanceBand = "Average";
            else summary.performanceBand = "Below Average";
        }

        // Determine lowestSubjects using weakSubjects list
        if (weakSubjects.length === 0) {
            summary.lowestSubjects = "ALL_EXCELLENT"; 
        } else {
            const bottom = weakSubjects;
            if (bottom.length === 1) {
                summary.lowestSubjects = bottom[0];
            } else {
                const last = bottom.pop();
                summary.lowestSubjects = `${bottom.join(", ")} and ${last}`;
            }
        }

        return summary;
    }
};

// ==========================================
// GLOBAL HOOKS
// ==========================================
function getSidebarData() { return GeneralCommentsManager.getSidebarData(); }
function pollCurrentStudent() { return GeneralCommentsManager.pollCurrentStudent(); }
function processGeneralCommentWithTraits(traits, rowIndex) { return GeneralCommentsManager.processWithTraits(traits, rowIndex); }