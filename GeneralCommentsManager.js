// ==========================================
// HECTECH GeneralCommentsManager.js (Hardened for Dark Theme)
// ==========================================

const GeneralCommentsManager = {

    // 🟢 FILTER: Only these subjects are evaluated for core academic weaknesses
    ACADEMIC_SUBJECTS: ["ENGLISH", "MATHEMATICS", "SCIENCE", "FRENCH", "COMPUTING", "HUMANITIES", "BIBLE KNOWLEDGE"],

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
        const minRow = 3; // General Comments Data starts on Row 3
        
        if (row < minRow) return { valid: false, rowIndex: row }; 
        return { valid: true, rowIndex: row };
    },

    getSidebarData: function() {
        try {
            const sheet = SpreadsheetApp.getActiveSheet();
            const activeRange = sheet.getActiveRange();
            if (!activeRange) return { error: "Please click on a student row." };
            
            const row = activeRange.getRow();
            const minRow = 3; 

            if (row < minRow) return { error: `Please select a valid student (Row ${minRow}+).` };

            const ss = SpreadsheetApp.getActiveSpreadsheet();
            const classSheetName = (typeof Config !== 'undefined' && Config.CLASSLIST_SHEET_NAME) ? Config.CLASSLIST_SHEET_NAME : "CLASSLIST";
            const classlist = ss.getSheetByName(classSheetName);
            
            if (!classlist) return { error: `Critical: '${classSheetName}' sheet not found.` };
            
            // HARDENED ROW ALIGNMENT
            const subjectDataStart = minRow; 
            const classlistDataStart = 3; 
            const rowOffset = subjectDataStart - classlistDataStart; 
            const classlistRow = row - rowOffset;

            let nameCol = (typeof Config !== 'undefined' && Config.CLASSLIST_NAME_COL) ? Config.CLASSLIST_NAME_COL : 2;
            if (!nameCol || isNaN(nameCol)) nameCol = 2; 

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

            // 3. HARDENED TARGET WRITE-BACK (Finds General Comment Column explicitly)
            let targetColIndex = Config.getColByName(sheet.getName(), "GENERAL COMMENT", -1);
            if (targetColIndex === -1) targetColIndex = Config.getColByName(sheet.getName(), "COMMENT", -1);
            if (targetColIndex === -1) {
                // Fallback safely to active cell column only if header discovery completely fails
                targetColIndex = sheet.getActiveRange().getColumn();
                console.warn("Could not find explicit General Comment column header. Defaulting to selection column.");
            }

            const targetCell = sheet.getRange(row, targetColIndex);
            targetCell.setValue(outputText);
            
            // 🟢 NEON GREEN INJECTION FOR DARK THEMES
            targetCell.setFontColor("#39FF14"); 
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
        
        const reportFirstRow = (typeof Config !== 'undefined' && Config.REPORT_DATA_FIRST_ROW) ? Config.REPORT_DATA_FIRST_ROW : 3;
        const rowOffset = reportFirstRow - 3;
        const classlistRow = row - rowOffset;

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
        let totalAcademicCount = 0;
        let straightAsCount = 0;

        const subjects = (typeof Config !== 'undefined') ? Config.SUBJECT_CONFIG : {};
        for (const subj in subjects) {
            // Check if subject belongs to clean academic core list
            const cleanSubjName = subj.toUpperCase().trim();
            if (this.ACADEMIC_SUBJECTS.indexOf(cleanSubjName) === -1) continue;

            const startIdx = subjects[subj].startIdx;
            if (reportRowData.length > startIdx + 4) {
                const scoreVal = reportRowData[startIdx + 3]; 
                const gradeVal = reportRowData[startIdx + 4]; 
                
                if (scoreVal !== "" && !isNaN(scoreVal)) {
                    const numScore = parseFloat(scoreVal);
                    summary.scores[subj] = numScore;
                    totalScore += numScore;
                    count++;
                }

                if (gradeVal) {
                    totalAcademicCount++;
                    const g = String(gradeVal).trim().toUpperCase();
                    
                    // Count absolute top tier metrics for calibration
                    if (g === "A*" || g === "A") {
                        straightAsCount++;
                    }
                    
                    // Below B means C, D, E, U (True academic improvement gaps)
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

        // 🟢 HARDENED CALIBRATION LOGIC: Check for strict profile boundaries
        if (weakSubjects.length === 0) {
            if (straightAsCount === totalAcademicCount && totalAcademicCount > 0) {
                summary.lowestSubjects = "ALL_EXCELLENT"; // Perfectly triggers straight-A prompt rules
            } else {
                summary.lowestSubjects = ""; // Triggers average/steady performer prompt branch
            }
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
function getSidebarData() { verifyLicenseAuthorization(); return GeneralCommentsManager.getSidebarData(); }
function pollCurrentStudent() { verifyLicenseAuthorization(); return GeneralCommentsManager.pollCurrentStudent(); }
function processGeneralCommentWithTraits(traits, rowIndex) { verifyLicenseAuthorization(); return GeneralCommentsManager.processWithTraits(traits, rowIndex); }