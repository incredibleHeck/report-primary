// ==========================================
// HECTECH GenderNormalizer.js
// ==========================================

const GenderNormalizer = {
    normalize: function (gender) {
        if (!gender) return "";
        const normalized = gender.toString().trim().toUpperCase();
        if (normalized.startsWith("M")) return "Male";
        if (normalized.startsWith("F")) return "Female";
        return "Unknown";
    },

    /**
     * NOW CACHED: Only reads the spreadsheet once every 20 minutes.
     * Drastically speeds up batch processing.
     */
    _cacheKey: function() {
        return "GENDER_MAP_" + SpreadsheetApp.getActiveSpreadsheet().getId();
    },

    buildGenderMap: function () {
        const cache = CacheService.getUserCache();
        const cacheKey = this._cacheKey();
        const cachedJson = cache.get(cacheKey);

        if (cachedJson) {
            return JSON.parse(cachedJson);
        }

        // 2. CONFIG SOURCE OF TRUTH
        const sheetName = Config.CLASSLIST_SHEET_NAME;
        const classlistSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

        if (!classlistSheet) {
            throw new Error(`❌ Critical Error: Classlist Sheet "${sheetName}" not found. Check Setup.`);
        }

        const genderMap = this.scrapeSheet(classlistSheet);

        // 3. Save to Cache for 20 minutes (1200 seconds)
        try {
            cache.put(cacheKey, JSON.stringify(genderMap), 1200);
        } catch (e) {
            console.warn("Gender Map too large for cache, skipping cache step.");
        }

        return genderMap;
    },

    /**
     * Helper to keep the logic clean
     */
    scrapeSheet: function(sheet) {
        const classlistData = sheet.getDataRange().getValues();
        const genderMap = {};

        // 🟢 ALIGNMENT RULE: 
        // Classlist headers are always Row 1. Data starts Row 2 (Index 1).
        const START_ROW_INDEX = 1; 
        
        // 🟢 CONFIG SOURCE OF TRUTH
        // Convert 1-based column numbers (from Config) to 0-based array indices
        const nameColIdx = Config.CLASSLIST_NAME_COL - 1; 
        const genderColIdx = Config.CLASSLIST_GENDER_COL - 1; 

        for (let i = START_ROW_INDEX; i < classlistData.length; i++) {
            const row = classlistData[i];
            
            // Boundary check
            if (!row || row.length <= Math.max(nameColIdx, genderColIdx)) continue;

            const name = row[nameColIdx];
            const gender = row[genderColIdx];

            if (name) {
                // 🟢 FUZZY KEY GENERATION (Alphanumeric Only)
                // This ensures "Doe, John" matches "Doe John"
                const key = this.getMatchKey(name);
                genderMap[key] = this.normalize(gender);
            }
        }
        return genderMap;
    },
    
    /**
     * Generates a strict matching key (lowercase, no spaces, no punctuation)
     */
    getMatchKey: function(name) {
        return String(name).toLowerCase().replace(/[^a-z0-9]/g, "");
    },

    /**
     * Force refresh if user changes the Classlist
     */
    clearCache: function() {
        CacheService.getUserCache().remove(this._cacheKey());
    }
};