// ==========================================
// HECTECH EmailManager.js (Production Ready)
// ==========================================

const EmailManager = {
  
  process: function() {
    this.batchSendEmails();
  },

  batchSendEmails: function() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ui = SpreadsheetApp.getUi();
    const sheet = ss.getSheetByName(Config.CONTACT_SHEET_NAME);
    
    if (!sheet) { 
      ui.alert(`❌ Contact Sheet "${Config.CONTACT_SHEET_NAME}" missing.`); 
      return; 
    }

    // 1. ABSOLUTE QUOTA BOUNDARY VERIFICATION
    const quota = MailApp.getRemainingDailyQuota();
    if (quota < 5) {
      ui.alert(`⚠️ Google Daily Dispatch Quota is depleted (${quota} remaining). Please resume execution tomorrow.`);
      return;
    }

    const lastRow = sheet.getLastRow();
    if (lastRow < 3) return;

    // 2. FETCH DATA VIA SOURCE OF TRUTH METRICS
    const maxCol = Math.max(
      Config.COL_NAME, 
      Config.COL_EMAIL, 
      Config.COL_PDF_ID, 
      Config.COL_EMAIL_STATUS
    );
    const data = sheet.getRange(3, 1, lastRow - 2, maxCol).getValues();

    // 3. ZERO-BASED OFFSET POINTER MAPPING
    const idxName = Config.COL_NAME - 1;
    const idxEmail = Config.COL_EMAIL - 1;
    const idxPdf = Config.COL_PDF_ID - 1;
    const idxStatus = Config.COL_EMAIL_STATUS - 1;

    let pendingCount = 0;
    data.forEach(row => {
      const emailStr = String(row[idxEmail]).trim();
      const pdfStr = String(row[idxPdf]).trim();
      const statusStr = String(row[idxStatus]).trim().toUpperCase();
      
      if (emailStr && pdfStr && statusStr !== "SENT" && !statusStr.startsWith("SENT")) {
        pendingCount++;
      }
    });

    if (pendingCount === 0) { 
      ui.alert("✅ All student report rows on this ledger are already marked SENT."); 
      return; 
    }

    const confirmation = ui.alert(
      `🚀 Initiate Email Distribution?`, 
      `Pending Queue: ${pendingCount} Records\nAvailable Quota: ${quota} Dispatches\n\nProceeding will broadcast direct PDF links to verified parent addresses.`, 
      ui.ButtonSet.OK_CANCEL
    );
    if (confirmation !== ui.Button.OK) return;

    // 4. PREPARE BUFFER ARRAYS & INTERFACE STATE
    ss.toast(`Initializing broadcast engine...`, "HecTech Mail", -1);
    
    let sentCount = 0;
    let failCount = 0;
    let processed = 0;

    const statusRange = sheet.getRange(3, Config.COL_EMAIL_STATUS, lastRow - 2, 1);
    const statusValues = statusRange.getValues();
    const statusBackgrounds = statusRange.getBackgrounds();
    const fontColors = statusRange.getFontColors();
    const fontWeights = statusRange.getFontWeights();

    // Structural Email Regex validation sequence 
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // 5. TRANSACTING BROADCAST LOOP
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const name = row[idxName];
      const email = String(row[idxEmail]).trim();
      const pdfId = String(row[idxPdf]).trim();
      const currentStatus = String(row[idxStatus]).trim().toUpperCase();

      if (!email || !pdfId || currentStatus === "SENT") continue;

      processed++;
      ss.toast(`Dispatching ${processed}/${pendingCount}: ${name}...`, "Mail Server", -1);

      // 🟢 PRE-FLIGHT SYNTAX INTERCEPT: Safeguards quota and skips backoff timeouts for bad formatting
      if (!emailRegex.test(email)) {
        statusValues[i][0] = "MALFORMED EMAIL CELL";
        statusBackgrounds[i][0] = "#441015"; // Deep Maroon dark surface
        fontColors[i][0] = "#FF3333";        // Neon Red Glow Error text
        fontWeights[i][0] = "bold";
        failCount++;
        continue;
      }

      const result = this.sendSingleReport(name, email, pdfId);

      // 6. MAP DYNAMIC MATRIX FORMATTING (Strict Dark Theme Uniformity)
      if (result.success) {
        statusValues[i][0] = `SENT: ${Utilities.formatDate(new Date(), "GMT", "HH:mm")}`;
        statusBackgrounds[i][0] = "#0A2F1D"; // Deep Emerald dark surface
        fontColors[i][0] = "#39FF14";        // Neon Green Glow Text
        fontWeights[i][0] = "bold";
        sentCount++;
      } else {
        statusValues[i][0] = `FAIL: ${result.error}`;
        statusBackgrounds[i][0] = "#441015"; // Deep Maroon dark surface
        fontColors[i][0] = "#FF3333";        // Neon Red Glow Text
        fontWeights[i][0] = "bold";
        failCount++;
      }
      
      // Flush memory buffer updates in chunks to retain view responsiveness safely
      if (processed % 5 === 0) {
        statusRange.setValues(statusValues);
        statusRange.setBackgrounds(statusBackgrounds);
        statusRange.setFontColors(fontColors);
        statusRange.setFontWeights(fontWeights);
        SpreadsheetApp.flush();
      }
      Utilities.sleep(150); // Steady rate-limiting protection
    }

    // 7. COMPACT FINAL FLUSH
    if (processed > 0) {
      statusRange.setValues(statusValues);
      statusRange.setBackgrounds(statusBackgrounds);
      statusRange.setFontColors(fontColors);
      statusRange.setFontWeights(fontWeights);
      SpreadsheetApp.flush();
    }

    ss.toast("Email process run finalized.", "System Clean");
    ui.alert(`📧 Email Batch Complete\n\nSuccessfully Sent: ${sentCount}\nFailed/Aborted: ${failCount}`);
  },

  /**
   * Delivers single transactional report attached file with exponential backoff protections
   */
  sendSingleReport: function(studentName, parentEmail, pdfId, attempt = 1) {
    try {
      const file = DriveApp.getFileById(pdfId);
      const pdfBlob = file.getAs(MimeType.PDF);

      // Capture runtime system definitions directly
      const className = Config.CLASS_NAME;
      const termInfo = Config.TERM_YEAR_INFO;

      // Premium, Clean Branded HTML Email Template
      const htmlBody = `
        <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #f4f6f9; padding: 30px; color: #333333;">
          <table style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border-collapse: collapse; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
            <thead>
              <tr>
                <td style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">HECTECK ACADEMY</h1>
                  <p style="color: #e0e7ff; margin: 5px 0 0 0; font-size: 13px; font-weight: 500;">Official Student Terminal Record</p>
                </td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 40px 35px; background-color: #ffffff;">
                  <p style="font-size: 15px; line-height: 1.6; color: #1e293b; margin-bottom: 20px;">Dear Parent/Guardian,</p>
                  <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 24px;">
                    Please find attached the official electronic terminal progress report card for <strong>${studentName}</strong> covering the active evaluation assessment profile cycle.
                  </p>
                  
                  <table style="width: 100%; background-color: #f8fafc; border-radius: 6px; margin-bottom: 24px; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 12px 16px; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">Class Stream:</td>
                      <td style="padding: 12px 16px; font-size: 14px; font-weight: 600; color: #0f172a; text-align: right;">${className}</td>
                    </tr>
                    <tr style="border-top: 1px solid #e2e8f0;">
                      <td style="padding: 12px 16px; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">Academic Cycle:</td>
                      <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #0f172a; text-align: right;">${termInfo}</td>
                    </tr>
                  </table>

                  <p style="font-size: 13px; line-height: 1.6; color: #64748b; margin-bottom: 30px; padding: 12px; background-color: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 4px;">
                    💡 <strong>Notice:</strong> The document is delivered as an optimized PDF attachment. Kindly pull down the attached resource frame to review specific metric charts, teacher annotations, and localized subject marks.
                  </p>
                  
                  <p style="font-size: 14px; color: #475569; margin: 0; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                    Best Regards,<br />
                    <span style="font-weight: 600; color: #0f172a;">School Administration</span>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="font-size: 11px; color: #94a3b8; margin: 0;">Automated Dispatch Engine secured by HecTech Systems 2.0</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>`;

      GmailApp.sendEmail(parentEmail, `Official Progress Report Card: ${studentName}`, "Please enable HTML formatting templates inside your client utility to view this document profile.", {
        htmlBody: htmlBody,
        attachments: [pdfBlob],
        name: "HecTech Report System"
      });

      return { success: true };
    } catch (e) {
      // Clean intercept filters block retry penalties if the driver returns explicit credential or authorization gaps
      const errMsg = e.message ? e.message.toLowerCase() : "";
      if (errMsg.includes("invalid email") || errMsg.includes("missing recipient")) {
        return { success: false, error: "Syntax Invalid" };
      }

      if (attempt <= 3) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`Mail Server Throttled. Triggering Backoff Loop ${attempt}/3. Sleeping ${delay}ms...`);
        Utilities.sleep(delay);
        return this.sendSingleReport(studentName, parentEmail, pdfId, attempt + 1);
      }
      return { success: false, error: e.message };
    }
  }
};