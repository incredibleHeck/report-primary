// ==========================================
// HECKTECK GCUiHelper.js
// ==========================================

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Update your Sidebar opener to use a TEMPLATE instead of just Output
function openGeneralSidebar() {
  const template = HtmlService.createTemplateFromFile('GCSidebar_Main'); // We will create this file next
  const html = template.evaluate()
      .setTitle('Class Teacher General Comment')
      .setWidth(350);
  SpreadsheetApp.getUi().showSidebar(html);
}