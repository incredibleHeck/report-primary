// ==========================================
// HECKTECK RangeValidator.js
// ==========================================

const RangeValidator = {
    /**
     * Trims the selection to ensure it only includes valid data rows.
     * Starts strictly at Config.DATA_START_ROW (3).
     */
    getValidDataRange: function (range) {
        const sheet = range.getSheet();
        const lastRow = sheet.getLastRow();
        
        // 1. Logic for Subject Sheets (Polish/Pronouns/Audit)
        // We force the start to Row 3 (Config.DATA_START_ROW)
        const minStartRow = Config.DATA_START_ROW; 
        
        // If user selects Row 1 (header), we force start at Row 3.
        const startRow = Math.max(minStartRow, range.getRow());
        
        // Ensure we don't go past the actual data in the sheet
        const endRow = Math.min(lastRow, range.getRow() + range.getNumRows() - 1);
        
        // Validation: If selection is entirely in the header zone (e.g. Row 1-2 only)
        if (startRow > endRow) {
            SpreadsheetApp.getActiveSpreadsheet().toast(`⚠️ Please select data starting from Row ${minStartRow}.`, "HeckTeck");
            return null;
        }
        
        return sheet.getRange(startRow, range.getColumn(), (endRow - startRow) + 1, range.getNumColumns());
    },
};