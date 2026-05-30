// ==========================================
// HECTECH ClientContainerDefaults.js (Hardened)
// ==========================================

const ClientContainerDefaults = {
  // Bumped version signature to account for structural multi-tier fallback protection
  BUNDLED_DEFAULTS_VERSION: 2,

  /**
   * Plain configurations only. Merged natively into host project layers.
   * Returns an immutable, deeply frozen configuration matrix to block runtime tampering.
   *
   * @return {Object} Immutable defaults registry snapshot.
   */
  getBundled: function () {
    const defaults = {
      WHATSAPP_TEMPLATE_NAME: 'student_report_pdf',
      WHATSAPP_TEMPLATE_LANGUAGE: 'en',
      GEMINI_MODEL_NAME: 'gemini-3.5-flash',
      CLASSLIST_SHEET_NAME: 'CLASSLIST',
      REPORT_SHEET_NAME: 'REPORT DATA',
      CONTACT_SHEET_NAME: 'CONTACT LIST',
      TEMPLATE_SHEET_NAME: 'REPORT TEMPLATE',
      MIDTERM_SHEET_NAME: 'MIDTERM DATA',
      MIDTERM_TEMPLATE_NAME: 'MIDTERM TEMPLATE',
      DATA_START_ROW: '3',
      ATTENDANCE_TOTAL: '64',
    };
    
    // Lock structure completely to prevent unauthorized runtime property mutations
    return Object.freeze(defaults);
  },
};

/** Exposed to the container shell so merges track the library version accurately */
function getBundledContainerPropertyDefaults() {
  return ClientContainerDefaults.getBundled();
}

function getBundledContainerDefaultsVersion() {
  return ClientContainerDefaults.BUNDLED_DEFAULTS_VERSION;
}
