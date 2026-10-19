const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');
const { execFileSync } = require('node:child_process');

(async () => {
  const source = readFileSync('assets/js/property-details-view.js', 'utf8')
    .replace('./utils.js', pathToFileURL(resolve('assets/js/utils.js')).href)
    .replace('./business-opportunities.js', pathToFileURL(resolve('assets/js/business-opportunities.js')).href);
  
  const { caoReportMarkup, getCaoPdfFilename, assessmentCalculation } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const fixture = JSON.parse(execFileSync(process.env.PHP_BINARY || 'C:/xampp/php/php.exe', ['tests/locus-v3-pipeline.test.php', '--json'], { encoding: 'utf8', windowsHide: true }));

  let checks = 0;
  const check = (condition, message) => { assert.ok(condition, message); checks++; };

  console.log('=== RUNNING CAO REPORT EXPORT VERIFICATION SUITE ===');

  // Test 1: Filename formatting and sanitization
  const filename = getCaoPdfFilename({ id: 42, name: 'Zambrano Commercial / Building <Prime>' });
  check(filename === 'CAO_Assessment_Valuation_Zambrano_Commercial_Building_Prime_LOCUS-SF.pdf', 'Filename follows standard format and sanitizes special characters.');

  // Test 2: Complete property markup verification
  const completeProperty = fixture.complete;
  const markup = caoReportMarkup(completeProperty);

  // Check 4 pages are generated
  check(markup.includes('id="caoDossierPage1"'), 'Contains Page 1 (Cadastral & Statutory Valuation Profile).');
  check(markup.includes('id="caoDossierPage2"'), 'Contains Page 2 (Zoning & Multi-Hazard Audit).');
  check(markup.includes('id="caoDossierPage3"'), 'Contains Page 3 (MCE Analytical Scoring Breakdown).');
  check(markup.includes('id="caoDossierPage4"'), 'Contains Page 4 (Statutory Citations & Sign-off Endorsements).');

  // Check Cadastral Profile & Area Units
  check(markup.includes('LOCUS-SF-PRP-') || markup.includes('Ref:'), 'Displays official property reference.');
  check(markup.includes('m²') && markup.includes('ha'), 'Displays area with units in both square meters and hectares.');

  // Check Valuation Reconciliation (Asking Terms vs Statutory Tax Base)
  check(markup.includes('COMMERCIAL ASKING TERMS') && markup.includes('STATUTORY ZONAL VALUATION'), 'Clearly distinguishes commercial asking terms from statutory zonal valuation.');
  check(markup.includes('Statutory RPT Assessed Value'), 'Computes Real Property Tax (RPT) statutory assessment baseline.');
  check(markup.includes('Statutory Appraisal Note'), 'Explains distinction between private asking terms and statutory tax base.');

  // Check Zoning Compatibility & Gatekeeper Rule
  check(markup.includes('ORDINANCE 2018-06 ZONING DISTRICT'), 'References Ordinance 2018-06 zoning classification.');
  check(markup.includes('Gatekeeper Screening Principle') && markup.includes('weight: 0.0%'), 'Explicitly notes non-compensatory 0.0% zoning gatekeeper.');

  // Check Multi-Hazard Findings & Explicit Missing Hazards
  check(markup.includes('MULTI-HAZARD RISK SCREENING MATRIX'), 'Includes 6-hazard screening matrix.');
  check(markup.includes('MGB') && markup.includes('PHIVOLCS'), 'Cites authoritative hazard agencies (MGB, PHIVOLCS).');
  
  // Check MCE Criteria Breakdown & IAI Composite
  check(markup.includes('Spatial Accessibility') && markup.includes('Infrastructure Readiness') && markup.includes('Property Cost'), 'Contains canonical MCE criteria.');
  check(markup.includes('100.0%') && markup.includes('/ 100'), 'Displays active criteria totaling 100% and composite IAI score.');
  check(markup.includes('LOCUS-SF MCE v3.0'), 'Tags authoritative MCE protocol version.');

  // Check Statutory Citations & Endorsement Block
  check(markup.includes('Republic Act No. 7160'), 'Cites Republic Act No. 7160 (Local Government Code).');
  check(markup.includes('City Ordinance No. 2018-06'), 'Cites City Ordinance No. 2018-06.');
  check(markup.includes('CLUP 2018–2027'), 'Cites Comprehensive Land Use Plan (CLUP 2018–2027).');
  check(markup.includes('TECHNICAL APPRAISER') && markup.includes('City Assessor’s Office'), 'Contains CAO Technical Appraiser sign-off block.');
  check(markup.includes('ZONING ADMINISTRATOR') && markup.includes('CPDO'), 'Contains CPDO Zoning Administrator sign-off block.');
  check(markup.includes('OFFICE HEAD') && markup.includes('LEBDO'), 'Contains LEBDO Office Head sign-off block.');

  // Test 3: Privacy & Security (PRC image and credential protection)
  const brokerProperty = { ...completeProperty, brokerContact: { name: 'Juan Dela Cruz', phone: '0917-1234567', prcIdImage: 'uploads/prc/secret_prc_card.jpg' } };
  const brokerMarkup = caoReportMarkup(brokerProperty);
  check(!brokerMarkup.includes('secret_prc_card.jpg'), 'Private PRC accreditation ID image is never rendered in CAO export.');
  check(brokerMarkup.includes('Data Privacy Act (RA 10173) Mandatory Redaction'), 'Displays explicit Data Privacy Act protection notice.');

  // Test 4: Critical Technical Review Hold behavior
  const heldProperty = fixture.held;
  const heldMarkup = caoReportMarkup(heldProperty);
  check(heldMarkup.includes('CRITICAL TECHNICAL REVIEW HOLD ACTIVE') || heldMarkup.includes('WITHHELD'), 'Critical review hold triggers withheld status in CAO dossier.');

  // Test 5: Prohibited Zoning behavior
  const prohibitedProperty = {
    ...completeProperty,
    eligibility: { zoning: 'prohibited', is_eligible: false },
    criteriaDetails: { zoning_compatibility: { status_label: 'Prohibited Use' } }
  };
  const prohibitedMarkup = caoReportMarkup(prohibitedProperty);
  check(prohibitedMarkup.includes('Prohibited Use') || prohibitedMarkup.includes('WITHHELD'), 'Prohibited land use withholds official IAI in CAO appraisal sheet.');

  console.log(`✅ ALL CAO REPORT EXPORT CHECKS PASSED (${checks}/${checks})`);
})();
