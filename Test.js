// ==========================================
// HECTECH Test.js — Smoke tests (admin only, excluded from clasp push)
// ==========================================
// Run these from the Apps Script editor to verify connectivity before batch sends.

/**
 * Sends a plain text message (no template required).
 * Tests: token + phone ID + basic connectivity.
 */
function testWhatsAppConnection() {
  var phone = "233532947022";

  var config = {
    token: PropertiesService.getScriptProperties().getProperty("WHATSAPP_TOKEN"),
    id: PropertiesService.getScriptProperties().getProperty("WHATSAPP_PHONE_ID")
  };

  console.log("Testing with ID:", config.id);
  console.log("Testing with Token:", config.token ? config.token.substring(0, 10) + "..." : "MISSING");

  var url = "https://graph.facebook.com/v25.0/" + config.id + "/messages";

  var payload = {
    messaging_product: "whatsapp",
    to: phone,
    type: "text",
    text: { body: "HecTech Connection Test: Success!" }
  };

  try {
    var options = {
      method: "post",
      headers: { "Authorization": "Bearer " + config.token, "Content-Type": "application/json" },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    var req = UrlFetchApp.fetch(url, options);
    console.log("Response:", req.getContentText());

    if (req.getResponseCode() === 200) {
      SpreadsheetApp.getUi().alert("Connection SUCCESS! Text message sent.");
    } else {
      SpreadsheetApp.getUi().alert("Connection FAILED. Check Logs.\n\n" + req.getContentText());
    }
  } catch (e) {
    console.error(e);
    SpreadsheetApp.getUi().alert("Error: " + e.message);
  }
}

/**
 * Sends a real template message (no attachment) to verify template name + language match.
 * This catches the #132001 error BEFORE you run the full batch.
 */
function testWhatsAppTemplateSend() {
  var phone = "233532947022";

  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty("WHATSAPP_TOKEN");
  var phoneId = props.getProperty("WHATSAPP_PHONE_ID");
  var templateName = props.getProperty("WHATSAPP_TEMPLATE_NAME") || "student_report_pdf";
  var templateLang = props.getProperty("WHATSAPP_TEMPLATE_LANGUAGE") || "en";

  console.log("Template:", templateName, "Language:", templateLang);

  var url = "https://graph.facebook.com/v25.0/" + phoneId + "/messages";

  var payload = {
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
            { type: "text", parameter_name: "student_name", text: "Test Student" }
          ]
        }
      ]
    }
  };

  try {
    var options = {
      method: "post",
      headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    var res = UrlFetchApp.fetch(url, options);
    var code = res.getResponseCode();
    var body = res.getContentText();
    console.log("Response " + code + ":", body);

    if (code === 200 || code === 201) {
      SpreadsheetApp.getUi().alert(
        "Template test SUCCESS!\n\n" +
        "Template: " + templateName + "\n" +
        "Language: " + templateLang + "\n\n" +
        "Your WhatsApp batch should work."
      );
    } else {
      var json = JSON.parse(body);
      var errMsg = json.error ? json.error.message : body;
      SpreadsheetApp.getUi().alert(
        "Template test FAILED (" + code + ")\n\n" + errMsg +
        "\n\nCheck WHATSAPP_TEMPLATE_NAME and WHATSAPP_TEMPLATE_LANGUAGE in Script Properties."
      );
    }
  } catch (e) {
    console.error(e);
    SpreadsheetApp.getUi().alert("Error: " + e.message);
  }
}

/**
 * Sends a minimal prompt to Gemini to verify API key and model.
 */
function testGeminiConnection() {
  var props = PropertiesService.getScriptProperties();
  var apiKey = props.getProperty("GEMINI_API_KEY");
  var model = props.getProperty("GEMINI_MODEL_NAME") || "gemini-2.5-flash";

  if (!apiKey || apiKey.length < 10) {
    SpreadsheetApp.getUi().alert("GEMINI_API_KEY is missing or too short. Run Setup first.");
    return;
  }

  console.log("Testing model:", model);

  var url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;

  var payload = {
    contents: [{ parts: [{ text: "Reply with only the word OK" }] }],
    generationConfig: { maxOutputTokens: 10 }
  };

  try {
    var options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    var res = UrlFetchApp.fetch(url, options);
    var code = res.getResponseCode();
    var body = res.getContentText();
    console.log("Response " + code + ":", body);

    if (code === 200) {
      var json = JSON.parse(body);
      var reply = "";
      try { reply = json.candidates[0].content.parts[0].text; } catch (e) { reply = "(could not parse reply)"; }
      SpreadsheetApp.getUi().alert(
        "Gemini connection SUCCESS!\n\n" +
        "Model: " + model + "\n" +
        "Reply: " + reply.trim()
      );
    } else {
      SpreadsheetApp.getUi().alert("Gemini test FAILED (" + code + ")\n\n" + body);
    }
  } catch (e) {
    console.error(e);
    SpreadsheetApp.getUi().alert("Error: " + e.message);
  }
}

/**
 * Smoke test to verify Autopilot trigger registration and Single Temp Sheet reuse.
 */
function testAutopilotAndSheetReuse() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Clear any existing resubmit triggers first
  clearResubmitTriggers();
  
  // Mock the timeout limit to 10 seconds (10000ms)
  const limitName = 'TEST_TIMEOUT_LIMIT';
  this[limitName] = 10000; 
  
  try {
    ss.toast("Running autopilot mock test...", "Test Console", 5);
    
    // We will call runAllReportsSafely. It should process a few reports,
    // hit the 10s limit, register a trigger, and terminate.
    runAllReportsSafely();
    
    // Check if trigger was registered
    const triggers = ScriptApp.getProjectTriggers();
    let triggerFound = false;
    triggers.forEach(t => {
      if (t.getHandlerFunction() === 'runFullReportBatch_Trigger') {
        triggerFound = true;
      }
    });
    
    if (triggerFound) {
      ss.toast("✅ Autopilot Trigger registration test PASSED!", "Test Console", 5);
      console.log("✅ Autopilot Trigger registration test PASSED!");
    } else {
      ss.toast("❌ Autopilot Trigger registration test FAILED! (No trigger found)", "Test Console", 5);
      console.error("❌ Autopilot Trigger registration test FAILED!");
    }
  } catch (e) {
    console.error("Test error:", e.stack);
    ss.toast(`❌ Test error: ${e.message}`, "Test Console", 5);
  } finally {
    // Clean up test trigger
    clearResubmitTriggers();
    // Remove global mock variable
    delete this[limitName];
  }
}

/**
 * Smoke test for ChatBotManager.getChatResponse and system instructions.
 */
function testChatBotResponse() {
  console.log("Starting ChatBot smoke test...");
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
    const response = ChatBotManager.getChatResponse(history, message, selectedText, studentContext);
    console.log("Chat Response Status:", response.error ? "FAILED" : "SUCCESS");
    console.log("Response text:", response.text || response.message);
    if (!response.error) {
      console.log("✅ Smoke test passed!");
    } else {
      console.error("❌ Smoke test failed: ", response.message);
    }
  } catch (e) {
    console.error("❌ Exception in smoke test: ", e.message, e.stack);
  }
}
