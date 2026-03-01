// ==========================================
// HECKTECK MidtermReportGenerator.js
// ==========================================

const MidtermReportGenerator = {
    // 🟢 CELL COORDINATES for Midterm Template
    CELLS: {
        NAME: "A6",    ID: "F6",      ROLL: "K6",      
        CLASS: "A7",   PROG: "F7",    YEAR: "K7",      
        BREAK: "A8",   RESUME: "H8",
        
        RAW_SCR: "D20", OUT_OF: "G20", AVE_MARK: "J20", 
        AVE_GRD: "D21", BEST_GRD: "G21", WORST_GRD: "J21", 
        
        GEN_REM: "E23", TEACHER: "L24" 
    },

    runPreview: function() { this.process(true); },

    process: function (isPreview = false) {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sourceSheet = ss.getSheetByName(Config.MIDTERM_SHEET_NAME);
        const templateSheet = ss.getSheetByName(Config.MIDTERM_TEMPLATE_NAME);
        const contactSheet = ss.getSheetByName(Config.CONTACT_SHEET_NAME);
        
        if (!sourceSheet) throw new Error(`❌ Missing sheet: "${Config.MIDTERM_SHEET_NAME}"`);
        if (!templateSheet) throw new Error(`❌ Missing sheet: "${Config.MIDTERM_TEMPLATE_NAME}"`);
        if (!contactSheet) throw new Error(`❌ Missing sheet: "${Config.CONTACT_SHEET_NAME}"`);

        const cols = Config.MIDTERM_COLUMNS;
        const subjects = Config.MIDTERM_SUBJECT_CONFIG;

        templateSheet.setHiddenGridlines(false);

        const token = ScriptApp.getOAuthToken();
        const folderId = FolderManager.getAutoReportFolderId();
        const destinationFolder = DriveApp.getFolderById(folderId);

        // Pre-map Contact List
        const contactData = contactSheet.getDataRange().getValues();
        const contactMap = new Map();
        for (let r = 1; r < contactData.length; r++) {
            const cName = contactData[r][0];
            if (cName) {
                contactMap.set(Config.normalizeName(cName), r);
            }
        }

        const pdfIdCol = Config.COL_PDF_ID - 1;
        const waStatusCol = Config.COL_WHATSAPP_STATUS - 1;
        const pdfUpdates = contactData.map(row => [row[pdfIdCol], row[waStatusCol]]);

        const data = sourceSheet.getDataRange().getValues();
        let successCount = 0;
        let errorCount = 0;
        const startRow = 1; 
        const limit = isPreview ? Math.min(startRow + 2, data.length) : data.length;

        for (let i = startRow; i < limit; i++) {
            const row = data[i];
            const studentName = row[cols.STUDENT_NAME];
            if (!studentName) continue;

            // --- 1. Fill Template ---
            this.rebuildTemplateLabels(templateSheet);
            
            this.setRichText(templateSheet, this.CELLS.NAME, "STUDENT NAME: ", studentName);
            this.setRichText(templateSheet, this.CELLS.ID, "STUDENT ID: ", row[cols.STUDENT_ID]);

            // Fill subject rows (Midterm: simpler structure - 100, GRADE, COMMENT, AVE)
            // Template columns: B=Total, C=Ave, E=Grade, F=Comment
            Object.keys(subjects).forEach(subject => {
                const map = subjects[subject];
                const r = map.row;
                const sIdx = map.startIdx;
                templateSheet.getRange(`B${r}`).setValue(row[sIdx]);       // Total Score (100)
                templateSheet.getRange(`C${r}`).setValue(row[sIdx + 3]);   // Class Average
                templateSheet.getRange(`E${r}`).setValue(row[sIdx + 1]);   // Grade
                templateSheet.getRange(`F${r}`).setValue(row[sIdx + 2]);   // Comment
            });

            // Fill summary fields
            this.setRichText(templateSheet, this.CELLS.RAW_SCR, "Raw Score: ", row[cols.RAW_SCORE]);
            this.setRichText(templateSheet, this.CELLS.AVE_MARK, "Average Mark: ", row[cols.AVG_MARK]);
            this.setRichText(templateSheet, this.CELLS.AVE_GRD, "Average Grade: ", row[cols.AVG_GRADE]);
            this.setRichText(templateSheet, this.CELLS.BEST_GRD, "Best Grade: ", row[cols.BEST_GRADE]);
            this.setRichText(templateSheet, this.CELLS.WORST_GRD, "Worst Grade: ", row[cols.WORST_GRADE]);
            templateSheet.getRange(this.CELLS.GEN_REM).setValue(row[cols.GENERAL_REMARK]);

            // --- 2. Generate PDF ---
            SpreadsheetApp.flush();
            try {
                const pdfBlob = this.createBlobFromSheet(templateSheet, studentName + " Midterm", token);
                const pdfFile = destinationFolder.createFile(pdfBlob);
                
                const normalizedName = Config.normalizeName(studentName);
                const targetIndex = contactMap.get(normalizedName);
                if (targetIndex !== undefined) {
                    pdfUpdates[targetIndex][0] = pdfFile.getId();
                    pdfUpdates[targetIndex][1] = "MIDTERM_READY";
                } else {
                    console.warn(`⚠️ No contact match for: "${studentName}"`);
                }
                successCount++;
            } catch (err) { 
                console.error(`Midterm PDF Error for ${studentName}: ${err.message}`);
                errorCount++;
            }
        }

        if (successCount > 0) {
            contactSheet.getRange(1, Config.COL_PDF_ID, pdfUpdates.length, 2).setValues(pdfUpdates);
        }

        const msg = isPreview 
            ? "Midterm Preview Ready." 
            : `Midterm Batch Complete! ${successCount} reports generated.${errorCount > 0 ? ` (${errorCount} errors)` : ''}`;
        ss.toast(msg, "HeckTeck Engine", 5);
    },

    rebuildTemplateLabels: function(sheet) {
        const ranges = ["A6:L8", "B10:F16", "D19:L21", "E23:L26"];
        sheet.getRangeList(ranges).clearContent();

        sheet.getRange(this.CELLS.NAME).setValue("STUDENT NAME: ");
        sheet.getRange(this.CELLS.ID).setValue("STUDENT ID: ");
        sheet.getRange(this.CELLS.ROLL).setValue("No. on Roll: 25"); 
        sheet.getRange(this.CELLS.CLASS).setValue("Class: YEAR FIVE (A)");
        sheet.getRange(this.CELLS.PROG).setValue("Programme: PRIMARY");
        sheet.getRange(this.CELLS.YEAR).setValue("Year: 2025 / 2026 Term: ONE (1)");
        sheet.getRange(this.CELLS.BREAK).setValue("SCHOOL BREAKS: 11TH DECEMBER 2025");
        sheet.getRange(this.CELLS.RESUME).setValue("SCHOOL RESUMES: 6TH JANUARY 2026");

        sheet.getRange(this.CELLS.RAW_SCR).setValue("Raw Score: ");
        sheet.getRange("G20").setValue("Out of: 700");
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

    createBlobFromSheet: function(sheet, fileName, token) {
        const ssId = SpreadsheetApp.getActiveSpreadsheet().getId();
        const gid = sheet.getSheetId();
        const url = `https://docs.google.com/spreadsheets/d/${ssId}/export?format=pdf&size=A4&portrait=false&fitw=true&fith=false&gridlines=false&gid=${gid}`;
        const params = { headers: { "Authorization": "Bearer " + token } };
        return UrlFetchApp.fetch(url, params).getBlob().setName(`${fileName} Report.pdf`);
    }
};
