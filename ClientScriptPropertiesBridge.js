// ==========================================
// HECTECH ClientScriptPropertiesBridge.js (Hardened)
// ==========================================

const ClientScriptPropertiesBridge = {
  _snapshot: null,

  /**
   * Hydrates the global snapshot state securely and flushes out stale cached layers automatically.
   * * @param {Object} rawProps - Direct key-value configuration payload from parent container shell.
   */
  hydrate: function (rawProps) {
    this._snapshot = rawProps && typeof rawProps === 'object' ? Object.assign(Object.create(null), rawProps) : {};
    
    // 🟢 FIXED: Automatic structural invalidation step forces cache sync on hydration runs
    this.clearDependentCaches();
  },

  isHydrated: function () {
    return this._snapshot !== null;
  },

  /** Live snapshot reference (read-only architecture guard) */
  getSnapshot: function () {
    return this._snapshot;
  },

  /** Full key lookup matrix abstraction layer */
  getRawProperty: function (fullKey) {
    if (!this._snapshot || !fullKey) return null;
    const v = this._snapshot[fullKey];
    return v != null && String(v).trim() !== '' ? v : null;
  },

  /**
   * 🟢 THREE-TIER FALLBACK CONFIGURATION RESOLUTION CHAIN
   * Resolves properties within the hydration scope to bypass library permission limits.
   * * Resolution Priority Hierarchy:
   * 1. Sheet-Specific Overlays (e.g., GEMINI_MODEL_NAME_192847192)
   * 2. Global Container Properties (e.g., GEMINI_MODEL_NAME)
   * 3. Core Hardcoded Default Manifest (ClientContainerDefaults)
   */
  getConfigValue: function (baseKey, ssId) {
    if (!this._snapshot) return null;
    
    // Tier 1: Look up the sheet-specific configuration overlay
    if (ssId) {
      const clientKey = baseKey + '_' + ssId;
      const valTier1 = this._snapshot[clientKey];
      if (valTier1 != null && String(valTier1).trim() !== '') return valTier1;
    }
    
    // Tier 2: Look up the container-wide global property overlay
    const valTier2 = this._snapshot[baseKey];
    if (valTier2 != null && String(valTier2).trim() !== '') return valTier2;
    
    // Tier 3: Core Framework Fallback Intercept
    // Safely reads from the local defaults bundle to avoid broken library-scope PropertiesService lookups
    if (typeof ClientContainerDefaults !== 'undefined') {
      const defaultBundle = ClientContainerDefaults.getBundled();
      if (defaultBundle && defaultBundle.hasOwnProperty(baseKey)) {
        return defaultBundle[baseKey];
      }
    }
    
    return null;
  },

  /**
   * Instantly flushes stale configuration layers across active global systems
   */
  clearDependentCaches: function() {
    if (typeof DynamicConfig !== 'undefined' && DynamicConfig._cache) {
      DynamicConfig._cache = Object.create(null); // Clean allocation bypasses prototype pollution hazards
    }
    if (typeof Config !== 'undefined' && Config._cache) {
      Config._cache = Object.create(null);
    }
  }
};

/**
 * External interface bindings wired directly to the parent container spreadsheet container execution hooks
 */
function hydrateClientScriptProperties(rawProps) {
  ClientScriptPropertiesBridge.hydrate(rawProps);
}

function invalidateConfigCache() {
  ClientScriptPropertiesBridge.clearDependentCaches();
}
