// =========================================================================
// HECTECH CLIENT SHELL
// =========================================================================
// This script acts as a bridge between the Google Sheet and the secure 
// HecTechVault library. It contains no proprietary logic.
// 
// INSTRUCTIONS:
// 1. In the Apps Script editor, go to "Libraries" (left sidebar, + icon).
// 2. Paste your HecTechVault Script ID.
// 3. Select the latest version.
// 4. Set the Identifier to exactly: HecTechVault
// =========================================================================

/**
 * Creates the custom menu when the spreadsheet opens.
 * We delegate this to the library so the menu structure is managed centrally.
 */
function onOpen() {
  if (typeof HecTechVault !== 'undefined') {
    HecTechVault.onOpen();
  } else {
    SpreadsheetApp.getUi().createMenu('HecTech AI 🎓 (Error)')
      .addItem('⚠️ Library Not Connected', 'showLibraryError')
      .addToUi();
  }
}

function showLibraryError() {
  SpreadsheetApp.getUi().alert(
    "Library Connection Error", 
    "The HecTechVault library is not connected. Please check your Apps Script Libraries settings.", 
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

// =========================================================================
// MENU ACTION WRAPPERS
// These functions are called by the custom menu items.
// =========================================================================
function openSettingsSidebar() { HecTechVault.openSettingsSidebar(); }
function openSubjectContextSidebar() { HecTechVault.openSubjectContextSidebar(); }
function runCommentGenerator() { HecTechVault.runCommentGenerator(); }
function openGeneralSidebar() { HecTechVault.openGeneralSidebar(); }
function runPolish() { HecTechVault.runPolish(); }
function runPronouns() { HecTechVault.runPronouns(); }
function runAuditFix() { HecTechVault.runAuditFix(); }
function runAudit() { HecTechVault.runAudit(); }
function runFinalize() { HecTechVault.runFinalize(); }
function RUN_SYSTEM_READINESS_CHECK() { HecTechVault.RUN_SYSTEM_READINESS_CHECK(); }
function runReportPreview() { HecTechVault.runReportPreview(); }
function runFullReportBatch() { HecTechVault.runFullReportBatch(); }
function runMidtermPreview() { HecTechVault.runMidtermPreview(); }
function runMidtermBatch() { HecTechVault.runMidtermBatch(); }
function runEmailBatch() { HecTechVault.runEmailBatch(); }
function runWhatsAppBlaster() { HecTechVault.runWhatsAppBlaster(); }
function runResetStatuses() { HecTechVault.runResetStatuses(); }
function runUndo() { HecTechVault.runUndo(); }

// =========================================================================
// HTML SIDEBAR CALLBACK WRAPPERS (google.script.run)
// These functions are called by the JavaScript inside the HTML sidebars.
// Because the HTML is rendered in the context of THIS client script, 
// google.script.run looks for these functions here.
// =========================================================================

// From Sidebar.html (Batch Processing)
function getSelectionInfo() { return HecTechVault.getSelectionInfo(); }
function processChunk(action, start, count) { return HecTechVault.processChunk(action, start, count); }
function toast(msg, title) { return HecTechVault.toast(msg, title); }

// From SettingsSidebar.html
function getSettingsData() { return HecTechVault.getSettingsData(); }
function saveSettingsData(settings) { return HecTechVault.saveSettingsData(settings); }

// From SubjectContextSidebar.html
function getSubjectContext() { return HecTechVault.getSubjectContext(); }
function saveSubjectContext(data) { return HecTechVault.saveSubjectContext(data); }

// From GCSidebar_JS.html (General Comments)
function getSidebarData() { return HecTechVault.getSidebarData(); }
function pollCurrentStudent() { return HecTechVault.pollCurrentStudent(); }
function processGeneralCommentWithTraits(traits, rowIndex) { return HecTechVault.processGeneralCommentWithTraits(traits, rowIndex); }
