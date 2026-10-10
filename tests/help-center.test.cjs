const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');

(async () => {
  // 1. Verify property-details-view.js markup
  const source = readFileSync('assets/js/property-details-view.js', 'utf8')
    .replace('./utils.js', pathToFileURL(resolve('assets/js/utils.js')).href)
    .replace('./business-opportunities.js', pathToFileURL(resolve('assets/js/business-opportunities.js')).href);
  const { assessmentCalculation, propertyDetailsMarkup } = await import(
    `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
  );

  const keys = [
    'spatial_accessibility',
    'infrastructure_readiness',
    'economic_viability',
    'nearby_businesses',
    'zoning_compatibility',
    'risk_constraints',
    'environmental_safety',
  ];

  // Screenshot property with ratings: 70, 100, 85, 50, 100, 85, 100
  const screenshotProperty = {
    id: 99,
    name: 'Screenshot Validation Property',
    area: 0.5,
    price: 10000000,
    lat: 16.61,
    lng: 120.32,
    assessmentComplete: true,
    mceScore: 84.5,
    iaiScore: 87.7,
    assessmentCriteria: {
      spatial_accessibility: 70,
      infrastructure_readiness: 100,
      economic_viability: 85,
      nearby_businesses: 50,
      zoning_compatibility: 100,
      risk_constraints: 85,
      environmental_safety: 100,
    },
  };

  const calc = assessmentCalculation(screenshotProperty);
  assert.equal(calc.complete, true);
  assert.equal(calc.mce, 84.5, 'MCE must equal 84.5 from formula');
  assert.equal(calc.iai, 87.7, 'IAI must equal 87.7 from formula');
  assert.deepEqual(
    calc.rows.map(r => r.contribution),
    [14, 20, 17, 5, 15, 8.5, 5],
    'Individual contributions must match the arithmetic check'
  );

  const dummyOptions = {
    role: 'investor',
    investor: true,
    saved: new Set(),
    compare: [],
    broker: null,
    canInquire: false,
    path: v => `/${v}`,
    imageUrl: () => '/sample.jpg',
    printHeaderMarkup: () => '',
    printFooterMarkup: () => '',
    printButtonMarkup: () => '',
    nearbyBusinessesMarkup: () => '',
    evaluationMarkup: () => '',
    investorTools: () => '',
    policy: {},
  };

  const detailsHtml = propertyDetailsMarkup(screenshotProperty, dummyOptions);

  // Check Screenshot 1 requirements
  assert(detailsHtml.includes("Understand this property’s scores"));
  assert(detailsHtml.includes("A clear overview of the ratings behind the assessment."));
  assert(detailsHtml.includes('data-assessment-tab="overview"'));
  assert(detailsHtml.includes('data-assessment-tab="calculation"'));
  assert(detailsHtml.includes('data-assessment-tab="evidence"'));
  assert(detailsHtml.includes("Investment Alignment Index"));
  assert(detailsHtml.includes("Multi-Criteria Evaluation"));
  assert(detailsHtml.includes("How is this calculated? &rarr;"));
  assert(detailsHtml.includes("Explore the criteria &rarr;"));
  assert(detailsHtml.includes("Criterion ratings"));
  assert(detailsHtml.includes("Unweighted ratings · Higher is more favorable"));
  assert(detailsHtml.includes("01 &nbsp; View calculation"));
  assert(detailsHtml.includes("02 &nbsp; Evidence &amp; data sources"));
  assert(detailsHtml.includes("Decision support only. Scores do not guarantee returns or replace required clearances."));

  // Verify contextual criterion help buttons
  for (const key of keys) {
    assert(detailsHtml.includes(`data-help-criterion="${key}"`), `Criterion button for ${key} must exist`);
  }

  // 2. Verify Help Center PHP template & copy
  const helpCenterPhp = readFileSync('app/Support/HelpCenter.php', 'utf8');

  // Verify Team Members (Section 6)
  assert(helpCenterPhp.includes('JUSTINE M. TADIFA'), 'Author Justine Tadifa must be present');
  assert(helpCenterPhp.includes('DAWN ALEEAH V. DIZON'), 'Author Dawn Aleeah Dizon must be present');
  assert(helpCenterPhp.includes('CHRISTIAN JOSEPH A. ESTILONG'), 'Author Christian Estilong must be present');
  assert(helpCenterPhp.includes('MA’AM EMMALOU PIMENTEL'), 'Thesis adviser Ma’am Emmalou Pimentel must be present');
  assert(helpCenterPhp.includes('Official contact details will be added here.'), 'Contact notice must be present');
  assert(helpCenterPhp.includes('System questions &amp; feedback'), 'Routing card for system questions must be present');
  assert(helpCenterPhp.includes('Academic questions'), 'Routing card for academic questions must be present');

  // Verify Seven Criteria (Section 4)
  assert(helpCenterPhp.includes('Spatial accessibility'));
  assert(helpCenterPhp.includes('Infrastructure readiness'));
  assert(helpCenterPhp.includes('Economic viability'));
  assert(helpCenterPhp.includes('Nearby businesses'));
  assert(helpCenterPhp.includes('Zoning compatibility'));
  assert(helpCenterPhp.includes('Risk constraints'));
  assert(helpCenterPhp.includes('Environmental safety'));
  assert(helpCenterPhp.includes('Reading a criterion'));
  assert(helpCenterPhp.includes('Higher ratings are more favorable. They do not certify a site as risk-free.'));

  // Verify Common Questions & Using LOCUS-SF (Section 3 & 5)
  assert(helpCenterPhp.includes('What is MCE?'));
  assert(helpCenterPhp.includes('What is IAI?'));
  assert(helpCenterPhp.includes('How do ratings, weights and points differ?'));
  assert(helpCenterPhp.includes('Does a high score guarantee a good investment?'));
  assert(helpCenterPhp.includes('Why is a score unavailable?'));
  assert(helpCenterPhp.includes('Where do the weights come from?'));
  assert(helpCenterPhp.includes('Does a larger land area automatically receive a better score?'));
  assert(helpCenterPhp.includes('What is the difference between a location pin and a property boundary?'));
  assert(helpCenterPhp.includes('What does the 500-meter radar show?'));

  // 3. Verify CSS and JS integration in CityShell.php
  const cityShellPhp = readFileSync('app/Support/CityShell.php', 'utf8');
  assert(cityShellPhp.includes('help-center.css'));
  assert(cityShellPhp.includes('help-center.js'));
  assert(cityShellPhp.includes('HelpCenter::render()'));

  console.log('PASS: LOCUS-SF Help Center and Scoring Interface suite passed (100% compliance).');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
