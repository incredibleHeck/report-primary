// =========================================================================
// HECTECH WhatsAppManager.js (Hardened Multi-Tenant Autopilot Core)
// =========================================================================

/** Graph API version for Media lookups and Message Template distributions */
const WHATSAPP_GRAPH_API_VERSION = 'v25.0';

const WhatsAppManager = {
    
    /**
     * Centralized Gateway entry point.
     */
    process: function() {
        this.batchSendWhatsApp();
    },

    /**
     * Orchestrates batch distribution across active campus rosters.
     * Implements background self-healing triggers to manage system execution limits.
     */
    batchSendWhatsApp: function(isContinuationTrigger) {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const ui = SpreadsheetApp.getUi();
        const startTime = new Date().getTime();

        // PRE-FLIGHT AUTH: Verify structural parameters
        const waToken = Config.WHATSAPP_ACCESS_TOKEN;
        const phoneId = Config.WHATSAPP_PHONE_ID;
        const templateName = Config.WHATSAPP_TEMPLATE_NAME;
        const templateLang = Config.WHATSAPP_TEMPLATE_LANGUAGE;

        const waChecks = [];
        if (!phoneId) waChecks.push("WHATSAPP_PHONE_ID");
        if (!waToken) waChecks.push("WHATSAPP_TOKEN");
        if (!templateName) waChecks.push("WHATSAPP_TEMPLATE_NAME");
        if (!templateLang) waChecks.push("WHATSAPP_TEMPLATE_LANGUAGE");

        if (waChecks.length > 0) {
            if (!isContinuationTrigger) {
                ui.alert("🔒 WhatsApp Security Profile Incomplete",
                    "The following variables are missing from your configuration profiles:\n\n" + waChecks.join("\n") +
                    "\n\nCalibrate these keys inside Class Settings before initiating secure distributions.",
                    ui.ButtonSet.OK);
            }
            return;
        }

        const sheet = ss.getSheetByName(Config.CONTACT_SHEET_NAME);
        if (!sheet) {
            if (!isContinuationTrigger) ui.alert("❌ Configuration Tab Omission: Contact List tab was unresolvable.");
            return;
        }

        const lastRow = sheet.getLastRow();
        const lastCol = sheet.getLastColumn();
        if (lastRow < 3) return; // Exit early if data tables are empty

        // Prompt the user for confirmation only on the initial run
        if (!isContinuationTrigger) {
            const confirm = ui.alert("🚀 Authorise WhatsApp Report Broadcast?",
                `Template: ${templateName}\nLocale: ${templateLang}\nGateway Phone ID: ${phoneId.substring(0, 8)}...*******\n\nAre you sure you want to broadcast reports to the active roster?`,
                ui.ButtonSet.YES_NO);
            if (confirm !== ui.Button.YES) return;
        }

        // Fetch grid data fields cleanly: Row 2 holds headers, data begins at Row 3
        const dataRange = sheet.getRange(3, 1, lastRow - 2, lastCol);
        const data = dataRange.getValues();

        // Map column offsets securely using zero-based indices
        const getIdx = (colNum) => colNum - 1;
        const idxName = getIdx(Config.COL_NAME);
        const idxPhone = getIdx(Config.COL_PHONE);
        const idxPdf = getIdx(Config.COL_PDF_ID);
        const idxStatus = getIdx(Config.COL_WHATSAPP_STATUS);

        // Account for outstanding items remaining inside the processing queue
        let pendingCount = 0;
        for (let j = 0; j < data.length; j++) {
            const r = data[j];
            if (r[idxPhone] && r[idxPdf] && String(r[idxStatus]).trim() !== "SENT") pendingCount++;
        }

        if (pendingCount === 0) {
            ss.toast("No outstanding items in the delivery queue.", "WhatsApp Gateway", 4);
            return;
        }

        ss.toast(`Activating distribution loops. ${pendingCount} records remaining...`, "WhatsApp Autopilot", -1);

        let successCount = 0;
        let failCount = 0;
        let processedThisRun = 0;

        for (let i = 0; i < data.length; i++) {
            // 🟢 FIXED: Check execution time limits defensively to prevent hard script drops
            const elapsed = new Date().getTime() - startTime;
            const runtimeSafetyCeiling = 230000; // 3.8-minute fallback limit gives buffers space to settle

            if (elapsed > runtimeSafetyCeiling) {
                ss.toast("Approaching runtime execution boundaries. Rescheduling background worker...", "WhatsApp Autopilot", 8);
                this.setupContinuationTrigger();
                return; // Safely yields execution threads without breaking continuity
            }

            const row = data[i];
            const name = row[idxName];
            const phoneRaw = row[idxPhone];
            const fileId = row[idxPdf];
            const status = row[idxStatus];

            // Bypass completed indexes or unpopulated data lines cleanly
            if (!phoneRaw || !fileId || String(status).trim() === "SENT") continue;

            processedThisRun++;
            const absoluteRowIndex = i + 3; // Calculate exact row coordinate
            ss.toast(`Processing delivery ${processedThisRun}/${pendingCount}: ${name}...`, "WhatsApp Engine", -1);

            const phone = String(phoneRaw).replace(/\D/g, '');
            let currentStatus = "PENDING";
            let currentBackground = null;

            try {
                // Phase A: Upload unique report file binaries to Meta's media servers
                const mediaId = this.uploadWithRetry(fileId, waToken, phoneId);

                if (mediaId) {
                    // Phase B: Dispatch structural messaging template layouts
                    this.sendWithRetry(phone, name, mediaId, waToken, phoneId, templateName, templateLang);
                    successCount++;
                    currentStatus = "SENT";
                    currentBackground = "#0A2F1D"; // Deep emerald obsidian success overlay
                } else {
                    failCount++;
                    currentStatus = "UPLOAD FAIL";
                    currentBackground = "#441015"; // Deep maroon error overlay
                }
            } catch (err) {
                console.error(`Meta communication disruption on index [${name}]: ${err.message}`);
                failCount++;
                currentStatus = `ERR: ${err.message.substring(0, 40)}`;
                currentBackground = "#441015";
            }

            // 🟢 FIXED: High-speed specific cell writes update lines directly without grid rewrites
            const rowStatusRange = sheet.getRange(absoluteRowIndex, Config.COL_WHATSAPP_STATUS, 1, 1);
            rowStatusRange.setValue(currentStatus);
            if (currentBackground) {
                rowStatusRange.setBackground(currentBackground);
            }
            
            SpreadsheetApp.flush();
            Utilities.sleep(1200); // Throttling window prevents rapid API call spikes
        }

        // Clear out remaining triggers once the active queue is exhausted
        this.clearContinuationTriggers();

        if (!isContinuationTrigger) {
            ui.alert(`📱 WhatsApp Distribution Complete\n\nBatch Run Summary:\n- Reports Sent: ${successCount}\n- Fault Exceptions: ${failCount}`);
        } else {
            ss.toast(`📱 WhatsApp background batch complete. Sent: ${successCount}, Failed: ${failCount}`, "WhatsApp Autopilot", -1);
        }
    },

    /**
     * Ingests files via exponential backoff.
     */
    uploadWithRetry: function(fileId, token, phoneId, attempt) {
        if (!attempt) attempt = 1;
        try {
            return this.uploadPdfToMeta(fileId, token, phoneId);
        } catch (e) {
            if (attempt <= 3) {
                const delay = Math.pow(2, attempt) * 1000;
                console.warn(`Media ingestion error (attempt ${attempt}/3). Retrying in ${delay}ms... Details: ${e.message}`);
                Utilities.sleep(delay);
                return this.uploadWithRetry(fileId, token, phoneId, attempt + 1);
            }
            throw e;
        }
    },

    uploadPdfToMeta: function(fileId, token, phoneId) {
        const file = DriveApp.getFileById(fileId);
        const url = `https://graph.facebook.com/${WHATSAPP_GRAPH_API_VERSION}/${phoneId}/media`;
        
        const options = {
            "method": "post",
            "headers": { "Authorization": `Bearer ${token}` },
            "payload": { 
                "messaging_product": "whatsapp", 
                "file": file.getBlob() 
            },
            "muteHttpExceptions": true
        };

        const res = UrlFetchApp.fetch(url, options);
        const resCode = res.getResponseCode();
        const json = JSON.parse(res.getContentText());

        if (resCode !== 200 && resCode !== 201) {
            const msg = json.error ? json.error.message : "Media pipeline handshake error.";
            throw new Error(`Media Ingestion Reject [HTTP ${resCode}]: ${msg}`);
        }
        return json.id;
    },

    /**
     * Dispatches messaging template layouts via backoff tracking logic.
     */
    sendWithRetry: function(phone, studentName, mediaId, token, phoneId, templateName, templateLang, attempt) {
        if (!attempt) attempt = 1;
        try {
            return this.sendTemplateMessage(phone, studentName, mediaId, token, phoneId, templateName, templateLang);
        } catch (e) {
            if (attempt <= 3) {
                const delay = Math.pow(2, attempt) * 1000;
                console.warn(`Template send error (attempt ${attempt}/3). Retrying in ${delay}ms... Details: ${e.message}`);
                Utilities.sleep(delay);
                return this.sendWithRetry(phone, studentName, mediaId, token, phoneId, templateName, templateLang, attempt + 1);
            }
            throw e;
        }
    },

    sendTemplateMessage: function(phone, studentName, mediaId, token, phoneId, templateName, templateLang) {
        const url = `https://graph.facebook.com/${WHATSAPP_GRAPH_API_VERSION}/${phoneId}/messages`;
        
        const payload = {
            "messaging_product": "whatsapp",
            "to": phone,
            "type": "template",
            "template": {
                "name": templateName,
                "language": { "code": templateLang },
                "components": [
                    {
                        "type": "header",
                        "parameters": [{ 
                            "type": "document", 
                            "document": { "id": mediaId, "filename": `${studentName} Terminal Report.pdf` } 
                        }]
                    },
                    {
                        "type": "body",
                        "parameters": [
                            { 
                                "type": "text", 
                                "parameter_name": "student_name", 
                                "text": studentName 
                            }
                        ]
                    }
                ]
            }
        };

        const options = {
            "method": "post",
            "headers": { 
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json" 
            },
            "payload": JSON.stringify(payload),
            "muteHttpExceptions": true
        };

        const response = UrlFetchApp.fetch(url, options);
        const resCode = response.getResponseCode();
        const json = JSON.parse(response.getContentText());
        
        if (resCode !== 200 && resCode !== 201) {
            const err = json.error;
            let errorMsg = err ? err.message : "Unknown API Exception";
            const sub = err && err.error_subcode;
            if (sub === 132001 || /132001|translation/i.test(String(errorMsg))) {
                errorMsg += " -> Configuration Mismatch: Verify that template string names and locales exist on your active Meta Developer number.";
            }
            throw new Error(`[HTTP ${resCode}]: ${errorMsg}`);
        }
        return true;
    },

    // --- AUTOPILOT CONCURRENCY WORKER TRIGGERS ---
    setupContinuationTrigger: function() {
        this.clearContinuationTriggers();
        ScriptApp.newTrigger('runWhatsAppBlaster_Trigger')
            .timeBased()
            .after(60000) // Safely re-awaken thread state tracking in 1 minute
            .create();
    },

    clearContinuationTriggers: function() {
        const triggers = ScriptApp.getProjectTriggers();
        triggers.forEach(function(trigger) {
            if (trigger.getHandlerFunction() === 'runWhatsAppBlaster_Trigger') {
                try { ScriptApp.deleteTrigger(trigger); } catch(e) {}
            }
        });
    }
};

/**
 * Autopilot trigger loop wrapper binds directly to the core task queue.
 * Self-healing: reschedules if an uncaught exception drops the active loop.
 */
function runWhatsAppBlaster_Trigger() {
    try {
        if (typeof WhatsAppManager !== 'undefined') {
            WhatsAppManager.batchSendWhatsApp(true); // Pass true flag to bypass user confirmations
        }
    } catch (err) {
        console.error(`Uncaught fault inside background WhatsApp worker pass: ${err.message}`);
        // Reschedule execution paths if a connection error drops the active loop thread
        if (typeof WhatsAppManager !== 'undefined') WhatsAppManager.setupContinuationTrigger();
    }
}