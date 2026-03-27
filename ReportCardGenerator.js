// ==========================================
// HECTECH ReportCardGenerator.js (Turbo Mode)
// ==========================================

// ==========================================
// HECTECH TURBO BATCH MANAGER
// ==========================================

function runAllReportsSafely(clientToken) {
    if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`runAllReportsSafely called. clientToken type=${typeof clientToken}`);
    const BATCH_SIZE = 8;
    const PAUSE_SECONDS = 20; 
    let remainingStudents = 999;  // Starting high to enter the loop
    let batchNumber = 1;

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ss.toast("Starting batch generation...", "HecTech Engine", 5);

    // Keep running until the process function says 0 students are left
    while (remainingStudents > 0) {
        console.log(`Starting Batch #${batchNumber}...`);
        
        // Run the generator for exactly 8 students
        remainingStudents = ReportCardGenerator.process(false, BATCH_SIZE, clientToken);

        if (remainingStudents > 0) {
            console.log(`Batch ${batchNumber} done. ${remainingStudents} left. Pausing for ${PAUSE_SECONDS}s to avoid rate limits...`);
            ss.toast(`Cooling down for ${PAUSE_SECONDS}s... ${remainingStudents} reports left.`, "HecTech Engine", PAUSE_SECONDS);
            
            // 🟢 The 20-second pause between batches
            Utilities.sleep(PAUSE_SECONDS * 1000); 
            
            batchNumber++;
        }
    }

    console.log("🎉 All reports generated successfully!");
    ss.toast("🎉 All reports generated successfully!", "HecTech Engine", -1);
}

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

    runPreview: function(clientToken) { this.process(true, 999, clientToken); },

    // Update the parameters to accept a batch limit
    process: function (isPreview = false, batchLimit = 999, clientToken) {
        if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`ReportCardGenerator.process: clientToken type=${typeof clientToken}`);
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

        // Fetch OAuth token once - use clientToken if provided, fallback to ScriptApp
        // If clientToken is an event object (e.g. from a menu click), it's an object, not a string.
        let finalToken = clientToken;
        if (typeof clientToken !== 'string' || !clientToken) {
            if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`ReportCardGenerator.process: generating fallback token`);
            finalToken = ScriptApp.getOAuthToken();
        }
        const token = finalToken;
        if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`ReportCardGenerator.process: final token type=${typeof token}`);

        // Ensure gridlines are off once (not in loop)
        templateSheet.setHiddenGridlines(false);
        const folderId = FolderManager.getAutoReportFolderId(token);
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

        if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`ReportCardGenerator.process: fetching data from source sheet`);
        const lastRow = sourceSheet.getLastRow();
        if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`ReportCardGenerator.process: sourceSheet lastRow=${lastRow}`);
        
        if (lastRow < 2) {
            if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`ReportCardGenerator.process: No data in REPORT DATA sheet`);
            ss.toast("No data found in REPORT DATA sheet.", "HecTech Engine", 5);
            return 0;
        }

        const data = sourceSheet.getRange(2, 1, lastRow - 1, sourceSheet.getLastColumn()).getValues();
        if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`ReportCardGenerator.process: data length=${data.length}, contactMap size=${contactMap.size}`);

        let successCount = 0;
        let errorCount = 0;
        let processedInThisBatch = 0; // Track how many we've done this round
        let remainingToProcess = 0;   // Track how many are left overall

        const startIdx = 0; // Data array is 0-indexed relative to row 2
        const limitIdx = isPreview ? Math.min(startIdx + 5, data.length) : data.length;

        // 🟢 PRE-CHECK: Count how many are actually left before we start looping
        let missingContacts = 0;
        for (let r = 0; r < data.length; r++) {
            const sName = data[r][cols.STUDENT_NAME];
            if (!sName) continue;
            
            const nName = Config.normalizeName(sName);
            const tIdx = contactMap.get(nName);
            if (tIdx !== undefined) {
                const stat = contactData[tIdx][waStatusCol];
                if (stat !== "PDF_READY" && stat !== "SENT") {
                    remainingToProcess++;
                }
            } else {
                missingContacts++;
            }
        }
        
        if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`ReportCardGenerator.process: remainingToProcess=${remainingToProcess}, missingContacts=${missingContacts}`);

        // If nothing left, return 0 to stop the Autopilot
        if (remainingToProcess === 0 && !isPreview) {
            if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`ReportCardGenerator.process: remainingToProcess is 0. All done.`);
            ss.toast("All reports are already generated! Use 'Reset Sent Statuses' to regenerate.", "HecTech Engine", 5);
            return 0;
        }

        if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`ReportCardGenerator.process: starting loop from ${startIdx} to ${limitIdx}`);
        for (let i = startIdx; i < limitIdx; i++) {
            // 🛑 STOP if we hit our safe batch limit for this run
            if (processedInThisBatch >= batchLimit) break;

            const row = data[i];
            const studentName = row[cols.STUDENT_NAME];
            if (!studentName) continue;

            if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`ReportCardGenerator.process: processing student ${studentName}`);

            const normalizedName = Config.normalizeName(studentName);
            const targetIndex = contactMap.get(normalizedName);
            
            // 🟢 CRITICAL FIX 1: Prevent Infinite Loop if Contact is Missing
            if (targetIndex !== undefined) {
                const existingStatus = contactData[targetIndex][waStatusCol];
                // If it's a preview, we WANT to generate it even if it's already done
                if (!isPreview && (existingStatus === "PDF_READY" || existingStatus === "SENT")) {
                    if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`ReportCardGenerator.process: skipping ${studentName}, already ${existingStatus}`);
                    continue; // Skip already generated
                }
            } else {
                console.warn(`⚠️ Skipping ${studentName} - Name missing from Contact Sheet!`);
                if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`ReportCardGenerator.process: skipping ${studentName}, missing from contact sheet`);
                if (!isPreview) continue; // Force skip to prevent infinite retry loops
            }

            // --- 1. Fill Template Using Batch Operations ---
            if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`ReportCardGenerator.process: filling template for ${studentName}`);
            this.fillTemplateFast(templateSheet, row, cols, subjects, attendanceTotal);

            // --- 2. Generate PDF ---
            SpreadsheetApp.flush();
            
            // 🟢 CRITICAL FIX 2: Moved pause BEFORE the PDF is exported
            // Increased to 3 seconds to prevent Google's "Server Error" on PDF export
            if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`ReportCardGenerator.process: sleeping 3s for ${studentName}`);
            Utilities.sleep(3000); 
            
            try {
                if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`ReportCardGenerator.process: creating blob for ${studentName}`);
                const pdfBlob = this.createBlobFromSheet(templateSheet, studentName, token);
                if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`ReportCardGenerator.process: saving file for ${studentName}`);
                const pdfFile = destinationFolder.createFile(pdfBlob);
                if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`ReportCardGenerator.process: saved file ${pdfFile.getId()}`);
                
                // Update memory array using normalized name matching
                if (targetIndex !== undefined) {
                    pdfUpdates[targetIndex][0] = pdfFile.getId();
                    pdfUpdates[targetIndex][1] = "PDF_READY";
                }
                successCount++;
                processedInThisBatch++; // Increment our batch counter
                remainingToProcess--;   // Decrement our remaining counter
            } catch (err) { 
                console.error(`PDF Error for ${studentName}: ${err.message}`);
                if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`ReportCardGenerator.process: ERROR for ${studentName}: ${err.message}`);
                errorCount++;
            }
        }

        // Bulk write-back updated D:E columns to Contact List
        if (successCount > 0) {
            contactSheet.getRange(2, Config.COL_PDF_ID, pdfUpdates.length - 1, 2).setValues(pdfUpdates.slice(1));
        }

        const msg = isPreview 
            ? `Preview Ready.${errorCount > 0 ? ` (${errorCount} errors, check console)` : ''}` 
            : `Batch Complete! ${processedInThisBatch} reports generated.${errorCount > 0 ? ` (${errorCount} errors)` : ''}`;
        ss.toast(msg, "HecTech Engine", 5);

        // Tell the Autopilot how many are left
        return remainingToProcess; 
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
            ["Student Name: " + row[cols.STUDENT_NAME], "", "", "", "", "Student ID: " + row[cols.STUDENT_ID], "", "", "", "No. on Roll: " + Config.ROLL_COUNT, "", ""],
            ["Class: " + Config.CLASS_NAME, "", "", "", "", "Attendance: " + row[cols.ATTENDANCE] + " / " + attendanceTotal, "", "", "", Config.TERM_YEAR_INFO, "", ""],
            ["Programme: PRIMARY", "", "", "", "", "Vacation Date: " + Config.REPORT_DATE, "", "", "", "Next Term Begins: " + Config.NEXT_TERM_BEGINS, "", ""]
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
        sheet.getRange(this.CELLS.DATE).setValue("Vacation Date: " + Config.REPORT_DATE);
        sheet.getRange(this.CELLS.NEXT_TERM).setValue("Next Term Begins: " + Config.NEXT_TERM_BEGINS);

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
        if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`createBlobFromSheet: token type=${typeof token}, length=${token ? token.length : 0}`);
        const ssId = SpreadsheetApp.getActiveSpreadsheet().getId();
        const gid = sheet.getSheetId();
        const url = `https://docs.google.com/spreadsheets/d/${ssId}/export?format=pdf&size=A4&portrait=false&fitw=true&fith=false&gridlines=false&gid=${gid}`;
        const params = { 
            headers: { "Authorization": "Bearer " + token },
            muteHttpExceptions: true
        };
        const response = UrlFetchApp.fetch(url, params);
        if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`createBlobFromSheet: response code=${response.getResponseCode()}`);
        if (response.getResponseCode() !== 200) {
            if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`createBlobFromSheet: error body=${response.getContentText().substring(0, 500)}`);
            throw new Error(`Export failed (${response.getResponseCode()}): Google Servers are busy. Please try again.`);
        }
        return response.getBlob().setName(`${fileName} Report.pdf`);
    }
};
