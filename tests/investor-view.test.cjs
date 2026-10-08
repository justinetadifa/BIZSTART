const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const source = readFileSync('assets/js/investor-view.js', 'utf8');
const key = 'locus.investor-view:/locus:42';
let checks = 0;
const check = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++; };

function start({ role = 'investor', userId = 42, local = new Map(), session = new Map(), blocked = [] } = {}) {
  const documentListeners = {}, windowListeners = {}, dispatched = [];
  const buttons = ['basic', 'advanced'].map(mode => ({
    dataset: { investorMode: mode }, attributes: {}, classes: new Set(),
    setAttribute(name, value) { this.attributes[name] = value; },
    classList: { toggle() {} },
    focus() { doc.activeElement = this; },
    closest(selector) { return selector === '[data-investor-mode]' ? this : selector === '[data-investor-view-control]' ? group : null; },
  }));
  const group = { querySelector: selector => buttons.find(button => selector.includes(`"${button.dataset.investorMode}"`)) };
  const toolbar = { hidden: true }, description = {}, announcement = {};
  const nodes = {
    '[data-investor-view-toolbar]': [toolbar], '[data-investor-mode]': buttons,
    '[data-investor-view-description]': [description], '[data-investor-view-announcement]': [announcement],
  };
  const doc = {
    documentElement: { dataset: {} }, readyState: 'loading', activeElement: null, body: {},
    querySelectorAll: selector => nodes[selector] || [],
    querySelector: selector => group.querySelector(selector),
    addEventListener: (name, callback) => { documentListeners[name] = callback; },
  };
  const win = {
    SFC_APP_CONFIG: { role, user: { id: userId, role }, basePath: '/locus' },
    addEventListener: (name, callback) => { windowListeners[name] = callback; },
    dispatchEvent: event => { dispatched.push(event); },
  };
  for (const [name, values] of [['localStorage', local], ['sessionStorage', session]]) {
    Object.defineProperty(win, name, { get() {
      if (blocked.includes(name)) throw new Error('Storage disabled');
      return { getItem: item => values.get(item) ?? null, setItem: (item, value) => values.set(item, value) };
    } });
  }
  vm.runInNewContext(source, {
    document: doc, window: win,
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    MutationObserver: class { observe() {} },
  });
  documentListeners.DOMContentLoaded();
  return { api: win.SFCInvestorView, doc, toolbar, buttons, description, announcement, dispatched, local, documentListeners, windowListeners };
}

const first = start();
check(first.api.get(), 'basic', 'First use defaults to Basic.');
check(first.toolbar.hidden, false, 'Usable controls appear after initialization.');
check(first.buttons.map(button => button.attributes['aria-pressed']), ['true', 'false'], 'Accessible pressed states match the view.');
first.documentListeners.click({ target: first.buttons[1] });
check(first.api.get(), 'advanced', 'Native Advanced button changes the view.');
check(first.local.get(key), 'advanced', 'The preference is persisted per installation and account.');
check(first.buttons.map(button => button.attributes['aria-pressed']), ['false', 'true'], 'Pressed states update together.');
check(first.dispatched[0].type, 'sfc:investor-view-change', 'Maps receive the mode-change event.');
check(first.dispatched[0].detail.mode, 'advanced', 'The mode-change event identifies the selected view.');
check(start({ local: first.local }).api.get(), 'advanced', 'Navigation restores the chosen view.');
check(start({ local: first.local, userId: 99 }).api.get(), 'basic', 'Another account starts with its own preference.');
first.api.set('unknown');
check(first.api.get(), 'advanced', 'An invalid mode does not change the view.');
first.api.set('advanced');
check(first.dispatched.length, 1, 'Repeated selection does not fire redundant map events.');
let prevented = false;
first.documentListeners.keydown({ target: first.buttons[1], key: 'Home', preventDefault: () => { prevented = true; } });
check(first.api.get(), 'basic', 'Keyboard Home selects Basic.');
check(prevented && first.doc.activeElement === first.buttons[0], true, 'Keyboard selection keeps visible focus on its button.');
first.api.set('advanced');
first.doc.activeElement = { closest: selector => selector === '[data-investor-advanced]' ? {} : null };
first.api.set('basic');
check(first.doc.activeElement === first.buttons[0], true, 'Hiding a focused advanced section restores focus to the Basic control.');
first.windowListeners.storage({ key, newValue: 'advanced' });
check(first.api.get(), 'advanced', 'A changed preference in another tab updates the current view.');
first.windowListeners.storage({ key, newValue: null });
check(first.api.get(), 'basic', 'Clearing the saved preference restores Basic.');
check(start({ local: new Map([[key, 'broken']]) }).api.get(), 'basic', 'Corrupted saved data falls back safely.');
const unavailable = start({ blocked: ['localStorage', 'sessionStorage'] });
unavailable.api.set('advanced');
check(unavailable.api.get(), 'advanced', 'The toggle remains usable when browser storage is disabled.');
const fallback = start({ blocked: ['localStorage'], session: new Map([[key, 'advanced']]) });
check(fallback.api.get(), 'advanced', 'Session storage restores the preference when local storage is blocked.');
const admin = start({ role: 'admin', local: first.local });
check(admin.toolbar.hidden, true, 'Staff workflows do not expose the investor toggle.');
admin.api.set('basic');
check(admin.api.get(), 'advanced', 'Investor preferences do not hide administrative assessment tools.');
check(admin.doc.documentElement.dataset.investorViewEnabled, 'false', 'The Basic visibility rule is disabled for staff.');
console.log(`Investor view checks passed (${checks} checks; no database or network).`);
