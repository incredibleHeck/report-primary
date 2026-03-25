// ==========================================
// HECTECH SelectionProcessor.js
// ==========================================

const SelectionProcessor = {
    getSmartSelection: function () {
        const sheet = SpreadsheetApp.getActiveSheet();
        const activeRange = sheet.getActiveRange();
        
        // 🛑 SAFETY LOCK: Report Sheets are Read-Only
        if (sheet.getName().toUpperCase().includes("REPORT")) {
            SpreadsheetApp.getUi().alert("🚫 REPORT SHEET LOCKED. Please run this tool on the Subject Sheets (e.g., Mathematics, English).");
            return null;
        }

        const maxRows = sheet.getMaxRows();
        const numRows = activeRange.getNumRows();
        // Detect if user selected the whole column (clicked the header letter)
        const isFullColumn = (numRows >= (maxRows - 5)); 
        // Detect if user just clicked a single cell to start
        const isSingleCell = (numRows === 1 && activeRange.getNumColumns() === 1);

        if (isFullColumn || isSingleCell) {
            const studentCount = this.getRealStudentCount();
            if (studentCount === 0) return activeRange;

            // 🟢 CONFIG SOURCE OF TRUTH: Start Row (3)
            const startRowOffset = Config.DATA_START_ROW; 
            
            const activeColumn = activeRange.getColumn();
            const numColumns = activeRange.getNumColumns();

            console.log(`Smart Selection: Limit set to ${studentCount} students starting at Row ${startRowOffset}.`);
            
            // Return range starting strictly at the Configured Data Row
            return sheet.getRange(startRowOffset, activeColumn, studentCount, numColumns);
        }

        return activeRange;
    },

    getRealStudentCount: function() {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        
        // 🟢 CONFIG SOURCE OF TRUTH: Sheet Name
        const classListSheet = ss.getSheetByName(Config.CLASSLIST_SHEET_NAME);
        
        if (!classListSheet) return 0;

        // 🟢 CONFIG SOURCE OF TRUTH: Name Column
        const nameCol = Config.CLASSLIST_NAME_COL; 

        const lastRow = classListSheet.getLastRow();
        if (lastRow < 2) return 0;

        // Classlist data always starts at Row 2 (Row 1 is Header)
        // We fetch only the Name Column to count validity
        const data = classListSheet.getRange(2, nameCol, lastRow - 1, 1).getValues();
        
        let count = 0;
        for (let i = 0; i < data.length; i++) {
            // Count rows where the name is not empty
            if (data[i][0] && String(data[i][0]).trim().length > 0) {
                count++;
            }
        }
        return count;
    },
    
    // Helper for array mapping
    processData: function (data, callback, options = {}) {
        return data.map((row, rIndex) => {
            return row.map((cellValue, cIndex) => {
                try { return callback(cellValue, rIndex, cIndex); } 
                catch (e) { return cellValue; }
            });
        });
    },
};