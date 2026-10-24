/** Shared arithmetic for the MCE editor. Percentages use integer hundredths. */
(function (root, factory) {
  const model = factory();
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.MceWeightsModel = model;
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
  const codes = Object.freeze([
    'spatial_accessibility', 'infrastructure_readiness',
    'property_cost_market_competitiveness', 'nearby_businesses', 'risk_constraints'
  ]);
  const units = value => Math.round(value * 100);
  const bounds = (criteria, code) => ({
    min: units(Number(criteria?.[code]?.rangeMin ?? 5)),
    max: units(Number(criteria?.[code]?.rangeMax ?? 60))
  });

  function validate(weights, criteria) {
    const errors = {};
    let totalUnits = 0;
    codes.forEach(code => {
      const value = weights?.[code];
      const range = bounds(criteria, code);
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        errors[code] = 'Enter a weight.';
        return;
      }
      totalUnits += units(value);
      if (value < range.min / 100 || value > range.max / 100) {
        errors[code] = `Use ${range.min / 100}% to ${range.max / 100}%.`;
      } else if (Math.abs(value * 100 - units(value)) > 0.000001) {
        errors[code] = 'Use at most two decimal places.';
      }
    });
    const fieldsValid = Object.keys(errors).length === 0;
    return { errors, total: totalUnits / 100, fieldsValid, balanced: totalUnits === 10000, valid: fieldsValid && totalUnits === 10000 };
  }

  function rebalance(weights, lockedCode, criteria) {
    if (!codes.includes(lockedCode) || !validate(weights, criteria).fieldsValid) return null;
    const result = { [lockedCode]: units(weights[lockedCode]) };
    let remaining = 10000 - result[lockedCode];
    let pending = codes.filter(code => code !== lockedCode);
    const minTotal = pending.reduce((sum, code) => sum + bounds(criteria, code).min, 0);
    const maxTotal = pending.reduce((sum, code) => sum + bounds(criteria, code).max, 0);
    if (remaining < minTotal || remaining > maxTotal) return null;

    // Water filling preserves relative priorities until a criterion reaches its bounds.
    while (pending.length) {
      const sum = pending.reduce((total, code) => total + weights[code], 0);
      const shares = pending.map(code => ({ code, value: remaining * weights[code] / sum }));
      const capped = shares.filter(({ code, value }) => {
        const range = bounds(criteria, code);
        return value < range.min || value > range.max;
      });
      if (capped.length) {
        capped.forEach(({ code, value }) => {
          const range = bounds(criteria, code);
          result[code] = Math.max(range.min, Math.min(range.max, Math.round(value)));
          remaining -= result[code];
        });
        pending = pending.filter(code => !(code in result));
        continue;
      }
      shares.forEach(({ code, value }) => { result[code] = Math.floor(value); });
      let residual = remaining - shares.reduce((sum, { code }) => sum + result[code], 0);
      shares.sort((a, b) => (b.value - Math.floor(b.value)) - (a.value - Math.floor(a.value)));
      for (const { code } of shares) {
        if (residual > 0 && result[code] < bounds(criteria, code).max) {
          result[code] += 1;
          residual -= 1;
        }
      }
      if (residual !== 0) return null;
      pending = [];
    }
    const balanced = Object.fromEntries(codes.map(code => [code, result[code] / 100]));
    return validate(balanced, criteria).valid ? balanced : null;
  }

  function equal(left, right) {
    return codes.every(code => Number.isFinite(left?.[code]) && Number.isFinite(right?.[code]) && units(left[code]) === units(right[code]));
  }
  return Object.freeze({ codes, validate, rebalance, equal });
});
