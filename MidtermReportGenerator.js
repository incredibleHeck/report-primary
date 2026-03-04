// ==========================================
// HECKTECK MidtermReportGenerator.js
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
    RESUME: "H8",

    RAW_SCR: "D20",
    OUT_OF: "G20",
    AVE_MARK: "J20",
    AVE_GRD: "D21",
    BEST_GRD: "G21",
    WORST_GRD: "J21",

    GEN_REM: "E23",
    TEACHER: "L24",
  },

  runPreview: function () {
    this.process(true);
  },

  process: function (isPreview = false) {
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

    templateSheet.setHiddenGridlines(false);

    const token = ScriptApp.getOAuthToken();
    const folderId = FolderManager.getAutoReportFolderId();
    const destinationFolder = DriveApp.getFolderById(folderId);

    // Pre-map Contact List
    const contactData = contactSheet.getDataRange().getValues();
    const contactMap = new Map();
    for (let r = 1; r < contactData.length; r++) {
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

    const data = sourceSheet.getDataRange().getValues();
    let successCount = 0;
    let errorCount = 0;
    const startRow = 1;
    const limit = isPreview ? Math.min(startRow + 2, data.length) : data.length;

    for (let i = startRow; i < limit; i++) {
      const row = data[i];
      const studentName = row[cols.STUDENT_NAME];
      if (!studentName) continue;

      // --- 1. Fill Template Using Optimized Batch Operations ---
      this.fillTemplateFast(templateSheet, row, cols, subjects);

      // --- 2. Generate PDF ---
      SpreadsheetApp.flush();
      try {
        const pdfBlob = this.createBlobFromSheet(
          templateSheet,
          studentName + " Midterm",
          token,
        );
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
      contactSheet
        .getRange(2, Config.COL_PDF_ID, pdfUpdates.length - 1, 2)
        .setValues(pdfUpdates.slice(1));
    }

    const msg = isPreview
      ? "Midterm Preview Ready."
      : `Midterm Batch Complete! ${successCount} reports generated.${errorCount > 0 ? ` (${errorCount} errors)` : ""}`;
    ss.toast(msg, "HeckTeck Engine", 5);
  },

  /**
   * 🟢 OPTIMIZED: Fill template using batch setValues() for speed
   */
  fillTemplateFast: function (sheet, row, cols, subjects) {
    // Clear content areas in one batch call
    sheet
      .getRangeList(["A6:L8", "B10:F16", "D19:L21", "E23:L26"])
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
        "Programme: PRIMARY",
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

    // --- SUBJECT ROWS 10-16: Midterm structure (Total, Ave, empty, Grade, Comment) ---
    const subjectOrder = [
      "English",
      "Mathematics",
      "Science",
      "Bible Knowledge",
      "French",
      "Humanities",
      "Computing",
    ];
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
    sheet.getRange("B10:F16").setValues(subjectData);

    // --- SUMMARY ROWS 20-21 ---
    const summaryData1 = [
      "Raw Score: " + row[cols.RAW_SCORE],
      "",
      "",
      "Out of: 700",
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
    sheet.getRange("D20:J20").setValues([summaryData1]);
    sheet.getRange("D21:J21").setValues([summaryData2]);

    // --- GENERAL COMMENT ---
    sheet.getRange(this.CELLS.GEN_REM).setValue(row[cols.GENERAL_REMARK]);
  },

  rebuildTemplateLabels: function (sheet) {
    // Legacy method - kept for compatibility
    const ranges = ["A6:L8", "B10:F16", "D19:L21", "E23:L26"];
    sheet.getRangeList(ranges).clearContent();

    sheet.getRange(this.CELLS.NAME).setValue("STUDENT NAME: ");
    sheet.getRange(this.CELLS.ID).setValue("STUDENT ID: ");
    sheet
      .getRange(this.CELLS.ROLL)
      .setValue("No. on Roll: " + Config.ROLL_COUNT);
    sheet.getRange(this.CELLS.CLASS).setValue("Class: " + Config.CLASS_NAME);
    sheet.getRange(this.CELLS.PROG).setValue("Programme: PRIMARY");
    sheet.getRange(this.CELLS.YEAR).setValue(Config.TERM_YEAR_INFO);
    sheet.getRange(this.CELLS.BREAK).setValue(Config.SCHOOL_BREAKS);
    sheet.getRange(this.CELLS.RESUME).setValue(Config.SCHOOL_RESUMES);

    sheet.getRange(this.CELLS.RAW_SCR).setValue("Raw Score: ");
    sheet.getRange("G20").setValue("Out of: 700");
    sheet.getRange(this.CELLS.AVE_MARK).setValue("Average Mark: ");
    sheet.getRange(this.CELLS.AVE_GRD).setValue("Average Grade: ");
    sheet.getRange(this.CELLS.BEST_GRD).setValue("Best Grade: ");
    sheet.getRange(this.CELLS.WORST_GRD).setValue("Worst Grade: ");
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
    const ssId = SpreadsheetApp.getActiveSpreadsheet().getId();
    const gid = sheet.getSheetId();
    const url = `https://docs.google.com/spreadsheets/d/${ssId}/export?format=pdf&size=A4&portrait=false&fitw=true&fith=false&gridlines=false&gid=${gid}`;
    const params = { headers: { Authorization: "Bearer " + token } };
    return UrlFetchApp.fetch(url, params)
      .getBlob()
      .setName(`${fileName} Report.pdf`);
  },
};
