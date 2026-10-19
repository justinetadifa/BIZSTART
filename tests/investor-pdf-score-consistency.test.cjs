const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const vm = require('node:vm');

(async () => {
  const source = readFileSync('assets/js/property-details-view.js', 'utf8')
    .replace('./utils.js', pathToFileURL(resolve('assets/js/utils.js')).href)
    .replace('./business-opportunities.js', pathToFileURL(resolve('assets/js/business-opportunities.js')).href);
  const { assessmentCalculation, assessmentPresentation, propertyAssessmentMarkup, calculationMarkup, investorBriefReportMarkup: brief } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const { potentialIncentive } = await import(pathToFileURL(resolve('assets/js/investment-policy.js')).href);
  const fixtures = JSON.parse(execFileSync(process.env.PHP_BINARY || 'C:/xampp/php/php.exe', ['tests/locus-v3-pipeline.test.php', '--json'], { encoding: 'utf8', windowsHide: true }));
  // Reproduce the reported five ratings and a stale "complete" alias alongside a real hold.
  const saved = structuredClone(fixtures.complete);
  const scores = { spatial_accessibility: 100, infrastructure_readiness: 100,
    property_cost_market_competitiveness: 50, economic_viability: 50, nearby_businesses: 79, risk_constraints: 67.5 };
  for (const [key, score] of Object.entries(scores)) {
    saved.criterion_scores[key] = score;
    saved.assessmentCriteria[key] = score;
    if (saved.weight_configuration[key] != null) saved.weighted_contributions[key] = score * saved.weight_configuration[key] / 100;
    const row = saved.criteriaBreakdown.find(row => row.key === key);
    if (row) Object.assign(row, { score, weighted_score: score * row.weight / 100 });
  }
  Object.assign(saved, { id: 216, name: "LA FINN'S SCHOLASTICA", displayed_iai: 82, iaiScore: 82, mceScore: 82, iai: 82, iai_score: 82, mce_score: 82,
    unrounded_total: 81.975, technical_review_hold: true,
    technical_review_reasons: ['Flood Susceptibility: technical review required.', 'Tsunami Exposure: technical review required.'] });
  const savedBefore = JSON.stringify(saved);
  const calculation = assessmentCalculation(saved);
  assert.equal(calculation.recordedTotal, 82);
  assert.equal(calculation.iai, null);
  assert.equal(assessmentPresentation(saved).index, 82);
  assert.equal(assessmentPresentation(saved).provisional, true);
  assert.equal(assessmentPresentation(saved).releaseStatus, 'Pending review');
  assert.ok(propertyAssessmentMarkup(saved).includes('PROVISIONAL INVESTMENT ATTRACTIVENESS INDEX'));
  assert.ok(calculationMarkup(saved).includes('round(25 + 25 + 10 + 11.85 + 10.125, 1) = 82.0'));
  const held = brief(saved);
  assert.match(held, /data-brief-recorded-total>82\.0<small>\/ 100/);
  assert.match(held, /data-brief-iai-score>82\.0 \/ 100/);
  assert.match(held, /data-brief-released-iai>Pending review/);
  assert.match(held, /data-brief-release-status>Provisional · Technical review required/);
  assert.match(held, /Recorded MCE = round\(25 \+ 25 \+ 10 \+ 11\.85 \+ 10\.125, 1\) = 82\.0 \/ 100/);
  assert.ok(!held.includes('No composite is calculated from partial evidence.'));
  assert.ok(!held.includes('class="brief-pill">Complete'));
  const unverified = structuredClone(saved);
  Object.assign(unverified, { technical_review_hold: false, technical_review_reasons: [] });
  unverified.evidence_verification.spatial_accessibility.status = 'reported_unverified';
  assert.equal(assessmentCalculation(unverified).iai, null, 'A stale complete flag cannot override reported, unverified evidence.');
  assert.equal(assessmentPresentation(unverified).index, 82);
  const unconfirmedUse = structuredClone(saved);
  Object.assign(unconfirmedUse, { technical_review_hold: false, technical_review_reasons: [], eligibility: { zoning: 'unverified', is_eligible: false } });
  assert.equal(assessmentCalculation(unconfirmedUse).iai, null, 'A stale complete flag cannot clear the eligibility gate.');
  assert.equal(assessmentPresentation(unconfirmedUse).provisional, true);

  // A fresh activity check must not replace the saved ratings or resurrect their held IAI.
  const scenario = structuredClone(fixtures.incomplete);
  Object.assign(scenario, { proposed_activity: 'food_cafe', technical_review_hold: true, assessmentStatus: 'technical_review_hold',
    reason: 'Fresh activity evidence is pending.', technical_review_reasons: saved.technical_review_reasons });
  const report = brief(saved, { scenarioAssessment: scenario, investmentContext: '<script>untrusted context</script>' });
  assert.match(report, /data-brief-recorded-total>82\.0/);
  assert.match(report, /data-brief-iai-label>Provisional property IAI/);
  assert.match(report, /data-brief-iai-score>82\.0 \/ 100/);
  assert.match(report, /data-brief-released-iai>Pending review/);
  assert.ok(report.includes('Saved property rating snapshot'));
  assert.ok(report.includes('Selected activity check:'));
  assert.ok(report.includes('Scenario: food_cafe.'));
  assert.ok(report.includes('&lt;script&gt;untrusted context&lt;/script&gt;'));
  assert.equal(JSON.stringify(saved), savedBefore, 'Printing must not mutate the saved assessment.');
  const released = brief(saved, { scenarioAssessment: fixtures.complete });
  assert.match(released, /data-brief-recorded-total>82\.0/);
  assert.match(released, /data-brief-released-iai>94\.8 \/ 100/);
  assert.match(released, /data-brief-release-status>Assessment released/);
  assert.match(released, /Selected activity IAI = round\(25 \+ 25 \+ 17 \+ 12\.75 \+ 15, 1\) = 94\.8 \/ 100/);
  const partial = brief(fixtures.incomplete);
  assert.match(partial, /data-brief-recorded-total>Pending/);
  assert.equal(assessmentPresentation(fixtures.incomplete).index, null);
  assert.equal(assessmentPresentation(fixtures.historical).index, null);
  const prohibited = { ...saved, assessmentStatus: 'not_suitable', eligibility: { zoning: 'prohibited' } };
  assert.equal(assessmentPresentation(prohibited).index, null, 'Prohibited use cannot receive a provisional IAI.');
  assert.match(brief(saved, { scenarioAssessment: prohibited }), /data-brief-iai-score>Pending/, 'A prohibited activity cannot inherit the property preview.');
  const zero = structuredClone(saved);
  for (const row of zero.criteriaBreakdown) {
    if (row.weight > 0) { row.score = 0; row.weighted_score = 0; zero.criterion_scores[row.key] = 0; zero.assessmentCriteria[row.key] = 0; zero.weighted_contributions[row.key] = 0; }
  }
  Object.assign(zero, { displayed_iai: 0, unrounded_total: 0, iaiScore: 0, mceScore: 0, iai: 0, iai_score: 0, mce_score: 0 });
  assert.equal(assessmentPresentation(zero).index, 0, 'Zero is a valid complete provisional calculation.');
  assert.equal(assessmentCalculation(zero).iai, null, 'A zero preview still does not lift a hold.');
  assert.ok(!partial.includes('Recorded MCE = round('), 'Missing ratings cannot become a complete recorded MCE.');
  const discrepant = structuredClone(saved);
  discrepant.criteriaBreakdown[0].weighted_score = 99;
  const mismatch = brief(discrepant);
  assert.match(mismatch, /data-brief-recorded-total>Pending/);
  assert.match(mismatch, /data-brief-release-status>Calculation review required/);
  assert.equal(assessmentPresentation(discrepant).index, null);

  // Exercise the actual investment-report entry point, including server reads and draft isolation.
  const root = { innerHTML: '' }, button = { disabled: false, addEventListener() {} };
  let printedProperty, renderedOptions;
  const requests = [];
  const draft = { propertyId: 216, activityId: 'food_cafe', complianceAcknowledged: true, capitalization: 5000000,
    iaiScore: 99, mceScore: 99, assessmentComplete: true };
  const context = vm.createContext({ URLSearchParams, Intl, Number, JSON, String,
    window: { SFC_APP_CONFIG: { apiBase: '/api', basePath: '/sfcelerate-bizstart' } },
    location: { search: '?investment=216' }, sessionStorage: { getItem: () => JSON.stringify(draft) },
    document: { getElementById: id => id === 'investmentReportRoot' ? root : button },
    fetch: async url => { requests.push(url); return { ok: true, json: async () => url.includes('property-assessment.php') ? { assessment: scenario } : { property: saved } }; },
    potentialIncentive,
    setupPropertyDetailsPrint: (_, property) => { printedProperty = property; },
    investorBriefReportMarkup: (property, options) => { renderedOptions = options; return brief(property, options); },
  });
  const entry = readFileSync('assets/js/investment-report.js', 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/render\(\)\.catch[\s\S]*$/, '');
  vm.runInContext(entry, context);
  assert.equal(button.disabled, true);
  await context.render();
  assert.equal(button.disabled, false);
  assert.equal(printedProperty, saved);
  assert.equal(renderedOptions.scenarioAssessment, scenario);
  assert.match(root.innerHTML, /data-brief-recorded-total>82\.0/);
  assert.match(root.innerHTML, /data-brief-iai-score>82\.0 \/ 100/);
  assert.match(root.innerHTML, /data-brief-released-iai>Pending review/);
  assert.ok(!root.innerHTML.includes('99.0 / 100'), 'Draft-supplied scores are never trusted.');
  assert.ok(root.innerHTML.indexOf('Proposed capitalization') > root.innerHTML.indexOf('id="locusBriefPage4"'), 'Policy context is inside the paginated brief.');
  assert.deepEqual(requests, ['/api/property.php?id=216', '/api/property-assessment.php?id=216&activity=food_cafe']);
  console.log('Investor PDF score consistency: saved MCE, held/released IAI, scenario isolation, incomplete/discrepant totals and export entry point passed.');
})().catch(error => { console.error(String(error.stack || error).replace(/data:text\/javascript;base64,[A-Za-z0-9+/=]+/g, '[view module]')); process.exit(1); });
