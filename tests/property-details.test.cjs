const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

(async () => {
  const source = readFileSync('assets/js/property-details-view.js', 'utf8');
  const { assessmentCalculation, calculationMarkup, propertyDetailsMarkup, setupPropertyDetailsPrint } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const keys = ['spatial_accessibility', 'infrastructure_readiness', 'economic_viability', 'nearby_businesses', 'zoning_compatibility', 'risk_constraints', 'environmental_safety'];
  const property = {
    id: 10, name: 'A <sample> property', area: .25, price: 5000000, lat: 16.6, lng: 120.3,
    assessmentComplete: true, mceScore: 84, iaiScore: 87.4,
    assessmentCriteria: Object.fromEntries(keys.map((key, i) => [key, [50, 100, 85, 85, 100, 85, 100][i]])),
    assessmentMode: 'automatic', criteriaDetails: { spatial_accessibility: {
      raw: { road_distance_m: 485.17 }, conversion: 'road_distance_m <= 50 → 100; otherwise → 50',
      evidence: [{ source: 'Road inventory', reference: 'ROAD-01', version: '2026-01', verifiedAt: '2026-01-25', sha256: 'abc123' }],
    } },
  };
  const calc = assessmentCalculation(property);
  assert.equal(calc.complete, true);
  assert.deepEqual(calc.rows.map(row => row.contribution), [10, 20, 17, 8.5, 15, 8.5, 5]);
  assert.deepEqual(calc.components.map(row => row.contribution), [50.4, 17, 20]);
  const markup = calculationMarkup(property);
  assert(markup.includes('round(10 + 20 + 17 + 8.5 + 15 + 8.5 + 5, 1) = 84.0'));
  assert(markup.includes('round(50.4 + 17 + 20, 1) = 87.4'));
  const precise = { ...property, assessmentCriteria: { ...property.assessmentCriteria, economic_viability: 77.77 } };
  assert(calculationMarkup(precise).includes('<td>77.77</td><td>20%</td><td>15.554</td>'), 'Recorded criterion precision must match its weighted contribution');

  // IAI uses the rounded MCE returned by the server, rather than an unrounded re-total.
  const rounded = assessmentCalculation({ ...property, mceScore: 80.3 });
  assert.equal(rounded.components[0].contribution, 48.18);
  const partial = { ...property, assessmentComplete: false, assessmentCriteria: { ...property.assessmentCriteria, economic_viability: null, spatial_accessibility: 0 } };
  const pending = assessmentCalculation(partial);
  assert.equal(pending.mce, null, 'A stale total must not appear for an incomplete assessment');
  assert.equal(pending.iai, null);
  assert.equal(pending.rows[0].score, 0, 'Zero is a valid recorded rating');
  assert.equal(pending.rows[0].contribution, 0);
  assert.equal(pending.rows[2].contribution, null, 'Missing evidence is not zero');
  assert(calculationMarkup(partial).includes('Assessment pending · 6 of 7'));

  const options = { role: 'guest', investor: false, saved: new Set(), compare: [], broker: null, canInquire: false, path: value => `/${value}`, imageUrl: () => '/sample.jpg', printHeaderMarkup: () => '', printFooterMarkup: () => '', printButtonMarkup: () => '', nearbyBusinessesMarkup: () => '', evaluationMarkup: () => '', investorTools: () => '', policy: {} };
  const details = propertyDetailsMarkup(property, options);
  assert(details.includes('A &lt;sample&gt; property'));
  assert(details.includes('Road inventory') && details.includes('ROAD-01') && details.includes('abc123'));
  assert(details.includes('485.17'));
  assert(propertyDetailsMarkup(precise, options).includes('77.77 / 100'), 'Evidence ratings retain their recorded precision');
  for (const [areaMethod, label] of [['declared', 'Declared area'], ['survey', 'Recorded survey area'], [undefined, 'Recorded area']]) {
    const areaDetails = propertyDetailsMarkup({ ...property, parcel: { areaMethod, surveyAreaSqm: 2500 } }, options);
    assert(areaDetails.includes(`<dt>${label}</dt><dd>2,500 m²</dd>`), 'Recorded area label must reflect its source');
  }
  const areaOnly = propertyDetailsMarkup({ ...partial, lat: null, lng: null, hasExactLocation: false }, options);
  assert(!areaOnly.includes('id="cityPropertyMap"'), 'An area-only listing must not create a map at 0,0');
  assert(areaOnly.includes('Exact location has not been recorded.'));
  const locationOnly = propertyDetailsMarkup({ ...partial, area: null, landArea: null }, options);
  assert(locationOnly.includes('<span>Land area</span><strong>Not specified</strong>'));
  assert(!locationOnly.includes('0 m²'));
  assert(locationOnly.includes('id="cityPropertyMap"'));

  const handlers = {};
  global.window = { addEventListener: (event, callback) => { handlers[event] = callback; } };
  const disclosures = [{ open: false }, { open: true }];
  const print = setupPropertyDetailsPrint({ querySelectorAll: () => disclosures });
  print.expand(); handlers.beforeprint();
  assert(disclosures.every(item => item.open), 'Every evidence/calculation section must be expanded for print');
  handlers.afterprint();
  assert.deepEqual(disclosures.map(item => item.open), [false, true], 'Printing must restore the reader’s disclosure choices');
  console.log('PASS: MCE/IAI components, rounded MCE basis, zero vs missing, stale-score withholding, evidence, escaping, nullable area/location and print disclosures.');
})().catch(error => { console.error(error); process.exitCode = 1; });
