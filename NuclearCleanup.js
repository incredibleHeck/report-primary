function runNuclearCleanup() {
  const props = PropertiesService.getScriptProperties();
  const allProps = props.getProperties();
  const keys = Object.keys(allProps);
  
  // These are the ONLY keys that will survive. Everything else is deleted.
  const SAFE_KEYS = [
    "GEMINI_API_KEY",
    "WHATSAPP_TOKEN",
    "WHATSAPP_PHONE_ID",
    "WHATSAPP_TEMPLATE_NAME",
    "WHATSAPP_TEMPLATE_LANGUAGE",
    "GEMINI_MODEL_NAME",
    "CLASSLIST_SHEET_NAME",
    "REPORT_SHEET_NAME",
    "CONTACT_SHEET_NAME",
    "TEMPLATE_SHEET_NAME",
    "MIDTERM_SHEET_NAME",
    "MIDTERM_TEMPLATE_NAME",
    "DATA_START_ROW",
    "ATTENDANCE_TOTAL"
  ];

  let deletedCount = 0;

  keys.forEach(key => {
    // If the key is NOT in our safe list, delete it
    if (!SAFE_KEYS.includes(key)) {
      props.deleteProperty(key);
      deletedCount++;
    }
  });

  const message = `Cleanup Complete! Deleted ${deletedCount} clone properties. Kept ${keys.length - deletedCount} core vault properties.`;
  Logger.log(message);
  
  // Show a popup if run from the spreadsheet UI (otherwise just logs)
  try {
    SpreadsheetApp.getUi().alert("Cleanup Success", message, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch(e) {}
}
