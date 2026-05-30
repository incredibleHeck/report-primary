// ==========================================
// HECTECH AuditManager.js (Hardened & Context-Aware)
// ==========================================

const AuditManager = {
  process: function () {
    const selection = SelectionProcessor.getSmartSelection();
    if (!selection) return;

    // Centralized RangeValidator handling data boundary boundaries
    const range = RangeValidator.getValidDataRange(selection);
    if (!range) return;

    // 1. FRESH SLATE RESET (Enforces high-contrast readable states)
    range.setFontColor("#ffffff"); // Reset text to high-contrast white for dark grids
    range.setFontWeight("normal"); 
    range.clearNote(); 
    SpreadsheetApp.flush();

    SpreadsheetApp.getActiveSpreadsheet().toast(
      "🔍 Running Professional Audit...",
      "HecTech AI",
      -1,
    );

    const result = this.processRange(range);

    if (result.success && result.issues === 0) {
      SpreadsheetApp.getActiveSpreadsheet().toast(
        "✅ Audit Complete: Clean.",
        "Success",
      );
    } else if (result.success) {
      SpreadsheetApp.getActiveSpreadsheet().toast(
        `⚠️ Found ${result.issues} issues. Hover over RED text cells.`,
        "Audit Done",
        -1,
      );
    }
  },

  processRange: function (range) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = range.getSheet();
    const sheetName = sheet.getName().toUpperCase();

    // 2. CONFIG VALIDATION
    const classlistSheet = ss.getSheetByName(Config.CLASSLIST_SHEET_NAME);
    if (!classlistSheet)
      throw new Error(`❌ Missing Classlist Sheet: "${Config.CLASSLIST_SHEET_NAME}"`);

    const subjectData = range.getValues();
    const startRow = range.getRow();
    const numRows = range.getNumRows();

    // 3. HARDENED ROW ALIGNMENT (Data-to-Data Row 3 Parity)
    const subjectDataStart = Config.DATA_START_ROW; // 3
    const classlistDataStart = 3; 
    const rowOffset = subjectDataStart - classlistDataStart; // 0
    const startRowInClasslist = startRow - rowOffset;

    if (startRowInClasslist < 3) return { success: false, issues: 0 };

    // 4. MASTER DATA EXTRACTION
    const nameColIndex = Config.CLASSLIST_NAME_COL;
    const genderColIndex = Config.CLASSLIST_GENDER_COL;
    const maxColNeeded = Math.max(nameColIndex, genderColIndex);

    const masterData = classlistSheet
      .getRange(startRowInClasslist, 1, numRows, maxColNeeded)
      .getValues();

    // 5. DUAL-MODE DETECTION & METRIC HARVESTING
    const isGeneralSheet = sheetName.includes("GENERAL");
    let scoreValues = [];

    if (!isGeneralSheet) {
      // Locate the explicit performance rating column for Subject/Club comments
      let scoreColIndex = Config.getColByName(sheet.getName(), "RATINGS (100)", -1);
      if (scoreColIndex === -1) scoreColIndex = Config.getColByName(sheet.getName(), "SCORE", -1);
      if (scoreColIndex === -1) scoreColIndex = Config.getColByName(sheet.getName(), "TOTAL", -1);
      
      if (scoreColIndex !== -1) {
        scoreValues = sheet.getRange(startRow, scoreColIndex, numRows, 1).getValues();
      }
    }

    let batchRequest = [];

    // 6. ASSEMBLE ARCHITECTURALLY FULL PAYLOAD
    for (let r = 0; r < subjectData.length; r++) {
      if (!masterData[r]) continue;

      const fullName = masterData[r][nameColIndex - 1];
      const genderRaw = masterData[r][genderColIndex - 1];
      const gender = genderRaw && String(genderRaw).trim().toUpperCase().startsWith("F") ? "Female" : "Male";

      if (!fullName) continue;

      // Base student profile metrics
      let auditContext = {
        name: Config.extractFirstName(fullName), // Clean alignment with conversational comments
        gender: gender
      };

      // Inject dynamic data paths to feed PromptAudit conditions
      if (isGeneralSheet) {
        if (typeof GeneralCommentsManager !== 'undefined' && GeneralCommentsManager.gatherCrossSheetData) {
          const crossSummary = GeneralCommentsManager.gatherCrossSheetData(ss, startRow + r);
          auditContext.lowestSubjects = crossSummary.lowestSubjects;
          auditContext.averageScore = crossSummary.averageScore;
        }
      } else {
        const rawScore = (scoreValues.length > 0 && scoreValues[r]) ? scoreValues[r][0] : "";
        auditContext.score = (rawScore !== "" && !isNaN(rawScore)) ? parseFloat(rawScore) : 100; // Safe default
      }

      for (let c = 0; c < subjectData[0].length; c++) {
        const comment = subjectData[r][c];
        if (typeof comment === "string" && comment.trim().length > 5) {
          batchRequest.push({
            id: `${r}_${c}`,
            ...auditContext, // Unpacks context directly to match structural prompt expectations
            comment: comment,
            rowIndex: r,
            colIndex: c,
          });
        }
      }
    }

    if (batchRequest.length === 0) return { success: true, issues: 0 };

    try {
      // 7. CALL GEMINI AUDIT ENGINE
      const results = callGeminiAnalysisBatch(
        batchRequest,
        Config.MODEL_NAME,
        Config.API_KEY,
        () => PromptAudit.getAnalysisPrompt(batchRequest),
      );

      const resultMap = {};
      if (Array.isArray(results)) {
        results.forEach((res) => {
          if (res && res.id !== undefined) resultMap[res.id.toString()] = res;
        });
      }

      let issuesFound = 0;
      const fontColors = range.getFontColors();
      const notes = range.getNotes();

      // 8. APPLY AND RENDER FLAG OVERLAYS
      batchRequest.forEach((item) => {
        const result = resultMap[item.id.toString()];
        if (result && (result.hasError === true || String(result.hasError) === "true")) {
          issuesFound++;
          // Flag target error text cell color clearly against dark layouts
          fontColors[item.rowIndex][item.colIndex] = "#FF0000"; 
          const type = result.errorType || "ISSUE";
          notes[item.rowIndex][item.colIndex] = `🚩 ${type}:\n${result.feedback}`;
        }
      });

      range.setFontColors(fontColors);
      range.setNotes(notes);

      return { success: true, issues: issuesFound };
    } catch (e) {
      console.error("Audit Error:", e);
      throw e;
    }
  },
};
