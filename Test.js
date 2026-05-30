// =========================================================================
// HECTECH Test.js — Hardened Smoke Tests (Admin Only, Excluded from clasp push)
// =========================================================================
// Run these directly from the Apps Script Editor to verify configuration channels
// and catch authorization exceptions before initiating production batch runs.

/**
 * Sends a plain text message to verify core API credentials and connectivity.
 * Verifies global tokens and Meta Graph API routing status.
 */
function testWhatsAppConnection() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const phone = "233532947022";
  const props = PropertiesService.getScriptProperties().getProperties();

  // 🟢 FIXED: Normalizes token references to align with your production architecture
  const token = props["WHATSAPP_TOKEN"] || props["WHATSAPP_ACCESS_TOKEN"];
  const phoneId = props["WHATSAPP_PHONE_ID"];

  console.log("Telemetry Diagnostics: Testing Gateway Phone ID ->", phoneId);
  console.log("Telemetry Diagnostics: Token Signature Status ->", token ? `${token.substring(0, 10)}...*******` : "MISSING");

  if (!phoneId || !token) {
    executeAlertOrLog("❌ Pre-flight Disruption: Critical Meta Phone ID or Access Token configurations missing.");
    return;
  }

  const url = `https://graph.facebook.com/v25.0/${phoneId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to: phone,
    type: "text",
    text: { body: "HecTech Infrastructure Gateway Connection Test: Success!" }
  };

  try {
    const options = {
      method: "post",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const code = response.getResponseCode();
    console.log(`Gateway Response Log [HTTP ${code}]:`, response.getContentText());

    if (code === 200 || code === 201) {
      executeAlertOrLog("✅ Connection SUCCESS! Direct text message handshake verified.");
    } else {
      executeAlertOrLog(`❌ Connection REJECTED [HTTP ${code}]:\n\n${response.getContentText()}`);
    }
  } catch (err) {
    console.error("Catastrophic connection disruption intercepted:", err);
    executeAlertOrLog(`❌ Operational Error: ${err.message}`);
  }
}

/**
 * Dispatches a template message to catch Meta translation and naming exceptions.
 * Automatically resolves sheet-scoped suffix parameters to prevent false negatives.
 */
function testWhatsAppTemplateSend() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ssId = ss ? ss.getId() : "";
  const phone = "233532947022";
  
  const props = PropertiesService.getScriptProperties().getProperties();
  const token = props["WHATSAPP_TOKEN"] || props["WHATSAPP_ACCESS_TOKEN"];
  const phoneId = props["WHATSAPP_PHONE_ID"];

  // 🟢 FIXED: Resolves sheet-scoped overrides dynamically based on active workbook ID
  const resolveScopedProperty = (baseKey, fallbackDefault) => {
    if (ssId && props[`${baseKey}_${ssId}`]) {
      return props[`${baseKey}_${ssId}`];
    }
    return props[baseKey] || fallbackDefault;
  };

  const templateName = resolveScopedProperty("WHATSAPP_TEMPLATE_NAME", "student_report_pdf");
  const templateLang = resolveScopedProperty("WHATSAPP_TEMPLATE_LANGUAGE", "en");

  console.log(`Targeting Template Reference: [${templateName}] | Locale: [${templateLang}]`);

  if (!phoneId || !token) {
    executeAlertOrLog("❌ Setup Incomplete: Core routing parameters unassigned.");
    return;
  }

  const url = `https://graph.facebook.com/v25.0/${phoneId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to: phone,
    type: "template",
    template: {
      name: templateName,
      language: { code: templateLang },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", parameter_name: "student_name", text: "Sandbox Diagnostic Student" }
          ]
        }
      ]
    }
  };

  try {
    const options = {
      method: "post",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const res = UrlFetchApp.fetch(url, options);
    const code = res.getResponseCode();
    const body = res.getContentText();
    console.log(`Template Handshake Response [HTTP ${code}]:`, body);

    if (code === 200 || code === 201) {
      executeAlertOrLog(`✅ Template Check SUCCESS!\n\nTemplate String Name: ${templateName}\nLanguage Reference Code: ${templateLang}\n\nMulti-tenant deployment arrays are clear to send.`);
    } else {
      const json = JSON.parse(body);
      const errMsg = json.error ? json.error.message : body;
      executeAlertOrLog(`❌ Template Validation FAILED [HTTP ${code}]\n\nDetails: ${errMsg}\n\nVerify that the template name exactly matches your Meta dashboard profiles.`);
    }
  } catch (err) {
    console.error("Exception thrown during template validation track:", err);
    executeAlertOrLog(`❌ Execution Error: ${err.message}`);
  }
}

/**
 * Sends a minimal payload check to Google AI Studio.
 * Verifies private token validation states and model visibility.
 */
function testGeminiConnection() {
  const props = PropertiesService.getScriptProperties().getProperties();
  const apiKey = props["GEMINI_API_KEY"];
  const model = props["GEMINI_MODEL_NAME"] || "gemini-3.5-flash";

  if (!apiKey || apiKey.length < 10) {
    executeAlertOrLog("❌ Security Failure: GEMINI_API_KEY is missing or too short. Configure master keys via developer console.");
    return;
  }

  console.log("Targeting Generation Engine Profile:", model);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ parts: [{ text: "Respond with only the token word OK" }] }],
    generationConfig: { maxOutputTokens: 10 }
  };

  try {
    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const res = UrlFetchApp.fetch(url, options);
    const code = res.getResponseCode();
    const body = res.getContentText();
    console.log(`AI Gateway Endpoint Response [HTTP ${code}]:`, body);

    if (code === 200) {
      const json = JSON.parse(body);
      let reply = "";
      try { reply = json.candidates[0].content.parts[0].text; } catch (e) { reply = "(Failed to isolate textual response node)"; }
      executeAlertOrLog(`✅ Gemini Connection SUCCESS!\n\nActive Engine Model: ${model}\nGateway Extraction: ${reply.trim()}`);
    } else {
      executeAlertOrLog(`❌ Gemini Processing Error [HTTP ${code}]:\n\n${body}`);
    }
  } catch (err) {
    console.error("Catastrophic pipeline break on AI infrastructure route:", err);
    executeAlertOrLog(`❌ Pipeline Drop Failure: ${err.message}`);
  }
}

/**
 * Smoke test verifies background autopilot trigger registrations and safe data-continuation tasks.
 */
function testAutopilotAndSheetReuse() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return;

  clearResubmitTriggers();
  
  const limitName = 'TEST_TIMEOUT_LIMIT';
  this[limitName] = 10000; // Mock safety runtime margin to 10 seconds (10000ms)
  
  try {
    ss.toast("Injecting simulated execution limits...", "Autopilot Tracker Check", 4);
    
    // Call the master generation engine loop
    runAllReportsSafely();
    
    // Evaluate if continuation triggers register correctly upon hitting timeout limits
    const triggers = ScriptApp.getProjectTriggers();
    let triggerFound = false;
    triggers.forEach(t => {
      if (t.getHandlerFunction() === 'runFullReportBatch_Trigger') {
        triggerFound = true;
      }
    });
    
    if (triggerFound) {
      ss.toast("✅ Autopilot Trigger registration test PASSED!", "Test Complete", 5);
      console.log("✅ Autopilot Trigger registration test PASSED!");
    } else {
      ss.toast("❌ Autopilot Trigger registration test FAILED!", "Test Complete", 5);
      console.error("❌ Autopilot Trigger registration test FAILED: No resubmit trigger resolved.");
    }
  } catch (err) {
    console.error("Test execution block crash:", err.stack);
    ss.toast(`❌ Exception Intercepted: ${err.message}`, "Test Complete", 5);
  } finally {
    clearResubmitTriggers();
    delete this[limitName]; // Flush global variables cleanly
  }
}

/**
 * Smoke test for ChatBotManager.getChatResponse system context processing.
 */
function testChatBotResponse() {
  console.log("Initiating ChatBot extraction pipeline smoke test...");
  const history = [
    { sender: 'user', text: "Hello, I need help with Jessica's report." },
    { sender: 'bot', text: "Hello! I am ready to help. Please tell me what you would like to draft." }
  ];
  const message = "Write a constructive math comment.";
  const selectedText = "Jessica shows good understanding of fractions but talks too much.";
  const studentContext = {
    studentName: "Jessica",
    studentGender: "Female",
    rowIndex: 3
  };

  try {
    if (typeof ChatBotManager === 'undefined') {
      console.error("❌ Test Block Dropped: ChatBotManager engine module unlinked from active namespace.");
      return;
    }
    
    const response = ChatBotManager.getChatResponse(history, message, selectedText, studentContext);
    console.log("Chat Response Pipeline Execution Status ->", response.error ? "FAILED" : "SUCCESS");
    console.log("Extracted Content Payload Node ->", response.text || response.message);
    
    if (!response.error) {
      console.log("✅ ChatBot Response Extraction Smoke Test PASSED!");
    } else {
      console.error("❌ ChatBot Response Verification FAILED: ", response.message);
    }
  } catch (err) {
    console.error("❌ Catastrophic crash inside ChatBot smoke test route: ", err.message, err.stack);
  }
}

/**
 * 🟢 DEFENSIVE UI UTILITY WRAPPER
 * Prevents execution crashes by routing outputs to Logger if the UI environment is missing.
 */
function executeAlertOrLog(messageText) {
  console.log(messageText);
  try {
    SpreadsheetApp.getUi().alert("HecTech Diagnostic Center", messageText, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (uiErr) {
    Logger.log(`[Headless Runtime Mode Active] - Dialog Out: ${messageText}`);
  }
}
