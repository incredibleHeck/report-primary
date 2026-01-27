// ==========================================
// HECKTECK ReportCardGenerator (Turbo Mode 🚀)
// ==========================================

const ReportCardGenerator = {
    // 🟢 CELL COORDINATES (+4 Shift Preserved)
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

    SUBJECTS: {
        "English": { row: 10, startIdx: 2 },        
        "Mathematics": { row: 11, startIdx: 9 },    
        "Science": { row: 12, startIdx: 30 },       
        "Bible Knowledge": { row: 13, startIdx: 37 }, 
        "French": { row: 14, startIdx: 16 },        
        "Humanities": { row: 15, startIdx: 44 },    
        "Computing": { row: 16, startIdx: 23 }      
    },

    runPreview: function() { this.process(true); },

    process: function (isPreview = false) {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sourceSheet = ss.getSheetByName(Config.REPORT_SHEET_NAME);
        const templateSheet = ss.getSheetByName("END OF TERM TEMPLATE");
        const contactSheet = ss.getSheetByName("CONTACT LIST");
        
        if (!sourceSheet || !templateSheet || !contactSheet) throw new Error("❌ Sheet Error.");

        // ⚡ OPTIMIZATION 1: Ensure Gridlines are ON once (not in loop)
        templateSheet.setHiddenGridlines(false);

        // ⚡ OPTIMIZATION 2: Fetch Token Once
        const token = ScriptApp.getOAuthToken();
        const folderId = FolderManager.getAutoReportFolderId();
        const destinationFolder = DriveApp.getFolderById(folderId);

        // ⚡ OPTIMIZATION 3: Pre-Map Contact List for O(1) Lookup
        // We create a dictionary: { "Student Name": RowIndex }
        const contactData = contactSheet.getDataRange().getValues();
        const contactMap = new Map();
        // Start at row 1 (skip header) to map names to valid array indices
        for (let r = 1; r < contactData.length; r++) {
            const cName = contactData[r][0]; // Name in Col A
            if (cName) contactMap.set(cName.toString().trim(), r);
        }

        // Prepare Memory Storage for Batch Write-Back
        // We will update this array in memory and write it all at once later
        const pdfUpdates = contactData.map(row => [row[3], row[4]]); // Copy Cols D & E (PDF ID, Status)

        const data = sourceSheet.getDataRange().getValues();
        let successCount = 0;
        const startRow = 1; 
        const limit = isPreview ? Math.min(startRow + 2, data.length) : data.length;

        for (let i = startRow; i < limit; i++) {
            const row = data[i];
            const studentName = row[1];
            if (!studentName) continue;

            // --- 1. Fill Template (Standard Logic) ---
            this.rebuildTemplateLabels(templateSheet);
            
            this.setRichText(templateSheet, this.CELLS.NAME, "STUDENT NAME: ", studentName);
            this.setRichText(templateSheet, this.CELLS.ID, "STUDENT ID: ", row[0]);
            this.setRichText(templateSheet, this.CELLS.ATT, "Attendance: ", `${row[62]} / 64`);

            Object.keys(this.SUBJECTS).forEach(subject => {
                const map = this.SUBJECTS[subject];
                const r = map.row;
                const sIdx = map.startIdx;
                templateSheet.getRange(`B${r}`).setValue(row[sIdx]);     
                templateSheet.getRange(`C${r}`).setValue(row[sIdx + 1]); 
                templateSheet.getRange(`E${r}`).setValue(row[sIdx + 2]); 
                templateSheet.getRange(`F${r}`).setValue(row[sIdx + 3]); 
                templateSheet.getRange(`G${r}`).setValue(row[sIdx + 6]); 
                templateSheet.getRange(`H${r}`).setValue(row[sIdx + 4]); 
                templateSheet.getRange(`I${r}`).setValue(row[sIdx + 5]); 
            });

            templateSheet.getRange(this.CELLS.MUSIC_TOT).setValue(row[51]);
            templateSheet.getRange(this.CELLS.MUSIC_AVE).setValue(row[54]);
            templateSheet.getRange(this.CELLS.MUSIC_GRD).setValue(row[52]);
            templateSheet.getRange(this.CELLS.MUSIC_REM).setValue(row[53]);
            templateSheet.getRange(this.CELLS.PE_REM).setValue(row[65]);
            templateSheet.getRange(this.CELLS.CLUB_REM).setValue(row[66]);

            this.setRichText(templateSheet, this.CELLS.RAW_SCR, "Raw Score: ", row[55]);
            this.setRichText(templateSheet, this.CELLS.AVE_MARK, "Average Mark: ", row[56]);
            this.setRichText(templateSheet, this.CELLS.AVE_GRD, "Average Grade: ", row[57]);
            this.setRichText(templateSheet, this.CELLS.BEST_GRD, "Best Grade: ", row[59]);
            this.setRichText(templateSheet, this.CELLS.WORST_GRD, "Worst Grade: ", row[61]);
            templateSheet.getRange(this.CELLS.GEN_REM).setValue(row[64]);
            templateSheet.getRange(this.CELLS.TEACHER).setValue(row[67]); 

            // --- 2. Generate PDF ---
            SpreadsheetApp.flush(); // Required for PDF to see updates
            try {
                // Pass pre-fetched token to save time
                const pdfBlob = this.createBlobFromSheet(templateSheet, studentName, token);
                const pdfFile = destinationFolder.createFile(pdfBlob);
                
                // ⚡ OPTIMIZATION 4: Update Memory Array (No Sheet Writes)
                const targetIndex = contactMap.get(studentName.toString().trim());
                if (targetIndex !== undefined) {
                    pdfUpdates[targetIndex][0] = pdfFile.getId(); // Col D
                    pdfUpdates[targetIndex][1] = "PDF_READY";     // Col E
                }
                successCount++;
            } catch (err) { console.error(`Error: ${err.message}`); }
        }

        // ⚡ OPTIMIZATION 5: Bulk Write-Back (One single API call)
        // Write the updated D:E columns back to Contact List
        if (successCount > 0) {
            contactSheet.getRange(1, 4, pdfUpdates.length, 2).setValues(pdfUpdates);
        }

        const msg = isPreview ? "Preview Ready." : `Batch Complete! ${successCount} reports generated at speed.`;
        ss.toast(msg, "HeckTeck Engine", 5);
    },

    rebuildTemplateLabels: function(sheet) {
        const ranges = ["A6:L8", "B10:I19", "D23:L24", "D26:L32"];
        sheet.getRangeList(ranges).clearContent(); // Use rangeList for slightly faster clear

        sheet.getRange(this.CELLS.NAME).setValue("STUDENT NAME: ");
        sheet.getRange(this.CELLS.ID).setValue("STUDENT ID: ");
        sheet.getRange(this.CELLS.ROLL).setValue("No. on Roll: 25"); 
        sheet.getRange(this.CELLS.CLASS).setValue("Class: YEAR FIVE (A)");
        sheet.getRange(this.CELLS.ATT).setValue("Attendance: ");
        sheet.getRange(this.CELLS.YEAR).setValue("Year: 2025 / 2026 Term: ONE (1)");
        sheet.getRange(this.CELLS.PROG).setValue("Programme: PRIMARY");
        sheet.getRange(this.CELLS.DATE).setValue("DATE: 11TH DECEMBER 2025.");
        sheet.getRange(this.CELLS.TERM).setValue("Term: ONE (1)");
        sheet.getRange(this.CELLS.NEXT_TERM).setValue("Next Term Begins 6TH JANUARY 2026.");

        sheet.getRange(this.CELLS.RAW_SCR).setValue("Raw Score: ");
        sheet.getRange(this.CELLS.OUT_OF).setValue("Out of: 700");
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