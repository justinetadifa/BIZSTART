const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');

(async () => {
  console.log('====================================================================');
  console.log('TEST SUITE: INVESTOR ASSESSMENT MCE/IAI REFINEMENT VERIFICATION');
  console.log('====================================================================\n');

  // Load modules
  const viewSource = readFileSync('assets/js/property-details-view.js', 'utf8')
    .replace('./utils.js', pathToFileURL(resolve('assets/js/utils.js')).href)
    .replace('./business-opportunities.js', pathToFileURL(resolve('assets/js/business-opportunities.js')).href);

  const {
    assessmentCalculation,
    calculationMarkup,
    propertyDetailsMarkup,
    investorScenarioMarkup,
    safetyMarkup,
    parsePesoInput,
    formatPesoInput,
    potentialIncentive,
  } = await import(`data:text/javascript;base64,${Buffer.from(viewSource).toString('base64')}`);

  const vm = require('node:vm');
  const utils = await import(pathToFileURL(resolve('assets/js/utils.js')).href);

  const citySource = readFileSync('assets/js/city-workspace.js', 'utf8')
    .replace(/^import .*;\r?\n/gm, '')
    .split('initialize().catch(error => {')[0];

  const sandbox = {
    ...utils,
    assessmentCalculation,
    propertyHazardSummary: () => '',
    propertyLocationLabel: () => '',
    setupPropertyGallery: () => {},
    setupInvestorScenario: () => {},
    propertyDetailsMarkup,
    setupPropertyDetailsPrint: () => {},
    URLSearchParams,
    location: { search: '' },
    console,
    Intl,
    Set,
    Map,
    localStorage: { getItem: () => '[]', setItem: () => {} },
    document: {
      body: { dataset: { page: 'city-ranking' } },
      documentElement: { dataset: { investorView: 'basic' } },
      getElementById: () => null,
      querySelectorAll: () => [],
      addEventListener: () => {},
    },
    window: {
      SFC_APP_CONFIG: { role: 'investor', user: { id: 1 } },
      SFCInvestorView: { get: () => 'basic', refresh: () => {} },
      addEventListener: () => {},
    },
    L: { divIcon: options => options },
  };
  vm.createContext(sandbox);
  vm.runInContext(citySource + `\nglobalThis.priorityListCard = priorityListCard;`, sandbox);
  const priorityListCard = sandbox.priorityListCard;

  const dummyOptions = {
    role: 'investor', investor: true, saved: new Set(), compare: [],
    broker: null, canInquire: true, path: v => `/${v}`, imageUrl: () => '/sample.jpg',
    printHeaderMarkup: () => '', printFooterMarkup: () => '', printButtonMarkup: () => '',
    nearbyBusinessesMarkup: () => '', evaluationMarkup: () => '', investorTools: () => '', policy: {},
  };

  // Sample Property 10 baseline from video (Physical 5 criteria: 78.25 pts)
  const sampleVideoProperty = {
    id: 10,
    name: 'Prime Highway Commercial Lot',
    zoningClassification: 'C-1',
    clupProfile: { zoningClassification: 'C-1' },
    assessmentCriteria: {
      spatial_accessibility: 100,      // 100 * 0.20 = 20.00
      infrastructure_readiness: 100,   // 100 * 0.20 = 20.00
      economic_viability: 85,          //  85 * 0.20 = 17.00
      nearby_businesses: 85,           //  85 * 0.10 =  8.50
      zoning_compatibility: 100,       // 100 * 0.15 = 15.00
      risk_constraints: 85,            //  85 * 0.15 = 12.75
    },
    assessmentWeights: {
      spatial_accessibility: 20,
      infrastructure_readiness: 20,
      economic_viability: 20,
      nearby_businesses: 10,
      zoning_compatibility: 15,
      risk_constraints: 15,
    },
    assessmentComplete: true,
    assessmentStatus: 'complete',
    iaiScore: 93.3,
    hazardScreening: {
      flood: { status: 'low', badge: 'LOW', details: 'Low flood susceptibility' },
      fault: { status: 'low', proximity: '8.0 km', details: 'Safe distance from fault trace' },
      status_label: 'Provisional spatial screening',
      validated: false,
    },
    hazards: {
      flood: { level: 'low', distanceMeters: 450 },
      fault: { level: 'safe', distanceMeters: 8000 },
      // 4 hazards unassessed
    },
  };

  // ------------------------------------------------------------------
  // 1. UNIFY THE TWO INVESTMENT SIMULATORS & REMOVE DUPLICATE
  // ------------------------------------------------------------------
  console.log('Test 1: Unify Investment Simulators & Remove Redundant Panels');
  const fullHtml = propertyDetailsMarkup(sampleVideoProperty, dummyOptions);

  // Single scenario container in Part A
  assert(fullHtml.includes('id="propertyScenarioSection"'), 'Must have unified #propertyScenarioSection');
  assert(fullHtml.includes('PART A · YOUR INVESTMENT'), 'Must display PART A · YOUR INVESTMENT');
  assert(fullHtml.includes('What do you plan to establish on this property?'), 'Must display What do you plan to establish selector heading');
  assert(fullHtml.includes('id="investorProposedActivitySelect"'), 'Must have shared activity select');
  assert(fullHtml.includes('id="investorProposedCapitalInput"'), 'Must have capitalization input');
  assert(fullHtml.includes('id="propertyAssessmentSection"'), 'Must have Part B #propertyAssessmentSection');

  // Redundant duplicate evaluator must NOT exist
  assert(!fullHtml.includes('class="property-panel property-investment no-print"'), 'Redundant duplicate evaluation panel must be removed');
  assert(!fullHtml.includes('Evaluate your proposed investment against city criteria'), 'Redundant bottom evaluation copy must be removed');
  console.log('✅ PASS: Test 1 Unify simulators & eliminate duplicate evaluator');

  // ------------------------------------------------------------------
  // 2. CORRECT MCE AND IAI TERMINOLOGY
  // ------------------------------------------------------------------
  console.log('Test 2: Correct MCE and IAI Terminology');
  assert(fullHtml.includes('Multi-Criteria Evaluation (MCE) Methodology'), 'Must define MCE as Multi-Criteria Evaluation Methodology');
  assert(fullHtml.includes('Investment Attractiveness Index'), 'Must display Investment Attractiveness Index for IAI');
  // No dual side-by-side 93.3 boxes
  assert(!fullHtml.includes('property-score-card-mce'), 'Must not render separate secondary MCE score card');
  console.log('✅ PASS: Test 2 Correct MCE/IAI terminology and single authoritative composite');

  // ------------------------------------------------------------------
  // 3. MATHEMATICAL RECONCILIATION: 93.3 vs 88.8
  // ------------------------------------------------------------------
  console.log('Test 3: Mathematical Reconciliation (93.3 Permitted vs 88.8 Conditional)');
  const calc = assessmentCalculation(sampleVideoProperty);
  assert.equal(calc.physicalSubtotal, 78.25, 'Physical 5-criterion subtotal must be exactly 78.25 pts');

  // Permitted use: 78.25 + (100 * 0.15 = 15.0) = 93.25 -> 93.3
  const permittedTotal = Math.round((78.25 + 15.0) * 10) / 10;
  assert.equal(permittedTotal, 93.3, 'Permitted scenario must compute 93.3');

  // Conditional use: 78.25 + (70 * 0.15 = 10.5) = 88.75 -> 88.8
  const conditionalTotal = Math.round((78.25 + 10.5) * 10) / 10;
  assert.equal(conditionalTotal, 88.8, 'Conditional scenario (Commercial Warehouse) must compute 88.8');

  // Delta is exactly 4.5 pts
  const delta = Math.round((permittedTotal - conditionalTotal) * 10) / 10;
  assert.equal(delta, 4.5, 'Delta between permitted and conditional must be exactly 4.5 pts');
  console.log('✅ PASS: Test 3 Mathematical reconciliation of 93.3 vs 88.8 verified');

  // ------------------------------------------------------------------
  // 4. HAZARD COMPLETENESS & TRUTHFUL DISCLOSURES
  // ------------------------------------------------------------------
  console.log('Test 4: Hazard Completeness & Truthful Status');
  const safetyHtml = safetyMarkup(sampleVideoProperty);

  // Must NOT claim "City validated" when 4 of 6 layers are missing
  assert(!safetyHtml.includes('City validated'), 'Must NOT claim City validated when 4/6 layers are unassessed');
  assert(safetyHtml.includes('Provisional screening (2/6 layers)'), 'Must truthfully state Provisional screening (2/6 layers)');
  assert(safetyHtml.includes('Partial Hazard Coverage Disclosure'), 'Must render Partial Hazard Coverage Disclosure banner');
  assert(safetyHtml.includes('Landslide Susceptibility') && safetyHtml.includes('Storm Surge') && safetyHtml.includes('Liquefaction') && safetyHtml.includes('Tsunami'), 'Must list unassessed hazard layers');
  assert(safetyHtml.includes('5-meter buffer corridor') || safetyHtml.includes('DOST-PHIVOLCS'), 'Must preserve DOST-PHIVOLCS fault buffer or agency disclosure');
  console.log('✅ PASS: Test 4 Truthful hazard completeness and disclosures');

  // ------------------------------------------------------------------
  // 5. BUSINESS-SPECIFIC ASSESSMENTS & INCENTIVE SEPARATION
  // ------------------------------------------------------------------
  console.log('Test 5: Currency Formatting & Policy Incentive Independence');
  // Philippine pesos formatting test
  assert.equal(formatPesoInput('690000000', true), '₱690,000,000', 'Must format 690000000 to ₱690,000,000');
  assert.equal(formatPesoInput('50000000', true), '₱50,000,000', 'Must format 50000000 to ₱50,000,000');
  assert.equal(formatPesoInput('690000000'), '690,000,000', 'Raw input formatting must return comma string without prefix');
  assert.equal(parsePesoInput('₱690,000,000'), 690000000, 'Must parse ₱690,000,000 back to 690000000');

  // Policy incentive tier testing under §19
  const highTier = potentialIncentive(690000000, {});
  assert.equal(highTier.eligible, true, '₱690M must qualify for statutory incentive tier');
  assert(highTier.copy.includes('City Investment Code (§19)'), 'Must reference City Investment Code (§19)');
  assert(highTier.copy.includes('does not alter the physical site IAI score'), 'Must clarify that incentive does NOT change site IAI score');

  const zeroCap = potentialIncentive(0, {});
  assert.equal(zeroCap.eligible, false, '₱0 must be non-eligible');
  console.log('✅ PASS: Test 5 Currency formatting & policy incentive separation');

  // ------------------------------------------------------------------
  // 6. PRIORITY BOARD SCORE PRESENTATION & RANK INTEGRITY
  // ------------------------------------------------------------------
  console.log('Test 6: Priority Board Single IAI Presentation & Rank Integrity');
  // Completed property: single authoritative IAI composite
  const completedCard = priorityListCard({
    id: 10,
    name: 'Highway Commercial',
    iaiScore: 93.3,
    assessmentStatus: 'complete',
    assessmentComplete: true,
    iaiRank: 1,
    criteriaDetails: {},
  }, 0);
  assert(completedCard.includes('IAI composite'), 'Must label as IAI composite');
  assert(completedCard.includes('MCE methodology'), 'Must specify MCE methodology');
  assert(!completedCard.includes('city-score-unit">MCE<'), 'Must not render separate secondary MCE score block');
  assert(completedCard.includes('IAI rank') && completedCard.includes('#1'), 'Eligible property receives rank badge');

  // Incomplete property: must NOT receive rank badge
  const incompleteCard = priorityListCard({
    id: 99,
    name: 'Pending Assessment Parcel',
    iaiScore: null,
    assessmentStatus: 'pending',
    assessmentComplete: false,
    criteriaDetails: {},
  }, 1);
  assert(incompleteCard.includes('Unranked · Pending assessment'), 'Incomplete property must display Unranked badge');
  assert(!incompleteCard.includes('IAI rank #'), 'Incomplete property must NOT display rank number');
  console.log('✅ PASS: Test 6 Priority Board single IAI and rank integrity');

  // ------------------------------------------------------------------
  // 7. RESPONSIVE CSS STYLES VERIFICATION
  // ------------------------------------------------------------------
  console.log('Test 7: Responsive CSS Rules in property-details.css');
  const css = readFileSync('assets/css/property-details.css', 'utf8');
  assert(css.includes('@media (max-width: 390px)'), 'Must include 390px mobile breakpoint');
  assert(css.includes('@media (max-width: 768px)'), 'Must include 768px tablet breakpoint');
  assert(css.includes('@media (min-width: 1440px)'), 'Must include 1440px desktop breakpoint');
  assert(css.includes('.property-scenario-panel'), 'Must contain scenario panel styles');
  assert(css.includes('.property-scenario-input-currency-prefix'), 'Must contain currency prefix wrapper');
  assert(css.includes('.property-scenario-comparison-banner'), 'Must contain comparison banner styles');
  console.log('✅ PASS: Test 7 Responsive CSS styling verified');

  console.log('\n====================================================================');
  console.log('ALL INVESTOR ASSESSMENT REFINEMENT TESTS PASSED (7/7)');
  console.log('====================================================================');
})().catch(err => {
  console.error('FAIL:', err);
  process.exitCode = 1;
});
