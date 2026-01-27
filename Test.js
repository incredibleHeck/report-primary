function testWhatsAppConnection() {
  const phone = "233532947022"; // <--- PUT YOUR NUMBER HERE (No +)
  
  const config = {
    token: PropertiesService.getScriptProperties().getProperty("WHATSAPP_TOKEN"),
    id: PropertiesService.getScriptProperties().getProperty("WHATSAPP_PHONE_ID")
  };

  console.log("Testing with ID:", config.id);
  console.log("Testing with Token:", config.token ? config.token.substring(0, 10) + "..." : "MISSING");

  const url = `https://graph.facebook.com/v17.0/${config.id}/messages`;
  
  const payload = {
    messaging_product: "whatsapp",
    to: phone,
    type: "text",
    text: { body: "🔔 HeckTeck Connection Test: Success!" }
  };

  try {
    const options = {
      method: "post",
      headers: { "Authorization": `Bearer ${config.token}`, "Content-Type": "application/json" },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const req = UrlFetchApp.fetch(url, options);
    console.log("Response:", req.getContentText());
    
    if (req.getResponseCode() === 200) {
      SpreadsheetApp.getUi().alert("✅ Connection SUCCESS! You can now send PDFs.");
    } else {
      SpreadsheetApp.getUi().alert("❌ Connection FAILED. Check Logs.");
    }
  } catch (e) {
    console.error(e);
    SpreadsheetApp.getUi().alert("❌ Error: " + e.message);
  }
}