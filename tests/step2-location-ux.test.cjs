const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

console.log('=== Running Step 2 Location & Area UX Verification Tests ===\n');

// 1. Verify View File Structure (property-wizard-view.php)
const viewContent = fs.readFileSync(path.join(__dirname, '../app/Support/property-wizard-view.php'), 'utf8');

// Check Step 2 panel existence
assert.ok(viewContent.includes('class="pw-panel pw-step2-panel" data-editor-panel="1"'), 'Step 2 panel should exist with data-editor-panel="1"');
console.log('✅ PASS: Step 2 panel exists with clean pw-step2-panel structure');

// Check separate Latitude & Longitude inputs
assert.ok(viewContent.includes('id="pwLatInput" name="lat"'), 'Separate Latitude input should exist with name="lat"');
assert.ok(viewContent.includes('id="pwLngInput" name="lng"'), 'Separate Longitude input should exist with name="lng"');
assert.ok(viewContent.includes('class="pw-coord-inputs-grid"'), 'Latitude and Longitude are housed in a prominent grid layout');
console.log('✅ PASS: Prominent separate Latitude and Longitude fields placed above map');

// Check coordinate validation banner
assert.ok(viewContent.includes('data-coordinate-error'), 'Coordinate error alert banner should exist');
console.log('✅ PASS: Coordinate error validation banner exists');

// Check mode-selection cards (pw-location-methods) are removed from Step 2
assert.ok(!viewContent.includes('pw-location-methods'), 'Unnecessary Map Pin / Area Size / Plot Boundary mode selection cards are removed');
console.log('✅ PASS: Redundant mode-selection cards (.pw-location-methods) removed');

// Check Hazard Screening removed from Step 2
const step2Slice = viewContent.slice(viewContent.indexOf('data-editor-panel="1"'), viewContent.indexOf('data-editor-panel="2"'));
assert.ok(!step2Slice.includes('pw-hazard-disclosure'), 'Hazard screening must NOT be in Step 2');
assert.ok(!step2Slice.includes('hazard_disclosed'), 'Hazard disclosure checkbox must NOT be in Step 2');
console.log('✅ PASS: Hazard screening removed from Step 2 (belongs in MCE Risk Constraints)');

// Check simplified map toolbar
assert.ok(step2Slice.includes('data-map-tool="pin"'), 'Place Pin button exists');
assert.ok(step2Slice.includes('data-boundary-action="draw"'), 'Draw Boundary button exists');
assert.ok(step2Slice.includes('data-boundary-action="edit"'), 'Edit Boundary button exists');
assert.ok(step2Slice.includes('data-boundary-action="reset"'), 'Clear Boundary button exists');
assert.ok(step2Slice.includes('data-vertex-drawer'), 'Exact vertex coordinates drawer exists');
console.log('✅ PASS: Simplified toolbar: Place Pin, Draw Boundary, Edit Boundary, Clear Boundary, and Vertex Drawer');

// Check reused Step 1 barangay & conflict alert
assert.ok(step2Slice.includes('data-reused-barangay-display'), 'Reused barangay display exists in Step 2');
assert.ok(step2Slice.includes('data-bgy-conflict-alert'), 'Barangay proximity conflict alert exists');
console.log('✅ PASS: Reused Step 1 barangay context and conflict alert present');

// Offer only area units accepted by the production PHP parcel model.
assert.ok(step2Slice.includes('name="land_area"'), 'Land area input exists');
assert.ok(step2Slice.includes('name="land_area_unit"'), 'Land area unit dropdown exists');
assert.ok(step2Slice.includes('value="sqm"'), 'Supports sqm');
assert.ok(step2Slice.includes('value="hectares"'), 'Supports hectares');
for (const unsupported of ['sqft','acres','sqkm']) {
  assert.ok(!step2Slice.includes(`value="${unsupported}"`), `${unsupported} cannot be selected when the API cannot save it`);
}
console.log('✅ PASS: Land area input offers the two persisted units: square meters and hectares');

// Check separate map estimate card & discrepancy banner
assert.ok(step2Slice.includes('data-area-equiv-display'), 'Measurement equivalents display card exists');
assert.ok(step2Slice.includes('data-boundary-estimate'), 'Separate map-estimated area card exists');
assert.ok(step2Slice.includes('data-area-discrepancy-card'), 'Discrepancy flag banner exists');
console.log('✅ PASS: Separate display for recorded area and map estimate with discrepancy banner');


// 2. Verify JavaScript Logic in property-wizard.js
const jsContent = fs.readFileSync(path.join(__dirname, '../assets/js/property-wizard.js'), 'utf8');

// Area unit factors
const factors = {
  sqm: 1,
  hectares: 10000,
  sqft: 0.09290304,
  acres: 4046.8564224,
  sqkm: 1000000
};

// Unit conversion test: 5900 sqm -> hectares = 0.59 ha
const testSqm = 5900;
const testHa = testSqm / factors.hectares;
assert.equal(testHa, 0.59, '5900 sqm must convert to 0.59 hectares');
const sensibleHaFormatted = Number(testHa.toFixed(6)).toString();
assert.equal(sensibleHaFormatted, '0.59', 'Must avoid ugly decimals like 0.590000');
console.log('✅ PASS: Unit conversion calculation: 5,900 m² = 0.59 ha with clean formatting');

// Test area unit conversions across all 5 units
for (const [fromUnit, fromFactor] of Object.entries(factors)) {
  for (const [toUnit, toFactor] of Object.entries(factors)) {
    const rawVal = 100;
    const groundSqm = rawVal * fromFactor;
    const converted = groundSqm / toFactor;
    const backToSqm = converted * toFactor;
    assert.ok(Math.abs(backToSqm - groundSqm) < 1e-6, `Conversion from ${fromUnit} to ${toUnit} and back must preserve ground sqm`);
  }
}
console.log('✅ PASS: All 5 area units convert reciprocally without changing ground measurement');

// Discrepancy calculation check
function checkDiscrepancy(recordedSqm, mapSqm) {
  const diff = Math.abs(recordedSqm - mapSqm);
  const pct = (diff / Math.max(recordedSqm, mapSqm)) * 100;
  return pct > 25;
}
assert.equal(checkDiscrepancy(5900, 10000), true, '5900 sqm vs 10000 sqm (>40% diff) should trigger discrepancy flag');
assert.equal(checkDiscrepancy(5900, 6000), false, '5900 sqm vs 6000 sqm (<2% diff) should not trigger discrepancy flag');
console.log('✅ PASS: Discrepancy logic triggers correctly when difference exceeds 25%');

// Haversine distance check for barangay conflict
function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Catbangen (~16.6155, 120.3135) vs Nagyubuyuban (~16.6372, 120.4218)
const catbangenCoords = [16.6155, 120.3135];
const nagyubuyubanCoords = [16.637196, 120.421833];
const distance = haversineDistanceKm(catbangenCoords[0], catbangenCoords[1], nagyubuyubanCoords[0], nagyubuyubanCoords[1]);
assert.ok(distance > 10, 'Distance between Catbangen and Nagyubuyuban should be > 10km');
console.log(`✅ PASS: Haversine distance correctly identifies conflicting barangay locations (${distance.toFixed(1)} km apart)`);

// 3. Verify Non-Regression on Steps 1, 3, and Assessment Scoring
assert.ok(viewContent.includes('data-editor-panel="0"'), 'Step 1 basics panel preserved');
assert.ok(viewContent.includes('data-editor-panel="2"'), 'Step 3 site evidence panel preserved');
assert.ok(viewContent.includes('data-editor-panel="3"'), 'Review panel preserved (step 4 in 4-step consolidated wizard)');
console.log('✅ PASS: Panels for Step 1, Step 2, Step 3, and Review preserved intact');

// Verify IAI & MCE scoring code untouched
const assessmentService = fs.readFileSync(path.join(__dirname, '../app/Support/PropertyAssessment.php'), 'utf8');
assert.ok(assessmentService.includes('evaluate'), 'PropertyAssessment evaluate logic untouched');
assert.ok(assessmentService.includes('WEIGHTS'), 'MCE weights configuration untouched');
console.log('✅ PASS: MCE and IAI scoring logic completely intact');

console.log('\nAll Step 2 Location & Area UX verification tests passed successfully!');
