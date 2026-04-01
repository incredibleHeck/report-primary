// ==========================================
// HECTECH SettingsManager.js
// ==========================================

const SettingsManager = {
    openSidebar: function () {
        const html = HtmlService.createHtmlOutputFromFile('SettingsSidebar')
            .setTitle('Class Settings')
            .setWidth(300);
        SpreadsheetApp.getUi().showSidebar(html);
    },

    /**
     * Read class settings from a plain key/value map (e.g. container Script Properties).
     */
    getSettingsFromPropertyMap: function (map, ssId) {
        const getProp = (key, defaultVal) => {
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
            TEACHER_NAME: getProp("TEACHER_NAME", "")
        };
    },

    /**
     * Build the property object for setProperties (KEY_<ssId> per field).
     */
    buildSettingsSaveProperties: function (settings, ssId) {
        const clientSettings = {};
        for (const key in settings) {
            clientSettings[`${key}_${ssId}`] = settings[key];
        }
        return clientSettings;
    },

    /** Sheet updates after settings were persisted in the container project. */
    applySettingsSideEffects: function (settings) {
        if (typeof invalidateConfigCache === 'function') {
            invalidateConfigCache();
        } else if (typeof DynamicConfig !== 'undefined' && DynamicConfig._cache) {
            DynamicConfig._cache = {};
        }

        try {
            const ss = SpreadsheetApp.getActiveSpreadsheet();
            const sheet = ss.getSheetByName(typeof Config !== 'undefined' ? Config.REPORT_SHEET_NAME : "REPORT DATA");

            if (sheet && settings.TEACHER_NAME) {
                let targetCol = 69;
                if (typeof Config !== 'undefined' && Config.REPORT_COLUMNS && Config.REPORT_COLUMNS.TEACHER_NAME) {
                    targetCol = Config.REPORT_COLUMNS.TEACHER_NAME + 1;
                }

                const startRow = 2;
                const lastRow = Math.max(sheet.getLastRow(), startRow);
                const numRows = lastRow - startRow + 1;

                const nameArray = new Array(numRows).fill([settings.TEACHER_NAME]);

                sheet.getRange(startRow, targetCol, numRows, 1).setValues(nameArray);
            }
        } catch (e) {
            console.error("Error applying teacher name:", e);
        }

        return { success: true };
    },

    getSettings: function () {
        const ssId = SpreadsheetApp.getActiveSpreadsheet().getId();
        let map;
        if (typeof ClientScriptPropertiesBridge !== 'undefined' && ClientScriptPropertiesBridge.isHydrated()) {
            map = ClientScriptPropertiesBridge.getSnapshot() || {};
        } else {
            map = PropertiesService.getScriptProperties().getProperties();
        }
        return SettingsManager.getSettingsFromPropertyMap(map, ssId);
    },

    /** Persists to this script's properties (library project when not using the client shell). */
    saveSettings: function (settings) {
        const ssId = SpreadsheetApp.getActiveSpreadsheet().getId();
        const props = PropertiesService.getScriptProperties();
        props.setProperties(SettingsManager.buildSettingsSaveProperties(settings, ssId));
        return SettingsManager.applySettingsSideEffects(settings);
    }
};

// Global hooks for the HTML sidebar (library-bound deployments)
function getSettingsData() { return SettingsManager.getSettings(); }
function saveSettingsData(settings) { return SettingsManager.saveSettings(settings); }
function openSettingsSidebar() { SettingsManager.openSidebar(); }

// Container shell: read/write Script Properties in the user's project, then call these.
function getSettingsFromPropertyMap(map, ssId) {
    return SettingsManager.getSettingsFromPropertyMap(map, ssId);
}

function buildSettingsSaveProperties(settings, ssId) {
    return SettingsManager.buildSettingsSaveProperties(settings, ssId);
}

function afterClientSettingsSaved(settings) {
    return SettingsManager.applySettingsSideEffects(settings);
}
