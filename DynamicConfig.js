// ==========================================
// HECTECH DynamicConfig.js (Cleaned & Optimized)
// ==========================================

const DynamicConfig = {
    // 1. LAZY LOADING CACHE (Prevents Quota Errors)
    _cache: {},
    _ssId: null,
    
    _get: function(key) {
        if (!this._ssId) {
            this._ssId = SpreadsheetApp.getActiveSpreadsheet().getId();
        }
        const ssId = this._ssId;
        const clientKey = `${key}_${ssId}`;
        
        if (this._cache[clientKey]) return this._cache[clientKey];
        
        let val = null;
        if (typeof ClientScriptPropertiesBridge !== 'undefined' && ClientScriptPropertiesBridge.isHydrated()) {
            val = ClientScriptPropertiesBridge.getConfigValue(key, ssId);
        }
        
        // Standalone fallback (only works when run directly in the vault container, not as a library)
        if (!val) {
            try {
                const props = PropertiesService.getScriptProperties();
                val = props.getProperty(clientKey);
                if (!val) {
                    val = props.getProperty(key);
                }
            } catch (e) {
                console.warn("PropertiesService fallback bypassed/failed:", e.message);
            }
        }
        
        this._cache[clientKey] = val;
        return val;
    },
    
    _getInt: function(key, defaultVal) {
        const val = this._get(key);
        return val ? parseInt(val, 10) : defaultVal;
    },

    // --- AI & CORE ---
    get API_KEY() { return this._get("GEMINI_API_KEY") || ""; },
    get MODEL_NAME() { return this._get("GEMINI_MODEL_NAME") || "gemini-2.5-flash"; },
    
    // --- SHEET NAMES (Configurable via Script Properties with defaults) ---
    get CLASSLIST_SHEET_NAME() { return this._get("CLASSLIST_SHEET_NAME") || "CLASSLIST"; },
    get REPORT_SHEET_NAME() { return this._get("REPORT_SHEET_NAME") || "REPORT DATA"; },
    get CONTACT_SHEET_NAME() { return this._get("CONTACT_SHEET_NAME") || "CONTACT LIST"; },
    get TEMPLATE_SHEET_NAME() { return this._get("TEMPLATE_SHEET_NAME") || "REPORT TEMPLATE"; },
    get MIDTERM_SHEET_NAME() { return this._get("MIDTERM_SHEET_NAME") || "MIDTERM DATA"; },
    get MIDTERM_TEMPLATE_NAME() { return this._get("MIDTERM_TEMPLATE_NAME") || "MIDTERM TEMPLATE"; },
    
    // --- CLASSLIST CONFIGURATION ---
    get CLASSLIST_NAME_COL() { return this._getInt("CLASSLIST_NAME_COL", 2); },
    get CLASSLIST_GENDER_COL() { return this._getInt("CLASSLIST_GENDER_COL", 5); },
    
    // --- ARCHITECTURE ---
    get HEADER_ROW() { return 2; },     
    get DATA_START_ROW() { return this._getInt("DATA_START_ROW", 3); }, 
    /** First row of student rows on REPORT DATA (usually 2: header row 1; set to 3 if you use a second header row). */
    get REPORT_DATA_FIRST_ROW() { return this._getInt("REPORT_DATA_FIRST_ROW", 3); },
    get ATTENDANCE_TOTAL() { return this._getInt("ATTENDANCE_TOTAL", 64); },

    // --- TEMPLATE STRINGS ---
    get CLASS_NAME() { return this._get("CLASS_NAME") || "YEAR FIVE (A)"; },
    get ROLL_COUNT() { return this._get("ROLL_COUNT") || "25"; },
    get TERM_YEAR_INFO() { return this._get("TERM_YEAR_INFO") || "Year: 2025 / 2026 Term: ONE (1)"; },
    get REPORT_DATE() { return this._get("REPORT_DATE") || "11TH DECEMBER 2025."; },
    get NEXT_TERM_BEGINS() { return this._get("NEXT_TERM_BEGINS") || "6TH JANUARY 2026."; },
    get SCHOOL_BREAKS() { return this._get("SCHOOL_BREAKS") || "11TH DECEMBER 2025"; },
    get SCHOOL_RESUMES() { return this._get("SCHOOL_RESUMES") || "6TH JANUARY 2026"; },

    // --- AUTOMATED RESOURCES ---
    get DESTINATION_FOLDER_ID() { return FolderManager.getAutoReportFolderId(); },

    // --- SECURE WHATSAPP CONFIGS ---
    get WHATSAPP_ACCESS_TOKEN() { return this._get("WHATSAPP_TOKEN") || ""; },
    get WHATSAPP_PHONE_ID() { return this._get("WHATSAPP_PHONE_ID") || ""; },
    get WHATSAPP_TEMPLATE_NAME() { return this._get("WHATSAPP_TEMPLATE_NAME") || "student_report_pdf"; },
    /** Must match the approved template language in Meta (often en_US or en_GB). */
    get WHATSAPP_TEMPLATE_LANGUAGE() { return this._get("WHATSAPP_TEMPLATE_LANGUAGE") || "en"; },

    /**
     * 🟢 SMART DISCOVERY HELPER
     * Finds column index by Name. Defaults to fallbackIndex if not found.
     */
    getColByName: function(sheetName, headerName, fallbackIndex) {
        const cacheKey = `COL_${sheetName}_${headerName}`;
        if (this._cache[cacheKey]) return this._cache[cacheKey];

        try {
            const ss = SpreadsheetApp.getActiveSpreadsheet();
            const sheet = ss.getSheetByName(sheetName);
            if (!sheet) return fallbackIndex;

            // Detect Header Row based on sheet type
            const headerRow = this.HEADER_ROW;
            
            const lastCol = sheet.getLastColumn();
            // getRange(row, column, numRows, numColumns). 1 row, lastCol columns.
            const headers = sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0];
            
            // Normalize for matching
            const target = headerName.toUpperCase().trim();
            // We use 'includes' for safer partial matching (e.g., "TERM ONE STUDENT NAME" matches "STUDENT NAME")
            const index = headers.findIndex(h => String(h).toUpperCase().includes(target));

            const result = (index !== -1) ? index + 1 : fallbackIndex;
            this._cache[cacheKey] = result;
            return result;
        } catch (e) {
            console.warn(`Column discovery failed for ${headerName}. Using fallback ${fallbackIndex}.`);
            return fallbackIndex;
        }
    },

    // 🟢 DYNAMIC GETTERS (Aligned to your CONTACT LIST structure)
    // Structure: Name (A), Contact (B), Email (C), PDF ID (D), Status (E)
    get COL_NAME() { return this.getColByName(this.CONTACT_SHEET_NAME, "STUDENT NAME", 1); },
    get COL_PHONE() { return this.getColByName(this.CONTACT_SHEET_NAME, "CONTACT", 2); },
    get COL_EMAIL() { return this.getColByName(this.CONTACT_SHEET_NAME, "EMAILS", 3); },
    get COL_PDF_ID() { return this.getColByName(this.CONTACT_SHEET_NAME, "PDF ID", 4); },
    get COL_WHATSAPP_STATUS() { return this.getColByName(this.CONTACT_SHEET_NAME, "WHATSAP", 5); }, 
    get COL_EMAIL_STATUS() { return this.getColByName(this.CONTACT_SHEET_NAME, "EMAIL STATUS", 6); },

    // 🟢 REPORT DATA COLUMN INDICES (0-based for array access)
    // Based on YEAR 5A - REPORT DATA.csv structure
    // Headers: INDEX,STUDENT ID,STUDENT NAME,ENG CW 20,...,CLASS TEACHER'S NAME
    REPORT_COLUMNS: {
        INDEX: 0,
        STUDENT_ID: 1,
        STUDENT_NAME: 2,
        // Music columns (no CW/MT/EOT breakdown)
        MUSIC_TOTAL: 52,      // MUSIC EOT 100
        MUSIC_GRADE: 53,
        MUSIC_REMARK: 54,     // MUSIC COMMENT
        MUSIC_AVG: 55,
        // Summary columns
        RAW_SCORE: 56,
        AVG_MARK: 57,         // AVERAGE SCORE
        AVG_GRADE: 58,
        BEST_MARK: 59,
        BEST_GRADE: 60,
        WORST_MARK: 61,       // LEAST MARK
        WORST_GRADE: 62,      // LEAST GRADE
        ATTENDANCE: 63,
        RANK: 64,
        GENERAL_REMARK: 65,   // CLASS TEACHER'S COMMENT
        PE_REMARK: 66,        // PE COMMENT
        CLUB_REMARK: 67,      // CLUB COMMENT
        TEACHER_NAME: 68      // CLASS TEACHER'S NAME
    },
    
    // 🟢 SUBJECT CONFIGURATIONS FOR END OF TERM REPORT
    // Maps subject names to template row and REPORT DATA starting column
    // Each subject block: CW 20, MT 20, EOT 60, EOT 100, GRADE, COMMENT, AVE (7 cols)
    // Template mapping: B=CW, C=MT, E=EOT60, F=Total, G=Ave, H=Grade, I=Comment
    SUBJECT_CONFIG: {
        "English":         { row: 10, startIdx: 3 },   // Cols D-J in sheet
        "Mathematics":     { row: 11, startIdx: 10 },  // Cols K-Q
        "Science":         { row: 12, startIdx: 31 },  // Cols AF-AL
        "Bible Knowledge": { row: 13, startIdx: 38 },  // Cols AM-AS
        "French":          { row: 14, startIdx: 17 },  // Cols R-X
        "Humanities":      { row: 15, startIdx: 45 },  // Cols AT-AZ
        "Computing":       { row: 16, startIdx: 24 }   // Cols Y-AE (ICT in sheet)
    },
    
    // 🟢 MIDTERM DATA COLUMN INDICES (0-based)
    // Simpler structure: No CW/MT/EOT breakdown, just total score
    // Headers: INDEX NUMBER,INDEX NUMBER,NAME,ENG 100,ENG GRADE,ENG COMMENT,ENG AVE,...
    MIDTERM_COLUMNS: {
        INDEX: 0,
        STUDENT_ID: 1,
        STUDENT_NAME: 2,
        // Summary columns at end
        RAW_SCORE: 31,
        AVG_MARK: 32,
        AVG_GRADE: 33,
        BEST_MARK: 34,
        BEST_GRADE: 35,
        WORST_MARK: 36,
        WORST_GRADE: 37,
        GENERAL_REMARK: 38
    },
    
    // 🟢 MIDTERM SUBJECT CONFIG
    // Each subject block: 100, GRADE, COMMENT, AVE (4 cols)
    MIDTERM_SUBJECT_CONFIG: {
        "English":         { row: 10, startIdx: 3 },
        "Mathematics":     { row: 11, startIdx: 7 },
        "Science":         { row: 12, startIdx: 15 },
        "Bible Knowledge": { row: 13, startIdx: 27 },
        "French":          { row: 14, startIdx: 11 },
        "Humanities":      { row: 15, startIdx: 23 },
        "Computing":       { row: 16, startIdx: 19 }
    },
    
    /**
     * Helper to normalize student names for matching
     */
    normalizeName: function(name) {
        if (!name) return "";
        return String(name).trim().toLowerCase().replace(/\s+/g, ' ');
    },

    extractFirstName: function(fullName) {
        if (!fullName) return "Student";
        
        const format = this._get("NAME_FORMAT") || "LAST_FIRST";
        const nameStr = fullName.toString().trim();
        
        // Comma separation implies LAST_FIRST format (e.g., "Abrahams, Jeslyn")
        if (nameStr.indexOf(",") !== -1) {
            const parts = nameStr.split(",");
            return parts[1].trim().split(/\s+/)[0];
        }
        
        const parts = nameStr.split(/\s+/);
        if (parts.length <= 1) return parts[0];
        
        if (format === "FIRST_LAST") {
            return parts[0];
        } else {
            // LAST_FIRST format with compound surname prefixes
            const compoundPrefixes = ["de", "di", "da", "del", "du", "la", "le", "van", "von", "der", "den", "dos", "el"];
            let surnameWords = 1;
            
            if (compoundPrefixes.indexOf(parts[0].toLowerCase()) !== -1) {
                surnameWords++;
                if (parts.length > 2 && compoundPrefixes.indexOf(parts[1].toLowerCase()) !== -1) {
                    surnameWords++;
                }
            }
            
            if (parts.length > surnameWords) {
                return parts[surnameWords];
            }
            return parts[0];
        }
    }
};

const Config = DynamicConfig;