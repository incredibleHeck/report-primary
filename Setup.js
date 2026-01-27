/**
 * ==========================================
 * HECKTECK Setup.gs (Hardened Architecture)
 * ==========================================
 * Use this file to initialize or update system settings.
 * * INSTRUCTIONS:
 * 1. Fill in the values inside 'initialConfig'.
 * 2. Select 'runSystemSetup' from the dropdown menu above.
 * 3. Click 'Run'.
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
    const initialConfig = {
      
      // 1. AI SETTINGS
      "GEMINI_API_KEY": "AIzaSyBgPQs0ShkUT3mBwhlQ9Nj6WGqJpBbaKG4", 
      "GEMINI_MODEL_NAME": "gemini-2.5-flash",

      // 2. SHEET COLUMNS (Based on your CSVs)
      "CLASSLIST_SHEET_NAME": "CLASSLIST",
      "CLASSLIST_NAME_COL": "2",     // Col B
      "CLASSLIST_GENDER_COL": "5",   // Col E
      
      // 3. REPORT CONFIGURATION
      "DATA_START_ROW": "3",         // Student Data starts on Row 3
      "RPT_SHEET_NAME": "PRIMARY EOT 1 REPORT", 
      
      // 4. WHATSAPP INTEGRATION
      "WHATSAPP_TOKEN": "EAAWWB6...", // [TRUNCATED FOR SECURITY - FILL FULL TOKEN HERE]
      "WHATSAPP_PHONE_ID": "938925362643051", 
      "WHATSAPP_TEMPLATE_NAME": "student_report_pdf"
    };

    // 🟢 DATA CLEANING (Hardening Step)
    // Remove accidental spaces from Keys and IDs
    const cleanedConfig = {};
    Object.keys(initialConfig).forEach(key => {
      cleanedConfig[key] = initialConfig[key].toString().trim();
    });

    // SAVE TO SYSTEM
    scriptProps.setProperties(cleanedConfig);

    // 🟢 REFRESH CACHES
    // Clear caches so settings take effect immediately
    if (typeof GenderNormalizer !== 'undefined') GenderNormalizer.clearCache();
    if (typeof FolderManager !== 'undefined') FolderManager.resetCache();
    // Note: TemplateManager line removed as it is no longer used.

    // LOG & CONFIRM
    console.log("✅ System Properties Updated.");
    ui.alert("🔒 Setup Complete", "System settings have been updated and unnecessary template configurations removed.", ui.ButtonSet.OK);
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