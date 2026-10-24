'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const model = require('../assets/js/mce-weights-model.js');
const weights = values => Object.fromEntries(model.codes.map((code, index) => [code, values[index]]));
const baseline = weights([25, 25, 20, 15, 15]);
const ranges = Object.fromEntries(model.codes.map(code => [code, { rangeMin: 5, rangeMax: 60 }]));

test('validation rejects missing, non-finite, out-of-range and over-precision values even at 100%', () => {
  assert.equal(model.validate(baseline, ranges).valid, true);
  for (const invalid of [NaN, Infinity, '', null, false, 4.99, 60.01, 25.001]) {
    assert.equal(model.validate({ ...baseline, spatial_accessibility: invalid }, ranges).valid, false, String(invalid));
  }
  assert.equal(model.validate(weights([65, 5, 10, 10, 10]), ranges).balanced, true);
  assert.equal(model.validate(weights([65, 5, 10, 10, 10]), ranges).valid, false);
  assert.equal(model.validate(weights([25, 25, 20, 15, 14.99]), ranges).valid, false);
});

test('balancing preserves the changed criterion, current priorities and exact hundredths', () => {
  assert.deepEqual(model.rebalance(weights([40, 25, 20, 15, 15]), model.codes[0], ranges), weights([40, 20, 16, 12, 12]));
  assert.deepEqual(model.rebalance(weights([60, 60, 5, 5, 5]), model.codes[0], ranges), weights([60, 25, 5, 5, 5]));
  const fractional = model.rebalance(weights([33.33, 25, 20, 15, 15]), model.codes[0], ranges);
  assert.equal(fractional.spatial_accessibility, 33.33);
  assert.equal(model.validate(fractional, ranges).valid, true);
  assert.equal(model.rebalance(weights([61, 10, 10, 10, 9]), model.codes[0], ranges), null);
  const impossible = Object.fromEntries(model.codes.map(code => [code, { rangeMin: 25, rangeMax: 60 }]));
  assert.equal(model.rebalance(weights([30, 30, 30, 30, 30]), model.codes[0], impossible), null);
});

test('10,000 varied allocations stay within bounds, preserve the locked weight and total exactly 100%', () => {
  let seed = 98273;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0x100000000; };
  for (let sample = 0; sample < 10000; sample += 1) {
    const draft = weights(model.codes.map(() => Math.round((5 + random() * 55) * 100) / 100));
    const locked = model.codes[sample % 5];
    const result = model.rebalance(draft, locked, ranges);
    assert.ok(result, JSON.stringify(draft));
    assert.equal(result[locked], draft[locked]);
    assert.equal(model.validate(result, ranges).valid, true);
  }
});

function harness() {
  const nodes = new Map();
  class Element {
    constructor(id, dataset = {}) {
      this.id = id; this.dataset = dataset; this.listeners = new Map(); this.attributes = {};
      this.hidden = false; this.disabled = false; this.open = false; this.checked = true; this._value = '';
      this.style = { setProperty() {} }; this.classList = { toggle() {}, add() {}, remove() {} };
    }
    get value() { return this._value; }
    set value(value) { this._value = String(value); }
    set innerHTML(value) {
      this._html = value;
      if (this.id === 'mceCriteriaInputs' && value.includes('data-input-weight')) {
        for (const code of model.codes) {
          nodes.set(`mce-weight-${code}`, new Element(`mce-weight-${code}`, { inputWeight: code }));
          nodes.set(`slider-${code}`, new Element(`slider-${code}`, { sliderWeight: code }));
          nodes.set(`delta-${code}`, new Element(`delta-${code}`, { deltaBadge: code }));
          nodes.set(`mce-error-${code}`, new Element(`mce-error-${code}`));
        }
      }
    }
    get innerHTML() { return this._html || ''; }
    setAttribute(name, value) { this.attributes[name] = value; }
    removeAttribute(name) { delete this.attributes[name]; }
    addEventListener(name, callback) { const callbacks = this.listeners.get(name) || []; callbacks.push(callback); this.listeners.set(name, callbacks); }
    dispatch(name, target = this) { for (const callback of this.listeners.get(name) || []) callback({ target, preventDefault() {} }); }
    querySelectorAll(selector) {
      const attributes = [...selector.matchAll(/\[data-([a-z-]+)(?:="([^"]+)")?\]/g)];
      return [...nodes.values()].filter(node => attributes.some(([, attribute, value]) => {
        const key = attribute.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
        return node.dataset[key] !== undefined && (!value || node.dataset[key] === value);
      }));
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    showModal() { this.open = true; }
    close() { this.open = false; }
    focus() {}
    scrollIntoView() {}
  }
  const markup = fs.readFileSync(path.join(__dirname, '../admin-dashboard.php'), 'utf8');
  for (const [, id] of markup.matchAll(/id="([^"]+)"/g)) nodes.set(id, new Element(id));
  for (const preset of ['baseline', 'logistics', 'commercial', 'balanced']) nodes.set(`preset-${preset}`, new Element(`preset-${preset}`, { mcePreset: preset }));
  const events = [];
  const storage = [];
  const requests = [];
  const pending = [];
  const configuration = {
    current_version: 'active-1', baseline_weights: baseline, active_weights: baseline,
    criteria: Object.fromEntries(model.codes.map((code, index) => [code, { name: `Criterion ${index + 1}`, description: 'Evidence description', weight: baseline[code] }])),
    history: [], permitted_weight_range: { min: 5, max: 60 }, discrepancy: { rationale: 'Zoning is an eligibility gate.' }
  };
  const window = { MceWeightsModel: model, SFC_APP_CONFIG: {}, confirm: () => true, addEventListener() {}, dispatchEvent: event => events.push(event) };
  const context = {
    window, document: { getElementById: id => nodes.get(id) || null, querySelector: () => null },
    localStorage: { setItem: (key, value) => storage.push([key, JSON.parse(value)]) },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    AbortController,
    fetch: (url, options) => {
      const body = options.body ? JSON.parse(options.body) : null;
      requests.push({ url, options, body });
      return new Promise(resolve => { pending.push(data => resolve({ ok: data.ok, json: async () => data })); });
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/admin-mce-weights.js'), 'utf8'), context);
  const flush = () => new Promise(resolve => setImmediate(resolve));
  const respond = async data => { assert.ok(pending.length, 'request pending'); pending.shift()(data); await flush(); };
  const open = async () => {
    nodes.get('openMceConfigModalBtn').dispatch('click');
    await respond({ ok: true, configuration, csrfToken: 'test-token' });
  };
  const edit = (code, value) => {
    const input = nodes.get(`mce-weight-${code}`); input.value = value;
    nodes.get('mceCriteriaInputs').dispatch('input', input);
  };
  const justify = () => { nodes.get('mceReasonInput').value = 'Updated commercial priorities'; nodes.get('mceReferenceInput').value = 'Planning committee resolution'; };
  return { nodes, events, storage, requests, pending, respond, open, edit, justify, flush, window };
}

test('save is locked against duplicate clicks and publishes confirmed weights without a follow-up GET', async () => {
  const h = harness(); await h.open();
  h.nodes.get('preset-logistics').dispatch('click'); h.justify();
  h.nodes.get('applyMceConfigBtn').dispatch('click');
  h.nodes.get('applyMceConfigBtn').dispatch('click');
  assert.equal(h.requests.length, 2);
  assert.equal(h.nodes.get('applyMceConfigBtn').disabled, true);
  assert.equal(h.nodes.get('closeMceConfigBtn').disabled, true);
  assert.equal(h.events.length, 0);
  const submitted = h.requests[1].body;
  assert.equal(submitted.expected_version, 'active-1');
  assert.equal(submitted.csrf_token, 'test-token');
  await h.respond({ ok: true, version: 'saved-2', weights: submitted.weights, applied_at: '2026-10-23T01:00:00Z', reason: submitted.reason });
  assert.equal(h.requests.length, 2);
  assert.equal(h.events[0].type, 'locus:mce-weights-updated');
  assert.deepEqual({ ...h.events[0].detail.weights }, submitted.weights);
  assert.equal(h.events[0].detail.version, 'saved-2');
  assert.equal(h.events[0].detail.configuration.criteria.spatial_accessibility.weight, 35);
  assert.equal(h.window.SFC_APP_CONFIG.mceVersion, 'saved-2');
  assert.equal(h.storage[0][0], 'locus:mce-weights-updated');
  assert.equal(h.nodes.get('mceWeightConfigDialog').open, true);
  assert.equal(h.nodes.get('applyMceConfigBtn').disabled, true);
  assert.match(h.nodes.get('mceConfigStatusMessage').textContent, /New property assessments/);
});

test('invalid values and missing authority cannot save; failure preserves the draft without publishing', async () => {
  const h = harness(); await h.open();
  h.nodes.get('mceAutoBalance').checked = false;
  h.edit(model.codes[0], 65); h.edit(model.codes[1], 5); h.edit(model.codes[2], 10); h.edit(model.codes[3], 10); h.edit(model.codes[4], 10);
  assert.equal(h.nodes.get('applyMceConfigBtn').disabled, true);
  assert.equal(h.nodes.get('previewMceConfigBtn').disabled, true);
  h.nodes.get('applyMceConfigBtn').dispatch('click'); assert.equal(h.requests.length, 1);
  h.nodes.get('preset-logistics').dispatch('click');
  h.nodes.get('mceReasonInput').value = 'Updated commercial priorities';
  h.nodes.get('applyMceConfigBtn').dispatch('click');
  assert.equal(h.nodes.get('mceReferenceInlineError').hidden, false);
  assert.equal(h.requests.length, 1);
  h.justify(); h.nodes.get('applyMceConfigBtn').dispatch('click');
  await h.respond({ ok: false, error: 'Unable to persist configuration.' });
  assert.equal(h.events.length, 0);
  assert.equal(h.storage.length, 0);
  assert.equal(h.nodes.get('applyMceConfigBtn').disabled, false);
  assert.equal(h.nodes.get(`mce-weight-${model.codes[0]}`).value, '35.0');
  assert.match(h.nodes.get('mceConfigStatusMessage').textContent, /Unable to persist/);
});

test('editing during an in-flight simulation discards its response and keeps the preview hidden', async () => {
  const h = harness(); await h.open();
  h.nodes.get('previewMceConfigBtn').dispatch('click');
  assert.equal(h.nodes.get('previewMceConfigBtn').disabled, true);
  h.edit(model.codes[0], 40);
  await h.respond({ ok: true, preview: { simulations: [{ profile: 'Stale simulation', baselineScore: 85, proposedScore: 80 }] } });
  assert.equal(h.nodes.get('mcePreviewContainer').hidden, true);
  assert.equal(h.nodes.get('previewMceConfigBtn').disabled, false);
  assert.doesNotMatch(h.nodes.get('mcePreviewContent').innerHTML, /Stale simulation/);
  assert.equal(h.nodes.get(`mce-weight-${model.codes[1]}`).value, '20.0');
});

test('restore publishes baseline immediately; reopening does not duplicate preset or save handlers', async () => {
  const h = harness(); await h.open();
  h.nodes.get('preset-logistics').dispatch('click'); h.justify(); h.nodes.get('applyMceConfigBtn').dispatch('click');
  await h.respond({ ok: true, version: 'custom-2', weights: weights([35, 30, 15, 10, 10]) });
  h.nodes.get('restoreMceBaselineBtn').dispatch('click');
  await h.respond({ ok: true, version: 'restored-3', weights: baseline, is_baseline: true });
  assert.equal(h.events.length, 2);
  assert.deepEqual({ ...h.events[1].detail.weights }, baseline);
  assert.equal(h.nodes.get('restoreMceBaselineBtn').disabled, true);
  h.nodes.get('cancelMceConfigBtn').dispatch('click'); await h.open();
  assert.equal(h.nodes.get('preset-logistics').listeners.get('click').length, 1);
  assert.equal(h.nodes.get('applyMceConfigBtn').listeners.get('click').length, 1);
});

test('late configuration load cannot overwrite a closed dialog', async () => {
  const h = harness();
  h.nodes.get('openMceConfigModalBtn').dispatch('click');
  h.nodes.get('cancelMceConfigBtn').dispatch('click');
  await h.respond({ ok: false, error: 'Stale request' });
  assert.equal(h.nodes.get('mceWeightConfigDialog').open, false);
  assert.doesNotMatch(h.nodes.get('mceConfigStatusMessage').textContent, /Stale request/);
});
