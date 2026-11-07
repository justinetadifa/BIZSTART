/** Bounded imagery recovery. Leaflet still owns gestures, tiles and attribution. */
export function createAssistantBasemap(L, map, { tileUrl, attribution, onState, timeoutMs = 6500 }) {
  const osm = {
    id: 'osm', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', maxNativeZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  };
  const esri = {
    id: 'esri',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    maxNativeZoom: 16,
    attribution: 'Tiles &copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors',
  };
  const primaryUrl = tileUrl || osm.url;
  const primary = /tile\.openstreetmap\.org\//i.test(primaryUrl)
    ? { ...osm, url: primaryUrl }
    : primaryUrl === esri.url ? esri
      : { id: 'configured', url: primaryUrl, maxNativeZoom: 19, attribution: attribution || osm.attribution };
  const providers = [primary, esri, osm].filter((provider, index, all) => all.findIndex(item => item.id === provider.id) === index);

  let layer = null;
  let index = -1;
  let generation = 0;
  let timer = 0;
  let state = 'loading';
  let publishedProvider = null;
  let destroyed = false;
  const publish = next => {
    const provider = providers[index]?.id;
    if (state === next && publishedProvider === provider) return;
    state = next; publishedProvider = provider;
    onState({ state, provider });
  };
  const clear = () => { clearTimeout(timer); timer = 0; };

  function hasVisibleImagery() {
    const bounds = map.getContainer().getBoundingClientRect();
    return [...(layer?.getContainer()?.querySelectorAll('img.leaflet-tile-loaded') || [])].some(image => {
      if (!image.complete || image.naturalWidth === 0) return false;
      const box = image.getBoundingClientRect();
      return box.right > bounds.left && box.left < bounds.right && box.bottom > bounds.top && box.top < bounds.bottom;
    });
  }

  function nextProvider(token) {
    if (destroyed || token !== generation) return;
    clear();
    if (hasVisibleImagery()) { publish('ready'); return; }
    // Leaflet completes tile bookkeeping after its load event. Detach only
    // after that stack returns, so it never continues with a removed map.
    if (index + 1 < providers.length) queueMicrotask(() => {
      if (!destroyed && token === generation) use(index + 1);
    });
    else publish('unavailable');
  }

  function use(nextIndex) {
    if (destroyed) return;
    const token = ++generation;
    clear();
    if (layer) { map.removeLayer(layer); layer.off(); }
    index = nextIndex;
    let successes = 0;
    let failures = 0;
    const provider = providers[index];
    layer = L.tileLayer(provider.url, {
      attribution: provider.attribution, maxZoom: 19, maxNativeZoom: provider.maxNativeZoom,
      updateWhenIdle: true, updateWhenZooming: false, keepBuffer: 2,
    });
    const begin = () => {
      successes = 0; failures = 0; clear();
      if (!hasVisibleImagery()) publish('loading');
      timer = setTimeout(() => nextProvider(token), timeoutMs);
    };
    layer.on('loading', begin);
    layer.on('tileload', () => {
      if (token !== generation || destroyed) return;
      successes++;
      clear();
      publish('ready');
    });
    layer.on('tileerror', () => { if (token === generation) failures++; });
    layer.on('load', () => {
      if (token !== generation || destroyed) return;
      if (successes || hasVisibleImagery()) { clear(); publish('ready'); }
      else if (failures) nextProvider(token);
    });
    publish('loading');
    layer.addTo(map);
    // Also cover a connection that stalls before Leaflet emits a tile event.
    if (!timer && state === 'loading') timer = setTimeout(() => nextProvider(token), timeoutMs);
  }

  use(0);
  return {
    getState: () => state,
    retry() { if (state === 'unavailable') use(0); },
    destroy() { destroyed = true; generation++; clear(); if (layer) { map.removeLayer(layer); layer.off(); } },
  };
}
