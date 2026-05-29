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
    get MODEL_NAME() { return this._get("GEMINI_MODEL_NAME") || "gemini-3.5-flash"; },
    
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
    get PROGRAMME_NAME() { return this._get("PROGRAMME_NAME") || "PRIMARY"; },
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
    get REPORT_COLUMNS() {
        if (this._reportCols) return this._reportCols;
        try {
            const ss = SpreadsheetApp.getActiveSpreadsheet();
            const sheet = ss.getSheetByName(this.REPORT_SHEET_NAME);
            const headers = sheet.getRange(this.HEADER_ROW, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim().toUpperCase());
            
            const getCol = (nameList, defaultIdx) => {
                for (const name of nameList) {
                    const idx = headers.findIndex(h => h.includes(name));
                    if (idx !== -1) return idx;
                }
                return defaultIdx;
            };
            
            this._reportCols = {
                INDEX: getCol(["INDEX"], 0),
                STUDENT_ID: getCol(["STUDENT ID", "ID"], 1),
                STUDENT_NAME: getCol(["STUDENT NAME", "NAME"], 2),
                MUSIC_TOTAL: getCol(["MUSIC EOT 100", "MUSIC TOTAL", "MUSIC EOT"], 52),
                MUSIC_GRADE: getCol(["MUSIC GRADE"], 53),
                MUSIC_REMARK: getCol(["MUSIC COMMENT", "MUSIC REMARK"], 54),
                MUSIC_AVG: getCol(["MUSIC AVE", "MUSIC AVG", "MUSIC AVERAGE"], 55),
                RAW_SCORE: getCol(["RAW SCORE"], 56),
                AVG_MARK: getCol(["AVERAGE SCORE", "AVG SCORE", "AVE SCORE"], 57),
                AVG_GRADE: getCol(["AVE GRADE", "AVG GRADE"], 58),
                BEST_MARK: getCol(["BEST MARK", "MAX MARK"], 59),
                BEST_GRADE: getCol(["BEST GRADE"], 60),
                WORST_MARK: getCol(["LEAST MARK", "MIN MARK"], 61),
                WORST_GRADE: getCol(["LEAST GRADE", "MIN GRADE"], 62),
                ATTENDANCE: getCol(["ATTENDANCE"], 63),
                RANK: getCol(["RANK", "POSITION"], 64),
                GENERAL_REMARK: getCol(["CLASS TEACHER'S COMMENT", "CLASS TEACHER’S COMMENT", "GENERAL COMMENT", "TEACHER COMMENT"], 65),
                PE_REMARK: getCol(["PE COMMENT", "PHYSICAL EDUCATION COMMENT"], 66),
                CLUB_REMARK: getCol(["CLUB COMMENT"], 67),
                TEACHER_NAME: getCol(["CLASS TEACHER’S NAME", "CLASS TEACHER'S NAME", "TEACHER NAME"], 68)
            };
            return this._reportCols;
        } catch (e) {
            console.error("Failed to build REPORT_COLUMNS dynamically:", e);
            return {};
        }
    },
    
    // 🟢 SUBJECT CONFIGURATIONS FOR END OF TERM REPORT
    get SUBJECT_CONFIG() {
        if (this._subConfig) return this._subConfig;
        try {
            const ss = SpreadsheetApp.getActiveSpreadsheet();
            const dataSheet = ss.getSheetByName(this.REPORT_SHEET_NAME);
            const templateSheet = ss.getSheetByName(this.TEMPLATE_SHEET_NAME);
            
            const headers = dataSheet.getRange(this.HEADER_ROW, 1, 1, dataSheet.getLastColumn()).getValues()[0].map(h => String(h).trim().toUpperCase());
            const templateRows = templateSheet.getRange(1, 1, templateSheet.getLastRow(), 1).getValues().map(row => String(row[0]).trim());
            
            const SUBJECT_MAP = {
                "ENGLISH": "ENG", "MATHEMATICS": "MATH", "SCIENCE": "SCI", "BIBLE KNOWLEDGE": "BK",
                "FRENCH": "FRE", "HUMANITIES": "HUM.", "COMPUTING": "ICT", "GEOGRAPHY": "GEO",
                "BIOLOGY": "BIO", "HISTORY": "HIST", "LITERATURE": "LIT", "CHEMISTRY": "CHEM",
                "PHYSICS": "PHY", "MUSIC": "MUSIC", "ARTS": "ART", "ART": "ART"
            };
            
            let subjectStart = templateRows.findIndex(s => s.toUpperCase() === "SUBJECT");
            if (subjectStart === -1) subjectStart = 8;
            
            const config = {};
            for (let i = subjectStart + 1; i < templateRows.length; i++) {
                const subName = templateRows[i];
                if (!subName || subName === "GRADING SYSTEM" || subName.startsWith("90 –") || subName === "PERFORMANCE ANALYSIS") break;
                
                const upperName = subName.toUpperCase();
                if (upperName === "PHYSICAL EDUCATION" || upperName === "CLUB" || upperName === "MUSIC" || upperName === "ART" || upperName === "ARTS") continue; // Handled as practical/non-scoring
                
                let abbr = SUBJECT_MAP[upperName];
                if (!abbr) abbr = upperName.substring(0, 3);
                
                const startIdx = headers.findIndex(h => h.startsWith(abbr + " ") || h === abbr || h.startsWith(abbr + "_"));
                if (startIdx !== -1) {
                    config[subName] = { row: i + 1, startIdx: startIdx };
                }
            }
            this._subConfig = config;
            return config;
        } catch (e) {
            console.error("Failed to build SUBJECT_CONFIG dynamically:", e);
            return {};
        }
    },
    
    // 🟢 TEMPLATE LAYOUT (Dynamically find rows)
    get TEMPLATE_LAYOUT() {
        if (this._layout) return this._layout;
        try {
            const ss = SpreadsheetApp.getActiveSpreadsheet();
            const templateSheet = ss.getSheetByName(this.TEMPLATE_SHEET_NAME);
            const colA = templateSheet.getRange(1, 1, templateSheet.getLastRow(), 1).getValues().map(row => String(row[0]).trim().toUpperCase());
            
            const musicRow = colA.indexOf("MUSIC") + 1;
            const peRow = colA.indexOf("PHYSICAL EDUCATION") + 1;
            const clubRow = colA.indexOf("CLUB") + 1;
            
            let summaryStartRow = colA.findIndex(s => s.includes("90 –") || s === "90 - 100") + 1;
            if (summaryStartRow <= 0) summaryStartRow = 23;
            
            this._layout = {
                MUSIC_ROW: musicRow > 0 ? musicRow : -1,
                PE_ROW: peRow > 0 ? peRow : -1,
                CLUB_ROW: clubRow > 0 ? clubRow : -1,
                SUMMARY_ROW_1: summaryStartRow,
                SUMMARY_ROW_2: summaryStartRow + 1,
                GEN_REM_ROW: summaryStartRow + 3
            };
            return this._layout;
        } catch (e) {
            console.error("Failed to build TEMPLATE_LAYOUT dynamically:", e);
            return { MUSIC_ROW: 17, PE_ROW: 18, CLUB_ROW: 19, SUMMARY_ROW_1: 23, SUMMARY_ROW_2: 24, GEN_REM_ROW: 26 };
        }
    },
    
    // 🟢 MIDTERM DATA COLUMN INDICES (0-based)
    get MIDTERM_COLUMNS() {
        if (this._midtermCols) return this._midtermCols;
        try {
            const ss = SpreadsheetApp.getActiveSpreadsheet();
            const sheet = ss.getSheetByName(this.MIDTERM_SHEET_NAME);
            if (!sheet) return {}; 
            const headers = sheet.getRange(this.HEADER_ROW, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim().toUpperCase());
            
            const getCol = (nameList, defaultIdx) => {
                for (const name of nameList) {
                    const idx = headers.findIndex(h => h.includes(name));
                    if (idx !== -1) return idx;
                }
                return defaultIdx;
            };
            
            this._midtermCols = {
                INDEX: getCol(["INDEX NUMBER", "INDEX"], 0),
                STUDENT_ID: getCol(["STUDENT ID", "INDEX NUMBER", "ID"], 1),
                STUDENT_NAME: getCol(["STUDENT NAME", "NAME"], 2),
                RAW_SCORE: getCol(["RAW SCORE"], 31),
                AVG_MARK: getCol(["AVERAGE SCORE", "AVG SCORE", "AVE SCORE"], 32),
                AVG_GRADE: getCol(["AVE GRADE", "AVG GRADE"], 33),
                BEST_MARK: getCol(["BEST MARK", "MAX MARK"], 34),
                BEST_GRADE: getCol(["BEST GRADE"], 35),
                WORST_MARK: getCol(["LEAST MARK", "MIN MARK"], 36),
                WORST_GRADE: getCol(["LEAST GRADE", "MIN GRADE"], 37),
                GENERAL_REMARK: getCol(["CLASS TEACHER'S COMMENT", "CLASS TEACHER’S COMMENT", "GENERAL COMMENT"], 38)
            };
            return this._midtermCols;
        } catch (e) {
            console.error("Failed to build MIDTERM_COLUMNS dynamically:", e);
            return {};
        }
    },
    
    // 🟢 MIDTERM SUBJECT CONFIG
    get MIDTERM_SUBJECT_CONFIG() {
        if (this._midtermSubConfig) return this._midtermSubConfig;
        try {
            const ss = SpreadsheetApp.getActiveSpreadsheet();
            const dataSheet = ss.getSheetByName(this.MIDTERM_SHEET_NAME);
            const templateSheet = ss.getSheetByName(this.MIDTERM_TEMPLATE_NAME);
            if (!dataSheet || !templateSheet) return {};
            
            const headers = dataSheet.getRange(this.HEADER_ROW, 1, 1, dataSheet.getLastColumn()).getValues()[0].map(h => String(h).trim().toUpperCase());
            const templateRows = templateSheet.getRange(1, 1, templateSheet.getLastRow(), 1).getValues().map(row => String(row[0]).trim());
            
            const SUBJECT_MAP = {
                "ENGLISH": "ENG", "MATHEMATICS": "MATH", "SCIENCE": "SCI", "BIBLE KNOWLEDGE": "BK",
                "FRENCH": "FRE", "HUMANITIES": "HUM.", "COMPUTING": "ICT", "GEOGRAPHY": "GEO",
                "BIOLOGY": "BIO", "HISTORY": "HIST", "LITERATURE": "LIT", "CHEMISTRY": "CHEM",
                "PHYSICS": "PHY", "MUSIC": "MUSIC", "ARTS": "ART", "ART": "ART"
            };
            
            let subjectStart = templateRows.findIndex(s => s.toUpperCase() === "SUBJECT");
            if (subjectStart === -1) subjectStart = 8;
            
            const config = {};
            for (let i = subjectStart + 1; i < templateRows.length; i++) {
                const subName = templateRows[i];
                if (!subName || subName === "GRADING SYSTEM" || subName.startsWith("90 –") || subName.toUpperCase() === "PERFORMANCE ANALYSIS") break;
                
                const upperName = subName.toUpperCase();
                if (upperName === "PHYSICAL EDUCATION" || upperName === "CLUB" || upperName === "MUSIC" || upperName === "ART" || upperName === "ARTS") continue;
                
                let abbr = SUBJECT_MAP[upperName];
                if (!abbr) abbr = upperName.substring(0, 3);
                
                const startIdx = headers.findIndex(h => h.startsWith(abbr + " ") || h === abbr || h.startsWith(abbr + "_"));
                if (startIdx !== -1) {
                    config[subName] = { row: i + 1, startIdx: startIdx };
                }
            }
            this._midtermSubConfig = config;
            return config;
        } catch (e) {
            console.error("Failed to build MIDTERM_SUBJECT_CONFIG dynamically:", e);
            return {};
        }
    },
    
    get MIDTERM_TEMPLATE_LAYOUT() {
        if (this._midtermLayout) return this._midtermLayout;
        try {
            const ss = SpreadsheetApp.getActiveSpreadsheet();
            const templateSheet = ss.getSheetByName(this.MIDTERM_TEMPLATE_NAME);
            if (!templateSheet) return {};
            const colA = templateSheet.getRange(1, 1, templateSheet.getLastRow(), 1).getValues().map(row => String(row[0]).trim().toUpperCase());
            
            let gradingRow = colA.findIndex(s => s.includes("90 –") || s === "90 - 100") + 1;
            if (gradingRow <= 0) gradingRow = 25; 
            
            this._midtermLayout = {
                SUMMARY_ROW_1: gradingRow - 5,
                SUMMARY_ROW_2: gradingRow - 4,
                GEN_REM_ROW: gradingRow - 2
            };
            return this._midtermLayout;
        } catch(e) {
            return { SUMMARY_ROW_1: 20, SUMMARY_ROW_2: 21, GEN_REM_ROW: 23 };
        }
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