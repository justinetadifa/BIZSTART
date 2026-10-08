const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');

(async () => {
  const source = readFileSync('assets/js/property-details-view.js', 'utf8').replace('./utils.js', pathToFileURL(resolve('assets/js/utils.js')).href);
  const { assessmentCalculation, calculationMarkup, propertyDetailsMarkup, setupPropertyDetailsPrint, propertyHazardSummary, propertyLocationLabel } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
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
  const unpriced = propertyDetailsMarkup({ ...property, price: null, salePrice: null }, options);
  assert(unpriced.includes('Price on request') && !unpriced.includes('PHP 0'), 'Missing prices must not display as zero');
  assert(propertyDetailsMarkup({ ...property, price: 0, salePrice: 0 }, options).includes('PHP 0'), 'Recorded zero prices remain visible');
  const lease = propertyDetailsMarkup({ ...property, listingPurpose: 'lease', leasePrice: 250, leasePriceUnit: 'sqm', leasePeriod: 'month' }, options);
  assert(lease.includes('For Lease') && lease.includes('PHP 250 / m² / month') && !lease.includes('PHP 5,000,000'), 'Lease prices include their unit and period, without implying a sale');

  // Basic keeps factual safety findings and contact/map essentials; evidence and models live in Advanced.
  const recordedRisk = { ...property, criteriaDetails: { ...property.criteriaDetails,
    risk_constraints: { raw: { hazard_status: ['high_flood_susceptibility', 'outside_mapped_landslide_hazards'] }, missingData: ['Confirm parcel-wide coverage.'], evidence: [{ source: 'City hazard inventory', reference: 'HAZ-01', verifiedAt: '2026-01-25' }] },
    environmental_safety: { raw: { environment_status: 'further_review_required' } },
  } };
  const riskDetails = propertyDetailsMarkup(recordedRisk, options);
  const safetySection = riskDetails.slice(riskDetails.indexOf('<section class="property-panel property-safety"'), riskDetails.indexOf('<div class="property-advanced"'));
  assert(safetySection.includes('high flood susceptibility') && safetySection.includes('Confirm parcel-wide coverage.'));
  assert(safetySection.includes('City hazard inventory') && safetySection.includes('HAZ-01'));
  assert(!safetySection.includes('data-investor-advanced'), 'Safety warnings cannot be hidden by the Basic view gate');
  assert.equal(propertyHazardSummary(recordedRisk), 'Hazard screening: high flood susceptibility, outside mapped landslide hazards (review incomplete) · Environmental screening: further review required');
  assert(propertyHazardSummary(property).includes('Hazard screening: Not assessed'), 'A high risk rating without factual classifications must not imply safety');
  const spatialRisk = { ...property, spatialContext: [{ key: 'hazard_status', value: ['moderate_flood_susceptibility'] }] };
  assert(propertyHazardSummary(spatialRisk).includes('moderate flood susceptibility'), 'Recorded spatial evidence remains visible when criterion details are absent');
  const escapedRisk = propertyDetailsMarkup({ ...recordedRisk, criteriaDetails: { risk_constraints: { raw: { hazard_status: '<script>alert(1)</script>' }, missingData: ['<img onerror=alert(1)>'] } } }, options);
  assert(escapedRisk.includes('&lt;script&gt;alert(1)&lt;/script&gt;') && !escapedRisk.includes('<script>'), 'Safety findings are escaped as recorded text');
  assert(details.includes('<div class="property-advanced" data-investor-advanced>'));
  assert(details.indexOf('id="propertyHazardsSection"') < details.indexOf('<div class="property-advanced"'), 'Essential safety information precedes the advanced assessment');
  assert(details.indexOf('class="property-panel property-contact"') < details.indexOf('id="propertyAssessmentSection"'), 'The main contact action remains ahead of the advanced assessment');
  assert(details.includes('class="property-radar-result"') && details.includes('<dt>Economic viability</dt><dd>85 <span>/ 100</span>'), 'Radar shows recorded criterion ratings with a text equivalent');
  assert(!propertyDetailsMarkup(partial, options).includes('class="property-radar-result"'), 'An incomplete radar must not plot missing scores as zero');
  assert(propertyDetailsMarkup(partial, options).includes('Missing evidence is not plotted as zero.'));
  const approximateDetails = propertyDetailsMarkup({ ...property, hasExactLocation: false }, options);
  assert(approximateDetails.includes('id="cityPropertyMap"') && approximateDetails.includes('Approximate pin'), 'An approximate recorded coordinate remains useful on the map with an honest label');
  assert(approximateDetails.includes('This pin shows an approximate location.'));
  assert.equal(propertyLocationLabel({ lat: 16, lng: 120 }), 'Recorded location', 'Coordinates alone cannot establish survey precision');
  assert.equal(propertyLocationLabel({ parcel: { coordinatePrecision: 'approximate' } }), 'Approximate location');
  assert(!propertyDetailsMarkup(property, { ...options, role: 'admin' }).includes('data-investor-basic'), 'Staff without a view toggle should not receive instructions to use it');
  const investorDetails = propertyDetailsMarkup(property, { ...options, role: 'investor', investor: true, canInquire: true, investorTools: () => '<details id="cityDocumentsPanel"><summary>Request documents</summary></details>' });
  assert(investorDetails.includes('href="/property-details.php?id=10#cityInquiryPanel"'), 'The contact anchor stays on the details page despite the shared base URL');
  assert(details.includes('href="/property-details.php?id=10#propertyLocationSection"'), 'Section navigation includes the property page and ID');
  for (const marker of ['data-save="10"', 'data-compare="10"', 'id="cityInquiryPanel"', 'id="cityInquiryForm"', 'id="cityDocumentsPanel"']) assert(investorDetails.includes(marker), `Existing investor action ${marker} stays available`);

  const handlers = {};
  global.window = { addEventListener: (event, callback) => { handlers[event] = callback; } };
  const disclosures = [{ open: false }, { open: true }];
  const print = setupPropertyDetailsPrint({ querySelectorAll: () => disclosures });
  print.expand(); handlers.beforeprint();
  assert(disclosures.every(item => item.open), 'Every evidence/calculation section must be expanded for print');
  handlers.afterprint();
  assert.deepEqual(disclosures.map(item => item.open), [false, true], 'Printing must restore the reader’s disclosure choices');
  console.log('PASS: MCE/IAI components, rounded MCE basis, missing values, source evidence, factual visible hazards, approximate locations, advanced radar/disclosures, investor actions and print state.');
})().catch(error => { console.error(error); process.exitCode = 1; });
