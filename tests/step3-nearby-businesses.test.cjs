const fs = require('fs');
const path = require('path');
const vm = require('vm');

let failures = 0;
let testsRun = 0;

function assert(condition, message) {
  testsRun++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failures++;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

console.log('=== Step 3 Nearby Businesses Frontend Test Suite ===\n');

// -------------------------------------------------------------
// 1. View Template Inspection
// -------------------------------------------------------------
const viewPath = path.join(__dirname, '../app/Support/property-wizard-view.php');
const viewHtml = fs.readFileSync(viewPath, 'utf8');

assert(viewHtml.includes('id="pwCriterionNearby"'), 'View contains #pwCriterionNearby pane under Site Evidence');
assert(viewHtml.includes('id="pwNearbyBusinessType"'), 'View contains #pwNearbyBusinessType dropdown');
assert(viewHtml.includes('data-nearby-stat="total"'), 'View contains total mapped places metric card');
assert(viewHtml.includes('data-nearby-stat="competitors"'), 'View contains currently classified competitors metric card');
assert(viewHtml.includes('data-nearby-stat="complementary"'), 'View contains currently classified complementary places metric card');

// Interactive radar map and toolbar controls
assert(viewHtml.includes('id="pwRadarMap"'), 'View contains #pwRadarMap container');
assert(viewHtml.includes('data-radar-filter="related"'), 'View contains filter pill for "Related" establishments');
assert(viewHtml.includes('data-radar-tab="related"'), 'View contains drawer tab for "Related" establishments');
assert(viewHtml.includes('data-radar-tab="all"'), 'View contains drawer tab for "All" establishments');

// Business Environment Assessment Card & Subcriteria
assert(viewHtml.includes('data-nearby-assessment-card'), 'View contains Business Environment Assessment card');
assert(viewHtml.includes('data-nearby-assessment-status'), 'View contains assessment status element');
assert(viewHtml.includes('data-nearby-assessment-score'), 'View contains assessment score element');
assert(viewHtml.includes('data-nearby-score-bar'), 'View contains assessment score progress bar');
assert(viewHtml.includes('data-nearby-iai-contrib'), 'View contains 15% IAI contribution element');
assert(viewHtml.includes('data-nearby-subcriterion="commercial_activity"'), 'View contains Commercial Activity (25%) subcriterion card');
assert(viewHtml.includes('data-nearby-subcriterion="complementary_businesses"'), 'View contains Complementary Businesses (30%) subcriterion card');
assert(viewHtml.includes('data-nearby-subcriterion="competitive_pressure"'), 'View contains Competitive Pressure (30%) subcriterion card');
assert(viewHtml.includes('data-nearby-subcriterion="activity_anchors"'), 'View contains Activity Anchors (15%) subcriterion card');

// Expandable disclosure for secondary / density / corridor details
assert(viewHtml.includes('<details class="pw-disclosure"'), 'View contains expandable details disclosure');
assert(viewHtml.includes('name="commercial_corridor"'), 'View contains commercial_corridor field in secondary disclosure');

// 4-step wizard consolidation verification
assert(viewHtml.includes('data-editor-panel="0"'), 'Wizard contains step 0 (Basics)');
assert(viewHtml.includes('data-editor-panel="1"'), 'Wizard contains step 1 (Area & location)');
assert(viewHtml.includes('data-editor-panel="2"'), 'Wizard contains step 2 (Site evidence)');
assert(viewHtml.includes('data-editor-panel="3"'), 'Wizard contains step 3 (Review)');
assert(!viewHtml.includes('data-editor-panel="4"'), 'Wizard does not contain a separate step 4');
assert(viewHtml.includes('Step 1 of 4'), 'Footer progress indicator reflects 4 total steps');

// -------------------------------------------------------------
// 2. CSS Stylesheet Inspection
// -------------------------------------------------------------
const cssPath = path.join(__dirname, '../assets/css/property-wizard.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

assert(cssContent.includes('.property-wizard .pw-nearby-type-card'), 'CSS contains .pw-nearby-type-card');
assert(cssContent.includes('.property-wizard .pw-nearby-metrics-grid'), 'CSS contains .pw-nearby-metrics-grid');
assert(cssContent.includes('.property-wizard .pw-nearby-metric-card'), 'CSS contains .pw-nearby-metric-card');
assert(cssContent.includes('.property-wizard .pw-nearby-assessment-card'), 'CSS contains .pw-nearby-assessment-card');
assert(cssContent.includes('.property-wizard .pw-nearby-subcriteria-grid'), 'CSS contains .pw-nearby-subcriteria-grid');
assert(cssContent.includes('.property-wizard .pw-dot-amber'), 'CSS contains amber status dot for related businesses');
assert(cssContent.includes('.property-wizard .pw-map-popup-tag.is-related'), 'CSS contains .pw-map-popup-tag.is-related');
assert(cssContent.includes('.property-wizard .pw-radar-place-icon.is-related'), 'CSS contains .pw-radar-place-icon.is-related');

// -------------------------------------------------------------
// 3. Client JS Classification & Logic Inspection
// -------------------------------------------------------------
const jsPath = path.join(__dirname, '../assets/js/property-wizard.js');
const jsContent = fs.readFileSync(jsPath, 'utf8');

// Extract businessRoles mapping from JS
const rolesMatch = jsContent.match(/const businessRoles\s*=\s*(\{[\s\S]*?\n\s*\};)/);
assert(rolesMatch !== null, 'Found businessRoles definition in property-wizard.js');

let businessRoles;
try {
  const sandbox = {};
  vm.runInNewContext('roles = ' + rolesMatch[1], sandbox);
  businessRoles = sandbox.roles;
  assert(businessRoles && typeof businessRoles === 'object', 'Successfully parsed businessRoles');
} catch (e) {
  assert(false, 'Failed to parse businessRoles: ' + e.message);
}

if (businessRoles) {
  // Test Cafe & Bakery classifications
  const cafeRoles = businessRoles.cafe;
  assert(cafeRoles !== undefined, 'businessRoles contains cafe profile');
  assert(cafeRoles.direct.includes('cafe'), 'Cafe direct competitors include cafe');
  assert(cafeRoles.direct.includes('bakery'), 'Cafe direct competitors include bakery');
  assert(cafeRoles.direct.includes('coffee_shop'), 'Cafe direct competitors include coffee_shop');
  
  // Fast food and full restaurants should be RELATED, not direct competitors!
  assert(!cafeRoles.direct.includes('restaurant'), 'Cafe direct competitors does NOT include general restaurant');
  assert(!cafeRoles.direct.includes('fast_food'), 'Cafe direct competitors does NOT include fast_food');
  assert(cafeRoles.related.includes('restaurant'), 'Cafe related businesses includes restaurant');
  assert(cafeRoles.related.includes('fast_food'), 'Cafe related businesses includes fast_food');
  assert(cafeRoles.related.includes('food_court'), 'Cafe related businesses includes food_court');

  // Complementary businesses for cafe
  assert(cafeRoles.complementary.includes('bank'), 'Cafe complementary businesses includes bank');
  assert(cafeRoles.complementary.includes('school'), 'Cafe complementary businesses includes school');
  assert(cafeRoles.complementary.includes('office'), 'Cafe complementary businesses includes office');
}

// Test classify logic simulation
function testClassify(feature, type = 'cafe') {
  const roles = businessRoles[type] || businessRoles.cafe;
  const p = feature.properties || {};
  const amenity = (p.amenity || '').toLowerCase();
  const shop = (p.shop || '').toLowerCase();
  const office = (p.office || '').toLowerCase();
  const tags = [amenity, shop, office, (p.cuisine || '').toLowerCase()].filter(Boolean);

  const directList = roles.direct || roles.competitors || [];
  const relatedList = roles.related || [];
  const compList = roles.complementary || [];

  if (tags.some(t => directList.includes(t))) return 'competitors';
  if (tags.some(t => relatedList.includes(t))) return 'related';
  if (tags.some(t => compList.includes(t))) return 'complementary';
  return 'unclassified';
}

const cafePlace = { properties: { amenity: 'cafe', name: 'Starbucks' } };
const bakeryPlace = { properties: { shop: 'bakery', name: 'Red Ribbon' } };
const fastFoodPlace = { properties: { amenity: 'fast_food', name: 'Jollibee' } };
const restaurantPlace = { properties: { amenity: 'restaurant', name: 'Aristocrat' } };
const bankPlace = { properties: { amenity: 'bank', name: 'BDO' } };
const unknownPlace = { properties: { amenity: 'unknown_service', name: 'General Biz' } };

assert(testClassify(cafePlace) === 'competitors', 'Starbucks classified as direct competitor for cafe');
assert(testClassify(bakeryPlace) === 'competitors', 'Red Ribbon classified as direct competitor for cafe');
assert(testClassify(fastFoodPlace) === 'related', 'Jollibee classified as RELATED (not competitor) for cafe');
assert(testClassify(restaurantPlace) === 'related', 'Aristocrat classified as RELATED (not competitor) for cafe');
assert(testClassify(bankPlace) === 'complementary', 'BDO classified as complementary for cafe');
assert(testClassify(unknownPlace) === 'unclassified', 'Unknown service classified as unclassified');

// Road and Registry missing-data phrasing checks
assert(jsContent.includes("'Road data unavailable'") || jsContent.includes('"Road data unavailable"'), 'JS contains "Road data unavailable" handling');
assert(jsContent.includes('missing registry coverage does not imply') || jsContent.includes('commercial activity'), 'JS explains that missing registry coverage does not imply an absence of commercial activity');

// Assessment Sync Functionality
assert(jsContent.includes('function syncNearbyAssessment'), 'JS contains syncNearbyAssessment function');
assert(jsContent.includes('A scan with no usable business records stays pending.'), 'JS leaves missing nearby observations pending');
assert(jsContent.includes('15% of MCE') && jsContent.includes('evaluation.contribution'), 'JS uses the shared 15% MCE contribution');
assert(jsContent.includes("badgeEl.textContent = 'Provisional'") && jsContent.includes('currentNearbyEvaluation()'), 'Review labels the observation-based score as provisional');

// Check 4-Step navigation in JS
assert(
  jsContent.includes("selectEvidenceCriterion(target==='radar'?'nearby_businesses':target)") ||
  jsContent.includes("selectEvidenceCriterion('nearby_businesses')"),
  'JS activates nearby_businesses criterion when radar requested'
);
assert(
  jsContent.includes("dataset.editorStep==='2'") && jsContent.includes("target==='radar'"),
  'JS routes radar navigation to Step 2 (Site Evidence)'
);
assert(
  jsContent.includes("dataset.editorStep==='3'"),
  'JS routes assessment review navigation to Step 3 (Review)'
);

console.log(`\nFrontend Summary: ${testsRun - failures}/${testsRun} assertions passed.`);
if (failures > 0) {
  console.error(`❌ ${failures} test(s) failed.`);
  process.exit(1);
} else {
  console.log('✅ All Nearby Businesses frontend tests passed successfully!\n');
}
