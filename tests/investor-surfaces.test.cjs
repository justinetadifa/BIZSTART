const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');
const vm = require('node:vm');

(async () => {
  const utils = await import(pathToFileURL(resolve('assets/js/utils.js')).href);
  const details = await import(pathToFileURL(resolve('assets/js/property-details-view.js')).href);
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
    card, listingAssessmentState,
    setCompare: value => { compare = value; }, setCriteria: value => { criteria = value; } };`, sandbox);
  const surface = sandbox.surface;
  const base = { id: 1, name: 'Recorded site', area: 1.2, lat: 16.6, lng: 120.3, city: 'San Fernando',
    category: 'Land', listingPurpose: 'sale', salePrice: null, price: null, status: 'Available',
    assessmentComplete: true, iaiScore: 80, mceScore: 75, iaiRank: 7, mceRank: 9, rank_eligible: true,
    assessmentCriteria: { spatial_accessibility: 80, infrastructure_readiness: 80, economic_viability: 80,
      nearby_businesses: 80, zoning_compatibility: 100, risk_constraints: 80 },
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
  surface.setProperties([{ ...base, assessmentCriteria: {} }]);
  surface.setCompare([1]);
  surface.setCriteria({ risk_constraints: 'Risk constraints' });
  surface.renderCompare();
  assert.match(compare.innerHTML, /<div class="city-compare-hazard-row"><dt>Hazards &amp; environment<\/dt>/, 'Hazards are never an Advanced-only comparison row');
  assert.match(compare.innerHTML, /<div data-investor-advanced><dt>IAI calculation<\/dt><dd>Pending<\/dd>/);
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
  // Versioned assessment records exercise calculation, release and ranking decisions together.
  const weights = { spatial_accessibility: 25, infrastructure_readiness: 25,
    property_cost_market_competitiveness: 20, nearby_businesses: 15, risk_constraints: 15 };
  const released = { ...base, id: 101, iaiRank: 7, mceRank: 7, protocol_version: 'LOCUS-SF MCE v3.0',
    criterion_scores: Object.fromEntries(Object.keys(weights).map(key => [key, 100])),
    assessmentCriteria: {}, weight_configuration: weights, weighted_contributions: { ...weights },
    criteriaBreakdown: Object.entries(weights).map(([key, weight]) => ({ key, weight, score: 100, weighted_score: weight })),
    eligibility: { zoning: 'permitted', is_eligible: true },
    assessmentStatus: 'complete', evidence_completeness: true, numerical_completeness: true, weights_valid: true,
    iaiScore: 100, mceScore: 100, displayed_iai: 100, unrounded_total: 100, comparison_key: 'synthetic-cohort' };
  const provisional = { ...released, id: 102, assessmentComplete: false, assessmentStatus: 'incomplete',
    evidence_completeness: false, iaiScore: null, mceScore: null, displayed_iai: null, rank_eligible: false };
  const historical = { ...provisional, id: 103, assessmentStatus: 'historical_review_required', assessmentMode: 'historical',
    assessmentComplete: true, score: 100, historicalIaiScore: 100, iaiRank: 1, rank_eligible: true };
  const incomplete = { ...provisional, id: 104, score: 99, iaiRank: 1,
    criterion_scores: { ...released.criterion_scores, nearby_businesses: null },
    weighted_contributions: { ...weights, nearby_businesses: null },
    criteriaBreakdown: released.criteriaBreakdown.map(row => row.key === 'nearby_businesses' ? { ...row, score: null, weighted_score: null } : row) };
  const held = { ...provisional, id: 105, assessmentStatus: 'technical_review_hold', technical_review_hold: true,
    technical_review_reasons: ['Synthetic high flood finding requires review.'], iaiRank: 1, rank_eligible: true };
  const discrepancy = { ...released, id: 106, displayed_iai: 12, iaiScore: 12, mceScore: 12 };
  sort.value = 'iai';
  const previewCard = surface.priorityListCard(provisional, 0);
  assert(previewCard.includes('Provisional IAI') && previewCard.includes(String(details.assessmentPresentation(provisional).index)),
    'The board displays the same provisional IAI as details');
  assert(previewCard.includes('City evidence review pending. Unranked.') && !previewCard.includes('IAI rank'),
    'A calculated provisional value cannot receive an investment rank');
  assert(!previewCard.includes('Awaiting score') && !previewCard.includes('MCE baseline'), 'A provisional calculation is visible as one IAI');
  const oldCard = surface.priorityListCard(historical, 0);
  assert(oldCard.includes('Reassessment needed') && !oldCard.includes('IAI rank') && !oldCard.includes('>100 <'),
    'Historical completion and raw database scores cannot resurrect a released IAI or rank');
  const partialCard = surface.priorityListCard(incomplete, 0);
  assert(partialCard.includes('criteria recorded') && partialCard.includes('Next:'), 'Missing inputs show progress and the next criterion');
  const heldCard = surface.priorityListCard(held, 0);
  assert(heldCard.includes('Technical review required') && !heldCard.includes('IAI rank'), 'A hazard hold retains its warning and cannot rank');
  const disputedCard = surface.priorityListCard(discrepancy, 0);
  assert(disputedCard.includes('Calculation review required') && !disputedCard.includes('IAI rank') && !disputedCard.includes('>12 <'),
    'Conflicting stored totals cannot display a score or rank');
  const zero = { ...provisional, criterion_scores: Object.fromEntries(Object.keys(provisional.criterion_scores).map(key => [key, 0])),
    assessmentCriteria: {}, weighted_contributions: {}, criteriaBreakdown: [], unrounded_total: 0 };
  assert.equal(surface.listingAssessmentState(zero).index, 0, 'A calculated zero remains a numeric provisional score');
  assert(surface.card(provisional, 0).includes('Provisional ·'), 'Grid cards identify the provisional calculation too');
  surface.setProperties([historical, incomplete, provisional, released]);
  assert.deepEqual(Array.from(surface.getFiltered(), item => item.id), [101, 102, 103, 104],
    'Released scores sort first, then provisional calculations, with raw and historical scores ignored');
  surface.renderRanking();
  assert(ranking.innerHTML.includes('1 released') && ranking.innerHTML.includes('1 provisional') && ranking.innerHTML.includes('2 need assessment or review'),
    'Summary counts use the same release decisions as the cards');
  assert(!ranking.innerHTML.includes('1 assessed'), 'Legacy completion no longer inflates the assessed count');
  console.log('PASS: investor sorting, ranks, provisional scores, review states, summary counts, comparison, hazards and map markers.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
