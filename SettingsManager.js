// ==========================================
// HECTECH SettingsManager.js (Hardened)
// ==========================================

const SettingsManager = {
    openSidebar: function () {
        const html = HtmlService.createHtmlOutputFromFile('SettingsSidebar')
            .setTitle('Class Settings')
            .setWidth(300)
            .addMetaTag('viewport', 'width=device-width, initial-scale=1');
        SpreadsheetApp.getUi().showSidebar(html);
    },

    /**
     * Reads class settings from a combined property map.
     * Prioritizes sheet-scoped variations cleanly before falling back to system keys.
     */
    getSettingsFromPropertyMap: function (map, ssId) {
        const getProp = (key, defaultVal) => {
            if (!map) return defaultVal;
            return map[`${key}_${ssId}`] || map[key] || defaultVal;
        };

        return {
            CLASS_NAME: getProp("CLASS_NAME", "YEAR FIVE (A)"),
            ROLL_COUNT: getProp("ROLL_COUNT", "25"),
            TERM_YEAR_INFO: getProp("TERM_YEAR_INFO", "Year: 2025 / 2026 Term: ONE (1)"),
            REPORT_DATE: getProp("REPORT_DATE", "11TH DECEMBER 2025."),
            NEXT_TERM_BEGINS: getProp("NEXT_TERM_BEGINS", "6TH JANUARY 2026."),
            SCHOOL_BREAKS: getProp("SCHOOL_BREAKS", "11TH DECEMBER 2025"),
            SCHOOL_RESUMES: getProp("SCHOOL_RESUMES", "6TH JANUARY 2026"),
            ATTENDANCE_TOTAL: getProp("ATTENDANCE_TOTAL", "64"),
            TEACHER_NAME: getProp("TEACHER_NAME", ""),
            WHATSAPP_TEMPLATE_NAME: getProp("WHATSAPP_TEMPLATE_NAME", "student_report_pdf"),
            WHATSAPP_TEMPLATE_LANGUAGE: getProp("WHATSAPP_TEMPLATE_LANGUAGE", "en")
        };
    },

    /** Bare keys that bypass sheet-scoping to remain globally shared across projects */
    GLOBAL_KEYS: ['WHATSAPP_TEMPLATE_NAME', 'WHATSAPP_TEMPLATE_LANGUAGE', 'GEMINI_MODEL_NAME', 'API_KEY'],

    /**
     * Maps settings objects to their exact target storage keys.
     */
    buildSettingsSaveProperties: function (settings, ssId) {
        const clientSettings = {};
        if (!settings) return clientSettings;

        for (const key in settings) {
            if (Object.prototype.hasOwnProperty.call(settings, key)) {
                if (this.GLOBAL_KEYS.indexOf(key) !== -1) {
                    clientSettings[key] = String(settings[key]).trim();
                } else {
                    clientSettings[`${key}_${ssId}`] = String(settings[key]).trim();
                }
            }
        }
        return clientSettings;
    },

    /**
     * Handles background side effects after a save path executes successfully.
     * Synchronizes and writes the active teacher name down the core tracking columns.
     */
    applySettingsSideEffects: function (settings) {
        // Clear active configuration cache registries instantly to prevent stale parameters
        if (typeof invalidateConfigCache === 'function') {
            invalidateConfigCache();
        } else if (typeof DynamicConfig !== 'undefined' && DynamicConfig._cache) {
            DynamicConfig._cache = Object.create(null);
        }

        try {
            if (!settings || !settings.TEACHER_NAME) return { success: true };

            const ss = SpreadsheetApp.getActiveSpreadsheet();
            const reportSheetName = (typeof Config !== 'undefined' && Config.REPORT_SHEET_NAME) ? Config.REPORT_SHEET_NAME : "REPORT DATA";
            const sheet = ss.getSheetByName(reportSheetName);

            if (sheet) {
                // 🟢 CONFIG SOURCE OF TRUTH ALIGNMENT: Enforce clean Row 3 boundaries
                const startRow = (typeof Config !== 'undefined' && Config.DATA_START_ROW) ? Config.DATA_START_ROW : 3;
                const lastRow = sheet.getLastRow();

                // Defensive check: Drop tracking adjustments if the sheet contains no valid rows
                if (lastRow < startRow) {
                    return { success: true };
                }

                let targetCol = 69; // Fallback default index
                if (typeof Config !== 'undefined' && Config.REPORT_COLUMNS && Config.REPORT_COLUMNS.TEACHER_NAME) {
                    targetCol = Config.REPORT_COLUMNS.TEACHER_NAME + 1;
                }

                const numRows = (lastRow - startRow) + 1;
                const nameArray = new Array(numRows).fill([settings.TEACHER_NAME.trim()]);

                // Write the teacher name array down the column efficiently in a single block operation
                sheet.getRange(startRow, targetCol, numRows, 1).setValues(nameArray);
                SpreadsheetApp.flush();
            }
        } catch (e) {
            console.error("Failed to push systemic teacher background updates:", e);
        }

        return { success: true };
    },

    /**
     * Resolves configurations by merging script snapshots, bridge objects, and document states.
     */
    getSettings: function () {
        const ssId = SpreadsheetApp.getActiveSpreadsheet().getId();
        
        let bridgeMap = {};
        if (typeof ClientScriptPropertiesBridge !== 'undefined' && ClientScriptPropertiesBridge.isHydrated()) {
            bridgeMap = ClientScriptPropertiesBridge.getSnapshot() || {};
        }
        
        let localScriptProps = {};
        if (typeof ClientScriptPropertiesBridge === 'undefined' || !ClientScriptPropertiesBridge.isHydrated()) {
            localScriptProps = PropertiesService.getScriptProperties().getProperties();
        }
        
        const docProps = PropertiesService.getDocumentProperties().getProperties();
        
        // Build unified lookups by merging snapshots in order of priority
        const map = Object.assign(Object.create(null), localScriptProps, bridgeMap, docProps);
        
        return SettingsManager.getSettingsFromPropertyMap(map, ssId);
    },

    /**
     * Clean save operation writes to local properties storage.
     * Standardizes state routing to work seamlessly with your bridge architecture.
     */
    saveSettings: function (settings) {
        const ssId = SpreadsheetApp.getActiveSpreadsheet().getId();
        const payload = SettingsManager.buildSettingsSaveProperties(settings, ssId);
        
        // 🟢 FIXED: Standardized target saves to match client shell patterns exactly
        if (typeof ClientScriptPropertiesBridge !== 'undefined' && ClientScriptPropertiesBridge.isHydrated()) {
            PropertiesService.getScriptProperties().setProperties(payload);
        } else {
            PropertiesService.getDocumentProperties().setProperties(payload);
        }
        
        return SettingsManager.applySettingsSideEffects(settings);
    }
};

// ==========================================
// CENTRAL EXPOSURE SYSTEM LINKS
// ==========================================

function getSettingsData() { verifyLicenseAuthorization(); return SettingsManager.getSettings(); }
function saveSettingsData(settings) { verifyLicenseAuthorization(); return SettingsManager.saveSettings(settings); }
function openSettingsSidebar() { verifyLicenseAuthorization(); SettingsManager.openSidebar(); }

function getSettingsFromPropertyMap(map, ssId) {
    verifyLicenseAuthorization();
    return SettingsManager.getSettingsFromPropertyMap(map, ssId);
}

function buildSettingsSaveProperties(settings, ssId) {
    verifyLicenseAuthorization();
    return SettingsManager.buildSettingsSaveProperties(settings, ssId);
}

function afterClientSettingsSaved(settings) {
    verifyLicenseAuthorization();
    return SettingsManager.applySettingsSideEffects(settings);
}
