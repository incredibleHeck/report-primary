// ==========================================
// HECTECH FolderManager.js (Production Ready)
// ==========================================

const FolderManager = {
    
    // 🟢 L1 RUNTIME CACHE: Retains the resolved folder ID within the active thread to eliminate redundant API calls
    _runtimeFolderId: null,

    /**
     * Finds or Creates the destination folder automatically next to the template sheet.
     * Uses persistent Property Maps and Document Caches for high-speed multi-user routing.
     */
    getAutoReportFolderId: function(clientToken) {
        if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG("getAutoReportFolderId: start");
        
        // 1. Check high-speed L1 Runtime Memory Cache first
        if (this._runtimeFolderId) {
            if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG("getAutoReportFolderId: resolved instantly via L1 Runtime cache");
            return this._runtimeFolderId;
        }

        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const ssId = ss.getId();
        const propKey = `REPORT_FOLDER_${ssId}`;
        
        const docProps = PropertiesService.getDocumentProperties();
        const scriptProps = PropertiesService.getScriptProperties();
        
        // 2. CHECK DOCUMENT & SCRIPT PERSISTENCE
        let savedId = docProps.getProperty(propKey) || scriptProps.getProperty(propKey);
        if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG("getAutoReportFolderId: savedId=" + savedId);
        
        if (savedId) {
            try {
                // Perform quick external verification check once per transaction batch
                const folder = DriveApp.getFolderById(savedId);
                if (!folder.isTrashed()) {
                    this._runtimeFolderId = savedId; // Secure the L1 memory lock
                    return savedId;
                }
                throw new Error("Target folder detected in trash bin.");
            } catch (e) {
                if (e.message && e.message.includes("server error")) {
                    if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG("getAutoReportFolderId: DriveApp server error on verify, fallback tracking active");
                    this._runtimeFolderId = savedId;
                    return savedId;
                }
                if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG("getAutoReportFolderId: saved folder stale, scrubbing registers: " + e.message);
                docProps.deleteProperty(propKey);
                scriptProps.deleteProperty(propKey);
            }
        }

        // 3. CHECK L2 SHARED DOCUMENT CACHE (Collaborative Department Protection)
        const cache = CacheService.getDocumentCache();
        const cacheKey = `HECTECH_FOLDER_${ssId}`; 
        const cachedId = cache.get(cacheKey);

        if (cachedId) {
            try {
                const folder = DriveApp.getFolderById(cachedId); 
                if (!folder.isTrashed()) {
                    docProps.setProperty(propKey, cachedId);
                    this._runtimeFolderId = cachedId;
                    return cachedId;
                }
            } catch (e) {
                if (e.message && e.message.includes("server error")) {
                    docProps.setProperty(propKey, cachedId);
                    this._runtimeFolderId = cachedId;
                    return cachedId;
                }
                cache.remove(cacheKey);
            }
        }

        // 4. PARSE LOGCIALLY SYNCED FOLDER TEXT TITLE
        const fileName = ss.getName().trim();
        const titleImpliesReports = /\breports?\b/i.test(fileName);
        const targetFolderName = titleImpliesReports ? fileName : `${fileName} - REPORTS`;
        
        // Resolve Spreadsheet Parent Directory to prevent root folder pollution
        let parentFolderId = null;
        try {
            const files = DriveApp.getFileById(ssId).getParents();
            if (files.hasNext()) {
                parentFolderId = files.next().getId();
            }
        } catch(err) {
            if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG("getAutoReportFolderId: Could not natively extract parent ID, fetching via REST");
        }

        // 5. ATTEMPT DUAL-PIPELINE CREATION (DriveApp -> REST API Fallback)
        let folderId = null;
        const token = clientToken || ScriptApp.getOAuthToken();

        try {
            if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG("getAutoReportFolderId: Executing native directory compilation path");
            
            let targetParent = parentFolderId ? DriveApp.getFolderById(parentFolderId) : DriveApp.getRootFolder();
            const newFolder = targetParent.createFolder(targetFolderName);
            folderId = newFolder.getId();
        } catch (driveErr) {
            if (typeof DEBUG_LOG !== 'undefined') DEBUG_LOG("getAutoReportFolderId: Native creation dropped out: " + driveErr.message + " -> Transitioning to REST REST API");
            
            // If DriveApp is totally bricked, manually discover parent container via REST API
            if (!parentFolderId) {
                parentFolderId = this._getParentIdViaREST(ssId, token);
            }
            folderId = this._createFolderViaREST(targetFolderName, parentFolderId, token);
        }

        // 6. SYNC CACHING STRATEGIES
        if (folderId) {
            docProps.setProperty(propKey, folderId);
            cache.put(cacheKey, folderId, 1200);
            this._runtimeFolderId = folderId; // Enforce local L1 safety block
            return folderId;
        }
        
        throw new Error("Failed to resolve or construct a valid report output channel.");
    },

    /**
     * Discovers parent structural location of spreadsheet template using Drive API v3
     */
    _getParentIdViaREST: function(fileId, token) {
        const url = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents`;
        const options = {
            method: "get",
            headers: { "Authorization": "Bearer " + token },
            muteHttpExceptions: true
        };
        try {
            const response = UrlFetchApp.fetch(url, options);
            if (response.getResponseCode() === 200) {
                const meta = JSON.parse(response.getContentText());
                if (meta && meta.parents && meta.parents.length > 0) return meta.parents[0];
            }
        } catch(e) {}
        return null; // Fallback handles root cleanly if completely locked
    },

    /**
     * Creates a folder cleanly nested within its correct parent directory via Drive REST API v3
     */
    _createFolderViaREST: function(folderName, parentId, token) {
        const url = "https://www.googleapis.com/drive/v3/files";
        const payload = {
            name: folderName,
            mimeType: "application/vnd.google-apps.folder"
        };
        
        // Nest directory route safely if parent location context is available
        if (parentId) {
            payload.parents = [parentId];
        }

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
            throw new Error("Drive REST API Folder Generation Interrupted. Http Status: " + code);
        }
        
        const result = JSON.parse(response.getContentText());
        return result.id;
    },

    /**
     * Flushes L1 runtime cache, shared document properties, and session mappings cleanly
     */
    resetCache: function() {
        this._runtimeFolderId = null;
        const ssId = SpreadsheetApp.getActiveSpreadsheet().getId();
        
        const docCache = CacheService.getDocumentCache();
        if (docCache) docCache.remove(`HECTECH_FOLDER_${ssId}`);
        
        PropertiesService.getDocumentProperties().deleteProperty(`REPORT_FOLDER_${ssId}`);
        PropertiesService.getScriptProperties().deleteProperty(`REPORT_FOLDER_${ssId}`);
    }
};
