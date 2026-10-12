const assert = require('node:assert/strict');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  const { observedBusinessContext, evaluateBusinessOpportunities, businessOpportunitiesMarkup, renderOpportunityCard, initBusinessOpportunities } =
    await import(pathToFileURL(resolve('assets/js/business-opportunities.js')).href);
  let checks = 0;
  const check = (condition, message) => { assert.ok(condition, message); checks++; };
  const lat = 16.6159;
  const lng = 120.3209;
  const north = meters => lat + meters / 6371000 * 180 / Math.PI;
  const place = (id, name, meters, categoryKey = 'cafe', status) => ({ id, name, lat: north(meters), lng, categoryKey, status });
  const property = { name: 'Observed fixture', lat, lng, area: 0.0001, parcel: { surveyAreaSqm: 1.49 }, nearbyBusinesses: [
    place('bean', 'Bean House', 0, 'cafe', 'operating'),
    place('duplicate', 'Bean-House', 2, 'cafe', 'unknown'),
    place('bread', 'Bread Shop', 0, 'bakery'),
    place('branch', 'Bean House Uptown', 400, 'cafe', 'existing'),
    place('school', 'Nearby School', 100, 'school', 'operating'),
    place('outside', 'Outside Boundary', 500.5),
    place('closed', 'Closed Place', 10, 'cafe', 'closed'),
    { ...place('note', 'Closure Note Place', 10), note: 'Temporarily closed' },
    { ...place('bad', 'Malformed Place', 0), lat: null },
  ] };
  const observed = observedBusinessContext(property, 500);
  check(observed.nearbyPlaces.length === 4, 'Exactly unique valid nonclosed records inside circle are retained.');
  check(observed.metrics.observedBusinessCount === 3 && observed.metrics.observedPlaceCount === 4, 'School contributes mapped-place context but not business count.');
  check(observed.metrics.observedOperatingBusinessCount === 2, 'Unknown operating status does not become operating.');
  check(observed.metrics.observedBusinessesPerSqKm === Math.round(3 / (Math.PI * 0.25) * 100) / 100, 'Observed density converts radius meters to square kilometers.');
  check(observed.metrics.businessesPerSqKm === null && observed.metrics.completeInventory === false, 'Partial records never become authoritative operating-business density.');
  check(observed.nearbyPlaces.find(p => p.name === 'Bread Shop').status === 'unknown', 'Missing status remains unknown.');
  check(observed.nearbyPlaces.find(p => p.name === 'Bread Shop').source === 'Source not recorded' && observed.nearbyPlaces.find(p => p.name === 'Bread Shop').date === null, 'Missing source and date are not fabricated.');
  check(observed.nearbyPlaces.find(p => p.name === 'Bean House').distanceMeters === 0, 'Exact zero distance remains zero.');
  const smaller = observedBusinessContext(property, 300);
  check(smaller.metrics.observedBusinessCount === 2 && smaller.metrics.observedBusinessesPerSqKm === Math.round(2 / (Math.PI * 0.09) * 100) / 100, 'Changing radius refilters records before recalculating density.');
  const empty = observedBusinessContext({ lat, lng, nearbyBusinesses: [] });
  check(empty.metrics.observedBusinessCount === 0 && empty.metrics.businessesPerSqKm === null, 'Measured zero observations keep complete inventory unknown.');
  for (const invalid of [null, undefined, '', ' ', false, {}, 91, Infinity]) {
    const missing = observedBusinessContext({ ...property, lat: invalid });
    check(!missing.hasCoords && missing.nearbyPlaces.length === 0 && missing.metrics.observedBusinessCount === null && missing.metrics.observedBusinessesPerSqKm === null, 'Missing or invalid origin cannot use precomputed nearby distances as density.');
  }
  check(observedBusinessContext({ lat: 0, lng: 0, nearbyBusinesses: [{ name: 'Equator Merchant', lat: 0, lng: 0, categoryKey: 'cafe' }] }).metrics.observedBusinessCount === 1, 'Legitimate geographic zero coordinates are preserved.');
  for (const radius of [0, -1, Infinity, NaN, [], true]) {
    assert.throws(() => observedBusinessContext(property, radius), RangeError); checks++;
  }
  const evaluated = evaluateBusinessOpportunities(property, 500);
  check(evaluated.metrics.observedBusinessCount === 3 && evaluated.nearbyPlaces.length === 4, 'Production opportunities evaluation shares actual observed metric logic.');
  check(evaluated.supportedMatches.every(item => !/similar operating/.test(item.competitorsNotice)), 'Unverified mapped competitors are not labeled operating.');
  check(evaluated.supportedMatches.every(item => !item.areaStatus.includes('1 sqm')), 'Recorded footprint does not use the rounded legacy one-square-meter area.');
  const unknownOrigin = evaluateBusinessOpportunities({ nearbyBusinesses: property.nearbyBusinesses, clupProfile: { zoningClassification: 'Residential' } });
  check(unknownOrigin.supportedMatches.length === 0 && unknownOrigin.metrics.observedPlaceCount === null, 'Missing origin creates neither synthetic settlement anchor nor screening candidates.');
  const emptyProperty = { name: 'No recorded places', lat, lng, nearbyBusinesses: [] };
  const markup = businessOpportunitiesMarkup(emptyProperty);
  const data = JSON.parse(markup.match(/id="oppDataStore">\s*([\s\S]*?)\s*<\/script>/)[1]);
  check(data.anchors.length === 0 && data.demo === false, 'Empty production property initializes no fabricated map anchors.');
  check(!markup.includes('opportunity-blue-card') && markup.includes('opportunities-empty-state'), 'Empty production property renders no illustrative recommendations.');
  check(!markup.includes('Hospital nearby') && !markup.includes('poi-hospital') && !markup.includes('DEMO SCENARIO'), 'Production empty-state markup contains no invented hospital or demo marker.');
  check(!markup.includes('Operating establishments in radius') && !markup.includes('screening radius &middot; Verified'), 'Radius and density labels do not imply verified operating inventory.');
  const unlocatedHistorical = businessOpportunitiesMarkup({ nearbyBusinesses: [], businessOpportunities: { supportedMatches: [{ id: 'stale', label: 'Stale candidate' }] } });
  check(!unlocatedHistorical.includes('opportunity-blue-card'), 'Historical candidates cannot bypass missing exact origin.');
  const demo = businessOpportunitiesMarkup(emptyProperty, { demo: true });
  check(demo.includes('DEMO SCENARIO - Illustrative') && demo.includes('opportunity-blue-card'), 'Explicit demo mode retains visibly labeled illustrative examples.');
  const emptyCard = renderOpportunityCard({ id: 'unknown', label: 'Unknown support' });
  check(!emptyCard.includes('Saint Louis College') && !emptyCard.includes('City Hall of San Fernando'), 'Card renderer does not fabricate support when records are missing.');
  const contextCard = renderOpportunityCard({ id: 'context', label: 'Residential context', supportingPlaces: [{ name: 'Residential Context', distanceMeters: null }] });
  check(contextCard.includes('Distance not measured') && !contextCard.includes('~2 min'), 'Unmeasured neighborhood context gets no invented travel estimate.');

  const handlers = {};
  const stack = { style: {}, innerHTML: '', querySelector: () => null, querySelectorAll: () => [] };
  const pill = { getAttribute: name => name === 'data-cat-filter' ? 'everyday_services' : null,
    classList: { toggle() {} }, addEventListener: (event, handler) => { handlers[event] = handler; } };
  let mapCalls = 0;
  global.window = { L: { map() { mapCalls++; throw new Error('Unknown origin must not initialize a map.'); } } };
  const mapBox = { getAttribute: name => ({ 'data-lat': '', 'data-lng': '', 'data-radius': '500', 'data-demo': 'false' })[name] };
  const root = { querySelector: selector => ({ '#opportunitiesInteractiveMap': mapBox, '#opportunitiesLeafletCanvas': {}, '#opportunitiesCardsStack': stack })[selector] || null,
    querySelectorAll: selector => selector === '[data-cat-filter]' ? [pill] : [] };
  initBusinessOpportunities(root, { nearbyBusinesses: [] });
  check(mapCalls === 0, 'Production initializer never places missing origin at an invented downtown coordinate.');
  handlers.click();
  await new Promise(resolve => setTimeout(resolve, 180));
  check(stack.innerHTML.includes('opportunities-empty-state') && !stack.innerHTML.includes('opportunity-blue-card'), 'Changing category with no observations keeps empty state instead of demo fallback.');
  delete global.window;
  console.log(`Business opportunities observed: ${checks} production-function checks passed.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
