const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Execute the production parser so regressions cannot hide behind a copied implementation.
const vm = require('vm');
const wizardSource = fs.readFileSync(path.join(__dirname, '../assets/js/property-wizard.js'), 'utf8');
const parserStart = wizardSource.indexOf('    const parseCoordinates = ');
const parserEnd = wizardSource.indexOf('    function updateCoordinateDetailsSummary', parserStart);
assert(parserStart >= 0 && parserEnd > parserStart, 'Production parser must be present');
const parseCoordinates = vm.runInNewContext(`${wizardSource.slice(parserStart, parserEnd)}; parseCoordinates;`);

console.log('=== Running Coordinate Parsing & Integration Tests ===\n');

// 1. Standard decimal comma separated
const t1 = parseCoordinates('16.615852, 120.316482');
assert(t1 !== null, 'Decimal comma separated should parse');
assert(Math.abs(t1.lat - 16.615852) < 0.000001, 'Latitude should match');
assert(Math.abs(t1.lng - 120.316482) < 0.000001, 'Longitude should match');
console.log('✅ PASS: Standard decimal comma-separated');

// 2. Decimal space separated
const t2 = parseCoordinates('16.615852 120.316482');
assert(t2 !== null, 'Decimal space separated should parse');
assert(Math.abs(t2.lat - 16.615852) < 0.000001);
assert(Math.abs(t2.lng - 120.316482) < 0.000001);
console.log('✅ PASS: Decimal space-separated');

// 3. Parentheses wrapped
const t3 = parseCoordinates('(16.615852, 120.316482)');
assert(t3 !== null, 'Parentheses wrapped should parse');
assert(Math.abs(t3.lat - 16.615852) < 0.000001);
assert(Math.abs(t3.lng - 120.316482) < 0.000001);
console.log('✅ PASS: Parentheses wrapped coordinates');

// 4. Reversed lng, lat order (e.g. 120.316482, 16.615852)
const t4 = parseCoordinates('120.316482, 16.615852');
assert(t4 !== null, 'Reversed coordinates should swap and parse');
assert(Math.abs(t4.lat - 16.615852) < 0.000001, 'Latitude should be swapped correctly');
assert(Math.abs(t4.lng - 120.316482) < 0.000001, 'Longitude should be swapped correctly');
console.log('✅ PASS: Reversed longitude/latitude swapped');

// 5. Degree and cardinal format
const t5 = parseCoordinates('16.6158° N, 120.3164° E');
assert(t5 !== null, 'Degree and cardinal format should parse');
assert(Math.abs(t5.lat - 16.6158) < 0.0001);
assert(Math.abs(t5.lng - 120.3164) < 0.0001);
console.log('✅ PASS: Degree symbol and cardinal directions');

// 6. DMS (Degrees, minutes, seconds)
const t6 = parseCoordinates('16°36\'57.1"N 120°18\'59.3"E');
assert(t6 !== null, 'DMS format should parse');
assert(Math.abs(t6.lat - 16.615861) < 0.001);
assert(Math.abs(t6.lng - 120.316472) < 0.001);
console.log('✅ PASS: DMS (degrees, minutes, seconds)');

// 7. Suffix N/E format
const t7 = parseCoordinates('16.6158N, 120.3164E');
assert(t7 !== null, 'Suffix N/E should parse');
assert(Math.abs(t7.lat - 16.6158) < 0.0001);
assert(Math.abs(t7.lng - 120.3164) < 0.0001);
console.log('✅ PASS: Cardinal suffix format');

// 8. Non-coordinate strings should return null
assert.strictEqual(parseCoordinates('Catbangen'), null, 'Barangay name should not parse as coordinates');
assert.strictEqual(parseCoordinates('San Fernando City'), null, 'City name should not parse');
assert.strictEqual(parseCoordinates(''), null, 'Empty string should return null');
assert.strictEqual(parseCoordinates(null), null, 'Null should return null');
assert.strictEqual(parseCoordinates('999, 999'), null, 'Out of bounds values should return null');
console.log('✅ PASS: Non-coordinate strings correctly rejected');

// Reject incomplete/contradictory DMS and preserve southern/western signs.
for (const invalid of ['16°60\'0"N 120°0\'0"E', '16°0\'60"N 120°0\'0"E', '-16N, 120E', '16N 17N', '16N, 120E garbage', '91N, 120E', '16N, 181E']) {
  assert.strictEqual(parseCoordinates(invalid), null, `Invalid coordinate must be rejected: ${invalid}`);
}
const southern = parseCoordinates('-16.5S, -120.5W');
assert.strictEqual(southern.lat, -16.5);
assert.strictEqual(southern.lng, -120.5);
const unicodeDms = parseCoordinates('120°18′59.3″E, 16°36′57.1″N');
assert(Math.abs(unicodeDms.lat - 16.615861111) < 0.000001);
assert(Math.abs(unicodeDms.lng - 120.316472222) < 0.000001);
console.log('✅ PASS: Production parser validates DMS, hemisphere signs, and complete input');

// 9. Static analysis of property-wizard.js
const pwContent = fs.readFileSync(path.join(__dirname, '../assets/js/property-wizard.js'), 'utf8');
assert(pwContent.includes('const parseCoordinates'), 'property-wizard.js must include parseCoordinates function');
assert(pwContent.includes('updateCoordinateDetailsSummary'), 'property-wizard.js must include updateCoordinateDetailsSummary');
assert(pwContent.includes("['lat','lng'].forEach(name => {"), 'property-wizard.js must iterate over lat and lng fields');
assert(pwContent.includes("el.addEventListener('paste'"), 'property-wizard.js must attach paste listener on lat/lng fields');
assert(pwContent.includes("searchInput?.addEventListener('paste'"), 'property-wizard.js must attach paste listener on searchInput');
assert(pwContent.includes('initialLat'), 'property-wizard.js setProperty must populate initialLat from property');
assert(pwContent.includes('initialLng'), 'property-wizard.js setProperty must populate initialLng from property');
console.log('✅ PASS: property-wizard.js contains coordinate parser, paste handlers, and setProperty population');

// 10. Static analysis of admin-location.js
const alContent = fs.readFileSync(path.join(__dirname, '../assets/js/admin-location.js'), 'utf8');
assert(alContent.includes('parseCoordinates'), 'admin-location.js must include parseCoordinates function');
assert(alContent.includes("input.addEventListener('paste'"), 'admin-location.js must attach paste listener on search input');
console.log('✅ PASS: admin-location.js contains coordinate parser and paste handlers');

// 11. Static analysis of property-wizard-view.php
const pwView = fs.readFileSync(path.join(__dirname, '../app/Support/property-wizard-view.php'), 'utf8');
assert(pwView.includes('data-coordinate-summary-text'), 'property-wizard-view.php must include data-coordinate-summary-text');
assert(pwView.includes('aria-label="Search barangay, address, or coordinates"'), 'Location search must have an accessible label describing coordinates');
console.log('✅ PASS: property-wizard-view.php contains coordinate summary binding and search placeholder');

const labelStart = wizardSource.indexOf('    const coordinateLabel = ');
const labelEnd = wizardSource.indexOf('    function updateCoordinateDetailsSummary', labelStart);
const coordinateLabel = vm.runInNewContext(`${wizardSource.slice(labelStart, labelEnd)}; coordinateLabel;`);
assert.strictEqual(coordinateLabel([-16.5, -120.5]), '16.500000° S, 120.500000° W');
assert.strictEqual(coordinateLabel([16.615852, 120.316482]), '16.615852° N, 120.316482° E');
assert(pwContent.includes("setText('[data-reused-coords]', located ? coordinateLabel(located)"), 'Evidence summaries must preserve coordinate precision and hemisphere');
console.log('\nAll production coordinate parsing, labeling, and integration checks passed!\n');
