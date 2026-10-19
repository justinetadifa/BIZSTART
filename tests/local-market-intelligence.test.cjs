const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');

(async () => {
  const fixtures = JSON.parse(execFileSync(process.env.PHP_BINARY || 'C:\\xampp\\php\\php.exe', ['tests/local-market-intelligence.test.php', '--json'], { encoding: 'utf8' }));
  const source = readFileSync('assets/js/property-details-view.js', 'utf8')
    .replace('./utils.js', pathToFileURL(resolve('assets/js/utils.js')).href)
    .replace('./business-opportunities.js', pathToFileURL(resolve('assets/js/business-opportunities.js')).href);
  const { localMarketIntelligenceMarkup: render, setupLocalMarketIntelligence: setup } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  let checks = 0;
  const check = (condition, message) => { assert.ok(condition, message); checks++; };
  const property = { id: 1, barangay: 'Barangay IV', iaiScore: 80.8, localMarketIntelligence: fixtures['Barangay IV'] };
  const before = JSON.stringify(property);
  const html = render(property);
  check(html.includes('>611</p>') && html.includes('₱393,220') && html.includes('₱259,350'), 'The browser renders the sourced server figures.');
  check(html.includes('Provincial reference') && html.includes('La Union Province') && html.includes('2023 · Preliminary'), 'Narrow scope finances disclose geography, year and preliminary status.');
  check(html.includes('Annual average per family') && html.includes('₱32,768') && html.includes('annual average ÷ 12'), 'The statistic, denominator and derived monthly equivalent are explicit.');
  check(!html.includes('15,820') && !html.includes('₱368,000') && !html.includes('₱143.6M') && !html.includes('<svg'), 'The former unsupported totals and distributions are absent.');
  check(html.includes('do not enter the MCE or IAI calculation'), 'Market context makes no scoring claim.');
  check((html.match(/<option /g) || []).length === 4, 'Available scopes come from server records.');
  check(html.includes('Table 111') && html.includes('Table 3') && html.includes('https://psada.psa.gov.ph/catalog/318'), 'Displayed values link to their evidence and geographic methodology.');

  let change;
  const select = { value: 'city', addEventListener(event, fn) { assert.equal(event, 'change'); change = fn; } };
  const content = { innerHTML: '' };
  setup({ querySelector(selector) { return selector === '#demographicScopeSelect' ? select : content; } }, property);
  for (const [scope, expected, proxy] of [['city', '125,640', true], ['province', '822,352', false], ['region', '5,301,139', false], ['barangay', '611', true]]) {
    select.value = scope;
    change();
    check(content.innerHTML.includes(`>${expected}</p>`), `${scope}: the change event updates the population.`);
    check(content.innerHTML.includes(property.localMarketIntelligence.scopes[scope].coverage), `${scope}: geography metadata updates together with the figures.`);
    check(content.innerHTML.includes('Provincial reference') === proxy, `${scope}: reference labeling updates with the selected geography.`);
    if (scope === 'region') check(content.innerHTML.includes('₱339,690') && content.innerHTML.includes('₱232,440'), 'Regional finance references update with population.');
  }
  select.value = 'unsupported';
  change();
  check(content.innerHTML.includes('Data unavailable') && !content.innerHTML.includes('>611</p>'), 'An invalid scope cannot silently display another geography.');
  check(JSON.stringify(property) === before, 'Scope changes do not mutate property data or assessment scores.');
  for (const localMarketIntelligence of [undefined, { available: false, scopes: fixtures['Barangay IV'].scopes }, fixtures['Unknown barangay'], fixtures['']]) {
    const empty = render({ id: 2, localMarketIntelligence });
    check(empty.includes('Data unavailable') && !empty.includes('15,820'), 'Missing or failed data yields an explicit unavailable state without a numeric fallback.');
  }
  const invalid = structuredClone(property);
  invalid.localMarketIntelligence.scopes.barangay.population.total = null;
  invalid.localMarketIntelligence.scopes.barangay.income.source.url = 'javascript:alert(1)';
  invalid.localMarketIntelligence.scopes.barangay.default_scope_name = '<script>alert(1)</script>';
  const escaped = render(invalid);
  check(!escaped.includes('>0</p>') && !escaped.includes('₱393,220'), 'A null population and invalid source cannot appear as numeric evidence.');
  check(!escaped.includes('<script>') && !escaped.includes('javascript:'), 'Names are escaped and evidence links require HTTPS.');
  const stale = render({ localMarketIntelligence: { scopes: { barangay: { population: { total: 15820 }, income: { median: 368000 }, spending: { total: 143600000 } } } } });
  check(!stale.includes('15,820') && (stale.match(/Data unavailable/g) || []).length === 3, 'A legacy payload never restores the unsupported chart values.');
  console.log(`Local market presentation: ${checks} service-to-browser and scope checks passed.`);
})().catch(error => { console.error(error.stack); process.exit(1); });
