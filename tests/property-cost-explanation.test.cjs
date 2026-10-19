const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');

(async () => {
  const php = process.env.PHP_BINARY || 'C:\\xampp\\php\\php.exe';
  const fixtures = JSON.parse(execFileSync(php, ['tests/property-cost-explanation.test.php', '--json'], { encoding: 'utf8' }));
  const prototype = JSON.parse(execFileSync(php, ['tests/property-context-consistency.test.php', '--json'], { encoding: 'utf8' }));
  const source = readFileSync('assets/js/property-details-view.js', 'utf8')
    .replace('./utils.js', pathToFileURL(resolve('assets/js/utils.js')).href)
    .replace('./business-opportunities.js', pathToFileURL(resolve('assets/js/business-opportunities.js')).href);
  const view = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const propertyFor = result => {
    const property = structuredClone(prototype);
    property.propertyCostScoring = fixtures.metadata;
    property.criterion_scores.property_cost_market_competitiveness = result.score;
    property.weighted_contributions.property_cost_market_competitiveness = result.iai_contribution;
    property.criteriaDetails = { property_cost_market_competitiveness: structuredClone(result) };
    return property;
  };
  let checks = 0;
  const check = (condition, message) => { assert.ok(condition, message); checks++; };
  const sale = propertyFor(fixtures.preview);
  const before = JSON.stringify(sale);
  const model = view.propertyCostExplanationModel(sale);
  const markup = view.propertyCostExplanationMarkup(sale);
  check(Math.abs(model.asking - 58823.5294117647) < 0.000001 && model.comparable === 15000, 'The explanation uses the exact server pricing snapshot.');
  check(markup.includes('₱58,823.53') && markup.includes('₱350,000,000') && markup.includes('5,950 m²'), 'The total price, area and unit-price calculation are visible.');
  check(markup.includes('+292.16%') && markup.includes('More than 30% above') && model.band.score === 50, 'The reported price premium selects the same 50-point band as PHP.');
  check(markup.includes('50 <small>rating ×</small> 20% <small>weight =</small> 10') && markup.includes('Maximum contribution: 20 points'), 'The rating and its weighted contribution are distinct.');
  check(markup.includes('verification pending') && markup.includes('Comparable source not recorded') && !markup.includes('Authenticated evidence'), 'An unsourced comparable cannot appear verified.');
  check(markup.includes('class="is-current" aria-current="true"') && (markup.match(/<tr /g) || []).length === 6, 'The full rubric is shown with the applicable row highlighted.');
  check(JSON.stringify(sale) === before && view.assessmentCalculation(sale).iai === null, 'Explaining a score changes neither inputs nor IAI eligibility.');
  const assessment = view.propertyAssessmentMarkup(sale);
  check(assessment.includes('data-explain-price-score') && assessment.includes('data-site-price-explanation'), 'The explanation is available directly from the price criterion.');
  check(!assessment.includes('Recorded weighted total</small>'), 'The main score card avoids repeating the recorded total.');
  const alias = structuredClone(sale);
  alias.criteriaDetails.economic_viability = alias.criteriaDetails.property_cost_market_competitiveness;
  alias.criteriaDetails.property_cost_market_competitiveness = {};
  check(view.propertyCostExplanationModel(alias).asking === model.asking, 'An empty canonical detail cannot hide an available compatibility-alias pricing snapshot.');

  const lease = propertyFor(fixtures.lease);
  const leaseHtml = view.propertyCostExplanationMarkup(lease);
  check(leaseHtml.includes('₱240') && leaseHtml.includes('₱200') && leaseHtml.includes('/ m² / month') && leaseHtml.includes('+20%'), 'Rental comparisons preserve monthly rate and area units.');
  check(leaseHtml.includes('70 <small>rating ×</small> 20% <small>weight =</small> 14'), 'A rent premium uses its actual recorded 14-point contribution.');
  check(view.propertyCostExplanationModel(propertyFor(fixtures.annual)).asking === 240, 'Annual rent uses the server-normalized monthly price.');
  check(view.propertyCostExplanationModel(propertyFor(fixtures.dual)).lease, 'A dual-purpose listing explains the active lease comparison.');
  check(view.propertyCostExplanationModel(propertyFor(fixtures.incompatible)).difference === null, 'Sale and monthly-rent units are not compared.');
  check(view.propertyCostExplanationMarkup(propertyFor(fixtures.missing)).includes('Not comparable yet'), 'A missing comparable yields an informative empty comparison.');
  check(view.propertyCostExplanationModel(propertyFor(fixtures.request)).asking === null, 'Price on request never revives a stale numeric asking amount.');

  for (const result of fixtures.boundaryResults) {
    const explanation = view.propertyCostExplanationModel(propertyFor(result));
    check(explanation.band.score === result.score, `Browser and PHP agree at ${result.pricing_analysis.active_difference_percent}%.`);
  }
  const nearBoundary = propertyFor(fixtures.boundaryResults[10]);
  check(view.propertyCostExplanationMarkup(nearBoundary).includes('+30.004%'), 'Near a threshold, displayed precision does not suggest the neighboring score band.');
  const stale = structuredClone(sale);
  stale.criterion_scores.property_cost_market_competitiveness = 85;
  stale.weighted_contributions.property_cost_market_competitiveness = 17;
  check(view.propertyCostExplanationModel(stale).mismatch && view.propertyCostExplanationMarkup(stale).includes('Review the assessment'), 'A stored rating that disagrees with its price inputs is disclosed.');
  const badContribution = structuredClone(sale);
  badContribution.weighted_contributions.property_cost_market_competitiveness = 99;
  check(!view.propertyCostExplanationMarkup(badContribution).includes('50 <small>rating ×</small>') && view.propertyCostExplanationMarkup(badContribution).includes('does not match'), 'The UI never prints a false weighted equation.');
  const hostile = structuredClone(sale);
  hostile.criteriaDetails.property_cost_market_competitiveness.pricing_analysis.comparable_source = '<script>alert(1)</script>';
  check(view.propertyCostExplanationMarkup(hostile).includes('&lt;script&gt;') && !view.propertyCostExplanationMarkup(hostile).includes('<script>'), 'Comparable source text is escaped.');
  const malformed = structuredClone(sale);
  malformed.criteriaDetails.property_cost_market_competitiveness.pricing_analysis.scoring_bands = {};
  check(view.propertyCostExplanationModel(malformed).band === undefined, 'Malformed rubric metadata cannot manufacture a matched grade.');

  let click;
  const disclosure = { open: false };
  let scrolled = false;
  const panel = { querySelector: () => disclosure, scrollIntoView() { scrolled = true; } };
  const trigger = {};
  view.setupPriceScoreExplanation({ addEventListener(event, fn) { assert.equal(event, 'click'); click = fn; }, contains: () => true, querySelector: () => panel });
  let prevented = false;
  click({ target: { closest: () => trigger }, preventDefault() { prevented = true; } });
  check(disclosure.open && scrolled && prevented, 'The explanation link opens the bands and brings the calculation into view.');
  console.log(`Property cost presentation: ${checks} server-to-browser and interaction checks passed.`);
})().catch(error => { console.error(error.stack); process.exit(1); });
