// ==========================================
// HECTECH GenderNormalizer.js (Hardened Cache)
// ==========================================

const GenderNormalizer = {
    
    // 🟢 L1 RUNTIME CACHE: Failsafe memory buffer preserves lookups instantly within the same execution thread
    _runtimeCache: null,

    normalize: function (gender) {
        if (!gender) return "Unknown";
        const normalized = gender.toString().trim().toUpperCase();
        if (normalized.startsWith("M")) return "Male";
        if (normalized.startsWith("F")) return "Female";
        return "Unknown";
    },

    _cacheKey: function() {
        return "GENDER_MAP_" + SpreadsheetApp.getActiveSpreadsheet().getId();
    },

    buildGenderMap: function () {
        // 1. Check L1 Runtime Memory Cache first (Lightning fast local processing hit)
        if (this._runtimeCache) {
            return this._runtimeCache;
        }

        // 2. Check L2 Document Cache (Shared across ALL collaborative teachers)
        const cache = CacheService.getDocumentCache();
        const cacheKey = this._cacheKey();
        const cachedJson = cache.get(cacheKey);

        if (cachedJson) {
            try {
                this._runtimeCache = JSON.parse(cachedJson);
                return this._runtimeCache;
            } catch (e) {
                console.error("Cache decoding dropped due to corruption. Re-scraping source...");
            }
        }

        // 3. CONFIG SOURCE OF TRUTH EXTRACTION
        const sheetName = (typeof Config !== 'undefined' && Config.CLASSLIST_SHEET_NAME) ? Config.CLASSLIST_SHEET_NAME : "CLASSLIST";
        const classlistSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

        if (!classlistSheet) {
            throw new Error(`❌ Critical Error: Classlist Sheet "${sheetName}" not found. Check Layout Setup.`);
        }

        const genderMap = this.scrapeSheet(classlistSheet);

        // 4. HARDENED VALUE CACHING LAYER
        this._runtimeCache = genderMap; // Populate L1 buffer instantly
        
        try {
            const payload = JSON.stringify(genderMap);
            // Enforce Google's strict 100KB limit safely (Approx 100,000 characters)
            if (payload.length < 100000) {
                cache.put(cacheKey, payload, 1200); // Cached safely for 20 minutes across the document scope
            } else {
                console.warn("Roster string size exceeds 100KB L2 cache boundary. Layering lookups to high-speed L1 Runtime Memory.");
            }
        } catch (e) {
            console.warn("L2 Caching suspended due to storage limits. Running under pure L1 protection profile.");
        }

        return genderMap;
    },

    scrapeSheet: function(sheet) {
        const classlistData = sheet.getDataRange().getValues();
        const genderMap = {};

        // 🟢 HARDENED ROW ALIGNMENT: Dynamically scales from global configuration standard row markers
        const dataStartRow = (typeof Config !== 'undefined' && Config.DATA_START_ROW) ? Config.DATA_START_ROW : 3;
        const START_ROW_INDEX = dataStartRow - 1; // Resolves Row 3 safely to array index 2, eliminating sub-header pollution
        
        if (START_ROW_INDEX < 0 || START_ROW_INDEX >= classlistData.length) return genderMap;

        // 🟢 CONFIG SOURCE OF TRUTH INDEXING
        let nameColIdx = (typeof Config !== 'undefined' && Config.CLASSLIST_NAME_COL) ? Config.CLASSLIST_NAME_COL : 2;
        let genderColIdx = (typeof Config !== 'undefined' && Config.CLASSLIST_GENDER_COL) ? Config.CLASSLIST_GENDER_COL : 5;
        
        // Convert 1-based column indicators cleanly to 0-indexed offset pointers
        nameColIdx = nameColIdx - 1;
        genderColIdx = genderColIdx - 1;

        const maxColumnBound = Math.max(nameColIdx, genderColIdx);

        for (let i = START_ROW_INDEX; i < classlistData.length; i++) {
            const row = classlistData[i];
            
            // Defend loop iterator boundaries against structural gaps or blank trailing rows
            if (!row || row.length <= maxColumnBound) continue;

            const rawName = row[nameColIdx];
            const rawGender = row[genderColIdx];

            if (rawName && String(rawName).trim() !== "") {
                // 🟢 FUZZY MATCH KEY SYNTHESIS
                const key = this.getMatchKey(rawName);
                genderMap[key] = this.normalize(rawGender);
            }
        }
        return genderMap;
    },
    
    getMatchKey: function(name) {
        return String(name).toLowerCase().replace(/[^a-z0-9]/g, "");
    },

    clearCache: function() {
        this._runtimeCache = null; // Clear runtime pointer completely
        const docCache = CacheService.getDocumentCache();
        if (docCache) docCache.remove(this._cacheKey());
    }
};