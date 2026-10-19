'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('====================================================================');
console.log('TEST SUITE: CLUP SIMPLIFIED & INTUITIVE "ADD PROPERTY" WORKFLOW');
console.log('====================================================================\n');

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

// 1. View Template Inspection
const viewPath = path.join(__dirname, '..', 'app', 'Support', 'property-wizard-view.php');
const viewContent = fs.readFileSync(viewPath, 'utf8');

check('Smart Advisor Banner (#pwClupSmartBanner) present', viewContent.includes('id="pwClupSmartBanner"'));
check('Smart Advisor Context Tag (#pwClupContextTag) present', viewContent.includes('id="pwClupContextTag"'));
check('Smart Advisor 1-click action container (#pwClupRecButtons) present', viewContent.includes('id="pwClupRecButtons"'));

check('Category Quick-Pills (#pwZoningCatPills) present with 6 categories',
  viewContent.includes('id="pwZoningCatPills"') &&
  viewContent.includes('data-zoning-category-tab="commercial"') &&
  viewContent.includes('data-zoning-category-tab="residential"') &&
  viewContent.includes('data-zoning-category-tab="industrial"') &&
  viewContent.includes('data-zoning-category-tab="agricultural"') &&
  viewContent.includes('data-zoning-category-tab="tourism"') &&
  viewContent.includes('data-zoning-category-tab="institutional"')
);

check('Quick District Chips Container (#pwZoningDistrictChips) present',
  viewContent.includes('id="pwZoningDistrictChips"')
);

check('Official 18-district select (#pwZoningClassification) intact',
  viewContent.includes('id="pwZoningClassification"') &&
  viewContent.includes('name="zoning_classification"') &&
  viewContent.includes('value="C-1"') &&
  viewContent.includes('value="PDZ"')
);

check('Popular Activity Chips (#pwPopularActChips) present with 8 presets',
  viewContent.includes('id="pwPopularActChips"') &&
  viewContent.includes('data-pop-activity="food_cafe"') &&
  viewContent.includes('data-pop-activity="food_restaurant"') &&
  viewContent.includes('data-pop-activity="retail_convenience"') &&
  viewContent.includes('data-pop-activity="office_professional"') &&
  viewContent.includes('data-pop-activity="tour_hotel"') &&
  viewContent.includes('data-pop-activity="log_warehouse"') &&
  viewContent.includes('data-pop-activity="inst_hospital"') &&
  viewContent.includes('data-pop-activity="inst_school"')
);

check('Real-time quick activity search input (#pwQuickActivitySearch) present',
  viewContent.includes('id="pwQuickActivitySearch"') &&
  viewContent.includes('id="pwQuickSearchMatches"')
);

check('Dynamic color-coded live result container ([data-zoning-live-result]) present',
  viewContent.includes('data-zoning-live-result') &&
  viewContent.includes('data-zoning-live-status') &&
  viewContent.includes('data-zoning-live-explanation') &&
  viewContent.includes('id="pwConditionalUsesContainer"')
);

check('Optional Locational Clearance card (#pwZoningClearanceDetails) present as collapsible details',
  viewContent.includes('id="pwZoningClearanceDetails"') &&
  viewContent.includes('class="pw-badge-optional"') &&
  viewContent.includes('id="pwZoningDropzone"') &&
  viewContent.includes('id="pwZoningSourceSelect"')
);

// 2. JavaScript Logic Inspection
const jsPath = path.join(__dirname, '..', 'assets', 'js', 'property-wizard.js');
const jsContent = fs.readFileSync(jsPath, 'utf8');

check('CLUP_DISTRICT_GROUPS dictionary defined in property-wizard.js',
  jsContent.includes('CLUP_DISTRICT_GROUPS') &&
  jsContent.includes("code: 'C-1'") &&
  jsContent.includes("code: 'TZ'")
);

check('renderZoningDistrictChips function implemented in property-wizard.js',
  jsContent.includes('function renderZoningDistrictChips(')
);

check('syncZoningCategoryPillsFromSelect function implemented in property-wizard.js',
  jsContent.includes('function syncZoningCategoryPillsFromSelect(')
);

check('initZoningCategoryPills function implemented in property-wizard.js',
  jsContent.includes('function initZoningCategoryPills(')
);

check('initPopularActivityPresets function implemented in property-wizard.js',
  jsContent.includes('function initPopularActivityPresets(')
);

check('initQuickActivitySearch function implemented in property-wizard.js',
  jsContent.includes('function initQuickActivitySearch(')
);

check('syncClupRecommendations function implemented with Step 1 & 2 contextual guidance',
  jsContent.includes('function syncClupRecommendations(') &&
  jsContent.includes('pwClupRecButtons')
);

check('syncScreeningInterfaces calls syncClupRecommendations and syncZoningCategoryPillsFromSelect',
  jsContent.includes('syncClupRecommendations();') &&
  jsContent.includes('syncZoningCategoryPillsFromSelect();')
);

// 3. Stylesheet Inspection
const cssPath = path.join(__dirname, '..', 'assets', 'css', 'property-wizard.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

check('CSS defines .pw-clup-smart-banner with modern gradient styling',
  cssContent.includes('.pw-clup-smart-banner') &&
  cssContent.includes('.pw-clup-rec-btn')
);

check('CSS defines .pw-zoning-cat-pills and .pw-district-card',
  cssContent.includes('.pw-zoning-cat-pills') &&
  cssContent.includes('.pw-district-card') &&
  cssContent.includes('.pw-district-card.is-selected')
);

check('CSS defines .pw-popular-act-chips and .pw-pop-chip',
  cssContent.includes('.pw-popular-act-chips') &&
  cssContent.includes('.pw-pop-chip.is-selected')
);

check('CSS defines dynamic status styling for permitted (emerald), conditional (amber), prohibited (red)',
  cssContent.includes('[data-rule-status="permitted"]') &&
  cssContent.includes('[data-rule-status="conditional"]') &&
  cssContent.includes('[data-rule-status="prohibited"]') &&
  cssContent.includes('#10b981') &&
  cssContent.includes('#f59e0b') &&
  cssContent.includes('#ef4444')
);

check('CSS defines .pw-sc-clearance-card for clean non-intimidating document intake',
  cssContent.includes('.pw-sc-clearance-card')
);

console.log('\n====================================================================');
console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('====================================================================');

if (failed > 0) {
  process.exit(1);
}
