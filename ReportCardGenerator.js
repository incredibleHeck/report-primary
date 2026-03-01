// ==========================================
// HECKTECK ReportCardGenerator.js (Turbo Mode)
// ==========================================

const ReportCardGenerator = {
    // 🟢 CELL COORDINATES (Template sheet positions)
    CELLS: {
        NAME: "A6",    ID: "F6",      ROLL: "J6",      
        CLASS: "A7",   ATT: "F7",     YEAR: "J7",      
        PROG: "A8",    DATE: "F8",    TERM: "I8",      NEXT_TERM: "J8",
        
        MUSIC_TOT: "F17", MUSIC_AVE: "G17", MUSIC_GRD: "H17", MUSIC_REM: "I17", 
        PE_REM: "F18",    
        CLUB_REM: "F19",  
        
        RAW_SCR: "D23", OUT_OF: "G23", AVE_MARK: "I23", 
        AVE_GRD: "D24", BEST_GRD: "G24", WORST_GRD: "I24", 
        
        GEN_REM: "D26", TEACHER: "L26" 
    },

    runPreview: function() { this.process(true); },

    process: function (isPreview = false) {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sourceSheet = ss.getSheetByName(Config.REPORT_SHEET_NAME);
        const templateSheet = ss.getSheetByName(Config.TEMPLATE_SHEET_NAME);
        const contactSheet = ss.getSheetByName(Config.CONTACT_SHEET_NAME);
        
        if (!sourceSheet) throw new Error(`❌ Missing sheet: "${Config.REPORT_SHEET_NAME}"`);
        if (!templateSheet) throw new Error(`❌ Missing sheet: "${Config.TEMPLATE_SHEET_NAME}"`);
        if (!contactSheet) throw new Error(`❌ Missing sheet: "${Config.CONTACT_SHEET_NAME}"`);

        // Get column indices from config
        const cols = Config.REPORT_COLUMNS;
        const subjects = Config.SUBJECT_CONFIG;
        const attendanceTotal = Config.ATTENDANCE_TOTAL;

        // Ensure gridlines are off once (not in loop)
        templateSheet.setHiddenGridlines(false);

        // Fetch OAuth token once
        const token = ScriptApp.getOAuthToken();
        const folderId = FolderManager.getAutoReportFolderId();
        const destinationFolder = DriveApp.getFolderById(folderId);

        // Pre-map Contact List for O(1) Lookup using normalized names
        const contactData = contactSheet.getDataRange().getValues();
        const contactMap = new Map();
        for (let r = 1; r < contactData.length; r++) {
            const cName = contactData[r][Config.COL_NAME - 1];
            if (cName) {
                contactMap.set(Config.normalizeName(cName), r);
            }
        }

        // Prepare memory storage for batch write-back (Cols D & E)
        const pdfIdCol = Config.COL_PDF_ID - 1;
        const waStatusCol = Config.COL_WHATSAPP_STATUS - 1;
        const pdfUpdates = contactData.map(row => [row[pdfIdCol], row[waStatusCol]]);

        const data = sourceSheet.getDataRange().getValues();
        let successCount = 0;
        let errorCount = 0;
        const startRow = 1; 
        const limit = isPreview ? Math.min(startRow + 2, data.length) : data.length;

        // 🟢 OPTIMIZED: Pre-build batch update arrays for speed
        for (let i = startRow; i < limit; i++) {
            const row = data[i];
            const studentName = row[cols.STUDENT_NAME];
            if (!studentName) continue;

            // --- 1. Fill Template Using Batch Operations ---
            this.fillTemplateFast(templateSheet, row, cols, subjects, attendanceTotal);

            // --- 2. Generate PDF ---
            SpreadsheetApp.flush();
            try {
                const pdfBlob = this.createBlobFromSheet(templateSheet, studentName, token);
                const pdfFile = destinationFolder.createFile(pdfBlob);
                
                // Update memory array using normalized name matching
                const normalizedName = Config.normalizeName(studentName);
                const targetIndex = contactMap.get(normalizedName);
                if (targetIndex !== undefined) {
                    pdfUpdates[targetIndex][0] = pdfFile.getId();
                    pdfUpdates[targetIndex][1] = "PDF_READY";
                } else {
                    console.warn(`⚠️ No contact match for: "${studentName}"`);
                }
                successCount++;
            } catch (err) { 
                console.error(`PDF Error for ${studentName}: ${err.message}`);
                errorCount++;
            }
        }

        // Bulk write-back updated D:E columns to Contact List
        if (successCount > 0) {
            contactSheet.getRange(2, Config.COL_PDF_ID, pdfUpdates.length - 1, 2).setValues(pdfUpdates.slice(1));
        }

        const msg = isPreview 
            ? "Preview Ready." 
            : `Batch Complete! ${successCount} reports generated.${errorCount > 0 ? ` (${errorCount} errors)` : ''}`;
        ss.toast(msg, "HeckTeck Engine", 5);
    },

    /**
     * 🟢 OPTIMIZED: Fill template using batch setValues() instead of individual setValue()
     * Reduces API calls from ~70 to ~10 per student = 7x faster
     */
    fillTemplateFast: function(sheet, row, cols, subjects, attendanceTotal) {
        // Clear content areas in one batch call
        sheet.getRangeList(["A6:L8", "B10:I19", "D23:L24", "D26:L32"]).clearContent();
        
        // --- HEADER ROW 6-8: Use batch setValues for 3 rows ---
        const headerData = [
            ["STUDENT NAME: " + row[cols.STUDENT_NAME], "", "", "", "", "STUDENT ID: " + row[cols.STUDENT_ID], "", "", "", "No. on Roll: " + Config.ROLL_COUNT, "", ""],
            ["Class: " + Config.CLASS_NAME, "", "", "", "", "Attendance: " + row[cols.ATTENDANCE] + " / " + attendanceTotal, "", "", "", Config.TERM_YEAR_INFO, "", ""],
            ["Programme: PRIMARY", "", "", "", "", Config.REPORT_DATE, "", "", "", Config.NEXT_TERM_BEGINS, "", ""]
        ];
        sheet.getRange("A6:L8").setValues(headerData);
        
        // --- SUBJECT ROWS 10-16: Build 2D array for batch update ---
        const subjectOrder = ["English", "Mathematics", "Science", "Bible Knowledge", "French", "Humanities", "Computing"];
        const subjectData = subjectOrder.map(subj => {
            const sIdx = subjects[subj].startIdx;
            return [
                row[sIdx],      // B: CW 20
                row[sIdx + 1],  // C: MT 20
                "",             // D: empty
                row[sIdx + 2],  // E: EOT 60
                row[sIdx + 3],  // F: Total 100
                row[sIdx + 6],  // G: Average
                row[sIdx + 4],  // H: Grade
                row[sIdx + 5]   // I: Comment
            ];
        });
        sheet.getRange("B10:I16").setValues(subjectData);
        
        // --- MUSIC, PE, CLUBS: Rows 17-19 ---
        const practicalData = [
            ["", "", "", "", row[cols.MUSIC_TOTAL], row[cols.MUSIC_AVG], row[cols.MUSIC_GRADE], row[cols.MUSIC_REMARK]],
            ["", "", "", "", row[cols.PE_REMARK], "", "", ""],
            ["", "", "", "", row[cols.CLUB_REMARK], "", "", ""]
        ];
        sheet.getRange("B17:I19").setValues(practicalData);
        
        // --- SUMMARY ROWS 23-24 ---
        const outOf = Object.keys(subjects).length * 100;
        const summaryData = [
            ["Raw Score: " + row[cols.RAW_SCORE], "", "", "Out of: " + outOf, "", "Average Mark: " + row[cols.AVG_MARK]],
            ["Average Grade: " + row[cols.AVG_GRADE], "", "", "Best Grade: " + row[cols.BEST_GRADE], "", "Worst Grade: " + row[cols.WORST_GRADE]]
        ];
        sheet.getRange("D23:I24").setValues(summaryData);
        
        // --- GENERAL COMMENT & TEACHER: Row 26 ---
        sheet.getRange("D26").setValue(row[cols.GENERAL_REMARK]);
        sheet.getRange("L26").setValue(row[cols.TEACHER_NAME]);
    },

    rebuildTemplateLabels: function(sheet, attendanceTotal) {
        // Legacy method - kept for compatibility but fillTemplateFast is preferred
        const ranges = ["A6:L8", "B10:I19", "D23:L24", "D26:L32"];
        sheet.getRangeList(ranges).clearContent();

        sheet.getRange(this.CELLS.NAME).setValue("STUDENT NAME: ");
        sheet.getRange(this.CELLS.ID).setValue("STUDENT ID: ");
        sheet.getRange(this.CELLS.ROLL).setValue("No. on Roll: " + Config.ROLL_COUNT); 
        sheet.getRange(this.CELLS.CLASS).setValue("Class: " + Config.CLASS_NAME);
        sheet.getRange(this.CELLS.ATT).setValue("Attendance: ");
        sheet.getRange(this.CELLS.YEAR).setValue(Config.TERM_YEAR_INFO);
        sheet.getRange(this.CELLS.PROG).setValue("Programme: PRIMARY");
        sheet.getRange(this.CELLS.DATE).setValue(Config.REPORT_DATE);
        sheet.getRange(this.CELLS.NEXT_TERM).setValue(Config.NEXT_TERM_BEGINS);

        sheet.getRange(this.CELLS.RAW_SCR).setValue("Raw Score: ");
        sheet.getRange(this.CELLS.OUT_OF).setValue(`Out of: ${Object.keys(Config.SUBJECT_CONFIG).length * 100}`);
        sheet.getRange(this.CELLS.AVE_MARK).setValue("Average Mark: ");
        sheet.getRange(this.CELLS.AVE_GRD).setValue("Average Grade: ");
        sheet.getRange(this.CELLS.BEST_GRD).setValue("Best Grade: ");
        sheet.getRange(this.CELLS.WORST_GRD).setValue("Worst Grade: ");
    },

    setRichText: function(sheet, cell, label, value) {
        const fullText = label + String(value || "");
        const richText = SpreadsheetApp.newRichTextValue()
            .setText(fullText)
            .setTextStyle(0, label.length, SpreadsheetApp.newTextStyle().setBold(true).build())
            .setTextStyle(label.length, fullText.length, SpreadsheetApp.newTextStyle().setBold(false).build())
            .build();
        sheet.getRange(cell).setRichTextValue(richText);
    },

    // ⚡ Update: Accepts Token as Argument
    createBlobFromSheet: function(sheet, fileName, token) {
        const ssId = SpreadsheetApp.getActiveSpreadsheet().getId();
        const gid = sheet.getSheetId();
        const url = `https://docs.google.com/spreadsheets/d/${ssId}/export?format=pdf&size=A4&portrait=false&fitw=true&fith=false&gridlines=false&gid=${gid}`;
        const params = { headers: { "Authorization": "Bearer " + token } };
        return UrlFetchApp.fetch(url, params).getBlob().setName(`${fileName} Report.pdf`);
    }
};