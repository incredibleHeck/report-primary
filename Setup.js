/**
 * ==========================================
 * HECTECH Setup.js (Hardened Architecture)
 * ==========================================
 * Initializes or updates system settings via interactive prompts.
 *
 * SECURITY:
 * - Secrets (API keys, tokens) are NEVER stored in source code.
 * - They are entered at runtime via UI prompts and saved to Script Properties.
 * - Non-secret defaults (sheet names, column indices) are set inline below.
 */

const SetupManager = {

  /** Keys that must be provided via prompt (never hardcoded). */
  SECRET_KEYS: ["GEMINI_API_KEY", "WHATSAPP_TOKEN", "WHATSAPP_PHONE_ID"],

  initializeSystem: function() {
    const ui = SpreadsheetApp.getUi();
    const scriptProps = PropertiesService.getScriptProperties();
    const existing = scriptProps.getProperties();

    const config = {
      // 1. AI SETTINGS (secret entered via prompt)
      "GEMINI_API_KEY": "",
      "GEMINI_MODEL_NAME": "gemini-2.5-flash",

      // 2. SHEET CONFIGURATION
      "CLASSLIST_SHEET_NAME": "CLASSLIST",
      "CLASSLIST_NAME_COL": "2",
      "CLASSLIST_GENDER_COL": "5",
      "REPORT_SHEET_NAME": "REPORT DATA",
      "CONTACT_SHEET_NAME": "CONTACT LIST",
      "TEMPLATE_SHEET_NAME": "REPORT TEMPLATE",
      "MIDTERM_SHEET_NAME": "MIDTERM DATA",
      "MIDTERM_TEMPLATE_NAME": "MIDTERM TEMPLATE",

      // 3. REPORT CONFIGURATION
      "DATA_START_ROW": "3",
      "ATTENDANCE_TOTAL": "64",

      // 4. WHATSAPP INTEGRATION (secrets entered via prompt)
      "WHATSAPP_TOKEN": "",
      "WHATSAPP_PHONE_ID": "",
      "WHATSAPP_TEMPLATE_NAME": "student_report_pdf",
      "WHATSAPP_TEMPLATE_LANGUAGE": "en"
    };

    // For secrets: keep any existing value if already configured, otherwise prompt
    this.SECRET_KEYS.forEach(key => {
      const cur = existing[key];
      if (cur && cur.trim() !== '') {
        config[key] = cur;
      }
    });

    // Prompt for any secrets still empty
    const emptySecrets = this.SECRET_KEYS.filter(k => !config[k] || config[k].trim() === '');
    if (emptySecrets.length > 0) {
      ui.alert(
        "Credentials Required",
        "The following secrets need to be entered:\n\n" + emptySecrets.join("\n") +
        "\n\nYou will be prompted for each one.",
        ui.ButtonSet.OK
      );
      emptySecrets.forEach(key => {
        const input = ui.prompt("Enter value for " + key + ":", ui.ButtonSet.OK_CANCEL);
        if (input.getSelectedButton() === ui.Button.OK && input.getResponseText().trim()) {
          config[key] = input.getResponseText().trim();
        }
      });
    }

    // Warn if any secrets are still empty after prompts
    const stillMissing = this.SECRET_KEYS.filter(k => !config[k] || config[k].trim() === '');
    if (stillMissing.length > 0) {
      const proceed = ui.alert(
        "Warning",
        "These credentials are still empty:\n\n" + stillMissing.join("\n") +
        "\n\nFeatures depending on them will not work.\nContinue saving other settings?",
        ui.ButtonSet.YES_NO
      );
      if (proceed !== ui.Button.YES) return;
    }

    // Clean and save (skip empty secrets so we don't overwrite existing values with blanks)
    const cleanedConfig = {};
    Object.keys(config).forEach(key => {
      const val = config[key];
      if (val && val.toString().trim() !== '') {
        cleanedConfig[key] = val.toString().trim();
      }
    });

    scriptProps.setProperties(cleanedConfig);

    if (typeof GenderNormalizer !== 'undefined') GenderNormalizer.clearCache();
    if (typeof FolderManager !== 'undefined') FolderManager.resetCache();
    if (typeof DynamicConfig !== 'undefined' && DynamicConfig._cache) DynamicConfig._cache = {};

    console.log("System Properties Updated.");
    ui.alert("Setup Complete", "System settings have been saved to Script Properties.", ui.ButtonSet.OK);
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