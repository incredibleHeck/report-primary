// ==========================================
// HECTECH SettingsManager.js
// ==========================================

const SettingsManager = {
    openSidebar: function() {
        const html = HtmlService.createHtmlOutputFromFile('SettingsSidebar')
            .setTitle('Class Settings')
            .setWidth(300);
        SpreadsheetApp.getUi().showSidebar(html);
    },

    getSettings: function() {
        const ssId = SpreadsheetApp.getActiveSpreadsheet().getId();
        const props = PropertiesService.getScriptProperties();
        
        const getProp = (key, defaultVal) => {
            return props.getProperty(`${key}_${ssId}`) || props.getProperty(key) || defaultVal;
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

    saveSettings: function(settings) {
        const ssId = SpreadsheetApp.getActiveSpreadsheet().getId();
        const props = PropertiesService.getScriptProperties();
        
        const clientSettings = {};
        for (const key in settings) {
            clientSettings[`${key}_${ssId}`] = settings[key];
        }
        
        props.setProperties(clientSettings);
        
        // Invalidate config cache so new settings reflect immediately
        if (typeof DynamicConfig !== 'undefined' && DynamicConfig._cache) {
            DynamicConfig._cache = {};
        }

        // Apply Teacher Name to Report Sheet
        try {
            const ss = SpreadsheetApp.getActiveSpreadsheet();
            const sheet = ss.getSheetByName(typeof Config !== 'undefined' ? Config.REPORT_SHEET_NAME : "REPORT DATA");
            
            if (sheet && settings.TEACHER_NAME) {
                // Config.REPORT_COLUMNS.TEACHER_NAME is 68 (0-based array index). 
                // We add 1 for the 1-based Sheet column index, which is 69 (Column BQ).
                let targetCol = 69; 
                if (typeof Config !== 'undefined' && Config.REPORT_COLUMNS && Config.REPORT_COLUMNS.TEACHER_NAME) {
                    targetCol = Config.REPORT_COLUMNS.TEACHER_NAME + 1; 
                }

                // User explicitly requested starting on row 2 for the report data
                const startRow = 2;
                const lastRow = Math.max(sheet.getLastRow(), startRow);
                const numRows = lastRow - startRow + 1;
                
                const nameArray = new Array(numRows).fill([settings.TEACHER_NAME]);
                
                // Write to column BQ (69) only
                sheet.getRange(startRow, targetCol, numRows, 1).setValues(nameArray);
            }
        } catch (e) {
            console.error("Error applying teacher name:", e);
        }

        return { success: true };
    }
};

// Global hooks for the HTML sidebar
function getSettingsData() { return SettingsManager.getSettings(); }
function saveSettingsData(settings) { return SettingsManager.saveSettings(settings); }
function openSettingsSidebar() { SettingsManager.openSidebar(); }
