(function (root) {
  'use strict';
  const baseline = Object.freeze({spatial_accessibility:25, infrastructure_readiness:25,
    property_cost_market_competitiveness:20, nearby_businesses:15, risk_constraints:15});
  const keys = Object.keys(baseline);
  function normalize(input) {
    if (!input || typeof input !== 'object') return null;
    const weights = {};
    for (const key of keys) {
      const value = input[key] ?? (key === 'property_cost_market_competitiveness' ? input.economic_viability : undefined);
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 5 || value > 60 || Math.abs(value * 100 - Math.round(value * 100)) > 1e-7) return null;
      weights[key] = value;
    }
    if (Math.abs(Object.values(weights).reduce((a, b) => a + b, 0) - 100) > 1e-7) return null;
    if (input.zoning_compatibility != null && input.zoning_compatibility !== 0) return null;
    return weights;
  }
  function create(initial = {}) {
    let weights = normalize(initial.weights) || {...baseline};
    let version = typeof initial.version === 'string' ? initial.version : '';
    let confirmed = Boolean(normalize(initial.weights));
    return {
      get weights() { return {...weights}; },
      get version() { return version; },
      get confirmed() { return confirmed; },
      weight(key) { return key === 'zoning_compatibility' ? 0 : weights[key === 'economic_viability' ? 'property_cost_market_competitiveness' : key]; },
      update(configuration) {
        const next = normalize(configuration?.weights);
        if (!next || typeof configuration.version !== 'string' || !configuration.version.trim()) return false;
        weights = next; version = configuration.version; confirmed = true;
        return true;
      }
    };
  }
  const api = {baseline, normalize, create};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SFCMceWeights = api;
})(typeof window !== 'undefined' ? window : globalThis);
