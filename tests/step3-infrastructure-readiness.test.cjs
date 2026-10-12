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

console.log('=== Step 3 Infrastructure Readiness Frontend Test Suite ===\n');

// 1. View Template Inspection
const viewPath = path.join(__dirname, '../app/Support/property-wizard-view.php');
const viewHtml = fs.readFileSync(viewPath, 'utf8');

assert(viewHtml.includes('id="pwCriterionInfrastructure"'), 'View contains #pwCriterionInfrastructure pane');
assert(viewHtml.includes('id="pwElectricityArrangement"'), 'View contains #pwElectricityArrangement');
assert(viewHtml.includes('id="pwWaterSupply"'), 'View contains #pwWaterSupply');
assert(viewHtml.includes('id="pwInternetTelecom"'), 'View contains #pwInternetTelecom');
assert(viewHtml.includes('id="pwDrainageConditions"'), 'View contains #pwDrainageConditions');
assert(viewHtml.includes('data-infra-generator-callout'), 'View contains data-infra-generator-callout');
assert(viewHtml.includes('data-infra-preview-card'), 'View contains data-infra-preview-card');
assert(viewHtml.includes('data-infra-total-score'), 'View contains data-infra-total-score');
assert(viewHtml.includes('data-infra-progress-bar'), 'View contains data-infra-progress-bar');
assert(viewHtml.includes('data-infra-iai-contrib'), 'View contains data-infra-iai-contrib');
assert(viewHtml.includes('data-infra-reset-example'), 'View contains data-infra-reset-example');

// Check that provider inputs exist as factual conditional details
assert(viewHtml.includes('name="electricity_provider"'), 'View contains electricity_provider input');
assert(viewHtml.includes('name="water_provider"'), 'View contains water_provider input');
assert(viewHtml.includes('name="internet_provider"'), 'View contains internet_provider input');
assert(viewHtml.includes('name="drainage_type"'), 'View contains drainage_type input');

// 2. CSS Stylesheet Inspection
const cssPath = path.join(__dirname, '../assets/css/property-wizard.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

assert(cssContent.includes('.property-wizard .pw-infra-card'), 'CSS contains .pw-infra-card');
assert(cssContent.includes('.property-wizard .pw-infra-progress-bar'), 'CSS contains .pw-infra-progress-bar');
assert(cssContent.includes('#8b1e2d'), 'CSS includes burgundy #8b1e2d progress bar color');
assert(cssContent.includes('.property-wizard .pw-infra-generator-callout'), 'CSS contains .pw-infra-generator-callout');
assert(cssContent.includes('.property-wizard .pw-infra-iai-row') || cssContent.includes('.property-wizard .pw-infra-iai-box'), 'CSS contains IAI row container');

// 3. JS Client Evaluator Logic
const jsPath = path.join(__dirname, '../assets/js/property-wizard.js');
const jsContent = fs.readFileSync(jsPath, 'utf8');

assert(jsContent.includes('function evaluateInfrastructureReadinessClient'), 'JS contains evaluateInfrastructureReadinessClient');
assert(jsContent.includes('function syncInfrastructureReadiness'), 'JS contains syncInfrastructureReadiness');
assert(jsContent.includes('data-infra-reset-example'), 'JS binds data-infra-reset-example click listener');

// Extract evaluateInfrastructureReadinessClient function and run in VM
const fnMatch = jsContent.match(/function evaluateInfrastructureReadinessClient\([\s\S]*?\n    \}/);
assert(fnMatch !== null, 'Found evaluateInfrastructureReadinessClient function text in property-wizard.js');

const evaluatorFn = new Function('overrides', `
  ${fnMatch[0]}
  return evaluateInfrastructureReadinessClient(overrides);
`);

// Test 3.1: Mockup conditions in client VM
const clientMockup = evaluatorFn({
  electricity_arrangement: 'generator_only',
  water_supply: 'piped_reliable',
  internet_telecom: 'fiber_reliable',
  drainage_conditions: 'adequate_functional',
});

assert(clientMockup.isComplete === true, 'Client evaluator marks mockup conditions complete');
assert(clientMockup.totalScore === 79.0, `Client evaluator yields score 79.0 (actual: ${clientMockup.totalScore})`);
assert(clientMockup.iaiContribution === 15.80, `Client evaluator yields IAI contribution 15.80 (actual: ${clientMockup.iaiContribution})`);
assert(clientMockup.electricity.weighted === 14.00, 'Client electricity contribution is 14.00 pts (40 * 0.35)');
assert(clientMockup.water.weighted === 30.00, 'Client water contribution is 30.00 pts (100 * 0.30)');
assert(clientMockup.internet.weighted === 20.00, 'Client internet contribution is 20.00 pts (100 * 0.20)');
assert(clientMockup.drainage.weighted === 15.00, 'Client drainage contribution is 15.00 pts (100 * 0.15)');
assert(clientMockup.cross_criteria.economic_viability !== undefined, 'Generator cross-criteria economic viability present in client');
assert(clientMockup.cross_criteria.environmental_safety !== undefined, 'Generator cross-criteria environmental safety present in client');

// Test 3.2: Incomplete condition in client VM
const clientIncomplete = evaluatorFn({
  electricity_arrangement: 'unknown',
  water_supply: 'piped_reliable',
  internet_telecom: 'fiber_reliable',
  drainage_conditions: 'adequate_functional',
});

assert(clientIncomplete.isComplete === false, 'Client evaluator marks unknown electricity as incomplete');
assert(clientIncomplete.totalScore === null, 'Client incomplete score is null');
assert(clientIncomplete.iaiContribution === null, 'Client incomplete IAI contribution is null');

// Test 3.3: Perfect condition in client VM
const clientPerfect = evaluatorFn({
  electricity_arrangement: 'grid_reliable',
  water_supply: 'piped_reliable',
  internet_telecom: 'fiber_reliable',
  drainage_conditions: 'adequate_functional',
});

assert(clientPerfect.totalScore === 100.0, 'Client perfect score is 100.0');
assert(clientPerfect.iaiContribution === 20.00, 'Client perfect IAI contribution is 20.00');

// Test 3.4: Alternative conditions in client VM
const clientAlt = evaluatorFn({
  electricity_arrangement: 'solar_battery',
  water_supply: 'deepwell_tested',
  internet_telecom: 'fixed_wireless',
  drainage_conditions: 'minor_improvements',
});

assert(clientAlt.totalScore === 86.0, `Client alternative score is 86.0 (actual: ${clientAlt.totalScore})`);
assert(clientAlt.iaiContribution === 17.20, `Client alternative IAI contribution is 17.20 (actual: ${clientAlt.iaiContribution})`);

console.log(`\nSummary: ${testsRun - failures}/${testsRun} tests passed.`);
if (failures > 0) {
  console.error(`❌ ${failures} test(s) failed.`);
  process.exit(1);
} else {
  console.log('✅ All Infrastructure Readiness frontend tests passed successfully!');
  process.exit(0);
}
