/* Investor layers for the existing MapLibre map. All coordinates are WGS84. */
(function (global) {
  const radiusM = 500;
  const burgundy = '#9E1B22';
  const availableGreen = '#158059';
  const availableGreenDark = '#0f6042';
  const navy = '#11224D';
  const livePink = '#ff9aa9';
  const empty = () => ({ type: 'FeatureCollection', features: [] });
  const feature = (geometry, properties) => ({ type: 'Feature', geometry, properties });
  const point = (xy, properties) => feature({ type: 'Point', coordinates: xy }, properties);
  const sourceIds = ['propertyShapes', 'propertyPins', 'propertyLabels', 'propertyRadius', 'propertyReference', 'nearbyBusinesses', 'activeBusiness'];
  const sources = Object.fromEntries(sourceIds.map(id => [id, { type: 'geojson', data: empty() }]));
  const active = ['==', ['get', 'active'], true];
  const isAvail = ['==', ['get', 'available'], true];
  const isLive = ['==', ['get', 'live'], true];
  const groundLayers = [
    { id: 'site-radius-fill', source: 'propertyRadius', type: 'fill', paint: { 'fill-color': navy, 'fill-opacity': 0.045 } },
    { id: 'site-radius-line', source: 'propertyRadius', type: 'line', paint: { 'line-color': navy, 'line-width': 1.5, 'line-dasharray': [3, 3], 'line-opacity': 0.7 } },
    { id: 'property-fill', source: 'propertyShapes', type: 'fill', paint: {
      'fill-color': ['case', active, burgundy, isLive, livePink, isAvail, availableGreen, '#8a8278'],
      'fill-opacity': ['case', active, 0.3, isAvail, 0.22, 0.08]
    } },
    { id: 'property-casing', source: 'propertyShapes', type: 'line', paint: {
      'line-color': '#fffefa',
      'line-width': ['case', active, 5.2, isAvail, 4.2, 2.2],
      'line-opacity': ['case', active, 0.90, isAvail, 0.85, 0.45]
    } },
    { id: 'property-boundary', source: 'propertyShapes', type: 'line', paint: {
      'line-color': ['case', active, burgundy, isLive, '#b23045', isAvail, availableGreenDark, '#766e65'],
      'line-width': ['case', active, 3.2, isAvail, 2.3, 1.3],
      'line-opacity': ['case', active, 1, isAvail, 0.95, 0.62]
    } }
  ];
  const pinLayers = [
    { id: 'nearby-business-markers', source: 'nearbyBusinesses', type: 'symbol', layout: { 'icon-image': ['get', 'icon'], 'icon-size': ['interpolate', ['linear'], ['zoom'], 14, 0.60, 18, 0.9], 'icon-padding': 2, 'symbol-sort-key': ['get', 'distance'] } },
    { id: 'property-live-halo', source: 'propertyPins', type: 'circle', filter: isLive, paint: {
      'circle-radius': ['case', active, 22, 19], 'circle-color': livePink, 'circle-opacity': ['case', active, 0.35, 0.18],
      'circle-stroke-color': livePink, 'circle-stroke-width': 1.2, 'circle-stroke-opacity': 0.6,
      'circle-translate': [0, -17], 'circle-translate-anchor': 'viewport', 'circle-pitch-alignment': 'viewport'
    } },
    { id: 'property-pin', source: 'propertyPins', type: 'symbol', layout: {
      'icon-image': ['case', ['all', isLive, active], 'investor-live-selected', isLive, 'investor-live-listing',
        active, 'investor-property', isAvail, 'investor-property-avail', 'investor-property'],
      'icon-size': ['case', active, 1.12, isLive, 1.02, 0.88],
      'icon-anchor': 'bottom', 'icon-allow-overlap': true, 'icon-ignore-placement': true,
      'symbol-sort-key': ['case', active, 2, isLive, 1, 0]
    }, paint: { 'icon-opacity': ['case', ['any', active, isLive], 1, 0.92] } },
    { id: 'property-available-badge', source: 'propertyLabels', type: 'symbol', minzoom: 12.2, layout: {
      'icon-image': ['case', active, 'investor-badge-selected', isAvail, 'investor-badge-available', 'investor-badge-listed'],
      'icon-size': ['interpolate', ['linear'], ['zoom'], 12.2, 0.72, 15.5, 0.92, 17.5, 1.0],
      'icon-allow-overlap': true, 'icon-ignore-placement': true,
      'text-field': ['get', 'sublabel'], 'text-font': ['Noto Sans Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 13, 10.0, 16.5, 11.4],
      'text-anchor': 'top', 'text-offset': [0, 1.05], 'text-max-width': 13,
      'text-optional': true
    }, paint: {
      'text-color': ['case', active, burgundy, isAvail, availableGreenDark, '#4a4a4a'],
      'text-halo-color': '#fffefa', 'text-halo-width': 2.2
    } },
    { id: 'site-reference', source: 'propertyReference', type: 'circle', paint: { 'circle-radius': 4, 'circle-color': burgundy, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 } },
    { id: 'business-selection-outer', source: 'activeBusiness', type: 'circle', paint: { 'circle-radius': 21, 'circle-color': navy, 'circle-opacity': 0.13 } },
    { id: 'business-selection', source: 'activeBusiness', type: 'circle', paint: { 'circle-radius': 16.5, 'circle-color': '#fffefa', 'circle-opacity': 0.96, 'circle-stroke-color': navy, 'circle-stroke-width': 2.6 } },
    { id: 'business-selection-icon', source: 'activeBusiness', type: 'symbol', layout: { 'icon-image': ['get', 'icon'], 'icon-size': 1.06, 'icon-allow-overlap': true, 'icon-ignore-placement': true } },
    { id: 'business-selection-label', source: 'activeBusiness', type: 'symbol', filter: ['!=', ['get', 'name'], ''], layout: {
      'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'], 'text-size': 12.6,
      'text-anchor': 'top', 'text-offset': [0, 1.62], 'text-max-width': 13,
      'text-allow-overlap': true, 'text-ignore-placement': true
    }, paint: { 'text-color': navy, 'text-halo-color': '#fffefa', 'text-halo-width': 2.6 } }
  ];

  const icons = {
    food: ['#A65236', 'M8 6v6m3-6v6M5 6v6q0 3 3 3t3-3m-3 3v7m11-16q-4 3-4 9h4m0-9v16'],
    retail: ['#287768', 'M5 10h14l1 11H4z M9 10V8a3 3 0 0 1 6 0v2'],
    banks: ['#456B96', 'M3 10l9-6 9 6z M6 13v5m4-5v5m4-5v5m4-5v5M3 21h18'],
    health: ['#9B4C67', 'M10 5h4v5h5v4h-5v5h-4v-5H5v-4h5z'],
    civic: ['#536682', 'M4 21h16M6 21V9l6-5 6 5v12M10 21v-6h4v6M10 10h4'],
    hospitality: ['#8E6D36', 'M3 18V7m0 9h18v4M6 11h3v3H6z M11 14v-4h6q4 0 4 4z'],
    services: ['#596E74', 'M6 8h12q2 0 2 2v9H4v-9q0-2 2-2z M9 8V5h6v3M4 12q8 4 16 0']
  };
  // Some civic and infrastructure points are present in the same OSM POI directory.
  const civicKinds = new Set('school college police ruins basketball government townhall christian kindergarten university artwork playground viewpoint prison museum bicycle_parking place_of_worship taoist courthouse swimming_pool gate shelter ngo lift_gate garden fire_station post_office pitch sikh educational_institution water_utility association community_centre parking monument multi sports_centre'.split(' '));
  const commercialKinds = new Set((
    'hairdresser courier hostel convenience company watches fast_food car_repair bicycle mobile_phone car_parts telecommunication insurance ' +
    'doityourself cafe frozen_food restaurant pharmacy theatre veterinary shoes interior_decoration bank hotel cosmetics clothes ' +
    'beauty atm motorcycle hospital bakery kiosk laundry furniture architect mall supermarket fuel clinic confectionery car travel_agency cinema hardware ' +
    'wholesale photo bar logistics electronics dentist optician tailor books bag computer motel lawyer department_store ice_cream music stationery general ' +
    'energy_supplier guest_house escape_game doctors outdoor fabric butcher pet paint massage weapons florist jewelry estate_agent food_court marketplace ' +
    'copyshop boutique chemist toys'
  ).split(' '));
  function categoryKey(record) {
    return String(record.rawCategory || record.category || '').trim().toLowerCase().replaceAll(' ', '_');
  }
  function groupFor(record) {
    const kind = categoryKey(record);
    if (civicKinds.has(kind)) return 'civic';
    if (/^(company|courier|car_repair|telecommunication|architect|laundry|lawyer|travel_agency|hairdresser|beauty|massage|logistics|tailor|copyshop|estate_agent)$/.test(kind)) return 'services';
    return record.categoryGroup in icons ? record.categoryGroup : 'services';
  }
  function isBusiness(record) {
    const kind = categoryKey(record);
    return record.sourceType === 'official' ? !civicKinds.has(kind) : commercialKinds.has(kind);
  }
  function registerIcons(map) {
    function add(id, draw) {
      if (map.hasImage(id)) return;
      const cv = document.createElement('canvas');
      cv.width = 64;
      cv.height = 64;
      const ctx = cv.getContext('2d');
      ctx.scale(2, 2);
      draw(ctx);
      map.addImage(id, ctx.getImageData(0, 0, 64, 64), { pixelRatio: 2 });
    }
    for (const [group, [color, path]] of Object.entries(icons)) {
      add('investor-' + group, ctx => {
        // Subtle grounding shadow + outer slate halo keep circular icons crisp over both light limestone and dark slate/terracotta roofs.
        ctx.fillStyle = 'rgba(17, 34, 77, 0.16)';
        ctx.beginPath();
        ctx.arc(16, 16.7, 13.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(16, 16, 12.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.05;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(16, 16, 13.55, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(17, 34, 77, 0.40)';
        ctx.lineWidth = 1.1;
        ctx.stroke();

        ctx.translate(5.2, 5.2);
        ctx.scale(0.90, 0.90);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.85;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke(new Path2D(path));
      });
    }
    add('investor-property', ctx => {
      const shape = new Path2D('M16 31C13 25 5 18 5 12a11 11 0 0 1 22 0c0 6-8 13-11 19z');
      ctx.fillStyle = burgundy;
      ctx.fill(shape);
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 1.8;
      ctx.stroke(shape);
      ctx.beginPath();
      ctx.arc(16, 12, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = 'white';
      ctx.fill();
    });
    add('investor-property-avail', ctx => {
      const shape = new Path2D('M16 31C13 25 5 18 5 12a11 11 0 0 1 22 0c0 6-8 13-11 19z');
      ctx.fillStyle = availableGreen;
      ctx.fill(shape);
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 1.8;
      ctx.stroke(shape);
      ctx.beginPath();
      ctx.arc(16, 12, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = 'white';
      ctx.fill();
    });
    for (const [id, top, bottom] of [
      ['investor-live-listing', '#c23e57', '#88132e'],
      ['investor-live-selected', '#fe849a', '#af1736'],
    ]) {
      add(id, ctx => {
        const pin = new Path2D('M16 30.5C14.5 28 4 21 4 13.5a12 12 0 0 1 24 0C28 21 17.5 28 16 30.5Z');
        const fill = ctx.createLinearGradient(0, 2, 0, 30);
        fill.addColorStop(0, top);
        fill.addColorStop(1, bottom);
        ctx.fillStyle = fill;
        ctx.fill(pin);
        ctx.strokeStyle = '#fff8fa';
        ctx.lineWidth = 1.75;
        ctx.stroke(pin);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 1.35;
        ctx.stroke(new Path2D('M10 13.5 16 8.5l6 5M11.5 12.5v6h9v-6M15 18.5v-3h2v3'));
      });
    }
    // Crisp pill badges rendered directly over available & selected investment lots
    function addPillBadge(id, bg, border, label) {
      if (map.hasImage(id)) return;
      const w = 176, h = 44;
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d');
      ctx.scale(2, 2);
      const pw = 84, ph = 18, rx = 9;
      ctx.fillStyle = 'rgba(17, 34, 77, 0.20)';
      ctx.beginPath(); ctx.roundRect(2, 3.2, pw, ph, rx); ctx.fill();
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.roundRect(2, 2, pw, ph, rx); ctx.fill();
      ctx.strokeStyle = border; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(11.5, 11, 2.7, 0, Math.PI * 2); ctx.fill();
      ctx.font = '700 8.8px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(label, 17.5, 11.4);
      map.addImage(id, ctx.getImageData(0, 0, w, h), { pixelRatio: 2 });
    }
    addPillBadge('investor-badge-available', availableGreen, '#ffffff', 'AVAILABLE');
    addPillBadge('investor-badge-selected', burgundy, '#ffffff', 'AVAILABLE');
    addPillBadge('investor-badge-listed', '#5d656c', '#ffffff', 'LISTED LOT');
  }
  function position(lng, lat) {
    const valid = v => (typeof v === 'number' || typeof v === 'string' && v.trim() !== '') && Number.isFinite(Number(v));
    return valid(lng) && valid(lat) && Math.abs(lng) <= 180 && Math.abs(lat) <= 90 ? [Number(lng), Number(lat)] : null;
  }
  function polygon(value) {
    const geometry = value?.type === 'Feature' ? value.geometry : value;
    if (!geometry || !['Polygon', 'MultiPolygon'].includes(geometry.type)) return null;
    const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
    const validRing = r => Array.isArray(r) && r.length >= 4 &&
      r.every(p => Array.isArray(p) && typeof p[0] === 'number' && typeof p[1] === 'number' && position(...p)) &&
      r[0][0] === r.at(-1)[0] && r[0][1] === r.at(-1)[1];
    return Array.isArray(polys) && polys.length && polys.every(p => Array.isArray(p) && p.length && p.every(validRing)) ? geometry : null;
  }
  function listingUrl(value, sameOrigin = false) {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
      const url = new URL(value, document.baseURI);
      return ['http:', 'https:'].includes(url.protocol) && (!sameOrigin || url.origin === window.origin) ? url.href : null;
    } catch { return null; }
  }
  function normalize(raw, boundaries, source, live = false) {
    const props = raw.type === 'Feature' ? raw.properties || {} : raw;
    const id = props.property_id ?? props.id ?? raw.id;
    if (id == null || !String(id).trim()) throw Error('Each listing needs a property ID.');
    const parcel = props.parcel || {};
    const geom = raw.geometry;
    const reference = props.referencePoint || parcel.referencePoint || props.reference_point;
    const coord = position(reference?.lng, reference?.lat) || position(props.reference_lng, props.reference_lat) ||
      (geom?.type === 'Point' && position(...geom.coordinates)) || position(props.longitude ?? props.lng, props.latitude ?? props.lat);
    const geometry = polygon(props.boundary || parcel.boundary || props.boundary_geojson || geom) || boundaries.get(String(id)) || null;
    const sqm = props.area_sqm ?? props.land_area_sqm ?? parcel.surveyAreaSqm;
    const quantity = Number(sqm ?? props.area_ha ?? props.area);
    const locusExport = 'pricePerSqm' in props && 'roadAccess' in props && 'barangay' in props;
    const areaUnit = sqm != null ? 'm²' : props.area_ha != null ? 'ha' :
      (props.area_unit || props.areaUnit || (locusExport ? 'ha' : ''));
    const area = Number.isFinite(quantity) && quantity > 0 ?
      quantity.toLocaleString() + (areaUnit ? ' ' + areaUnit : ' · unit not provided') : null;
    const rawStatus = String(props.status || props.availability || props.lot_status || props.listing_status || '').trim().toLowerCase();
    const isUnavailable = props.available === false || /^(sold|leased|occupied|reserved|unavailable|closed|inactive)$/.test(rawStatus);
    const available = !isUnavailable;
    const statusLabel = rawStatus
      ? rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1)
      : 'Available';
    let centroid = coord || null;
    if (!live && !centroid && geometry) {
      const ring = geometry.type === 'Polygon' ? geometry.coordinates[0] : geometry.coordinates[0][0];
      if (ring && ring.length > 1) {
        let sx = 0, sy = 0, cnt = ring.length - 1;
        for (let i = 0; i < cnt; i++) { sx += ring[i][0]; sy += ring[i][1]; }
        centroid = [sx / cnt, sy / cnt];
      }
    }
    return {
      id: String(id), mapId: `${live ? 'live' : 'import'}:${id}`, live,
      name: String(props.name || props.title || props.property_name || 'Property ' + id),
      reference: coord || null, labelPoint: centroid, geometry, source: String(props.source || source || 'Imported listing'),
      barangay: props.barangay || null, city: props.city || null, area, available, statusLabel,
      price: live && typeof props.price_text === 'string' ? props.price_text : '',
      purpose: live ? { sale: 'For sale', lease: 'For lease', sale_or_lease: 'For sale or lease' }[props.purpose] : null,
      image: live ? listingUrl(props.image_url, true) : null,
      verifiedAt: props.verified_at || props.verifiedAt || null,
      url: listingUrl(props.listing_url || props.listingUrl || props.details_url || props.detailsUrl || props.url, live)
    };
  }
  function create({ map, scout, selectBusiness, clearInspection, onOpen, onLiveOpen, showLivePopup, isSourceVisible, lookupRecord }) {
    const host = document.getElementById('property-panel');
    const livePanel = document.getElementById('live-properties-panel');
    const liveToggle = document.getElementById('live-properties-toggle');
    const liveClose = document.getElementById('live-properties-close');
    const liveFit = document.getElementById('live-properties-fit');
    const liveStatus = document.getElementById('live-properties-status');
    const liveList = document.getElementById('live-properties-list');
    const liveCounts = document.querySelectorAll('[data-live-property-count]');
    let properties = new Map();
    let liveProperties = new Map();
    let liveState = 'idle';
    let publicCount = 0;
    let unmappedCount = 0;
    let site = null;
    let nearby = false;
    let business = null;
    let open = false;
    let matches = [];
    function writeSource(id, features) {
      map.getSource(id)?.setData({ type: 'FeatureCollection', features });
    }
    function selectedDistance() {
      return nearby && site?.reference && business?.hasValidCoords
        ? Math.round(LocusMarketScout.haversineM(...site.reference, business.lng, business.lat))
        : null;
    }
    function syncGeometry() {
      const shapes = [], pins = [], labels = [];
      for (const item of [...properties.values(), ...liveProperties.values()]) {
        const props = {
          id: item.mapId, active: item === site, available: item.available, live: item.live,
          sublabel: item.area ? `${item.name} · ${item.area}` : item.name
        };
        if (item.geometry) shapes.push(feature(item.geometry, props));
        if (item.reference && (item.live || !item.geometry)) pins.push(point(item.reference, props));
        if (!item.live && item.labelPoint && !(item === site && business?.hasValidCoords)) {
          labels.push(point(item.labelPoint, props));
        }
      }
      writeSource('propertyShapes', shapes);
      writeSource('propertyPins', pins);
      writeSource('propertyLabels', labels);
      writeSource('propertyRadius', site?.reference && nearby ? [feature(LocusMarketScout.makeCirclePolygon(...site.reference, radiusM), {})] : []);
      writeSource('propertyReference', site?.reference && site.geometry && nearby ? [point(site.reference, { id: site.mapId })] : []);
      const activeUid = business?.hasValidCoords ? business.uid : null;
      writeSource('activeBusiness', activeUid ?
        [point([business.lng, business.lat], { uid: business.uid, name: business.name || '', icon: 'investor-' + groupFor(business) })] : []);
      if (map.getLayer('community-names')) {
        map.setFilter('community-names', activeUid
          ? ['all', ['!=', ['get', 'suppressedByLandmark'], true], ['!=', ['get', 'uid'], activeUid]]
          : ['!=', ['get', 'suppressedByLandmark'], true]);
      }
      if (map.getLayer('official-names')) {
        map.setFilter('official-names', activeUid
          ? ['all', ['has', 'uid'], ['!=', ['get', 'uid'], activeUid]]
          : ['has', 'uid']);
      }
      // Gently soften neighboring markers when one business is focused so the selected place reads immediately while co-tenants remain clickable
      const baseOp = activeUid ? 0.68 : 1;
      const iconOpExpr = ['case', ['==', ['get', 'scoutDim'], 1], 0.28, baseOp];
      for (const lid of ['community-dots', 'official-dots', 'community-names', 'official-names']) {
        if (map.getLayer(lid)) map.setPaintProperty(lid, 'icon-opacity', iconOpExpr);
      }
      for (const lid of ['community-names', 'official-names']) {
        if (map.getLayer(lid)) map.setPaintProperty(lid, 'text-opacity', iconOpExpr);
      }
      if (map.getLayer('nearby-business-markers')) {
        map.setPaintProperty('nearby-business-markers', 'icon-opacity', baseOp);
      }
      const readout = document.getElementById('nearby-selection');
      const distance = selectedDistance();
      readout.hidden = distance == null;
      readout.replaceChildren();
      if (distance != null) {
        readout.append(el('strong', business.name), el('span', distance + ' m from selected site'));
      }
    }
    function load(data, options = {}) {
      const rows = Array.isArray(data) ? data : data?.type === 'FeatureCollection' ? data.features : data?.properties;
      if (!Array.isArray(rows)) throw Error('Choose a property array, a GeoJSON FeatureCollection, or a file with a properties array.');
      const boundaries = new Map();
      const linked = options.boundaries || data.boundaries;
      for (const record of (linked?.features || (Array.isArray(linked) ? linked : []))) {
        const id = record.properties?.property_id ?? record.property_id;
        const geometry = polygon(record);
        if (id != null && geometry) boundaries.set(String(id), geometry);
      }
      const updated = new Map();
      for (const raw of rows) {
        const item = normalize(raw, boundaries, options.sourceName);
        if (updated.has(item.mapId)) throw Error('The file repeats property ID ' + item.id + '.');
        updated.set(item.mapId, item);
      }
      properties = updated;
      if (site && !site.live) {
        clearInspection();
        site = properties.get(site.mapId) || null;
        nearby = Boolean(site?.reference && nearby);
      }
      open = properties.size > 0;
      refresh();
      return properties.size;
    }
    const isLivePanelOpen = () => Boolean(livePanel && !livePanel.hidden);
    const isNarrowMap = () => map.getContainer().clientWidth <= 940;

    function listingMeta(item) {
      return [item.barangay || item.city, item.area, item.purpose].filter(Boolean).join(' · ');
    }

    function listingLink(item) {
      if (!item.url) return null;
      const link = el('a', 'View listing', 'live-property-link');
      link.href = item.url;
      if (window.parent !== window) {
        link.target = '_top';
      }
      return link;
    }

    function syncLiveSelection(selected) {
      if (!liveList) return;
      for (const row of liveList.querySelectorAll('.live-property-row')) {
        const current = row.dataset.mapId === selected?.mapId;
        row.setAttribute('aria-pressed', String(current));
        const item = row.parentElement;
        item.querySelector('.live-property-link')?.remove();
        const link = current ? listingLink(selected) : null;
        if (link) item.append(link);
      }
    }

    function renderLive() {
      const count = liveProperties.size;
      if (liveFit) liveFit.disabled = count === 0;
      for (const badge of liveCounts) {
        badge.hidden = liveState !== 'ready';
        badge.textContent = String(count);
      }
      const stat = document.getElementById('stat-avail');
      if (stat) stat.textContent = liveState === 'ready' ? String(publicCount) : '—';
      if (!liveStatus || !liveList) return;
      liveList.replaceChildren();
      if (liveState === 'error') {
        liveStatus.textContent = 'Available properties could not load.';
        const retry = el('button', 'Try again', 'live-property-link');
        retry.type = 'button';
        retry.onclick = loadLive;
        liveList.append(retry);
        return;
      }
      if (liveState !== 'ready') {
        liveStatus.textContent = 'Loading available properties…';
        return;
      }
      const summary = publicCount === 0 ? 'There are no available properties right now.'
        : count === 0 ? 'No available properties have a saved location.'
          : `${count} ${count === 1 ? 'property' : 'properties'} on the map`;
      liveStatus.textContent = unmappedCount > 0 ? `${summary} · ${unmappedCount} without a saved location` : summary;
      for (const property of liveProperties.values()) {
        const item = el('div', '', 'live-property-item');
        const row = el('button', '', 'live-property-row');
        row.type = 'button';
        row.dataset.mapId = property.mapId;
        const copy = el('span', '', 'live-property-row-copy');
        copy.append(el('strong', property.name, 'live-property-row-title'));
        const meta = listingMeta(property);
        if (meta) copy.append(el('span', meta, 'live-property-row-meta'));
        if (property.price) copy.append(el('span', property.price, 'live-property-row-price'));
        if (property.image) {
          const image = el('img', null, 'live-property-row-image');
          image.alt = '';
          image.width = 44;
          image.height = 44;
          image.loading = 'lazy';
          image.decoding = 'async';
          image.src = property.image;
          row.append(image);
        }
        row.append(copy);
        row.onclick = () => selectLive(property, true);
        item.append(row);
        liveList.append(item);
      }
      syncLiveSelection(site?.live ? site : null);
    }

    async function loadLive() {
      if (liveState === 'loading') return;
      liveState = 'loading';
      renderLive();
      try {
        const path = document.documentElement.dataset.listingsUrl || '../../api/city-map-listings.php';
        const endpoint = new URL(path, document.baseURI);
        const response = await fetch(endpoint, { credentials: 'same-origin' });
        if (!response.ok) throw Error('Listing request failed.');
        const payload = await response.json();
        if (!Array.isArray(payload.listings)) throw Error('Listing response is missing its records.');
        const next = new Map();
        for (const raw of payload.listings) {
          const item = normalize(raw, new Map(), 'LOCUS-SF', true);
          if (item.available && (item.reference || item.geometry)) next.set(item.mapId, item);
        }
        liveProperties = next;
        unmappedCount = Number.isSafeInteger(payload.unmappedCount) && payload.unmappedCount >= 0 ? payload.unmappedCount : 0;
        publicCount = next.size + unmappedCount;
        liveState = 'ready';
        if (site?.live) site = liveProperties.get(site.mapId) || null;
        syncGeometry();
        renderLive();
        if (isLivePanelOpen() && !isNarrowMap()) fitLive();
      } catch {
        liveState = 'error';
        renderLive();
      }
    }

    function livePadding(forSelection = false) {
      const { width, height, left } = map.getContainer().getBoundingClientRect();
      if (isNarrowMap()) {
        return forSelection
          ? { top: 48, right: 22, bottom: Math.round(height * .26), left: 22 }
          : { top: Math.min(188, height * .36), right: 22, bottom: 54, left: 22 };
      }
      const padding = getMobileMapPadding();
      if (!isLivePanelOpen()) return padding;
      const rail = livePanel.getBoundingClientRect();
      padding.left = Math.min(width * .44, rail.right - left + 18);
      return padding;
    }

    function extendPropertyBounds(bounds, property) {
      if (property.reference) bounds.extend(property.reference);
      if (!property.geometry) return;
      const polygons = property.geometry.type === 'Polygon' ? [property.geometry.coordinates] : property.geometry.coordinates;
      for (const rings of polygons) for (const ring of rings) for (const xy of ring) bounds.extend(xy);
    }

    function fitLive() {
      if (!liveProperties.size) return;
      onLiveOpen();
      if (site?.live) {
        clearInspection();
        site = null;
        syncGeometry();
        syncLiveSelection(null);
      }
      const bounds = new maplibregl.LngLatBounds();
      for (const item of liveProperties.values()) extendPropertyBounds(bounds, item);
      map.fitBounds(bounds, { padding: livePadding(), maxZoom: 16.7, pitch: 38, bearing: 0, duration: 700 });
    }

    function openLivePanel() {
      if (!livePanel || !liveToggle) return;
      onLiveOpen();
      livePanel.hidden = false;
      liveToggle.setAttribute('aria-expanded', 'true');
      liveClose?.focus({ preventScroll: true });
      if (!isNarrowMap()) fitLive();
    }

    function closeLivePanel(restoreFocus = false) {
      if (!isLivePanelOpen()) return false;
      livePanel.hidden = true;
      liveToggle.setAttribute('aria-expanded', 'false');
      if (restoreFocus) liveToggle.focus({ preventScroll: true });
      return true;
    }

    function selectLive(next, fromList = false) {
      onLiveOpen();
      const closeSheet = isNarrowMap() && isLivePanelOpen();
      if (closeSheet) closeLivePanel();
      clearInspection();
      site = next;
      business = null;
      nearby = false;
      refresh();
      syncLiveSelection(next);
      const padding = livePadding(true);
      const anchor = next.reference || (next.geometry.type === 'Polygon' ? next.geometry.coordinates[0][0] : next.geometry.coordinates[0][0][0]);
      const zoom = map.getZoom();
      if (next.geometry) {
        const bounds = new maplibregl.LngLatBounds();
        extendPropertyBounds(bounds, next);
        map.fitBounds(bounds, { padding, maxZoom: 18, pitch: map.getPitch(), bearing: map.getBearing(), duration: 520 });
      } else {
        const offset = [(padding.left - padding.right) / 2, (padding.top - padding.bottom) / 2];
        map.easeTo({ center: anchor, zoom: Math.max(17.2, zoom), offset, duration: 520 });
      }
      const popup = el('div', '', 'live-property-popup');
      popup.append(el('span', 'Available property', 'live-property-popup-kicker'), el('strong', next.name, 'live-property-popup-title'));
      const meta = listingMeta(next);
      if (meta) popup.append(el('span', meta, 'live-property-popup-meta'));
      if (next.price) popup.append(el('span', next.price, 'live-property-popup-price'));
      const link = listingLink(next);
      if (link) popup.append(link);
      showLivePopup(anchor, popup, Boolean(next.reference), closeSheet && fromList);
      return site;
    }

    function goTo(id) {
      const key = String(id);
      const next = liveProperties.get(key) || properties.get(key) || properties.get(`import:${key}`) || liveProperties.get(`live:${key}`);
      if (!next) return null;
      if (next.live) return selectLive(next);
      onOpen();
      if (site === next) {
        open = true;
        render();
        return site;
      }
      clearInspection();
      if (site?.live) syncLiveSelection(null);
      site = next;
      business = null;
      nearby = false;
      open = true;
      refresh();
      if (site.geometry) {
        const bounds = new maplibregl.LngLatBounds();
        const rings = site.geometry.type === 'Polygon' ? site.geometry.coordinates : site.geometry.coordinates.flat();
        for (const ring of rings) for (const xy of ring) bounds.extend(xy);
        map.fitBounds(bounds, { padding: getMobileMapPadding(), maxZoom: 18, pitch: map.getPitch(), bearing: map.getBearing(), duration: 450 });
      } else if (site.reference) {
        map.easeTo({ center: site.reference, zoom: Math.max(16, map.getZoom()), padding: getMobileMapPadding(), duration: 450 });
      }
      return site;
    }
    function setNearby(explicitState) {
      if (!site?.reference) return;
      if (business) clearInspection();
      nearby = typeof explicitState === 'boolean' ? explicitState : !nearby;
      refresh();
      if (nearby) {
        const bounds = new maplibregl.LngLatBounds();
        for (const xy of LocusMarketScout.makeCirclePolygon(...site.reference, radiusM).coordinates[0]) bounds.extend(xy);
        map.fitBounds(bounds, { padding: getMobileMapPadding(), pitch: map.getPitch(), bearing: map.getBearing(), maxZoom: 16.5, duration: 450 });
      }
      return nearby;
    }
    function focusSubjectProperty(raw, options = {}) {
      if (!raw || typeof raw !== 'object') return null;
      const item = normalize(raw, new Map(), raw.source || 'LOCUS-SF', true);
      if (!item.reference && !item.geometry) return null;
      item.available = true;
      liveProperties.set(item.mapId, item);
      clearInspection();
      site = item;
      business = null;
      nearby = Boolean(options.showNearby);
      refresh();
      syncLiveSelection(item);
      const anchor = item.reference || (item.geometry.type === 'Polygon' ? item.geometry.coordinates[0][0] : item.geometry.coordinates[0][0][0]);
      if (item.geometry) {
        const bounds = new maplibregl.LngLatBounds();
        extendPropertyBounds(bounds, item);
        map.fitBounds(bounds, { padding: { top: 44, right: 44, bottom: 44, left: 44 }, maxZoom: 18, pitch: 56, bearing: -24, duration: options.instant ? 0 : 520 });
      } else if (anchor) {
        map.easeTo({ center: anchor, zoom: 17.4, pitch: 58, bearing: -24, duration: options.instant ? 0 : 520 });
      }
      if (options.showPopup !== false && anchor) {
        const popup = el('div', '', 'live-property-popup');
        popup.append(el('span', raw.approximate ? 'Approximate location' : 'Subject property', 'live-property-popup-kicker'), el('strong', item.name, 'live-property-popup-title'));
        const meta = listingMeta(item);
        if (meta) popup.append(el('span', meta, 'live-property-popup-meta'));
        if (item.price) popup.append(el('span', item.price, 'live-property-popup-price'));
        showLivePopup(anchor, popup, Boolean(item.reference), false);
      }
      return item;
    }
    function refresh() {
      if (business && lookupRecord(business.uid) !== business) clearInspection();
      matches = [];
      if (nearby && site?.reference) {
        const [lng, lat] = site.reference;
        const results = scout.evaluateSite({ lng, lat }, '', [], radiusM, record => isBusiness(record) && isSourceVisible(record));
        matches = results.allRecords
          .map(record => ({ record, distance: results.distByUid.get(record.uid) })).sort((a, b) => a.distance - b.distance || a.record.name.localeCompare(b.record.name));
      }
      writeSource('nearbyBusinesses', matches.map(({ record, distance }) => point([record.lng, record.lat], {
        uid: record.uid, icon: 'investor-' + groupFor(record), distance
      })));
      for (const id of ['community-cluster-circles', 'community-cluster-count', 'business-singles']) {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', nearby ? 'none' : 'visible');
      }
      syncGeometry();
      render();
    }
    function markBusiness(record) {
      business = record;
      syncGeometry();
      for (const button of host.querySelectorAll('.nearby-row')) {
        const current = button.dataset.uid === record?.uid;
        button.classList.toggle('selected', current);
        button.setAttribute('aria-pressed', String(current));
        if (current) {
          const list = button.parentElement;
          const rect = button.getBoundingClientRect();
          const viewport = list.getBoundingClientRect();
          if (rect.bottom > viewport.bottom) list.scrollTop += rect.bottom - viewport.bottom;
          else if (rect.top < viewport.top) list.scrollTop += rect.top - viewport.top;
        }
      }
      return selectedDistance();
    }
    function render() {
      const details = el('details', '', 'property-listings');
      details.open = open;
      details.ontoggle = () => { if (details.isConnected) open = details.open; };
      const summary = el('summary', 'Available lots & listings');
      const availCount = [...properties.values()].filter(p => p.available).length;
      if (properties.size) summary.append(el('span', `${availCount} avail`, 'count-badge'));
      details.append(summary);
      const body = el('div', '', 'property-body');
      const picker = el('select', '', 'property-picker');
      picker.setAttribute('aria-label', 'Select a listed property');
      picker.add(new Option('Select an available lot', ''));
      for (const item of properties.values()) {
        picker.add(new Option((item.available ? '● Available · ' : '') + item.name, item.id));
      }
      picker.value = site && !site.live ? site.id : '';
      picker.onchange = () => {
        if (picker.value) goTo(`import:${picker.value}`);
        else if (!site?.live) { clearInspection(); site = null; nearby = false; refresh(); }
      };
      if (properties.size) body.append(picker);
      else body.append(el('p', 'No property listings loaded.', 'panel-note'));
      const file = el('input');
      file.type = 'file';
      file.accept = '.json,.geojson';
      file.hidden = true;
      const loader = el('button', 'Load listings', 'btn-ghost');
      loader.type = 'button';
      loader.onclick = () => file.click();
      file.onchange = async () => {
        const input = file.files[0];
        if (!input) return;
        try { load(JSON.parse(await input.text()), { sourceName: input.name }); }
        catch (error) { setStatus(error.message); }
        file.value = '';
      };
      body.append(loader, file);
      if (site && !site.live) {
        const statusRow = el('div', '', 'detail-badges');
        statusRow.style.margin = '8px 0 4px';
        statusRow.append(el('span', site.statusLabel, site.available ? 'badge-available' : 'badge-unavailable'));
        if (site.barangay) statusRow.append(el('span', site.barangay, 'badge badge-building'));
        body.append(statusRow);
        const facts = el('dl', '', 'property-facts meta-grid');
        for (const [label, value] of [
          ['Availability', site.statusLabel],
          ['Boundary', site.geometry ? 'Recorded polygon' : 'Not provided'],
          ['Reference point', site.reference ? site.reference.slice().reverse().map(v => v.toFixed(5)).join(', ') : 'Not provided'],
          ['Listed land area', site.area || 'Not provided'],
          ['Listing source', site.source], ['Verified date', site.verifiedAt || 'Not provided']
        ]) facts.append(el('dt', label), el('dd', value));
        body.append(facts);
        if (site.url) {
          const link = el('a', 'View listing', 'listing-link');
          link.href = site.url;
          body.append(link);
        }
        const toggle = el('button', 'Nearby Businesses', 'nearby-businesses');
        toggle.type = 'button';
        toggle.disabled = !site.reference;
        toggle.setAttribute('aria-expanded', String(nearby));
        toggle.onclick = setNearby;
        body.append(toggle);
        if (nearby) {
          body.append(el('p', matches.length + ' mapped businesses within 500 m · Straight-line distance', 'panel-note'));
          const list = el('div', '', 'nearby-list');
          for (const { record, distance } of matches) {
            const row = el('button', '', 'nearby-row tenant-btn');
            row.type = 'button';
            row.dataset.uid = record.uid;
            row.setAttribute('aria-pressed', String(record.uid === business?.uid));
            row.classList.toggle('selected', record.uid === business?.uid);
            row.append(el('span', record.name), el('span', distance + ' m', 'distance'));
            row.onclick = () => selectBusiness(record);
            list.append(row);
          }
          body.append(list);
        }
      }
      details.append(body);
      host.replaceChildren(details);
    }
    function hit(px, layerIds) {
      const ids = layerIds.filter(id => map.getLayer(id));
      return ids.length && map.queryRenderedFeatures(px, { layers: ids })[0]?.properties.id;
    }
    if (liveToggle) liveToggle.onclick = () => isLivePanelOpen() ? closeLivePanel(true) : openLivePanel();
    if (liveClose) liveClose.onclick = () => closeLivePanel(true);
    if (liveFit) liveFit.onclick = () => {
      if (isNarrowMap()) closeLivePanel(true);
      fitLive();
    };
    return { load, loadLive, goTo, refresh, markBusiness, hit, render, openLivePanel, closeLivePanel,
      focusSubjectProperty, setNearby, getSite: () => site,
      isSelectedSite: id => site?.mapId === String(id), nearbyRecords: () => matches.map(m => m.record) };
  }
  global.InvestorSites = { sources, groundLayers, pinLayers, registerIcons, create, groupFor, icons };
})(window);
