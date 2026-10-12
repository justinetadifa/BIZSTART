const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const adminSource = fs.readFileSync(path.join(__dirname, '../assets/js/admin-location.js'), 'utf8');
const wizardSource = fs.readFileSync(path.join(__dirname, '../assets/js/property-wizard.js'), 'utf8');
const barangays = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/barangays.json'), 'utf8')).barangays;

function productionParser(source) {
  const prefix = 'const parseCoordinates = ';
  const start = source.indexOf(prefix);
  assert(start >= 0, 'Production coordinate parser must exist.');
  const end = source.indexOf('\n    };', start);
  return vm.runInNewContext(`(${source.slice(start + prefix.length, end + 6)})`);
}
const parseAdmin = productionParser(adminSource);
const parseWizard = productionParser(wizardSource);
const validCoordinates = [
  '16.615852, 120.316482', '120.316482 16.615852', '(16.615852; 120.316482)',
  '[16.615852, 120.316482]', '16.6158° N, 120.3164° E', '16.6158N 120.3164E',
  '16°36\'57.1"N 120°18\'59.3"E', '16°36′57.1″N,120°18′59.3″E',
  '16.6S 120.3W', '-16.6S -120.3W', '.5, .25', '0, 0',
];
const invalidCoordinates = [
  '', null, 'not coordinates', '16.6N 120.3N', '16.6E 120.3E',
  '-16.6N 120.3E', '16°60\'N 120E', '16°30\'60"N 120E',
  '16°30"N 120E', '91, 181', '91N 120E', '16.6N 181E',
  '16.6N 120.3E extra text', '16.6 120.3 5', 'NaN,120', '(16.6,120.3',
];
for (const input of validCoordinates) {
  assert(parseAdmin(input), `Valid coordinates must parse: ${input}`);
  assert.equal(JSON.stringify(parseAdmin(input)), JSON.stringify(parseWizard(input)), `Legacy/wizard parser compatibility: ${input}`);
}
for (const input of invalidCoordinates) {
  assert.equal(parseAdmin(input), null, `Malformed coordinates must be rejected: ${input}`);
  assert.equal(parseWizard(input), null, `Wizard must reject the same malformed coordinates: ${input}`);
}

function harness(existingPin = ['16.616596', '120.317211']) {
  const document = {activeElement: null};
  class Element {
    constructor(value = '') { this.value = value; this.innerHTML = ''; this.textContent = ''; this.disabled = false; this.listeners = {}; this.attributes = {}; }
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
    dispatchEvent(event) { for (const fn of this.listeners[event.type] || []) fn(event); }
    emit(type, detail = {}) { return Promise.all((this.listeners[type] || []).map(fn => fn({type, preventDefault() {}, ...detail}))); }
    focus() { document.activeElement = this; }
    setAttribute(name, value) { this.attributes[name] = value; }
    removeAttribute(name) { delete this.attributes[name]; }
    querySelector() { return null; }
  }
  const elements = {lat: new Element(existingPin[0]), lng: new Element(existingPin[1]), barangay: new Element('Catbangen')};
  const input = new Element();
  const search = new Element();
  const results = new Element();
  const status = new Element();
  const center = new Element();
  const dialog = new Element();
  const canvas = new Element();
  const nodes = {'[data-location-map]': canvas, '[data-location-search]': input, '[data-location-search-button]': search, '[data-location-results]': results, '[data-location-status]': status, '[data-use-map-center]': center};
  const form = {elements, querySelector: name => nodes[name] || null};
  const mapEvents = {};
  const map = {
    view: null, zoom: 14, bounds: null,
    setView(point, zoom) { this.view = [...point]; this.zoom = zoom; this.bounds = null; return this; },
    getZoom() { return this.zoom; },
    getCenter() { return {lat: this.view[0], lng: this.view[1]}; },
    on(type, fn) { mapEvents[type] = fn; return this; },
    invalidateSize() {}, stop() {},
    fitBounds(bounds) { this.bounds = bounds; return this; },
  };
  const L = {
    map: () => map,
    tileLayer: () => ({addTo() {}}),
    marker: point => ({
      point: [...point],
      addTo() { return this; },
      on() { return this; },
      setLatLng(next) { this.point = [...next]; return this; },
      getLatLng() { return {lat: this.point[0], lng: this.point[1]}; },
      remove() {},
    }),
  };
  const timers = new Map();
  let nextTimer = 0;
  let responseResults = [];
  let deferredFetch;
  let fetchCount = 0;
  const context = {
    window: {L, SFC_APP_CONFIG: {barangays}}, L, document, AbortController,
    Event: class {constructor(type) {this.type = type;}},
    requestAnimationFrame: fn => fn(),
    setTimeout: fn => {const id = ++nextTimer; timers.set(id, fn); return id;},
    clearTimeout: id => timers.delete(id),
    fetch: async () => {
      fetchCount++;
      if (deferredFetch) await deferredFetch;
      return {ok:true, json: async () => ({search: {results: responseResults, live:true}})};
    },
  };
  vm.runInNewContext(adminSource, context);
  const editor = context.window.SFCAdminLocation(form, {apiBase:'/api', dialog});
  editor.sync();
  const pin = () => [elements.lat.value, elements.lng.value];
  return {
    elements, input, search, results, status, dialog, map, center, document, pin,
    flushTimers() { for (const [id, fn] of [...timers]) {timers.delete(id); fn();} },
    select(index) { return results.emit('click', {target: {closest: () => ({dataset: {locationResult:String(index)}})}}); },
    setResults(items) {responseResults = items;},
    defer(promise) {deferredFetch = promise;},
    get fetchCount() {return fetchCount;},
  };
}

(async () => {
  for (const query of ['Calabugao', 'Baranggay Calabugao', 'Brgy. Calabugao', 'Calabugao, San Fernando City, La Union']) {
    const h = harness();
    h.input.value = query;
    await h.input.emit('change');
    assert.deepEqual(h.map.view, [barangays.Calabugao.lat, barangays.Calabugao.lng], 'Search must navigate to Calabugao despite an existing pin.');
    assert.deepEqual(h.pin(), ['16.616596', '120.317211'], 'Barangay search must preserve the existing property pin.');
    assert.equal(h.elements.barangay.value, 'Calabugao');
    assert.equal(h.fetchCount, 0, 'Exact local searches must not need the geocoder.');
  }
  const blank = harness(['', '']);
  blank.input.value = 'Calabugao';
  await blank.input.emit('input');
  blank.flushTimers();
  assert.deepEqual(blank.map.view, [barangays.Calabugao.lat, barangays.Calabugao.lng]);
  assert.deepEqual(blank.pin(), ['', ''], 'Viewing a barangay must not invent property coordinates.');

  const numbered = harness();
  numbered.input.value = 'Barangay IV';
  await numbered.search.emit('click');
  assert.deepEqual(numbered.map.view, [barangays['Barangay IV'].lat, barangays['Barangay IV'].lng], 'Barangay IV must outrank Barangay I.');
  numbered.input.value = 'Brgy 2';
  await numbered.search.emit('click');
  assert.deepEqual(numbered.map.view, [barangays['Barangay II'].lat, barangays['Barangay II'].lng]);

  const partial = harness();
  const originalView = [...partial.map.view];
  partial.input.value = 'Dalumpinas';
  await partial.input.emit('input');
  partial.flushTimers();
  assert.deepEqual(partial.map.view, originalView, 'An ambiguous partial search must wait for selection.');
  assert(partial.results.innerHTML.includes('Dalumpinas Este') && partial.results.innerHTML.includes('Dalumpinas Oeste'));
  await partial.select(1);
  assert.deepEqual(partial.map.view, [barangays['Dalumpinas Oeste'].lat, barangays['Dalumpinas Oeste'].lng]);
  assert.deepEqual(partial.pin(), ['16.616596', '120.317211']);

  const typedBarangay = harness();
  typedBarangay.elements.barangay.value = 'Brgy. Calabugao';
  typedBarangay.document.activeElement = typedBarangay.elements.barangay;
  await typedBarangay.elements.barangay.emit('input');
  typedBarangay.flushTimers();
  assert.equal(typedBarangay.elements.barangay.value, 'Brgy. Calabugao', 'Navigation must not rewrite a focused barangay field while typing.');
  assert.deepEqual(typedBarangay.pin(), ['16.616596', '120.317211']);

  const listing = harness();
  listing.setResults([{kind:'property', label:'Zambrano Building', barangay:'Catbangen', lat:16.615852, lng:120.316482}]);
  listing.input.value = 'Zambrano';
  await listing.search.emit('click');
  await listing.select(0);
  assert.deepEqual(listing.pin(), ['16.615852', '120.316482'], 'Property results with barangay metadata must still select their listing coordinates.');

  const geocode = harness();
  geocode.setResults([{kind:'geocode',label:'Civic Plaza',lat:16.619,lng:120.319,bounds:[[16.618,120.318],[16.620,120.320]]}]);
  geocode.input.value = 'Civic Plaza';
  await geocode.search.emit('click');
  await geocode.select(0);
  assert.deepEqual(geocode.pin(), ['16.616596', '120.317211'], 'Provider references must navigate without overwriting property coordinates.');
  assert.equal(JSON.stringify(geocode.map.bounds), JSON.stringify([[16.618,120.318],[16.620,120.320]]));

  const paste = harness(['', '']);
  await paste.input.emit('paste', {clipboardData: {getData: () => '16°36\'57.1"N 120°18\'59.3"E'}});
  assert.deepEqual(paste.pin(), ['16.615861', '120.316472']);
  await paste.elements.lat.emit('paste', {clipboardData: {getData: () => '-16.6S -120.3W'}});
  assert.deepEqual(paste.pin(), ['-16.600000', '-120.300000'], 'Negative hemispheres must not be negated twice.');

  const stale = harness();
  let resolveFetch;
  stale.defer(new Promise(resolve => {resolveFetch = resolve;}));
  stale.setResults([{kind:'geocode',label:'Obsolete result',lat:16.615,lng:120.315}]);
  stale.input.value = 'Pending address';
  const request = stale.search.emit('click');
  stale.input.value = 'Dalumpinas';
  await stale.input.emit('input');
  resolveFetch();
  await request;
  assert(stale.results.innerHTML.includes('Dalumpinas Este') && !stale.results.innerHTML.includes('Obsolete result'), 'A stale network response must not replace a newer local search.');
  assert.equal(stale.search.disabled, false);

  const mapCenter = harness();
  mapCenter.input.value = 'Calabugao';
  await mapCenter.input.emit('change');
  await mapCenter.center.emit('click');
  assert.deepEqual(mapCenter.pin(), [barangays.Calabugao.lat.toFixed(6), barangays.Calabugao.lng.toFixed(6)], 'Use map center must choose the current viewed location without recentering to the old pin first.');

  console.log('Admin location: production parser compatibility and runtime navigation, selection, paste and stale response checks passed.');
})().catch(error => {console.error(error); process.exitCode = 1;});
