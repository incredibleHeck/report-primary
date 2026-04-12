// ==========================================
// HECTECH WhatsAppManager.js
// ==========================================

/** Graph API version for /media and /messages (keep in sync with Meta docs / your curl tests). */
const WHATSAPP_GRAPH_API_VERSION = 'v25.0';

const WhatsAppManager = {
    
    /**
     * MAIN ENTRY POINT
     */
    process: function() {
        this.batchSendWhatsApp();
    },

    batchSendWhatsApp: function() {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const ui = SpreadsheetApp.getUi();
        const sheet = ss.getSheetByName(Config.CONTACT_SHEET_NAME);

        if (!sheet) { ui.alert("❌ Contact Sheet missing."); return; }

        // 1. CONFIRMATION
        const confirm = ui.alert("🚀 Send WhatsApp PDFs?", 
            "Target: Numbers in 'PHONE' column.\nStatus Update: 'WHATSAPP' column.", 
            ui.ButtonSet.YES_NO);
        if (confirm !== ui.Button.YES) return;

        // 2. GET DATA (Dynamic Column Discovery)
        const lastRow = sheet.getLastRow();
        const lastCol = sheet.getLastColumn();
        if (lastRow < 2) return;
        
        // Fetch All Data
        // Headers are Row 1, Data starts Row 2
        const dataRange = sheet.getRange(2, 1, lastRow - 1, lastCol);
        const data = dataRange.getValues();

        // 🟢 HARDENED MAPPING
        // Helper to get 0-based index from 1-based Config result
        const getIdx = (colNum) => colNum - 1;

        const idxName = getIdx(Config.COL_NAME);
        const idxPhone = getIdx(Config.COL_PHONE);
        const idxPdf = getIdx(Config.COL_PDF_ID);
        const idxStatus = getIdx(Config.COL_WHATSAPP_STATUS);

        let successCount = 0;
        let failCount = 0;

        ss.toast("Starting WhatsApp Batch...", "HecTech", -1);

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const name = row[idxName];
            const phoneRaw = row[idxPhone];
            const fileId = row[idxPdf];
            const status = row[idxStatus];

            // SKIP IF: No phone, No PDF, or Already Sent
            if (!phoneRaw || !fileId || String(status).trim() === "SENT") continue;

            const phone = String(phoneRaw).replace(/\D/g, ''); // Strip non-digits

            try {
                // A. UPLOAD PDF (With Retry)
                const mediaId = this.uploadWithRetry(fileId);

                if (mediaId) {
                    // B. SEND MESSAGE (With Retry)
                    this.sendWithRetry(phone, name, mediaId);
                    
                    successCount++;
                    // Update Status (Adjust for 0-based array vs 1-based sheet)
                    sheet.getRange(i + 2, idxStatus + 1).setValue("SENT").setBackground("#D9EAD3");
                } else {
                    failCount++;
                    sheet.getRange(i + 2, idxStatus + 1).setValue("UPLOAD FAIL");
                }
            } catch (e) {
                console.error(`WA Fail: ${name}`, e);
                failCount++;
                sheet.getRange(i + 2, idxStatus + 1).setValue(`ERR: ${e.message}`).setBackground("#F4CCCC");
            }

            // 🟢 RATE LIMIT PROTECTION: Sleep 1s between students
            Utilities.sleep(1000); 
        }

        ui.alert(`📱 WhatsApp Batch Complete\nSent: ${successCount}\nFailed: ${failCount}`);
    },

    /**
     * Uploads PDF with Exponential Backoff
     */
    uploadWithRetry: function(fileId, attempt = 1) {
        try {
            return this.uploadPdfToMeta(fileId);
        } catch (e) {
            if (attempt <= 3) {
                const delay = Math.pow(2, attempt) * 1000;
                console.warn(`Upload failed (attempt ${attempt}/3). Retrying in ${delay}ms...`);
                Utilities.sleep(delay);
                return this.uploadWithRetry(fileId, attempt + 1);
            }
            throw e;
        }
    },

    uploadPdfToMeta: function(fileId) {
        const file = DriveApp.getFileById(fileId);
        const url = `https://graph.facebook.com/${WHATSAPP_GRAPH_API_VERSION}/${Config.WHATSAPP_PHONE_ID}/media`;
        
        const options = {
            "method": "post",
            "headers": { "Authorization": `Bearer ${Config.WHATSAPP_ACCESS_TOKEN}` },
            "payload": { 
                "messaging_product": "whatsapp", 
                "file": file.getBlob() 
            },
            "muteHttpExceptions": true
        };

        const res = UrlFetchApp.fetch(url, options);
        const json = JSON.parse(res.getContentText());

        if (json.error) throw new Error(json.error.message);
        return json.id;
    },

    /**
     * Sends Message with Exponential Backoff
     */
    sendWithRetry: function(phone, studentName, mediaId, attempt = 1) {
        try {
            return this.sendTemplateMessage(phone, studentName, mediaId);
        } catch (e) {
            if (attempt <= 3) {
                const delay = Math.pow(2, attempt) * 1000;
                console.warn(`Send failed (attempt ${attempt}/3). Retrying in ${delay}ms...`);
                Utilities.sleep(delay);
                return this.sendWithRetry(phone, studentName, mediaId, attempt + 1);
            }
            throw e;
        }
    },

    sendTemplateMessage: function(phone, studentName, mediaId) {
        const url = `https://graph.facebook.com/${WHATSAPP_GRAPH_API_VERSION}/${Config.WHATSAPP_PHONE_ID}/messages`;
        
        const payload = {
            "messaging_product": "whatsapp",
            "to": phone,
            "type": "template",
            "template": {
                "name": Config.WHATSAPP_TEMPLATE_NAME,
                "language": { "code": Config.WHATSAPP_TEMPLATE_LANGUAGE },
                "components": [
                    {
                        "type": "header",
                        "parameters": [{ 
                            "type": "document", 
                            "document": { "id": mediaId, "filename": `${studentName} Report.pdf` } 
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
                "Authorization": `Bearer ${Config.WHATSAPP_ACCESS_TOKEN}`,
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
            let errorMsg = err ? err.message : "Unknown API Error";
            const sub = err && err.error_subcode;
            if (sub === 132001 || /132001|does not exist in the translation/i.test(String(errorMsg))) {
                errorMsg +=
                    " — Template+language must exist for THIS Phone Number ID in Meta (text test messages skip templates). " +
                    "Set Script Properties WHATSAPP_TEMPLATE_NAME and WHATSAPP_TEMPLATE_LANGUAGE (e.g. en_GB) to match WhatsApp Manager exactly.";
            }
            throw new Error(`${resCode}: ${errorMsg}`);
        }
        
        return true;
    }
};