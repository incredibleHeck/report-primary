// ==========================================
// HECTECH ReportCardGenerator.js (Turbo Mode)
// ==========================================

// ==========================================
// HECTECH TURBO BATCH MANAGER
// ==========================================

function runAllReportsSafely(clientToken) {
    if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`runAllReportsSafely called. clientToken type=${typeof clientToken}`);
    const BATCH_SIZE = 10; 
    const startTime = new Date().getTime();

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ss.toast("Initializing turbo batch generation...", "HecTech Engine", 4);

    const templateSheet = ss.getSheetByName(Config.TEMPLATE_SHEET_NAME);
    if (!templateSheet) {
        ss.toast("❌ Error: Template sheet layout not resolved.", "HecTech Engine", 5);
        return;
    }

    // Resolve token persistence before scheduling autopilot loops
    let effectiveToken = (typeof clientToken === 'string' && clientToken) ? clientToken : null;
    const propKey = `OAUTH_TOKEN_CACHE_${ss.getId()}`;
    const docProps = PropertiesService.getDocumentProperties();

    if (effectiveToken) {
        docProps.setProperty(propKey, effectiveToken); 
    } else {
        effectiveToken = docProps.getProperty(propKey) || ScriptApp.getOAuthToken();
    }

    // Isolate batch sheets cleanly to avoid concurrent design collisions
    let tempSheet = null;
    try {
        tempSheet = templateSheet.copyTo(ss);
        tempSheet.setName(`TEMP_BATCH_${new Date().getTime()}`);
        tempSheet.hideSheet();
    } catch (e) {
        console.error("Failed to duplicate template layout context:", e.message);
        ss.toast("❌ Failed to compile temporary execution layout.", "HecTech Engine", 5);
        return;
    }

    try {
        let remainingStudents = 999;
        let batchNumber = 1;

        while (remainingStudents > 0) {
            const elapsed = new Date().getTime() - startTime;
            const limit = (typeof TEST_TIMEOUT_LIMIT !== 'undefined') ? TEST_TIMEOUT_LIMIT : 240000; // 4-minute safety threshold
            
            if (elapsed > limit) {
                if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`Safety limit reached (${elapsed}ms). Saving state and caching trigger lifecycle...`);
                ss.toast("Nearing system execution boundary. Auto-resuming next sequence...", "Autopilot", 8);
                
                setupResubmitTrigger('EOT'); 
                return;
            }

            console.log(`Executing Processing Sequence Block #${batchNumber}...`);
            
            // Deliver operational context variables to processor array
            remainingStudents = ReportCardGenerator.process(false, BATCH_SIZE, effectiveToken, tempSheet);

            if (remainingStudents > 0) {
                SpreadsheetApp.flush();
                Utilities.sleep(1500); // Cooldown pause to protect execution threads
                batchNumber++;
            }
        }

        console.log("All reports generated successfully across records!");
        ss.toast("🎉 All matching terminal reports compiled successfully!", "HecTech Engine", -1);
        
        // Clear all session cache keys and scheduled triggers cleanly
        docProps.deleteProperty(propKey);
        clearResubmitTriggers();
    } finally {
        if (tempSheet) {
            try {
                ss.deleteSheet(tempSheet);
                SpreadsheetApp.flush();
            } catch (err) {
                console.error("Temporary system cleanup routine dropped frame:", err.message);
            }
        }
    }
}

const ReportCardGenerator = {
    // Structural coordinate targets
    CELLS: {
        NAME: "A6",    ID: "F6",      ROLL: "J6",      
        CLASS: "A7",   ATT: "F7",     YEAR: "J7",      
        PROG: "A8",    DATE: "F8",    TERM: "I8",      NEXT_TERM: "J8"
    },

    flushContactPdfColumns: function(contactSheet, pdfUpdates) {
        const slice = pdfUpdates.slice(1);
        const n = slice.length;
        if (n === 0) return;
        
        const startRow = 2;
        const cPdf = Config.COL_PDF_ID;
        const cWa = Config.COL_WHATSAPP_STATUS;
        
        const pdfVals = slice.map(row => [row[0] != null && row[0] !== "" ? row[0] : ""]);
        const waVals = slice.map(row => [row[1] != null && row[1] !== "" ? row[1] : ""]);
        
        contactSheet.getRange(startRow, cPdf, n, 1).setValues(pdfVals);
        contactSheet.getRange(startRow, cWa, n, 1).setValues(waVals);
        SpreadsheetApp.flush();
    },

    runPreview: function(clientToken) { this.process(true, 5, clientToken); },

    process: function (isPreview = false, batchLimit = 999, clientToken, sharedTempSheet = null) {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sourceSheet = ss.getSheetByName(Config.REPORT_SHEET_NAME);
        const templateSheet = ss.getSheetByName(Config.TEMPLATE_SHEET_NAME);
        const contactSheet = ss.getSheetByName(Config.CONTACT_SHEET_NAME);
        
        if (!sourceSheet || !templateSheet || !contactSheet) {
            throw new Error("Critical structural dependencies missing from workbook container framework.");
        }

        const cols = Config.REPORT_COLUMNS;
        const subjects = Config.SUBJECT_CONFIG;
        const attendanceTotal = Config.ATTENDANCE_TOTAL;

        // Extract token payload safely
        let token = clientToken;
        if (typeof token !== 'string' || !token) {
            token = PropertiesService.getDocumentProperties().getProperty(`OAUTH_TOKEN_CACHE_${ss.getId()}`) || ScriptApp.getOAuthToken();
        }

        const folderId = FolderManager.getAutoReportFolderId(token);
        const destinationFolder = DriveApp.getFolderById(folderId);

        // Pre-map Contact sheet rows for O(1) processing lookups
        const contactData = contactSheet.getDataRange().getValues();
        const contactMap = new Map();
        for (let r = 2; r < contactData.length; r++) {
            const cName = contactData[r][Config.COL_NAME - 1];
            if (cName) contactMap.set(Config.normalizeName(cName), r);
        }

        const pdfIdCol = Config.COL_PDF_ID - 1;
        const waStatusCol = Config.COL_WHATSAPP_STATUS - 1;
        const pdfUpdates = contactData.map(row => [row[pdfIdCol], row[waStatusCol]]);
        let contactPdfDirty = false;

        const firstDataRow = Config.REPORT_DATA_FIRST_ROW;
        const lastRow = sourceSheet.getLastRow();
        
        if (lastRow < firstDataRow) {
            ss.toast("No active student records discovered inside data target.", "HecTech Engine", 4);
            return 0;
        }

        const numDataRows = lastRow - firstDataRow + 1;
        const data = sourceSheet.getRange(firstDataRow, 1, numDataRows, sourceSheet.getLastColumn()).getValues();

        let successCount = 0;
        let errorCount = 0;
        let processedInThisBatch = 0;
        let remainingToProcess = 0;

        const limitIdx = isPreview ? Math.min(5, data.length) : data.length;

        // Pre-flight execution count audit
        for (let r = 0; r < data.length; r++) {
            const sName = data[r][cols.STUDENT_NAME];
            if (!sName) continue;
            
            const nName = Config.normalizeName(sName);
            const tIdx = contactMap.get(nName);
            if (tIdx !== undefined) {
                const stat = contactData[tIdx][waStatusCol];
                if (stat !== "PDF_READY" && stat !== "SENT") remainingToProcess++;
            }
        }
        
        if (remainingToProcess === 0 && !isPreview) return 0;

        for (let i = 0; i < limitIdx; i++) {
            if (processedInThisBatch >= batchLimit) break;

            const row = data[i];
            const studentName = row[cols.STUDENT_NAME];
            if (!studentName) continue;

            const normalizedName = Config.normalizeName(studentName);
            const targetIndex = contactMap.get(normalizedName);
            
            if (targetIndex !== undefined) {
                const existingStatus = contactData[targetIndex][waStatusCol];
                if (!isPreview && (existingStatus === "PDF_READY" || existingStatus === "SENT")) continue;
            } else if (!isPreview) {
                continue; 
            }

            let tempSheet = null;
            let ownTempSheetCreated = false;
            
            try {
                if (sharedTempSheet) {
                    tempSheet = sharedTempSheet;
                } else {
                    tempSheet = templateSheet.copyTo(ss);
                    tempSheet.hideSheet();
                    tempSheet.setName(`TEMP_${studentName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 12)}_${new Date().getTime()}`);
                    ownTempSheetCreated = true;
                }

                // --- 1. POPULATE LAYOUT ARRAYS ---
                this.fillTemplateFast(tempSheet, row, cols, subjects, attendanceTotal);

                // --- 2. EXPORT EXTRUDED PDF BLOB ---
                SpreadsheetApp.flush();
                Utilities.sleep(1000); 
                
                const pdfBlob = this.createBlobFromSheet(tempSheet, studentName, token);
                const pdfFile = destinationFolder.createFile(pdfBlob);
                
                if (targetIndex !== undefined) {
                    pdfUpdates[targetIndex][0] = pdfFile.getId();
                    pdfUpdates[targetIndex][1] = "PDF_READY";
                    contactPdfDirty = true;
                }
                
                successCount++;
                processedInThisBatch++;
                remainingToProcess--;
            } catch (err) { 
                console.error(`Execution failure compiling card for ${studentName}: ${err.message}`);
                errorCount++;
            } finally {
                if (tempSheet && ownTempSheetCreated) {
                    try {
                        ss.deleteSheet(tempSheet);
                        SpreadsheetApp.flush();
                    } catch (e) {}
                }
            }
        }

        if (contactPdfDirty) {
            this.flushContactPdfColumns(contactSheet, pdfUpdates);
        }

        return remainingToProcess; 
    },

    /**
     * Writes evaluation data vectors via matrix array mappings.
     * Integrates formatting safety locks.
     */
    fillTemplateFast: function(sheet, row, cols, subjects, attendanceTotal) {
        const layout = Config.TEMPLATE_LAYOUT;
        const subjectOrder = Object.keys(subjects);
        const subStart = subjectOrder.length > 0 ? subjects[subjectOrder[0]].row : 10;
        const subEnd = subjectOrder.length > 0 ? subjects[subjectOrder[subjectOrder.length - 1]].row : 16;
        
        // 🟢 HARDENED DYNAMIC RANGE CLEARING: Protects parser from malformed or missing sheet parameters
        const rangesToClear = ["A6:L8"];
        if (subStart > 0 && subEnd >= subStart) rangesToClear.push(`B${subStart}:I${subEnd}`);
        if (layout.SUMMARY_ROW_1 > 0 && layout.SUMMARY_ROW_2 >= layout.SUMMARY_ROW_1) {
            rangesToClear.push(`D${layout.SUMMARY_ROW_1}:L${layout.SUMMARY_ROW_2}`);
        }
        if (layout.GEN_REM_ROW > 0) rangesToClear.push(`D${layout.GEN_REM_ROW}:L${layout.GEN_REM_ROW + 5}`);
        if (layout.MUSIC_ROW > 0) rangesToClear.push(`B${layout.MUSIC_ROW}:I${layout.MUSIC_ROW}`);
        if (layout.PE_ROW > 0) rangesToClear.push(`B${layout.PE_ROW}:I${layout.PE_ROW}`);
        if (layout.CLUB_ROW > 0) rangesToClear.push(`B${layout.CLUB_ROW}:I${layout.CLUB_ROW}`);
        
        sheet.getRangeList(rangesToClear).clearContent();
        
        // --- HEADER COMPILATION INTERFACE ---
        this.setRichText(sheet, "A6", "Student Name: ", row[cols.STUDENT_NAME]);
        this.setRichText(sheet, "F6", "Student ID: ", row[cols.STUDENT_ID]);
        this.setRichText(sheet, "J6", "No. on Roll: ", Config.ROLL_COUNT);
        
        this.setRichText(sheet, "A7", "Class: ", Config.CLASS_NAME);
        this.setRichText(sheet, "F7", "Attendance: ", `${row[cols.ATTENDANCE]} / ${attendanceTotal}`);
        sheet.getRange("J7").setValue(Config.TERM_YEAR_INFO);
        
        this.setRichText(sheet, "A8", "Programme: ", Config.PROGRAMME_NAME);
        this.setRichText(sheet, "F8", "Vacation Date: ", Config.REPORT_DATE);
        this.setRichText(sheet, "J8", "Next Term Begins: ", Config.NEXT_TERM_BEGINS);
        
        // --- SUBJECT MATRIX SWEEPS ---
        if (subjectOrder.length > 0) {
            const subjectData = subjectOrder.map(subj => {
                const sIdx = subjects[subj].startIdx;
                return [
                    row[sIdx],      // B: CW 20
                    row[sIdx + 1],  // C: MT 20
                    "",             // D: Structural buffer
                    row[sIdx + 2],  // E: EOT 60
                    row[sIdx + 3],  // F: Total 100
                    row[sIdx + 6],  // G: Average
                    row[sIdx + 4],  // H: Grade
                    row[sIdx + 5]   // I: Localized AI Comment
                ];
            });
            sheet.getRange(`B${subStart}:I${subEnd}`).setValues(subjectData);
        }
        
        // --- PRACTICAL & NON-SCORING CONTROLS ---
        if (layout.MUSIC_ROW > 0) {
            sheet.getRange(`F${layout.MUSIC_ROW}:I${layout.MUSIC_ROW}`).setValues([[row[cols.MUSIC_TOTAL], row[cols.MUSIC_AVG], row[cols.MUSIC_GRADE], row[cols.MUSIC_REMARK]]]);
        }
        if (layout.PE_ROW > 0) {
            sheet.getRange(`F${layout.PE_ROW}`).setValue(row[cols.PE_REMARK]);
        }
        if (layout.CLUB_ROW > 0) {
            sheet.getRange(`F${layout.CLUB_ROW}`).setValue(row[cols.CLUB_REMARK]);
        }
        
        // --- PERFORMANCE CRITERIA RATIOS ---
        const outOf = subjectOrder.length * 100;
        const summaryData = [
            ["Raw Score: " + row[cols.RAW_SCORE], "", "", "Out of: " + outOf, "", "Average Mark: " + row[cols.AVG_MARK]],
            ["Average Grade: " + row[cols.AVG_GRADE], "", "", "Best Grade: " + row[cols.BEST_GRADE], "", "Worst Grade: " + row[cols.WORST_GRADE]]
        ];
        sheet.getRange(`D${layout.SUMMARY_ROW_1}:I${layout.SUMMARY_ROW_2}`).setValues(summaryData);
        
        // --- GENERAL REVIEWS & SIGNATURE MARKS ---
        if (layout.GEN_REM_ROW > 0) {
            sheet.getRange(`D${layout.GEN_REM_ROW}`).setValue(row[cols.GENERAL_REMARK]);
            sheet.getRange(`L${layout.GEN_REM_ROW}`).setValue(row[cols.TEACHER_NAME]);
        }
    },

    rebuildTemplateLabels: function(sheet, attendanceTotal) {
        const layout = Config.TEMPLATE_LAYOUT;
        const subjectOrder = Object.keys(Config.SUBJECT_CONFIG);
        const subStart = subjectOrder.length > 0 ? Config.SUBJECT_CONFIG[subjectOrder[0]].row : 10;
        const subEnd = subjectOrder.length > 0 ? Config.SUBJECT_CONFIG[subjectOrder[subjectOrder.length - 1]].row : 16;
        
        const ranges = ["A6:L8"];
        if (subStart > 0 && subEnd >= subStart) ranges.push(`B${subStart}:I${subEnd}`);
        if (layout.SUMMARY_ROW_1 > 0 && layout.SUMMARY_ROW_2 >= layout.SUMMARY_ROW_1) {
            ranges.push(`D${layout.SUMMARY_ROW_1}:L${layout.SUMMARY_ROW_2}`);
        }
        if (layout.GEN_REM_ROW > 0) ranges.push(`D${layout.GEN_REM_ROW}:L${layout.GEN_REM_ROW + 5}`);
        if (layout.MUSIC_ROW > 0) ranges.push(`B${layout.MUSIC_ROW}:I${layout.MUSIC_ROW}`);
        if (layout.PE_ROW > 0) ranges.push(`B${layout.PE_ROW}:I${layout.PE_ROW}`);
        if (layout.CLUB_ROW > 0) ranges.push(`B${layout.CLUB_ROW}:I${layout.CLUB_ROW}`);
        sheet.getRangeList(ranges).clearContent();

        sheet.getRange(this.CELLS.NAME).setValue("STUDENT NAME: ");
        sheet.getRange(this.CELLS.ID).setValue("STUDENT ID: ");
        sheet.getRange(this.CELLS.ROLL).setValue("No. on Roll: " + Config.ROLL_COUNT); 
        sheet.getRange(this.CELLS.CLASS).setValue("Class: " + Config.CLASS_NAME);
        sheet.getRange(this.CELLS.ATT).setValue("Attendance: ");
        sheet.getRange(this.CELLS.YEAR).setValue(Config.TERM_YEAR_INFO);
        sheet.getRange(this.CELLS.PROG).setValue("Programme: " + Config.PROGRAMME_NAME);
        sheet.getRange(this.CELLS.DATE).setValue("Vacation Date: " + Config.REPORT_DATE);
        sheet.getRange(this.CELLS.NEXT_TERM).setValue("Next Term Begins: " + Config.NEXT_TERM_BEGINS);
    },

    setRichText: function(sheet, cell, label, value) {
        const fullText = label + String(value || "");
        const richText = SpreadsheetApp.newRichTextValue()
            .setText(fullText)
            .setTextStyle(0, label.length, SpreadsheetApp.newTextStyle().setBold(true).setFontColor("#FFFFFF").build())
            .setTextStyle(label.length, fullText.length, SpreadsheetApp.newTextStyle().setBold(false).setFontColor("#E2E8F0").build())
            .build();
        sheet.getRange(cell).setRichTextValue(richText);
    },

    createBlobFromSheet: function(sheet, fileName, token) {
        const ssId = SpreadsheetApp.getActiveSpreadsheet().getId();
        const gid = sheet.getSheetId();
        const url = `https://docs.google.com/spreadsheets/d/${ssId}/export?format=pdf&size=A4&portrait=false&fitw=true&fith=false&gridlines=false&gid=${gid}`;
        const params = { 
            headers: { "Authorization": "Bearer " + token },
            muteHttpExceptions: true
        };
        const response = UrlFetchApp.fetch(url, params);
        if (response.getResponseCode() !== 200) {
            throw new Error(`Google Export Engine Throttled (${response.getResponseCode()}). Rescheduling slice row.`);
        }
        return response.getBlob().setName(`${fileName} Report.pdf`);
    }
};
