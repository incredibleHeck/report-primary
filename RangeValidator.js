// ==========================================
// HECTECH RangeValidator.js (Hardened)
// ==========================================

const RangeValidator = {
    /**
     * Trims and sanitizes selections to ensure only valid student data rows are processed.
     * Starts strictly at the standardized row data boundary (Row 3).
     *
     * @param {GoogleAppsScript.Spreadsheet.Range} range - The active user selection range.
     * @return {GoogleAppsScript.Spreadsheet.Range|null} Cleaned data range or null if selection is invalid.
     */
    getValidDataRange: function (range) {
        if (!range) return null;

        const sheet = range.getSheet();
        let lastRow = sheet.getLastRow();
        
        // 1. DEFENSIVE DEPENDENCY SAFETY: Protect lookups if Config is missing or unhydrated
        const minStartRow = (typeof Config !== 'undefined' && Config.DATA_START_ROW) ? Config.DATA_START_ROW : 3; 
        
        const selectedStartRow = range.getRow();
        const selectedNumRows = range.getNumRows();

        // 2. DETECT SHEET INFLATION: Scan the specific column range backward to find the true text end
        // This stops the system from processing empty rows if other columns contain long tracking notes.
        const targetCol = range.getColumn();
        if (lastRow > minStartRow) {
            const checkRange = sheet.getRange(minStartRow, targetCol, (lastRow - minStartRow) + 1, 1).getValues();
            let realLastRow = minStartRow;
            for (let i = checkRange.length - 1; i >= 0; i--) {
                if (checkRange[i][0] !== "" && checkRange[i][0] != null) {
                    realLastRow = minStartRow + i;
                    break;
                }
            }
            lastRow = realLastRow;
        }
        
        // 3. APPLY RIGID COMPRESSION BOUNDARIES
        const startRow = Math.max(minStartRow, selectedStartRow);
        const endRow = Math.min(lastRow, selectedStartRow + selectedNumRows - 1);
        
        // 4. BOUNDARY BREAK INTERCEPTIONS
        if (startRow > endRow || lastRow < minStartRow) {
            SpreadsheetApp.getActiveSpreadsheet().toast(
                `⚠️ Please highlight valid student rows (Row ${minStartRow}+).`, 
                "HecTech Validation"
            );
            return null;
        }
        
        const finalNumRows = (endRow - startRow) + 1;
        const finalNumCols = range.getNumColumns();
        
        return sheet.getRange(startRow, targetCol, finalNumRows, finalNumCols);
    },
};