const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');

(async () => {
  console.log('====================================================================');
  console.log('TEST SUITE: PROPERTY DETAILS MCE/IAI ASSESSMENT AUDIT & BUG FIXES');
  console.log('====================================================================\n');

  const source = readFileSync('assets/js/property-details-view.js', 'utf8')
    .replace('./utils.js', pathToFileURL(resolve('assets/js/utils.js')).href)
    .replace('./business-opportunities.js', pathToFileURL(resolve('assets/js/business-opportunities.js')).href);
  const {
    assessmentCalculation,
    calculationMarkup,
    propertyDetailsMarkup,
  } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

  const dummyOptions = {
    role: 'investor', investor: true, saved: new Set(), compare: [],
    broker: null, canInquire: true, path: v => `/${v}`, imageUrl: () => '/sample.jpg',
    printHeaderMarkup: () => '', printFooterMarkup: () => '', printButtonMarkup: () => '',
    nearbyBusinessesMarkup: () => '', evaluationMarkup: () => '', investorTools: () => '', policy: {},
  };

  // -------------------------------------------------------------
  // TEST 1: Synthetic Assessment (90, 80, 75, 60, 100, 60) -> exactly 79/100
  // -------------------------------------------------------------
  console.log('Test 1: Complete synthetic assessment [90, 80, 75, 60, 100, 60]');
  const syntheticProperty = {
    id: 101,
    name: 'Synthetic Test Property',
    assessmentComplete: true,
    assessmentStatus: 'complete',
    assessmentCriteria: {
      spatial_accessibility: 90,
      infrastructure_readiness: 80,
      economic_viability: 75,
      nearby_businesses: 60,
      zoning_compatibility: 100,
      risk_constraints: 60,
    },
    assessmentWeights: {
      spatial_accessibility: 20,
      infrastructure_readiness: 20,
      economic_viability: 20,
      nearby_businesses: 10,
      zoning_compatibility: 15,
      risk_constraints: 15,
    },
  };

  const syntheticCalc = assessmentCalculation(syntheticProperty);
  assert.equal(syntheticCalc.complete, true, 'Synthetic assessment must be complete');
  assert.equal(syntheticCalc.rows.length, 6, 'Must have exactly 6 active criteria');
  assert.deepEqual(
    syntheticCalc.rows.map(r => r.key),
    ['spatial_accessibility', 'infrastructure_readiness', 'economic_viability', 'nearby_businesses', 'zoning_compatibility', 'risk_constraints'],
    'Active criteria keys must match standard 6 criteria'
  );
  assert.deepEqual(
    syntheticCalc.rows.map(r => r.weight),
    [20, 20, 20, 10, 15, 15],
    'Weights must be exactly 20%, 20%, 20%, 10%, 15%, 15%'
  );
  assert.equal(
    syntheticCalc.rows.reduce((sum, r) => sum + r.weight, 0),
    100,
    'Weights must total exactly 100%'
  );
  assert.deepEqual(
    syntheticCalc.rows.map(r => r.contribution),
    [18.0, 16.0, 15.0, 6.0, 15.0, 9.0],
    'Weighted contributions must equal [18, 16, 15, 6, 15, 9]'
  );
  assert.equal(syntheticCalc.iai, 79.0, 'Synthetic IAI must be exactly 79.0/100');
  assert.equal(syntheticCalc.mce, 79.0, 'Synthetic MCE must be exactly 79.0/100');

  const syntheticCalcHtml = calculationMarkup(syntheticProperty);
  assert(syntheticCalcHtml.includes('Six criteria and their weighted contributions'), 'Table caption must say Six criteria');
  assert(syntheticCalcHtml.includes('<td>100%</td><td>79.0</td>'), 'Footer must show 100% total weight and 79.0 composite');
  assert(syntheticCalcHtml.includes('round(18 + 16 + 15 + 6 + 15 + 9, 1) = 79.0'), 'Mathematical breakdown must match formula');
  assert(!syntheticCalcHtml.includes('Environmental Safety'), 'Active calculation table must NOT include Environmental Safety');

  const syntheticDetailsHtml = propertyDetailsMarkup(syntheticProperty, dummyOptions);
  assert(syntheticDetailsHtml.includes('All six criteria rated'), 'Status badge must state All six criteria rated');
  assert(syntheticDetailsHtml.includes('<strong>79.0</strong>'), 'Hero score must display 79.0');
  const assessmentSectionHtml = syntheticDetailsHtml.slice(syntheticDetailsHtml.indexOf('id="propertyAssessmentSection"'));
  assert(!assessmentSectionHtml.includes('data-criterion="environmental_safety"'), 'Must NOT render Environmental Safety card in assessment section');
  assert(!assessmentSectionHtml.includes('Environmental Safety'), 'Must NOT include Environmental Safety in active assessment section');

  // Verify radar chart has 6 axes and correct abbreviations
  assert(syntheticDetailsHtml.includes('class="property-radar"'), 'Radar chart must be present');
  assert(syntheticDetailsHtml.includes('>Access<'), 'Radar chart must have Access axis');
  assert(syntheticDetailsHtml.includes('>Infra<'), 'Radar chart must have Infra axis');
  assert(syntheticDetailsHtml.includes('>Econ<'), 'Radar chart must have Econ axis');
  assert(syntheticDetailsHtml.includes('>Business<'), 'Radar chart must have Business axis');
  assert(syntheticDetailsHtml.includes('>Zoning<'), 'Radar chart must have Zoning axis');
  assert(syntheticDetailsHtml.includes('>Risk<'), 'Radar chart must have Risk axis');
  assert(!syntheticDetailsHtml.includes('>Environment<'), 'Radar chart must NOT have Environment axis');
  console.log('✅ PASS: Test 1 complete synthetic assessment');

  // -------------------------------------------------------------
  // TEST 2: Real Database Property 10 (contains leftover environmental_safety: 100)
  // -------------------------------------------------------------
  console.log('Test 2: Database Property 10 (verifying fix for 105% weight & pending status bug)');
  const dbProperty10 = {
    id: 10,
    name: 'Property 10 - Business Park Ready',
    assessmentComplete: true,
    assessmentStatus: 'complete',
    iaiScore: 90.3,
    mceScore: 90.3,
    assessmentCriteria: {
      spatial_accessibility: 85,
      infrastructure_readiness: 100,
      economic_viability: 85,
      zoning_compatibility: 100,
      nearby_businesses: 85,
      risk_constraints: 85,
      environmental_safety: 100, // Leftover from earlier database seed
    },
    assessmentWeights: {
      spatial_accessibility: 20,
      infrastructure_readiness: 20,
      economic_viability: 20,
      zoning_compatibility: 15,
      nearby_businesses: 10,
      risk_constraints: 15,
    },
  };

  const calc10 = assessmentCalculation(dbProperty10);
  assert.equal(calc10.complete, true, 'Property 10 must be complete, NOT pending');
  assert.equal(calc10.isLegacy, false, 'Property 10 must NOT be treated as legacy despite leftover criteria key');
  assert.equal(calc10.rows.length, 6, 'Property 10 must have exactly 6 active criteria');
  assert.equal(
    calc10.rows.reduce((sum, r) => sum + r.weight, 0),
    100,
    'Property 10 weights must sum to 100%, NOT 105%'
  );
  assert.equal(calc10.iai, 90.3, 'Property 10 IAI must equal 90.3');
  assert.equal(calc10.mce, 90.3, 'Property 10 MCE must equal 90.3');

  const markup10 = calculationMarkup(dbProperty10);
  assert(markup10.includes('<td>100%</td><td>90.3</td>'), 'Table footer must display 100% weight and 90.3 total');
  assert(!markup10.includes('105%'), 'Table must NEVER display 105% weight');
  assert(!markup10.includes('Environmental Safety'), 'Table must NOT contain Environmental Safety');

  const details10 = propertyDetailsMarkup(dbProperty10, dummyOptions);
  assert(!details10.includes('Evidence pending'), 'Property 10 must NOT display Evidence pending');
  assert(details10.includes('All six criteria rated'), 'Property 10 must display All six criteria rated');
  assert(details10.includes('<strong>90.3</strong>'), 'Property 10 must display 90.3 in hero score');
  console.log('✅ PASS: Test 2 database Property 10 fix verified');

  // -------------------------------------------------------------
  // TEST 3: Incomplete Assessment
  // -------------------------------------------------------------
  console.log('Test 3: Incomplete assessment handling');
  const incompleteProperty = {
    id: 102,
    name: 'Incomplete Test Property',
    assessmentComplete: false,
    assessmentStatus: 'pending',
    assessmentCriteria: {
      spatial_accessibility: 70,
      infrastructure_readiness: 80,
      economic_viability: null, // missing rating
      nearby_businesses: 50,
      zoning_compatibility: 100,
      risk_constraints: 60,
    },
  };

  const incCalc = assessmentCalculation(incompleteProperty);
  assert.equal(incCalc.complete, false, 'Incomplete property complete flag must be false');
  assert.equal(incCalc.iai, null, 'Must NOT manufacture an IAI score when incomplete');
  assert.equal(incCalc.mce, null, 'Must NOT manufacture an MCE score when incomplete');
  assert.equal(incCalc.completedCount, 5, 'Must report 5 of 6 completed');
  assert(incCalc.missingCriteria.includes('Economic Viability / Economic Context'), 'Must list Economic Viability as missing');

  const incMarkup = calculationMarkup(incompleteProperty);
  assert(incMarkup.includes('Assessment pending · 5 of 6'), 'Calculation table must indicate 5 of 6 pending');
  assert(incMarkup.includes('Missing: Economic Viability / Economic Context'), 'Must explain exactly which criterion is missing');

  const incDetails = propertyDetailsMarkup(incompleteProperty, dummyOptions);
  assert(incDetails.includes('is-pending'), 'Status badge must have is-pending class');
  assert(incDetails.includes('data-active-assessment-score><strong>Pending</strong>') && incDetails.includes('data-active-iai-composite-pill>Pending review</strong>'), 'Missing scores keep the recorded total pending and official release pending');
  assert(incDetails.includes('Missing: Economic Viability / Economic Context'), 'Hero description must explain what is missing');
  console.log('✅ PASS: Test 3 incomplete assessment handling verified');

  // -------------------------------------------------------------
  // TEST 4: Prohibited Zoning (Not Suitable)
  // -------------------------------------------------------------
  console.log('Test 4: Prohibited zoning assessment handling');
  const prohibitedProperty = {
    id: 103,
    name: 'Prohibited Zoning Property',
    assessmentComplete: false,
    assessmentStatus: 'not_suitable',
    reason: 'Heavy industrial use is prohibited in R-1 Low Density Residential Zone.',
    assessmentCriteria: {
      spatial_accessibility: 90,
      infrastructure_readiness: 90,
      economic_viability: 90,
      nearby_businesses: 90,
      zoning_compatibility: 0,
      risk_constraints: 90,
    },
  };

  const prohCalc = assessmentCalculation(prohibitedProperty);
  assert.equal(prohCalc.isNotSuitable, true, 'isNotSuitable must be true');
  assert.equal(prohCalc.complete, false, 'complete must be false');
  assert.equal(prohCalc.iai, null, 'IAI score must be null (withheld)');
  assert.equal(prohCalc.mce, null, 'MCE score must be null (withheld)');

  const prohMarkup = calculationMarkup(prohibitedProperty);
  assert(prohMarkup.includes('Site Not Eligible:'), 'Must show Site Not Eligible alert');
  assert(prohMarkup.includes('Heavy industrial use is prohibited'), 'Must display specific prohibition reason');

  const prohDetails = propertyDetailsMarkup(prohibitedProperty, dummyOptions);
  assert(prohDetails.includes('Not Suitable'), 'Status badge and score must display Not Suitable');
  assert(!prohDetails.includes('<strong>90.0</strong>'), 'Must NOT display manufactured score for prohibited site');
  console.log('✅ PASS: Test 4 prohibited zoning handling verified');

  // -------------------------------------------------------------
  // TEST 5: Explicit Legacy 7-Criterion Record
  // -------------------------------------------------------------
  console.log('Test 5: Explicit legacy 7-criterion record');
  const legacyProperty = {
    id: 104,
    name: 'Historical Legacy Listing',
    assessmentMethodologyVersion: 'LOCUS-SF MCE v1.1 (Legacy 7-Criterion)',
    assessmentComplete: true,
    assessmentStatus: 'complete',
    iaiScore: 82.5,
    mceScore: 82.5,
    assessmentCriteria: {
      spatial_accessibility: 80,
      infrastructure_readiness: 80,
      economic_viability: 80,
      nearby_businesses: 80,
      zoning_compatibility: 90,
      risk_constraints: 80,
      environmental_safety: 90,
    },
    assessmentWeights: {
      spatial_accessibility: 20,
      infrastructure_readiness: 20,
      economic_viability: 20,
      nearby_businesses: 10,
      zoning_compatibility: 15,
      risk_constraints: 10,
      environmental_safety: 5,
    },
  };

  const legCalc = assessmentCalculation(legacyProperty);
  assert.equal(legCalc.isLegacy, true, 'Must be identified as legacy record');
  assert.equal(legCalc.rows.length, 7, 'Must have 7 criteria for legacy record');
  assert.equal(
    legCalc.rows.reduce((sum, r) => sum + r.weight, 0),
    100,
    'Legacy weights must total 100%'
  );
  assert.equal(
    legCalc.rows.find(r => r.key === 'risk_constraints')?.weight,
    10,
    'Legacy risk weight must be 10%'
  );
  assert.equal(
    legCalc.rows.find(r => r.key === 'environmental_safety')?.weight,
    5,
    'Legacy environmental safety weight must be 5%'
  );

  const legMarkup = calculationMarkup(legacyProperty);
  assert(legMarkup.includes('Seven criteria'), 'Caption must say Seven criteria');
  assert(legMarkup.includes('LOCUS-SF MCE v1.1'), 'Methodology must cite v1.1');

  const legDetails = propertyDetailsMarkup(legacyProperty, dummyOptions);
  assert(legDetails.includes('Legacy record'), 'Must be explicitly labeled as legacy record');
  assert(legDetails.includes('All seven criteria rated'), 'Must report seven criteria rated');
  console.log('✅ PASS: Test 5 legacy 7-criterion record verified');

  console.log('\n====================================================================');
  console.log('ALL PROPERTY DETAILS MCE/IAI AUDIT TESTS PASSED (5/5)');
  console.log('====================================================================');
})().catch(err => {
  console.error('FAIL:', err);
  process.exitCode = 1;
});
