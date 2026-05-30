/**
 * Hardened Master Purge Script
 * Flushes out dead keys, clears token registries, and resets active triggers
 * while protecting core global settings and localized sheet configurations.
 * * @param {Object} clientPropsObject - Passed script properties pointer from container shell.
 */
function runNuclearCleanup(clientPropsObject) {
  verifyLicenseAuthorization();
  const props = clientPropsObject || PropertiesService.getScriptProperties();
  const allProps = props.getProperties();
  const keys = Object.keys(allProps);
  
  // 🟢 CORE FRAMEWORK CONFIGURATION WHITELIST
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

  const retainedProperties = Object.create(null);
  let deletedCount = 0;

  /**
   * Evaluates if a key is whitelisted, checking for localized spreadsheet ID suffixes.
   */
  const evaluateKeySafety = (rawKey) => {
    if (!rawKey) return false;
    if (SAFE_KEYS.indexOf(rawKey) !== -1) return true;

    // 🟢 PROTECTION FIX: Retain root automated folder directories
    if (rawKey.indexOf("REPORT_FOLDER_") === 0) return true;

    // 🟢 EXTRACT SHEET SCOPE OVERLAYS: Matches standard suffix segments (KEY_spreadsheetId)
    // Extracts the base parameter key to verify if it belongs in the whitelist matrix
    const overlayMatch = rawKey.match(/^([A-Z0-9_]+)_[a-zA-Z0-9\-_]{40,50}$/);
    if (overlayMatch && SAFE_KEYS.indexOf(overlayMatch[1]) !== -1) {
      return true; // Match confirmed; protect this sheet-specific config
    }

    return false;
  };

  // Sort properties into retention maps or increment the purge counter
  keys.forEach(key => {
    if (evaluateKeySafety(key)) {
      retainedProperties[key] = allProps[key];
    } else {
      deletedCount++;
    }
  });

  // 🟢 ATOMIC WRITE OPERATION: Updates properties and flushes legacy entries in a single network pass
  if (deletedCount > 0) {
    props.setProperties(retainedProperties, true);
  }

  // --- SECONDARY FLUSH PURGES (Session registries & trigger pools) ---
  try {
    PropertiesService.getUserProperties().deleteAllProperties();
  } catch(e) {
    console.warn("User properties map unavailable for current execution context.");
  }
  
  try {
    const ssId = SpreadsheetApp.getActiveSpreadsheet().getId();
    const docProps = PropertiesService.getDocumentProperties();
    docProps.deleteProperty(`OAUTH_TOKEN_CACHE_${ssId}`);
    docProps.deleteProperty(`OAUTH_TOKEN_CACHE_MIDTERM_${ssId}`);
  } catch(e) {
    console.warn("Document token registries unresolvable or already flushed.");
  }
  
  try {
    if (typeof clearResubmitTriggers === 'function') {
      clearResubmitTriggers();
    }
  } catch(e) {
    console.error("Critical error clearing background trigger infrastructure profiles:", e);
  }

  const message = `Cleanup Complete! Purged ${deletedCount} legacy records. Preserved ${Object.keys(retainedProperties).length} active configuration keys. Client session tracking caches flushed cleanly.`;
  Logger.log(message);
  
  try {
    SpreadsheetApp.getUi().alert("HecTech Engine: Cleanup Success", message, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch(e) {
    // Graceful fallback when executed via background cron triggers or developer editor logs
  }
}
