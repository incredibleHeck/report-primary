/**
 * ==========================================
 * HECTECH Setup.js (Hardened Architecture)
 * ==========================================
 * Use this file to initialize or update system settings.
 * 
 * INSTRUCTIONS:
 * 1. Fill in the values inside 'initialConfig' below.
 * 2. Select 'runSystemSetup' from the dropdown menu above.
 * 3. Click 'Run'.
 * 
 * SECURITY NOTE:
 * - API keys and tokens should NEVER be committed to version control.
 * - After initial setup, consider clearing credentials from this file.
 * - Credentials are stored securely in Script Properties after setup.
 */

const SetupManager = {
  
  /**
   * 🟢 RUN THIS: To save all configurations to the Script Properties.
   */
  initializeSystem: function() {
    const ui = SpreadsheetApp.getUi();
    const scriptProps = PropertiesService.getScriptProperties();

    // --- CONFIGURATION AREA ---
    // Note: All values MUST be strings.
    // ⚠️ REPLACE PLACEHOLDER VALUES BEFORE RUNNING
    const initialConfig = {
      
      // 1. AI SETTINGS
      // Get your API key from: https://aistudio.google.com/app/apikey
      "GEMINI_API_KEY": "YOUR_GEMINI_API_KEY_HERE", 
      "GEMINI_MODEL_NAME": "gemini-2.5-flash",

      // 2. SHEET CONFIGURATION
      "CLASSLIST_SHEET_NAME": "CLASSLIST",
      "CLASSLIST_NAME_COL": "2",     // Col B
      "CLASSLIST_GENDER_COL": "5",   // Col E
      "REPORT_SHEET_NAME": "REPORT DATA",
      "CONTACT_SHEET_NAME": "CONTACT LIST",
      "TEMPLATE_SHEET_NAME": "REPORT TEMPLATE",
      "MIDTERM_SHEET_NAME": "MIDTERM DATA",
      "MIDTERM_TEMPLATE_NAME": "MIDTERM TEMPLATE",
      
      // 3. REPORT CONFIGURATION
      "DATA_START_ROW": "3",         // Student Data starts on Row 3
      "ATTENDANCE_TOTAL": "64",      // Total possible attendance days for the term
      
      // 4. WHATSAPP INTEGRATION
      // Get credentials from: https://developers.facebook.com/apps/
      "WHATSAPP_TOKEN": "YOUR_WHATSAPP_TOKEN_HERE",
      "WHATSAPP_PHONE_ID": "YOUR_WHATSAPP_PHONE_ID_HERE",
      "WHATSAPP_TEMPLATE_NAME": "student_report_pdf",
      "WHATSAPP_TEMPLATE_LANGUAGE": "en_US"
    };

    // 🟢 VALIDATION: Check for placeholder values
    const placeholders = ["YOUR_GEMINI_API_KEY_HERE", "YOUR_WHATSAPP_TOKEN_HERE", "YOUR_WHATSAPP_PHONE_ID_HERE"];
    const missingKeys = [];
    
    Object.keys(initialConfig).forEach(key => {
      const val = initialConfig[key];
      if (placeholders.includes(val)) {
        missingKeys.push(key);
      }
    });
    
    if (missingKeys.length > 0) {
      const response = ui.alert(
        "⚠️ Missing Credentials",
        `The following settings still have placeholder values:\n\n${missingKeys.join("\n")}\n\nDo you want to enter them now via prompts?`,
        ui.ButtonSet.YES_NO
      );
      
      if (response === ui.Button.YES) {
        missingKeys.forEach(key => {
          const input = ui.prompt(`Enter value for ${key}:`, ui.ButtonSet.OK_CANCEL);
          if (input.getSelectedButton() === ui.Button.OK && input.getResponseText().trim()) {
            initialConfig[key] = input.getResponseText().trim();
          }
        });
      }
    }

    // 🟢 DATA CLEANING (Hardening Step)
    const cleanedConfig = {};
    Object.keys(initialConfig).forEach(key => {
      cleanedConfig[key] = initialConfig[key].toString().trim();
    });

    // SAVE TO SYSTEM
    scriptProps.setProperties(cleanedConfig);

    // 🟢 REFRESH CACHES
    if (typeof GenderNormalizer !== 'undefined') GenderNormalizer.clearCache();
    if (typeof FolderManager !== 'undefined') FolderManager.resetCache();
    if (typeof DynamicConfig !== 'undefined' && DynamicConfig._cache) DynamicConfig._cache = {};

    // LOG & CONFIRM
    console.log("✅ System Properties Updated.");
    ui.alert("🔒 Setup Complete", "System settings have been saved to Script Properties.", ui.ButtonSet.OK);
  },

  /**
   * 🔴 DANGER ZONE: Clear all settings
   */
  factoryReset: function() {
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert("⚠ FACTORY RESET", "This will wipe ALL hidden settings (API Keys, Token, etc) and clear all caches. Are you sure?", ui.ButtonSet.YES_NO);
    
    if (response === ui.Button.YES) {
      PropertiesService.getScriptProperties().deleteAllProperties();
      CacheService.getUserCache().removeAll([]);
      ui.alert("System Wiped. Please run Setup again.");
    }
  }
};

/**
 * Menu Wrappers
 */
function runSystemSetup() { SetupManager.initializeSystem(); }
function resetSystem() { SetupManager.factoryReset(); }