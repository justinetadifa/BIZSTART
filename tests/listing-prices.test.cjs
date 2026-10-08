const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

(async () => {
  const source = readFileSync('assets/js/utils.js', 'utf8');
  const utils = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const { safeNumber, listingPurposeLabel, listingPriceLabel, saleAskingPrice, compareSalePrices, buildDecisionPackModel, buildInvestmentLabModel, buildSensitivitySeries, calculateInvestmentReadiness, DEFAULT_WEIGHTS } = utils;
  const base = { id: 1, name: 'Sample property', price: 900, area: 1, pricePerSqm: .09, facilities: [], type: 'commercial', roadAccess: 80 };
  const missing = { ...base, price: null, salePrice: null };
  const lease = { ...base, listingPurpose: 'lease', leasePrice: 250, leasePeriod: 'month', leasePriceUnit: 'sqm' };
  assert.equal(safeNumber(''), null);
  assert.equal(safeNumber(null), null);
  assert.equal(safeNumber(0), 0);
  assert.equal(listingPriceLabel(missing), 'Price on request');
  assert.equal(listingPriceLabel({ ...base, price: 0 }), 'PHP 0');
  assert.equal(listingPurposeLabel(lease), 'For Lease');
  assert.equal(listingPriceLabel(lease), 'PHP 250 / m² / month');
  assert.equal(saleAskingPrice(lease), null, 'Recurring rent must not become purchase capital');
  assert.equal(saleAskingPrice({ ...base, salePrice: null }), null, 'Explicit missing sale price overrides a stale legacy price');
  assert.equal(listingPriceLabel({ ...base, listingPurpose: 'sale_or_lease', leasePrice: null }), 'Sale: PHP 900 · Lease: Price on request');
  assert.equal(listingPriceLabel({ ...lease, leasePrice: 0, leasePeriod: 'year', leasePriceUnit: 'total' }), 'PHP 0 / year');
  const cheaper = { ...base, id: 2, price: 100 };
  const entries = [missing, base, lease, cheaper];
  assert.deepEqual([...entries].sort(compareSalePrices).slice(0, 2).map(p => p.price), [100, 900]);
  assert.deepEqual([...entries].sort((a, b) => compareSalePrices(a, b, 'desc')).slice(0, 2).map(p => p.price), [900, 100]);
  const inputs = { capex: 100, revenue: 300, opex: 100, intent: 'commercial', horizon: '5', risk: 'balanced', equityPct: 40, interest: .1, exitCap: .05 };
  const model = property => buildDecisionPackModel(property, inputs, {}, [], DEFAULT_WEIGHTS, [base], '', {});
  const lab = property => buildInvestmentLabModel(property, inputs, {}, [], DEFAULT_WEIGHTS, [base], '', {});
  assert.equal(model(base).payback, 5, 'Known acquisition formula remains (sale ask + capex) / annual net');
  assert.equal(lab(base).equity, 400);
  for (const property of [missing, lease]) {
    assert.equal(model(property).payback, null);
    for (const key of ['payback', 'equity', 'debt', 'debtService', 'dscr']) assert.equal(lab(property)[key], null, `${key} requires an applicable purchase price`);
    assert(buildSensitivitySeries(property, 100, 300, 100).every(point => point.value === null));
    const economic = calculateInvestmentReadiness(property, [base]).pillars.economic;
    assert.equal(economic.indicators.find(item => item.key === 'price_competitiveness').normalizedScore, null);
  }
  console.log('PASS: nullable prices, preserved zero, separate purpose and lease units, unknown-last sorts, and acquisition estimates with missing or lease-only prices.');
})().catch(error => { console.error(error); process.exitCode = 1; });
