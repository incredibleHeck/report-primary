// ==========================================
// HECKTECK Main.js (Final Master - With Pro Dashboard)
// ==========================================

function onOpen() {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('HeckTeck AI 🎓')
        // --- PHASE 1: DRAFTING ---
        .addItem(' 📝 1a. Set Subject Context (Topics)', 'openSubjectContextSidebar')
        .addItem(' ⚡ 1b. Auto-Generate Subject Comments', 'runCommentGenerator')
        .addItem(' 👤 2. Class Teacher General Comment', 'openGeneralSidebar')
        .addSeparator()

        // --- PHASE 2: REFINING & STYLING ---
        .addItem(' 🎨 Polish Grammar & Style', 'runPolish')
        .addItem(' ⚧ Fix Pronouns', 'runPronouns')
        .addItem(' 🔍 Fix Name Mismatches', 'runAuditFix')
        .addSeparator()

        // --- PHASE 3: QUALITY CONTROL ---
        .addItem(' 🛡️ 3. Vet and Audit (Check for Errors)', 'runAudit')
        .addSeparator()

        // --- PHASE 4: FINALIZING & SYSTEM ---
        .addItem(' ✅ Finalize Formatting (White/Bold)', 'runFinalize')
        .addItem(' 🏥 Run System Health Check', 'RUN_SYSTEM_READINESS_CHECK') 
        .addSeparator()

        // --- PHASE 5: END OF TERM REPORT GENERATION ---
        .addItem(' 📄 EOT Preview (Check 1st Two Students)', 'runReportPreview')
        .addItem(' 🚀 EOT Generate Full Batch (PDFs)', 'runFullReportBatch')
        .addSeparator()
        
        // --- PHASE 5b: MIDTERM REPORT GENERATION ---
        .addItem(' 📋 Midterm Preview', 'runMidtermPreview')
        .addItem(' 📊 Midterm Generate Full Batch', 'runMidtermBatch')
        .addSeparator()

        
        // --- PHASE 6: DELIVERY ---
        .addItem(' 📧 Send Reports via Email', 'runEmailBatch')    
        .addItem(' 📱 Send via WhatsApp', 'runWhatsAppBlaster')     
        .addSeparator()

        // --- UTILS ---
        .addItem(' 🔄 Reset Sent Statuses (New Term)', 'runResetStatuses') 
        .addItem(' ↩ Undo Last Action', 'runUndo')
        .addToUi();
}

// ==========================================
// 🏥 PRO SYSTEM HEALTH DASHBOARD
// ==========================================
function RUN_SYSTEM_READINESS_CHECK() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const checks = [];

  // 1. SHEET EXISTENCE CHECK
  const requiredSheets = [
    { name: Config.CLASSLIST_SHEET_NAME, label: "Master Classlist" },
    { name: Config.REPORT_SHEET_NAME, label: "Term Report Sheet" },
    { name: Config.CONTACT_SHEET_NAME, label: "Contact List" }
  ];

  requiredSheets.forEach(item => {
    const sheet = ss.getSheetByName(item.name);
    checks.push({
      category: "SHEET",
      item: item.label,
      status: sheet ? "OK" : "MISSING",
      msg: sheet ? `Found: "${item.name}"` : `Missing: Create "${item.name}"`
    });
  });

  // 2. DATA INTEGRITY & COLUMNS
  try {
    // A. Contact List Specifics
    const contactSheet = ss.getSheetByName(Config.CONTACT_SHEET_NAME);
    if (contactSheet) {
        // Email Check (Col 3 / C)
        const emailVal = contactSheet.getRange(2, Config.COL_EMAIL).getValue();
        checks.push({
            category: "DATA",
            item: "Parent Email (Col C)",
            status: emailVal ? "OK" : "WARNING",
            msg: emailVal ? "Data Detected" : "Row 2 appears empty"
        });

        // PDF ID Check (Col 4 / D)
        checks.push({
            category: "DATA",
            item: "PDF ID Column (Col D)",
            status: Config.COL_PDF_ID === 4 ? "OK" : "WARNING",
            msg: "Mapped to Col " + Config.COL_PDF_ID
        });

        // Status Columns Check (Col 5 / E & Col 6 / F)
        checks.push({
            category: "DATA",
            item: "WA Status (Col E)",
            status: Config.COL_WHATSAPP_STATUS === 5 ? "OK" : "ERROR",
            msg: Config.COL_WHATSAPP_STATUS === 5 ? "Correct Position" : `Found at Col ${Config.COL_WHATSAPP_STATUS}`
        });

        checks.push({
            category: "DATA",
            item: "Email Status (Col F)",
            status: Config.COL_EMAIL_STATUS === 6 ? "OK" : "ERROR",
            msg: Config.COL_EMAIL_STATUS === 6 ? "Correct Position" : `Found at Col ${Config.COL_EMAIL_STATUS}`
        });
    }

    // B. Classlist Name Check
    const classlist = ss.getSheetByName(Config.CLASSLIST_SHEET_NAME);
    if (classlist) {
        const nameVal = classlist.getRange(2, Config.CLASSLIST_NAME_COL).getValue();
        checks.push({ 
            category: "DATA", 
            item: "Classlist Names", 
            status: nameVal ? "OK" : "WARNING", 
            msg: nameVal ? "Student Data Found" : "Row 2 is empty" 
        });
    }

  } catch (e) {
      checks.push({ category: "DATA", item: "Column Check", status: "ERROR", msg: e.message });
  }

  // 3. DRIVE & WHATSAPP RESOURCES
  try {
    const fid = Config.DESTINATION_FOLDER_ID;
    if (fid) {
      const folder = DriveApp.getFolderById(fid);
      checks.push({ category: "DRIVE", item: "Report Folder", status: "OK", msg: "Connected" });
    } else {
      checks.push({ category: "DRIVE", item: "Report Folder", status: "WARNING", msg: "Will auto-create on first use" });
    }

    // Template Sheet Check
    const templateSheet = ss.getSheetByName(Config.TEMPLATE_SHEET_NAME);
    checks.push({ 
      category: "TEMPLATE", 
      item: "Report Template Sheet", 
      status: templateSheet ? "OK" : "ERROR", 
      msg: templateSheet ? `Found: "${Config.TEMPLATE_SHEET_NAME}"` : `Missing: Create "${Config.TEMPLATE_SHEET_NAME}"`
    });

    // WhatsApp Credentials
    const phoneId = Config.WHATSAPP_PHONE_ID;
    const waToken = Config.WHATSAPP_ACCESS_TOKEN;
    checks.push({ 
      category: "WHATSAPP", 
      item: "Phone ID", 
      status: (phoneId && !phoneId.includes("YOUR_")) ? "OK" : "ERROR", 
      msg: (phoneId && !phoneId.includes("YOUR_")) ? "Configured" : "Missing in Script Props" 
    });
    checks.push({ 
      category: "WHATSAPP", 
      item: "Access Token", 
      status: (waToken && !waToken.includes("YOUR_")) ? "OK" : "ERROR", 
      msg: (waToken && !waToken.includes("YOUR_")) ? "Configured" : "Missing in Script Props" 
    });

    // Gemini API Key Check
    const apiKey = Config.API_KEY;
    checks.push({ 
      category: "AI", 
      item: "Gemini API Key", 
      status: (apiKey && !apiKey.includes("YOUR_")) ? "OK" : "ERROR", 
      msg: (apiKey && !apiKey.includes("YOUR_")) ? "Configured" : "Missing - Run Setup" 
    });

    // Email Quota
    const quota = MailApp.getRemainingDailyQuota();
    checks.push({ category: "EMAIL", item: "Daily Quota", status: quota > 10 ? "OK" : "WARNING", msg: `${quota} remaining` });

  } catch(e) {
    checks.push({ category: "RESOURCES", item: "Drive/Config", status: "ERROR", msg: e.message });
  }

  // 4. GENERATE DASHBOARD HTML
  const totalErrors = checks.filter(c => c.status === "ERROR" || c.status === "MISSING").length;
  const statusColor = totalErrors === 0 ? "#d4edda" : "#f8d7da";
  const statusText = totalErrors === 0 ? "✅ ALL SYSTEMS GO" : `🚨 ${totalErrors} CRITICAL ISSUES`;

  let html = `
    <style>
      body { font-family: 'Segoe UI', Roboto, sans-serif; padding: 0; margin: 0; background-color: #f8f9fa; }
      .container { background: white; padding: 25px; border-radius: 0; height: 100vh; display: flex; flex-direction: column; }
      h3 { margin-top: 0; color: #202124; font-size: 20px; border-bottom: 2px solid #f1f3f4; padding-bottom: 15px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 10px; flex-grow: 1; }
      th { text-align: left; color: #5f6368; font-weight: 600; border-bottom: 1px solid #dadce0; padding: 12px 8px; }
      td { border-bottom: 1px solid #f1f3f4; padding: 10px 8px; color: #3c4043; }
      .OK { color: #137333; font-weight: 700; background: #e6f4ea; padding: 4px 8px; border-radius: 12px; font-size: 11px; }
      .WARNING { color: #ea8600; font-weight: 700; background: #fef7e0; padding: 4px 8px; border-radius: 12px; font-size: 11px; }
      .ERROR, .MISSING { color: #c5221f; font-weight: 700; background: #fce8e6; padding: 4px 8px; border-radius: 12px; font-size: 11px; }
      .summary { margin-top: 20px; padding: 15px; background-color: ${statusColor}; border-radius: 8px; text-align: center; font-weight: bold; color: #202124; border: 1px solid rgba(0,0,0,0.05); }
      button { margin-top: 15px; padding: 10px 24px; cursor: pointer; background: #1a73e8; color: white; border: none; border-radius: 4px; font-weight: 600; float: right; }
      button:hover { background: #1557b0; }
    </style>
    <div class="container">
      <h3>🚀 HeckTeck System Health</h3>
      <table>
        <tr><th>Category</th><th>Check Item</th><th>Status</th><th>Details</th></tr>
  `;

  checks.forEach(c => {
    html += `<tr><td>${c.category}</td><td>${c.item}</td><td><span class="${c.status}">${c.status}</span></td><td>${c.msg}</td></tr>`;
  });

  html += `</table>
      <div class="summary">${statusText}</div>
      <div><button onclick='google.script.host.close()'>Done</button></div>
    </div>`;

  const htmlOutput = HtmlService.createHtmlOutput(html).setWidth(600).setHeight(650);
  ui.showModalDialog(htmlOutput, 'System Readiness Check');
}

// ==========================================
// 🔌 WRAPPERS (Logic Connection)
// ==========================================

// 1. Report Card Preview (Safety Step)
function runReportPreview() {
    if (typeof ReportCardGenerator !== 'undefined') {
        ReportCardGenerator.runPreview();
    } else {
        SpreadsheetApp.getUi().alert("⚠️ ReportCardGenerator not found.");
    }
}

// 2. Full Report Batch
function runFullReportBatch() {
    if (typeof ReportCardGenerator !== 'undefined') {
        ReportCardGenerator.process();
    } else {
        SpreadsheetApp.getUi().alert("⚠️ ReportCardGenerator not found.");
    }
}

// 2b. Midterm Report Preview
function runMidtermPreview() {
    if (typeof MidtermReportGenerator !== 'undefined') {
        MidtermReportGenerator.runPreview();
    } else {
        SpreadsheetApp.getUi().alert("⚠️ MidtermReportGenerator not found.");
    }
}

// 2c. Midterm Full Report Batch
function runMidtermBatch() {
    if (typeof MidtermReportGenerator !== 'undefined') {
        MidtermReportGenerator.process();
    } else {
        SpreadsheetApp.getUi().alert("⚠️ MidtermReportGenerator not found.");
    }
}

// 3. Subject Comment Generator (Scores + 2)
function runCommentGenerator() {
    if (typeof SubjectCommentManager !== 'undefined') {
        SubjectCommentManager.process();
    } else {
        SpreadsheetApp.getUi().alert("⚠️ SubjectCommentManager not found.");
    }
}

// 4. Audit & Name Mismatch Fix
function runAuditFix() {
    if (typeof FixMismatchManager !== 'undefined') {
        FixMismatchManager.run();
    } else {
        SpreadsheetApp.getUi().alert("⚠️ FixMismatchManager not found.");
    }
}

// 5. WhatsApp Integration
function runWhatsAppBlaster() {
    try {
        if (typeof WhatsAppManager !== 'undefined') WhatsAppManager.process();
        else SpreadsheetApp.getUi().alert("❌ WhatsAppManager not found.");
    } catch (e) { SpreadsheetApp.getUi().alert("WhatsApp Error: " + e.message); }
}

// 6. Email Integration
function runEmailBatch() {
    try {
        if (typeof EmailManager !== 'undefined') EmailManager.process();
        else SpreadsheetApp.getUi().alert("❌ EmailManager not found.");
    } catch (e) { SpreadsheetApp.getUi().alert("Email Error: " + e.message); }
}

// 7. Status Reset Utility (Contact List)
function runResetStatuses() {
    const ui = SpreadsheetApp.getUi();
    const result = ui.alert(
        "Reset Delivery Status?",
        "This will clear the 'SENT' markers in the Contact List.\nOnly do this if starting a new term batch.",
        ui.ButtonSet.YES_NO
    );
    
    if (result === ui.Button.YES) {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(Config.CONTACT_SHEET_NAME);
        if (sheet) {
            const lastRow = Math.max(sheet.getLastRow(), 2);
            sheet.getRange(2, 5, lastRow - 1, 2).clearContent().setBackground(null);
            SpreadsheetApp.getActiveSpreadsheet().toast("Delivery status reset!", "System");
        }
    }
}

// --- STANDARD AI ACTIONS (With Batch Sidebar) ---
function runPolish() { 
    initiateBatchAction('Polish Grammar & Style', 'polish'); 
}

function runPronouns() { 
    initiateBatchAction('Fix Pronouns', 'pronouns'); 
}

function runAudit() { 
    initiateBatchAction('Audit Comments', 'audit'); 
}

// --- SIDEBARS & UTILS ---
function openSubjectContextSidebar() {
    if (typeof SubjectContextManager !== 'undefined') SubjectContextManager.openSidebar();
}

function openGeneralSidebar() {
    if (typeof GeneralCommentsManager !== 'undefined') GeneralCommentsManager.openSidebar();
}

function runFinalize() {
    if (typeof CleanupManager !== 'undefined') CleanupManager.runFinalize();
}

function runUndo() {
    if (typeof StateManager !== 'undefined') StateManager.undo();
}

// --- BATCHING LOGIC ---
function initiateBatchAction(title, action) {
    const selection = SelectionProcessor.getSmartSelection(); 
    if (!selection) {
        SpreadsheetApp.getActiveSpreadsheet().toast("Please select a column with comments.", "No Selection");
        return;
    }

    const numRows = selection.getNumRows();

    const rangeConfig = {
        sheetId: selection.getSheet().getSheetId(),
        startRow: selection.getRow(),
        startCol: selection.getColumn(),
        numRows: numRows,
        numCols: selection.getNumColumns(),
        timestamp: new Date().getTime()
    };
    PropertiesService.getUserProperties().setProperty('ACTIVE_BATCH_CONFIG', JSON.stringify(rangeConfig));

    openSidebar(title, action);
}

function openSidebar(title, action) {
    const userProps = PropertiesService.getUserProperties();
    userProps.setProperty('CURRENT_SIDEBAR_ACTION', action);
    userProps.setProperty('CURRENT_SIDEBAR_TITLE', title);

    const html = HtmlService.createHtmlOutputFromFile('Sidebar')
        .setTitle(title)
        .setWidth(350); 
    SpreadsheetApp.getUi().showSidebar(html);
}

function getSelectionInfo() {
    const userProps = PropertiesService.getUserProperties();
    const configStr = userProps.getProperty('ACTIVE_BATCH_CONFIG');
    const action = userProps.getProperty('CURRENT_SIDEBAR_ACTION');
    const title = userProps.getProperty('CURRENT_SIDEBAR_TITLE');

    if (!configStr) return { error: "No active selection found." };

    const config = JSON.parse(configStr);

    // 🟢 EXPIRE CONFIG AFTER 1 HOUR
    if (new Date().getTime() - config.timestamp > 3600000) {
        return { error: "Session expired. Please select range again." };
    }

    return {
        numRows: config.numRows,
        chunkSize: 32, 
        action: action,
        title: title
    };
}

function processChunk(action, relativeStartRow, numRows) {
    const userProps = PropertiesService.getUserProperties();
    const configStr = userProps.getProperty('ACTIVE_BATCH_CONFIG');
    if (!configStr) throw new Error("Lost selection context.");
    
    const config = JSON.parse(configStr);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheets().find(s => s.getSheetId() === config.sheetId);
    if (!sheet) throw new Error("Sheet not found.");

    const absoluteStartRow = config.startRow + relativeStartRow;
    const chunkRange = sheet.getRange(absoluteStartRow, config.startCol, numRows, config.numCols);

    // 🟢 DYNAMIC DISCOVERY FOR BATCH ACTIONS
    switch (action) {
        case 'generate': 
            // Look for "COMMENT" column dynamically
            let commentColIndex = Config.getColByName(sheet.getName(), "COMMENT", -1);
            if (commentColIndex === -1) commentColIndex = chunkRange.getColumn() + 2; // Fallback
            return SubjectCommentManager.generateBatch(chunkRange, commentColIndex);

        case 'polish': return PolishManager.processRange(chunkRange);
        case 'pronouns': return PronounManager.processRange(chunkRange);
        case 'audit': return AuditManager.processRange(chunkRange);
        case 'auditfix': return FixMismatchManager.fixRange(chunkRange);
        default: throw new Error("Unknown action: " + action);
    }
}