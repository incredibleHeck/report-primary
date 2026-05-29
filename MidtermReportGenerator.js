// ==========================================
// HECTECH MidtermReportGenerator.js
// ==========================================

const MidtermReportGenerator = {
  // 🟢 CELL COORDINATES for Midterm Template
  CELLS: {
    NAME: "A6",
    ID: "F6",
    ROLL: "K6",
    CLASS: "A7",
    PROG: "F7",
    YEAR: "K7",
    BREAK: "A8",
    RESUME: "H8"
  },

  runPreview: function (clientToken) {
    this.process(true, 999, clientToken);
  },

  flushContactPdfColumns: function (contactSheet, pdfUpdates) {
    const slice = pdfUpdates.slice(1);
    const n = slice.length;
    if (n === 0) return;
    const startRow = 2;
    const cPdf = Config.COL_PDF_ID;
    const cWa = Config.COL_WHATSAPP_STATUS;
    const pdfVals = slice.map(function (row) { return [row[0] != null && row[0] !== "" ? row[0] : ""]; });
    const waVals = slice.map(function (row) { return [row[1] != null && row[1] !== "" ? row[1] : ""]; });
    contactSheet.getRange(startRow, cPdf, n, 1).setValues(pdfVals);
    contactSheet.getRange(startRow, cWa, n, 1).setValues(waVals);
    SpreadsheetApp.flush();
  },

  process: function (isPreview = false, batchLimit = 999, clientToken, sharedTempSheet = null) {
    if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`Midterm process: clientToken type=${typeof clientToken}`);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sourceSheet = ss.getSheetByName(Config.MIDTERM_SHEET_NAME);
    const templateSheet = ss.getSheetByName(Config.MIDTERM_TEMPLATE_NAME);
    const contactSheet = ss.getSheetByName(Config.CONTACT_SHEET_NAME);

    if (!sourceSheet)
      throw new Error(`❌ Missing sheet: "${Config.MIDTERM_SHEET_NAME}"`);
    if (!templateSheet)
      throw new Error(`❌ Missing sheet: "${Config.MIDTERM_TEMPLATE_NAME}"`);
    if (!contactSheet)
      throw new Error(`❌ Missing sheet: "${Config.CONTACT_SHEET_NAME}"`);

    const cols = Config.MIDTERM_COLUMNS;
    const subjects = Config.MIDTERM_SUBJECT_CONFIG;

    // Use clientToken if provided, fallback to ScriptApp
    let finalToken = clientToken;
    if (typeof clientToken !== 'string' || !clientToken) {
        if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`Midterm process: generating fallback token`);
        finalToken = ScriptApp.getOAuthToken();
    }
    const token = finalToken;
    if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`Midterm process: final token type=${typeof token}`);

    templateSheet.setHiddenGridlines(false);
    const folderId = FolderManager.getAutoReportFolderId(token);
    const destinationFolder = DriveApp.getFolderById(folderId);

    // Pre-map Contact List
    const contactData = contactSheet.getDataRange().getValues();
    const contactMap = new Map();
    for (let r = 2; r < contactData.length; r++) {
      const cName = contactData[r][Config.COL_NAME - 1];
      if (cName) {
        contactMap.set(Config.normalizeName(cName), r);
      }
    }

    const pdfIdCol = Config.COL_PDF_ID - 1;
    const waStatusCol = Config.COL_WHATSAPP_STATUS - 1;
    const pdfUpdates = contactData.map((row) => [
      row[pdfIdCol],
      row[waStatusCol],
    ]);
    let contactPdfDirty = false;

    const data = sourceSheet.getDataRange().getValues();
    let successCount = 0;
    let errorCount = 0;
    let processedInThisBatch = 0;
    let remainingToProcess = 0;
    const startRow = 2;
    const limit = isPreview ? Math.min(startRow + 5, data.length) : data.length;

    // Count how many are left overall
    let missingContacts = 0;
    for (let r = startRow; r < data.length; r++) {
      const sName = data[r][cols.STUDENT_NAME];
      if (!sName) continue;
      
      const nName = Config.normalizeName(sName);
      const tIdx = contactMap.get(nName);
      if (tIdx !== undefined) {
        const stat = contactData[tIdx][waStatusCol];
        if (stat !== "MIDTERM_READY" && stat !== "SENT") {
          remainingToProcess++;
        }
      } else {
        missingContacts++;
      }
    }

    if (remainingToProcess === 0 && !isPreview) {
      if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`Midterm process: remainingToProcess is 0. All done.`);
      ss.toast("All midterm reports are already generated! Use 'Reset Sent Statuses' to regenerate.", "HecTech Engine", 5);
      return 0;
    }

    for (let i = startRow; i < limit; i++) {
      if (processedInThisBatch >= batchLimit) break;

      const row = data[i];
      const studentName = row[cols.STUDENT_NAME];
      if (!studentName) continue;

      const normalizedName = Config.normalizeName(studentName);
      const targetIndex = contactMap.get(normalizedName);
      
      if (targetIndex !== undefined) {
        const existingStatus = contactData[targetIndex][waStatusCol];
        if (!isPreview && (existingStatus === "MIDTERM_READY" || existingStatus === "SENT")) {
          if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`Midterm process: skipping ${studentName}, already ${existingStatus}`);
          continue; // Skip already generated
        }
      } else {
        console.warn(`⚠️ Skipping ${studentName} - Name missing from Contact Sheet!`);
        if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`Midterm process: skipping ${studentName}, missing from contact sheet`);
        if (!isPreview) continue; // Skip to prevent infinite loops in batch mode
      }

      let tempSheet = null;
      let ownTempSheetCreated = false;
      try {
        if (sharedTempSheet) {
          tempSheet = sharedTempSheet;
        } else {
          // Create a temporary hidden copy of the template sheet to avoid concurrent collisions
          if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`Midterm process: duplicating template for ${studentName}`);
          tempSheet = templateSheet.copyTo(ss);
          tempSheet.hideSheet();

          const cleanName = studentName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 15);
          tempSheet.setName(`TEMP_MID_${cleanName}_${new Date().getTime()}`);
          ownTempSheetCreated = true;
        }

        // --- 1. Fill Temp Template Using Batch Operations ---
        this.fillTemplateFast(tempSheet, row, cols, subjects, Object.keys(subjects).length);

        // --- 2. Generate PDF ---
        SpreadsheetApp.flush();
        
        // Add a 3-second pause to prevent Google's "Server Error" on PDF export
        Utilities.sleep(3000);
        
        const pdfBlob = this.createBlobFromSheet(
          tempSheet,
          studentName + " Midterm",
          token,
        );
        const pdfFile = destinationFolder.createFile(pdfBlob);

        if (targetIndex !== undefined) {
          pdfUpdates[targetIndex][0] = pdfFile.getId();
          pdfUpdates[targetIndex][1] = "MIDTERM_READY";
          contactPdfDirty = true;
        } else {
          console.warn(`⚠️ No contact match for: "${studentName}"`);
        }
        successCount++;
        processedInThisBatch++;
        remainingToProcess--;
      } catch (err) {
        console.error(`Midterm PDF Error for ${studentName}: ${err.message}`);
        errorCount++;
      } finally {
        // Guarantee cleanup of the temporary sheet only if we created it
        if (tempSheet && ownTempSheetCreated) {
          try {
            ss.deleteSheet(tempSheet);
            SpreadsheetApp.flush();
          } catch (cleanupErr) {
            console.error(`Failed to delete temporary midterm sheet for ${studentName}: ${cleanupErr.message}`);
          }
        }
      }
    }

    if (contactPdfDirty) {
      this.flushContactPdfColumns(contactSheet, pdfUpdates);
    }

    const msg = isPreview
      ? `Midterm Preview Ready.${errorCount > 0 ? ` (${errorCount} errors, check console)` : ""}`
      : `Midterm Batch Complete! ${processedInThisBatch} reports generated.${errorCount > 0 ? ` (${errorCount} errors)` : ""}`;
    ss.toast(msg, "HecTech Engine", 5);

    return remainingToProcess;
  },

  /**
   * 🟢 OPTIMIZED: Fill template using batch setValues() for speed
   */
  fillTemplateFast: function (sheet, row, cols, subjects, subjectCount) {
    // Clear content areas dynamically
    const layout = Config.MIDTERM_TEMPLATE_LAYOUT;
    const subjectOrder = Object.keys(subjects);
    const subStart = subjectOrder.length > 0 ? subjects[subjectOrder[0]].row : 10;
    const subEnd = subjectOrder.length > 0 ? subjects[subjectOrder[subjectOrder.length - 1]].row : 16;
    
    sheet
      .getRangeList([
          "A6:L8", 
          `B${subStart}:F${subEnd}`, 
          `D${layout.SUMMARY_ROW_1}:L${layout.SUMMARY_ROW_2}`, 
          `E${layout.GEN_REM_ROW}:L${layout.GEN_REM_ROW + 3}`
      ])
      .clearContent();

    // --- HEADER ROWS 6-8 ---
    const headerData = [
      [
        "Student Name: " + row[cols.STUDENT_NAME],
        "",
        "",
        "",
        "",
        "Student ID: " + row[cols.STUDENT_ID],
        "",
        "",
        "",
        "",
        "No. on Roll: " + Config.ROLL_COUNT,
        "",
      ],
      [
        "Class: " + Config.CLASS_NAME,
        "",
        "",
        "",
        "",
        "Programme: " + Config.PROGRAMME_NAME,
        "",
        "",
        "",
        "",
        Config.TERM_YEAR_INFO,
        "",
      ],
      [
        Config.SCHOOL_BREAKS,
        "",
        "",
        "",
        "",
        "",
        "",
        Config.SCHOOL_RESUMES,
        "",
        "",
        "",
        "",
      ],
    ];
    sheet.getRange("A6:L8").setValues(headerData);

    // --- SUBJECT ROWS ---
    if (subjectOrder.length > 0) {
      const subjectData = subjectOrder.map((subj) => {
        const sIdx = subjects[subj].startIdx;
        return [
          row[sIdx], // B: Total Score (100)
          row[sIdx + 3], // C: Class Average
          "", // D: empty
          row[sIdx + 1], // E: Grade
          row[sIdx + 2], // F: Comment
        ];
      });
      sheet.getRange(`B${subStart}:F${subEnd}`).setValues(subjectData);
    }

    // --- SUMMARY ROWS ---
    const outOf = subjectCount * 100;
    const summaryData1 = [
      "Raw Score: " + row[cols.RAW_SCORE],
      "",
      "",
      "Out of: " + outOf,
      "",
      "",
      "Average Mark: " + row[cols.AVG_MARK],
    ];
    const summaryData2 = [
      "Average Grade: " + row[cols.AVG_GRADE],
      "",
      "",
      "Best Grade: " + row[cols.BEST_GRADE],
      "",
      "",
      "Worst Grade: " + row[cols.WORST_GRADE],
    ];
    sheet.getRange(`D${layout.SUMMARY_ROW_1}:J${layout.SUMMARY_ROW_1}`).setValues([summaryData1]);
    sheet.getRange(`D${layout.SUMMARY_ROW_2}:J${layout.SUMMARY_ROW_2}`).setValues([summaryData2]);

    // --- GENERAL COMMENT ---
    sheet.getRange(`E${layout.GEN_REM_ROW}`).setValue(row[cols.GENERAL_REMARK]);
  },

  rebuildTemplateLabels: function (sheet) {
    const layout = Config.MIDTERM_TEMPLATE_LAYOUT;
    const subjectOrder = Object.keys(Config.MIDTERM_SUBJECT_CONFIG);
    const subStart = subjectOrder.length > 0 ? Config.MIDTERM_SUBJECT_CONFIG[subjectOrder[0]].row : 10;
    const subEnd = subjectOrder.length > 0 ? Config.MIDTERM_SUBJECT_CONFIG[subjectOrder[subjectOrder.length - 1]].row : 16;
    
    const ranges = [
      "A6:L8", 
      `B${subStart}:F${subEnd}`, 
      `D${layout.SUMMARY_ROW_1}:L${layout.SUMMARY_ROW_2}`, 
      `E${layout.GEN_REM_ROW}:L${layout.GEN_REM_ROW + 3}`
    ];
    sheet.getRangeList(ranges).clearContent();

    sheet.getRange(this.CELLS.NAME).setValue("STUDENT NAME: ");
    sheet.getRange(this.CELLS.ID).setValue("STUDENT ID: ");
    sheet
      .getRange(this.CELLS.ROLL)
      .setValue("No. on Roll: " + Config.ROLL_COUNT);
    sheet.getRange(this.CELLS.CLASS).setValue("Class: " + Config.CLASS_NAME);
    sheet.getRange(this.CELLS.PROG).setValue("Programme: " + Config.PROGRAMME_NAME);
    sheet.getRange(this.CELLS.YEAR).setValue(Config.TERM_YEAR_INFO);
    sheet.getRange(this.CELLS.BREAK).setValue(Config.SCHOOL_BREAKS);
    sheet.getRange(this.CELLS.RESUME).setValue(Config.SCHOOL_RESUMES);

    sheet.getRange(`D${layout.SUMMARY_ROW_1}`).setValue("Raw Score: ");
    sheet.getRange(`G${layout.SUMMARY_ROW_1}`).setValue("Out of: " + (Object.keys(Config.MIDTERM_SUBJECT_CONFIG).length * 100));
    sheet.getRange(`J${layout.SUMMARY_ROW_1}`).setValue("Average Mark: ");
    sheet.getRange(`D${layout.SUMMARY_ROW_2}`).setValue("Average Grade: ");
    sheet.getRange(`G${layout.SUMMARY_ROW_2}`).setValue("Best Grade: ");
    sheet.getRange(`J${layout.SUMMARY_ROW_2}`).setValue("Worst Grade: ");
  },

  setRichText: function (sheet, cell, label, value) {
    const fullText = label + String(value || "");
    const richText = SpreadsheetApp.newRichTextValue()
      .setText(fullText)
      .setTextStyle(
        0,
        label.length,
        SpreadsheetApp.newTextStyle().setBold(true).build(),
      )
      .setTextStyle(
        label.length,
        fullText.length,
        SpreadsheetApp.newTextStyle().setBold(false).build(),
      )
      .build();
    sheet.getRange(cell).setRichTextValue(richText);
  },

  createBlobFromSheet: function (sheet, fileName, token) {
    if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`Midterm createBlobFromSheet: token type=${typeof token}, length=${token ? token.length : 0}`);
    const ssId = SpreadsheetApp.getActiveSpreadsheet().getId();
    const gid = sheet.getSheetId();
    const url = `https://docs.google.com/spreadsheets/d/${ssId}/export?format=pdf&size=A4&portrait=false&fitw=true&fith=false&gridlines=false&gid=${gid}`;
    const params = { 
        headers: { Authorization: "Bearer " + token },
        muteHttpExceptions: true
    };
    const response = UrlFetchApp.fetch(url, params);
    if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`Midterm createBlobFromSheet: response code=${response.getResponseCode()}`);
    if (response.getResponseCode() !== 200) {
        if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`Midterm createBlobFromSheet: error body=${response.getContentText().substring(0, 500)}`);
        throw new Error(`Export failed (${response.getResponseCode()}): Google Servers are busy. Please try again.`);
    }
    return response.getBlob().setName(`${fileName} Report.pdf`);
  },
};
