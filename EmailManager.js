// ==========================================
// HECKTECK EmailManager.js
// ==========================================

const EmailManager = {
  
  process: function() {
    this.batchSendEmails();
  },

  batchSendEmails: function() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ui = SpreadsheetApp.getUi();
    const sheet = ss.getSheetByName(Config.CONTACT_SHEET_NAME);
    
    if (!sheet) { ui.alert(`❌ Contact Sheet "${Config.CONTACT_SHEET_NAME}" missing.`); return; }

    // 1. QUOTA CHECK
    const quota = MailApp.getRemainingDailyQuota();
    if (quota < 10) {
      ui.alert(`⚠️ Daily Quota Low (${quota}). Try again tomorrow.`);
      return;
    }

    // 2. GET DATA (Use dynamic column count based on config)
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return;

    // Determine how many columns we need based on config
    const maxCol = Math.max(
      Config.COL_NAME, 
      Config.COL_EMAIL, 
      Config.COL_PDF_ID, 
      Config.COL_EMAIL_STATUS
    );
    const data = sheet.getRange(2, 1, lastRow - 1, maxCol).getValues();

    // 3. MAP COLUMNS (0-based indices)
    const idxName = Config.COL_NAME - 1;
    const idxEmail = Config.COL_EMAIL - 1;
    const idxPdf = Config.COL_PDF_ID - 1;
    const idxStatus = Config.COL_EMAIL_STATUS - 1;

    let pendingCount = 0;
    data.forEach(row => {
      if (row[idxEmail] && row[idxPdf] && String(row[idxStatus]).trim() !== "SENT") {
        pendingCount++;
      }
    });

    if (pendingCount === 0) { ui.alert("✅ All emails already sent."); return; }

    const response = ui.alert(`Send Emails?`, `Pending: ${pendingCount}\nQuota: ${quota}`, ui.ButtonSet.OK_CANCEL);
    if (response !== ui.Button.OK) return;

    // 4. SENDING LOOP
    ss.toast("🚀 Sending Emails...", "HeckTeck", -1);
    
    let sentCount = 0;
    let failCount = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const name = row[idxName];
      const email = row[idxEmail];
      const pdfId = row[idxPdf];
      const currentStatus = row[idxStatus];

      if (!email || !pdfId || String(currentStatus).trim() === "SENT") continue;

      const result = this.sendSingleReport(name, email, pdfId);
      const realRow = i + 2;
      
      // WRITE TO COL F (Email Status)
      const statusCell = sheet.getRange(realRow, Config.COL_EMAIL_STATUS);

      if (result.success) {
        statusCell.setValue("SENT").setBackground("#D9EAD3");
        sentCount++;
      } else {
        statusCell.setValue(`ERROR: ${result.error}`).setBackground("#F4CCCC");
        failCount++;
      }
      Utilities.sleep(200); // Slight delay for stability
    }

    ui.alert(`📧 Email Batch Complete\nSent: ${sentCount}\nFailed: ${failCount}`);
  },

  sendSingleReport: function(studentName, parentEmail, pdfId) {
    try {
      const file = DriveApp.getFileById(pdfId);
      const pdfBlob = file.getAs(MimeType.PDF);
      
      const htmlBody = `
        <div style="font-family: Arial, sans-serif;">
          <h2 style="color: #2c3e50;">Academic Report</h2>
          <p>Dear Parent,</p>
          <p>Please find attached the report for <strong>${studentName}</strong>.</p>
          <p>Best Regards,<br>Class Teacher</p>
        </div>`;

      GmailApp.sendEmail(parentEmail, `Report Card: ${studentName}`, "Please view HTML.", {
        htmlBody: htmlBody,
        attachments: [pdfBlob],
        name: "School Reporting System"
      });

      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
};