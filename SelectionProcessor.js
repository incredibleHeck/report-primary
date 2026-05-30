// ==========================================
// HECTECH SelectionProcessor.js (Hardened)
// ==========================================

const SelectionProcessor = {
    /**
     * Dynamically scales column or cell selections to capture the active student rows.
     * Starts strictly at the standardized row data boundary (Row 3).
     */
    getSmartSelection: function () {
        const sheet = SpreadsheetApp.getActiveSheet();
        const activeRange = sheet.getActiveRange();
        
        // 🛑 SAFETY LOCK: Report Sheets are Read-Only elements
        if (sheet.getName().toUpperCase().includes("REPORT") || sheet.getName().toUpperCase().includes("DASHBOARD")) {
            SpreadsheetApp.getUi().alert("🚫 REPORT SHEET LOCKED.\n\nPlease run this tool on a valid Subject Sheet (e.g., Mathematics, English).");
            return null;
        }

        const maxRows = sheet.getMaxRows();
        const numRows = activeRange.getNumRows();
        
        // Detect full-column selections (e.g., clicking column letter headers)
        const isFullColumn = (numRows >= (maxRows - 5)); 
        // Detect single-cell initialization clicks
        const isSingleCell = (numRows === 1 && activeRange.getNumColumns() === 1);

        if (isFullColumn || isSingleCell) {
            const studentHeight = this.getRealStudentHeight();
            if (studentHeight === 0) return activeRange;

            // 🟢 CONFIG SOURCE OF TRUTH ALIGNMENT: Baseline Data Row 3
            const startRowOffset = (typeof Config !== 'undefined' && Config.DATA_START_ROW) ? Config.DATA_START_ROW : 3; 
            
            const activeColumn = activeRange.getColumn();
            const numColumns = activeRange.getNumColumns();

            if (typeof DEBUG_LOG !== 'undefined') {
                console.log(`Smart Selection Active: Bound set to ${studentHeight} data rows starting at Row ${startRowOffset}.`);
            }
            
            // Return range mapped from Row 3 down to the bottom student entry row
            return sheet.getRange(startRowOffset, activeColumn, studentHeight, numColumns);
        }

        return activeRange;
    },

    /**
     * Determines the total row height by locating the last text cell in the master registry.
     * Prevents data gaps from clipping trailing rows.
     */
    getRealStudentHeight: function() {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheetName = (typeof Config !== 'undefined' && Config.CLASSLIST_SHEET_NAME) ? Config.CLASSLIST_SHEET_NAME : "CLASSLIST";
        const classListSheet = ss.getSheetByName(sheetName);
        
        if (!classListSheet) return 0;

        const nameCol = (typeof Config !== 'undefined' && Config.CLASSLIST_NAME_COL) ? Config.CLASSLIST_NAME_COL : 2; 
        const lastRow = classListSheet.getLastRow();
        
        // Standardized data row start index reference
        const dataStartRow = (typeof Config !== 'undefined' && Config.DATA_START_ROW) ? Config.DATA_START_ROW : 3;
        
        if (lastRow < dataStartRow) return 0;

        // Fetch values from standard row start to the edge of the sheet data range
        const totalRowsToFetch = (lastRow - dataStartRow) + 1;
        const data = classListSheet.getRange(dataStartRow, nameCol, totalRowsToFetch, 1).getValues();
        
        let visualLastRowOffset = 0;
        
        // 🟢 HARDENED BACKWARD SCANNER: Loops upward from the bottom to find the true student row edge
        for (let i = data.length - 1; i >= 0; i--) {
            if (data[i][0] !== "" && data[i][0] != null && String(data[i][0]).trim().length > 0) {
                visualLastRowOffset = i + 1; // Converts index base to standard length height
                break;
            }
        }
        
        return visualLastRowOffset;
    },
    
    /**
     * Helper for transactional matrix array routing
     */
    processData: function (data, callback, options = {}) {
        if (!Array.isArray(data)) return [];
        return data.map((row, rIndex) => {
            if (!Array.isArray(row)) return [];
            return row.map((cellValue, cIndex) => {
                try { 
                    return callback(cellValue, rIndex, cIndex); 
                } catch (e) { 
                    return cellValue; 
                }
            });
        });
    }
};