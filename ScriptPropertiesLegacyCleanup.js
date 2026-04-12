// ==========================================
// One-off: remove legacy per-spreadsheet script properties
// ==========================================
// Project Settings always shows: "Your script has more than 50 properties…" whenever the
// TOTAL number of script properties is above 50. That line is normal and does not mean
// deletes failed — it will only go away after you have 50 or fewer keys left (Google’s UI limit).
//
// 1. Run auditScriptPropertiesInventory() — total count + grouped counts + full key list (read-only).
// 2. Run previewLegacyScriptPropertyCleanup() — what would be deleted by prefix rules.
// 3. Run removeLegacyScriptProperties() — deletes keys matching the prefixes below.
//
// Safe keys (API tokens, REPORT_FOLDER_*, bare GEMINI_*, etc.) are NOT matched unless you add a prefix.
//
// Matching is case-insensitive on the prefix (covers ctx_, CTX_, etc.).

/**
 * Keys whose names start with any of these prefixes (case-insensitive) are removed.
 * Remove any row you want to keep (e.g. only CTX_/ATTENDANCE_TOTAL_/CLASS_NAME_ if you prefer).
 */
const LEGACY_SCRIPT_PROPERTY_PREFIXES = [
  // Subject context (SubjectContextManager / SubjectCommentManager)
  'CTX_',
  // Per-spreadsheet class settings (SettingsManager.buildSettingsSaveProperties → KEY_<ssId>)
  'ATTENDANCE_TOTAL_',
  'CLASS_NAME_',
  'ROLL_COUNT_',
  'TERM_YEAR_INFO_',
  'REPORT_DATE_',
  'NEXT_TERM_BEGINS_',
  'SCHOOL_BREAKS_',
  'SCHOOL_RESUMES_',
  'TEACHER_NAME_',
];

function legacyKeyMatchesAnyPrefix(key) {
  var upperKey = String(key).toUpperCase();
  return LEGACY_SCRIPT_PROPERTY_PREFIXES.some(function (prefix) {
    return upperKey.indexOf(prefix.toUpperCase()) === 0;
  });
}

/** Log long text in chunks (Apps Script log line limits). */
function logInChunks(label, lines) {
  var chunkSize = 40;
  for (var i = 0; i < lines.length; i += chunkSize) {
    var part = lines.slice(i, i + chunkSize);
    var msg = label + ' [' + (i + 1) + '–' + (i + part.length) + ' of ' + lines.length + ']\n' + part.join('\n');
    Logger.log(msg);
    console.log(msg);
  }
}

/**
 * Groups keys like FOO_BAR_<spreadsheetId> under "FOO_BAR" so you can see what still uses quota.
 * Run from the editor; check Executions → Logs. Does not delete anything.
 */
function auditScriptPropertiesInventory() {
  var props = PropertiesService.getScriptProperties();
  var all = props.getProperties();
  var keys = Object.keys(all).sort();

  var head = 'TOTAL script properties: ' + keys.length;
  Logger.log(head);
  console.log(head);

  var groups = {};
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    var g = groupKeyForAudit(k);
    groups[g] = (groups[g] || 0) + 1;
  }

  var groupLines = Object.keys(groups)
    .sort(function (a, b) {
      return groups[b] - groups[a];
    })
    .map(function (g) {
      return groups[g] + '\t' + g;
    });
  var groupBlock = 'COUNT\tGROUP (prefix before spreadsheet-style suffix)\n' + groupLines.join('\n');
  Logger.log(groupBlock);
  console.log(groupBlock);

  logInChunks('ALL_KEYS', keys);
}

/** Strip a trailing _spreadsheetId-style segment so similar keys roll up together. */
function groupKeyForAudit(key) {
  var parts = String(key).split('_');
  if (parts.length < 2) {
    return key;
  }
  var last = parts[parts.length - 1];
  if (last.length >= 8 && /^[0-9A-Za-z\-]+$/.test(last)) {
    return parts.slice(0, -1).join('_');
  }
  return key;
}

function previewLegacyScriptPropertyCleanup() {
  const props = PropertiesService.getScriptProperties();
  const all = props.getProperties();
  const keys = Object.keys(all);
  const toRemove = keys.filter(legacyKeyMatchesAnyPrefix);

  const summary =
    'Total script properties: ' +
    keys.length +
    '\nWould delete: ' +
    toRemove.length +
    '\n\nFull list of keys to delete follows in chunks.';
  Logger.log(summary);
  console.log(summary);
  logInChunks('DELETE', toRemove.sort());

  try {
    SpreadsheetApp.getUi().alert(
      'Preview',
      'Total keys: ' + keys.length + '\nWould delete: ' + toRemove.length + '\n\nSee Executions → Logs for the list.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (e) {
    // No container UI (e.g. some run contexts)
  }
}

function removeLegacyScriptProperties() {
  const ui = (function () {
    try {
      return SpreadsheetApp.getUi();
    } catch (e) {
      return null;
    }
  })();

  if (ui) {
    const confirm = ui.alert(
      'Delete legacy properties?',
      'This removes all script properties whose keys start with:\n' +
        LEGACY_SCRIPT_PROPERTY_PREFIXES.join(', ') +
        '\n\nContinue?',
      ui.ButtonSet.YES_NO
    );
    if (confirm !== ui.Button.YES) {
      return;
    }
  }

  const props = PropertiesService.getScriptProperties();
  const all = props.getProperties();
  const keys = Object.keys(all);
  const toRemove = keys.filter(legacyKeyMatchesAnyPrefix);

  toRemove.forEach(function (key) {
    props.deleteProperty(key);
  });

  const msg = 'Deleted ' + toRemove.length + ' of ' + keys.length + ' script properties.';
  Logger.log(msg);
  console.log(msg);

  if (ui) {
    ui.alert('Done', msg, ui.ButtonSet.OK);
  }
}
