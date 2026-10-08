const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');
const vm = require('node:vm');

(async () => {
  const utils = await import(pathToFileURL(resolve('assets/js/utils.js')).href);
  const detailsSource = readFileSync('assets/js/property-details-view.js', 'utf8')
    .replace('./utils.js', pathToFileURL(resolve('assets/js/utils.js')).href);
  const details = await import(`data:text/javascript;base64,${Buffer.from(detailsSource).toString('base64')}`);
  const source = readFileSync('assets/js/city-workspace.js', 'utf8')
    .replace(/^import .*;\r?\n/gm, '').split('initialize().catch(error => {')[0];
  let mode = 'basic';
  const options = ['iai', 'mce'].map(value => ({ value, disabled: false, hidden: false }));
  const sort = { value: 'newest', selectedOptions: [{ textContent: 'Newest' }], querySelectorAll: () => options };
  const ranking = { innerHTML: '', insertAdjacentHTML: (_where, html) => { ranking.innerHTML += html; } };
  const compare = { innerHTML: '' };
  const note = { hidden: true, textContent: '' };
  const nodes = { citySort: sort, cityRankingTable: ranking, cityCompareMatrix: compare, cityViewSortNote: note };
  const sandbox = {
    ...utils, ...details, URLSearchParams, location: { search: '' }, console, Intl, Set, Map,
    localStorage: { getItem: () => '[]', setItem: () => {} },
    document: {
      body: { dataset: { page: 'city-ranking' } }, documentElement: { dataset: { investorView: 'basic' } },
      getElementById: id => nodes[id] || null, querySelectorAll: () => [], addEventListener: () => {},
    },
    window: { SFC_APP_CONFIG: { role: 'investor', user: { id: 1 } },
      SFCInvestorView: { get: () => mode, refresh: () => {} }, addEventListener: () => {} },
    L: { divIcon: options => options },
  };
  vm.createContext(sandbox);
  vm.runInContext(source + `\nglobalThis.surface = { getFiltered, synchronizeInvestorSort, priorityListCard, renderRanking, renderCompare, createPillIcon, createClusterIcon, createPopupContent,
    setProperties: value => { properties = value; filtered = value; },
    setCompare: value => { compare = value; }, setCriteria: value => { criteria = value; } };`, sandbox);
  const surface = sandbox.surface;
  const base = { id: 1, name: 'Recorded site', area: 1.2, lat: 16.6, lng: 120.3, city: 'San Fernando',
    category: 'Land', listingPurpose: 'sale', salePrice: null, price: null, status: 'Available',
    assessmentComplete: true, iaiScore: 80, mceScore: 75, iaiRank: 7, mceRank: 9,
    createdAt: '2026-01-01', criteriaDetails: { risk_constraints: { raw: { hazard_status: ['high'] } } } };
  surface.setProperties([{ ...base, id: 50 }, { ...base, id: 2, createdAt: '2026-10-01' }]);
  assert.deepEqual(Array.from(surface.getFiltered(), item => item.id), [2, 50], 'Newest uses creation date, not ID or original API order');
  surface.setProperties([{ ...base, id: 1 }, { ...base, id: 2, salePrice: 100 }, { ...base, id: 3, salePrice: 0 }]);
  sort.value = 'price_asc';
  assert.deepEqual(Array.from(surface.getFiltered(), item => item.id), [3, 2, 1], 'Unknown sale prices sort last while a recorded zero is preserved');
  sort.value = 'iai';
  surface.synchronizeInvestorSort(true);
  assert.equal(sort.value, 'newest');
  assert(options.every(option => option.hidden && option.disabled));
  assert.equal(note.hidden, false);
  assert.match(note.textContent, /Now sorted by newest/);
  mode = 'advanced';
  surface.synchronizeInvestorSort();
  assert(options.every(option => !option.hidden && !option.disabled));
  assert.equal(sort.value, 'newest', 'Advanced does not silently replace the chosen factual sort');

  sort.value = 'iai';
  const ranked = surface.priorityListCard(base, 0);
  assert(ranked.includes('#7') && !ranked.includes('>#1<'), 'Filtered scientific ranks retain gaps instead of renumbering the first result');
  assert(surface.priorityListCard({ ...base, iaiRank: 1 }, 0).includes('IAI rank'));
  sort.value = 'mce';
  assert(surface.priorityListCard(base, 0).includes('#9'), 'MCE sorting shows the MCE rank');
  sort.value = 'price';
  assert(!surface.priorityListCard(base, 0).includes('IAI rank'), 'Price order does not claim an assessment rank');
  assert(ranked.includes('Hazards &amp; environment') || ranked.includes('Hazards & environment'), 'The assessment list retains factual hazard warnings');

  mode = 'basic';
  surface.setProperties([base]);
  surface.renderRanking();
  assert(!ranking.innerHTML.includes('IAI rank'), 'Basic board uses factual cards');
  assert(ranking.innerHTML.includes('Hazards & environment') && ranking.innerHTML.includes('Price on request'));
  surface.setCompare([1]);
  surface.setCriteria({ risk_constraints: 'Risk constraints' });
  surface.renderCompare();
  assert.match(compare.innerHTML, /<div><dt>Hazards &amp; environment<\/dt>/, 'Hazards are never an Advanced-only comparison row');
  assert.match(compare.innerHTML, /<div data-investor-advanced><dt>IAI<\/dt>/);
  assert(compare.innerHTML.includes('Price on request') && compare.innerHTML.includes('View map & contact'));

  const approximate = { ...base, hasExactLocation: false };
  const basicPin = surface.createPillIcon(approximate).html;
  assert(!basicPin.includes('pin-iai-badge') && !basicPin.includes('pin-dot'), 'Basic pin emphasizes the listing price without score tier coding');
  assert(basicPin.includes('Approximate location') && basicPin.includes('Price on request'));
  const cluster = { getAllChildMarkers: () => [{ propertyData: base }] };
  assert(!surface.createClusterIcon(cluster).html.includes('avg IAI'), 'Basic clusters show property counts');
  const popup = surface.createPopupContent(approximate);
  assert(!popup.includes('locus-popup-metrics') && popup.includes('Hazards & environment') && popup.includes('Approximate location'));
  mode = 'advanced';
  assert(surface.createPillIcon(base).html.includes('pin-iai-badge'));
  assert(surface.createClusterIcon(cluster).html.includes('avg IAI 80'));
  assert(surface.createPopupContent(base).includes('locus-popup-metrics'));
  const pendingPin = surface.createPillIcon({ ...base, iaiScore: null }).html;
  assert(pendingPin.includes('Awaiting assessment') && !pendingPin.includes('0/100'), 'A missing score is not presented as a zero rating');
  console.log('PASS: investor sorting, recorded ranks, comparison disclosure, factual hazards, unknown prices, approximate pins, score tiers and map popups.');
})().catch(error => { console.error(error); process.exitCode = 1; });
