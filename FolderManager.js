// ==========================================
// HECTECH FolderManager.js
// ==========================================

const FolderManager = {
    /**
     * Finds or Creates the destination folder automatically.
     * Uses ScriptProperties to remember the folder ID.
     * Falls back to Drive REST API if DriveApp fails.
     */
    getAutoReportFolderId: function(clientToken) {
        if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG("getAutoReportFolderId: start");
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const ssId = ss.getId();
        
        // 1. CHECK SCRIPT PROPERTIES (persistent across sessions)
        const props = PropertiesService.getScriptProperties();
        const propKey = `REPORT_FOLDER_${ssId}`;
        const savedId = props.getProperty(propKey);
        if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG("getAutoReportFolderId: savedId=" + savedId);
        
        if (savedId) {
            try {
                // If DriveApp is completely broken, this check might fail even if the folder is fine.
                // We'll wrap it in a try/catch but not delete the property if it's a 500 error.
                DriveApp.getFolderById(savedId);
                if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG("getAutoReportFolderId: saved folder OK via DriveApp");
                return savedId;
            } catch (e) {
                if (e.message && e.message.includes("server error")) {
                    if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG("getAutoReportFolderId: DriveApp server error on verify, trusting savedId anyway");
                    return savedId;
                }
                if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG("getAutoReportFolderId: saved folder gone, error: " + e.message);
                props.deleteProperty(propKey);
            }
        }

        // 2. CHECK USER CACHE
        const cache = CacheService.getUserCache();
        const cacheKey = `HECTECH_FOLDER_${ssId}`; 
        const cachedId = cache.get(cacheKey);

        if (cachedId) {
            try {
                DriveApp.getFolderById(cachedId); 
                props.setProperty(propKey, cachedId);
                return cachedId;
            } catch (e) {
                if (e.message && e.message.includes("server error")) {
                    props.setProperty(propKey, cachedId);
                    return cachedId;
                }
                cache.remove(cacheKey);
            }
        }

        // 3. BUILD FOLDER NAME — spreadsheet title only. We no longer append a guessed
        //    "TERM X YYYY - REPORTS" suffix: term was inferred from REPORT_SHEET_NAME (e.g.
        //    "REPORT DATA"), which does not reflect the real term and often defaulted to TERM 1,
        //    while many file names already include TERM … and REPORTS (duplicate / wrong names).
        const fileName = ss.getName().trim();
        const titleImpliesReports = /\breports?\b/i.test(fileName);
        const targetFolderName = titleImpliesReports ? fileName : `${fileName} - REPORTS`;
        if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG("getAutoReportFolderId: creating: " + targetFolderName);

        // 4. TRY DriveApp FIRST, FALL BACK TO REST API
        let folderId;
        try {
            if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG("getAutoReportFolderId: trying DriveApp.createFolder");
            const newFolder = DriveApp.createFolder(targetFolderName);
            folderId = newFolder.getId();
            if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG("getAutoReportFolderId: DriveApp created " + folderId);
        } catch (driveErr) {
            if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG("getAutoReportFolderId: DriveApp failed: " + driveErr.message);
            if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG("getAutoReportFolderId: trying REST API");
            folderId = this._createFolderViaREST(targetFolderName, clientToken);
            if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG("getAutoReportFolderId: REST API created " + folderId);
        }

        // 5. PERSIST
        props.setProperty(propKey, folderId);
        cache.put(cacheKey, folderId, 1200);

        return folderId;
    },

    /**
     * Creates a folder using the Drive REST API v3 via UrlFetchApp.
     * This bypasses DriveApp entirely and works when DriveApp has server errors.
     */
    _createFolderViaREST: function(folderName, clientToken) {
        // Use the client token if provided, otherwise fallback
        const token = clientToken || ScriptApp.getOAuthToken();
        const url = "https://www.googleapis.com/drive/v3/files";
        const payload = {
            name: folderName,
            mimeType: "application/vnd.google-apps.folder"
        };
        const options = {
            method: "post",
            contentType: "application/json",
            headers: { "Authorization": "Bearer " + token },
            payload: JSON.stringify(payload),
            muteHttpExceptions: true
        };
        
        const response = UrlFetchApp.fetch(url, options);
        const code = response.getResponseCode();
        
        if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG("_createFolderViaREST: response code=" + code);
        
        if (code !== 200) {
            const errBody = response.getContentText();
            if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG("_createFolderViaREST: error=" + errBody.substring(0, 300));
            throw new Error("Failed to create report folder. Response: " + code);
        }
        
        const result = JSON.parse(response.getContentText());
        return result.id;
    },

    /**
     * Resets cache and saved folder ID for the CURRENT sheet
     */
    resetCache: function() {
        const ssId = SpreadsheetApp.getActiveSpreadsheet().getId();
        CacheService.getUserCache().remove(`HECTECH_FOLDER_${ssId}`);
        PropertiesService.getScriptProperties().deleteProperty(`REPORT_FOLDER_${ssId}`);
    }
};
