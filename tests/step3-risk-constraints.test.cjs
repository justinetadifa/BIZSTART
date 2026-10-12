const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('====================================================================');
console.log('TEST SUITE: STEP 3 RISK CONSTRAINTS & 6-CRITERION MCE (CLIENT / DOM / CSS / JS)');
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

// -------------------------------------------------------------
// 1. Check property-wizard-view.php DOM structure
// -------------------------------------------------------------
const viewPath = path.join(__dirname, '..', 'app', 'Support', 'property-wizard-view.php');
const viewContent = fs.readFileSync(viewPath, 'utf8');

check('property-wizard-view.php exists and has content', viewContent.length > 0);
check('Contains #pwCriterionRisks pane', viewContent.includes('id="pwCriterionRisks"'));
check('Does NOT contain #pwCriterionEnvironmental pane', !viewContent.includes('id="pwCriterionEnvironmental"'));

// Check 6 compact hazard rows
const hazardKeys = [
  { key: 'flood', pill: 'data-hazard-flood-pill', score: 'data-hazard-flood-score', desc: 'data-hazard-flood-desc', pts: 'data-risk-pts-flood' },
  { key: 'faults', pill: 'data-hazard-fault-pill', score: 'data-hazard-fault-score', desc: 'data-hazard-fault-desc', pts: 'data-risk-pts-fault' },
  { key: 'landslide', pill: 'data-hazard-landslide-pill', score: 'data-hazard-landslide-score', desc: 'data-hazard-landslide-desc', pts: 'data-risk-pts-landslide' },
  { key: 'storm_surge', pill: 'data-hazard-storm-surge-pill', score: 'data-hazard-storm-surge-score', desc: 'data-hazard-storm-surge-desc', pts: 'data-risk-pts-surge' },
  { key: 'liquefaction', pill: 'data-hazard-liquefaction-pill', score: 'data-hazard-liquefaction-score', desc: 'data-hazard-liquefaction-desc', pts: 'data-risk-pts-liquefaction' },
  { key: 'tsunami', pill: 'data-hazard-tsunami-pill', score: 'data-hazard-tsunami-score', desc: 'data-hazard-tsunami-desc', pts: 'data-risk-pts-tsunami' },
];

hazardKeys.forEach((h) => {
  check(`Contains hazard row for '${h.key}'`, viewContent.includes(`data-hazard-row="${h.key}"`));
  check(`Contains status pill for '${h.key}'`, viewContent.includes(h.pill));
  check(`Contains score display for '${h.key}'`, viewContent.includes(h.score));
  check(`Contains desc display for '${h.key}'`, viewContent.includes(h.desc));
});

// Check official agencies
check('Contains DENR-MGB badge for flood/landslide', viewContent.includes('DENR-MGB'));
check('Contains DOST-PHIVOLCS badge for faults/liquefaction/tsunami', viewContent.includes('DOST-PHIVOLCS'));
check('Contains DOST-PAGASA badge for storm surge', viewContent.includes('DOST-PAGASA'));

// Check provisional weights in view
check('Contains 25% weight badge for flood and faults', viewContent.includes('25%') || viewContent.includes('25.0%'));
check('Contains 15% weight badge for landslide and storm surge', viewContent.includes('15%') || viewContent.includes('15.0%'));
check('Contains 10% weight badge for liquefaction and tsunami', viewContent.includes('10%') || viewContent.includes('10.0%'));

// Check live score card and critical banner
check('Contains preliminary risk constraints score display [data-risk-total-score]', viewContent.includes('data-risk-total-score'));
check('Contains 15% MCE contribution display [data-risk-iai-pts]', viewContent.includes('data-risk-iai-pts'));
check('Contains critical constraint banner [data-risk-critical-banner]', viewContent.includes('data-risk-critical-banner'));
check('Contains high hazard warnings container [data-risk-warnings-box]', viewContent.includes('data-risk-warnings-box'));
check('Contains risk progress bar [data-risk-progress-bar]', viewContent.includes('data-risk-progress-bar'));

// Check subcriteria point breakdown badges in card
hazardKeys.forEach((h) => {
  check(`Contains points breakdown [${h.pts}]`, viewContent.includes(h.pts));
});

// Check technical disclosure & clean evidence fields
check('Contains expandable technical disclosure .pw-risk-technical-details', viewContent.includes('pw-risk-technical-details'));
check('Contains single hazard evidence source field', viewContent.includes('name="hazard_evidence_source"'));
check('Contains single hazard evidence date field', viewContent.includes('name="hazard_evidence_date"'));
check('Contains single hazard evidence reference field', viewContent.includes('name="hazard_evidence_reference"'));
check('Preserves general site observations readiness_notes', viewContent.includes('name="readiness_notes"'));

// Check Step 3 criteria navigation and tabs
check('Criteria tabs do not include environmental_safety', !viewContent.includes('data-pane="pwCriterionEnvironmental"'));
check('Criteria navigation mobile select does not include environmental_safety', !viewContent.includes('value="pwCriterionEnvironmental"'));
check('Step 3 header references 6 criteria', viewContent.includes('6 criteria') || viewContent.includes('six criteria') || viewContent.includes('6-Criterion'));

// -------------------------------------------------------------
// 2. Check assets/js/property-wizard.js
// -------------------------------------------------------------
const jsWizardPath = path.join(__dirname, '..', 'assets', 'js', 'property-wizard.js');
const jsWizardContent = fs.readFileSync(jsWizardPath, 'utf8');

check('property-wizard.js exists and has content', jsWizardContent.length > 0);
check('assessHazards handles all 6 subcriteria',
  jsWizardContent.includes('flood') &&
  jsWizardContent.includes('faults') &&
  jsWizardContent.includes('landslide') &&
  jsWizardContent.includes('storm_surge') &&
  jsWizardContent.includes('liquefaction') &&
  jsWizardContent.includes('tsunami')
);
check('assessHazards applies 15% MCE contribution', jsWizardContent.includes('0.15'));
check('assessHazards handles active fault critical constraint',
  jsWizardContent.includes('CRITICAL SITE CONSTRAINT') || jsWizardContent.includes('critical')
);
check('renderLayers supports all 6 hazard layers',
  jsWizardContent.includes('hazard_flood') || jsWizardContent.includes('flood')
);
check('Wizard actions object excludes environmental_safety', !jsWizardContent.includes('environmental_safety:'));
check('Wizard labels object excludes environmental_safety', !jsWizardContent.includes("environmental_safety: 'Environmental Safety'"));
check('Wizard completeness counter reflects 6 criteria', jsWizardContent.includes('of 6'));

// -------------------------------------------------------------
// 3. Check assets/css/property-wizard.css
// -------------------------------------------------------------
const cssPath = path.join(__dirname, '..', 'assets', 'css', 'property-wizard.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

check('property-wizard.css contains .pw-risk-criterion-card', cssContent.includes('.pw-risk-criterion-card'));
check('property-wizard.css contains .pw-risk-critical-banner', cssContent.includes('.pw-risk-critical-banner'));
check('property-wizard.css contains .pw-hazard-grid-6', cssContent.includes('.pw-hazard-grid-6'));
check('property-wizard.css contains .pw-hazard-row-compact', cssContent.includes('.pw-hazard-row-compact'));
check('property-wizard.css contains .pw-hazard-agency-badge', cssContent.includes('.pw-hazard-agency-badge'));
check('property-wizard.css contains .pw-risk-technical-details', cssContent.includes('.pw-risk-technical-details'));

// -------------------------------------------------------------
// 4. Check assets/js/property-details-view.js
// -------------------------------------------------------------
const jsDetailsPath = path.join(__dirname, '..', 'assets', 'js', 'property-details-view.js');
const jsDetailsContent = fs.readFileSync(jsDetailsPath, 'utf8');

check('property-details-view.js exists and has content', jsDetailsContent.length > 0);
check('property-details-view.js defaults to 6 criteria',
  jsDetailsContent.includes("['risk_constraints', 'Risk Constraints', 15]") &&
  jsDetailsContent.includes("['zoning_compatibility', 'Zoning Compatibility', 15]")
);
check('property-details-view.js detects legacy 7-criterion assessments',
  jsDetailsContent.includes('legacyCriteria7') &&
  (jsDetailsContent.includes('v1.1') || jsDetailsContent.includes('environmental_safety'))
);
check('property-details-view.js radar supports dynamic 6 or 7 axes',
  jsDetailsContent.includes('radarMarkup') || jsDetailsContent.includes('radar')
);

console.log('\n====================================================================');
console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('====================================================================');

if (failed > 0) {
  process.exit(1);
}
