const fs = require('fs');
const path = require('path');

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

console.log('=== Step 3 Economic Viability Frontend Test Suite ===\n');

// 1. View Template Inspection
const viewPath = path.join(__dirname, '../app/Support/property-wizard-view.php');
const viewHtml = fs.readFileSync(viewPath, 'utf8');

assert(viewHtml.includes('id="pwCriterionEconomic"'), 'View contains #pwCriterionEconomic pane');
assert(viewHtml.includes('pw-econ-from-details'), 'View contains pw-econ-from-details card');
assert(viewHtml.includes('data-econ-from-purpose'), 'View contains data-econ-from-purpose');
assert(viewHtml.includes('data-econ-from-price'), 'View contains data-econ-from-price');
assert(viewHtml.includes('data-econ-from-area'), 'View contains data-econ-from-area');

// Section 1: BIR Zonal Valuation
assert(viewHtml.includes('1. BIR Zonal Valuation'), 'View contains 1. BIR Zonal Valuation heading');
assert(viewHtml.includes('id="pwBirZonalValue"'), 'View contains #pwBirZonalValue input');
assert(viewHtml.includes('pw-badge-source-req'), 'View contains Source required for verification badge');

// Section 2: Additional Valuation References
assert(viewHtml.includes('2. Additional Valuation References'), 'View contains 2. Additional Valuation References heading');
assert(viewHtml.includes('id="pwComparableMarketPrice"'), 'View contains #pwComparableMarketPrice input');
assert(viewHtml.includes('id="pwLguValuationType"'), 'View contains #pwLguValuationType select');
assert(viewHtml.includes('id="pwLguValuationAmount"'), 'View contains #pwLguValuationAmount input');
assert(viewHtml.includes('pw-econ-details'), 'View contains single expandable supporting details disclosure');

// Section 3: Automatic Price Analysis Card
assert(viewHtml.includes('data-econ-preview-card'), 'View contains data-econ-preview-card');
assert(viewHtml.includes('data-econ-asking-sqm'), 'View contains data-econ-asking-sqm');
assert(viewHtml.includes('data-econ-bir-sqm'), 'View contains data-econ-bir-sqm');
assert(viewHtml.includes('data-econ-total-bir'), 'View contains data-econ-total-bir');
assert(viewHtml.includes('data-econ-bir-diff'), 'View contains data-econ-bir-diff');
assert(viewHtml.includes('data-econ-area-discrepancy'), 'View contains data-econ-area-discrepancy alert');
assert(!viewHtml.includes('data-econ-reset-example'), 'View does NOT contain data-econ-reset-example button (removed from production)');

// Important methodology callout
assert(viewHtml.includes('A difference from BIR zonal valuation does not by itself establish overpricing, profitability, or investment suitability'), 'View contains mandatory BIR difference explanatory callout');

// 2. CSS Stylesheet Inspection
const cssPath = path.join(__dirname, '../assets/css/property-wizard.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

assert(cssContent.includes('.property-wizard .pw-econ-card'), 'CSS contains .pw-econ-card');
assert(cssContent.includes('.property-wizard .pw-econ-from-details'), 'CSS contains .pw-econ-from-details');
assert(cssContent.includes('.property-wizard .pw-econ-preview-card'), 'CSS contains .pw-econ-preview-card');
assert(cssContent.includes('.property-wizard .pw-econ-callout'), 'CSS contains .pw-econ-callout');
assert(cssContent.includes('.property-wizard .pw-econ-warning'), 'CSS contains .pw-econ-warning');

// 3. JS Client Evaluator Logic
const jsPath = path.join(__dirname, '../assets/js/property-wizard.js');
const jsContent = fs.readFileSync(jsPath, 'utf8');

assert(jsContent.includes('function evaluateEconomicViabilityClient'), 'JS contains evaluateEconomicViabilityClient');
assert(jsContent.includes('function syncEconomicViability'), 'JS contains syncEconomicViability');
assert(jsContent.includes('data-econ-reset-example'), 'JS binds data-econ-reset-example click listener');

// Extract evaluateEconomicViabilityClient function and run in VM
const fnMatch = jsContent.match(/function evaluateEconomicViabilityClient\([\s\S]*?\n    \}/);
assert(fnMatch !== null, 'Found evaluateEconomicViabilityClient function in property-wizard.js');

// Helper dummy form context for VM evaluation
const evaluatorFn = new Function('overrides', `
  const form = {
    querySelector: () => ({ value: 'amount' })
  };
  let estimatedArea = 0;
  if (overrides && overrides.estimatedArea !== undefined) {
    estimatedArea = overrides.estimatedArea;
  }
  const getListingPurpose = () => overrides?.listing_purpose || 'sale';
  const enteredAreaSqm = () => overrides?.land_area || null;
  const value = (name) => overrides?.[name] != null ? String(overrides[name]) : '';

  ${fnMatch[0]}
  return evaluateEconomicViabilityClient(overrides);
`);

// Test 3.1: Mockup conditions in client VM
// Asking ₱9,000,000, Area 1,000 m², BIR ₱7,000/m²
const clientMockup = evaluatorFn({
  listing_purpose: 'sale',
  price: '9,000,000',
  land_area: 1000,
  bir_zonal_value: '7000',
});

assert(clientMockup.askingPricePerSqm === 9000, `Client asking price per sqm is 9,000 (actual: ${clientMockup.askingPricePerSqm})`);
assert(clientMockup.totalBir === 7000000, `Client total BIR reference is 7,000,000 (actual: ${clientMockup.totalBir})`);
assert(clientMockup.birDiffPct === 28.6, `Client BIR diff is 28.6% higher (actual: ${clientMockup.birDiffPct}%)`);
assert(clientMockup.isComplete === false, 'Client assessment is incomplete without verified market comparables');
assert(clientMockup.totalScore === null, 'Client score is null when market benchmark is missing');

// Test 3.2: Lease conditions in client VM
const clientLease = evaluatorFn({
  listing_purpose: 'lease',
  lease_price: '50,000',
  land_area: 1000,
  bir_zonal_value: '7000',
});

assert(clientLease.leasePricePerSqm === 50, `Client lease price per sqm is 50 (actual: ${clientLease.leasePricePerSqm})`);
assert(clientLease.totalBir === 7000000, `Client lease total BIR reference is 7,000,000 (actual: ${clientLease.totalBir})`);

// Test 3.3: Verified comparable market price in client VM
const clientMarket = evaluatorFn({
  listing_purpose: 'sale',
  price: '9,000,000',
  land_area: 1000,
  bir_zonal_value: '7000',
  comparable_market_price: '9000',
});

assert(clientMarket.isComplete === true, 'Client assessment is complete with comparable market price');
assert(clientMarket.totalScore === 100.0, 'Client score is 100.0 for matching market price');
assert(clientMarket.iaiContribution === 20.00, 'Client IAI contribution is 20.00 pts (20% weight)');

// Test 3.4: Area discrepancy flag in client VM (>25% diff)
const clientDisc = evaluatorFn({
  listing_purpose: 'sale',
  price: '9,000,000',
  land_area: 1000,
  estimatedArea: 500, // 50% discrepancy
  bir_zonal_value: '7000',
  comparable_market_price: '9000',
});

assert(clientDisc.isDiscrepancy === true, 'Client correctly flags area discrepancy when diff > 25%');
assert(clientDisc.isComplete === false, 'Client keeps assessment incomplete when area discrepancy is flagged');

// Test 3.5: Offered leasable space calculation for Lease (uses actual leasable area, not total land area)
const clientLeasableArea = evaluatorFn({
  listing_purpose: 'lease',
  lease_price: '50,000',
  land_area: 1000,
  offered_area_sqm: '250', // 250 m² leasable area
  comparable_lease_price: '200',
});

assert(clientLeasableArea.leasePricePerSqm === 200, `Client calculates monthly rent per m² using actual leasable area (expected: 200, actual: ${clientLeasableArea.leasePricePerSqm})`);
assert(clientLeasableArea.compRatio === 1.00, `Client calculates exact price-competitiveness ratio 1.00x (actual: ${clientLeasableArea.compRatio})`);
assert(clientLeasableArea.isComplete === true, 'Client completes assessment when comparable lease benchmark is present');
assert(clientLeasableArea.totalScore === 100.0, 'Client gives 100.0 score for matching lease benchmark');
assert(clientLeasableArea.iaiContribution === 20.00, 'Client calculates 20.00 pts IAI contribution (20% weight)');

// Test 3.6: Both (sale_or_lease) separate calculations
const clientBoth = evaluatorFn({
  listing_purpose: 'sale_or_lease',
  price: '10,000,000',
  lease_price: '60,000',
  land_area: 1000,
  offered_area_sqm: '500',
});

assert(clientBoth.askingPricePerSqm === 20000, `Dual listing maintains separate sale calculation: ₱20,000/m² (actual: ${clientBoth.askingPricePerSqm})`);
assert(clientBoth.leasePricePerSqm === 120, `Dual listing maintains separate lease calculation: ₱120/m²/month (actual: ${clientBoth.leasePricePerSqm})`);

// Test 3.7: Additional Costs & Known Upfront Outlay
const clientUpfrontLease = evaluatorFn({
  listing_purpose: 'lease',
  lease_price: '50,000',
  land_area: 1000,
  security_deposit_months: '2',
  advance_rent_months: '1',
});

assert(clientUpfrontLease.knownUpfrontCosts === 150000, `Lease upfront outlay equals deposit + advance: ₱150,000 (actual: ${clientUpfrontLease.knownUpfrontCosts})`);

const clientUpfrontSale = evaluatorFn({
  listing_purpose: 'sale',
  price: '9,000,000',
  land_area: 1000,
  additional_purchase_costs: '150,000',
});

assert(clientUpfrontSale.knownUpfrontCosts === 150000, `Sale upfront outlay reflects known additional closing costs: ₱150,000 (actual: ${clientUpfrontSale.knownUpfrontCosts})`);

// Test 3.8: Price on Request (handles missing price gracefully without crashing)
const clientRequest = evaluatorFn({
  listing_purpose: 'sale',
  price: '',
  land_area: 1000,
  bir_zonal_value: '7000',
});

assert(clientRequest.askingPricePerSqm === null, 'Price on request leaves unit price null');
assert(clientRequest.isComplete === false, 'Price on request leaves score incomplete');
assert(clientRequest.totalScore === null, 'Price on request produces null score');

// Test 3.9: Missing benchmark produces incomplete status and null score
const clientNoBench = evaluatorFn({
  listing_purpose: 'sale',
  price: '9,000,000',
  land_area: 1000,
  bir_zonal_value: '7000',
});

assert(clientNoBench.isComplete === false, 'Assessment is incomplete when benchmark is missing');
assert(clientNoBench.totalScore === null, 'Score is null when benchmark is missing (never fabricated)');

// Test 3.10: Leasable unit exceeding total land area flags reasonableness warning
const clientAreaMismatch = evaluatorFn({
  listing_purpose: 'lease',
  lease_price: '50,000',
  land_area: 500,
  offered_space_scope: 'part_property',
  offered_area_sqm: '800', // 800 m² > 500 m² for part of property
});

assert(clientAreaMismatch.isReasonablenessWarning === true, 'Flags warning when part_property leasable space exceeds total land area');
assert(clientAreaMismatch.isComplete === false, 'Holds score incomplete when area mismatch warning is active');

// Test 3.11: User Specific Acceptance Test Case:
// Monthly rent: ₱25,000, Leasable area: 100 m², Comparable rent: ₱300/m²/month, Security deposit: 2 months, Advance rent: 1 month
// Expected results:
// - Monthly rent per m² = ₱250.
// - Price difference = 16.67% below comparable benchmark.
// - Price-competitiveness ratio = 0.8333.
// - Known upfront outlay = ₱75,000.
const clientAcceptance = evaluatorFn({
  listing_purpose: 'lease',
  lease_price: '25,000',
  land_area: 500,
  offered_space_scope: 'part_property',
  offered_area_sqm: '100',
  comparable_lease_price: '300',
  security_deposit_months: '2',
  advance_rent_months: '1',
});

assert(clientAcceptance.leasePricePerSqm === 250, `User Acceptance: Monthly rent per m² is ₱250 (actual: ${clientAcceptance.leasePricePerSqm})`);
assert(clientAcceptance.activeDiffPct === -16.67, `User Acceptance: Price difference is 16.67% below benchmark (actual: ${clientAcceptance.activeDiffPct}%)`);
assert(clientAcceptance.compRatio === 0.8333, `User Acceptance: Price-competitiveness ratio is 0.8333 (actual: ${clientAcceptance.compRatio})`);
assert(clientAcceptance.knownUpfrontCosts === 75000, `User Acceptance: Known upfront outlay is ₱75,000 (actual: ${clientAcceptance.knownUpfrontCosts})`);
assert(clientAcceptance.isComplete === true, 'User Acceptance: Assessment is complete with verified lease benchmark');
assert(clientAcceptance.totalScore === 75.0, `User Acceptance: Score is 75.0 for discounted lease rate (actual: ${clientAcceptance.totalScore})`);
assert(clientAcceptance.iaiContribution === 15.00, `User Acceptance: IAI contribution is 15.00 pts (actual: ${clientAcceptance.iaiContribution})`);

console.log(`\nSummary: ${testsRun - failures}/${testsRun} tests passed.`);
if (failures > 0) {
  console.error(`❌ ${failures} test(s) failed.`);
  process.exit(1);
} else {
  console.log('✅ All Economic Viability frontend tests passed successfully!');
  process.exit(0);
}
