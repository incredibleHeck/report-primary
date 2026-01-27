// ==========================================
// HECKTECK FolderManager.ts (Hardened Architecture)
// ==========================================

const FolderManager = {
    /**
     * Finds or Creates the destination folder automatically.
     * Naming Convention: "{Sheet Name} - {Term} {Year} - REPORTS"
     * Location: Root Directory (My Drive) for easy access.
     */
    getAutoReportFolderId: function() {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const ssId = ss.getId();
        
        // 1. UNIQUE CACHE KEY (Prevents cross-sheet collisions)
        const cache = CacheService.getUserCache();
        const cacheKey = `HECKTECK_FOLDER_${ssId}`; 
        const cachedId = cache.get(cacheKey);

        if (cachedId) {
            // Safety Check: Ensure the cached folder actually still exists
            try {
                DriveApp.getFolderById(cachedId); 
                return cachedId;
            } catch (e) {
                console.warn("Cached folder missing. Re-creating.");
                cache.remove(cacheKey);
            }
        }

        // 2. SMART NAMING (Adds Year)
        const fileName = ss.getName(); 
        const currentYear = new Date().getFullYear(); 
        
        // Term Logic: Use global Config
        // Fallback to "REPORT" if Config is missing (for safety)
        const rptSheetName = (typeof Config !== 'undefined') 
            ? Config.REPORT_SHEET_NAME.toUpperCase() 
            : "REPORT";
            
        let term = "TERM 1";
        if (rptSheetName.includes("2") || rptSheetName.includes("TWO") || rptSheetName.includes("SECOND")) term = "TERM 2";
        else if (rptSheetName.includes("3") || rptSheetName.includes("THREE") || rptSheetName.includes("THIRD")) term = "TERM 3";

        // Name Example: "Class 4 - TERM 1 2026 - REPORTS"
        const targetFolderName = `${fileName} - ${term} ${currentYear} - REPORTS`;

        // 3. ROOT SEARCH OR CREATE
        let folderId;
        
        // DriveApp.getFoldersByName searches the whole drive.
        const folders = DriveApp.getFoldersByName(targetFolderName);
        
        if (folders.hasNext()) {
            folderId = folders.next().getId();
            console.log(`📂 Found existing folder: ${targetFolderName}`);
        } else {
            // DriveApp.createFolder() creates it in "My Drive" (Root) by default.
            const newFolder = DriveApp.createFolder(targetFolderName);
            folderId = newFolder.getId();
            console.log(`📂 Created new Root folder: ${targetFolderName}`);
        }

        // 4. SAVE TO CACHE (20 Minutes)
        cache.put(cacheKey, folderId, 1200);

        return folderId;
    },

    /**
     * Resets cache for the CURRENT sheet only
     */
    resetCache: function() {
        const ssId = SpreadsheetApp.getActiveSpreadsheet().getId();
        CacheService.getUserCache().remove(`HECKTECK_FOLDER_${ssId}`);
    }
};