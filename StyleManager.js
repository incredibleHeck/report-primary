// ==========================================
// HECTECH StyleManager.js (Hardened Architecture)
// ==========================================

const StyleManager = {
    // Premium Accents: Electric Cyan for high contrast visibility on dark report blocks
    ACTIVE_COLOR: "#00f9ff",
    ACTIVE_WEIGHT: "bold",
    
    // 🟢 FIXED: Adjusted theme defaults to protect text contrast on premium dark canvases
    DEFAULT_COLOR: "#ffffff", // Pure high-visibility white text color
    DEFAULT_WEIGHT: "normal",
    DEFAULT_BG: null,         // Passing null cleanly restores Google's native grid rendering

    /**
     * Applies the premium HecTech active style matrix to a targeted range.
     * @param {GoogleAppsScript.Spreadsheet.Range} range - Target cells collection.
     */
    applyActiveStyle: function (range) {
        if (!range) return;
        range.setFontColor(this.ACTIVE_COLOR);
        range.setFontWeight(this.ACTIVE_WEIGHT);
    },

    /**
     * Securely reverts cells back to their cached style layers (Undo Path).
     * Hardened against null parameters and structural dimension anomalies.
     */
    revertStyle: function (range, baseColors, baseWeights) {
        if (!range) return;
        
        // 🟢 FIXED: Upgraded array verification guards against structural shape anomalies
        if (!Array.isArray(baseColors) || baseColors.length === 0 || !Array.isArray(baseColors[0])) {
            console.warn("StyleManager: Undo cancelled. Source color matrix is missing or invalid.");
            return;
        }

        const rows = range.getNumRows();
        const cols = range.getNumColumns();

        if (baseColors.length !== rows || baseColors[0].length !== cols) {
            console.warn(`StyleManager: Undo skipped due to grid scale mismatch. Range is ${rows}x${cols}, payload is ${baseColors.length}x${baseColors[0].length}.`);
            return;
        }

        range.setFontColors(baseColors);
        
        if (Array.isArray(baseWeights) && baseWeights.length === rows && baseWeights[0].length === cols) {
            range.setFontWeights(baseWeights);
        }
    },

    /**
     * Resets range attributes, clears text notes, and flushes background highlights.
     * @param {GoogleAppsScript.Spreadsheet.Range} range - Target cells collection.
     */
    resetToDefault: function (range) {
        if (!range) return;

        // Apply baseline dark theme styles safely
        range.setFontColor(this.DEFAULT_COLOR);
        range.setFontWeight(this.DEFAULT_WEIGHT);
        
        // 🟢 FIXED: Actually invokes the layout clearing process to reset background highlights
        range.setBackground(this.DEFAULT_BG); 
        range.clearNote(); 
    },
    
    /**
     * Highlight a cells block with an error overlay if an API call fails.
     */
    applyAlertStyle: function (range, alertText) {
        if (!range) return;
        range.setBackground("#7a2a1d"); // High-contrast crimson error panel background
        if (alertText) {
            range.setNote(String(alertText));
        }
    }
};
