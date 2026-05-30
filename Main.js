// ==========================================
// HECTECH Main.js (Hardened Master Architecture)
// ==========================================

/**
 * Thread-safe logging channel writes diagnostics to a hidden telemetry tab.
 * Implements a script lock to handle concurrent multi-user writes cleanly.
 */
function DEBUG_LOG(msg) {
  const lock = LockService.getScriptLock();
  try {
    // Acquire a short lock window to serialize overlapping write requests safely
    if (lock.tryLock(1500)) {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("DEBUG_LOGS");
      if (sheet) {
        sheet.appendRow([new Date(), String(msg)]);
        SpreadsheetApp.flush();
      }
    }
  } catch(e) {
    console.warn(`Telemetry log append bypassed: ${e.message}`);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Initializes workspace custom navigation components on spreadsheet load.
 * Enforces central licensing authorization checks.
 */
function onOpen() {
  try {
    verifyLicenseAuthorization();
  } catch (err) {
    SpreadsheetApp.getUi().alert("🔒 License Notice", err.message, SpreadsheetApp.getUi().ButtonSet.OK);
    return; // Keep menu layers hidden if the deployment environment is unauthorized
  }

  const ui = SpreadsheetApp.getUi();
  ui.createMenu('HecTech AI 🎓')
    // --- SETTINGS CONFIG ---
    .addItem('⚙️ Class Settings', 'openSettingsSidebar')
    .addSeparator()

    // --- PHASE 1: COMPOSITION ---
    .addItem('📝 1a. Set Subject Context (Topics)', 'openSubjectContextSidebar')
    .addItem('⚡ 1b. Auto-Generate Subject Comments', 'runCommentGenerator')
    .addItem('👤 2. Class Teacher General Comment', 'openGeneralSidebar')
    .addSeparator()

    // --- PHASE 2: EDITS & STYLING ---
    .addItem('🎨 Polish Grammar & Style', 'runPolish')
    .addItem('⚧ Fix Pronouns', 'runPronouns')
    .addItem('🔍 Fix Name Mismatches', 'runAuditFix')
    .addSeparator()

    // --- PHASE 3: QUALITY CONTROL ---
    .addItem('🛡️ 3. Vet and Audit (Check for Errors)', 'runAudit')
    .addSeparator()

    // --- PHASE 4: FINALIZATION ---
    .addItem('✅ Finalize Formatting (White/Bold)', 'runFinalize')
    .addItem('🏥 Run System Health Check', 'RUN_SYSTEM_READINESS_CHECK') 
    .addSeparator()

    // --- PHASE 5: TERMINAL END OF TERM OUTPUTS ---
    .addItem('📄 EOT Preview (First 5 Students)', 'runReportPreview')
    .addItem('🚀 EOT Generate Full Batch (PDFs)', 'runFullReportBatch')
    .addSeparator()
    
    // --- PHASE 5b: MIDTERM REPORT GENERATION ---
    .addItem('📋 Midterm Preview', 'runMidtermPreview')
    .addItem('📊 Midterm Generate Full Batch', 'runMidtermBatch')
    .addSeparator()

    // --- PHASE 6: DISTRIBUTION GATEWAYS ---
    .addItem('📧 Send Reports via Email', 'runEmailBatch')    
    .addItem('📱 Send via WhatsApp', 'runWhatsAppBlaster')    
    .addSeparator()

    // --- CONNECTION DIAGNOSTICS ---
    .addItem('🔌 Test WhatsApp Connection', 'runTestWhatsAppTemplate')
    .addItem('🤖 Test Gemini Connection', 'runTestGemini')
    .addSeparator()

    // --- CORE DATABASE SYSTEM UTILITIES ---
    .addItem('🔄 Reset Sent Statuses (New Term)', 'runResetStatuses') 
    .addItem('📁 Reset Folder Configuration', 'runResetFolderConfig')
    .addItem('🔥 Run Nuclear Cleanup', 'runNuclearCleanup')
    .addItem('↩️ Undo Last Action', 'runUndo')
    .addToUi();

  ui.createMenu('💬 AI Chatbot')
    .addItem('💬 Open Chatbot Workspace', 'openChatBotSidebar')
    .addToUi();
}

// =========================================================================
// 🏥 PRO SYSTEM HEALTH DASHBOARD
// =========================================================================
function RUN_SYSTEM_READINESS_CHECK() {
  verifyLicenseAuthorization();
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const checks = [];

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
      msg: sheet ? `Found active layer: "${item.name}"` : `Missing target link target: Create "${item.name}"`
    });
  });

  try {
    const contactSheet = ss.getSheetByName(Config.CONTACT_SHEET_NAME);
    if (contactSheet) {
      const emailVal = contactSheet.getRange(3, Config.COL_EMAIL).getValue();
      checks.push({
        category: "DATA",
        item: "Parent Email Record (Col C)",
        status: emailVal ? "OK" : "WARNING",
        msg: emailVal ? "Data verified on row 3" : "Row 3 data field appears unpopulated"
      });

      checks.push({
        category: "DATA",
        item: "PDF ID Storage Column (Col D)",
        status: Config.COL_PDF_ID === 4 ? "OK" : "WARNING",
        msg: `Mapped to Column Index ${Config.COL_PDF_ID}`
      });

      checks.push({
        category: "DATA",
        item: "WhatsApp Status Registry (Col E)",
        status: Config.COL_WHATSAPP_STATUS === 5 ? "OK" : "ERROR",
        msg: Config.COL_WHATSAPP_STATUS === 5 ? "Correct Position" : `Misaligned footprint: Index found at ${Config.COL_WHATSAPP_STATUS}`
      });

      checks.push({
        category: "DATA",
        item: "Email Distribution Logs (Col F)",
        status: Config.COL_EMAIL_STATUS === 6 ? "OK" : "ERROR",
        msg: Config.COL_EMAIL_STATUS === 6 ? "Correct Position" : `Misaligned footprint: Index found at ${Config.COL_EMAIL_STATUS}`
      });
    }

    const classlist = ss.getSheetByName(Config.CLASSLIST_SHEET_NAME);
    if (classlist) {
      const nameVal = classlist.getRange(3, Config.CLASSLIST_NAME_COL).getValue();
      checks.push({ 
        category: "DATA", 
        item: "Roster Name Verification", 
        status: nameVal ? "OK" : "WARNING", 
        msg: nameVal ? "Active student metrics detected" : "Row 3 baseline index name field is blank" 
      });
    }
  } catch (e) {
    checks.push({ category: "DATA", item: "Grid Structural Check", status: "ERROR", msg: e.message });
  }

  try {
    const fid = Config.DESTINATION_FOLDER_ID;
    checks.push({ 
      category: "DRIVE", 
      item: "Root Output Directory", 
      status: fid ? "OK" : "WARNING", 
      msg: fid ? "Connected active ID reference" : "Will auto-create folder structures next to host sheet workbook file on run" 
    });

    const templateSheet = ss.getSheetByName(Config.TEMPLATE_SHEET_NAME);
    checks.push({ 
      category: "TEMPLATE", 
      item: "EOT Report Canvas Frame", 
      status: templateSheet ? "OK" : "ERROR", 
      msg: templateSheet ? `Verified Layer: "${Config.TEMPLATE_SHEET_NAME}"` : `Missing structural block: Add sheet layout named "${Config.TEMPLATE_SHEET_NAME}"`
    });

    const phoneId = Config.WHATSAPP_PHONE_ID;
    const waToken = Config.WHATSAPP_ACCESS_TOKEN;
    checks.push({ 
      category: "WHATSAPP", 
      item: "Meta Phone ID Gateway", 
      status: (phoneId && !phoneId.includes("YOUR_")) ? "OK" : "ERROR", 
      msg: (phoneId && !phoneId.includes("YOUR_")) ? "Verified" : "Missing or placeholder string detected in properties database" 
    });
    checks.push({ 
      category: "WHATSAPP", 
      item: "Meta Authorization Key", 
      status: (waToken && !waToken.includes("YOUR_")) ? "OK" : "ERROR", 
      msg: (waToken && !waToken.includes("YOUR_")) ? "Verified" : "Missing cloud routing parameters" 
    });

    const apiKey = Config.API_KEY;
    checks.push({ 
      category: "AI", 
      item: "Gemini Studio API Key", 
      status: (apiKey && !apiKey.includes("YOUR_")) ? "OK" : "ERROR", 
      msg: (apiKey && !apiKey.includes("YOUR_")) ? "Platform credentials verified" : "API key tracking profiles missing" 
    });

    const quota = MailApp.getRemainingDailyQuota();
    checks.push({ category: "EMAIL", item: "Google Delivery Quota", status: quota > 10 ? "OK" : "WARNING", msg: `${quota} daily mail distributions left` });

  } catch(e) {
    checks.push({ category: "RESOURCES", item: "Environmental Check", status: "ERROR", msg: e.message });
  }

  const totalErrors = checks.filter(c => c.status === "ERROR" || c.status === "MISSING").length;
  const statusColor = totalErrors === 0 ? "#0A2F1D" : "#441015";
  const statusTextColor = totalErrors === 0 ? "#39FF14" : "#FF3333";
  const statusText = totalErrors === 0 ? "✅ ALL SYSTEM SYSTEMS OPERATIONAL" : `🚨 ${totalErrors} SYSTEM SETUP ERRORS DISCOVERED`;

  let html = `
    <style>
      body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 0; margin: 0; background-color: #09090b; color: #f4f4f5; }
      .container { background: #121214; padding: 20px; height: 100vh; display: flex; flex-direction: column; box-sizing: border-box; }
      h3 { margin-top: 0; color: #ffffff; font-size: 16px; border-bottom: 1px solid #27272a; padding-bottom: 12px; letter-spacing: 0.4px; }
      .table-wrap { flex-grow: 1; overflow-y: auto; margin-top: 10px; }
      table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
      th { text-align: left; color: #a1a1aa; font-weight: 600; border-bottom: 2px solid #27272a; padding: 10px 6px; text-transform: uppercase; font-size: 10.5px; letter-spacing: 0.3px; }
      td { border-bottom: 1px solid #1c1c1f; padding: 10px 6px; color: #e4e4e7; }
      .OK { color: #39FF14; font-weight: 700; background: rgba(57, 255, 20, 0.08); padding: 3px 6px; border-radius: 4px; font-size: 10.5px; border: 1px solid rgba(57, 255, 20, 0.15); }
      .WARNING { color: #f59e0b; font-weight: 700; background: rgba(245, 158, 11, 0.08); padding: 3px 6px; border-radius: 4px; font-size: 10.5px; border: 1px solid rgba(245, 158, 11, 0.15); }
      .ERROR, .MISSING { color: #ff3333; font-weight: 700; background: rgba(255, 51, 51, 0.08); padding: 3px 6px; border-radius: 4px; font-size: 10.5px; border: 1px solid rgba(255, 51, 51, 0.15); }
      .summary { margin-top: 16px; padding: 12px; background-color: ${statusColor}; border-radius: 6px; text-align: center; font-weight: 700; color: ${statusTextColor}; border: 1px solid var(--border); font-size: 13px; letter-spacing: 0.3px; }
      .footer-controls { margin-top: 14px; padding-top: 10px; border-top: 1px solid #27272a; }
      button { padding: 8px 20px; cursor: pointer; background: linear-gradient(135deg, #8b5cf6, #6d28d9); color: white; border: none; border-radius: 6px; font-weight: 600; float: right; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2); }
      button:hover { filter: brightness(1.1); }
    </style>
    <div class="container">
      <h3>🚀 HecTech 2.0 System Readiness Dashboard</h3>
      <div class="table-wrap">
        <table>
          <tr><th>Category</th><th>Check Item</th><th>Status</th><th>Details</th></tr>
  `;

  checks.forEach(c => {
    html += `<tr><td style="color: #a1a1aa;">${c.category}</td><td style="font-weight: 500;">${c.item}</td><td><span class="${c.status}">${c.status}</span></td><td style="color: #d4d4d8;">${c.msg}</td></tr>`;
  });

  html += `</table>
      </div>
      <div class="summary">${statusText}</div>
      <div class="footer-controls"><button onclick='google.script.host.close()'>Acknowledge</button></div>
    </div>`;

  const htmlOutput = HtmlService.createHtmlOutput(html).setWidth(780).setHeight(620);
  ss.show(htmlOutput);
}

// =========================================================================
// 🔌 ROUTING PIPELINE WRAPPERS
// =========================================================================

function runReportPreview() {
  verifyLicenseAuthorization();
  if (typeof ReportCardGenerator !== 'undefined') {
    ReportCardGenerator.runPreview(ScriptApp.getOAuthToken());
  } else {
    SpreadsheetApp.getUi().alert("⚠️ ReportCardGenerator platform core component unlinked.");
  }
}

function runReportPreview_Client(clientToken) {
  verifyLicenseAuthorization();
  if (typeof ReportCardGenerator !== 'undefined') {
    ReportCardGenerator.runPreview(clientToken);
  } else {
    SpreadsheetApp.getUi().alert("⚠️ ReportCardGenerator platform core component unlinked.");
  }
}

function runFullReportBatch() {
  verifyLicenseAuthorization();
  runAllReportsSafely(ScriptApp.getOAuthToken());
}

function runFullReportBatch_Client(clientToken) {
  verifyLicenseAuthorization();
  runAllReportsSafely(clientToken);
}

function runMidtermPreview() {
  verifyLicenseAuthorization();
  if (typeof MidtermReportGenerator !== 'undefined') {
    MidtermReportGenerator.runPreview(ScriptApp.getOAuthToken());
  } else {
    SpreadsheetApp.getUi().alert("⚠️ MidtermReportGenerator module mapping unlinked.");
  }
}

function runMidtermPreview_Client(clientToken) {
  verifyLicenseAuthorization();
  if (typeof MidtermReportGenerator !== 'undefined') {
    MidtermReportGenerator.runPreview(clientToken);
  } else {
    SpreadsheetApp.getUi().alert("⚠️ MidtermReportGenerator module mapping unlinked.");
  }
}

function runMidtermBatch() {
  verifyLicenseAuthorization();
  runAllMidtermReportsSafely(ScriptApp.getOAuthToken());
}

function runMidtermBatch_Client(clientToken) {
  verifyLicenseAuthorization();
  runAllMidtermReportsSafely(clientToken);
}

function runCommentGenerator() { initiateBatchAction('Generate Subject Comments', 'generate'); }
function runAuditFix() { initiateBatchAction('Fix Name Mismatches', 'auditfix'); }
function runPolish() { initiateBatchAction('Polish Grammar & Style', 'polish'); }
function runPronouns() { initiateBatchAction('Fix Pronouns', 'pronouns'); }
function runAudit() { initiateBatchAction('Audit Comments', 'audit'); }

function runWhatsAppBlaster() {
  verifyLicenseAuthorization();
  try {
    if (typeof WhatsAppManager !== 'undefined') WhatsAppManager.process();
    else SpreadsheetApp.getUi().alert("❌ WhatsAppManager engine communication gateway down.");
  } catch (e) { SpreadsheetApp.getUi().alert("WhatsApp Gateway Alert: " + e.message); }
}

function runEmailBatch() {
  verifyLicenseAuthorization();
  try {
    if (typeof EmailManager !== 'undefined') EmailManager.process();
    else SpreadsheetApp.getUi().alert("❌ EmailManager distribution cluster link down.");
  } catch (e) { SpreadsheetApp.getUi().alert("Email Distribution Alert: " + e.message); }
}

function runTestWhatsAppTemplate() {
  verifyLicenseAuthorization();
  const ui = SpreadsheetApp.getUi();
  const templateName = Config.WHATSAPP_TEMPLATE_NAME;
  const templateLang = Config.WHATSAPP_TEMPLATE_LANGUAGE;
  const phoneId = Config.WHATSAPP_PHONE_ID;
  const token = Config.WHATSAPP_ACCESS_TOKEN;

  if (!phoneId || !token) {
    ui.alert("WhatsApp parameters missing configuration layout registry profile.");
    return;
  }

  const testPhone = ui.prompt(
    "Test WhatsApp Template Connection",
    "Enter country-coded destination digits to test template delivery:",
    ui.ButtonSet.OK_CANCEL
  );
  if (testPhone.getSelectedButton() !== ui.Button.OK) return;
  const phone = testPhone.getResponseText().replace(/\D/g, '');
  if (!phone) { ui.alert("No telephone digits registered."); return; }

  try {
    const url = 'https://graph.facebook.com/v16.0/' + phoneId + '/messages';
    const payload = {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: templateLang },
        components: [{
          type: 'body',
          parameters: [{ type: 'text', parameter_name: 'student_name', text: 'Diagnostic Sandbox Student' }]
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
      ui.alert(`Template delivery verified! [HTTP ${code}]\n\nTemplate Name: ${templateName}`);
    } else {
      ui.alert(`Handshake rejected [HTTP ${code}]:\n\n${res.getContentText()}`);
    }
  } catch (e) { ui.alert("Operational connection drop: " + e.message); }
}

function runTestGemini() {
  verifyLicenseAuthorization();
  const ui = SpreadsheetApp.getUi();
  const apiKey = Config.API_KEY;
  const model = Config.MODEL_NAME;

  if (!apiKey) {
    ui.alert("Gemini Core credentials unconfigured. Run setup configurations panel.");
    return;
  }

  try {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + apiKey;
    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        contents: [{ parts: [{ text: 'Verify link. Respond with exact characters: OK' }] }],
        generationConfig: { maxOutputTokens: 10 }
      }),
      muteHttpExceptions: true
    });
    if (res.getResponseCode() === 200) {
      const json = JSON.parse(res.getContentText());
      const reply = json.candidates[0].content.parts[0].text;
      ui.alert(`Gemini pipeline sync verified!\n\nTarget Profile: ${model}\nGateway Response: ${reply.trim()}`);
    } else {
      ui.alert(`Handshake rejected [HTTP ${res.getResponseCode()}]:\n\n${res.getContentText()}`);
    }
  } catch (e) { ui.alert("API Gateway Error: " + e.message); }
}

function runResetStatuses() {
  verifyLicenseAuthorization();
  const ui = SpreadsheetApp.getUi();
  const result = ui.alert(
    "Reset Delivery Logs?",
    "This clears all baseline SENT flags from your contact sheet.\n\nOnly run this when step-shifting into a new terminal assessment cycle. Proceed?",
    ui.ButtonSet.YES_NO
  );
  if (result === ui.Button.YES) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(Config.CONTACT_SHEET_NAME);
    if (sheet) {
      const lastRow = Math.max(sheet.getLastRow(), 2);
      sheet.getRange(2, 5, lastRow - 1, 2).clearContent().setBackground(null);
      SpreadsheetApp.getActiveSpreadsheet().toast("Delivery registers flushed cleanly.", "HecTech");
    }
  }
}

function runResetFolderConfig() {
  verifyLicenseAuthorization();
  const ui = SpreadsheetApp.getUi();
  const result = ui.alert(
    "Reset Connected Directory Suffix Keys?",
    "Flushes cached active properties folder routes to generate clean, alternate tracking structures on the next run. Proceed?",
    ui.ButtonSet.YES_NO
  );
  if (result === ui.Button.YES) {
    if (typeof FolderManager !== 'undefined') {
      FolderManager.resetCache();
      SpreadsheetApp.getActiveSpreadsheet().toast("Persistent directory pointers scrubbed.", "HecTech Status");
    } else { ui.alert("❌ FolderManager cache router component unlinked."); }
  }
}

function openSubjectContextSidebar() { verifyLicenseAuthorization(); if (typeof SubjectContextManager !== 'undefined') SubjectContextManager.openSidebar(); }
function openGeneralSidebar() { verifyLicenseAuthorization(); if (typeof GeneralCommentsManager !== 'undefined') GeneralCommentsManager.openSidebar(); }
function openChatBotSidebar() { verifyLicenseAuthorization(); if (typeof ChatBotManager !== 'undefined') ChatBotManager.openSidebar(); }

function runFinalize() { verifyLicenseAuthorization(); if (typeof StateManager !== 'undefined') StateManager.finalize(); }
function runUndo() { verifyLicenseAuthorization(); if (typeof StateManager !== 'undefined') StateManager.undo(); }

function toast(msg, title) { SpreadsheetApp.getActiveSpreadsheet().toast(msg, title || "HecTech"); }

// =========================================================================
// 🛠️ MULTI-USER TRANSACTIONAL BATCH ENGINE
// =========================================================================
function initiateBatchAction(title, action) {
  verifyLicenseAuthorization();
  const selection = SelectionProcessor.getSmartSelection(); 
  if (!selection) {
    SpreadsheetApp.getActiveSpreadsheet().toast("Highlight a target column block to activate processing workflows.", "Selection Error");
    return;
  }

  const rangeConfig = {
    sheetId: selection.getSheet().getSheetId(),
    startRow: selection.getRow(),
    startCol: selection.getColumn(),
    numRows: selection.getNumRows(),
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

  const html = HtmlService.createTemplateFromFile('Sidebar')
    .evaluate()
    .setTitle(title)
    .setWidth(300)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1'); 
  SpreadsheetApp.getUi().showSidebar(html);
}

function getSelectionInfo() {
  verifyLicenseAuthorization();
  const userProps = PropertiesService.getUserProperties();
  const configStr = userProps.getProperty('ACTIVE_BATCH_CONFIG');
  const action = userProps.getProperty('CURRENT_SIDEBAR_ACTION');
  const title = userProps.getProperty('CURRENT_SIDEBAR_TITLE');

  if (!configStr) return { error: "No active grid range context found." };
  const config = JSON.parse(configStr);

  if (new Date().getTime() - config.timestamp > 3600000) {
    return { error: "Batch sequence tracking frame context window expired." };
  }

  return {
    numRows: config.numRows,
    chunkSize: 10, 
    action: action,
    title: title
  };
}

function processChunk(action, relativeStartRow, numRows) {
  verifyLicenseAuthorization();
  const userProps = PropertiesService.getUserProperties();
  const configStr = userProps.getProperty('ACTIVE_BATCH_CONFIG');
  if (!configStr) throw new Error("Batch transaction range configuration dropped out.");
  
  const config = JSON.parse(configStr);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheets().find(s => s.getSheetId() === config.sheetId);
  if (!sheet) throw new Error("Target workbook grid layers detached from runtime context profile.");

  const absoluteStartRow = config.startRow + relativeStartRow;
  const chunkRange = sheet.getRange(absoluteStartRow, config.startCol, numRows, config.numCols);

  switch (action) {
    case 'generate': return SubjectCommentManager.processRange(chunkRange);
    case 'polish': return PolishManager.processRange(chunkRange);
    case 'pronouns': return PronounManager.processRange(chunkRange);
    case 'audit': return AuditManager.processRange(chunkRange);
    case 'auditfix': return FixMismatchManager.fixRange(chunkRange);
    default: throw new Error(`Unresolved master orchestration gateway target rule: [${action}]`);
  }
}

// =========================================================================
// 🚀 AUTOPILOT TRACKING BACKGROUND TRIGGER ENGINE
// =========================================================================

function setupResubmitTrigger(actionType) {
  clearResubmitTriggers();
  const functionName = (actionType === 'EOT') ? 'runFullReportBatch_Trigger' : 'runMidtermBatch_Trigger';
  
  ScriptApp.newTrigger(functionName)
    .timeBased()
    .after(60000) // Safely restart the thread after a 1-minute pause
    .create();
}

function clearResubmitTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    const name = trigger.getHandlerFunction();
    if (name === 'runFullReportBatch_Trigger' || name === 'runMidtermBatch_Trigger' || name === 'runWhatsAppBlaster_Trigger') {
      try { ScriptApp.deleteTrigger(trigger); } catch(e) {}
    }
  });
}

function runFullReportBatch_Trigger() {
  // 🟢 FIXED: Wrapped in safe error boundary blocks to reschedule execution paths if uncaught drops occur
  try {
    verifyLicenseAuthorization();
    clearResubmitTriggers();
    runAllReportsSafely();
  } catch (err) {
    console.error(`Uncaught crash intercepted during EOT worker pass: ${err.message}`);
    setupResubmitTrigger('EOT'); // Automatically reschedule the thread to recover
  }
}

function runMidtermBatch_Trigger() {
  try {
    verifyLicenseAuthorization();
    clearResubmitTriggers();
    runAllMidtermReportsSafely();
  } catch (err) {
    console.error(`Uncaught crash intercepted during Midterm worker pass: ${err.message}`);
    setupResubmitTrigger('MIDTERM');
  }
}

/**
 * Hardened Turbo Autopilot engine compiles student roster metrics in batches.
 * Features safe timeout-exit tracking to manage execution windows.
 */
function runAllMidtermReportsSafely(clientToken) {
  const BATCH_SIZE = 10; 
  const startTime = new Date().getTime();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  ss.toast("Initializing midterm batch generation system...", "HecTech Engine", 4);

  const sourceSheet = ss.getSheetByName(Config.MIDTERM_SHEET_NAME);
  const templateSheet = ss.getSheetByName(Config.MIDTERM_TEMPLATE_NAME);
  if (!sourceSheet || !templateSheet) {
    ss.toast("❌ Configuration Error: Midterm template components missing.", "HecTech Engine", 5);
    return;
  }

  let effectiveToken = (typeof clientToken === 'string' && clientToken) ? clientToken : null;
  const tokenPropKey = `OAUTH_TOKEN_CACHE_MIDTERM_${ss.getId()}`;
  const docProps = PropertiesService.getDocumentProperties();

  if (effectiveToken) {
    docProps.setProperty(tokenPropKey, effectiveToken);
  } else {
    effectiveToken = docProps.getProperty(tokenPropKey) || ScriptApp.getOAuthToken();
  }
  
  // Resolve or initialize the working temporary canvas layer safely
  const tempSheetName = `TEMP_MID_BATCH_${ss.getId()}`;
  let tempSheet = ss.getSheetByName(tempSheetName);
  
  if (!tempSheet) {
    try {
      tempSheet = templateSheet.copyTo(ss);
      tempSheet.setName(tempSheetName);
      tempSheet.hideSheet();
      SpreadsheetApp.flush();
    } catch (e) {
      ss.toast("❌ Failed to parse blueprint workspace layout frame.", "HecTech Engine", 5);
      return;
    }
  }

  let remainingStudents = 999;
  let exitTriggeredDueToTimeout = false;

  try {
    while (remainingStudents > 0) {
      const elapsed = new Date().getTime() - startTime;
      const limit = (typeof TEST_TIMEOUT_LIMIT !== 'undefined') ? TEST_TIMEOUT_LIMIT : 230000; // Built-in safety margin
      
      if (elapsed > limit) {
        ss.toast("Approaching Google runtime execution boundaries. Rescheduling thread safely...", "Autopilot", 8);
        exitTriggeredDueToTimeout = true;
        setupResubmitTrigger('MIDTERM');
        break; // 🟢 FIXED: Gracefully exits loop structure without triggering early template deletions
      }

      remainingStudents = MidtermReportGenerator.process(false, BATCH_SIZE, effectiveToken, tempSheet);

      if (remainingStudents > 0) {
        SpreadsheetApp.flush();
        Utilities.sleep(1500); // Throttling window prevents cell matrix calculation issues
      }
    }

    // 🟢 FIXED: Only drop the temporary canvas layout when the entire student processing queue is exhausted
    if (!exitTriggeredDueToTimeout && remainingStudents <= 0) {
      ss.toast("🎉 All midterm records compiled successfully across lines!", "HecTech Engine", -1);
      docProps.deleteProperty(tokenPropKey);
      clearResubmitTriggers();
      
      if (tempSheet) {
        try {
          ss.deleteSheet(tempSheet);
          SpreadsheetApp.flush();
        } catch(err) {
          console.error("Layout clean routine dropped:", err.message);
        }
      }
    }
  } catch (criticalErr) {
    console.error(`Catastrophic error during autopilot batch execution phase: ${criticalErr.message}`);
    // Reschedule execution dynamically if the operational loop drops unexpectedly
    setupResubmitTrigger('MIDTERM');
  }
}

/**
 * 🔐 STANDALONE MASTER LIBRARY LICENSE SWITCH
 * Confirms localized spreadsheet ID tracking strings against private whitelists.
 */
function verifyLicenseAuthorization() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return; 
  
  const activeSpreadsheetId = ss.getId();
  const libraryProperties = PropertiesService.getScriptProperties();
  const authorizedTenantsRaw = libraryProperties.getProperty("AUTHORIZED_CAMPUS_IDS") || "";
  
  if (authorizedTenantsRaw === "*") return; // Master bypass hook for developers
  
  const authorizedTenants = authorizedTenantsRaw.split(",");
  if (authorizedTenants.indexOf(activeSpreadsheetId) === -1) {
    throw new Error(`This workspace deployment (ID: ${activeSpreadsheetId}) is unauthorized or your subscription term has expired. Please contact system administrators.`);
  }
}