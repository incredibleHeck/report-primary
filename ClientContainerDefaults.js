// ==========================================
// HECTECH ClientContainerDefaults.js
// ==========================================
// Bundled defaults for school *container* Script Properties. Secrets (tokens, API keys)
// must never be listed here — set those only in each school’s project.
//
// The client shell merges these when a key is missing or empty (see Client_Shell template).
// Bump BUNDLED_DEFAULTS_VERSION when you add/change keys so support can tell what shipped.

const ClientContainerDefaults = {
  BUNDLED_DEFAULTS_VERSION: 1,

  /**
   * Plain strings only. Merged into the host project’s Script Properties for keys that
   * are absent or blank — existing non-empty values are never overwritten.
   */
  getBundled: function () {
    return {
      WHATSAPP_TEMPLATE_NAME: 'student_report_pdf',
      WHATSAPP_TEMPLATE_LANGUAGE: 'en_US',
      GEMINI_MODEL_NAME: 'gemini-2.5-flash',
      CLASSLIST_SHEET_NAME: 'CLASSLIST',
      REPORT_SHEET_NAME: 'REPORT DATA',
      CONTACT_SHEET_NAME: 'CONTACT LIST',
      TEMPLATE_SHEET_NAME: 'REPORT TEMPLATE',
      MIDTERM_SHEET_NAME: 'MIDTERM DATA',
      MIDTERM_TEMPLATE_NAME: 'MIDTERM TEMPLATE',
      DATA_START_ROW: '3',
      ATTENDANCE_TOTAL: '64',
    };
  },
};

/** Exposed to the container shell so merges track the library version. */
function getBundledContainerPropertyDefaults() {
  return ClientContainerDefaults.getBundled();
}

function getBundledContainerDefaultsVersion() {
  return ClientContainerDefaults.BUNDLED_DEFAULTS_VERSION;
}
