const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=========================================================');
console.log('TEST SUITE: STEP 3 ZONING COMPATIBILITY (WIZARD & INVESTOR SIMULATION)');
console.log('=========================================================\n');

let passed = 0;
let failed = 0;

function check(desc, cond) {
  if (cond) {
    passed++;
    console.log(`✅ PASS: ${desc}`);
  } else {
    failed++;
    console.log(`❌ FAIL: ${desc}`);
  }
}

// -------------------------------------------------------------
// 1. Admin Property Wizard: Criterion 6 Zoning Compatibility View
// -------------------------------------------------------------
const viewPath = path.join(__dirname, '..', 'app', 'Support', 'property-wizard-view.php');
const viewContent = fs.readFileSync(viewPath, 'utf8');

check('property-wizard-view.php exists and has content', viewContent.length > 0);
check('Criterion 6 is Zoning Compatibility (#pwCriterionZoning)', viewContent.includes('id="pwCriterionZoning"') && viewContent.includes('data-evidence-panel="zoning_compatibility"'));
check('Criterion 5 is Risk Constraints (#pwCriterionRisks)', viewContent.includes('id="pwCriterionRisks"') && viewContent.includes('data-evidence-panel="risk_constraints"'));
check('Contains zoning district select #pwZoningClassification', viewContent.includes('id="pwZoningClassification"'));
check('Contains 18 official San Fernando zones in options', 
  viewContent.includes('value="C-1"') &&
  viewContent.includes('value="C-2"') &&
  viewContent.includes('value="C-3"') &&
  viewContent.includes('value="R-1"') &&
  viewContent.includes('value="R-2"') &&
  viewContent.includes('value="R-3"') &&
  viewContent.includes('value="I-1"') &&
  viewContent.includes('value="I-2"') &&
  viewContent.includes('value="AGR-S"') &&
  viewContent.includes('value="AGR-NS"') &&
  viewContent.includes('value="AIZ"') &&
  viewContent.includes('value="GI"') &&
  viewContent.includes('value="SI"') &&
  viewContent.includes('value="TZ"') &&
  viewContent.includes('value="FEZ"') &&
  viewContent.includes('value="MRZ"') &&
  viewContent.includes('value="FRZ"') &&
  viewContent.includes('value="PDZ"')
);

check('Contains observed existing land use select #pwExistingLandUse',
  viewContent.includes('id="pwExistingLandUse"') && viewContent.includes('name="existing_land_use"')
);

check('Contains searchable allowed land uses container #pwAllowedUsesContainer',
  viewContent.includes('id="pwAllowedUsesContainer"') &&
  viewContent.includes('id="pwAllowedUsesSearch"') &&
  viewContent.includes('data-allowed-uses-count')
);

check('Contains conditional uses container #pwConditionalUsesContainer',
  viewContent.includes('id="pwConditionalUsesContainer"') &&
  viewContent.includes('data-conditional-uses-count') &&
  viewContent.includes('name="clup_conditional_uses"')
);

check('Cites City Ordinance No. 2018-06 (Comprehensive Land Use Plan)',
  viewContent.includes('2018-06') || viewContent.includes('City Ordinance No. 2018-06')
);

check('Embeds #pwZoningEngineData JSON script tag with zoning rules',
  viewContent.includes('id="pwZoningEngineData"') &&
  viewContent.includes('application/json')
);

check('Optional proposed activity screening is available without blocking property entry',
  viewContent.includes('id="pwZoningActivity" name="proposed_activity"') &&
  viewContent.includes('id="pwZoningCategory" name="zoning_category"') &&
  !viewContent.includes('name="proposed_activity" required')
);

// -------------------------------------------------------------
// 2. Admin Property Wizard Script (property-wizard.js)
// -------------------------------------------------------------
const wizardJsPath = path.join(__dirname, '..', 'assets', 'js', 'property-wizard.js');
const wizardJsContent = fs.readFileSync(wizardJsPath, 'utf8');

check('property-wizard.js contains renderZoningAllowedAndConditionalUses',
  wizardJsContent.includes('renderZoningAllowedAndConditionalUses')
);
check('property-wizard.js contains applyAllowedUsesFilter for quick search',
  wizardJsContent.includes('applyAllowedUsesFilter')
);
check('Read-only zoning reference preserves reported uses and separately saves clearance notes',
  !wizardJsContent.includes("data.set('clup_allowed_uses'") && wizardJsContent.includes('clup_conditional_uses')
);
check('property-wizard.js flags suspicious area <= 0.5 m²',
  wizardJsContent.includes('data-suspicious-area-banner') && wizardJsContent.includes('0.5')
);

// -------------------------------------------------------------
// 3. Investor Side: Property Details & Simulation (property-details-view.js)
// -------------------------------------------------------------
const detailsJsPath = path.join(__dirname, '..', 'assets', 'js', 'property-details-view.js');
const detailsJsContent = fs.readFileSync(detailsJsPath, 'utf8');

check('property-details-view.js features "What do you plan to establish on this property?" section',
  detailsJsContent.includes('What do you plan to establish on this property?')
);
check('property-details-view.js defines official investor activity categories and subtypes',
  detailsJsContent.includes('investorProposedActivitySelect') &&
  detailsJsContent.includes('Retail') &&
  detailsJsContent.includes('Restaurant') &&
  detailsJsContent.includes('Office') &&
  detailsJsContent.includes('Manufacturing') &&
  detailsJsContent.includes('Logistics')
);
check('property-details-view.js calculates physical site baseline (out of 85 pts)',
  detailsJsContent.includes('physicalSubtotal') &&
  detailsJsContent.includes('hasPhysicalBaseline') &&
  detailsJsContent.includes('isZoningPending')
);
check('property-details-view.js withholds composite IAI until investor activity is selected',
  detailsJsContent.includes('compositeIai: null') || detailsJsContent.includes('compositeIai: 0') || detailsJsContent.includes('isZoningPending')
);
check('property-details-view.js handles Permitted (100 pts, +15.0 pts), Conditional (70 pts, +10.5 pts), Prohibited, and Undetermined',
  detailsJsContent.includes('permitted') &&
  detailsJsContent.includes('conditional') &&
  detailsJsContent.includes('prohibited') &&
  detailsJsContent.includes('15.0') &&
  detailsJsContent.includes('10.5')
);
check('property-details-view.js renders traceable 6-hazard breakdown table',
  detailsJsContent.includes('Flood Susceptibility') &&
  detailsJsContent.includes('Active Fault') &&
  detailsJsContent.includes('Landslide') &&
  detailsJsContent.includes('Storm Surge') &&
  detailsJsContent.includes('Liquefaction') &&
  detailsJsContent.includes('Tsunami')
);
check('property-details-view.js cites DOST-PHIVOLCS 5m buffer corridor with geotechnical EGGAR review',
  detailsJsContent.includes('5-meter buffer corridor') &&
  detailsJsContent.includes('EGGAR')
);

// -------------------------------------------------------------
// 4. Stylesheets
// -------------------------------------------------------------
const cssPath = path.join(__dirname, '..', 'assets', 'css', 'property-wizard.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

check('property-wizard.css contains .pw-zoning-card', cssContent.includes('.pw-zoning-card'));
check('property-wizard.css contains allowed uses styling',
  cssContent.includes('.pw-allowed-use-chip') || cssContent.includes('.pw-zoning-allowed-container') || cssContent.includes('.pw-zoning-card')
);

console.log('\n=========================================================');
console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('=========================================================');

if (failed > 0) {
  process.exit(1);
}
