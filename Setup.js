// ==========================================
// HECTECH Setup.js (Hardened Multi-Tenant Core)
// ==========================================

const SetupManager = {
  /** Core operational constants */
  DEFAULT_DATA_START_ROW: "3",
  DEFAULT_ATTENDANCE_TOTAL: "64",

  /**
   * Initializes or patches structural campus environment layouts.
   * Scopes non-secret configurations dynamically to the host spreadsheet ID
   * to protect multi-tenant integrity across distinct campus files.
   */
  initializeClientCampus: function() {
    const ui = SpreadsheetApp.getUi();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ssId = ss.getId();
    
    // Validate host environment context defensively
    if (!ssId) {
      ui.alert("❌ Environment Error", "Failed to resolve host spreadsheet identifier string.", ui.ButtonSet.OK);
      return;
    }

    // 🟢 TWO-TIER SAFE MANIFEST: Campus non-secret structural parameters only
    const clientConfigDefaults = {
      "CLASSLIST_SHEET_NAME": "CLASSLIST",
      "CLASSLIST_NAME_COL": "2",
      "CLASSLIST_GENDER_COL": "5",
      "REPORT_SHEET_NAME": "REPORT DATA",
      "CONTACT_SHEET_NAME": "CONTACT LIST",
      "TEMPLATE_SHEET_NAME": "REPORT TEMPLATE",
      "MIDTERM_SHEET_NAME": "MIDTERM DATA",
      "MIDTERM_TEMPLATE_NAME": "MIDTERM TEMPLATE",
      "DATA_START_ROW": this.DEFAULT_DATA_START_ROW,
      "ATTENDANCE_TOTAL": this.DEFAULT_ATTENDANCE_TOTAL,
      "WHATSAPP_TEMPLATE_NAME": "student_report_pdf",
      "WHATSAPP_TEMPLATE_LANGUAGE": "en"
    };

    const scriptProps = PropertiesService.getScriptProperties();
    const existingProps = scriptProps.getProperties();
    const writeBuffer = Object.create(null);

    // Map campus layout configurations to sheet-isolated suffix boundaries
    Object.keys(clientConfigDefaults).forEach(baseKey => {
      const scopedKey = `${baseKey}_${ssId}`;
      const existingVal = existingProps[scopedKey] || existingProps[baseKey];
      
      // Preserve existing parameters if populated, otherwise write baseline defaults
      if (existingVal && String(existingVal).trim() !== '') {
        writeBuffer[scopedKey] = String(existingVal).trim();
      } else {
        writeBuffer[scopedKey] = clientConfigDefaults[baseKey];
      }
    });

    try {
      // Execute an optimized atomic batch write operation to save local campus parameters
      scriptProps.setProperties(writeBuffer);
      
      // Flush active operational caches instantly to prevent parameter drift
      this.flushDependentCaches();

      console.log(`HecTech System: Local campus environment initialized successfully for ID: [${ssId}]`);
      ui.alert("🎉 Setup Complete", `Campus environment properties initialized successfully.\n\nSpreadsheet Target Reference:\n${ssId}`, ui.ButtonSet.OK);
      
    } catch (err) {
      console.error(`Critical failure executing campus structural initialization: ${err.message}`);
      ui.alert("❌ Setup Failure", `Failed to save workspace configurations safely: ${err.message}`, ui.ButtonSet.OK);
    }
  },

  /**
   * 🔑 MASTER SECURITY CONFIGURATION INTERFACE (Developer Console Only)
   * Run this directly from your Master Vault Project Editor to configure billing or messaging tokens.
   * Completely invisible to client campus spreadsheet files.
   */
  configureMasterVaultSecrets: function() {
    const ui = SpreadsheetApp.getUi();
    const scriptProps = PropertiesService.getScriptProperties();
    const secretsKeys = ["GEMINI_API_KEY", "WHATSAPP_TOKEN", "WHATSAPP_PHONE_ID", "GEMINI_MODEL_NAME"];
    
    ui.alert(
      "🔒 HecTech Master Vault Security Console",
      "You are modifying core infrastructure billing tokens and messaging API gateways globally.\n\nClick OK to verify or alter active secrets.",
      ui.ButtonSet.OK
    );

    const activeProperties = scriptProps.getProperties();
    const updatePayload = Object.create(null);

    for (let i = 0; i < secretsKeys.length; i++) {
      const key = secretsKeys[i];
      const existingValue = activeProperties[key] || "";
      
      // Mask existing secrets tokens for interface display safety
      const maskDisplay = existingValue ? `[CURRENTLY CONFIGURED: ${existingValue.substring(0, 6)}...*******]` : "[EMPTY / UNCONFIGURED]";
      
      const promptResult = ui.prompt(
        `Configure ${key}`,
        `${maskDisplay}\n\nEnter a new value below, or click CANCEL to preserve active parameters unchanged:`,
        ui.ButtonSet.OK_CANCEL
      );

      if (promptResult.getSelectedButton() === ui.Button.OK) {
        const userInput = promptResult.getResponseText().trim();
        if (userInput) {
          updatePayload[key] = userInput;
        } else if (existingValue) {
          updatePayload[key] = existingValue; // Re-bind active value if field input is empty
        }
      } else {
        // User clicked cancel: protect and carry over current value
        if (existingValue) {
          updatePayload[key] = existingValue;
        }
      }
    }

    // Verify critical API dependencies before saving changes
    if (!updatePayload["GEMINI_API_KEY"]) {
      const abortResponse = ui.alert("⚠️ Critical Target Omission", "No valid GEMINI_API_KEY value was resolved. Abort master setup pass?", ui.ButtonSet.YES_NO);
      if (abortResponse === ui.Button.YES) return;
    }

    // Default to a stable engine path if model definitions are omitted
    if (!updatePayload["GEMINI_MODEL_NAME"]) {
      updatePayload["GEMINI_MODEL_NAME"] = "gemini-3.5-flash";
    }

    scriptProps.setProperties(updatePayload);
    this.flushDependentCaches();
    
    ui.alert("✅ Master Security Updated", "Core platform billing profiles and communication keys saved securely.", ui.ButtonSet.OK);
  },

  /**
   * 🛑 FACTORY RESET SAFECRACKER
   * Clears out current configurations and forces a clean setup cycle.
   */
  factoryReset: function() {
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      "⚠️ CRITICAL SYSTEM FACTORY RESET",
      "This action will wipe ALL localized campus attributes, script properties, and cached data structures.\n\nAre you absolutely sure you want to proceed?",
      ui.ButtonSet.YES_NO
    );
    
    if (response === ui.Button.YES) {
      PropertiesService.getScriptProperties().deleteAllProperties();
      PropertiesService.getUserProperties().deleteAllProperties();
      
      try { CacheService.getUserCache().removeAll([]); } catch(e) {}
      
      this.flushDependentCaches();
      ui.alert("System cleared completely. Please run initialization setup routines again.");
    }
  },

  /**
   * Resets configuration tracking states cleanly.
   */
  flushDependentCaches: function() {
    if (typeof GenderNormalizer !== 'undefined' && GenderNormalizer.clearCache) GenderNormalizer.clearCache();
    if (typeof FolderManager !== 'undefined' && FolderManager.resetCache) FolderManager.resetCache();
    
    if (typeof DynamicConfig !== 'undefined' && DynamicConfig._cache) {
      DynamicConfig._cache = Object.create(null); // Structural clean blocks prototype pollution issues
    }
    if (typeof Config !== 'undefined' && Config._cache) {
      Config._cache = Object.create(null);
    }
  }
};

// ==========================================
// SYSTEM ENTRY EXTERNAL INTERFACE HOOKS
// ==========================================
function runSystemSetup() { verifyLicenseAuthorization(); SetupManager.initializeClientCampus(); }
function runMasterSecuritySetup() { verifyLicenseAuthorization(); SetupManager.configureMasterVaultSecrets(); }
function resetSystem() { verifyLicenseAuthorization(); SetupManager.factoryReset(); }