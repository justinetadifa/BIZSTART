const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');

(async () => {
  const fixture = JSON.parse(execFileSync(process.env.PHP_BINARY || 'C:\\xampp\\php\\php.exe', ['tests/locus-v3-pipeline.test.php', '--json'], { encoding: 'utf8' }));
  const source = readFileSync('assets/js/property-details-view.js', 'utf8')
    .replace('./utils.js', pathToFileURL(resolve('assets/js/utils.js')).href)
    .replace('./business-opportunities.js', pathToFileURL(resolve('assets/js/business-opportunities.js')).href);
  const view = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const utils = await import(pathToFileURL(resolve('assets/js/utils.js')).href);
  let checks = 0;
  const check = (condition, message) => { assert.ok(condition, message); checks++; };
  const complete = fixture.complete;
  const calc = view.assessmentCalculation(complete);
  check(calc.iai === 94.8 && calc.mce === 94.8, 'Browser consumes server total.');
  check(calc.rows.reduce((sum, row) => sum + row.contribution, 0) === complete.unrounded_total, 'Server and browser contributions agree.');
  for (const [label, property] of Object.entries(fixture)) {
    if (!property || typeof property !== 'object' || ['complete', 'conditional', 'scenario'].includes(label)) continue;
    const calculation = view.assessmentCalculation(property);
    check(calculation.iai === null, `${label}: browser withholds IAI.`);
    const report = view.investorBriefReportMarkup(property);
    check(report.includes('IAI: Withheld'), `${label}: PDF content withholds IAI.`);
    check(!report.includes('5.4 km') && !report.includes('alluvial terrace'), `${label}: PDF invents no hazard findings.`);
    check(report.includes(property.assessmentStatus.replaceAll('_', ' ')), `${label}: PDF names assessment status.`);
  }
  const report = view.investorBriefReportMarkup(complete);
  check(report.includes('IAI: 94.8 / 100') && report.includes('94.8 / 100'), 'PDF and server use the same displayed IAI.');
  check(report.includes(complete.protocol_version) && report.includes(complete.proposed_activity), 'PDF identifies protocol and scenario.');
  check(view.investorBriefReportMarkup(complete, { includeAppendix: true }).includes(complete.comparison_key), 'PDF evidence appendix identifies comparison group.');
  check(view.investorBriefReportMarkup(fixture.conditional).includes('IAI: 94.8 / 100'), 'Conditional PDF retains explanatory score.');
  check(view.investorBriefReportMarkup(fixture.conditional).includes('No actionable investment rank'), 'Conditional PDF does not imply clearance.');
  const bad = structuredClone(complete); bad.displayed_iai = 80; bad.iaiScore = 80;
  check(view.assessmentCalculation(bad).iai === null, 'Browser independently detects mismatched stored total.');
  check(view.investorBriefReportMarkup(bad).includes('IAI: Withheld'), 'Discrepant PDF has no numeric fallback total.');
  const badContribution = structuredClone(complete); badContribution.criteriaBreakdown[0].weighted_score = 99;
  // Contribution discrepancies must also be detected rather than printing conflicting tables.
  check(view.assessmentCalculation(badContribution).iai === null, 'Flagged contribution discrepancy withholds browser total.');
  const safety = view.safetyMarkup(fixture.incomplete);
  check(safety.includes('Tsunami') && safety.includes('not assessed'), 'Hazard table exposes missing coverage in readable language.');
  check(!safety.includes('safe') || safety.includes('does not establish low risk or safety'), 'Hazard copy makes no safety inference.');
  const ranked = utils.rankProperties([
    { ...complete, id: 1 }, { ...fixture.held, id: 2 }, { ...fixture.conditional, id: 3 }, { ...fixture.historical, id: 4 },
  ], [], {}, null);
  check(ranked[0].id === 1 && ranked.slice(1).every(item => item.score === null), 'Comparison consumer excludes held, conditional and historical investment ranks.');

  const options = {
    role: 'investor', investor: true, saved: new Set(), compare: [], broker: null, canInquire: true,
    path: value => `/${value}`, imageUrl: () => '/sample.jpg', printHeaderMarkup: () => '', printFooterMarkup: () => '',
    printButtonMarkup: () => '', nearbyBusinessesMarkup: () => '', evaluationMarkup: () => '', investorTools: () => '', policy: {},
  };
  const page = view.propertyDetailsMarkup({ ...complete, facilities: [], area: .01 }, options);
  check(page.includes('94.8') && page.includes('locusInvestorBrief'), 'Full details page renders the authoritative score and printable report.');
  const subtotalOnly = view.propertyDetailsMarkup({ ...complete, facilities: [], assessmentComplete: false, displayed_iai: null, iaiScore: null, assessmentStatus: 'incomplete' }, options);
  check(subtotalOnly.includes('data-active-iai-score><strong>Withheld</strong>'), 'A physical subtotal never appears as the headline IAI.');

  // Exercise the asynchronous scenario consumer without a live server or browser dependency.
  const elements = new Map();
  function element(key) {
    if (!elements.has(key)) elements.set(key, { textContent: '', value: '', hidden: false, innerHTML: '', outerHTML: '', style: {},
      listeners: {}, addEventListener(event, fn) { this.listeners[event] = fn; } });
    return elements.get(key);
  }
  const container = { querySelector: element };
  const root = { querySelector: key => key === '#propertyScenarioSection' ? container : element(key) };
  global.window = { SFC_APP_CONFIG: { apiBase: '/api' }, print() {} };
  let requested;
  global.fetch = async url => { requested = url; return { ok: true, json: async () => ({ assessment: fixture.scenario }) }; };
  view.setupInvestorScenario(root, complete, {});
  element('#investorProposedActivitySelect').value = 'retail_convenience';
  await element('#investorProposedActivitySelect').listeners.change();
  check(requested.includes('/api/property-assessment.php?id=999001&activity=retail_convenience'), 'Scenario sends only property id and explicit activity to server.');
  check(element('[data-scenario-total-iai]').textContent === '94.8 / 100', 'Scenario shows server result.');
  check(element('#locusInvestorBrief').outerHTML.includes('IAI: 94.8 / 100'), 'Scenario and PDF share the returned result.');
  global.fetch = async () => ({ ok: true, json: async () => ({ assessment: fixture.held }) });
  await element('#investorProposedActivitySelect').listeners.change();
  check(element('[data-scenario-total-iai]').textContent === 'Withheld', 'Held scenario stays withheld.');
  check(element('#locusInvestorBrief').outerHTML.includes('technical review hold'), 'Scenario hold propagates to PDF.');
  global.fetch = async () => { throw new Error('Synthetic transport failure'); };
  await element('#investorProposedActivitySelect').listeners.change();
  check(element('[data-scenario-total-iai]').textContent === 'Withheld', 'Transport failure cannot leave a previous numeric scenario total.');
  check(element('#locusInvestorBrief').outerHTML.includes('IAI: Withheld'), 'Transport failure also withholds PDF total.');
  console.log(`LOCUS v3 presentation: ${checks} executable server/scenario/comparison/print checks passed.`);
})().catch(error => { console.error(error.stack?.split('\n').slice(0, 5).join('\n') || error); process.exit(1); });
