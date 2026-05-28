// ==========================================
// HECTECH Main.js (Final Master - With Pro Dashboard)
// ==========================================

/**
 * Writes to a hidden DEBUG_LOGS sheet. Only logs if the sheet already exists
 * (create it manually when debugging; delete it to silence logging).
 */
function DEBUG_LOG(msg) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("DEBUG_LOGS");
    if (sheet) sheet.appendRow([new Date(), msg]);
  } catch(e) {}
}

function onOpen() {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('HecTech AI 🎓')
        // --- SETTINGS ---
        .addItem(' ⚙️ Class Settings', 'openSettingsSidebar')
        .addSeparator()

        // --- PHASE 1: DRAFTING ---
        .addItem(' 📝 1a. Set Subject Context (Topics)', 'openSubjectContextSidebar')
        .addItem(' ⚡ 1b. Auto-Generate Subject Comments', 'runCommentGenerator')
        .addItem(' 👤 2. Class Teacher General Comment', 'openGeneralSidebar')
        .addSeparator()

        // --- PHASE 2: REFINING & STYLING ---
        .addItem(' 🎨 Polish Grammar & Style', 'runPolish')
        .addItem(' ⚧ Fix Pronouns', 'runPronouns')
        .addItem(' 🔍 Fix Name Mismatches', 'runAuditFix')
        .addItem(' 💬 Chat with AI Assistant', 'openChatBotSidebar')
        .addSeparator()

        // --- PHASE 3: QUALITY CONTROL ---
        .addItem(' 🛡️ 3. Vet and Audit (Check for Errors)', 'runAudit')
        .addSeparator()

        // --- PHASE 4: FINALIZING & SYSTEM ---
        .addItem(' ✅ Finalize Formatting (White/Bold)', 'runFinalize')
        .addItem(' 🏥 Run System Health Check', 'RUN_SYSTEM_READINESS_CHECK') 
        .addSeparator()

        // --- PHASE 5: END OF TERM REPORT GENERATION ---
        .addItem(' 📄 EOT Preview (Check 1st Five Students)', 'runReportPreview')
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

        // --- CONNECTIVITY TESTS ---
        .addItem(' 🔌 Test WhatsApp Connection', 'runTestWhatsAppTemplate')
        .addItem(' 🤖 Test Gemini Connection', 'runTestGemini')
        .addSeparator()

        // --- UTILS ---
        .addItem(' 🔄 Reset Sent Statuses (New Term)', 'runResetStatuses') 
        .addItem(' 📁 Reset Folder Configuration', 'runResetFolderConfig')
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
        const emailVal = contactSheet.getRange(3, Config.COL_EMAIL).getValue();
        checks.push({
            category: "DATA",
            item: "Parent Email (Col C)",
            status: emailVal ? "OK" : "WARNING",
            msg: emailVal ? "Data Detected" : "Row 3 appears empty"
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
        const nameVal = classlist.getRange(3, Config.CLASSLIST_NAME_COL).getValue();
        checks.push({ 
            category: "DATA", 
            item: "Classlist Names", 
            status: nameVal ? "OK" : "WARNING", 
            msg: nameVal ? "Student Data Found" : "Row 3 is empty" 
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

    // WhatsApp Template Config
    const waTemplateName = Config.WHATSAPP_TEMPLATE_NAME;
    const waTemplateLang = Config.WHATSAPP_TEMPLATE_LANGUAGE;
    checks.push({
      category: "WHATSAPP",
      item: "Template Name",
      status: waTemplateName ? "OK" : "WARNING",
      msg: waTemplateName ? waTemplateName : "Not set (default: student_report_pdf)"
    });
    checks.push({
      category: "WHATSAPP",
      item: "Template Language",
      status: waTemplateLang ? "OK" : "WARNING",
      msg: waTemplateLang ? waTemplateLang + ' (must match Meta exactly: en, en_US, or en_GB)' : "Not set (default: en)"
    });

    // Gemini API Key Check
    const apiKey = Config.API_KEY;
    checks.push({ 
      category: "AI", 
      item: "Gemini API Key", 
      status: (apiKey && !apiKey.includes("YOUR_")) ? "OK" : "ERROR", 
      msg: (apiKey && !apiKey.includes("YOUR_")) ? "Configured" : "Missing - Run Setup" 
    });

    // Gemini Model
    const modelName = Config.MODEL_NAME;
    checks.push({
      category: "AI",
      item: "Gemini Model",
      status: modelName ? "OK" : "WARNING",
      msg: modelName || "Not set (default: gemini-2.5-flash)"
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
      <h3>🚀 HecTech System Health</h3>
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

  const htmlOutput = HtmlService.createHtmlOutput(html).setWidth(800).setHeight(650);
  ui.showModalDialog(htmlOutput, 'System Readiness Check');
}

// ==========================================
// 🔌 WRAPPERS (Logic Connection)
// ==========================================

// 1. Report Card Preview (Safety Step)
function runReportPreview() {
    if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`runReportPreview called directly in Master`);
    if (typeof ReportCardGenerator !== 'undefined') {
        ReportCardGenerator.runPreview(ScriptApp.getOAuthToken());
    } else {
        SpreadsheetApp.getUi().alert("⚠️ ReportCardGenerator not found.");
    }
}

function runReportPreview_Client(clientToken) {
    if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`runReportPreview_Client called. token type=${typeof clientToken}`);
    if (typeof ReportCardGenerator !== 'undefined') {
        ReportCardGenerator.runPreview(clientToken);
    } else {
        SpreadsheetApp.getUi().alert("⚠️ ReportCardGenerator not found.");
    }
}

// 2. Full Report Batch
function runFullReportBatch() {
    runAllReportsSafely(ScriptApp.getOAuthToken());
}

function runFullReportBatch_Client(clientToken) {
    runAllReportsSafely(clientToken);
}

// 2b. Midterm Report Preview
function runMidtermPreview() {
    if (typeof MidtermReportGenerator !== 'undefined') {
        MidtermReportGenerator.runPreview(ScriptApp.getOAuthToken());
    } else {
        SpreadsheetApp.getUi().alert("⚠️ MidtermReportGenerator not found.");
    }
}

function runMidtermPreview_Client(clientToken) {
    if (typeof MidtermReportGenerator !== 'undefined') {
        MidtermReportGenerator.runPreview(clientToken);
    } else {
        SpreadsheetApp.getUi().alert("⚠️ MidtermReportGenerator not found.");
    }
}

// 2c. Midterm Full Report Batch
function runMidtermBatch() {
    runAllMidtermReportsSafely(ScriptApp.getOAuthToken());
}

function runMidtermBatch_Client(clientToken) {
    runAllMidtermReportsSafely(clientToken);
}

// 3. Subject Comment Generator (Scores + 2)
function runCommentGenerator() {
    initiateBatchAction('Generate Subject Comments', 'generate'); 
}

// 4. Audit & Name Mismatch Fix
function runAuditFix() {
    initiateBatchAction('Fix Name Mismatches', 'auditfix');
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

// 7. Connectivity Tests (Menu-accessible)
function runTestWhatsAppTemplate() {
    const ui = SpreadsheetApp.getUi();
    const templateName = Config.WHATSAPP_TEMPLATE_NAME;
    const templateLang = Config.WHATSAPP_TEMPLATE_LANGUAGE;
    const phoneId = Config.WHATSAPP_PHONE_ID;
    const token = Config.WHATSAPP_ACCESS_TOKEN;

    if (!phoneId || !token) {
        ui.alert("WhatsApp not configured.\nSet WHATSAPP_PHONE_ID and WHATSAPP_TOKEN in Script Properties or Class Settings.");
        return;
    }

    const testPhone = ui.prompt(
        "Test WhatsApp Template",
        "Enter a phone number to send a test template message to (digits only, with country code):",
        ui.ButtonSet.OK_CANCEL
    );
    if (testPhone.getSelectedButton() !== ui.Button.OK) return;
    const phone = testPhone.getResponseText().replace(/\D/g, '');
    if (!phone) { ui.alert("No phone number entered."); return; }

    try {
        const url = 'https://graph.facebook.com/' + WHATSAPP_GRAPH_API_VERSION + '/' + phoneId + '/messages';
        const payload = {
            messaging_product: 'whatsapp',
            to: phone,
            type: 'template',
            template: {
                name: templateName,
                language: { code: templateLang },
                components: [{
                    type: 'body',
                    parameters: [{ type: 'text', parameter_name: 'student_name', text: 'Test Student' }]
                }]
            }
        };
        const res = UrlFetchApp.fetch(url, {
            method: 'post',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
            payload: JSON.stringify(payload),
            muteHttpExceptions: true
        });
        const code = res.getResponseCode();
        if (code === 200 || code === 201) {
            ui.alert("Template test SUCCESS!\n\nTemplate: " + templateName + "\nLanguage: " + templateLang +
                     "\n\nWhatsApp batch sending should work.");
        } else {
            const json = JSON.parse(res.getContentText());
            const errMsg = json.error ? json.error.message : res.getContentText();
            ui.alert("Template test FAILED (" + code + ")\n\n" + errMsg +
                     "\n\nCheck WHATSAPP_TEMPLATE_NAME and WHATSAPP_TEMPLATE_LANGUAGE in Class Settings.");
        }
    } catch (e) {
        ui.alert("Error: " + e.message);
    }
}

function runTestGemini() {
    const ui = SpreadsheetApp.getUi();
    const apiKey = Config.API_KEY;
    const model = Config.MODEL_NAME;

    if (!apiKey) {
        ui.alert("Gemini API Key not configured.\nRun Setup or set GEMINI_API_KEY in Script Properties.");
        return;
    }

    try {
        const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + apiKey;
        const res = UrlFetchApp.fetch(url, {
            method: 'post',
            contentType: 'application/json',
            payload: JSON.stringify({
                contents: [{ parts: [{ text: 'Reply with only the word OK' }] }],
                generationConfig: { maxOutputTokens: 10 }
            }),
            muteHttpExceptions: true
        });
        const code = res.getResponseCode();
        if (code === 200) {
            const json = JSON.parse(res.getContentText());
            let reply = '';
            try { reply = json.candidates[0].content.parts[0].text; } catch (e) { reply = '(could not parse)'; }
            ui.alert("Gemini connection SUCCESS!\n\nModel: " + model + "\nReply: " + reply.trim());
        } else {
            ui.alert("Gemini test FAILED (" + code + ")\n\n" + res.getContentText());
        }
    } catch (e) {
        ui.alert("Error: " + e.message);
    }
}

// 8. Status Reset Utility (Contact List)
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

// 8. Reset Folder Configuration
function runResetFolderConfig() {
    const ui = SpreadsheetApp.getUi();
    const result = ui.alert(
        "Reset Folder Configuration?",
        "This will force the system to create a NEW report folder next time you generate reports.\nUse this if reports are saving to the wrong place or failing to save.",
        ui.ButtonSet.YES_NO
    );
    
    if (result === ui.Button.YES) {
        if (typeof FolderManager !== 'undefined') {
            FolderManager.resetCache();
            SpreadsheetApp.getActiveSpreadsheet().toast("Folder configuration reset!", "System");
        } else {
            ui.alert("❌ FolderManager not found.");
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
    if (typeof GeneralCommentsManager !== 'undefined') GeneralCommentsManager.openSidebar('traits');
}

function openChatBotSidebar() {
    if (typeof GeneralCommentsManager !== 'undefined') GeneralCommentsManager.openSidebar('chat');
}

function runFinalize() {
    if (typeof CleanupManager !== 'undefined') CleanupManager.runFinalize();
}

function runUndo() {
    if (typeof StateManager !== 'undefined') StateManager.undo();
}

function toast(msg, title) {
    SpreadsheetApp.getActiveSpreadsheet().toast(msg, title || "System");
}

// --- BATCHING LOGIC ---
// 🟢 FIX: Switched to UserProperties to allow multiple teachers to work in the same sheet simultaneously.
// Note: Users should avoid running batches in multiple tabs at the exact same time.
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
    
    // 🟢 UserProperties isolates memory per-user, preventing collisions in a shared sheet
    PropertiesService.getUserProperties().setProperty('ACTIVE_BATCH_CONFIG', JSON.stringify(rangeConfig));

    openSidebar(title, action);
}

function openSidebar(title, action) {
    const userProps = PropertiesService.getUserProperties();
    userProps.setProperty('CURRENT_SIDEBAR_ACTION', action);
    userProps.setProperty('CURRENT_SIDEBAR_TITLE', title);

    const html = HtmlService.createHtmlOutputFromFile('Sidebar')
        .setTitle(title)
        .setWidth(300); 
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
        chunkSize: 6, 
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

    switch (action) {
        case 'generate': return SubjectCommentManager.processRange(chunkRange);
        case 'polish': return PolishManager.processRange(chunkRange);
        case 'pronouns': return PronounManager.processRange(chunkRange);
        case 'audit': return AuditManager.processRange(chunkRange);
        case 'auditfix': return FixMismatchManager.fixRange(chunkRange);
        default: throw new Error("Unknown action: " + action);
    }
}

// ==========================================
// 🚀 AUTOPILOT TRIGGER MANAGEMENT & RUNNERS
// ==========================================

function setupResubmitTrigger(actionType) {
    clearResubmitTriggers(); // Clean any stale triggers first
    
    const functionName = (actionType === 'EOT') ? 'runFullReportBatch_Trigger' : 'runMidtermBatch_Trigger';
    if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`setupResubmitTrigger: creating trigger for ${functionName}`);
    
    ScriptApp.newTrigger(functionName)
        .timeBased()
        .after(60000) // 1 minute delay
        .create();
      
    if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`setupResubmitTrigger: trigger created successfully`);
}

function clearResubmitTriggers() {
    if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG("clearResubmitTriggers: scanning for active triggers");
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
        const name = trigger.getHandlerFunction();
        if (name === 'runFullReportBatch_Trigger' || name === 'runMidtermBatch_Trigger') {
            if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`clearResubmitTriggers: deleting trigger ${name}`);
            ScriptApp.deleteTrigger(trigger);
        }
    });
}

function runFullReportBatch_Trigger() {
    if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG("runFullReportBatch_Trigger: trigger fired. Resuming EOT run.");
    clearResubmitTriggers(); // One-shot trigger cleanup
    runAllReportsSafely();
}

function runMidtermBatch_Trigger() {
    if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG("runMidtermBatch_Trigger: trigger fired. Resuming Midterm run.");
    clearResubmitTriggers(); // One-shot trigger cleanup
    runAllMidtermReportsSafely();
}

function runAllMidtermReportsSafely(clientToken) {
    if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`runAllMidtermReportsSafely called. clientToken type=${typeof clientToken}`);
    const BATCH_SIZE = 8;
    const PAUSE_SECONDS = 20; 
    let remainingStudents = 999;
    let batchNumber = 1;
    const startTime = new Date().getTime();

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ss.toast("Starting midterm batch generation...", "HecTech Engine", 5);

    // Create the temporary sheet ONCE for the entire batch run context
    const sourceSheet = ss.getSheetByName(Config.MIDTERM_SHEET_NAME);
    const templateSheet = ss.getSheetByName(Config.MIDTERM_TEMPLATE_NAME);
    if (!sourceSheet || !templateSheet) {
        ss.toast("❌ Midterm sheets not found.", "HecTech Engine", 5);
        return;
    }
    
    // Create one temp sheet for this execution context
    let tempSheet = null;
    try {
        tempSheet = templateSheet.copyTo(ss);
        tempSheet.setName(`TEMP_MID_BATCH_${new Date().getTime()}`);
        tempSheet.hideSheet();
    } catch (e) {
        console.error("Failed to initialize temp sheet:", e.message);
        ss.toast("❌ Failed to duplicate template sheet.", "HecTech Engine", 5);
        return;
    }

    try {
        while (remainingStudents > 0) {
            // Check execution duration (270,000 ms = 4.5 mins limit)
            const elapsed = new Date().getTime() - startTime;
            // Support lowering elapsed limit during testing/mocking
            const limit = (typeof TEST_TIMEOUT_LIMIT !== 'undefined') ? TEST_TIMEOUT_LIMIT : 270000;
            if (elapsed > limit) {
                if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG(`runAllMidtermReportsSafely: elapsed time ${elapsed}ms exceeds safety limit ${limit}ms. Scheduling trigger.`);
                ss.toast("Approaching Google execution limit. Auto-resuming in 1 minute...", "Autopilot", 10);
                setupResubmitTrigger('MIDTERM');
                return;
            }

            console.log(`Starting Midterm Batch #${batchNumber}...`);
            
            // Run the generator for exactly 8 students using the shared tempSheet
            remainingStudents = MidtermReportGenerator.process(false, BATCH_SIZE, clientToken, tempSheet);

            if (remainingStudents > 0) {
                console.log(`Midterm Batch ${batchNumber} done. ${remainingStudents} left. Pausing for ${PAUSE_SECONDS}s...`);
                ss.toast(`Cooling down for ${PAUSE_SECONDS}s... ${remainingStudents} midterm reports left.`, "HecTech Engine", PAUSE_SECONDS);
                
                Utilities.sleep(PAUSE_SECONDS * 1000); 
                batchNumber++;
            }
        }

        console.log("🎉 All midterm reports generated successfully!");
        ss.toast("🎉 All midterm reports generated successfully!", "HecTech Engine", -1);
        
        // Success complete - clear any scheduled triggers
        clearResubmitTriggers();
    } finally {
        // Always clean up the temp sheet at the end of this execution context
        if (tempSheet) {
            try {
                ss.deleteSheet(tempSheet);
                SpreadsheetApp.flush();
            } catch (err) {
                console.error("Failed to delete midterm batch temp sheet:", err.message);
            }
        }
    }
}