// ==========================================
// HECTECH StyleManager.js
// ==========================================
const StyleManager = {
    // Config: Bright Cyan for high visibility on dark/brown backgrounds
    ACTIVE_COLOR: "#00f9ff",
    ACTIVE_WEIGHT: "bold",
    // Default styles for "Reset" actions
    DEFAULT_COLOR: "#000000",
    DEFAULT_WEIGHT: "normal",
    DEFAULT_BG: "#ffffff",
    /**
     * Applies the HecTech active style (Cyan/Bold) to the given range.
     */
    applyActiveStyle: function (range) {
        range.setFontColor(this.ACTIVE_COLOR);
        range.setFontWeight(this.ACTIVE_WEIGHT);
    },
    /**
     * Reverts the range to provided base colors and weights.
     */
    revertStyle: function (range, baseColors, baseWeights) {
        const rows = range.getNumRows();
        const cols = range.getNumColumns();
        if (!baseColors || baseColors.length !== rows || baseColors[0].length !== cols) {
            console.warn("StyleManager: Undo skipped. Range size mismatch.");
            return;
        }
        range.setFontColors(baseColors);
        range.setFontWeights(baseWeights);
    },
    /**
     * Completely cleans the range (removes color/bold/background).
     */
    resetToDefault: function (range) {
        range.setFontColor(this.DEFAULT_COLOR);
        range.setFontWeight(this.DEFAULT_WEIGHT);
        range.clearNote();
    },
};
