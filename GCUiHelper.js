// ==========================================
// HECTECH GCUiHelper.js (Hardened)
// ==========================================

/**
 * Safely evaluates and evaluates internal spreadsheet template layout components.
 * Acts as a structural shield, stopping system-wide crashes if an asset file is missing.
 * * @param {string} filename - Target HTML, CSS, or JS file name component string.
 * @return {string} Raw text asset content or an embedded layout fallback comment string.
 */
function include(filename) {
  try {
    if (!filename || typeof filename !== 'string') {
      throw new Error("Null or invalid structural text template reference pointer passed.");
    }
    
    // Ingest and extract asset stream text contents smoothly
    return HtmlService.createHtmlOutputFromFile(String(filename).trim()).getContent();
    
  } catch (err) {
    // Commit structural crash variables to the cloud platform log registers instantly
    console.error(`HecTech UI Pipeline Interruption: Failure ingesting template file [${filename}]. Details: ${err.message}`);
    
    // Return an embedded HTML comment marker to isolate the issue without interrupting other scripts
    return `\n\n`;
  }
}