const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('assets/js/browse-restoration.js', 'utf8').replace('export function', 'function');
const { createBrowseRestoration } = vm.runInNewContext(`${source}\n({ createBrowseRestoration });`);

function browser(state = null) {
  const events = new Map(), documentEvents = new Map(), frames = [], scrolls = [];
  const view = {
    location: { pathname: '/property-explorer.php', search: '?view=all' },
    history: { state, scrollRestoration: 'auto', replaceState(value) { this.state = value; } },
    scrollX: 0, scrollY: 830,
    addEventListener(type, fn, options) { events.set(type, { fn, options }); },
    requestAnimationFrame(fn) { frames.push(fn); },
    scrollTo(options) { scrolls.push(options); },
  };
  const doc = { visibilityState: 'visible', addEventListener(type, fn, options) { documentEvents.set(type, { fn, options }); } };
  return { view, doc, events, documentEvents, frames, scrolls,
    flush() { while (frames.length) frames.shift()(); },
    controller(scope = 'guest') { return createBrowseRestoration({ scope, capture: () => ({ search: 'Office' }), view, doc }); } };
}

const first = browser({ unrelatedState: 42 });
const browsing = first.controller();
assert.equal(browsing.data, undefined, 'A fresh visit never inherits an unrelated search');
first.events.get('pagehide').fn();
assert.equal(first.view.history.state.locusBrowse, undefined, 'An unfinished async load cannot overwrite saved browsing data');
browsing.ready();
first.events.get('pagehide').fn();
assert.equal(first.view.history.state.unrelatedState, 42, 'Other history consumers retain their state');
assert.equal(first.view.history.state.locusBrowse.data.search, 'Office');
assert.equal(first.view.history.state.locusBrowse.y, 830);

const returned = browser(first.view.history.state);
const restoration = returned.controller();
let localScrollRestores = 0;
assert.equal(restoration.data.search, 'Office', 'Filters are available before asynchronous results render');
assert.equal(returned.scrolls.length, 0, 'No scroll occurs before results finish');
restoration.ready(() => { localScrollRestores++; });
assert.equal(returned.scrolls.length, 0, 'Wait for the resulting layout');
returned.flush();
assert.equal(returned.scrolls.length, 1);
assert.equal(returned.scrolls[0].top, 830);
assert.equal(returned.scrolls[0].behavior, 'instant', 'Back navigation must not animate');
assert.equal(localScrollRestores, 1, 'Conversation and result-rail scrolling use the same settled layout');
assert.equal(returned.view.history.scrollRestoration, 'auto', 'Native history restoration remains enabled');

const otherUser = browser(first.view.history.state);
assert.equal(otherUser.controller('another-account').data, undefined, 'Searches are scoped to the current account');
const anotherRoute = browser(first.view.history.state);
anotherRoute.view.location.search = '';
assert.equal(anotherRoute.controller().data, undefined, 'Different URLs have independent browsing state');

for (const event of ['pointerdown', 'touchstart', 'wheel', 'keydown']) {
  const active = browser(first.view.history.state), controller = active.controller();
  assert.equal(active.events.get(event).options.passive, true);
  controller.ready();
  active.events.get(event).fn({});
  active.flush();
  assert.equal(active.scrolls.length, 0, `Pending restoration never overrides new ${event} input`);
}

const cached = browser(first.view.history.state), cachedController = cached.controller();
cached.events.get('pageshow').fn({ persisted: true });
cachedController.ready(); cached.flush();
assert.equal(cached.scrolls.length, 0, 'BFCache retains the browser scroll without an extra jump');

const restricted = browser();
Object.defineProperty(restricted.view.history, 'state', { get() { throw new Error('Restricted'); } });
const optional = restricted.controller();
optional.ready(); assert.doesNotThrow(() => optional.save(), 'Restricted history cannot block browsing or navigation');

// Exercise the real filter restoration against asynchronously populated selects.
const citySource = fs.readFileSync('assets/js/city-workspace.js', 'utf8');
const filterFunctions = citySource.slice(citySource.indexOf('function updateSubcategories()'), citySource.indexOf('function restoreBrowsingMap('));
const select = values => ({ tagName: 'SELECT', type: 'select-one', value: '', options: values.map(value => ({ value })),
  add(option) { this.options.push(option); },
  set innerHTML(_html) { this.options = [{ value: '' }]; this.value = ''; } });
const category = select(['', 'Land', 'Office']), subcategory = select(['']);
const formClasses = new Set();
const nodes = {
  cityCategory: category, citySubcategory: subcategory,
  citySearch: { value: '' }, citySort: select(['newest', 'price']),
  citySavedOnly: { type: 'checkbox', checked: false },
  citySubcategoryWrapper: { style: {} },
  cityFilters: { classList: { toggle(name, active) { if (active) formClasses.add(name); else formClasses.delete(name); },
    contains(name) { return formClasses.has(name); } }, dispatchEvent() {} },
  citySearchGlass: { value: '' }, cityHeroCategory: { value: '' },
};
const ctx = vm.createContext({ document: { getElementById(id) { return nodes[id]; } },
  categories: { Land: ['Commercial lot'], Office: ['Office building'] },
  currentRankingView: 'list', expandedCards: new Set(), map: undefined, Event: class {},
  Option: function(label, value) { return { label, value }; },
});
vm.runInContext(filterFunctions, ctx);
ctx.restoreBrowsingState({ controls: { cityCategory: 'Land', citySubcategory: 'Commercial lot', citySearch: 'Biday', citySort: 'price', citySavedOnly: true },
  expandedCards: [123, 'invalid'], rankingView: 'grid', filtersExpanded: true });
assert.equal(category.value, 'Land');
assert.equal(subcategory.value, 'Commercial lot', 'Restore the category before rebuilding dependent subcategory choices');
assert.equal(subcategory.disabled, false);
assert.equal(nodes.citySort.value, 'price');
assert.equal(nodes.citySavedOnly.checked, true);
assert.equal(nodes.citySearchGlass.value, 'Biday');
assert.equal(nodes.cityHeroCategory.value, 'Land');
assert.equal(ctx.currentRankingView, 'grid');
assert.deepEqual([...ctx.expandedCards], [123]);
assert.equal(formClasses.has('filters-expanded'), true);
ctx.restoreBrowsingState({ controls: { cityCategory: 'Removed category', citySubcategory: 'Removed subcategory', citySort: 'Removed sort' } });
assert.equal(category.value, 'Land', 'Removed options must not blank valid current filter choices');
assert.equal(subcategory.value, '', 'A removed subcategory falls back to all subcategories');
assert.equal(nodes.citySort.value, 'price');

const assistantSource = fs.readFileSync('assets/js/investment-assistant.js', 'utf8');
const requestFunction = assistantSource.slice(assistantSource.indexOf('  function browsingCriteriaRequest('), assistantSource.indexOf('  function restoreAssistantBrowsing('));
const assistantContext = vm.createContext({ browsing: { data: undefined },
  fieldIds: { purpose: 'iaPurpose', budget: 'iaBudget', category: 'iaCategory' }, requestId: () => 'restore-request-id' });
vm.runInContext(requestFunction, assistantContext);
const data = { state: { version: 7, criteria: { purpose: 'sale', budget: null, category: 'Land' } } };
assert.equal(assistantContext.browsingCriteriaRequest(data), null);
assistantContext.browsing.data = { criteria: { purpose: 'sale', budget: null, category: 'Land' } };
assert.equal(assistantContext.browsingCriteriaRequest(data), null, 'The assistant uses its existing server state when criteria match');
assistantContext.browsing.data.criteria.category = 'Office';
assistantContext.browsing.data.criteria.unsupportedField = 'discard';
const restoredRequest = assistantContext.browsingCriteriaRequest(data);
assert.equal(restoredRequest.filters.category, 'Office');
assert.equal(restoredRequest.version, 7, 'A restoration must use the current server version');
assert.equal(restoredRequest.requestId, 'restore-request-id');
assert.equal(restoredRequest.filters.unsupportedField, undefined, 'Only the supported search fields are restored');

console.log('PASS: async browsing restoration, per-entry/account isolation, instant back scrolling, BFCache, native gestures, restricted history.');
