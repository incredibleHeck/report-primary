// ==========================================
// HECKTECK DynamicConfig.ts (Cleaned & Optimized)
// ==========================================

const DynamicConfig = {
    // 1. LAZY LOADING CACHE (Prevents Quota Errors)
    _cache: {},
    
    _get: function(key) {
        if (this._cache[key]) return this._cache[key];
        const val = PropertiesService.getScriptProperties().getProperty(key);
        this._cache[key] = val; // Store for this execution
        return val;
    },

    // --- AI & CORE ---
    get API_KEY() { return this._get("GEMINI_API_KEY") || ""; },
    get MODEL_NAME() { return this._get("GEMINI_MODEL_NAME") || "gemini-2.0-flash"; },
    
    // --- SHEET NAMES ---
    get CLASSLIST_SHEET_NAME() { return "CLASSLIST"; },
    get REPORT_SHEET_NAME() { return "PRIMARY EOT 1 REPORT"; },
    get CONTACT_SHEET_NAME() { return "CONTACT LIST"; },
    
    // --- ARCHITECTURE ---
    // Note: Reports have headers on Row 2. Contact List usually has headers on Row 1.
    get HEADER_ROW() { return 2; },     
    get DATA_START_ROW() { return 3; }, 

    // --- AUTOMATED RESOURCES ---
    // 🗑️ REMOVED: get TEMPLATE_ID() (We use the Sheet Tab now, not a Google Doc)
    get DESTINATION_FOLDER_ID() { return FolderManager.getAutoReportFolderId(); },

    // --- SECURE WHATSAPP CONFIGS ---
    get WHATSAPP_ACCESS_TOKEN() { return this._get("WHATSAPP_TOKEN") || ""; },
    get WHATSAPP_PHONE_ID() { return this._get("WHATSAPP_PHONE_ID") || ""; },
    get WHATSAPP_TEMPLATE_NAME() { return this._get("WHATSAPP_TEMPLATE_NAME") || "student_report_pdf"; },

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
            const headerRow = (sheetName === "CONTACT LIST") ? 1 : this.HEADER_ROW;
            
            const lastCol = sheet.getLastColumn();
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
    get COL_EMAIL_STATUS() { return this.getColByName(this.CONTACT_SHEET_NAME, "EMAIL STATUS", 6); }
};

const Config = DynamicConfig;