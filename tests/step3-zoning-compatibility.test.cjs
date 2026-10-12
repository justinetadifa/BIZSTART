const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=========================================================');
console.log('TEST SUITE: STEP 3 ZONING COMPATIBILITY (FRONTEND / VIEW / CSS / JS)');
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

// 1. Check property-wizard-view.php
const viewPath = path.join(__dirname, '..', 'app', 'Support', 'property-wizard-view.php');
const viewContent = fs.readFileSync(viewPath, 'utf8');

check('property-wizard-view.php exists and has content', viewContent.length > 0);
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

check('Contains category select #pwZoningCategory with 9 categories',
  viewContent.includes('id="pwZoningCategory"') &&
  viewContent.includes('value="retail"') &&
  viewContent.includes('value="food"') &&
  viewContent.includes('value="offices"') &&
  viewContent.includes('value="residential"') &&
  viewContent.includes('value="industrial"') &&
  viewContent.includes('value="agricultural"') &&
  viewContent.includes('value="tourism"') &&
  viewContent.includes('value="logistics"') &&
  viewContent.includes('value="institutional"')
);

check('Contains specific activity select #pwZoningActivity with 29 activities',
  viewContent.includes('id="pwZoningActivity"') &&
  viewContent.includes('value="retail_convenience"') &&
  viewContent.includes('value="food_restaurant"') &&
  viewContent.includes('value="office_bpo"') &&
  viewContent.includes('value="res_apartments"') &&
  viewContent.includes('value="ind_heavy_manufacturing"') &&
  viewContent.includes('value="agri_crop_production"') &&
  viewContent.includes('value="tour_resort"') &&
  viewContent.includes('value="log_warehouse"') &&
  viewContent.includes('value="inst_hospital"')
);

check('Contains observed existing land use input',
  viewContent.includes('name="existing_land_use"') || viewContent.includes('id="pwExistingLandUse"')
);

check('Contains live Automatic Compatibility Result Card',
  viewContent.includes('data-zoning-result-card') &&
  viewContent.includes('data-zoning-status-badge') &&
  viewContent.includes('data-zoning-score-display') &&
  viewContent.includes('data-zoning-mce-contrib') &&
  viewContent.includes('data-zoning-gate-display') &&
  viewContent.includes('data-zoning-conditions-disclosure')
);

check('Embeds #pwZoningEngineData JSON script tag with version and rules',
  viewContent.includes('id="pwZoningEngineData"') &&
  viewContent.includes('application/json')
);

// 2. Check property-wizard.js
const jsPath = path.join(__dirname, '..', 'assets', 'js', 'property-wizard.js');
const jsContent = fs.readFileSync(jsPath, 'utf8');

check('property-wizard.js contains evaluateZoningCompatibilityClient', jsContent.includes('evaluateZoningCompatibilityClient'));
check('property-wizard.js contains syncZoningCompatibility', jsContent.includes('syncZoningCompatibility'));
check('property-wizard.js contains filterZoningActivitiesByCategory', jsContent.includes('filterZoningActivitiesByCategory'));
check('property-wizard.js recognizes proposed_activity in serialize and setProperty',
  jsContent.includes('proposed_activity') && jsContent.includes('pwZoningActivity')
);

// 3. Check property-wizard.css
const cssPath = path.join(__dirname, '..', 'assets', 'css', 'property-wizard.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

check('property-wizard.css contains .pw-zoning-card', cssContent.includes('.pw-zoning-card'));
check('property-wizard.css contains .pw-zoning-result-card', cssContent.includes('.pw-zoning-result-card'));
check('property-wizard.css contains .pw-zoning-conditions-disclosure', cssContent.includes('.pw-zoning-conditions-disclosure'));

console.log('\n=========================================================');
console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('=========================================================');

if (failed > 0) {
  process.exit(1);
}
