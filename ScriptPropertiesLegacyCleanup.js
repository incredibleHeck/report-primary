// =========================================================================
// HECTECH PropertyCleanupManager.js (Hardened V8 Engine)
// =========================================================================

/**
 * Prefix arrays matching stale container script criteria.
 * Scaled down defensively to protect baseline environmental configuration blocks.
 */
const LEGACY_SCRIPT_PROPERTY_PREFIXES = [
  'CTX_',
  'ATTENDANCE_TOTAL_',
  'CLASS_NAME_',
  'ROLL_COUNT_',
  'TERM_YEAR_INFO_',
  'REPORT_DATE_',
  'NEXT_TERM_BEGINS_',
  'SCHOOL_BREAKS_',
  'SCHOOL_RESUMES_',
  'TEACHER_NAME_'
  // 🟢 SAFED: Stripped out 'REPORT_FOLDER_' to protect active Drive directory structures
];

/**
 * Checks if a property key matches any of the legacy deletion prefixes.
 * @param {string} key - The script property key to validate.
 * @return {boolean} True if a case-insensitive prefix match is confirmed.
 */
function legacyKeyMatchesAnyPrefix(key) {
  if (!key) return false;
  const upperKey = String(key).toUpperCase();
  return LEGACY_SCRIPT_PROPERTY_PREFIXES.some(prefix => upperKey.indexOf(prefix.toUpperCase()) === 0);
}

/**
 * Splits long logs into manageable chunks to respect Apps Script line limits.
 */
function logInChunks(label, lines) {
  const chunkSize = 40;
  for (let i = 0; i < lines.length; i += chunkSize) {
    const part = lines.slice(i, i + chunkSize);
    const msg = `${label} [${i + 1}–${i + part.length} of ${lines.length}]\n${part.join('\n')}`;
    Logger.log(msg);
    console.log(msg);
  }
}

/**
 * Audits property storage configurations.
 * Run this from the Apps Script Editor to view grouped property allocations.
 */
function auditScriptPropertiesInventory() {
  const props = PropertiesService.getScriptProperties();
  const all = props.getProperties();
  const keys = Object.keys(all).sort();

  const head = `TOTAL script properties discovered: ${keys.length}`;
  Logger.log(head);
  console.log(head);

  const groups = Object.create(null);
  keys.forEach(k => {
    const g = groupKeyForAudit(k);
    groups[g] = (groups[g] || 0) + 1;
  });

  const groupLines = Object.keys(groups)
    .sort((a, b) => groups[b] - groups[a])
    .map(g => `${groups[g]}\t${g}`);
    
  const groupBlock = 'COUNT\tGROUP SCHEMAS (Rolled-up Property Targets)\n' + groupLines.join('\n');
  Logger.log(groupBlock);
  console.log(groupBlock);

  logInChunks('ALL_DISCOVERED_KEYS', keys);
}

/**
 * 🟢 FIXED: Uses an explicit regular expression to parse and strip 
 * 44-character Google Spreadsheet IDs cleanly without breaking on internal underscores.
 */
function groupKeyForAudit(key) {
  const cleanStr = String(key);
  // Matches typical Google ID string footprints suffix anchors length structures
  const ssIdMatch = cleanStr.match(/_([a-zA-Z0-9\-_]{40,50})$/);
  if (ssIdMatch) {
    return cleanStr.replace(ssIdMatch[0], '_<SPREADSHEET_ID>');
  }
  return cleanStr;
}

/**
 * Generates an interactive dry-run preview of keys flagged for deletion.
 */
function previewLegacyScriptPropertyCleanup() {
  const props = PropertiesService.getScriptProperties();
  const all = props.getProperties();
  const keys = Object.keys(all);
  const toRemove = keys.filter(legacyKeyMatchesAnyPrefix);

  const summary = `Total current script properties: ${keys.length}\nFlagged for removal: ${toRemove.length}\n\nReview the execution logs to see the targeted keys.`;
  Logger.log(summary);
  console.log(summary);
  logInChunks('FLAGGED_FOR_DELETION', toRemove.sort());

  try {
    SpreadsheetApp.getUi().alert(
      'HecTech Purge Preview',
      `Total keys: ${keys.length}\nFlagged for removal: ${toRemove.length}\n\nOpen Executions → Logs to review the targeted keys before executing the deletion loop.`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (e) {
    // Graceful fallback if executed outside an active sheet context UI frame
  }
}

/**
 * 🟢 HARDENED ATOMIC PURGE ENGINE
 * Collects retained properties and overwrites the database store in a single transaction.
 */
function removeLegacyScriptProperties() {
  const ui = (() => {
    try { return SpreadsheetApp.getUi(); } catch (e) { return null; }
  })();

  if (ui) {
    const confirm = ui.alert(
      '⚠️ Confirm Database Structural Clean?',
      `This will permanently remove all script properties starting with:\n\n${LEGACY_SCRIPT_PROPERTY_PREFIXES.join(', ')}\n\nAre you sure you want to proceed?`,
      ui.ButtonSet.YES_NO
    );
    if (confirm !== ui.Button.YES) {
      Logger.log('Purge process aborted by user.');
      return;
    }
  }

  const props = PropertiesService.getScriptProperties();
  const all = props.getProperties();
  const keys = Object.keys(all);
  
  // 🟢 FIXED: Build an object containing ONLY protected, non-matching configurations
  const retainedProperties = Object.create(null);
  let deleteCount = 0;

  keys.forEach(key => {
    if (!legacyKeyMatchesAnyPrefix(key)) {
      retainedProperties[key] = all[key]; // Preserve safe properties like tokens or folder IDs
    } else {
      deleteCount++;
    }
  });

  if (deleteCount === 0) {
    const skipMsg = 'No legacy keys matching current deletion criteria were found.';
    Logger.log(skipMsg);
    if (ui) ui.alert('Clean Complete', skipMsg, ui.ButtonSet.OK);
    return;
  }

  // 🟢 FIXED: Overwrite the property store in a single $O(1)$ network transaction step.
  // Setting the second argument to 'true' instantly flushes out any unmapped legacy keys.
  props.setProperties(retainedProperties, true);

  const outputMsg = `Successfully purged ${deleteCount} legacy properties in a single transaction block. Total properties remaining: ${Object.keys(retainedProperties).length}`;
  Logger.log(outputMsg);
  console.log(outputMsg);

  if (ui) {
    ui.alert('🎉 Purge Operation Successful', outputMsg, ui.ButtonSet.OK);
  }
}
