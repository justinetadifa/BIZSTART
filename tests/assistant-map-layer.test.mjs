import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../assets/js/assistant-map-layer.js', import.meta.url), 'utf8');
const { createAssistantBasemap } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
function fixture(options = {}) {
  const layers = [], active = new Set(), states = [];
  let dispatchDepth = 0;
  const bounds = { left: 0, top: 0, right: 800, bottom: 400 };
  const map = { getContainer: () => ({ getBoundingClientRect: () => bounds }), removeLayer(layer) {
    assert.equal(dispatchDepth, 0, 'Provider changes must wait for Leaflet tile-event bookkeeping.');
    active.delete(layer);
  } };
  const L = { tileLayer(url, config) {
    const events = new Map();
    const layer = {
      url, config, images: [], on(name, callback) { events.set(name, callback); return layer; },
      off() { events.clear(); }, emit(name) { dispatchDepth++; try { events.get(name)?.(); } finally { dispatchDepth--; } },
      addTo() { active.add(layer); layer.emit('loading'); return layer; },
      getContainer: () => ({ querySelectorAll: () => layer.images }),
    };
    layers.push(layer); return layer;
  } };
  const controller = createAssistantBasemap(L, map, { timeoutMs: 1000, onState: state => states.push(state), ...options });
  return { layers, active, states, controller };
}
{
  const f = fixture({ tileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: 'CARTO' });
  assert(!f.layers[0].config.attribution.includes('CARTO'));
  f.layers[0].emit('tileerror'); f.layers[0].emit('tileload'); f.layers[0].emit('load');
  assert.equal(f.controller.getState(), 'ready'); assert.equal(f.layers.length, 1, 'A single failed tile does not replace a usable background.');
  const announcements = f.states.length;
  f.layers[0].emit('tileload'); f.layers[0].emit('tileload');
  assert.equal(f.states.length, announcements, 'Successful tiles must not repeat identical live-status announcements.');
  f.controller.destroy();
}
{
  const f = fixture();
  f.layers[0].emit('tileerror'); f.layers[0].emit('load');
  await Promise.resolve();
  assert.equal(f.layers.length, 2); assert(f.layers[1].url.includes('arcgisonline')); assert.equal(f.active.size, 1);
  assert.equal(f.layers[1].config.maxNativeZoom, 16); assert(f.layers[1].config.attribution.includes('Esri'));
  f.layers[1].emit('tileload'); f.layers[1].emit('load');
  assert.equal(f.controller.getState(), 'ready'); assert.equal(f.states.at(-1).provider, 'esri');
  f.controller.destroy(); assert.equal(f.active.size, 0);
}
{
  const f = fixture();
  f.layers[0].emit('tileerror'); f.layers[0].emit('load');
  await Promise.resolve();
  f.layers[1].emit('tileerror'); f.layers[1].emit('load');
  assert.equal(f.controller.getState(), 'unavailable'); assert.equal(f.layers.length, 2);
  // Late successful tiles must remove a failure warning, without a page reload.
  f.layers[1].emit('tileload'); assert.equal(f.controller.getState(), 'ready');
  f.layers[1].emit('loading'); f.layers[1].emit('tileerror'); f.layers[1].emit('load');
  assert.equal(f.controller.getState(), 'unavailable');
  f.controller.retry(); assert.equal(f.layers.length, 3); assert.equal(f.controller.getState(), 'loading');
  f.layers[2].emit('tileload'); assert.equal(f.controller.getState(), 'ready'); f.controller.destroy();
}
{
  const f = fixture({ tileUrl: 'https://custom.example/tiles/{z}/{x}/{y}.png' });
  for (let i = 0; i < 3; i++) { f.layers[i].emit('tileerror'); f.layers[i].emit('load'); await Promise.resolve(); }
  assert.equal(f.layers.length, 3); assert.equal(f.controller.getState(), 'unavailable'); f.controller.destroy();
}
{
  const f = fixture({ timeoutMs: 20 });
  await wait(75); assert.equal(f.layers.length, 2); assert.equal(f.controller.getState(), 'unavailable');
  await wait(35); assert.equal(f.layers.length, 2, 'Stalled providers do not retry forever.'); f.controller.destroy();
}
console.log('Assistant map recovery passed: imagery success, fallback, attribution, late recovery, retry, and bounded stalls.');
