const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');

(async () => {
  const source = readFileSync('assets/js/property-details-view.js', 'utf8')
    .replace('./utils.js', pathToFileURL(resolve('assets/js/utils.js')).href)
    .replace('./business-opportunities.js', pathToFileURL(resolve('assets/js/business-opportunities.js')).href);

  const {
    assessmentCalculation,
    investorBriefReportMarkup,
    setupPropertyDetailsPrint,
    getPropertyPdfFilename,
    sanitizeFilenamePart,
  } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

  console.log('=== TEST 1: STANDARDIZED PDF FILENAME & SANITIZATION ===');
  assert.equal(sanitizeFilenamePart('ZAMBRANO BUILDING'), 'ZAMBRANO_BUILDING');
  assert.equal(sanitizeFilenamePart("LaFinns' Land"), 'LaFinns_Land');
  assert.equal(sanitizeFilenamePart('Broker Test Commercial Site Biday'), 'Broker_Test_Commercial_Site_Biday');
  assert.equal(sanitizeFilenamePart('Site #123 / Catbangen (Prime)'), 'Site_123_Catbangen_Prime');
  assert.equal(sanitizeFilenamePart('Special <Chars>: & * ? " | \\ /'), 'Special_Chars');

  assert.equal(
    getPropertyPdfFilename({ name: 'ZAMBRANO BUILDING' }),
    'ZAMBRANO_BUILDING_PropertyDetails_LOCUS-SF.pdf'
  );
  assert.equal(
    getPropertyPdfFilename({ name: "LaFinns' Land" }),
    'LaFinns_Land_PropertyDetails_LOCUS-SF.pdf'
  );
  assert.equal(
    getPropertyPdfFilename({ name: 'Broker Test Commercial Site Biday' }),
    'Broker_Test_Commercial_Site_Biday_PropertyDetails_LOCUS-SF.pdf'
  );
  assert.equal(
    getPropertyPdfFilename({ id: 115, name: '' }),
    'Property_115_PropertyDetails_LOCUS-SF.pdf'
  );
  assert.equal(
    getPropertyPdfFilename({ name: 'ZAMBRANO BUILDING' }, false),
    'ZAMBRANO_BUILDING_PropertyDetails_LOCUS-SF'
  );

  console.log('✅ TEST 1 PASSED: PDF Filenames follow exact standard and sanitize invalid characters.');

  console.log('=== TEST 2: PRINT DOCUMENT.TITLE TEMPORARY SWITCH & RESTORE ===');
  const mockDoc = { title: 'Property Details | LOCUS-SF' };
  global.document = mockDoc;
  const handlers = {};
  global.window = {
    addEventListener: (event, cb) => { handlers[event] = cb; },
    removeEventListener: () => {},
  };

  const zambranoProperty = {
    id: 115,
    name: 'ZAMBRANO BUILDING',
    listingPurpose: 'lease',
    leasePrice: 500,
    leasePeriod: 'month',
    leasePriceUnit: 'sqm',
    area: 0.1498,
    category: 'Building',
    barangay: 'Catbangen',
    city: 'San Fernando',
    lat: 16.616,
    lng: 120.317,
    status: 'Available',
    parcel: {
      surveyAreaSqm: 1498,
      boundary: { type: 'Polygon', coordinates: [[[120.317, 16.616], [120.318, 16.616], [120.318, 16.617], [120.317, 16.616]]] }
    },
    assessmentComplete: true,
    iaiScore: 87.3,
    mceScore: 87.3,
    assessmentCriteria: {
      spatial_accessibility: 100,
      infrastructure_readiness: 100,
      economic_viability: 85,
      nearby_businesses: 70,
      zoning_compatibility: 70,
      risk_constraints: 85,
    },
    clupProfile: {
      zoningClassification: 'Commercial Zone 1 (C-1)',
      proposedActivity: 'res_condominium',
    },
    hazardScreening: {
      flood: { status: 'low', details: 'Elevated terrace; well-drained catchment' },
      fault: { status: 'low', proximity: '5.4 km' },
    },
    nearbyBusinesses: [
      { name: '7-Eleven Catbangen', distanceFormatted: '134 m', distanceMeters: 134 },
      { name: 'Cafe Iluminada Food Garage', distanceFormatted: '180 m', distanceMeters: 180 },
    ],
  };

  const printObj = setupPropertyDetailsPrint({ querySelectorAll: () => [] }, zambranoProperty);
  printObj.expand();
  assert.equal(document.title, 'ZAMBRANO_BUILDING_PropertyDetails_LOCUS-SF', 'Temporary title must match sanitized filename without .pdf');
  printObj.restore();
  assert.equal(document.title, 'Property Details | LOCUS-SF', 'Title must be restored after printing');

  console.log('✅ TEST 2 PASSED: Browser Print title correctly set and restored.');

  console.log('=== TEST 3: ZAMBRANO BUILDING DATA CONSISTENCY AUDIT ===');
  const calc = assessmentCalculation(zambranoProperty);
  const options = { imageUrl: () => '', path: p => p };
  const brief = investorBriefReportMarkup(zambranoProperty, options, calc);

  // 1. Check Lease Pricing & Area
  assert(brief.includes('PHP 500 / m²'), 'Lease rate unit price must clearly show PHP 500 / m²');
  assert(brief.includes('Billed per month'), 'Lease period must clearly show per month');
  assert(brief.includes('1,498 m²'), 'Land area must display 1,498 m²');
  assert(brief.includes('0.15 ha') || brief.includes('0.1498 ha'), 'Hectares must not be ambiguously rounded to 0.1 ha');
  assert(!brief.includes('>0.1 hectares<'), 'Must not display 0.1 hectares');
  assert(brief.includes('Floor area not recorded'), 'Missing leasable floor area must be stated');
  assert(brief.includes('Not Available'), 'Estimated total rent must display Not Available when floor area missing');

  // 2. Check Boundary Outline Consistency
  assert(brief.includes('Recorded outline (GIS polygon)'), 'Page 1 must report recorded outline');
  assert(!brief.includes('The property boundary has not been drawn'), 'Page 3 must NOT falsely claim boundary has not been drawn');
  assert(brief.includes('OUTLINE RECORDED'), 'Page 3 spatial callout must recognize recorded outline');

  // 3. Check Zoning Consistency between Page 2 and Page 3
  assert(brief.includes('Pending verification'), 'A scalar zoning score cannot establish a legal compatibility status');
  assert(brief.includes('<td>15%</td><td>10.5</td>'), 'Recorded zoning contribution must be 10.5 points (70 * 15%)');
  assert(!brief.includes('Permitted by Right (100 / 100)'), 'Zoning on Page 3 must NOT contradict Page 2 with 100 / 100');

  // 4. Check Risk Constraints Audit
  assert(brief.includes('2 of 6 findings recorded'), 'Hazard screening must explicitly count 2 of 6 recorded findings');
  assert(brief.includes('4 indicators remain unassessed'), 'Must clearly report 4 indicators unassessed');
  assert(brief.includes('verification pending'), 'Unverified hazard findings must retain their evidence status');

  // 5. Check Removal of LaFinns Fallbacks
  assert(!brief.includes('Beachfront property perfect for resort development'), 'Must not contain LaFinns resort description');
  assert(!brief.includes('LaFinns.png'), 'Must not contain LaFinns fallback image');
  assert(!brief.includes('Travelers accommodation'), 'Must not contain generic resort ideas');

  // 6. Check 4-Page Layout & Footers
  assert(brief.includes('id="locusBriefPage1"'), 'Must contain Page 1');
  assert(brief.includes('id="locusBriefPage2"'), 'Must contain Page 2');
  assert(brief.includes('id="locusBriefPage3"'), 'Must contain Page 3');
  assert(brief.includes('id="locusBriefPage4"'), 'Must contain Page 4');
  assert(!brief.includes('id="locusBriefPage5"'), 'Must NOT force Page 5 by default');
  const printCss = readFileSync('assets/css/property-details.css', 'utf8');
  assert(printCss.includes("counter(page) ' / ' counter(pages)"), 'PDF page numbers must follow actual pagination, including long content');
  assert(!brief.includes('Page 1 of 4'), 'Markup must not hardcode a page count that becomes false on overflow');

  // 7. Check Single Authoritative Calculation Table (no duplicate bars)
  assert(!brief.includes('class="locus-brief-score-bars"'), 'Must NOT have duplicate horizontal score bars');
  assert(brief.includes('locus-brief-assessment-table'), 'Must have single authoritative calculation table');
  assert(brief.includes('IAI = round(20 + 20 + 17 + 7 + 10.5 + 12.75, 1) = 87.3 / 100'), 'Calculation must retain unrounded contributions and round the total once');

  console.log('✅ TEST 3 PASSED: Zambrano Building data inconsistencies and 4-page layout verified.');

  console.log('=== TEST 4: SALE PROPERTY WITH FULL PERMITTED ZONING AUDIT ===');
  const saleProperty = {
    id: 42,
    name: 'Prime Highway Commercial Lot',
    listingPurpose: 'sale',
    price: 15000000,
    area: 0.3000,
    category: 'Commercial Land',
    barangay: 'Biday',
    city: 'San Fernando',
    lat: 16.620,
    lng: 120.320,
    status: 'Available',
    parcel: { surveyAreaSqm: 3000, boundary: null },
    assessmentComplete: true,
    assessmentCriteria: {
      spatial_accessibility: 100,
      infrastructure_readiness: 100,
      economic_viability: 85,
      nearby_businesses: 85,
      zoning_compatibility: 100,
      risk_constraints: 85,
    },
    clupProfile: { zoningClassification: 'C-1', proposedActivity: 'commercial_retail' },
    nearbyBusinesses: [{ name: 'Biday Mall', distanceFormatted: '50 m', distanceMeters: 50 }],
  };

  const saleCalc = assessmentCalculation(saleProperty);
  const saleBrief = investorBriefReportMarkup(saleProperty, options, saleCalc);

  assert(saleBrief.includes('For sale'), 'Purpose must show For sale');
  assert(saleBrief.includes('PHP 15,000,000'), 'Asking price must show PHP 15,000,000');
  assert(saleBrief.includes('PHP 5,000'), 'Asking price per m² must compute PHP 5,000 (15M / 3000 m²)');
  assert(saleBrief.includes('Pending verification'), 'A numeric zoning rating must not be transformed into a claim of statutory permission');
  assert(saleBrief.includes('PIN-BASED'), 'Page 3 must recognize pin-based when boundary is absent');
  assert.equal(getPropertyPdfFilename(saleProperty), 'Prime_Highway_Commercial_Lot_PropertyDetails_LOCUS-SF.pdf');

  console.log('✅ TEST 4 PASSED: Sale property layout and calculations verified.');

  console.log('====================================================');
  console.log('ALL INVESTOR PDF / PRINT REFINEMENT TESTS PASSED!');
  console.log('====================================================');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
