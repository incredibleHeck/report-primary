// ==========================================
// HECTECH ClientScriptPropertiesBridge.js
// ==========================================
// Library code cannot read the parent project's Script Properties. The container
// script calls hydrateClientScriptProperties() before invoking the library so
// DynamicConfig and batch flows see the same keys the user stored locally.

const ClientScriptPropertiesBridge = {
  _snapshot: null,

  hydrate: function (rawProps) {
    this._snapshot = rawProps && typeof rawProps === 'object' ? Object.assign({}, rawProps) : {};
  },

  isHydrated: function () {
    return this._snapshot !== null;
  },

  /** Live snapshot reference (read-only for callers); null if never hydrated. */
  getSnapshot: function () {
    return this._snapshot;
  },

  /** Full key lookup (e.g. CTX_ENGLISH_<ssId>). */
  getRawProperty: function (fullKey) {
    if (!this._snapshot || !fullKey) return null;
    const v = this._snapshot[fullKey];
    return v != null && v !== '' ? v : null;
  },

  /** Same order as DynamicConfig: `${key}_${ssId}` then global `key`. */
  getConfigValue: function (baseKey, ssId) {
    if (!this._snapshot) return null;
    const clientKey = baseKey + '_' + ssId;
    let val = this._snapshot[clientKey];
    if (val != null && val !== '') return val;
    val = this._snapshot[baseKey];
    if (val != null && val !== '') return val;
    return null;
  }
};

function hydrateClientScriptProperties(rawProps) {
  ClientScriptPropertiesBridge.hydrate(rawProps);
}

function invalidateConfigCache() {
  if (typeof DynamicConfig !== 'undefined' && DynamicConfig._cache) {
    DynamicConfig._cache = {};
  }
}
