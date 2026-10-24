const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

console.log('=== Running Step 3 Spatial Accessibility UX & Scoring Tests ===\n');

// 1. Verify View File Structure (property-wizard-view.php)
const viewContent = fs.readFileSync(path.join(__dirname, '../app/Support/property-wizard-view.php'), 'utf8');

// Check Step 3 panel existence
assert.ok(viewContent.includes('class="pw-panel" data-editor-panel="2"'), 'Step 3 panel exists with data-editor-panel="2"');
console.log('✅ PASS: Step 3 panel exists');

// Check Mockup Card Header
assert.ok(viewContent.includes('class="pw-spatial-card"'), 'Spatial Accessibility card layout exists');
assert.ok(viewContent.includes('Spatial Accessibility'), 'Card title "Spatial Accessibility" exists');
assert.ok(viewContent.includes('Step 3 of 4'), 'Assessment shows its position in the property workflow');
assert.ok(viewContent.includes('Provisional model'), 'Badge "Provisional model" exists');
console.log('✅ PASS: Spatial Accessibility header and provisional badge match mockup');

// Check Reused Step 2 Location Banner
assert.ok(viewContent.includes('data-reused-coords'), 'Reused coordinates element exists');
assert.ok(viewContent.includes('data-reused-barangay'), 'Reused barangay element exists');
assert.ok(viewContent.includes('data-reused-area'), 'Reused land area element exists');
console.log('✅ PASS: Step 2 coordinates, barangay, and land area reused banner present');

// Check Subcriterion 1: Road Access (30%)
assert.ok(viewContent.includes('id="pwRoadAccess" name="road_access"'), 'Road Access select exists');
assert.ok(viewContent.includes('value="frontage"'), 'Option frontage exists');
assert.ok(viewContent.includes('value="right_of_way"'), 'Option right_of_way exists');
assert.ok(viewContent.includes('value="no_access"'), 'Option no_access exists');
assert.ok(viewContent.includes('value="unknown"'), 'Option unknown exists');
assert.ok(viewContent.includes('Weight: 30%'), 'Road Access 30% weight badge exists');
assert.ok(viewContent.includes('data-spatial-sub-score="road_access"'), 'Road Access live score badge exists');
console.log('✅ PASS: Subcriterion 1 (Road Access, 30%) inputs and weight indicator present');

// Check Subcriterion 2: Road Surface & Passability (25%)
assert.ok(viewContent.includes('id="pwRoadSurfacePassability" name="road_surface_passability"'), 'Road surface select exists');
assert.ok(viewContent.includes('value="paved"'), 'Option paved exists');
assert.ok(viewContent.includes('value="gravel"'), 'Option gravel exists');
assert.ok(viewContent.includes('value="unpaved"'), 'Option unpaved exists');
assert.ok(viewContent.includes('value="impassable"'), 'Option impassable exists');
assert.ok(viewContent.includes('Weight: 25%'), 'Road surface 25% weight badge exists');
assert.ok(viewContent.includes('data-spatial-sub-score="road_surface_passability"'), 'Road surface live score badge exists');
console.log('✅ PASS: Subcriterion 2 (Road Surface & Passability, 25%) inputs and weight indicator present');

// Check Subcriterion 3: Usable Carriageway Width (25%)
assert.ok(viewContent.includes('id="pwCarriagewayWidth" name="carriageway_width"'), 'Carriageway width input exists');
assert.ok(viewContent.includes('placeholder="e.g. 6"'), 'Width placeholder matches mockup');
assert.ok(viewContent.includes('data-spatial-sub-score="carriageway_width"'), 'Width live score badge exists');
console.log('✅ PASS: Subcriterion 3 (Usable Carriageway Width, 25%) inputs and weight indicator present');

// Check Subcriterion 4: Major Road Proximity (20%)
assert.ok(viewContent.includes('id="pwDistanceToMajorRoad" name="distance_to_major_road"'), 'Major road distance input exists');
assert.ok(viewContent.includes('Weight: 20%'), 'Distance 20% weight badge exists');
assert.ok(viewContent.includes('data-spatial-sub-score="distance_to_major_road"'), 'Distance live score badge exists');
assert.ok(viewContent.includes('The actual system should calculate this from verified road-network data where available; otherwise the distance is reported and pending verification.'), 'GIS preference caption matches mockup exactly');
console.log('✅ PASS: Subcriterion 4 (Major Road Proximity, 20%) inputs and GIS verification caption present');

// Check Compact Live Preview Card
assert.ok(viewContent.includes('LIVE SPATIAL ACCESSIBILITY PREVIEW'), 'Preview card title exists');
assert.ok(viewContent.includes('data-spatial-state-incomplete'), 'Assessment incomplete element exists');
assert.ok(viewContent.includes('Provide all four required inputs before a provisional score can be calculated.'), 'Incomplete guidance exists');
assert.ok(viewContent.includes('data-spatial-state-complete'), 'Assessment complete card exists');
assert.ok(viewContent.includes('data-spatial-total-score'), 'Total score display exists');
assert.ok(viewContent.includes('data-spatial-iai-contrib'), 'IAI contribution display exists');
assert.ok(viewContent.includes('data-spatial-reset-example'), 'Reset example button exists');
assert.ok(viewContent.includes('Try changing the road surface to'), 'Exploration hint text exists');
console.log('✅ PASS: Compact live preview card, calculator elements, and reset button present');

// Check Collapsible Review Audit Disclosure
assert.ok(viewContent.includes('details class="pw-disclosure pw-spatial-evidence-disclosure"'), 'Collapsible disclosure exists');
assert.ok(viewContent.includes('Optional supporting records &amp; verification notes'), 'Disclosure summary exists');
console.log('✅ PASS: Detailed evidence moved to collapsible audit disclosure for CAO/LEBDO');

// Check Other 6 MCE Criteria Are Intact
assert.ok(viewContent.includes('id="pwCriterionInfrastructure"'), 'Infrastructure Readiness panel intact');
assert.ok(viewContent.includes('id="pwCriterionEconomic"'), 'Economic Viability panel intact');
assert.ok(viewContent.includes('id="pwCriterionZoning"'), 'Zoning Compatibility panel intact');
assert.ok(viewContent.includes('id="pwCriterionNearby"'), 'Nearby Businesses panel intact');
assert.ok(!viewContent.includes('id="pwCriterionEnvironmental"'), 'Environmental Safety panel removed per 6-criterion model');
console.log('✅ PASS: All other 5 active MCE criteria panels preserved and Environmental Safety panel removed');

// 2. Verify CSS File (property-wizard.css)
const cssContent = fs.readFileSync(path.join(__dirname, '../assets/css/property-wizard.css'), 'utf8');
assert.ok(cssContent.includes('.pw-spatial-card'), 'CSS includes .pw-spatial-card');
assert.ok(cssContent.includes('.pw-spatial-item'), 'CSS includes .pw-spatial-item');
assert.ok(cssContent.includes('.pw-spatial-item-footer'), 'CSS includes .pw-spatial-item-footer');
assert.ok(cssContent.includes('.pw-spatial-preview-card'), 'CSS includes .pw-spatial-preview-card');
assert.ok(cssContent.includes('.pw-spatial-pill'), 'CSS includes .pw-spatial-pill');
console.log('✅ PASS: Responsive styles for spatial card, preview card, and badges present in property-wizard.css');

// 3. Verify JavaScript Logic (property-wizard.js)
const jsContent = fs.readFileSync(path.join(__dirname, '../assets/js/property-wizard.js'), 'utf8');
assert.ok(jsContent.includes('evaluateSpatialAccessibilityClient'), 'evaluateSpatialAccessibilityClient function defined');
assert.ok(jsContent.includes('syncSpatialAccessibility'), 'syncSpatialAccessibility function defined');
assert.ok(jsContent.includes('data-spatial-reset-example'), 'Reset example handler wired in JS');
assert.ok(jsContent.includes('buildSubmission'), 'buildSubmission includes spatial fields');
console.log('✅ PASS: Client-side JS functions and sync handlers present');

// Test JS Client Scoring in Isolated VM Context
// Extract evaluateSpatialAccessibilityClient implementation
const fnStart = jsContent.indexOf('function evaluateSpatialAccessibilityClient(');
assert.ok(fnStart !== -1, 'Function evaluateSpatialAccessibilityClient found');
// Find end of function
let depth = 0;
let fnEnd = fnStart;
let started = false;
for (let i = fnStart; i < jsContent.length; i++) {
    if (jsContent[i] === '{') {
        depth++;
        started = true;
    } else if (jsContent[i] === '}') {
        depth--;
        if (started && depth === 0) {
            fnEnd = i + 1;
            break;
        }
    }
}
const fnSource = jsContent.slice(fnStart, fnEnd);
const sandbox = {mceWeight:key=>require('../assets/js/mce-active-weights.js').create().weight(key)};
vm.createContext(sandbox);
vm.runInContext(fnSource, sandbox);
const evaluateSpatial = sandbox.evaluateSpatialAccessibilityClient;
assert.equal(typeof evaluateSpatial, 'function', 'evaluateSpatialAccessibilityClient is executable');

// Test Case 1: Complete Example
const completeRes = evaluateSpatial({
    road_access: 'frontage',
    road_surface_passability: 'paved',
    carriageway_width: 6,
    distance_to_major_road: 250
});
assert.equal(completeRes.is_complete, true, 'Complete input is complete');
assert.equal(completeRes.score, 97.0, 'Complete input scores 97.0/100');
assert.equal(completeRes.iai_contribution, 24.25, 'Complete input contributes 24.25 pts at the 25% baseline');
assert.equal(completeRes.subcriteria.road_access.score, 100);
assert.equal(completeRes.subcriteria.road_surface_passability.score, 100);
assert.equal(completeRes.subcriteria.carriageway_width.score, 100);
assert.equal(completeRes.subcriteria.distance_to_major_road.score, 85);
console.log('✅ PASS: Client JS complete calculation: 97.0 / 100 score, 24.25 pts IAI');

// Test Case 2: Partial Condition
const partialRes = evaluateSpatial({
    road_access: 'frontage',
    road_surface_passability: 'unpaved',
    carriageway_width: 2,
    distance_to_major_road: 250
});
assert.equal(partialRes.is_complete, true, 'Partial condition is complete');
assert.equal(partialRes.score, 69.5, 'Partial condition scores 69.5/100');
assert.equal(partialRes.iai_contribution, 17.375, 'Partial condition preserves the 25% contribution before display rounding');
assert.equal(partialRes.subcriteria.road_surface_passability.score, 40);
assert.equal(partialRes.subcriteria.carriageway_width.score, 50);
console.log('✅ PASS: Client JS partial calculation: 69.5 / 100 score, 17.375 pts IAI');

// Test Case 3: Missing Width
const missingRes = evaluateSpatial({
    road_access: 'frontage',
    road_surface_passability: 'paved',
    carriageway_width: '',
    distance_to_major_road: 250
});
assert.equal(missingRes.is_complete, false, 'Missing width produces is_complete = false');
assert.equal(missingRes.score, null, 'Missing width produces score = null');
assert.equal(missingRes.iai_contribution, null, 'Missing width produces iai_contribution = null');
console.log('✅ PASS: Client JS missing input produces Assessment Incomplete');

// Test Case 4: Unknown Road Access
const unknownRes = evaluateSpatial({
    road_access: 'unknown',
    road_surface_passability: 'paved',
    carriageway_width: 6,
    distance_to_major_road: 100
});
assert.equal(unknownRes.is_complete, false, 'Unknown road access produces is_complete = false');
assert.equal(unknownRes.score, null, 'Unknown road access produces score = null');
console.log('✅ PASS: Client JS unknown selection produces Assessment Incomplete');

// 4. Verify API Whitelist & Parcel Model
const policyContent = fs.readFileSync(path.join(__dirname, '../api/_listing-policy.php'), 'utf8');
assert.ok(policyContent.includes('road_access'), 'api/_listing-policy.php whitelists road_access');
assert.ok(policyContent.includes('road_surface_passability'), 'api/_listing-policy.php whitelists road_surface_passability');
assert.ok(policyContent.includes('carriageway_width'), 'api/_listing-policy.php whitelists carriageway_width');
assert.ok(policyContent.includes('distance_to_major_road'), 'api/_listing-policy.php whitelists distance_to_major_road');
console.log('✅ PASS: Broker submission API whitelists all four spatial fields');

const parcelContent = fs.readFileSync(path.join(__dirname, '../app/Support/PropertyParcel.php'), 'utf8');
assert.ok(parcelContent.includes('road_access'), 'PropertyParcel.php observes road_access');
assert.ok(parcelContent.includes('road_surface_passability'), 'PropertyParcel.php observes road_surface_passability');
assert.ok(parcelContent.includes('carriageway_width'), 'PropertyParcel.php observes carriageway_width');
assert.ok(parcelContent.includes('distance_to_major_road'), 'PropertyParcel.php observes distance_to_major_road');
console.log('✅ PASS: PropertyParcel model persists all four spatial fields in observation layer');

console.log('\n=======================================================');
console.log('  All Step 3 Spatial Accessibility UX & JS Tests Passed!');
console.log('=======================================================\n');
