const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');

(async () => {
  const property = JSON.parse(execFileSync(process.env.PHP_BINARY || 'C:\\xampp\\php\\php.exe', ['tests/property-context-consistency.test.php', '--json'], { encoding: 'utf8' }));
  const source = readFileSync('assets/js/property-details-view.js', 'utf8')
    .replace('./utils.js', pathToFileURL(resolve('assets/js/utils.js')).href)
    .replace('./business-opportunities.js', pathToFileURL(resolve('assets/js/business-opportunities.js')).href);
  const view = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  let checks = 0;
  const check = (condition, message) => { assert.ok(condition, message); checks++; };
  const calc = view.assessmentCalculation(property);
  check(calc.recordedTotal === 82 && calc.iai === null, 'A consistent weighted rating total is distinct from the held IAI.');
  const assessment = view.propertyAssessmentMarkup(property);
  check(assessment.includes('PROVISIONAL INVESTMENT ATTRACTIVENESS INDEX') && assessment.includes('data-active-assessment-score><strong>82.0</strong>'), 'The consistent calculation is shown as a provisional IAI.');
  check(assessment.includes('data-active-iai-composite-pill>Pending review</strong>') && assessment.includes('Technical review required'), 'The official IAI release status remains explicit.');
  check(assessment.includes('High flood') && assessment.includes('High tsunami'), 'The hold explains all recorded critical findings.');
  check(assessment.includes('5 criteria · 100% total weight'), 'The chart describes the actual five-criterion protocol.');
  const stale = structuredClone(property); stale.iaiScore = 99; stale.mceScore = 99;
  check(view.propertyAssessmentMarkup(stale).includes('data-active-assessment-score><strong>82.0</strong>') && !view.propertyAssessmentMarkup(stale).includes('99.0 / 100'), 'Compatibility aliases cannot replace the calculated recorded total or resurrect IAI.');
  const inconsistent = structuredClone(property); inconsistent.weighted_contributions.risk_constraints = 99;
  check(view.assessmentCalculation(inconsistent).recordedTotal === null, 'Conflicting contributions suppress even the recorded total.');
  const incomplete = structuredClone(property); incomplete.criterion_scores.nearby_businesses = null; delete incomplete.weighted_contributions.nearby_businesses;
  check(view.assessmentCalculation(incomplete).recordedTotal === null, 'Missing criterion scores cannot produce a numeric total.');
  const released = structuredClone(property);
  Object.assign(released, { displayed_iai: 82, unrounded_total: 81.975, evidence_completeness: true, assessmentComplete: true, assessmentStatus: 'complete', technical_review_hold: false, technical_review_reasons: [] });
  released.eligibility = { zoning: 'permitted', is_eligible: true };
  released.evidence_verification = Object.fromEntries(calc.rows.map(row => [row.key, { status: 'authenticated' }]));
  released.subcriterion_scores.risk_constraints.flood_susceptibility.raw_status = 'low';
  released.subcriterion_scores.risk_constraints.tsunami_exposure.raw_status = 'low';
  check(view.assessmentCalculation(released).iai === 82 && view.propertyAssessmentMarkup(released).includes('INVESTMENT ATTRACTIVENESS INDEX'), 'A valid released assessment keeps its numeric IAI.');

  const climate = view.floodAndFireAssessmentMarkup(property);
  check(climate.includes('High susceptibility') && !climate.includes('MGB Low Susceptibility'), 'Flood presentation agrees with the risk criterion.');
  check(climate.includes('6 / 6 findings recorded') && climate.includes('0 of 6 findings have authenticated evidence') && !climate.includes('Fully assessed'), 'Observation coverage is distinguished from authentication.');
  check(!climate.includes('/10') && !climate.includes('Pressurized Main') && !climate.includes('2026–2035') && !climate.includes('Compliant'), 'The panel invents no agency ratings, hydrants, forecasts or compliance.');
  check(view.floodAndFireAssessmentMarkup({}).includes('Not assessed') && view.floodAndFireAssessmentMarkup({}).includes('Distance unavailable'), 'Missing records remain missing without low-risk defaults.');
  const nearby = view.nearbyBusinessesPanelMarkup(property);
  check(!nearby.includes('La Finns Scholastica College') && nearby.includes('Pig Out'), 'The sourced browser list excludes the subject and retains its actual neighbor.');
  check(nearby.includes('Status not verified') && !nearby.includes('tw-bg-emerald-500') && !nearby.includes('Mapped Anchors'), 'Unknown operating status and ordinary mapped places are not styled as verified anchors.');
  check(!nearby.includes('min walk') && !nearby.includes('min drive') && nearby.includes('straight line'), 'The list displays distance without manufactured travel times.');
  check(!nearby.includes('tw-truncate') && nearby.includes('data-locate-biz='), 'Full names and map actions are preserved.');
  check(view.nearbyBusinessesPanelMarkup({}).includes('No other mapped places to show'), 'Empty context gives a useful missing-directory state.');
  const hostile = view.nearbyBusinessesPanelMarkup({ nearbyBusinesses: [{ name: '<script>alert(1)</script>', category: '<b>Fake</b>', source: '<img>', status: 'unknown' }] });
  check(!hostile.includes('<script>') && hostile.includes('&lt;script&gt;'), 'Directory names and source text remain escaped.');
  console.log(`Property context presentation: ${checks} checks passed.`);
})().catch(error => { console.error(error.stack); process.exit(1); });
