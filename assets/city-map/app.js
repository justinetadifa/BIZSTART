/* LOCUS SF — Interactive Isometric City Explorer (San Fernando, La Union) */

const byId = id => document.getElementById(id);
const collection = features => ({ type: 'FeatureCollection', features });
const SMOOTH_EASE = t => 1 - Math.pow(1 - t, 3);
const EASE_IN_OUT = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function lerpHex(hexA, hexB, t) {
  const a = parseInt(hexA.slice(1), 16);
  const b = parseInt(hexB.slice(1), 16);
  const r = Math.round(((a >> 16) & 255) + (((b >> 16) & 255) - ((a >> 16) & 255)) * t);
  const g = Math.round(((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * t);
  const bl = Math.round((a & 255) + ((b & 255) - (a & 255)) * t);
  return `#${((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)}`;
}
const point = (coordinates, properties) => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates },
  properties
});

const DOWNTOWN_VIEW = {
  center: [120.31705, 16.61645],
  zoom: 16.35,
  pitch: 56,
  bearing: -28
};

const cityBounds = new maplibregl.LngLatBounds();
cityBoundary.geometry.coordinates[0].forEach(p => cityBounds.extend(p));

// Subtle outer mask polygon (world exterior with San Fernando boundary hole) to emphasize city scale
const cityOutsideMask = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'Polygon',
    coordinates: [
      [[119.5, 15.8], [121.2, 15.8], [121.2, 17.4], [119.5, 17.4], [119.5, 15.8]],
      cityBoundary.geometry.coordinates[0].slice().reverse()
    ]
  }
};

const storeKey = 'quest-atlas-v1-La Union';
let stops = [];
let pendingPinName = '';
let pendingLinkUid = null;
let pendingScoutSite = null;
let draggingScoutSite = null;
let lightingMode = 'day';
let scout = null;
let uiWorkspace = 'explore';
let activeEvidence = null;
let activePopup = null;
let activeSourceTab = 'all';
let activeCategory = 'all';
let activeBarangay = '';
let selectedUid = null;
let selectedBuildingId = null;
let hoveredBuildingId = null;
let selectedLandmarkId = null;

try {
  const parsed = JSON.parse(localStorage.getItem(storeKey) || '[]');
  if (Array.isArray(parsed)) stops = parsed;
} catch { }

// Initialize Registry (keeps Community OpenStreetMap snapshot strictly distinct from Official thesis records)
const registry = LocusRegistry.createRegistry({
  communityDirectory: directory,
  boundaryFeature: cityBoundary
});

function bytes(encoded) {
  return Uint8Array.from(atob(encoded || ''), c => c.charCodeAt(0)).buffer;
}

maplibregl.addProtocol('atlas', async ({ url }) => {
  const key = url.replace('atlas://', '');
  return {
    data: bytes(key.startsWith('font/') ? (key.endsWith('/0-255.pbf') ? glyph : '') : tiles[key])
  };
});

// Check whether a community POI name duplicates an already-labeled Verified 3D Landmark on the same site
function isDuplicateOfLandmarkLabel(rec) {
  if (!rec || !rec.hasValidCoords || !window.VERIFIED_LANDMARKS) return false;
  const rn = String(rec.name || '').toLowerCase();
  for (const lm of VERIFIED_LANDMARKS) {
    const d = Math.hypot((rec.lng - lm.lng) * 106500, (rec.lat - lm.lat) * 110600);
    if (d > 68) continue;
    const ln = lm.name.toLowerCase();
    const sn = lm.shortName.toLowerCase();
    if (rn === ln || rn === sn || rn.includes(sn) || ln.includes(rn)) return true;
  }
  return false;
}

function makeCommunityGeoJSON() {
  return collection(registry.getCommunityRecords().map(r => {
    const bInfo = window.LocusBrands ? window.LocusBrands.getBrandInfo(r.osmIndex, r.name) : null;
    return point([r.lng, r.lat], {
      uid: r.uid,
      name: r.name,
      category: r.category,
      icon: 'investor-' + InvestorSites.groupFor(r),
      sourceType: 'community',
      matchType: r.buildingMatchType || 'pending',
      brandIcon: bInfo ? bInfo.iconId : '',
      brandStatus: bInfo ? bInfo.status : '',
      suppressedByLandmark: isDuplicateOfLandmarkLabel(r),
      scoutDim: scout ? scout.getRecordDimState(r) : 0,
      scoutRole: scout ? scout.getRecordScoutRole(r) : 0
    });
  }));
}

function makeOfficialGeoJSON() {
  return collection(registry.getMappedOfficialRecords().map(r => point([r.lng, r.lat], {
    uid: r.uid,
    officialId: r.officialId || '',
    name: r.name,
    category: r.category,
    icon: 'investor-' + InvestorSites.groupFor(r),
    sourceType: 'official',
    matchType: r.buildingMatchType || 'pending',
    verifiedAt: r.verifiedAt,
    scoutDim: scout ? scout.getRecordDimState(r) : 0,
    scoutRole: scout ? scout.getRecordScoutRole(r) : 0
  })));
}

function makeLandmarkGeoJSON() {
  return collection(VERIFIED_LANDMARKS.map(lm => point([lm.lng, lm.lat], {
    id: lm.id,
    name: lm.name,
    shortName: lm.shortName,
    category: lm.category
  })));
}

function businessSourceVisible(record) {
  return byId(record.sourceType === 'official' ? 'toggle-official' : 'toggle-community').checked;
}

function clusterData(community, official) {
  return collection([
    ...(byId('toggle-community').checked ? community.features : []),
    ...(byId('toggle-official').checked ? official.features : [])
  ]);
}

const businessHitLayers = ['community-dots', 'official-dots', 'community-names', 'official-names', 'nearby-business-markers',
  'business-singles', 'business-selection-icon', 'scout-match-ring-official', 'scout-match-ring', 'scout-partner-ring', 'scout-match-labels'];
const businessSymbols = (id, source, filter, minzoom, maxzoom, named = false) => ({
  id, source, type: 'symbol', filter, minzoom, maxzoom,
  layout: {
    'icon-image': ['get', 'icon'],
    ...(named ? {
      'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'], 'text-size': 11,
      'text-anchor': 'top', 'text-offset': [0, 1.25], 'text-max-width': 10,
      'text-padding': 3, 'text-optional': true
    } : {}),
    'icon-size': ['interpolate', ['linear'], ['zoom'], 13, 0.62, 16.35, 0.73, 18.5, 0.92],
    'icon-padding': 3, 'icon-allow-overlap': false,
    'symbol-sort-key': ['case', ['==', ['get', 'sourceType'], 'official'], 0, 1]
  },
  paint: {
    'icon-opacity': ['case', ['==', ['get', 'scoutDim'], 1], 0.28, 1],
    ...(named ? {
      'text-color': '#203242', 'text-halo-color': '#fffefa', 'text-halo-width': 1.85,
      'text-opacity': ['case', ['==', ['get', 'scoutDim'], 1], 0.28, 1]
    } : {})
  }
});

// Compute official barangay label points (centroid of each of the 59 barangay polygons)
function makeBarangayLabelPoints() {
  if (typeof cityBarangays === 'undefined' || !cityBarangays.features) return collection([]);
  return collection(cityBarangays.features.map(f => {
    const ring = f.geometry.type === 'Polygon' ? f.geometry.coordinates[0] : f.geometry.coordinates[0][0];
    let sx = 0, sy = 0;
    for (const [x, y] of ring) { sx += x; sy += y; }
    return point([sx / ring.length, sy / ring.length], { name: f.properties.name, psgc: f.properties.psgc });
  }));
}

const layer = (id, type, sourceLayer, paint, extra = {}) => ({
  id,
  type,
  source: 'base',
  'source-layer': sourceLayer,
  paint,
  ...extra
});

const labelLayout = (field, size = 11.5) => ({
  'text-field': ['get', field],
  'text-font': ['Noto Sans Regular'],
  'text-size': size
});

// Muted terrain and mapped roads beneath the building and property layers.
const style = {
  version: 8,
  glyphs: 'atlas://font/{fontstack}/{range}.pbf',
  light: {
    anchor: 'map',
    color: '#fffef9',
    position: [1.45, 58, 42],
    intensity: 0.48
  },
  sources: {
    base: {
      type: 'vector',
      tiles: ['atlas://{z}/{x}/{y}'],
      minzoom: 10,
      maxzoom: 14,
      attribution: '© <a href="https://openfreemap.org">OpenFreeMap</a> · <a href="https://openmaptiles.org">OpenMapTiles</a> · © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    },
    city: { type: 'geojson', data: cityBoundary },
    cityMask: { type: 'geojson', data: cityOutsideMask },
    barangays: { type: 'geojson', data: typeof cityBarangays !== 'undefined' ? cityBarangays : collection([]) },
    barangayLabels: { type: 'geojson', data: makeBarangayLabelPoints() },
    selectedBarangay: { type: 'geojson', data: collection([]) },
    communityPlaces: { type: 'geojson', data: makeCommunityGeoJSON() },
    communityClusters: {
      type: 'geojson',
      data: clusterData(makeCommunityGeoJSON(), makeOfficialGeoJSON()),
      cluster: true,
      clusterMaxZoom: 15,
      clusterRadius: 44
    },
    officialPlaces: { type: 'geojson', data: makeOfficialGeoJSON() },
    ...InvestorSites.sources,
    landmarkPoints: { type: 'geojson', data: makeLandmarkGeoJSON() },
    scoutCircles: { type: 'geojson', data: collection([]) },
    scoutCenters: { type: 'geojson', data: collection([]) },
    scoutConnector: { type: 'geojson', data: collection([]) },
    scoutConnectorMid: { type: 'geojson', data: collection([]) },
    hoveredBuilding: { type: 'geojson', data: collection([]) },
    selectedBuilding: { type: 'geojson', data: collection([]) },
    selectedPoint: { type: 'geojson', data: collection([]) }
  },
  layers: [
    // Land background
    { id: 'land', type: 'background', paint: { 'background-color': '#dfdfd5' } },

    // Natural & civic landcover / landuse anchored strictly to real OSM polygons
    layer('farmland', 'fill', 'landcover', {
      'fill-color': '#bbcaab',
      'fill-opacity': 0.50
    }, { filter: ['==', ['get', 'class'], 'farmland'] }),

    layer('woods', 'fill', 'landcover', {
      'fill-color': '#a6bfa4',
      'fill-opacity': 0.72
    }, { filter: ['==', ['get', 'class'], 'wood'] }),

    // OSM land use is contextual and separate from recorded property boundaries.
    layer('urban-commercial', 'fill', 'landuse', {
      'fill-color': '#d6d6cb',
      'fill-outline-color': '#d0d0c5',
      'fill-opacity': 0.56
    }, { filter: ['in', ['get', 'class'], ['literal', ['commercial', 'retail', 'industrial', 'residential']]] }),

    layer('campus-grounds', 'fill', 'landuse', {
      'fill-color': '#d5dbce',
      'fill-outline-color': '#bec7b9',
      'fill-opacity': 0.68
    }, { filter: ['in', ['get', 'class'], ['literal', ['school', 'college', 'university', 'hospital']]] }),

    // Warm sunlit La Union coastal sand beaches
    layer('beaches', 'fill', 'landcover', {
      'fill-color': '#e8dfc8',
      'fill-outline-color': '#d8cebc',
      'fill-opacity': 0.94
    }, { filter: ['==', ['get', 'class'], 'sand'] }),

    // Green parks, plazas & recreation pitches
    layer('grass-parks', 'fill', 'landcover', {
      'fill-color': '#b3c6a7',
      'fill-outline-color': '#c4d1b8'
    }, { filter: ['==', ['get', 'class'], 'grass'] }),

    layer('parks', 'fill', 'park', {
      'fill-color': '#a9c29e',
      'fill-opacity': 0.90
    }),

    layer('pitches', 'fill', 'landuse', {
      'fill-color': '#a2bb99',
      'fill-outline-color': '#c4d3bc',
      'fill-opacity': 0.94
    }, { filter: ['in', ['get', 'class'], ['literal', ['pitch', 'playground', 'track']]] }),

    // Coastal water and rivers
    layer('sea', 'fill', 'water', {
      'fill-color': '#afcbd2'
    }),
    layer('sea-shallow-rim', 'line', 'water', {
      'line-color': '#c0d8db',
      'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2.6, 14, 5.5, 17, 10.0],
      'line-opacity': 0.58
    }),
    layer('sea-shoreline', 'line', 'water', {
      'line-color': '#dbe7e3',
      'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.3, 15, 2.0, 18, 2.8],
      'line-opacity': 0.90
    }),
    layer('rivers', 'line', 'waterway', {
      'line-color': '#a2c3cb',
      'line-width': ['interpolate', ['exponential', 1.4], ['zoom'], 10, 1.2, 14, 3.4, 17, 7.8]
    }, { layout: { 'line-cap': 'round', 'line-join': 'round' } }),

    // Subtle outside-city veil emphasizing San Fernando at city scale
    {
      id: 'city-outside-mask',
      type: 'fill',
      source: 'cityMask',
      paint: {
        'fill-color': '#8c9692',
        'fill-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0.24, 13.0, 0.14, 15.0, 0.04]
      }
    },

    // Official 59-barangay overlay (toggleable via legend checkbox) + highlighted filtered barangay
    {
      id: 'barangay-lines',
      type: 'line',
      source: 'barangays',
      layout: { visibility: 'none' },
      paint: {
        'line-color': '#1e5078',
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.0, 14, 1.6, 17, 2.0],
        'line-dasharray': [3, 2.5],
        'line-opacity': 0.72
      }
    },
    {
      id: 'selected-barangay-fill',
      type: 'fill',
      source: 'selectedBarangay',
      paint: {
        'fill-color': '#f5a623',
        'fill-opacity': 0.10
      }
    },
    {
      id: 'selected-barangay-line',
      type: 'line',
      source: 'selectedBarangay',
      paint: {
        'line-color': '#b8532a',
        'line-width': 2.6,
        'line-dasharray': [4, 2]
      }
    },

    // San Fernando Airport (Poro Point): asphalt runway 01/19, taxiways, aprons & helipads
    layer('aeroway-ground', 'fill', 'aeroway', {
      'fill-color': '#adc1a7',
      'fill-opacity': 0.55
    }, { filter: ['all', ['==', ['geometry-type'], 'Polygon'], ['==', ['get', 'class'], 'aerodrome']] }),
    layer('aeroway-apron', 'fill', 'aeroway', {
      'fill-color': '#c9cbc5',
      'fill-outline-color': '#e7eff7'
    }, { filter: ['all', ['==', ['geometry-type'], 'Polygon'], ['in', ['get', 'class'], ['literal', ['apron', 'helipad']]]] }),
    layer('aeroway-taxiway', 'line', 'aeroway', {
      'line-color': '#495563',
      'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 11, 1.2, 14, 4.5, 17, 14]
    }, { filter: ['all', ['==', ['geometry-type'], 'LineString'], ['==', ['get', 'class'], 'taxiway']] }),
    layer('aeroway-taxiway-center', 'line', 'aeroway', {
      'line-color': '#ebb938',
      'line-width': ['interpolate', ['linear'], ['zoom'], 13, 0.6, 16, 1.4]
    }, { minzoom: 13, filter: ['all', ['==', ['geometry-type'], 'LineString'], ['==', ['get', 'class'], 'taxiway']] }),
    layer('aeroway-runway-casing', 'line', 'aeroway', {
      'line-color': '#dfe8f2',
      'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 11, 3.2, 14, 11.5, 17, 36]
    }, { filter: ['all', ['==', ['geometry-type'], 'LineString'], ['==', ['get', 'class'], 'runway']] }),
    layer('aeroway-runway', 'line', 'aeroway', {
      'line-color': '#384350',
      'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 11, 2.4, 14, 9.5, 17, 30]
    }, { filter: ['all', ['==', ['geometry-type'], 'LineString'], ['==', ['get', 'class'], 'runway']] }),
    layer('aeroway-runway-center', 'line', 'aeroway', {
      'line-color': '#ffffff',
      'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.8, 16, 2.2],
      'line-dasharray': [3.5, 3.0]
    }, { minzoom: 12, filter: ['all', ['==', ['geometry-type'], 'LineString'], ['==', ['get', 'class'], 'runway']] }),

    // =========================================================================
    // Mapped roads — crisp colored asphalt hierarchy, center stripes & sidewalks
    // =========================================================================

    layer('roads-sidewalk-minor', 'line', 'transportation', {
      'line-color': '#e2dfd5',
      'line-width': ['interpolate', ['exponential', 1.55], ['zoom'],
        13.2, 1.3,
        15, ['match', ['get', 'class'], ['service', 'path', 'track'], 2.4, 5.4],
        17, ['match', ['get', 'class'], ['service', 'path', 'track'], 5.4, 12.6],
        19, ['match', ['get', 'class'], ['service', 'path', 'track'], 12.2, 27.5]
      ]
    }, {
      minzoom: 13.2,
      filter: ['all',
        ['==', ['geometry-type'], 'LineString'],
        ['!', ['in', ['get', 'class'], ['literal', ['trunk', 'primary', 'secondary', 'tertiary', 'motorway', 'pier']]]]
      ],
      layout: { 'line-cap': 'round', 'line-join': 'round' }
    }),

    layer('roads-sidewalk-major', 'line', 'transportation', {
      'line-color': '#ece8dc',
      'line-width': ['interpolate', ['exponential', 1.55], ['zoom'],
        10, ['match', ['get', 'class'], ['trunk', 'primary', 'motorway'], 3.5, ['secondary'], 2.4, 1.4],
        14, ['match', ['get', 'class'], ['trunk', 'primary', 'motorway'], 9.2, ['secondary'], 7.0, 5.6],
        16, ['match', ['get', 'class'], ['trunk', 'primary', 'motorway'], 20.6, ['secondary'], 16.0, 12.8],
        19, ['match', ['get', 'class'], ['trunk', 'primary', 'motorway'], 50.0, ['secondary'], 38.5, 31.5]
      ]
    }, {
      filter: ['all',
        ['==', ['geometry-type'], 'LineString'],
        ['in', ['get', 'class'], ['literal', ['trunk', 'primary', 'secondary', 'tertiary', 'motorway']]]
      ],
      layout: { 'line-cap': 'round', 'line-join': 'round' }
    }),

    layer('roads-bridge-parapet', 'line', 'transportation', {
      'line-color': '#f5f9fd',
      'line-width': ['interpolate', ['exponential', 1.55], ['zoom'], 12, 3.0, 15, 11.5, 18, 32.0]
    }, {
      filter: ['all', ['==', ['geometry-type'], 'LineString'], ['==', ['get', 'brunnel'], 'bridge']],
      layout: { 'line-cap': 'butt', 'line-join': 'miter' }
    }),

    layer('roads-surface-path', 'line', 'transportation', {
      'line-color': '#b2aea2',
      'line-dasharray': [2.2, 1.4],
      'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 14.0, 0.7, 16, 2.1, 19, 6.2]
    }, {
      minzoom: 14.0,
      filter: ['all', ['==', ['geometry-type'], 'LineString'], ['in', ['get', 'class'], ['literal', ['path', 'track']]]],
      layout: { 'line-cap': 'round', 'line-join': 'round' }
    }),

    layer('roads-surface-service', 'line', 'transportation', {
      'line-color': '#a6acb3',
      'line-width': ['interpolate', ['exponential', 1.55], ['zoom'], 13.8, 0.85, 15.5, 2.3, 17, 4.8, 19, 10.5]
    }, {
      minzoom: 13.8,
      filter: ['all', ['==', ['geometry-type'], 'LineString'], ['==', ['get', 'class'], 'service']],
      layout: { 'line-cap': 'round', 'line-join': 'round' }
    }),

    layer('roads-surface-minor', 'line', 'transportation', {
      'line-color': '#8c949d',
      'line-width': ['interpolate', ['exponential', 1.55], ['zoom'], 12.8, 0.9, 14, 2.4, 16, 5.5, 19, 18.2]
    }, {
      minzoom: 12.8,
      filter: ['all',
        ['==', ['geometry-type'], 'LineString'],
        ['!', ['in', ['get', 'class'], ['literal', ['trunk', 'primary', 'secondary', 'tertiary', 'motorway', 'pier', 'service', 'path', 'track']]]]
      ],
      layout: { 'line-cap': 'round', 'line-join': 'round' }
    }),

    layer('roads-surface-tertiary', 'line', 'transportation', {
      'line-color': '#717a84',
      'line-width': ['interpolate', ['exponential', 1.55], ['zoom'], 11.2, 1.0, 14, 3.8, 16, 9.0, 19, 23.0]
    }, {
      minzoom: 11.2,
      filter: ['all', ['==', ['geometry-type'], 'LineString'], ['==', ['get', 'class'], 'tertiary']],
      layout: { 'line-cap': 'round', 'line-join': 'round' }
    }),

    layer('roads-surface-secondary', 'line', 'transportation', {
      'line-color': '#5d6671',
      'line-width': ['interpolate', ['exponential', 1.55], ['zoom'], 10, 1.6, 14, 5.2, 16, 11.8, 19, 29.0]
    }, {
      filter: ['all', ['==', ['geometry-type'], 'LineString'], ['==', ['get', 'class'], 'secondary']],
      layout: { 'line-cap': 'round', 'line-join': 'round' }
    }),

    layer('roads-surface-major', 'line', 'transportation', {
      'line-color': '#4b545f',
      'line-width': ['interpolate', ['exponential', 1.55], ['zoom'], 10, 2.5, 14, 7.0, 16, 15.8, 19, 39.0]
    }, {
      filter: ['all',
        ['==', ['geometry-type'], 'LineString'],
        ['in', ['get', 'class'], ['literal', ['trunk', 'primary', 'motorway']]]
      ],
      layout: { 'line-cap': 'round', 'line-join': 'round' }
    }),

    layer('roads-center-secondary', 'line', 'transportation', {
      'line-color': '#e6e3d8',
      'line-opacity': ['interpolate', ['linear'], ['zoom'], 14.2, 0.35, 16, 0.72],
      'line-dasharray': [2.8, 2.8],
      'line-width': ['interpolate', ['linear'], ['zoom'], 14.2, 0.65, 17, 1.35]
    }, {
      minzoom: 14.2,
      filter: ['all', ['==', ['geometry-type'], 'LineString'], ['in', ['get', 'class'], ['literal', ['secondary', 'tertiary']]]],
      layout: { 'line-cap': 'butt', 'line-join': 'round' }
    }),

    layer('roads-center-major', 'line', 'transportation', {
      'line-color': '#e8b951',
      'line-opacity': ['interpolate', ['linear'], ['zoom'], 12.5, 0.45, 15.5, 0.88],
      'line-dasharray': [3.4, 2.2],
      'line-width': ['interpolate', ['linear'], ['zoom'], 12.5, 0.75, 16, 1.65, 19, 3.0]
    }, {
      minzoom: 12.5,
      filter: ['all', ['==', ['geometry-type'], 'LineString'], ['in', ['get', 'class'], ['literal', ['trunk', 'primary', 'motorway']]]],
      layout: { 'line-cap': 'butt', 'line-join': 'round' }
    }),

    layer('piers-casing', 'line', 'transportation', {
      'line-color': '#2c4c73',
      'line-width': ['interpolate', ['exponential', 1.4], ['zoom'], 12, 2.2, 15, 6.4, 18, 15.5]
    }, { filter: ['all', ['==', ['geometry-type'], 'LineString'], ['==', ['get', 'class'], 'pier']] }),
    layer('piers', 'line', 'transportation', {
      'line-color': '#d7e2ec',
      'line-width': ['interpolate', ['exponential', 1.4], ['zoom'], 12, 1.3, 15, 4.6, 18, 12.0]
    }, { filter: ['all', ['==', ['geometry-type'], 'LineString'], ['==', ['get', 'class'], 'pier']] }),

    // City of San Fernando official boundary (PSGC 103314000)
    {
      id: 'limits-halo',
      type: 'line',
      source: 'city',
      paint: {
        'line-color': '#eef7ff',
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 5.4, 14, 4.2],
        'line-opacity': 0.78
      }
    },
    {
      id: 'limits',
      type: 'line',
      source: 'city',
      paint: {
        'line-color': '#183e63',
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2.8, 14, 2.1],
        'line-dasharray': [4.5, 2.8]
      }
    },

    ...InvestorSites.groundLayers,
    // Neighborhood massing. WebGL footprints take over at zoom 14.
    layer('shade-mid', 'fill', 'building', {
      'fill-color': '#72746c', 'fill-opacity': 0.13,
      'fill-translate': [-1.2, 1.4], 'fill-translate-anchor': 'map'
    }, { minzoom: 13.5, maxzoom: 14 }),
    layer('buildings-outline', 'line', 'building', {
      'line-color': '#8d8d81', 'line-width': 0.65, 'line-opacity': 0.5
    }, { minzoom: 13.5, maxzoom: 14 }),
    layer('buildings-mid', 'fill-extrusion', 'building', {
      'fill-extrusion-color': '#e5e1d5',
      'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
      'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 5],
      'fill-extrusion-vertical-gradient': true
    }, { minzoom: 13.5, maxzoom: 14 }),

    // Market Scout radius comparison circles (Site A: solid navy ring; Site B: dashed terracotta ring — non-color-dependent!)
    {
      id: 'scout-circle-a-fill',
      type: 'fill',
      source: 'scoutCircles',
      filter: ['==', ['get', 'site'], 'A'],
      paint: { 'fill-color': '#123352', 'fill-opacity': 0.08 }
    },
    {
      id: 'scout-circle-b-fill',
      type: 'fill',
      source: 'scoutCircles',
      filter: ['==', ['get', 'site'], 'B'],
      paint: { 'fill-color': '#b84a20', 'fill-opacity': 0.08 }
    },
    {
      id: 'scout-circle-a-halo',
      type: 'line',
      source: 'scoutCircles',
      filter: ['==', ['get', 'site'], 'A'],
      paint: { 'line-color': '#ffffff', 'line-width': 5.0, 'line-opacity': 0.80 }
    },
    {
      id: 'scout-circle-a-line',
      type: 'line',
      source: 'scoutCircles',
      filter: ['==', ['get', 'site'], 'A'],
      paint: { 'line-color': '#123352', 'line-width': 2.8, 'line-opacity': 0.95 }
    },
    {
      id: 'scout-circle-b-halo',
      type: 'line',
      source: 'scoutCircles',
      filter: ['==', ['get', 'site'], 'B'],
      paint: { 'line-color': '#ffffff', 'line-width': 5.2, 'line-opacity': 0.84 }
    },
    {
      id: 'scout-circle-b-line',
      type: 'line',
      source: 'scoutCircles',
      filter: ['==', ['get', 'site'], 'B'],
      paint: {
        'line-color': '#b84a20',
        'line-width': 2.8,
        'line-dasharray': [3.4, 2.1],
        'line-opacity': 0.96
      }
    },
    // Measurement connector line joining Site A <-> Site B
    {
      id: 'scout-connector-halo',
      type: 'line',
      source: 'scoutConnector',
      paint: { 'line-color': 'rgba(255,255,255,0.88)', 'line-width': 4.4 }
    },
    {
      id: 'scout-connector-line',
      type: 'line',
      source: 'scoutConnector',
      paint: {
        'line-color': ['case', ['==', ['get', 'overlapping'], true], '#9a5a0c', '#1c4466'],
        'line-width': 2.1,
        'line-dasharray': [2.4, 2.0]
      }
    },

    // Hovered building ground footprint feedback
    {
      id: 'hovered-building-fill',
      type: 'fill',
      source: 'hoveredBuilding',
      paint: { 'fill-color': '#69747b', 'fill-opacity': 0.06 }
    },
    {
      id: 'hovered-building-line',
      type: 'line',
      source: 'hoveredBuilding',
      paint: { 'line-color': '#677078', 'line-width': 1.0, 'line-opacity': 0.8 },
      layout: { 'line-join': 'round', 'line-cap': 'round' }
    },

    // Selected building ground highlight (cleanly visible in Top View, neighborhood zoom, and around 3D base)
    {
      id: 'selected-building-fill',
      type: 'fill',
      source: 'selectedBuilding',
      paint: { 'fill-color': '#11224D', 'fill-opacity': 0.05 }
    },
    {
      id: 'selected-building-casing',
      type: 'line',
      source: 'selectedBuilding',
      paint: { 'line-color': '#fffcf3', 'line-width': 3.2, 'line-opacity': 0.85 },
      layout: { 'line-join': 'round', 'line-cap': 'round' }
    },
    {
      id: 'selected-building-line',
      type: 'line',
      source: 'selectedBuilding',
      paint: { 'line-color': '#11224D', 'line-width': 1.6 },
      layout: { 'line-join': 'round', 'line-cap': 'round' }
    },

    // =========================================================================
    // LABELS & MARKERS (Deduplicated, collision-aware, selected-place prioritized)
    // =========================================================================

    layer('water-labels', 'symbol', 'water_name', {
      'text-color': '#526d77',
      'text-halo-color': '#d2e2e4',
      'text-halo-width': 1.3
    }, {
      minzoom: 10,
      layout: { ...labelLayout('name', 12), 'text-letter-spacing': 0.12 }
    }),

    {
      id: 'barangay-names',
      type: 'symbol',
      source: 'barangayLabels',
      layout: {
        visibility: 'none',
        ...labelLayout('name', ['interpolate', ['linear'], ['zoom'], 11, 10.2, 14, 11.4]),
        'text-max-width': 9,
        'text-padding': 6
      },
      paint: {
        'text-color': '#123d60',
        'text-halo-color': 'rgba(255,253,245,0.95)',
        'text-halo-width': 1.8
      }
    },

    layer('place-labels', 'symbol', 'place', {
      'text-color': '#163858',
      'text-halo-color': 'rgba(246,251,255,0.94)',
      'text-halo-width': 1.7
    }, {
      minzoom: 10.2,
      maxzoom: 15.2,
      filter: ['in', ['get', 'class'], ['literal', ['city', 'town', 'village', 'suburb', 'quarter', 'neighbourhood']]],
      layout: {
        ...labelLayout('name', ['match', ['get', 'class'], 'city', 13.5, ['quarter', 'village'], 11.4, 10.6]),
        'text-max-width': 9,
        'text-padding': 7,
        'symbol-sort-key': ['match', ['get', 'class'], 'city', 1, 'quarter', 2, 'village', 3, 4]
      }
    }),

    layer('streetnames-major', 'symbol', 'transportation_name', {
      'text-color': '#fbfaf4',
      'text-halo-color': '#323a44',
      'text-halo-width': 2.0
    }, {
      minzoom: 13.8,
      filter: ['in', ['get', 'class'], ['literal', ['trunk', 'primary', 'secondary', 'tertiary', 'motorway']]],
      layout: {
        ...labelLayout('name', ['interpolate', ['linear'], ['zoom'], 13.8, 10.0, 16.5, 11.2]),
        'symbol-placement': 'line',
        'text-padding': 10,
        'text-letter-spacing': 0.04
      }
    }),

    layer('streetnames-minor', 'symbol', 'transportation_name', {
      'text-color': '#26303a',
      'text-halo-color': '#f9f8f2',
      'text-halo-width': 1.9
    }, {
      minzoom: 15.0,
      filter: ['!', ['in', ['get', 'class'], ['literal', ['trunk', 'primary', 'secondary', 'tertiary', 'motorway']]]],
      layout: {
        ...labelLayout('name', 10.2),
        'symbol-placement': 'line',
        'text-padding': 10,
        'text-letter-spacing': 0.03
      }
    }),

    {
      id: 'landmark-dots',
      type: 'circle',
      source: 'landmarkPoints',
      minzoom: 11,
      maxzoom: 15,
      paint: {
        'circle-color': '#fffcf2',
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 2.5, 14.4, 3.5],
        'circle-opacity': ['interpolate', ['linear'], ['zoom'], 14.2, 0.92, 14.9, 0.0],
        'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 14.2, 2.0, 14.9, 0.0],
        'circle-stroke-color': '#1b476e'
      }
    },

    // One neighborhood cluster per group of visible records across both data sources.
    {
      id: 'community-cluster-circles', type: 'circle', source: 'communityClusters',
      minzoom: 12.6, maxzoom: 15.5, filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#315F61', 'circle-radius': ['step', ['get', 'point_count'], 11, 15, 14, 45, 17],
        'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.8
      }
    },
    {
      id: 'community-cluster-count', type: 'symbol', source: 'communityClusters',
      minzoom: 12.6, maxzoom: 15.5, filter: ['has', 'point_count'],
      layout: { ...labelLayout('point_count_abbreviated', 11), 'text-allow-overlap': true },
      paint: { 'text-color': '#ffffff' }
    },
    businessSymbols('business-singles', 'communityClusters', ['!', ['has', 'point_count']], 12.6, 15.5),
    ...['community', 'official'].flatMap(source => {
      const filter = source === 'community' ? ['!=', ['get', 'suppressedByLandmark'], true] : ['has', 'uid'];
      return [
        businessSymbols(source + '-dots', source + 'Places', filter, 15.5, 17),
        businessSymbols(source + '-names', source + 'Places', filter, 17, 24, true)
      ];
    }),

    // On-map Market Scout target category & selected partner highlight halos (make active matches pop!)
    {
      id: 'scout-partner-ring',
      type: 'circle',
      source: 'communityPlaces',
      minzoom: 13.4,
      filter: ['==', ['get', 'scoutRole'], 1],
      paint: {
        'circle-color': 'rgba(31, 116, 88, 0.24)',
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 13.4, 5.5, 16.5, 8.2],
        'circle-stroke-width': 2.0,
        'circle-stroke-color': '#1f7458'
      }
    },
    {
      id: 'scout-match-ring',
      type: 'circle',
      source: 'communityPlaces',
      minzoom: 12.8,
      filter: ['==', ['get', 'scoutRole'], 2],
      paint: {
        'circle-color': 'rgba(246, 177, 50, 0.38)',
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 12.8, 7.5, 16.5, 10.8],
        'circle-stroke-width': 2.6,
        'circle-stroke-color': '#123352'
      }
    },
    {
      id: 'scout-match-ring-official',
      type: 'circle',
      source: 'officialPlaces',
      minzoom: 12.6,
      filter: ['>=', ['get', 'scoutRole'], 1],
      paint: {
        'circle-color': 'rgba(246, 177, 50, 0.42)',
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 12.6, 8.2, 16.5, 11.4],
        'circle-stroke-width': 2.6,
        'circle-stroke-color': '#9a3712'
      }
    },
    {
      id: 'scout-match-labels',
      type: 'symbol',
      source: 'communityPlaces',
      minzoom: 14.0,
      filter: ['==', ['get', 'scoutRole'], 2],
      layout: {
        ...labelLayout('name', 11.0),
        'text-offset': [0, 1.15],
        'text-anchor': 'top',
        'text-max-width': 11,
        'text-padding': 4,
        'text-allow-overlap': false
      },
      paint: {
        'text-color': '#0f2a44',
        'text-halo-color': '#fff6db',
        'text-halo-width': 2.2
      }
    },

    {
      id: 'landmark-labels',
      type: 'symbol',
      source: 'landmarkPoints',
      minzoom: 11,
      layout: {
        ...labelLayout('shortName', ['interpolate', ['linear'], ['zoom'], 11, 11, 16, 13]),
        'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
        'text-radial-offset': 0.9,
        'symbol-sort-key': ['match', ['get', 'shortName'], 'City Hall', 0, 'Cathedral', 1, 'Public Market', 2, 3],
        'text-max-width': 11,
        'text-padding': 5
      },
      paint: {
        'text-color': '#14324d',
        'text-halo-color': 'rgba(255,255,255,0.96)',
        'text-halo-width': 2.0
      }
    },

    // Midpoint distance pill between Site A & Site B
    {
      id: 'scout-connector-label',
      type: 'symbol',
      source: 'scoutConnectorMid',
      layout: {
        'text-field': ['get', 'label'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 11.0,
        'text-allow-overlap': true,
        'text-ignore-placement': true
      },
      paint: {
        'text-color': ['case', ['==', ['get', 'overlapping'], true], '#7e4706', '#123352'],
        'text-halo-color': 'rgba(255,255,255,0.98)',
        'text-halo-width': 2.4
      }
    },

    // Site A (solid navy circle) & Site B (dashed terracotta square) badges
    {
      id: 'scout-centers',
      type: 'symbol',
      source: 'scoutCenters',
      layout: {
        'icon-image': ['get', 'icon'],
        'icon-size': 0.68,
        'icon-anchor': 'bottom',
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'text-field': ['get', 'label'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 11.4,
        'text-offset': [0, 0.24],
        'text-anchor': 'top',
        'text-allow-overlap': true,
        'text-ignore-placement': true
      },
      paint: {
        'text-color': ['match', ['get', 'site'], 'B', '#7f2d0f', '#0f2a44'],
        'text-halo-color': 'rgba(255,255,255,0.97)',
        'text-halo-width': 2.2
      }
    },

    ...InvestorSites.pinLayers,
    {
      id: 'selected-halo',
      type: 'circle',
      source: 'selectedPoint',
      filter: ['==', ['get', 'showRing'], true],
      paint: {
        'circle-color': 'rgba(245, 166, 35, 0.20)',
        'circle-radius': 13,
        'circle-stroke-width': 2.8,
        'circle-stroke-color': '#123352'
      }
    },

    {
      id: 'selected-label',
      type: 'symbol',
      source: 'selectedPoint',
      filter: ['!=', ['get', 'label'], ''],
      layout: {
        'text-field': ['get', 'label'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 12.2,
        'text-offset': [0, 1.15],
        'text-anchor': 'top',
        'text-max-width': 14,
        'text-allow-overlap': false
      },
      paint: {
        'text-color': '#0f2a44',
        'text-halo-color': '#fffbf0',
        'text-halo-width': 2.6
      }
    }
  ]
};

const cityHall = VERIFIED_LANDMARKS.find(landmark => landmark.id === 'sf-city-hall');
const initialView = cityMapEmbed.enabled
  ? {
    center: [cityHall.lng, cityHall.lat],
    zoom: window.innerWidth > 760 ? 18.1 : cityHall.zoom,
    pitch: cityHall.pitch,
    bearing: cityHall.bearing
  }
  : DOWNTOWN_VIEW;

const mapUrlParams = new URLSearchParams(location.search);
const mapUrlLat = Number(mapUrlParams.get('lat'));
const mapUrlLng = Number(mapUrlParams.get('lng'));
const hasUrlCoords = mapUrlParams.has('lat') && mapUrlParams.has('lng')
  && Number.isFinite(mapUrlLat) && Number.isFinite(mapUrlLng)
  && Math.abs(mapUrlLat) <= 90 && Math.abs(mapUrlLng) <= 180
  && !(mapUrlLat === 0 && mapUrlLng === 0);
const isOpportunitiesEmbed = document.documentElement.dataset.mapMode === 'opportunities' || mapUrlParams.get('mode') === 'opportunities';
const isPropertyDetailEmbed = isOpportunitiesEmbed || document.documentElement.dataset.mapMode === 'property' || mapUrlParams.get('mode') === 'property';
const initialEmbedRadius = Number(mapUrlParams.get('radius')) || 500;
if (isOpportunitiesEmbed) document.documentElement.dataset.mapContext = 'opportunities';
if (isPropertyDetailEmbed) document.documentElement.dataset.mapMode = 'property';

const oppInitialZoom = initialEmbedRadius <= 350 ? 16.4 : initialEmbedRadius <= 650 ? 15.8 : 14.9;
const map = new maplibregl.Map({
  container: 'map',
  antialias: true,
  style,
  ...(hasUrlCoords
    ? (isOpportunitiesEmbed
      ? { center: [mapUrlLng, mapUrlLat], zoom: oppInitialZoom, pitch: 50, bearing: -20 }
      : { center: [mapUrlLng, mapUrlLat], zoom: 17.4, pitch: 58, bearing: -24 })
    : initialView),
  minZoom: 10,
  maxZoom: 19,
  maxPitch: 60,
  maxBounds: [[120.245, 16.52], [120.46, 16.70]],
  cooperativeGestures: cityMapEmbed.enabled && !isPropertyDetailEmbed,
  attributionControl: { compact: true }
});

if (cityMapEmbed.enabled) {
  if (isPropertyDetailEmbed) map.once('style.load', cityMapEmbed.ready);
  map.once('load', cityMapEmbed.ready);
  map.once('webglcontextlost', cityMapEmbed.unavailable);
}

map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
map.addControl(new maplibregl.ScaleControl({ maxWidth: 96, unit: 'metric' }), 'bottom-left');
const bottomLeftCtrl = document.querySelector('.maplibregl-ctrl-bottom-left');
if (bottomLeftCtrl && byId('map-position')) bottomLeftCtrl.append(byId('map-position'));
function syncMobileAttribution() {
  const attrib = document.querySelector('.maplibregl-ctrl-attrib');
  if (!attrib) return;
  if (window.innerWidth <= 760) {
    attrib.classList.add('maplibregl-compact');
    attrib.classList.remove('maplibregl-compact-show');
  } else {
    attrib.classList.remove('maplibregl-compact', 'maplibregl-compact-show');
  }
}
map.on('resize', syncMobileAttribution);
requestAnimationFrame(syncMobileAttribution);

const cityBuildings3DLayer = createCityBuildingsLayer({
  id: 'locus-3d-city-buildings',
  tiles,
  boundaryFeature: cityBoundary,
  barangaysFeatureCollection: typeof cityBarangays !== 'undefined' ? cityBarangays : null,
  minZoom: 14.0
});
const landmark3DLayer = createLandmarkLayer({ id: 'locus-3d-landmarks', visible: true, meshHitDepth: cityBuildings3DLayer.meshHitDepth });
const livingCityLayer = typeof createLivingCityLayer === 'function'
  ? createLivingCityLayer({ id: 'locus-3d-living-city', visible: true })
  : null;

// Connect strict footprint matcher, coverage classifier & verified category archetype resolver to Registry
registry.setBuildingMatcher(cityBuildings3DLayer);
cityBuildings3DLayer.setCoverageClassifier(bId => registry.classifyBuildingCoverage(bId));

// Initialize optional Market Scout spatial comparison engine (reuses real directory, official layer & 59 barangays)
scout = LocusMarketScout.createMarketScout({ registry, buildingsLayer: cityBuildings3DLayer });
let inspectionVersion = 0;
let savedResultsScrollTop = 0;
function clearInspection() {
  inspectionVersion++;
  selectedUid = null;
  selectedLandmarkId = null;
  highlightBuilding(null);
  updateSelectedPoint(null, null);
  activePopup?.remove();
  byId('detail').replaceChildren();
  investorSites.markBusiness(null);
  for (const row of byId('results').querySelectorAll('.row.selected')) row.classList.remove('selected');
  const ep = byId('explore-panel');
  if (ep && ep.classList.contains('detail-open')) {
    ep.classList.remove('detail-open');
    requestAnimationFrame(() => {
      const resEl = byId('results');
      if (resEl) resEl.scrollTop = savedResultsScrollTop;
    });
  }
  updateSheetSummary();
}
const investorSites = InvestorSites.create({
  map, scout, selectBusiness: selectRecord, clearInspection, isSourceVisible: businessSourceVisible,
  lookupRecord: uid => registry.getRecordByUid(uid),
  onOpen: () => {
    if (uiWorkspace !== 'explore') setWorkspace('explore', { keepCamera: true });
    if (window.innerWidth <= 760) setMobileSheetCollapsed(false);
  },
  onLiveOpen: () => {
    stopAutoOrbit();
    const hidden = isFullscreenMap ? !document.body.classList.contains('fs-show-panel') : isPanelHidden;
    if (!hidden && window.innerWidth <= 940) setPanelHidden(true);
  },
  showLivePopup: (anchor, content, hasPin, moveFocus) => {
    activePopup?.remove();
    const compactH = map.getContainer().clientHeight < 460;
    activePopup = new maplibregl.Popup({
      className: 'live-property-map-popup', maxWidth: compactH ? 'min(256px, calc(100vw - 24px))' : 'min(274px, calc(100vw - 30px))',
      anchor: compactH ? 'bottom' : (map.getContainer().clientWidth <= 940 ? 'top' : undefined),
      offset: compactH ? (hasPin ? 28 : 12) : (hasPin ? 24 : 10), focusAfterOpen: moveFocus
    }).setLngLat(anchor).setDOMContent(content).addTo(map);
    if (moveFocus) activePopup.once('close', () => {
      if (document.activeElement === document.body) byId('live-properties-toggle').focus({ preventScroll: true });
    });
  }
});

let reindexTimer = null;
let bgIndexDone = false;
function scheduleFootprintSync(rebuildGPU = false) {
  if (reindexTimer) clearTimeout(reindexTimer);
  reindexTimer = setTimeout(() => {
    reindexTimer = null;
    registry.rebuildFootprintIndex();
    syncMapDataSources();
    if (rebuildGPU) cityBuildings3DLayer.refreshBuildingStyles();
    populateBarangayDropdown();
    renderJumpList();
    updateCountsUI();
    showResults();
    if (uiWorkspace === 'scout') renderScoutPanel();
  }, rebuildGPU ? 80 : 350);
}
// Once background indexing completes, re-sync automatically if a new tile is ever decoded on demand
cityBuildings3DLayer.setOnTileIndexed(() => {
  if (bgIndexDone) scheduleFootprintSync(true);
});

function syncScoutMapLayers() {
  if (!scout) return;
  const geo = scout.makeMapGeoJSON();
  const cSrc = map.getSource('scoutCircles');
  if (cSrc) cSrc.setData(geo.circles);
  const pSrc = map.getSource('scoutCenters');
  if (pSrc) pSrc.setData(geo.centers);
  const lSrc = map.getSource('scoutConnector');
  if (lSrc) lSrc.setData(geo.connector);
  const mSrc = map.getSource('scoutConnectorMid');
  if (mSrc) mSrc.setData(geo.connectorMid);

  // Soften neighborhood place clusters while actively comparing Site A/B so circles & site badges stay crisp
  const st = scout.getState();
  const comparing = Boolean(st.active && (st.siteA || st.siteB));
  if (map.getLayer('community-cluster-circles')) {
    map.setPaintProperty('community-cluster-circles', 'circle-opacity', comparing ? 0.34 : 0.88);
    map.setPaintProperty('community-cluster-circles', 'circle-stroke-opacity', comparing ? 0.42 : 0.96);
  }
  if (map.getLayer('community-cluster-count')) {
    map.setPaintProperty('community-cluster-count', 'text-opacity', comparing ? 0.46 : 1.0);
  }
}

function syncMapDataSources() {
  const commData = makeCommunityGeoJSON();
  const offData = makeOfficialGeoJSON();
  const commSrc = map.getSource('communityPlaces');
  if (commSrc) commSrc.setData(commData);
  const clustSrc = map.getSource('communityClusters');
  if (clustSrc) clustSrc.setData(clusterData(commData, offData));
  const offSrc = map.getSource('officialPlaces');
  if (offSrc) offSrc.setData(offData);
  syncScoutMapLayers();
  investorSites.refresh();
}

map.on('style.load', () => {
  InvestorSites.registerIcons(map);
  if (scout) scout.registerScoutIcons(map);

  if (cityBuildings3DLayer.isSupported() && !map.getLayer('locus-3d-city-buildings')) {
    map.addLayer(cityBuildings3DLayer, 'water-labels');
  } else {
    if (map.getLayer('buildings-mid')) map.setLayerZoomRange('buildings-mid', 13.5, 24);
  }
  if (!map.getLayer('locus-3d-landmarks')) {
    map.addLayer(landmark3DLayer, 'water-labels');
  }
  if (livingCityLayer && !map.getLayer('locus-3d-living-city')) {
    map.addLayer(livingCityLayer, 'water-labels');
  }

  syncMapDataSources();
  if (cityMapEmbed.enabled) setLightingMode(lightingMode, { immediate: true });
  else applyLightingFrame(0, 0);
  updateCountsUI();

  cityBuildings3DLayer.startBackgroundIndexing(() => {
    bgIndexDone = true;
    scheduleFootprintSync(true);
  });
});

// DOM helpers
function el(tag, text, className) {
  const n = document.createElement(tag);
  if (text !== undefined && text !== null) n.textContent = text;
  if (className) n.className = className;
  return n;
}

function setStatus(msg) {
  byId('status').textContent = msg || '';
}

function isInspectorSheetOpen() {
  if (document.body.classList.contains('panel-hidden')) return false;
  if (document.body.classList.contains('map-fullscreen') && !document.body.classList.contains('fs-show-panel')) return false;
  if (window.innerWidth <= 760 && mobileSheetState === 'collapsed') return false;
  return true;
}

let openPanelOnFullscreen = false;

function openInspectorFromPopup(lng, lat) {
  if (activePopup) { activePopup.remove(); activePopup = null; }
  if (isPropertyDetailEmbed && !isFullscreenMap && cityMapEmbed.hasParent) {
    openPanelOnFullscreen = true;
    setFullscreenMap(true);
    return;
  }
  setPanelHidden(false);
  if (Number.isFinite(lng) && Number.isFinite(lat)) {
    map.easeTo({ center: [lng, lat], padding: getMobileMapPadding(), duration: 360, easing: SMOOTH_EASE });
  }
}

function showRichCardPopup(lng, lat, { kicker = '', badge = '', title = '', subtitle = '', metaLines = [], statText = '', actionLabel = '', onAction = null, offset = 16 } = {}) {
  if (activePopup) { activePopup.remove(); activePopup = null; }
  if (window.innerWidth <= 760 && isInspectorSheetOpen()) return;
  const compactH = map.getContainer().clientHeight < 460;
  const wrap = el('div', '', 'live-property-popup locus-rich-popup' + (compactH ? ' is-compact' : ''));
  if (kicker || badge) {
    const head = el('div', '', 'locus-popup-head');
    if (kicker) head.append(el('span', kicker, 'live-property-popup-kicker'));
    if (badge) head.append(el('span', badge, 'locus-popup-pill'));
    wrap.append(head);
  }
  if (title) wrap.append(el('strong', title, 'live-property-popup-title'));
  if (subtitle) wrap.append(el('span', subtitle, 'live-property-popup-meta'));
  for (const line of metaLines) {
    if (line) wrap.append(el('span', line, 'locus-popup-meta-line'));
  }
  if (statText) wrap.append(el('span', statText, 'locus-popup-stat'));
  if (actionLabel && typeof onAction === 'function') {
    const btn = el('button', actionLabel, 'popup-detail-btn locus-popup-action');
    btn.type = 'button';
    btn.onclick = onAction;
    wrap.append(btn);
  }
  activePopup = new maplibregl.Popup({
    className: 'live-property-map-popup',
    maxWidth: compactH ? 'min(256px, calc(100vw - 24px))' : 'min(268px, calc(100vw - 26px))',
    anchor: compactH ? 'bottom' : undefined,
    offset: compactH ? Math.min(18, offset) : offset
  }).setLngLat([lng, lat]).setDOMContent(wrap).addTo(map);
}

function showPopup(lng, lat, title, subtitle, offset = 10, showOpenDetails = false) {
  if (activePopup) { activePopup.remove(); activePopup = null; }
  // On compact viewports, avoid stacking a duplicate callout over the 3D landmark
  // when the bottom details sheet is already visibly open for that selection.
  if (window.innerWidth <= 760 && isInspectorSheetOpen()) return;
  const wrap = document.createElement('div');
  wrap.append(el('div', title, 'popup-title'));
  if (subtitle) wrap.append(el('div', subtitle, 'popup-sub'));
  const compactMode = !isInspectorSheetOpen();
  if (showOpenDetails && compactMode) {
    const btn = el('button', isPropertyDetailEmbed && !isFullscreenMap ? 'Full 3D details →' : 'View details →', 'popup-detail-btn');
    btn.type = 'button';
    btn.onclick = () => openInspectorFromPopup(lng, lat);
    wrap.append(btn);
  }
  activePopup = new maplibregl.Popup({ offset })
    .setLngLat([lng, lat])
    .setDOMContent(wrap)
    .addTo(map);
}

function updateSelectedPoint(lng, lat, label = '', showRing = false) {
  const src = map.getSource('selectedPoint');
  if (!src) return;
  if (Number.isFinite(lng) && Number.isFinite(lat)) {
    src.setData(collection([point([lng, lat], { label, showRing })]));
  } else {
    src.setData(collection([]));
  }
}

function highlightBuilding(buildingMeta, options = {}) {
  const src = map.getSource('selectedBuilding');
  if (!buildingMeta) {
    selectedBuildingId = null;
    cityBuildings3DLayer.setSelectedBuilding(null);
    if (src) src.setData(collection([]));
    return;
  }
  const soft = Boolean(options && options.soft);
  selectedBuildingId = buildingMeta.id;
  cityBuildings3DLayer.setSelectedBuilding(buildingMeta.id, { soft });
  if (map.getLayer('selected-building-fill')) {
    map.setPaintProperty('selected-building-fill', 'fill-opacity', soft ? 0.025 : 0.05);
  }
  if (map.getLayer('selected-building-casing')) {
    map.setPaintProperty('selected-building-casing', 'line-width', soft ? 2.8 : 3.2);
    map.setPaintProperty('selected-building-casing', 'line-opacity', soft ? 0.72 : 0.85);
  }
  if (map.getLayer('selected-building-line')) {
    map.setPaintProperty('selected-building-line', 'line-color', soft ? '#27466e' : '#11224D');
    map.setPaintProperty('selected-building-line', 'line-width', soft ? 1.5 : 1.6);
    map.setPaintProperty('selected-building-line', 'line-opacity', soft ? 0.85 : 0.96);
  }
  const feat = cityBuildings3DLayer.getBuildingGeoJSON(buildingMeta.id);
  if (src) src.setData(feat ? collection([feat]) : collection([]));
}

let hoverHudHideTimer = null;
function setHoveredBuildingUI(buildingMeta) {
  const nextId = buildingMeta ? buildingMeta.id : null;
  if (nextId === hoveredBuildingId) return;
  hoveredBuildingId = nextId;
  const src = map.getSource('hoveredBuilding');
  const hud = byId('hover-hud');

  if (!buildingMeta || buildingMeta.id === selectedBuildingId) {
    cityBuildings3DLayer.setHoveredBuilding(null);
    if (src && map.getZoom() < 14.0) src.setData(collection([]));
    if (hud) {
      hud.classList.remove('visible');
      if (hoverHudHideTimer) clearTimeout(hoverHudHideTimer);
      hoverHudHideTimer = setTimeout(() => {
        if (!hud.classList.contains('visible')) hud.hidden = true;
      }, 210);
    }
    return;
  }

  // Zero-stutter 3D hover: WebGL renders the smooth fading rim at z >= 14.0 without GeoJSON worker re-tiling!
  cityBuildings3DLayer.setHoveredBuilding(buildingMeta.id);
  if (src && map.getZoom() < 14.0) {
    const feat = cityBuildings3DLayer.getBuildingGeoJSON(buildingMeta.id);
    src.setData(feat ? collection([feat]) : collection([]));
  } else if (src && src._data && src._data.features && src._data.features.length) {
    src.setData(collection([]));
  }

  // Live floating hover HUD pill with smooth spring fade-in
  if (hud && byId('link-banner')?.hidden && !draggingScoutSite) {
    if (hoverHudHideTimer) { clearTimeout(hoverHudHideTimer); hoverHudHideTimer = null; }
    const linked = registry.getEstablishmentsForBuilding(buildingMeta.id);
    const totalLinked = linked.official.length + linked.community.length;
    const lm = buildingMeta.landmarkId ? VERIFIED_LANDMARKS.find(x => x.id === buildingMeta.landmarkId) : null;
    const title = buildingMeta.mappedName || lm?.shortName || 'Mapped building';
    const brgy = buildingMeta.officialBarangay ? buildingMeta.officialBarangay.name : '';
    const linkedTxt = totalLinked > 0 ? `${totalLinked} linked place${totalLinked > 1 ? 's' : ''}` : 'No linked places';
    byId('hover-hud-name').textContent = title;
    byId('hover-hud-meta').textContent = [brgy, linkedTxt, `${buildingMeta.areaM2.toLocaleString()} m² footprint`].filter(Boolean).join(' · ');
    const wasHidden = hud.hidden;
    hud.hidden = false;
    if (wasHidden) requestAnimationFrame(() => hud.classList.add('visible'));
    else hud.classList.add('visible');
  }
}

// =========================================================================
// DAYLIGHT <-> GOLDEN HOUR <-> ARCHITECTURAL NIGHT MODE (SMOOTH INTERPOLATION)
// =========================================================================
let lightingAnimRaf = null;
let currentWarmth = 0.0;
let currentNight = 0.0;

function applyLightingFrame(w, n = currentNight) {
  currentWarmth = w;
  currentNight = n;
  cityBuildings3DLayer.setLightingWarmth(w);
  landmark3DLayer.setLightingWarmth(w);
  if (typeof cityBuildings3DLayer.setNightFactor === 'function') cityBuildings3DLayer.setNightFactor(n);
  if (typeof landmark3DLayer.setNightFactor === 'function') landmark3DLayer.setNightFactor(n);
  if (livingCityLayer && typeof livingCityLayer.setNightFactor === 'function') livingCityLayer.setNightFactor(n);

  const dayMix = (dayHex, goldHex, nightHex) => lerpHex(lerpHex(dayHex, goldHex, w), nightHex, n);
  const setPaint = (id, prop, val) => { if (map.getLayer(id)) map.setPaintProperty(id, prop, val); };

  if (map.getStyle()) {
    setPaint('land', 'background-color', dayMix('#dfdfd5', '#dad4c4', '#131b29'));
    setPaint('farmland', 'fill-color', dayMix('#bbcaab', '#bcc7a5', '#172424'));
    setPaint('woods', 'fill-color', dayMix('#a6bfa4', '#a9be9f', '#142322'));
    setPaint('urban-commercial', 'fill-color', dayMix('#d6d6cb', '#d6d0c3', '#192334'));
    setPaint('urban-commercial', 'fill-outline-color', dayMix('#d0d0c5', '#ccc6b8', '#223047'));
    setPaint('campus-grounds', 'fill-color', dayMix('#d5dbce', '#d4d6c4', '#182534'));
    setPaint('beaches', 'fill-color', dayMix('#e8dfc8', '#e9d8b7', '#252c38'));
    setPaint('grass-parks', 'fill-color', dayMix('#b3c6a7', '#b8c6a5', '#182c27'));
    setPaint('parks', 'fill-color', dayMix('#a9c29e', '#afc29c', '#162925'));
    setPaint('pitches', 'fill-color', dayMix('#a2bb99', '#a7bb96', '#183029'));
    setPaint('sea', 'fill-color', dayMix('#afcbd2', '#afc4c8', '#0a1626'));
    setPaint('sea-shallow-rim', 'line-color', dayMix('#c0d8db', '#b8cbc9', '#142942'));
    setPaint('sea-shoreline', 'line-color', dayMix('#dbe7e3', '#dcdcc8', '#274366'));
    setPaint('rivers', 'line-color', dayMix('#a2c3cb', '#9fbec2', '#10243b'));
    setPaint('city-outside-mask', 'fill-color', dayMix('#8c9692', '#9b9a8e', '#090f18'));

    // Roads & sidewalks smoothly shift into sleek midnight asphalt with luminous warm amber highway lines
    setPaint('roads-sidewalk-minor', 'line-color', dayMix('#e2dfd5', '#ddd8ca', '#263245'));
    setPaint('roads-sidewalk-major', 'line-color', dayMix('#ece8dc', '#e7e0cf', '#2c3a50'));
    setPaint('roads-bridge-parapet', 'line-color', dayMix('#f5f9fd', '#f3efe4', '#465c7d'));
    setPaint('roads-surface-path', 'line-color', dayMix('#b2aea2', '#aea79a', '#242e3d'));
    setPaint('roads-surface-service', 'line-color', dayMix('#a6acb3', '#a2a5ab', '#253042'));
    setPaint('roads-surface-minor', 'line-color', dayMix('#8c949d', '#8a8f97', '#293548'));
    setPaint('roads-surface-tertiary', 'line-color', dayMix('#717a84', '#70767e', '#243043'));
    setPaint('roads-surface-secondary', 'line-color', dayMix('#5d6671', '#5c636d', '#1f2a3b'));
    setPaint('roads-surface-major', 'line-color', dayMix('#4b545f', '#4b525c', '#182231'));
    setPaint('roads-center-secondary', 'line-color', dayMix('#e6e3d8', '#e8e0cf', '#607696'));
    setPaint('roads-center-major', 'line-color', dayMix('#e8b951', '#f0ba47', '#f5c556'));

    // Crisp label contrast in both Day Mode and Night Mode
    const isDarkText = n >= 0.45;
    setPaint('landmark-labels', 'text-color', isDarkText ? '#f5ecd5' : '#14324d');
    setPaint('landmark-labels', 'text-halo-color', isDarkText ? 'rgba(9,16,30,0.92)' : 'rgba(255,255,255,0.96)');
    setPaint('community-names', 'text-color', isDarkText ? '#e6eefb' : '#203242');
    setPaint('community-names', 'text-halo-color', isDarkText ? '#0b1424' : '#fffefa');
    setPaint('official-names', 'text-color', isDarkText ? '#f8e3cb' : '#203242');
    setPaint('official-names', 'text-halo-color', isDarkText ? '#0b1424' : '#fffefa');
    setPaint('streetnames-minor', 'text-color', isDarkText ? '#cad6ea' : '#26303a');
    setPaint('streetnames-minor', 'text-halo-color', isDarkText ? '#0d1727' : '#f9f8f2');
    setPaint('place-labels', 'text-color', isDarkText ? '#d6e3f7' : '#163858');
    setPaint('place-labels', 'text-halo-color', isDarkText ? 'rgba(10,18,32,0.90)' : 'rgba(246,251,255,0.94)');
    setPaint('water-labels', 'text-color', isDarkText ? '#7aa4c9' : '#526d77');
    setPaint('water-labels', 'text-halo-color', isDarkText ? '#0a1626' : '#d2e2e4');
    setPaint('barangay-names', 'text-color', isDarkText ? '#c9daf5' : '#123d60');
    setPaint('barangay-names', 'text-halo-color', isDarkText ? 'rgba(10,18,32,0.92)' : 'rgba(255,253,245,0.95)');
    setPaint('selected-label', 'text-color', isDarkText ? '#fff4d6' : '#0f2a44');
    setPaint('selected-label', 'text-halo-color', isDarkText ? '#0b1528' : '#fffbf0');
    setPaint('property-available-badge', 'text-color', isDarkText
      ? ['case', ['==', ['get', 'active'], true], '#ff9da3', ['==', ['get', 'available'], true], '#82f0c3', '#cfd8e4']
      : ['case', ['==', ['get', 'active'], true], '#9E1B22', ['==', ['get', 'available'], true], '#0f6042', '#4a4a4a']);
    setPaint('property-available-badge', 'text-halo-color', isDarkText ? '#0b1424' : '#fffefa');
    setPaint('business-selection-label', 'text-color', isDarkText ? '#ffffff' : '#11224D');
    setPaint('business-selection-label', 'text-halo-color', isDarkText ? '#0b1424' : '#fffefa');
    setPaint('nearby-business-markers', 'text-color', isDarkText ? '#e8f1ff' : '#13273d');
    setPaint('nearby-business-markers', 'text-halo-color', isDarkText ? 'rgba(10,18,32,0.95)' : 'rgba(255,254,250,0.96)');
    setPaint('scout-match-labels', 'text-color', isDarkText ? '#fde7aa' : '#0f2a44');
    setPaint('scout-match-labels', 'text-halo-color', isDarkText ? '#0b1424' : '#fff6db');
    setPaint('scout-connector-label', 'text-color', isDarkText
      ? ['case', ['==', ['get', 'overlapping'], true], '#ffd280', '#b7dfff']
      : ['case', ['==', ['get', 'overlapping'], true], '#7e4706', '#123352']);
    setPaint('scout-connector-label', 'text-halo-color', isDarkText ? 'rgba(10,18,32,0.95)' : 'rgba(255,255,255,0.98)');
    setPaint('scout-centers', 'text-color', isDarkText
      ? ['match', ['get', 'site'], 'B', '#ffb293', '#a6dcff']
      : ['match', ['get', 'site'], 'B', '#7f2d0f', '#0f2a44']);
    setPaint('scout-centers', 'text-halo-color', isDarkText ? 'rgba(10,18,32,0.95)' : 'rgba(255,255,255,0.97)');
  }
}

function setLightingMode(mode, { immediate = false } = {}) {
  lightingMode = mode === 'night' ? 'night' : (mode === 'golden' ? 'golden' : 'day');
  const isG = lightingMode === 'golden';
  const isN = lightingMode === 'night';
  const targetW = isG ? 1.0 : 0.0;
  const targetN = isN ? 1.0 : 0.0;
  const startW = currentWarmth;
  const startN = currentNight;

  document.body.classList.toggle('theme-night', isN);

  const dayBtn = byId('theme-day');
  const nightBtn = byId('theme-night');
  if (dayBtn) {
    dayBtn.classList.toggle('active', !isN);
    dayBtn.setAttribute('aria-pressed', String(!isN));
  }
  if (nightBtn) {
    nightBtn.classList.toggle('active', isN);
    nightBtn.setAttribute('aria-pressed', String(isN));
  }

  const btn = byId('lighting-btn');
  const btnLbl = byId('lighting-btn-label');
  if (btnLbl) btnLbl.textContent = isN ? 'Night' : (isG ? 'Golden' : 'Daylight');
  if (btn) {
    btn.classList.toggle('golden', isG);
    btn.setAttribute('aria-pressed', String(isG || isN));
  }
  const fsThemeLbl = byId('fs-theme-label');
  const fsTheme = byId('fs-theme-btn');
  if (fsThemeLbl) fsThemeLbl.textContent = isN ? 'Night' : (isG ? 'Golden' : 'Day');
  if (fsTheme) {
    fsTheme.classList.toggle('active', isG || isN);
    fsTheme.setAttribute('aria-label', `${fsThemeLbl.textContent} lighting. Cycle map lighting`);
  }
  window.dispatchEvent(new CustomEvent('locus:lighting-changed', { detail: { mode: lightingMode } }));
  setStatus(
    isN ? 'Architectural Night Mode active (lit windows, glowing streetlamps & headlights).' :
      (isG ? 'La Union Golden Hour lighting active (western afternoon sun).' : 'Sunlit coastal Day Mode active.')
  );

  if (lightingAnimRaf) cancelAnimationFrame(lightingAnimRaf);
  lightingAnimRaf = null;
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (immediate || reducedMotion || (Math.abs(targetW - startW) < 0.001 && Math.abs(targetN - startN) < 0.001)) {
    applyLightingFrame(targetW, targetN);
    return;
  }

  const startTs = performance.now();
  const duration = 640;
  const tick = now => {
    const p = Math.min(1, (now - startTs) / duration);
    const e = EASE_IN_OUT(p);
    applyLightingFrame(startW + (targetW - startW) * e, startN + (targetN - startN) * e);
    if (p < 1) {
      lightingAnimRaf = requestAnimationFrame(tick);
    } else {
      lightingAnimRaf = null;
      applyLightingFrame(targetW, targetN);
    }
  };
  lightingAnimRaf = requestAnimationFrame(tick);
}

const nextLightingMode = () => (lightingMode === 'day' ? 'golden' : (lightingMode === 'golden' ? 'night' : 'day'));
byId('lighting-btn').onclick = () => setLightingMode(nextLightingMode());
if (byId('fs-theme-btn')) byId('fs-theme-btn').onclick = () => setLightingMode(nextLightingMode());
if (byId('theme-day')) byId('theme-day').onclick = () => setLightingMode('day');
if (byId('theme-night')) byId('theme-night').onclick = () => setLightingMode('night');

// Collapsible frosted-glass map legend
const legendToggleBtn = byId('legend-toggle');
if (legendToggleBtn) {
  legendToggleBtn.onclick = () => {
    const legend = byId('map-legend');
    const body = byId('legend-body');
    const nextCollapsed = !body.hidden;
    body.hidden = nextCollapsed;
    legend.classList.toggle('collapsed', nextCollapsed);
    legendToggleBtn.setAttribute('aria-expanded', String(!nextCollapsed));
  };
}

// =========================================================================
// MAP COLOR MODE TOGGLE (Architectural vs. Coverage View)
// =========================================================================
function setMapColorMode(mode) {
  const isCov = mode === 'coverage';
  cityBuildings3DLayer.setColorMode(isCov ? 'coverage' : 'architectural');
  byId('mode-arch').classList.toggle('active', !isCov);
  byId('mode-arch').setAttribute('aria-pressed', String(!isCov));
  byId('mode-cov').classList.toggle('active', isCov);
  byId('mode-cov').setAttribute('aria-pressed', String(isCov));
  byId('legend-arch').hidden = isCov;
  byId('legend-cov').hidden = !isCov;
  setStatus(isCov ? 'Coverage shows official links, multiple mapped places, community matches and unlinked footprints.' : '');
}

byId('mode-arch').onclick = () => setMapColorMode('architectural');
byId('mode-cov').onclick = () => setMapColorMode('coverage');

// =========================================================================
// INTERACTIVE PIN-TO-BUILDING REVIEW LINKER (PACK C)
// =========================================================================
function setLinkMode(uid) {
  if (uid) {
    pendingScoutSite = null;
    if (pendingPinName) setPinMode('');
  }
  pendingLinkUid = uid || null;
  const rec = uid ? registry.getRecordByUid(uid) : null;
  byId('map').classList.toggle('linking-pin', Boolean(rec || pendingScoutSite));
  const banner = byId('link-banner');
  if (rec) {
    if (activePopup) { activePopup.remove(); activePopup = null; }
    byId('link-banner-text').textContent = `Linking "${rec.name}": click the building roof or wall it belongs to.`;
    banner.hidden = false;
    setStatus(`Click a building footprint to link "${rec.name}".`);
  } else if (!pendingScoutSite) {
    banner.hidden = true;
  }
}

function setPendingScoutSite(which) {
  if (which) {
    pendingLinkUid = null;
    if (pendingPinName) setPinMode('');
  }
  pendingScoutSite = which || null;
  byId('map').classList.toggle('linking-pin', Boolean(pendingScoutSite || pendingLinkUid));
  const banner = byId('link-banner');
  if (pendingScoutSite) {
    if (activePopup) { activePopup.remove(); activePopup = null; }
    const rad = scout ? scout.getState().radiusM : 500;
    byId('link-banner-text').textContent = `Click anywhere on the map to place Site ${pendingScoutSite} (${rad} m comparison circle).`;
    banner.hidden = false;
    setStatus(`Click the map to place Site ${pendingScoutSite}.`);
    if (window.innerWidth <= 760) setMobileSheetCollapsed(true);
  } else if (!pendingLinkUid) {
    banner.hidden = true;
  }
  if (uiWorkspace === 'scout') renderScoutPanel();
}

byId('cancel-link').onclick = () => {
  if (pendingScoutSite) {
    setPendingScoutSite(null);
    setStatus('Site placement cancelled.');
  } else {
    setLinkMode(null);
    setStatus('Pin linking cancelled.');
  }
};

function formatReviewReason(code) {
  const mapReasons = {
    missing_coordinates: 'Missing latitude/longitude',
    invalid_coordinates: 'Invalid coordinate values',
    outside_city_boundary: 'Coordinate falls outside San Fernando city boundary',
    missing_coordinate_source: 'Coordinate source not recorded',
    missing_verification_date: 'Verification date not recorded',
    missing_stable_id: 'Stable official ID missing'
  };
  return mapReasons[code] || code;
}

function formatMatchBadge(matchType) {
  if (matchType === 'explicit_id') return { text: 'Explicit building ID', cls: 'badge-active' };
  if (matchType === 'verified_link') return { text: 'Verified building link', cls: 'badge-active' };
  if (matchType === 'map_based') return { text: 'Map-based match', cls: 'badge-match' };
  if (matchType === 'uncertain') return { text: 'Building match uncertain · Review', cls: 'badge-review' };
  return null;
}

// =========================================================================
// BUILDING CARD (Opens when clicking any mapped building roof or wall)
// =========================================================================
function renderBuildingCard(buildingMeta) {
  selectedBuildingId = buildingMeta.id;
  selectedUid = null;
  selectedLandmarkId = buildingMeta.landmarkId || null;
  for (const r of byId('results').querySelectorAll('.row')) r.classList.remove('selected');

  const lm = buildingMeta.landmarkId
    ? VERIFIED_LANDMARKS.find(item => item.id === buildingMeta.landmarkId)
    : null;
  const linked = registry.getEstablishmentsForBuilding(buildingMeta.id);
  const totalLinked = linked.official.length + linked.community.length;
  const nearbyUncertain = registry.getNearbyUncertainPins(buildingMeta, 10);

  const displayName = buildingMeta.mappedName || lm?.name || 'Mapped building';

  const detail = byId('detail');
  detail.replaceChildren();

  const badges = el('div', '', 'detail-badges');
  badges.append(el('span', 'Mapped footprint', 'badge badge-building'));
  if (lm) badges.append(el('span', 'Landmark', 'badge badge-landmark'));
  detail.append(badges, el('h2', displayName));

  const dl = el('dl', '', 'meta-grid');
  const addRow = (label, value, basis) => {
    const dd = el('dd', value);
    if (basis) dd.append(' ', el('span', basis, 'meta-tag tag-estimated'));
    dl.append(el('dt', label), dd);
  };
  addRow('Footprint area', `${buildingMeta.areaM2.toLocaleString()} m²`, 'Calculated');
  addRow('Model height', `${buildingMeta.height} m`, buildingMeta.isHeightMapped ? 'Estimated from map' : 'Estimated default');
  // An official business point inside the outline does not verify attributes of the structure.
  const linkedRecord = linked.official.find(r =>
    ['explicit_id', 'verified_link'].includes(r.buildingMatchType) && Number.isFinite(r.measuredHeightM));
  addRow('Measured height', linkedRecord ? `${linkedRecord.measuredHeightM} m · LOCUS SF record` : 'Not provided');
  addRow('Levels', String(buildingMeta.mappedLevels ?? 'Not provided'));
  addRow('Barangay', buildingMeta.officialBarangay?.name || 'Not provided');
  if (buildingMeta.mappedUse) addRow('Mapped land use', buildingMeta.mappedUse);
  if (buildingMeta.mappedHouseNumber) addRow('Mapped house number', buildingMeta.mappedHouseNumber);
  addRow('Footprint ID', buildingMeta.id);
  addRow('Source', 'OpenStreetMap via OpenFreeMap · 15 Nov 2026');
  if (lm) addRow('Landmark model', 'Illustrative architectural silhouette');
  detail.append(dl);

  const wrap = el('div', '', 'co-tenants');
  if (totalLinked === 0) {
    wrap.append(
      el('h3', 'Mapped places (0)'),
      el('p', 'No place records linked to this footprint.', 'empty-building-note')
    );
  } else {
    wrap.append(el('h3', `Mapped places (${totalLinked})`));
    const list = el('div', '', 'tenant-list');
    for (const item of [...linked.official, ...linked.community]) {
      const btn = el('button', '', 'tenant-btn');
      btn.type = 'button';
      const left = el('div', '', 'tenant-main');
      const title = item.unit ? `${item.name} (${item.unit})` : item.name;
      const matchLbl = item.buildingMatchType === 'map_based' ? 'Coordinate inside footprint'
        : (item.buildingMatchType === 'verified_link' ? 'Reviewed link' : 'Source building ID');
      left.append(
        el('span', title, 'tenant-name'),
        el('span', `${item.category} · ${matchLbl}`, 'tenant-sub')
      );
      btn.append(
        left,
        el('span', item.sourceType === 'official' ? 'Official' : 'OSM', 'badge ' + (item.sourceType === 'official' ? 'badge-official' : 'badge-community'))
      );
      btn.onclick = () => selectRecord(item);
      list.append(btn);
    }
    wrap.append(list);
  }

  if (nearbyUncertain.length > 0) {
    wrap.append(el(
      'div',
      `${nearbyUncertain.length} nearby mapped pin${nearbyUncertain.length === 1 ? '' : 's'} outside this footprint.`,
      'review-alert'
    ));
  }
  detail.append(wrap);

  return displayName;
}

function selectBuilding(buildingMeta, options = {}) {
  if (!buildingMeta) return;
  inspectionVersion++;
  investorSites.markBusiness(null);
  setHoveredBuildingUI(null);
  highlightBuilding(buildingMeta);
  const displayName = renderBuildingCard(buildingMeta);
  updateSelectedPoint(null, null);
  activePopup?.remove();
  revealInspection('Building footprint');

  if (!isInspectorSheetOpen() && Array.isArray(buildingMeta.centerLL)) {
    const linked = registry.getEstablishmentsForBuilding(buildingMeta.id);
    const allLinked = [...linked.official, ...linked.community];
    const lm = buildingMeta.landmarkId ? VERIFIED_LANDMARKS.find(item => item.id === buildingMeta.landmarkId) : null;
    const specs = [
      `${buildingMeta.areaM2.toLocaleString()} m² footprint`,
      `~${buildingMeta.height} m`,
      buildingMeta.mappedLevels ? `${buildingMeta.mappedLevels} levels` : ''
    ].filter(Boolean).join(' · ');
    const brgy = buildingMeta.officialBarangay?.name || '';
    const tenantNames = allLinked.slice(0, 3).map(r => r.name);
    const extraCount = Math.max(0, allLinked.length - tenantNames.length);
    const metaLines = [specs];
    if (tenantNames.length) {
      metaLines.push(`Places inside: ${tenantNames.join(', ')}${extraCount > 0 ? ` +${extraCount} more` : ''}`);
    }
    if (map.getContainer().clientHeight < 460) {
      map.easeTo({
        center: buildingMeta.centerLL,
        offset: [0, 62],
        duration: 420,
        easing: SMOOTH_EASE
      });
    }
    showRichCardPopup(buildingMeta.centerLL[0], buildingMeta.centerLL[1], {
      kicker: lm ? 'Verified landmark' : '3D Building',
      badge: brgy,
      title: displayName,
      subtitle: buildingMeta.mappedUse || (allLinked.length ? `${allLinked.length} mapped place${allLinked.length === 1 ? '' : 's'} linked` : 'Mapped footprint'),
      metaLines,
      actionLabel: isPropertyDetailEmbed && !isFullscreenMap ? 'Full 3D details →' : 'Inspect building →',
      onAction: () => openInspectorFromPopup(buildingMeta.centerLL[0], buildingMeta.centerLL[1]),
      offset: 14
    });
  }

  if (options.easeTo) {
    map.easeTo({
      center: buildingMeta.centerLL,
      zoom: Math.max(16.8, map.getZoom()),
      padding: getMobileMapPadding(),
      duration: 720,
      easing: SMOOTH_EASE
    });
  }

  setStatus('');

  // Market Scout Step 2 deduplicated inspection tracking (clicking the same building repeatedly never earns extra progress)
  if (scout && scout.getState().active) {
    const key = `bldg:${buildingMeta.id}`;
    const res = scout.recordInspection(buildingMeta.centerLL[0], buildingMeta.centerLL[1], key, displayName, 'building');
    if (uiWorkspace === 'scout') renderScoutPanel();
    updateScoutBadge();
    if (!res.added) {
      const st = scout.getState();
      if (st.inspectedA.some(x => x.key === key) || st.inspectedB.some(x => x.key === key)) {
        setStatus('Already inspected — repeat clicks on the same building do not add extra progress.');
      }
    }
  }
}

// =========================================================================
// ESTABLISHMENT DETAIL CARD (with Interactive Pin-to-Building Linker!)
// =========================================================================
function renderRecordDetail(record) {
  selectedUid = record.uid;
  selectedLandmarkId = null;

  const detail = byId('detail');
  detail.replaceChildren();

  const badges = el('div', '', 'detail-badges');
  badges.append(el(
    'span',
    record.sourceType === 'official' ? 'Official LOCUS SF' : 'Community (OSM)',
    'badge ' + (record.sourceType === 'official' ? 'badge-official' : 'badge-community')
  ));

  const mBadge = formatMatchBadge(record.buildingMatchType);
  if (mBadge) badges.append(el('span', mBadge.text, 'badge ' + mBadge.cls));
  if (record.needsCoordinateReview) badges.append(el('span', 'Needs coordinate review', 'badge badge-review'));

  const bInfo = (record.sourceType === 'community' && window.LocusBrands)
    ? window.LocusBrands.getBrandInfo(record.osmIndex, record.name)
    : null;
  if (bInfo) {
    badges.append(el(
      'span',
      bInfo.status === 'verified_open' ? 'Verified active' : (bInfo.status === 'stale_candidate' ? 'Check / Unlisted' : 'Field check'),
      'badge ' + (bInfo.status === 'verified_open' ? 'badge-active' : 'badge-review')
    ));
  }

  const group = registry.getBuildingGroup(record);
  const totalInBuilding = group.official.length + group.community.length;
  if (record.linkedBuildingId && totalInBuilding > 1) {
    badges.append(el('span', `${totalInBuilding} footprint matches`, 'badge badge-multi'));
  }

  detail.append(badges, el('h2', record.name), el('p', record.category, 'detail-cat'));

  // Action buttons: inspect linked building, OR interactively link/unlink uncertain pin!
  const actions = el('div', '', 'detail-actions');
  if (record.linkedBuildingId) {
    const bMeta = cityBuildings3DLayer.getBuildingById(record.linkedBuildingId);
    if (bMeta) {
      const inspectBtn = el('button', `Inspect building (${bMeta.id})`, 'btn-building-link');
      inspectBtn.type = 'button';
      inspectBtn.onclick = () => selectBuilding(bMeta, { easeTo: false });
      actions.append(inspectBtn);
    }
    if (record.manualReview) {
      const undoBtn = el('button', 'Undo link', 'btn-unlink-pin');
      undoBtn.type = 'button';
      undoBtn.onclick = () => {
        registry.unlinkManualReview(record.uid);
        syncMapDataSources();
        cityBuildings3DLayer.refreshCoverageColors();
        updateCountsUI();
        showResults();
        selectRecord(record);
        setStatus(`Removed manual building link for "${record.name}".`);
      };
      actions.append(undoBtn);
    }
  } else if (record.hasValidCoords && record.buildingMatchType === 'uncertain') {
    const linkBtn = el('button', 'Link this pin to a building', 'btn-link-pin');
    linkBtn.type = 'button';
    linkBtn.onclick = () => setLinkMode(record.uid);
    actions.append(linkBtn);
  }
  if (actions.childNodes.length) detail.append(actions);

  const dl = el('dl', '', 'meta-grid');
  const addRow = (k, v) => { if (v) dl.append(el('dt', k), el('dd', v)); };

  if (record.sourceType === 'official') {
    addRow('Official ID', record.officialId || 'Not provided');
    addRow('Status', record.status);
    if (record.barangay) addRow('Barangay', record.barangay);
    if (record.address || record.unit) addRow('Address / Unit', [record.unit, record.address].filter(Boolean).join(' · '));
    if (record.buildingName || record.buildingId) addRow('Building ref', [record.buildingName, record.buildingId ? `(${record.buildingId})` : ''].filter(Boolean).join(' '));
    addRow('Join method', record.joinMethod.replaceAll('_', ' '));
    addRow('Coordinates', record.hasValidCoords ? `${record.lat.toFixed(6)}, ${record.lng.toFixed(6)}` : 'Unmapped — flagged for review');
    addRow('Coord. source', record.coordinateSource);
    addRow('Verified date', record.verifiedAt);
    if (record.reviewedBy) addRow('Reviewed by', `${record.reviewedBy}${record.reviewedAt ? ' (' + record.reviewedAt + ')' : ''}`);
  } else {
    addRow('Source', record.sourceLabel);
    if (record.barangay) addRow('Barangay', `${record.barangay} (${record.barangaySource || 'PSGC polygon'})`);
    addRow('Coordinates', `${record.lat.toFixed(6)}, ${record.lng.toFixed(6)}`);
    addRow('Coord. source', record.coordinateSource);
    if (bInfo) {
      addRow('Status check', bInfo.statusLabel);
      addRow('Audit source', bInfo.auditSource);
      addRow('Audit note', bInfo.auditNote);
    }
  }

  if (record.buildingMatchNote) addRow('Building link', record.buildingMatchNote);
  if (record.measuredHeightM != null) addRow('Recorded building height', record.heightLabel);
  detail.append(dl);

  if (record.buildingMatchType === 'uncertain') {
    detail.append(el('div', `Building match flagged for review: ${record.buildingMatchNote}`, 'review-alert'));
  }
  if (bInfo && bInfo.status !== 'verified_open') {
    detail.append(el('div', `Field verification recommended: ${bInfo.auditNote}`, 'review-alert'));
  }
  if (record.needsCoordinateReview) {
    detail.append(el('div', 'Coordinate review flags: ' + record.reviewReasons.map(formatReviewReason).join('; ') + '.', 'review-alert'));
  }

  if (record.linkedBuildingId && totalInBuilding > 1) {
    const wrap = el('div', '', 'co-tenants');
    wrap.append(el('h3', `Mapped to this footprint (${totalInBuilding})`));
    const list = el('div', '', 'tenant-list');
    for (const item of [...group.official, ...group.community]) {
      const btn = el('button', '', 'tenant-btn' + (item.uid === record.uid ? ' current' : ''));
      btn.type = 'button';
      const title = item.unit ? `${item.name} (${item.unit})` : item.name;
      btn.append(
        el('span', title, 'tenant-name'),
        el('span', item.sourceType === 'official' ? 'Official' : 'OSM', 'badge ' + (item.sourceType === 'official' ? 'badge-official' : 'badge-community'))
      );
      btn.onclick = () => selectRecord(item);
      list.append(btn);
    }
    wrap.append(list);
    detail.append(wrap);
  }

  for (const r of byId('results').querySelectorAll('.row')) {
    r.classList.toggle('selected', r.dataset.uid === record.uid);
  }
}

async function selectRecord(record) {
  if (!record) return;
  const version = ++inspectionVersion;
  await registry.ensureRecordMatched(record);
  if (version !== inspectionVersion || registry.getRecordByUid(record.uid) !== record) return;
  const distance = investorSites.markBusiness(record);
  renderRecordDetail(record);
  if (distance != null) byId('detail').append(el('p', `${distance} m straight-line distance from the selected site.`, 'panel-note site-distance'));
  revealInspection('Establishment details');

  if (record.hasValidCoords) {
    // Softly outline a building ONLY for a confirmed link; inferred coordinate matches highlight the point alone.
    const confirmedLink = Boolean(
      record.linkedBuildingId &&
      (record.buildingMatchType === 'explicit_id' || record.buildingMatchType === 'verified_link')
    );
    const confirmedBuilding = confirmedLink ? cityBuildings3DLayer.getBuildingById(record.linkedBuildingId) : null;
    highlightBuilding(confirmedBuilding, confirmedBuilding ? { soft: true } : {});
    updateSelectedPoint(null, null);

    const visible = map.getBounds().contains([record.lng, record.lat]);
    const compactEmbedPopup = !isInspectorSheetOpen() && map.getContainer().clientHeight < 460;
    if (compactEmbedPopup) {
      map.easeTo({
        center: [record.lng, record.lat],
        zoom: Math.max(16.2, map.getZoom()),
        offset: [0, 62],
        duration: 460,
        easing: SMOOTH_EASE
      });
    } else if (distance == null || distance > 500 || !visible) map.easeTo({
      center: [record.lng, record.lat],
      zoom: Math.max(16.8, map.getZoom()),
      padding: getMobileMapPadding(),
      duration: 720,
      easing: SMOOTH_EASE
    });

    const bInfo = (record.sourceType === 'community' && window.LocusBrands)
      ? window.LocusBrands.getBrandInfo(record.osmIndex, record.name)
      : null;
    const matchTxt = record.buildingMatchType === 'uncertain'
      ? 'Separate pin · Building match needs review'
      : record.buildingMatchType === 'verified_link'
        ? 'Verified building link'
        : record.buildingMatchType === 'map_based'
          ? 'Mapped to 3D footprint'
          : (record.sourceType === 'official' ? `${record.coordinateSource} (${record.verifiedAt})` : '');
    const sub = record.sourceType === 'official'
      ? `Official · ${matchTxt || record.category}`
      : (bInfo ? `${bInfo.statusLabel} · ${matchTxt || record.category}` : `${matchTxt ? matchTxt + ' · ' : ''}Community (OSM)`);
    if (!isInspectorSheetOpen()) {
      const walkMin = distance != null ? Math.max(1, Math.round(distance / 80)) : null;
      const group = registry.getBuildingGroup(record);
      const totalInBuilding = group.official.length + group.community.length;
      const metaLines = [];
      const addr = [record.unit, record.address].filter(Boolean).join(' · ');
      if (addr) metaLines.push(addr);
      else if (bInfo?.auditNote) metaLines.push(bInfo.auditNote);
      else if (matchTxt) metaLines.push(matchTxt);
      if (record.linkedBuildingId && totalInBuilding > 1) {
        metaLines.push(`${totalInBuilding} mapped places in this 3D building`);
      }
      showRichCardPopup(record.lng, record.lat, {
        kicker: record.sourceType === 'official' ? 'Official LOCUS SF' : (bInfo?.status === 'verified_open' ? 'Verified active' : 'Community (OSM)'),
        badge: distance != null ? `${distance} m · ~${walkMin} min walk` : '',
        title: record.name,
        subtitle: [record.category, record.barangay].filter(Boolean).join(' · '),
        metaLines,
        actionLabel: isPropertyDetailEmbed && !isFullscreenMap ? 'Full 3D details →' : 'View full profile →',
        onAction: () => openInspectorFromPopup(record.lng, record.lat),
        offset: 20
      });
    } else if (distance == null) {
      showPopup(record.lng, record.lat, record.name, sub, 24, true);
    } else {
      activePopup?.remove();
    }
    setStatus('');

    // Market Scout Step 2 deduplicated inspection tracking
    if (scout && scout.getState().active) {
      const key = record.linkedBuildingId ? `bldg:${record.linkedBuildingId}` : `rec:${record.uid}`;
      const res = scout.recordInspection(record.lng, record.lat, key, record.name, 'establishment');
      if (uiWorkspace === 'scout') renderScoutPanel();
      updateScoutBadge();
      if (!res.added) {
        const st = scout.getState();
        if (st.inspectedA.some(x => x.key === key) || st.inspectedB.some(x => x.key === key)) {
          setStatus('Already inspected — repeat clicks on the same building or place do not add extra progress.');
        }
      }
    }
  } else {
    highlightBuilding(null);
    updateSelectedPoint(null, null);
    if (activePopup) activePopup.remove();
    setStatus(`${record.name} has no verified coordinates and is flagged for review.`);
  }
}

async function selectLandmark(lm) {
  if (!lm) return;
  const version = ++inspectionVersion;
  investorSites.markBusiness(null);
  selectedLandmarkId = lm.id;
  selectedUid = null;

  const m = await cityBuildings3DLayer.matchPointAsync(lm.lng, lm.lat);
  if (version !== inspectionVersion) return;
  const bMeta = (m && m.status === 'inside_footprint') ? m.building : null;
  highlightBuilding(bMeta);
  updateSelectedPoint(lm.lng, lm.lat, '', !bMeta);

  const detail = byId('detail');
  detail.replaceChildren();
  const badges = el('div', '', 'detail-badges');
  badges.append(
    el('span', 'City landmark', 'badge badge-landmark')
  );
  const dl = el('dl', '', 'meta-grid');
  const bgy = cityBuildings3DLayer.findOfficialBarangayAt(lm.lng, lm.lat);
  if (bgy) dl.append(el('dt', 'Barangay'), el('dd', `${bgy.name} (PSGC ${bgy.psgc})`));
  dl.append(
    el('dt', 'Coordinates'), el('dd', `${lm.lat.toFixed(6)}, ${lm.lng.toFixed(6)}`),
    el('dt', 'Verification'), el('dd', lm.verification),
    el('dt', 'Height note'), el('dd', lm.heightNote)
  );
  detail.append(
    badges,
    el('h2', lm.name),
    el('p', lm.category, 'detail-cat'),
    el('p', lm.summary, 'panel-note'),
    dl
  );

  if (bMeta) {
    const inspectBtn = el('button', `Open building footprint card (${bMeta.id})`, 'btn-building-link');
    inspectBtn.type = 'button';
    inspectBtn.onclick = () => selectBuilding(bMeta, { easeTo: false });
    detail.append(inspectBtn);
  }

  revealInspection('Verified landmark');

  map.easeTo({
    center: [lm.lng, lm.lat],
    zoom: lm.zoom || 17.2,
    pitch: map.getPitch() < 2 ? 0 : (lm.pitch ?? 58),
    bearing: lm.bearing ?? -28,
    padding: getMobileMapPadding(),
    duration: 850,
    easing: SMOOTH_EASE
  });
  showPopup(lm.lng, lm.lat, lm.name, lm.category || 'Verified city landmark', [0, -56], true);
  window.dispatchEvent(new CustomEvent('locus:landmark-selected', { detail: lm }));
}

// =========================================================================
// SEARCHABLE "JUMP TO PLACE" POPOVER (Replaces long landmark shortcut strip)
// =========================================================================
function setJumpMenuOpen(open) {
  const menu = byId('jump-menu');
  const btn = byId('jump-btn');
  if (!menu || !btn) return;
  menu.hidden = !open;
  btn.setAttribute('aria-expanded', String(open));
  if (open) {
    setMapMoreOpen(false);
    renderJumpList();
    setTimeout(() => byId('jump-query')?.focus(), 20);
  }
}

function renderJumpList() {
  const listEl = byId('jump-list');
  if (!listEl) return;
  const q = (byId('jump-query')?.value || '').trim().toLowerCase();
  listEl.replaceChildren();

  const addGroup = (title, items) => {
    if (!items.length) return;
    listEl.append(el('div', title, 'jump-group'));
    for (const item of items) {
      const btn = el('button', '', 'jump-item');
      btn.type = 'button';
      btn.append(el('span', item.label), el('small', item.sub || ''));
      btn.onclick = () => {
        setJumpMenuOpen(false);
        item.onSelect();
      };
      listEl.append(btn);
    }
  };

  const quickViews = [
    {
      label: 'Downtown Core (Plaza & City Hall)',
      sub: 'Quick view',
      hay: 'downtown core plaza city hall center poblacion',
      onSelect: () => map.easeTo({ ...DOWNTOWN_VIEW, duration: 650 })
    },
    {
      label: 'City Overview (Full San Fernando)',
      sub: 'Boundary',
      hay: 'city overview full san fernando boundary coastline',
      onSelect: () => map.fitBounds(cityBounds, { padding: 36, pitch: 0, bearing: 0, duration: 700 })
    }
  ].filter(v => !q || v.hay.includes(q));
  addGroup('Quick views', quickViews);

  const lms = VERIFIED_LANDMARKS
    .filter(lm => !q || `${lm.name} ${lm.shortName} ${lm.category}`.toLowerCase().includes(q))
    .map(lm => ({
      label: lm.shortName,
      sub: lm.category.split('&')[0].trim(),
      onSelect: () => selectLandmark(lm)
    }));
  addGroup(`Verified 3D landmarks (${lms.length})`, lms);

  const brgys = cityBuildings3DLayer.getBarangayList()
    .filter(b => !q || `${b.name} barangay ${b.psgc}`.toLowerCase().includes(q))
    .slice(0, q ? 59 : 15)
    .map(b => ({
      label: b.name,
      sub: 'Barangay',
      onSelect: () => {
        activeBarangay = b.name;
        const sel = byId('barangay-filter');
        if (sel) sel.value = b.name;
        const src = map.getSource('selectedBarangay');
        if (src) src.setData(collection([b.feature]));
        map.fitBounds([[b.bbox[0], b.bbox[1]], [b.bbox[2], b.bbox[3]]], { padding: getMobileMapPadding(), pitch: 44, duration: 650 });
        showResults();
      }
    }));
  addGroup(q ? `Official barangays (${brgys.length})` : 'Official barangays (type to filter all 59)', brgys);

  if (!listEl.childNodes.length) {
    listEl.append(el('div', 'No matching landmarks or barangays.', 'empty-state'));
  }
}

byId('jump-btn').onclick = e => {
  e.stopPropagation();
  setJumpMenuOpen(byId('jump-menu').hidden);
};
byId('jump-query').oninput = renderJumpList;
document.addEventListener('click', e => {
  const wrap = document.querySelector('.jump-wrap');
  if (wrap && !wrap.contains(e.target) && !byId('jump-menu').hidden) setJumpMenuOpen(false);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (!byId('jump-menu').hidden) {
      setJumpMenuOpen(false);
      byId('jump-btn').focus({ preventScroll: true });
      e.preventDefault();
    }
    if (pendingScoutSite) setPendingScoutSite(null);
    if (pendingLinkUid) setLinkMode(null);
  }
});

// =========================================================================
// MOBILE 3-STATE ACCESSIBLE BOTTOM SHEET (collapsed | mid | expanded)
// =========================================================================
let mobileSheetState = 'collapsed';

function setMobileSheetState(state) {
  const next = (state === 'expanded' || state === 'mid') ? state : 'collapsed';
  mobileSheetState = next;
  const aside = byId('side-panel');
  const toggle = byId('sheet-toggle');
  const expandBtn = byId('sheet-expand');
  const closeBtn = byId('sheet-close');
  const chev = byId('sheet-chevron');
  if (!aside || !toggle) return;

  aside.classList.toggle('sheet-collapsed', next === 'collapsed');
  aside.classList.toggle('sheet-mid', next === 'mid');
  aside.classList.toggle('sheet-expanded', next === 'expanded');
  toggle.setAttribute('aria-expanded', String(next !== 'collapsed'));
  if (chev) chev.textContent = next === 'collapsed' ? '▴' : '▾';
  if (expandBtn) {
    const isExp = next === 'expanded';
    expandBtn.setAttribute('aria-pressed', String(isExp));
    expandBtn.setAttribute('aria-label', isExp ? 'Restore medium panel height' : 'Expand full panel');
    expandBtn.textContent = isExp ? '⤡' : '⤢';
  }
  if (closeBtn) closeBtn.hidden = (next === 'collapsed');
}

function setMobileSheetCollapsed(collapsed) {
  setMobileSheetState(collapsed ? 'collapsed' : 'mid');
}

function revealInspection(kicker) {
  const ep = byId('explore-panel');
  const resEl = byId('results');
  if (ep && !ep.classList.contains('detail-open')) {
    savedResultsScrollTop = resEl ? resEl.scrollTop : 0;
    ep.classList.add('detail-open');
  }
  const kEl = byId('inspection-kicker');
  if (kEl && kicker) kEl.textContent = kicker;
  if (window.innerWidth <= 760) setMobileSheetState('mid');
  updateSheetSummary();
  const body = byId('panel-body');
  if (body) body.scrollTop = 0;
}

function updateSheetSummary() {
  const elSum = byId('sheet-summary');
  if (!elSum) return;
  if (uiWorkspace === 'scout' && scout) {
    const st = scout.getState();
    const prog = scout.getProgress();
    const catTxt = st.category ? ` · ${st.category} (${st.radiusM} m)` : '';
    elSum.textContent = `Market Scout · Step ${prog.currentStep}/4${catTxt}`;
  } else if (byId('explore-panel')?.classList.contains('detail-open')) {
    const kickerTxt = byId('inspection-kicker')?.textContent?.trim();
    elSum.textContent = kickerTxt || 'Place details';
  } else {
    const s = registry.getSummary();
    elSum.textContent = `Directory · ${(s.officialTotal + s.communityCount).toLocaleString()} places`;
  }
}

byId('sheet-toggle').onclick = () => {
  setMobileSheetState(mobileSheetState === 'collapsed' ? 'mid' : 'collapsed');
};
if (byId('sheet-expand')) {
  byId('sheet-expand').onclick = () => {
    setMobileSheetState(mobileSheetState === 'expanded' ? 'mid' : 'expanded');
  };
}
if (byId('sheet-close')) {
  byId('sheet-close').onclick = () => {
    if (cityMapEmbed.enabled) {
      setPanelHidden(true);
      byId('fs-show-panel-btn').focus();
    } else {
      setMobileSheetState('collapsed');
    }
  };
}
if (window.innerWidth <= 760) setMobileSheetState('collapsed');

// =========================================================================
// MARKET SCOUT WORKSPACE & 4-STEP MISSION UI
// =========================================================================
function updateScoutBadge() {
  if (!scout) return;
  const prog = scout.getProgress();
  const badge = byId('scout-step-badge');
  const hdrBtn = byId('hdr-scout-btn');
  if (badge) {
    if (prog.step4) badge.textContent = 'Saved';
    else if (prog.completed > 0 || scout.getState().siteA || scout.getState().category) badge.textContent = `${prog.completed}/4`;
    else badge.textContent = '';
  }
  if (hdrBtn) {
    hdrBtn.classList.toggle('active', uiWorkspace === 'scout');
    hdrBtn.setAttribute('aria-pressed', String(uiWorkspace === 'scout'));
  }
  const mapScout = byId('map-scout-toggle');
  if (mapScout) {
    const showingScout = uiWorkspace === 'scout' && (isFullscreenMap ? document.body.classList.contains('fs-show-panel') : !isPanelHidden);
    mapScout.classList.toggle('active', showingScout);
    mapScout.setAttribute('aria-pressed', String(showingScout));
  }
  updateSheetSummary();
}

function isInspectorVisibleDesktop() {
  if (window.innerWidth <= 760) return false;
  if (document.body.classList.contains('panel-hidden')) return false;
  if (document.body.classList.contains('map-fullscreen') && !document.body.classList.contains('fs-show-panel')) return false;
  return true;
}

function getMobileMapPadding() {
  if (window.innerWidth > 760) {
    return { top: 56, bottom: 52, left: 48, right: isInspectorVisibleDesktop() ? 382 : 48 };
  }
  const height = map.getContainer().clientHeight || window.innerHeight || 720;
  const bottomPad = (document.body.classList.contains('map-fullscreen') && !document.body.classList.contains('fs-show-panel')) || mobileSheetState === 'collapsed'
    ? 88
    : (mobileSheetState === 'expanded' ? Math.round(height * 0.56) : Math.round(height * 0.46));
  return { top: 68, bottom: bottomPad, left: 20, right: 20 };
}

function fitScoutSites() {
  if (!scout) return;
  const st = scout.getState();
  const padM = st.radiusM * 1.25;
  const bounds = new maplibregl.LngLatBounds();
  let count = 0;
  for (const s of [st.siteA, st.siteB]) {
    if (!s) continue;
    const dLat = padM / 111320;
    const dLng = padM / (111320 * Math.cos(s.lat * Math.PI / 180));
    bounds.extend([s.lng - dLng, s.lat - dLat]);
    bounds.extend([s.lng + dLng, s.lat + dLat]);
    count++;
  }
  if (count > 0) {
    map.fitBounds(bounds, { padding: getMobileMapPadding(), pitch: 44, maxZoom: 16.4, duration: 820, easing: SMOOTH_EASE });
  }
}

function setWorkspace(ws, options = {}) {
  uiWorkspace = ws === 'scout' ? 'scout' : 'explore';
  const isScout = uiWorkspace === 'scout';
  if (scout) scout.setActive(isScout);

  byId('explore-panel').hidden = isScout;
  byId('scout-panel').hidden = !isScout;
  const inspection = byId('inspection');
  if (isScout) byId('scout-panel').before(inspection);
  else byId('explore-inspection').append(inspection);
  byId('ws-explore').classList.toggle('active', !isScout);
  byId('ws-explore').setAttribute('aria-selected', String(!isScout));
  byId('ws-scout').classList.toggle('active', isScout);
  byId('ws-scout').setAttribute('aria-selected', String(isScout));

  if (!isScout && pendingScoutSite) setPendingScoutSite(null);
  syncMapDataSources();
  if (isScout) {
    renderScoutPanel();
    if (!options.keepCamera && (scout.getState().siteA || scout.getState().siteB)) fitScoutSites();
    if (window.innerWidth <= 760 && !options.keepCamera) setMobileSheetState('mid');
  }
  syncViewButtonsUI();
  updateScoutBadge();
}

byId('ws-explore').onclick = () => setWorkspace('explore');
byId('ws-scout').onclick = () => setWorkspace('scout');
if (byId('hdr-scout-btn')) byId('hdr-scout-btn').onclick = () => setWorkspace(uiWorkspace === 'scout' ? 'explore' : 'scout');
function toggleMapScout() {
  const visible = isFullscreenMap ? document.body.classList.contains('fs-show-panel') : !isPanelHidden;
  const next = uiWorkspace === 'scout' && visible ? 'explore' : 'scout';
  setPanelHidden(false);
  setWorkspace(next);
}
if (byId('map-scout-toggle')) byId('map-scout-toggle').onclick = toggleMapScout;
if (byId('hdr-search-btn')) {
  byId('hdr-search-btn').onclick = () => {
    setPanelHidden(false);
    if (uiWorkspace !== 'explore') setWorkspace('explore', { keepCamera: true });
    if (byId('explore-panel')?.classList.contains('detail-open')) clearInspection();
    if (window.innerWidth <= 760) setMobileSheetState('mid');
    setTimeout(() => byId('query')?.focus(), 60);
  };
}

function formatDecisionLabel(dec) {
  if (dec === 'site_a') return 'Choose Site A';
  if (dec === 'site_b') return 'Choose Site B';
  if (dec === 'need_more_info') return 'Need more information';
  if (dec === 'service_checked') return 'Service options checked';
  return 'Undecided';
}

function makeEvidenceBtn(count, label, title, subtitle, records, distByUid) {
  const btn = el('button', `${count}${label ? ' ' + label : ''}`, 'count-link');
  btn.type = 'button';
  btn.title = 'Click to view the exact underlying records';
  btn.onclick = () => {
    activeEvidence = { title, subtitle, records: records || [], distByUid: distByUid || null };
    renderScoutPanel();
  };
  return btn;
}

function renderScoutPanel() {
  const root = byId('scout-panel');
  if (!root || !scout) return;

  const st = scout.getState();
  const prog = scout.getProgress();
  const comp = scout.getComparison();
  const cats = scout.getAvailableCategories();
  const briefs = scout.getSavedBriefs();

  root.replaceChildren();

  // Header + Reset button
  const head = el('div', '', 'scout-header');
  const titleTxt = st.role === 'citizen'
    ? 'Find a local service'
    : (st.role === 'investor' ? 'Market Scout · Investor' : 'Scout a business location');
  const titleWrap = document.createElement('div');
  titleWrap.append(
    el('h1', titleTxt),
    el('div', 'Optional mission · Transparent comparison from real mapped records', 'scout-meta-sub')
  );
  const resetBtn = el('button', 'Reset', 'btn-ghost btn-sm');
  resetBtn.type = 'button';
  resetBtn.title = 'Clear active mission sites and start fresh (keeps saved briefs)';
  resetBtn.onclick = () => {
    setPendingScoutSite(null);
    activeEvidence = null;
    scout.resetMission(true);
    syncMapDataSources();
    renderScoutPanel();
    updateScoutBadge();
    setStatus('Market Scout mission reset. Saved scouting briefs were preserved.');
  };
  head.append(titleWrap, resetBtn);
  root.append(head);

  // Role switcher (Entrepreneur | Investor | Citizen — reuses same map & evidence panel)
  const roleBar = el('div', '', 'scout-role-tabs');
  roleBar.setAttribute('role', 'tablist');
  roleBar.setAttribute('aria-label', 'Scouting role');
  [
    { id: 'entrepreneur', label: 'Entrepreneur' },
    { id: 'investor', label: 'Investor' },
    { id: 'citizen', label: 'Citizen' }
  ].forEach(r => {
    const b = el('button', r.label, 'role-btn' + (st.role === r.id ? ' active' : ''));
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(st.role === r.id));
    b.onclick = () => {
      activeEvidence = null;
      scout.setState({ role: r.id });
      syncMapDataSources();
      renderScoutPanel();
      updateScoutBadge();
    };
    roleBar.append(b);
  });
  root.append(roleBar);

  // Deduplicated Explorer Progress Strip (repeat clicks on the same building never increment!)
  const expBar = el('div', '', 'scout-explorer-bar');
  const expLeft = el('span', '');
  expLeft.append(document.createTextNode('Unique places inspected: '), el('strong', String(scout.getUniqueExploredCount())));
  const expRight = el('span', '');
  expRight.append(document.createTextNode('Briefs saved: '), el('strong', String(briefs.length)));
  expBar.append(expLeft, expRight);
  root.append(expBar);

  // 4-step progress pills
  const stepper = el('div', '', 'scout-stepper');
  [
    { n: 1, label: '1. Setup', done: prog.step1 },
    { n: 2, label: '2. Inspect', done: prog.step2 },
    { n: 3, label: '3. Decide', done: prog.step3 },
    { n: 4, label: '4. Brief', done: prog.step4 }
  ].forEach(sp => {
    const cls = sp.done ? 'done' : (prog.currentStep === sp.n ? 'current' : '');
    stepper.append(el('div', (sp.done ? '✓ ' : '') + sp.label, 'step-pill ' + cls));
  });
  root.append(stepper);

  // Active question & next action box
  const promptBox = el('div', '', 'scout-prompt');
  if (prog.currentStep === 1) {
    promptBox.append(
      el('strong', st.role === 'citizen' ? 'Step 1 · Which service & area do you want to check?' : 'Step 1 · Choose a business category & two candidate areas'),
      document.createTextNode(st.role === 'citizen'
        ? 'Pick a service category from the directory and place Site A on the map (add Site B optionally to compare two neighborhoods).'
        : 'Select a real directory category below, then place Site A and Site B on the map to compare equal search circles.')
    );
  } else if (prog.currentStep === 2) {
    const needTxt = [!prog.hasAInspect ? 'Area A' : null, (st.siteB && !prog.hasBInspect) ? 'Area B' : null].filter(Boolean).join(' and ');
    promptBox.append(
      el('strong', `Step 2 · Inspect a mapped building or establishment in ${needTxt}`),
      document.createTextNode('Click any building roof/wall or pin inside the circle—or click a count in the table below. If an area has sparse data, record that observation instead.')
    );
  } else if (prog.currentStep === 3) {
    promptBox.append(
      el('strong', st.role === 'citizen' ? 'Step 3 · Save a useful place or flag missing local info' : 'Step 3 · Compare traceable evidence and record your decision'),
      document.createTextNode(st.role === 'citizen'
        ? 'Click any count to inspect mapped options near your point, then save a useful place to My Checkpoints or flag missing service info.'
        : 'Click any count to see its underlying records. Choose Site A, Site B, or "Need more information" with one field-visit question.')
    );
  } else {
    promptBox.append(
      el('strong', prog.step4 ? 'Mission brief saved! You can move sites or explore freely.' : 'Step 4 · Save your scouting brief'),
      document.createTextNode(prog.step4
        ? 'Your brief is saved locally as a Player note and restores after refresh. Try moving Site A or Site B to compare another block.'
        : 'Save the two locations, category, radius, findings, decision reason, and field-visit question below.')
    );
  }
  root.append(promptBox);

  // -------------------------------------------------------------------------
  // CARD 1: STEP 1 — CATEGORY, SITE A / SITE B, SHARED RADIUS, PARTNERS
  // -------------------------------------------------------------------------
  const c1 = el('div', '', 'scout-card');
  c1.append(el('h3', '1 · Category, Candidate Sites & Radius'));

  // One-click real San Fernando starter scenarios (shown when starting fresh)
  if (!st.siteA && !st.siteB) {
    c1.append(el('div', 'Quick-start San Fernando scenarios (optional):', 'scout-meta-sub'));
    const pList = el('div', '', 'preset-list');
    for (const p of scout.getPresets()) {
      const pb = el('button', '', 'preset-btn');
      pb.type = 'button';
      pb.dataset.preset = p.id;
      pb.append(el('strong', p.title), el('span', p.subtitle));
      pb.onclick = () => {
        activeEvidence = null;
        scout.applyPreset(p.id);
        syncMapDataSources();
        fitScoutSites();
        renderScoutPanel();
        updateScoutBadge();
        setStatus(`Loaded scenario: ${p.title}. Drag A or B on the map anytime to adjust.`);
      };
      pList.append(pb);
    }
    c1.append(pList);
  }

  const catLabel = el('label', st.role === 'citizen' ? 'Local service category (from city directory)' : 'Business category (from city directory)');
  catLabel.setAttribute('for', 'scout-cat-select');
  const catSel = document.createElement('select');
  catSel.id = 'scout-cat-select';
  const blankOpt = document.createElement('option');
  blankOpt.value = '';
  blankOpt.textContent = `— Choose from ${cats.length} directory categories —`;
  catSel.append(blankOpt);
  for (const c of cats) {
    const opt = document.createElement('option');
    opt.value = c.name;
    opt.textContent = `${c.name} (${c.total} mapped)`;
    catSel.append(opt);
  }
  catSel.value = st.category || '';
  catSel.onchange = () => {
    activeEvidence = null;
    scout.setState({ category: catSel.value, partnerCategories: [] });
    syncMapDataSources();
    renderScoutPanel();
    updateScoutBadge();
  };
  c1.append(catLabel, catSel);

  // Place / Move Site A & Site B buttons (shape + letter distinct without color)
  const siteGrid = el('div', '', 'site-actions');
  const mkSiteBtn = (which, siteObj) => {
    const btn = el('button', '', `site-btn site-btn-${which.toLowerCase()}` + (pendingScoutSite === which ? ' placing' : ''));
    btn.type = 'button';
    btn.id = `scout-place-${which.toLowerCase()}`;
    const tag = el('span', '', 'site-tag');
    tag.append(
      el('span', which, `sym-${which.toLowerCase()}`),
      document.createTextNode(pendingScoutSite === which
        ? `Click map for ${which}…`
        : (siteObj ? `Move Site ${which}` : (which === 'B' && st.role === 'citizen' ? 'Add Site B (opt.)' : `Place Site ${which}`)))
    );
    const sub = siteObj
      ? `${siteObj.barangay} (${siteObj.lat.toFixed(4)}, ${siteObj.lng.toFixed(4)})`
      : (which === 'A' ? 'Solid ring · not placed' : 'Dashed ring · not placed');
    btn.append(tag, el('span', sub, 'scout-meta-sub'));
    btn.onclick = () => setPendingScoutSite(pendingScoutSite === which ? null : which);
    return btn;
  };
  siteGrid.append(mkSiteBtn('A', st.siteA), mkSiteBtn('B', st.siteB));
  c1.append(siteGrid);
  if (st.siteA || st.siteB) {
    c1.append(el('div', 'Tip: Drag the A or B badge directly on the map to compare another block live.', 'drag-tip'));
  }

  // Shared comparison radius selector (default 500 m)
  const radBar = el('div', '', 'radius-bar');
  radBar.append(el('span', 'Shared radius:'));
  [250, 500, 750, 1000].forEach(rm => {
    const rb = el('button', `${rm} m`, 'rad-btn' + (st.radiusM === rm ? ' active' : ''));
    rb.type = 'button';
    rb.onclick = () => {
      activeEvidence = null;
      scout.setState({ radiusM: rm });
      syncMapDataSources();
      renderScoutPanel();
      updateScoutBadge();
    };
    radBar.append(rb);
  });
  c1.append(radBar);

  // Related partner categories (Entrepreneur & Investor)
  if (st.role !== 'citizen' && st.category) {
    const pWrap = el('div', '', 'partner-wrap');
    pWrap.append(el('div', 'Related partner categories to check (up to 3):', 'scout-meta-sub'));
    const pChips = el('div', '', 'partner-chips');
    const suggested = scout.getSuggestedPartners(st.category);
    const shown = [...new Set([...st.partnerCategories, ...suggested])];
    for (const pc of shown) {
      const active = st.partnerCategories.includes(pc);
      const chip = el('button', (active ? '✓ ' : '+ ') + pc, 'partner-chip' + (active ? ' active' : ''));
      chip.type = 'button';
      chip.onclick = () => {
        activeEvidence = null;
        let next = st.partnerCategories.slice();
        if (active) next = next.filter(x => x !== pc);
        else if (next.length < 3) next.push(pc);
        else setStatus('Up to 3 partner categories can be compared at once.');
        scout.setState({ partnerCategories: next });
        syncMapDataSources();
        renderScoutPanel();
      };
      pChips.append(chip);
    }
    pWrap.append(pChips);

    if (st.partnerCategories.length < 3) {
      const addSel = document.createElement('select');
      addSel.className = 'partner-add-select';
      addSel.setAttribute('aria-label', 'Add another directory category as partner');
      const ph = document.createElement('option');
      ph.value = '';
      ph.textContent = '+ Add any other directory category…';
      addSel.append(ph);
      for (const c of cats) {
        if (c.name === st.category || st.partnerCategories.includes(c.name)) continue;
        const opt = document.createElement('option');
        opt.value = c.name;
        opt.textContent = `${c.name} (${c.total})`;
        addSel.append(opt);
      }
      addSel.onchange = () => {
        if (!addSel.value) return;
        activeEvidence = null;
        scout.setState({ partnerCategories: [...st.partnerCategories, addSel.value] });
        syncMapDataSources();
        renderScoutPanel();
      };
      pWrap.append(addSel);
    }
    c1.append(pWrap);
  }
  root.append(c1);

  // -------------------------------------------------------------------------
  // CARD 2: STEP 2 — INSPECTION PROGRESS (ANTI-REPEAT + SPARSE FALLBACK)
  // -------------------------------------------------------------------------
  if (st.siteA || st.siteB) {
    const c2 = el('div', '', 'scout-card');
    c2.append(el('h3', '2 · Area Inspection (1 unique place per area)'));
    const grid = el('div', '', 'inspect-status');

    const addInspectBox = (which, siteObj, inspectedList, ev) => {
      const box = el('div', '', 'inspect-box' + (inspectedList.length > 0 ? ' done' : ''));
      const heading = el('strong', `Area ${which}${siteObj ? ` · ${siteObj.barangay}` : ''}`);
      box.append(heading, document.createElement('br'));
      if (!siteObj) {
        box.append(el('span', 'Place site first', 'scout-meta-sub'));
      } else if (inspectedList.length > 0) {
        box.append(document.createTextNode(`✓ ${inspectedList.length} inspected: ${inspectedList[0].label}`));
      } else {
        box.append(document.createTextNode('Click a building or pin inside circle'));
      }
      if (siteObj && ev && (ev.isSparse || ev.matchCount === 0)) {
        const hasSparse = inspectedList.some(x => x.kind === 'sparse_note');
        const spBtn = el('button', hasSparse ? '✓ Sparse coverage logged' : 'Record sparse-area observation', 'scout-sparse-btn');
        spBtn.type = 'button';
        spBtn.onclick = () => {
          scout.recordSparseObservation(which, `Area ${which} (${siteObj.barangay}) has ${ev.matchCount} mapped ${st.category || 'target'} matches and ${ev.totalDistinct} total mapped places within ${st.radiusM} m — field verification required.`);
          renderScoutPanel();
          updateScoutBadge();
          setStatus(`Recorded sparse-area observation for Area ${which} (Player note).`);
        };
        box.append(spBtn);
      }
      grid.append(box);
    };

    addInspectBox('A', st.siteA, st.inspectedA, comp.evalA);
    if (st.role !== 'citizen' || st.siteB) {
      addInspectBox('B', st.siteB, st.inspectedB, comp.evalB);
    }
    c2.append(grid);
    root.append(c2);
  }

  // -------------------------------------------------------------------------
  // CARD 3: STEP 3 — TRACEABLE COMPARISON TABLE, EVIDENCE DRAWER & FINDINGS
  // -------------------------------------------------------------------------
  if (st.category && (comp.evalA || comp.evalB)) {
    const c3 = el('div', '', 'scout-card');
    const c3Head = el('div', '', 'evidence-drawer-head');
    c3Head.append(el('span', `3 · Traceable Comparison (${st.radiusM} m radius)`));
    const fitBtn = el('button', 'Fit sites', 'btn-sm');
    fitBtn.type = 'button';
    fitBtn.onclick = fitScoutSites;
    c3Head.append(fitBtn);
    c3.append(c3Head);

    // Investor shortlist card (transparent facts only — never rent or returns)
    if (st.role === 'investor') {
      const sl = el('div', '', 'scout-shortlist');
      sl.append(
        el('strong', 'Investor shortlist snapshot: '),
        document.createTextNode(
          `A: ${st.siteA ? st.siteA.barangay : '—'} (${comp.evalA ? comp.evalA.matchCount : 0} mapped ${st.category}, ${comp.evalA ? comp.evalA.multiTenantBuildings.length : 0} footprints with multiple places)` +
          (st.siteB ? ` · B: ${st.siteB.barangay} (${comp.evalB.matchCount} mapped ${st.category}, ${comp.evalB.multiTenantBuildings.length} footprints with multiple places)` : '') +
          ` · Status: ${formatDecisionLabel(st.decision)}.`
        )
      );
      c3.append(sl);
    }

    const showB = Boolean(comp.evalB || st.role !== 'citizen');
    const tbl = el('table', '', 'cmp-table');
    const thead = document.createElement('thead');
    const htr = document.createElement('tr');
    htr.append(el('th', 'Metric (click count)'));
    const thA = el('th', '');
    thA.append(el('span', 'A', 'sym-a'), document.createTextNode(' Site A'));
    htr.append(thA);
    if (showB) {
      const thB = el('th', '');
      thB.append(el('span', 'B', 'sym-b'), document.createTextNode(' Site B'));
      htr.append(thB);
    }
    thead.append(htr);
    tbl.append(thead);

    const tbody = document.createElement('tbody');
    const addMetricRow = (metricLabel, renderCellFn) => {
      const tr = document.createElement('tr');
      tr.append(el('td', metricLabel));
      const tdA = document.createElement('td');
      renderCellFn(tdA, comp.evalA, 'A');
      tr.append(tdA);
      if (showB) {
        const tdB = document.createElement('td');
        renderCellFn(tdB, comp.evalB, 'B');
        tr.append(tdB);
      }
      tbody.append(tr);
    };

    // Row 1: Distinct category matches
    addMetricRow(`Mapped ${st.category}`, (td, ev, key) => {
      if (!ev) { td.textContent = '—'; return; }
      const dupTxt = ev.matchReconciledDuplicates > 0 ? ` · ${ev.matchReconciledDuplicates} duplicate reconciled` : '';
      td.append(makeEvidenceBtn(
        ev.matchCount, '',
        `Area ${key} · ${st.category} (${ev.matchCount} distinct)`,
        `Within ${st.radiusM} m of ${ev.site.barangay}${dupTxt}`,
        ev.matchRecords, ev.distByUid
      ));
    });

    // Row 2: Official LOCUS SF count — explicitly distinguishes Unknown (not loaded) vs 0!
    addMetricRow('Official LOCUS SF', (td, ev, key) => {
      if (!ev) { td.textContent = '—'; return; }
      if (!comp.officialLoaded) {
        td.append(el('span', 'Unknown (not loaded)', 'scout-unknown'));
      } else {
        const offRecs = ev.matchRecords.filter(r => r.sourceType === 'official');
        td.append(makeEvidenceBtn(
          ev.matchOfficialCount, '',
          `Area ${key} · Official ${st.category} (${ev.matchOfficialCount})`,
          `Verified LOCUS SF thesis listings within ${st.radiusM} m`,
          offRecs, ev.distByUid
        ));
      }
    });

    // Row 3: Community (OSM) matches
    addMetricRow('Community (OSM)', (td, ev, key) => {
      if (!ev) { td.textContent = '—'; return; }
      const commRecs = ev.matchRecords.filter(r => r.sourceType === 'community');
      td.append(makeEvidenceBtn(
        ev.matchCommunityCount, '',
        `Area ${key} · Community OSM ${st.category} (${ev.matchCommunityCount})`,
        `OpenStreetMap snapshot points within ${st.radiusM} m`,
        commRecs, ev.distByUid
      ));
    });

    // Row 4: Partner categories (when chosen)
    if (st.partnerCategories.length > 0) {
      addMetricRow(`Partners (${st.partnerCategories.length} cat.)`, (td, ev, key) => {
        if (!ev) { td.textContent = '—'; return; }
        td.append(makeEvidenceBtn(
          ev.partnerCount, '',
          `Area ${key} · Partner places (${ev.partnerCount})`,
          `Categories: ${st.partnerCategories.join(', ')} within ${st.radiusM} m`,
          ev.partnerRecords, ev.distByUid
        ));
      });
    }

    // Row 5: Multi-tenant buildings
    addMetricRow('Footprints with 2+ places', (td, ev, key) => {
      if (!ev) { td.textContent = '—'; return; }
      const mtRecs = ev.multiTenantBuildings.flatMap(b => b.records);
      td.append(makeEvidenceBtn(
        ev.multiTenantBuildings.length, '',
        `Area ${key} · Multiple places per footprint (${ev.multiTenantBuildings.length} footprints, ${mtRecs.length} places)`,
        'Footprints linked to two or more mapped places in the search area',
        mtRecs, ev.distByUid
      ));
    });

    // Row 6: Unlinked / sidewalk pins needing review
    addMetricRow('Pins for review', (td, ev, key) => {
      if (!ev) { td.textContent = '—'; return; }
      const uncRecs = ev.allRecords.filter(r => r.buildingMatchType === 'uncertain');
      td.append(makeEvidenceBtn(
        ev.uncertainPinCount, '',
        `Area ${key} · Pins outside footprints (${ev.uncertainPinCount})`,
        'Sidewalk/edge pins kept separate for manual building review',
        uncRecs, ev.distByUid
      ));
    });

    // Row 7: Total mapped places in radius
    addMetricRow(`Total mapped (${st.radiusM} m)`, (td, ev, key) => {
      if (!ev) { td.textContent = '—'; return; }
      td.append(makeEvidenceBtn(
        ev.totalDistinct, ev.isSparse ? '· sparse' : '',
        `Area ${key} · All mapped places (${ev.totalDistinct})`,
        `Within ${st.radiusM} m of ${ev.site.barangay}${ev.isSparse ? ' (sparse map coverage)' : ''}`,
        ev.allRecords, ev.distByUid
      ));
    });

    // Overlap row (when Site A and Site B circles overlap!)
    if (comp.overlapInfo && comp.overlapInfo.circlesOverlap) {
      const otr = document.createElement('tr');
      otr.append(el('td', `Overlap (${comp.overlapInfo.centerDistM} m apart)`));
      const otd = document.createElement('td');
      if (showB) otd.colSpan = 2;
      otd.append(makeEvidenceBtn(
        comp.overlapInfo.sharedAll.length,
        `shared (${comp.overlapInfo.sharedMatch.length} ${st.category})`,
        `Shared overlap zone (${comp.overlapInfo.sharedAll.length} places)`,
        `Places inside BOTH Site A and Site B (${comp.overlapInfo.centerDistM} m center distance)`,
        comp.overlapInfo.sharedAll,
        comp.evalA ? comp.evalA.distByUid : null
      ));
      otr.append(otd);
      tbody.append(otr);
    }

    tbl.append(tbody);
    c3.append(tbl);

    // Proportional Visual Evidence Bars (Site A solid navy vs Site B hatched terracotta — readable without color!)
    if (comp.evalA && comp.evalB) {
      const bars = el('div', '', 'cmp-bars');
      const barMetrics = [
        { label: `Mapped ${st.category}`, a: comp.evalA.matchCount, b: comp.evalB.matchCount },
        ...(st.partnerCategories.length > 0 ? [{ label: 'Partner places', a: comp.evalA.partnerCount, b: comp.evalB.partnerCount }] : []),
        { label: 'Footprints with 2+ places', a: comp.evalA.multiTenantBuildings.length, b: comp.evalB.multiTenantBuildings.length },
        { label: `Total mapped (${st.radiusM} m)`, a: comp.evalA.totalDistinct, b: comp.evalB.totalDistinct }
      ];
      for (const bm of barMetrics) {
        const maxV = Math.max(1, bm.a, bm.b);
        const row = el('div', '', 'cmp-bar-row');
        const bHead = el('div', '', 'cmp-bar-head');
        bHead.append(el('span', bm.label), el('span', `A: ${bm.a}  vs  B: ${bm.b}`));
        const tracks = el('div', '', 'cmp-bar-tracks');
        const trA = el('div', '', 'cmp-track');
        const fA = el('div', '', 'cmp-fill-a');
        fA.style.width = `${Math.round((bm.a / maxV) * 100)}%`;
        trA.append(fA);
        const trB = el('div', '', 'cmp-track');
        const fB = el('div', '', 'cmp-fill-b');
        fB.style.width = `${Math.round((bm.b / maxV) * 100)}%`;
        trB.append(fB);
        tracks.append(trA, trB);
        row.append(bHead, tracks);
        bars.append(row);
      }
      c3.append(bars);
    }

    // Top real mapped categories present inside Area A / Area B (clickable to open records in Evidence Drawer!)
    const addTopCats = (siteKey, ev) => {
      if (!ev || !ev.topCategories || !ev.topCategories.length) return;
      const wrap = el('div', '', 'top-cats-wrap');
      wrap.append(el('div', `Top mapped categories in Area ${siteKey} (${ev.site.barangay}):`, 'scout-meta-sub'));
      const row = el('div', '', 'top-cats-row');
      for (const tc of ev.topCategories) {
        const pill = el('button', `${tc.name} (${tc.count})`, 'top-cat-pill');
        pill.type = 'button';
        pill.onclick = () => {
          activeEvidence = {
            title: `Area ${siteKey} · ${tc.name} (${tc.count})`,
            subtitle: `Real mapped ${tc.name} places within ${st.radiusM} m of ${ev.site.barangay}`,
            records: tc.records,
            distByUid: ev.distByUid
          };
          renderScoutPanel();
        };
        row.append(pill);
      }
      wrap.append(row);
      c3.append(wrap);
    };
    addTopCats('A', comp.evalA);
    addTopCats('B', comp.evalB);

    // Inline Clickable-Count Evidence Drawer
    if (activeEvidence) {
      const drawer = el('div', '', 'evidence-drawer');
      drawer.id = 'scout-evidence-drawer';
      const dHead = el('div', '', 'evidence-drawer-head');
      dHead.append(el('span', activeEvidence.title));
      const closeBtn = el('button', '×', 'saved-del');
      closeBtn.type = 'button';
      closeBtn.setAttribute('aria-label', 'Close evidence list');
      closeBtn.onclick = () => { activeEvidence = null; renderScoutPanel(); };
      dHead.append(closeBtn);
      drawer.append(dHead);
      if (activeEvidence.subtitle) drawer.append(el('div', activeEvidence.subtitle, 'scout-meta-sub'));

      const eList = el('div', '', 'evidence-list');
      if (!activeEvidence.records.length) {
        eList.append(el('div', '0 mapped records in this slice. Check on-site for unlisted establishments.', 'empty-building-note'));
      } else {
        for (const rec of activeEvidence.records) {
          const itemBtn = el('button', '', 'tenant-btn');
          itemBtn.type = 'button';
          const left = el('div', '', 'tenant-main');
          const distM = activeEvidence.distByUid && activeEvidence.distByUid.has(rec.uid)
            ? `${activeEvidence.distByUid.get(rec.uid)} m`
            : '';
          const mLabel = rec.buildingMatchType === 'uncertain' ? 'Pin review' : (rec.linkedBuildingId ? 'Footprint link' : 'Mapped');
          left.append(
            el('span', rec.name, 'tenant-name'),
            el('span', [rec.category, distM, mLabel].filter(Boolean).join(' · '), 'tenant-sub')
          );
          itemBtn.append(
            left,
            el('span', rec.sourceType === 'official' ? 'Official' : 'OSM', 'badge ' + (rec.sourceType === 'official' ? 'badge-official' : 'badge-community'))
          );
          itemBtn.onclick = () => selectRecord(rec);
          eList.append(itemBtn);
        }
      }
      drawer.append(eList);
      c3.append(drawer);
    }

    // Traceable Findings List (each count clickable to inspect exact underlying records)
    const fList = el('div', '', 'finding-list');
    for (const f of comp.findings) {
      const isWarn = ['sparse', 'zero', 'uncertain', 'overlap', 'notice'].includes(f.kind);
      const item = el('div', '', 'finding-item' + (isWarn ? ' warn' : ''));
      item.append(document.createTextNode(f.text));
      if (f.records && f.records.length > 0) {
        item.append(document.createElement('br'));
        const distMap = f.siteKey === 'B' ? comp.evalB?.distByUid : comp.evalA?.distByUid;
        item.append(makeEvidenceBtn(
          f.records.length,
          f.records.length === 1 ? 'record →' : 'records →',
          `Finding evidence (${f.records.length} mapped record${f.records.length === 1 ? '' : 's'})`,
          f.text,
          f.records,
          distMap
        ));
      }
      fList.append(item);
    }
    c3.append(fList);

    // Citizen-specific actions: Save useful place to My Checkpoints OR Flag missing local service
    if (st.role === 'citizen') {
      const citWrap = el('div', '', 'partner-wrap');
      citWrap.append(el('strong', 'Citizen actions (saved locally as Player notes):', 'scout-meta-sub'));
      const targetRec = (selectedUid && registry.getRecordByUid(selectedUid))
        || (comp.evalA && comp.evalA.matchRecords[0])
        || (comp.evalA && comp.evalA.allRecords[0])
        || null;
      const savePlaceBtn = el('button', targetRec ? `Save "${targetRec.name}" to My checkpoints` : 'Select a mapped place to save to checkpoints', 'btn-building-link');
      savePlaceBtn.type = 'button';
      savePlaceBtn.disabled = !targetRec;
      savePlaceBtn.style.marginTop = '5px';
      savePlaceBtn.onclick = () => {
        if (!targetRec || !targetRec.hasValidCoords) return;
        const cpName = `${targetRec.name} (${st.category || targetRec.category})`;
        if (!stops.some(s => s.name === cpName)) {
          stops.push({ name: cpName, point: [targetRec.lat, targetRec.lng], done: false });
          savePins();
        }
        scout.setState({ citizenActionDone: true });
        renderScoutPanel();
        updateScoutBadge();
        setStatus(`Saved "${cpName}" to My checkpoints (Player note).`);
      };
      citWrap.append(savePlaceBtn);

      const flagRow = el('div', '', 'scout-flag-row');
      const flagIn = document.createElement('input');
      flagIn.type = 'text';
      flagIn.placeholder = `Flag missing ${st.category} info near ${st.siteA?.barangay || 'this area'}…`;
      flagIn.value = st.citizenFlagNote || '';
      const flagBtn = el('button', 'Flag missing', 'btn-sm');
      flagBtn.type = 'button';
      flagBtn.onclick = () => {
        const note = flagIn.value.trim() || `Missing ${st.category} listing reported near ${st.siteA?.barangay || 'chosen area'} (field check needed)`;
        scout.setState({ citizenFlagNote: note, citizenActionDone: true });
        renderScoutPanel();
        updateScoutBadge();
        setStatus('Missing service note recorded (Player note — does not modify official data).');
      };
      flagRow.append(flagIn, flagBtn);
      citWrap.append(flagRow);
      c3.append(citWrap);
    }

    // Role-tailored Due-Diligence / Field-Visit Question Suggestions
    if (comp.dueDiligence.length > 0) {
      const ddWrap = el('div', '', 'partner-wrap');
      ddWrap.append(el('div', st.role === 'investor' ? 'Due-diligence questions (click to add to brief):' : 'Suggested field-visit questions (click to use):', 'scout-meta-sub'));
      const ddList = el('div', '', 'scout-due-list');
      for (const qText of comp.dueDiligence) {
        const qb = el('button', `+ ${qText}`, 'scout-due-btn');
        qb.type = 'button';
        qb.onclick = () => {
          scout.setState({ fieldQuestion: qText });
          const qArea = byId('scout-question');
          if (qArea) qArea.value = qText;
          setStatus('Copied question into your field-visit note.');
        };
        ddList.append(qb);
      }
      ddWrap.append(ddList);
      c3.append(ddWrap);
    }

    root.append(c3);

    // -----------------------------------------------------------------------
    // CARD 4: STEP 3 DECISION + STEP 4 SAVE & RESTORE SCOUTING BRIEF
    // -----------------------------------------------------------------------
    const c4 = el('div', '', 'scout-card');
    c4.append(el('h3', '4 · Decision & Save Scouting Brief (Player note)'));

    const decRow = el('div', '', 'decision-row');
    [
      { id: 'site_a', label: 'Site A', disabled: !st.siteA },
      { id: 'site_b', label: 'Site B', disabled: !st.siteB },
      { id: 'need_more_info', label: 'Need more info', disabled: false }
    ].forEach(d => {
      const db = el('button', d.label, 'dec-btn' + (st.decision === d.id ? ' active' : ''));
      db.type = 'button';
      db.disabled = d.disabled;
      db.onclick = () => {
        scout.setState({ decision: d.id });
        renderScoutPanel();
        updateScoutBadge();
      };
      decRow.append(db);
    });
    c4.append(decRow);

    const reasonLbl = el('label', 'Reason for decision (based on mapped evidence)');
    reasonLbl.setAttribute('for', 'scout-reason');
    const reasonTa = document.createElement('textarea');
    reasonTa.id = 'scout-reason';
    reasonTa.placeholder = 'e.g. Area A has more mapped partner stores nearby, while Area B has sparse map coverage and needs an on-site check.';
    reasonTa.value = st.reason || '';
    reasonTa.oninput = () => scout.setState({ reason: reasonTa.value });

    const qLbl = el('label', 'One question to check on a field visit');
    qLbl.setAttribute('for', 'scout-question');
    const qTa = document.createElement('textarea');
    qTa.id = 'scout-question';
    qTa.placeholder = 'e.g. Confirm whether unlisted competitors operate on the ground floor and check pickup/parking access.';
    qTa.value = st.fieldQuestion || '';
    qTa.oninput = () => scout.setState({ fieldQuestion: qTa.value });

    const saveBtn = el('button', 'Save scouting brief', 'btn-primary-scout');
    saveBtn.type = 'button';
    saveBtn.id = 'scout-save-brief';
    saveBtn.onclick = () => {
      if (!st.category || !st.siteA || (st.role !== 'citizen' && !st.siteB)) {
        setStatus('Choose a category and place your candidate site(s) before saving a brief.');
        return;
      }
      const saved = scout.saveBrief();
      renderScoutPanel();
      updateScoutBadge();
      setStatus(`Saved scouting brief for ${saved.category} (${saved.radiusM} m). Restores automatically after refresh.`);
    };

    c4.append(reasonLbl, reasonTa, qLbl, qTa, saveBtn);
    root.append(c4);
  }

  // -------------------------------------------------------------------------
  // SAVED SCOUTING BRIEFS (Player notes — restored across refreshes)
  // -------------------------------------------------------------------------
  const briefCard = el('div', '', 'scout-card');
  briefCard.append(el('h3', `Saved scouting briefs (${briefs.length})`));
  if (!briefs.length) {
    briefCard.append(el('div', 'No saved briefs yet. Complete a comparison above and click "Save scouting brief" to store it locally.', 'scout-meta-sub'));
  } else {
    for (const b of briefs) {
      const bi = el('div', '', 'brief-item');
      const bHead = el('div', '', 'brief-item-head');
      bHead.append(
        el('span', `${b.category || 'General'} · ${b.radiusM} m (${b.role})`),
        el('span', 'Player note', 'badge scout-badge-player')
      );
      const locLine = [
        b.siteA ? `A: ${b.siteA.barangay} (${b.summaryA?.matchCount ?? 0})` : null,
        b.siteB ? `B: ${b.siteB.barangay} (${b.summaryB?.matchCount ?? 0})` : null
      ].filter(Boolean).join(' vs ');
      bi.append(
        bHead,
        el('div', `${locLine} · ${formatDecisionLabel(b.decision)} · ${b.savedAt}`, 'scout-meta-sub')
      );
      if (b.reason) bi.append(el('div', `Reason: ${b.reason}`, 'scout-meta-sub'));
      if (b.fieldQuestion) bi.append(el('div', `Field visit check: ${b.fieldQuestion}`, 'scout-meta-sub'));
      if (b.citizenFlagNote) bi.append(el('div', `Flagged info: ${b.citizenFlagNote}`, 'scout-meta-sub'));

      const bAct = el('div', '', 'brief-actions');
      const restBtn = el('button', 'Restore on map', 'btn-sm');
      restBtn.type = 'button';
      restBtn.onclick = () => {
        activeEvidence = null;
        scout.restoreBrief(b.id);
        syncMapDataSources();
        fitScoutSites();
        renderScoutPanel();
        updateScoutBadge();
        setStatus(`Restored scouting brief: ${b.category} (${b.radiusM} m).`);
      };
      const expBtn = el('button', 'Export JSON', 'btn-sm');
      expBtn.type = 'button';
      expBtn.onclick = () => {
        const blob = new Blob([JSON.stringify(b, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `locus_sf_brief_${(b.category || 'scout').replace(/\s+/g, '_')}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1500);
      };
      const printBtn = el('button', 'Print / PDF', 'btn-sm');
      printBtn.type = 'button';
      printBtn.onclick = () => openPrintableBrief(b);
      const delBtn = el('button', 'Delete', 'btn-ghost btn-sm');
      delBtn.type = 'button';
      delBtn.onclick = () => {
        scout.deleteBrief(b.id);
        renderScoutPanel();
        updateScoutBadge();
      };
      bAct.append(restBtn, expBtn, printBtn, delBtn);
      bi.append(bAct);
      briefCard.append(bi);
    }
  }
  root.append(briefCard);
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function openPrintableBrief(b) {
  const w = window.open('', '_blank', 'width=820,height=920');
  if (!w) { setStatus('Allow pop-ups to open the printable scouting report.'); return; }
  const findingsHtml = (b.findings || []).map(f => `<li>${escapeHtml(f)}</li>`).join('');
  const siteRow = (lbl, s, sum) => s
    ? `<tr><td><strong>Site ${lbl}</strong></td><td>${escapeHtml(s.barangay)} (${s.lat}, ${s.lng})</td><td>${sum?.matchCount ?? 0}</td><td>${b.officialDataLoaded ? (sum?.matchOfficial ?? 0) : 'Unknown (not loaded)'}</td><td>${sum?.matchCommunity ?? 0}</td><td>${sum?.totalMapped ?? 0}${sum?.isSparse ? ' (sparse)' : ''}</td></tr>`
    : '';
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>LOCUS SF Scouting Brief — ${escapeHtml(b.category)}</title>
  <style>body{font:14px/1.55 system-ui,sans-serif;color:#162c40;max-width:760px;margin:28px auto;padding:0 20px}h1{margin:0 0 4px;font-size:22px;color:#123352}.meta{color:#4b6478;font-size:13px;margin-bottom:16px}table{width:100%;border-collapse:collapse;margin:14px 0}th,td{border:1px solid #cbd9e6;padding:7px 9px;text-align:left;font-size:13px}th{background:#eef5fb}.box{background:#f6fafd;border:1px solid #cbd9e6;border-radius:8px;padding:10px 13px;margin:12px 0}.prov{font-size:11.5px;color:#4b6478;border-top:1px solid #d4e1ec;margin-top:20px;padding-top:10px}@media print{button{display:none}}</style></head>
  <body>
    <div style="display:flex;justify-content:space-between;align-items:center"><div><h1>LOCUS SF · Market Scout Brief</h1><div class="meta">City of San Fernando, La Union · Role: ${escapeHtml(b.role)} · Category: <strong>${escapeHtml(b.category)}</strong> · Radius: ${b.radiusM} m · Saved: ${escapeHtml(b.savedAt)}</div></div><button onclick="window.print()" style="padding:7px 14px;border-radius:7px;background:#123352;color:#fff;border:0;cursor:pointer">Print / Save PDF</button></div>
    <table><thead><tr><th>Site</th><th>Barangay & Coordinates</th><th>Distinct Matches</th><th>Official LOCUS SF</th><th>Community OSM</th><th>Total Mapped</th></tr></thead>
    <tbody>${siteRow('A', b.siteA, b.summaryA)}${siteRow('B', b.siteB, b.summaryB)}</tbody></table>
    <div class="box"><strong>Decision:</strong> ${escapeHtml(formatDecisionLabel(b.decision))}<br><strong>Reason (Player note):</strong> ${escapeHtml(b.reason || 'Not provided')}<br><strong>Field-visit verification question:</strong> ${escapeHtml(b.fieldQuestion || 'Not provided')}${b.citizenFlagNote ? `<br><strong>Flagged missing local info:</strong> ${escapeHtml(b.citizenFlagNote)}` : ''}</div>
    <h3>Traceable Mapped Observations</h3><ul>${findingsHtml}</ul>
    <div class="prov"><strong>Data Provenance Separation:</strong><br>• Official LOCUS SF: ${escapeHtml(b.provenance?.official || '')}<br>• Community Snapshot: ${escapeHtml(b.provenance?.community || '')}<br>• Player Notes: ${escapeHtml(b.provenance?.player || '')}<br>Note: Map pin counts do not measure demand, foot traffic, rent, profitability, or investment returns.</div>
  </body></html>`);
  w.document.close();
}

// =========================================================================
// DIRECTORY FILTERS (Source tabs + Search + Category chips + 59 Barangays)
// =========================================================================
function populateBarangayDropdown() {
  const sel = byId('barangay-filter');
  if (!sel) return;
  const list = cityBuildings3DLayer.getBarangayList();
  if (!list.length) return;

  const counts = new Map();
  for (const r of [...registry.getOfficialRecords(), ...registry.getCommunityRecords()]) {
    if (r.barangay) counts.set(r.barangay, (counts.get(r.barangay) || 0) + 1);
  }

  const prevVal = sel.value;
  sel.replaceChildren(el('option', `All ${list.length} official barangays`, ''));
  sel.options[0].value = '';
  for (const b of list) {
    const n = counts.get(b.name) || 0;
    const opt = document.createElement('option');
    opt.value = b.name;
    opt.textContent = n > 0 ? `${b.name} (${n})` : b.name;
    sel.append(opt);
  }
  sel.value = prevVal;
}

byId('barangay-filter').onchange = e => {
  activeBarangay = e.target.value;
  const src = map.getSource('selectedBarangay');
  if (!activeBarangay) {
    if (src) src.setData(collection([]));
  } else {
    const b = cityBuildings3DLayer.getBarangayList().find(x => x.name === activeBarangay);
    if (b) {
      if (src) src.setData(collection([b.feature]));
      map.fitBounds([[b.bbox[0], b.bbox[1]], [b.bbox[2], b.bbox[3]]], { padding: getMobileMapPadding(), pitch: 44, duration: 650 });
    }
  }
  showResults();
};

document.querySelectorAll('.cat-chips .cat-chip').forEach(btn => {
  btn.onclick = () => {
    activeCategory = btn.dataset.cat;
    document.querySelectorAll('.cat-chips .cat-chip').forEach(c => c.classList.toggle('active', c === btn));
    showResults();
  };
});

function getFilteredRecords() {
  const q = byId('query').value.trim().toLowerCase();
  let list = [];
  if (activeSourceTab === 'official') list = registry.getOfficialRecords();
  else if (activeSourceTab === 'community') list = registry.getCommunityRecords();
  else if (activeSourceTab === 'review') list = registry.getReviewQueueRecords();
  else list = [...registry.getOfficialRecords(), ...registry.getCommunityRecords()];

  if (activeBarangay) {
    list = list.filter(r => (r.barangay || '').toLowerCase() === activeBarangay.toLowerCase());
  }

  if (activeCategory === 'multi') {
    list = list.filter(r => {
      if (!r.linkedBuildingId) return false;
      const g = registry.getEstablishmentsForBuilding(r.linkedBuildingId);
      return (g.official.length + g.community.length) >= 2;
    });
  } else if (activeCategory !== 'all') {
    list = list.filter(r => r.categoryGroup === activeCategory);
  }

  if (!q) return list;
  return list.filter(r => {
    const hay = [
      r.name, r.category, r.officialId || '', r.barangay || '',
      r.buildingName || '', r.linkedBuildingId || '', r.address || '', r.sourceType
    ].join(' ').toLowerCase();
    return hay.includes(q);
  });
}

function updateCountsUI() {
  const s = registry.getSummary();
  const total = s.officialTotal + s.communityCount;
  const reviewTotal = registry.getReviewQueueRecords().length;

  byId('tab-all-n').textContent = total;
  byId('tab-off-n').textContent = s.officialTotal;
  byId('tab-comm-n').textContent = s.communityCount;
  byId('tab-rev-n').textContent = reviewTotal;

  if (byId('stat-mapped')) byId('stat-mapped').textContent = total.toLocaleString();
  if (byId('stat-official')) byId('stat-official').textContent = s.officialTotal.toLocaleString();
  const revTab = document.querySelector('[data-source="review"]');
  if (revTab) revTab.classList.toggle('has-flagged', reviewTotal > 0);

  byId('hdr-community').textContent = `${s.communityCount.toLocaleString()} mapped`;
  const hdrOff = byId('hdr-official');
  hdrOff.textContent = s.officialTotal ? `${s.officialMappedCount}/${s.officialTotal} official` : '0 official';
  hdrOff.classList.toggle('has-data', s.officialTotal > 0);

  byId('official-badge').textContent = s.officialTotal
    ? `${s.officialTotal} loaded`
    : (s.manualLinksCount ? `${s.manualLinksCount} reviewed` : 'Not loaded');
  byId('clear-official').hidden = s.officialTotal === 0;
  byId('review-export-n').textContent = s.manualLinksCount;
  byId('clear-reviews').hidden = s.manualLinksCount === 0;
  byId('official-summary').textContent = s.officialTotal
    ? `${s.schemaMeta.sourceName}: ${s.officialMappedCount} mapped inside city boundary, ${s.officialFlaggedCount} flagged for coordinate review.`
    : 'No official thesis dataset loaded yet. Community OSM points remain separate.';
}

function showResults() {
  const matches = getFilteredRecords();
  const resEl = byId('results');
  const filters = [activeBarangay, activeCategory === 'all' ? '' : document.querySelector('.cat-chip.active')?.textContent];
  byId('filter-current').textContent = filters.filter(Boolean).join(' · ');

  if (activeSourceTab === 'official' && registry.getOfficialRecords().length === 0) {
    byId('count').textContent = '0 official establishments loaded';
    resEl.replaceChildren(el(
      'div',
      'Load an establishment export under Official thesis data & review.',
      'empty-state'
    ));
    return;
  }

  if (activeSourceTab === 'review' && matches.length === 0) {
    byId('count').textContent = '0 records flagged for review';
    resEl.replaceChildren(el('div', 'No records currently flagged for coordinate or building-match review.', 'empty-state'));
    return;
  }

  const s = registry.getSummary();
  const label = activeSourceTab === 'official'
    ? 'official establishments'
    : activeSourceTab === 'review'
      ? `flagged for review (${s.officialFlaggedCount} official · ${s.communityUncertainCount} OSM pin matches)`
      : activeSourceTab === 'community'
        ? 'community mapped places (OSM)'
        : 'places';
  byId('count').replaceChildren(el('strong', `${matches.length.toLocaleString()} ${label}`));
  if (matches.length > 80) byId('count').append(el('span', 'First 80 shown'));

  if (matches.length === 0) {
    resEl.replaceChildren(el('div', 'No matching establishments found for current filters.', 'empty-state'));
    return;
  }

  resEl.replaceChildren(...matches.slice(0, 80).map(r => {
    const b = el('button', '', 'row' + (r.uid === selectedUid ? ' selected' : ''));
    b.type = 'button';
    b.dataset.uid = r.uid;

    const bInfo = (r.sourceType === 'community' && window.LocusBrands)
      ? window.LocusBrands.getBrandInfo(r.osmIndex, r.name)
      : null;
    const top = el('div', '', 'row-top');
    top.append(el('span', r.name, 'row-title'));
    if (r.needsCoordinateReview) top.append(el('span', 'Coord review', 'badge badge-review'));
    else if (r.sourceType === 'official') top.append(el('span', 'Official', 'badge badge-official'));
    else if (r.manualReview) top.append(el('span', 'Linked', 'badge badge-active'));
    else if (r.buildingMatchType === 'uncertain') top.append(el('span', 'Pin review', 'badge badge-review'));
    else if (bInfo) {
      top.append(el(
        'span',
        bInfo.status === 'verified_open' ? 'Audited' : 'Field check',
        'badge ' + (bInfo.status === 'verified_open' ? 'badge-active' : 'badge-review')
      ));
    } else top.append(el('span', 'OSM', 'badge badge-community'));

    const subParts = [r.category];
    if (r.barangay) subParts.push(r.barangay);
    if (r.officialId) subParts.push(`ID ${r.officialId}`);
    const group = InvestorSites.groupFor(r);
    const [color, path] = InvestorSites.icons[group];
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('aria-hidden', 'true');
    icon.classList.add('directory-icon');
    icon.style.color = color;
    const symbol = document.createElementNS(icon.namespaceURI, 'path');
    symbol.setAttribute('d', path);
    icon.append(symbol);
    b.append(icon, top, el('span', subParts.join(' · '), 'row-sub'));
    b.onclick = () => selectRecord(r);
    return b;
  }));
}

function refreshAllViews() {
  syncMapDataSources();
  cityBuildings3DLayer.refreshCoverageColors();
  populateBarangayDropdown();
  renderJumpList();
  updateCountsUI();
  showResults();
  if (uiWorkspace === 'scout') renderScoutPanel();
  updateScoutBadge();
}

// Checkpoints (preserves localStorage key 'quest-atlas-v1-La Union')
let pins = [];

function drawPins() {
  pins.forEach(p => p.remove());
  pins = [];
  const savedEl = byId('saved');
  savedEl.replaceChildren();
  byId('saved-count').textContent = stops.length;

  if (!stops.length) {
    savedEl.append(el('p', 'No saved checkpoints yet. Add one above, then click its location on the map.', 'panel-note'));
    return;
  }

  stops.forEach((s, idx) => {
    const marker = new maplibregl.Marker({ color: s.done ? '#1f7458' : '#d4733b' })
      .setLngLat([s.point[1], s.point[0]])
      .setPopup(new maplibregl.Popup({ offset: 10 }).setText(`${s.name}${s.done ? ' (visited)' : ''}`))
      .addTo(map);
    pins.push(marker);

    const row = el('div', '', 'saved-item');
    const toggleBtn = el('button', `${s.done ? '✓ ' : '○ '}${s.name}`, 'saved-toggle' + (s.done ? ' done' : ''));
    toggleBtn.type = 'button';
    toggleBtn.title = 'Toggle visited status';
    toggleBtn.onclick = () => { s.done = !s.done; savePins(); };

    const goBtn = el('button', 'View', 'saved-go');
    goBtn.type = 'button';
    goBtn.onclick = () => {
      map.easeTo({ center: [s.point[1], s.point[0]], zoom: Math.max(16.6, map.getZoom()), padding: getMobileMapPadding(), duration: 450 });
      marker.togglePopup();
    };

    const delBtn = el('button', '×', 'saved-del');
    delBtn.type = 'button';
    delBtn.setAttribute('aria-label', `Remove checkpoint ${s.name}`);
    delBtn.onclick = () => { stops.splice(idx, 1); savePins(); setStatus('Checkpoint removed.'); };

    row.append(toggleBtn, goBtn, delBtn);
    savedEl.append(row);
  });
}

function savePins() {
  try { localStorage.setItem(storeKey, JSON.stringify(stops)); }
  catch { setStatus('Browser storage unavailable.'); }
  drawPins();
}

function setPinMode(name) {
  if (name) {
    if (pendingScoutSite) setPendingScoutSite(null);
    if (pendingLinkUid) setLinkMode(null);
  }
  pendingPinName = name;
  byId('map').classList.toggle('placing-pin', Boolean(name));
  byId('cancel-pin').hidden = !name;
  setStatus(name ? `Click the map to place checkpoint "${name}".` : '');
}

byId('editor').onsubmit = e => {
  e.preventDefault();
  const val = byId('pin').value.trim();
  if (!val) return;
  setLinkMode(null);
  setPendingScoutSite(null);
  setPinMode(val);
};

byId('cancel-pin').onclick = () => setPinMode('');

// Symbol collision detection hides overlapping icons. Recover the original records
// around a clicked symbol without shifting any point to a different location.
function chooseBusinessAtHit(hits) {
  const first = registry.getRecordByUid(hits[0]?.properties.uid);
  if (!first) return false;
  const records = new Map();
  for (const hit of hits) {
    const record = registry.getRecordByUid(hit.properties.uid);
    if (record) records.set(record.uid, record);
  }
  const anchor = map.project([first.lng, first.lat]);
  const candidates = map.getZoom() >= 15.5
    ? [...registry.getMappedOfficialRecords(), ...registry.getCommunityRecords()]
    : investorSites.nearbyRecords();
  for (const record of candidates) {
    if (!record.hasValidCoords || !businessSourceVisible(record)) continue;
    if (map.project([record.lng, record.lat]).dist(anchor) <= 15) records.set(record.uid, record);
  }
  if (records.size === 1) {
    selectRecord(first);
  } else {
    const content = el('div', '', 'marker-chooser');
    content.append(el('h3', `Mapped places here (${records.size})`));
    const list = el('div', '', 'marker-choices tenant-list');
    for (const item of records.values()) {
      const btn = el('button', '', 'tenant-btn');
      btn.type = 'button';
      btn.append(el('strong', item.name), el('small', item.category + ' · ' + (item.sourceType === 'official' ? 'LOCUS SF' : 'OSM')));
      btn.onclick = () => selectRecord(item);
      list.append(btn);
    }
    content.append(list);
    activePopup?.remove();
    activePopup = new maplibregl.Popup({ offset: 13, maxWidth: '290px' }).setLngLat([first.lng, first.lat]).setDOMContent(content).addTo(map);
  }
  return true;
}

// MAP CLICK HANDLER
// Priority: Market Scout Site Placement -> Pin-to-Building Linking ->
//           Checkpoint Placement -> Neighborhood Cluster -> Direct Pin ->
//           ANY Mapped Building Roof/Wall -> Landmark
// =========================================================================
map.on('click', async e => {
  // 0a. Market Scout Site A / Site B placement (or move!)
  if (pendingScoutSite && scout) {
    const which = pendingScoutSite;
    const placed = scout.setSite(which, e.lngLat.lng, e.lngLat.lat);
    activeEvidence = null;
    setPendingScoutSite(null);
    syncMapDataSources();
    if (uiWorkspace === 'scout') renderScoutPanel();
    updateScoutBadge();
    if (window.innerWidth <= 760) setMobileSheetCollapsed(false);
    setStatus(`Placed Site ${which} in ${placed.barangay} (${scout.getState().radiusM} m circle updated).`);
    return;
  }

  // 0b. Interactive Pin-to-Building Review Link Mode
  if (pendingLinkUid) {
    const bMeta = await cityBuildings3DLayer.pickBuildingAtPointAsync(e.point, e.lngLat);
    if (!bMeta) {
      setStatus('No building footprint at that point. Click directly on a building roof or wall, or press Cancel.');
      return;
    }
    const uid = pendingLinkUid;
    const reviewer = byId('reviewer-name')?.value?.trim() || 'Thesis Auditor';
    const entry = registry.linkRecordToBuilding(uid, bMeta, reviewer);
    setLinkMode(null);
    refreshAllViews();
    const rec = registry.getRecordByUid(uid);
    if (rec) await selectRecord(rec);
    if (entry) setStatus(`Linked "${entry.name}" to building ${bMeta.id} (saved for export).`);
    return;
  }

  // 1. Checkpoint placement mode
  if (pendingPinName) {
    stops.push({ name: pendingPinName, point: [e.lngLat.lat, e.lngLat.lng], done: false });
    const placedName = pendingPinName;
    byId('pin').value = '';
    setPinMode('');
    savePins();
    setStatus(`Checkpoint "${placedName}" saved.`);
    return;
  }

  // 1b. Neighborhood-zoom place clusters -> zoom smoothly into cluster
  const clickVersion = ++inspectionVersion;
  const propertyPin = investorSites.hit(e.point, ['property-pin', 'property-live-halo', 'property-available-badge', 'site-reference']);
  if (propertyPin && (propertyPin.startsWith('live:') || !investorSites.isSelectedSite(propertyPin))) {
    investorSites.goTo(propertyPin);
    return;
  }
  if (map.getLayer('community-cluster-circles')) {
    const cHits = map.queryRenderedFeatures(e.point, { layers: ['community-cluster-circles'] });
    if (cHits.length) {
      const clusterId = cHits[0].properties.cluster_id;
      const coords = cHits[0].geometry.coordinates;
      const src = map.getSource('communityClusters');
      if (src && src.getClusterExpansionZoom) {
        try {
          const z = await src.getClusterExpansionZoom(clusterId);
          if (inspectionVersion !== clickVersion) return;
          map.easeTo({ center: coords, zoom: Math.min(16.6, Math.max(z, map.getZoom() + 1.4)), duration: 500 });
        } catch {
          map.easeTo({ center: coords, zoom: Math.min(16.4, map.getZoom() + 1.6), duration: 500 });
        }
        return;
      }
    }
  }

  // 2. Direct pin / logo / label hit (including highlighted Market Scout target & partner rings!)
  const pinLayers = [...businessHitLayers, 'landmark-labels']
    .filter(id => map.getLayer(id));
  const pinHits = pinLayers.length ? map.queryRenderedFeatures(e.point, { layers: pinLayers }) : [];
  if (pinHits.length) {
    const top = pinHits[0];
    if (top.layer.id === 'landmark-labels') {
      const lm = VERIFIED_LANDMARKS.find(item => item.id === top.properties.id);
      if (lm) { selectLandmark(lm); return; }
    } else {
      if (chooseBusinessAtHit(pinHits)) return;
    }
  }

  if (propertyPin) { investorSites.goTo(propertyPin); return; }
  const boundary = investorSites.hit(e.point, ['property-boundary']);
  if (boundary) { investorSites.goTo(boundary); return; }
  const landmarkHit = landmark3DLayer.pickLandmarkAtPoint?.(e.point);
  if (landmarkHit) { selectLandmark(landmarkHit); return; }

  // 3. ANY mapped building roof or wall
  if (map.getZoom() >= 12.6) {
    const bMeta = await cityBuildings3DLayer.pickBuildingAtPointAsync(e.point, e.lngLat);
    if (inspectionVersion !== clickVersion) return;
    if (bMeta) {
      selectBuilding(bMeta, { easeTo: false });
      return;
    }
  }

  const land = investorSites.hit(e.point, ['property-fill']);
  if (land) { investorSites.goTo(land); return; }
  // 4. Fallback to verified landmark ring target
  if (map.getLayer('landmark-dots')) {
    const lmHits = map.queryRenderedFeatures(e.point, { layers: ['landmark-dots'] });
    if (lmHits.length) {
      const lm = VERIFIED_LANDMARKS.find(item => item.id === lmHits[0].properties.id);
      if (lm) selectLandmark(lm);
    }
  }
});

// Direct Drag-to-Move for Site A & Site B markers right on the 3D map (hit-tested cleanly across badge + pin tip)
function hitScoutBadge(pointPx) {
  if (!scout || !scout.getState().active) return null;
  const st = scout.getState();
  for (const [which, s] of [['A', st.siteA], ['B', st.siteB]]) {
    if (!s) continue;
    const p = map.project([s.lng, s.lat]);
    if (Math.abs(pointPx.x - p.x) <= 26 && pointPx.y >= p.y - 38 && pointPx.y <= p.y + 18) {
      return which;
    }
  }
  return null;
}

function startDragScoutSite(which) {
  draggingScoutSite = which;
  if (activePopup) { activePopup.remove(); activePopup = null; }
  setHoveredBuildingUI(null);
  map.getCanvas().style.cursor = 'grabbing';

  let dragRafId = null;
  let pendingLL = null;
  const flushDrag = () => {
    dragRafId = null;
    if (!draggingScoutSite || !scout || !pendingLL) return;
    scout.setSiteFast(draggingScoutSite, pendingLL.lng, pendingLL.lat);
    syncScoutMapLayers();
  };
  const onMove = ev => {
    if (!draggingScoutSite || !scout) return;
    pendingLL = ev.lngLat;
    if (!dragRafId) dragRafId = requestAnimationFrame(flushDrag);
  };
  const onUp = ev => {
    if (dragRafId) { cancelAnimationFrame(dragRafId); dragRafId = null; }
    map.off('mousemove', onMove);
    map.off('touchmove', onMove);
    const moved = draggingScoutSite;
    draggingScoutSite = null;
    map.getCanvas().style.cursor = '';
    if (!moved || !scout) return;
    const placed = scout.setSite(moved, ev.lngLat.lng, ev.lngLat.lat);
    activeEvidence = null;
    syncMapDataSources();
    if (uiWorkspace === 'scout') renderScoutPanel();
    updateScoutBadge();
    setStatus(`Moved Site ${moved} to ${placed.barangay} (${scout.getState().radiusM} m comparison updated).`);
  };
  map.on('mousemove', onMove);
  map.on('touchmove', onMove);
  map.once('mouseup', onUp);
  map.once('touchend', onUp);
}

map.on('mousedown', e => {
  if (pendingScoutSite || pendingLinkUid || pendingPinName) return;
  const hit = hitScoutBadge(e.point);
  if (!hit) return;
  e.preventDefault();
  startDragScoutSite(hit);
});
map.on('touchstart', e => {
  if ((e.points && e.points.length !== 1) || pendingScoutSite || pendingLinkUid || pendingPinName) return;
  const hit = hitScoutBadge(e.point);
  if (!hit) return;
  e.preventDefault();
  startDragScoutSite(hit);
});

// Zero-jank rAF-gated Building Hover Highlight (skipped while camera is panning/zooming!)
let hoverRafPending = false;
let lastHoverEvt = null;
map.on('movestart', () => setHoveredBuildingUI(null));
map.on('mousemove', e => {
  if (pendingPinName || pendingScoutSite || draggingScoutSite || map.isMoving()) return;
  lastHoverEvt = e;
  if (hoverRafPending) return;
  hoverRafPending = true;
  requestAnimationFrame(() => {
    hoverRafPending = false;
    const ev = lastHoverEvt;
    if (!ev || pendingPinName || pendingScoutSite || draggingScoutSite || map.isMoving()) return;

    if (!pendingLinkUid && hitScoutBadge(ev.point)) {
      map.getCanvas().style.cursor = 'grab';
      setHoveredBuildingUI(null);
      return;
    }

    if (!pendingLinkUid) {
      const hoverLayers = [...businessHitLayers, 'community-cluster-circles', 'landmark-dots', 'landmark-labels', 'property-pin', 'property-live-halo', 'property-boundary', 'site-reference']
        .filter(id => map.getLayer(id));
      const pinHit = hoverLayers.length && map.queryRenderedFeatures(ev.point, { layers: hoverLayers }).length > 0;
      if (pinHit) {
        map.getCanvas().style.cursor = 'pointer';
        setHoveredBuildingUI(null);
        return;
      }
    }

    const bHit = map.getZoom() >= 13.0 ? cityBuildings3DLayer.pickBuildingAtPoint(ev.point, ev.lngLat) : null;
    setHoveredBuildingUI(bHit);
    if (!pendingLinkUid) map.getCanvas().style.cursor = bHit ? 'pointer' : '';
  });
});

map.getCanvas().addEventListener('mouseleave', () => setHoveredBuildingUI(null));

// =========================================================================
// IMMERSIVE FULLSCREEN, PANEL FOCUS TOGGLE & SMOOTH ORBIT SHOWCASE CONTROLS
// =========================================================================
let isFullscreenMap = false;
let isPanelHidden = cityMapEmbed.enabled;
let autoOrbitRaf = null;
let autoOrbitPrevTs = 0;

function stopAutoOrbit() {
  if (autoOrbitRaf) {
    cancelAnimationFrame(autoOrbitRaf);
    autoOrbitRaf = null;
  }
  const btn = byId('orbit-tour');
  if (btn) {
    btn.classList.remove('active');
    btn.setAttribute('aria-pressed', 'false');
  }
}

function setAutoOrbit(enabled) {
  const next = Boolean(enabled);
  if (!next) {
    stopAutoOrbit();
    setStatus('360° showcase orbit paused.');
    return;
  }
  stopAutoOrbit();
  const btn = byId('orbit-tour');
  if (btn) {
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
  }
  if (map.getPitch() < 28) {
    map.easeTo({ pitch: 54, duration: 520, easing: SMOOTH_EASE });
  }
  setStatus('Cinematic 360° showcase orbit active — drag or click anywhere to pause.');
  autoOrbitPrevTs = performance.now();
  const step = now => {
    const dt = Math.min(0.05, Math.max(0, (now - autoOrbitPrevTs) / 1000));
    autoOrbitPrevTs = now;
    if (map.isMoving() && !autoOrbitRaf) return;
    map.setBearing(map.getBearing() + dt * 9.5);
    autoOrbitRaf = requestAnimationFrame(step);
  };
  autoOrbitRaf = requestAnimationFrame(step);
}

['mousedown', 'wheel', 'touchstart'].forEach(evName => {
  map.getCanvas().addEventListener(evName, () => {
    if (autoOrbitRaf) stopAutoOrbit();
  }, { passive: true });
});

function rotateByDeg(deltaDeg) {
  stopAutoOrbit();
  const targetPitch = map.getPitch() < 12 ? 52 : map.getPitch();
  map.easeTo({
    bearing: map.getBearing() + deltaDeg,
    pitch: targetPitch,
    duration: 480,
    easing: SMOOTH_EASE
  });
}

function syncViewButtonsUI() {
  const fsBtn = byId('fullscreen-btn');
  const mapFsBtn = byId('map-fs-btn');
  const fsLbl = byId('fullscreen-label');
  const pBtn = byId('toggle-panel-btn');
  const fsPanelBtn = byId('fs-show-panel-btn');
  const floatingFsBtn = byId('fs-exit-btn');
  const fsShowingPanel = document.body.classList.contains('fs-show-panel');

  if (fsBtn) {
    fsBtn.classList.toggle('active', isFullscreenMap);
    fsBtn.setAttribute('aria-pressed', String(isFullscreenMap));
    fsBtn.setAttribute('aria-label', isFullscreenMap ? 'Exit full-screen map view' : 'Enter full-screen map view');
  }
  if (mapFsBtn) {
    mapFsBtn.classList.toggle('active', isFullscreenMap);
    mapFsBtn.setAttribute('aria-pressed', String(isFullscreenMap));
    mapFsBtn.setAttribute('aria-label', isFullscreenMap ? 'Exit full-screen map view' : 'Enter full-screen map view');
  }
  if (fsLbl) fsLbl.textContent = isFullscreenMap ? 'Exit' : 'Full screen';

  const hiddenNow = isFullscreenMap ? !fsShowingPanel : isPanelHidden;
  if (pBtn) {
    pBtn.setAttribute('aria-pressed', String(hiddenNow));
    pBtn.setAttribute('aria-label', hiddenNow ? 'Show directory panel' : 'Hide directory panel');
  }
  if (fsPanelBtn) {
    const showingDirectory = !hiddenNow && uiWorkspace !== 'scout';
    const labelSpan = fsPanelBtn.querySelector('span');
    if (labelSpan) labelSpan.textContent = showingDirectory ? 'Hide panel' : 'Directory';
    fsPanelBtn.classList.toggle('active', showingDirectory);
    fsPanelBtn.setAttribute('aria-expanded', String(showingDirectory));
    fsPanelBtn.title = showingDirectory ? 'Hide directory panel (H)' : 'Show directory panel (H)';
  }
  if (cityMapEmbed.enabled) {
    const label = isFullscreenMap ? 'Exit full screen' : 'Full screen';
    floatingFsBtn.querySelector('span').textContent = label;
    floatingFsBtn.setAttribute('aria-label', label);
    floatingFsBtn.title = label;
    byId('side-panel').inert = hiddenNow;
  }
}

function scheduleMapResizeSync() {
  map.resize();
  requestAnimationFrame(() => map.resize());
  setTimeout(() => map.resize(), 270);
}

function setPanelHidden(hidden) {
  const next = Boolean(hidden);
  if (!next && window.innerWidth <= 940) investorSites.closeLivePanel();
  if (!next && window.innerWidth <= 760 && activePopup) {
    activePopup.remove();
    activePopup = null;
  }
  if (isFullscreenMap) {
    document.body.classList.toggle('fs-show-panel', !next);
    isPanelHidden = next;
  } else {
    isPanelHidden = next;
    document.body.classList.toggle('panel-hidden', next);
  }
  if (cityMapEmbed.enabled && window.innerWidth <= 760) {
    if (next) setMobileSheetState('collapsed');
    else if (mobileSheetState === 'collapsed') setMobileSheetState('mid');
  }
  if (window.innerWidth <= 760 && map && typeof map.easeTo === 'function') {
    map.easeTo({ padding: getMobileMapPadding(), duration: 300, easing: SMOOTH_EASE });
  }
  syncViewButtonsUI();
  updateScoutBadge();
  window.dispatchEvent(new CustomEvent('locus:panel-visibility', { detail: { hidden: next } }));
  setStatus(next ? 'Directory panel hidden for open map viewing.' : 'Directory panel shown.');
}

let syncCompactControls = () => { };

async function setFullscreenMap(enable, options = {}) {
  const next = Boolean(enable);
  if (cityMapEmbed.hasParent && !options.fromParent) {
    cityMapEmbed.requestExpanded(next);
    return;
  }
  if (isFullscreenMap === next && !options.fromBrowserEvent) return;
  setMapMoreOpen(false);
  isFullscreenMap = next;
  document.body.classList.toggle('map-fullscreen', next);
  if (next) {
    document.body.classList.toggle('fs-show-panel', cityMapEmbed.hasParent && !isPanelHidden);
    if (cityMapEmbed.enabled) document.body.classList.remove('panel-hidden');
  } else {
    document.body.classList.remove('fs-show-panel');
    document.body.classList.toggle('panel-hidden', isPanelHidden);
  }

  if (!options.fromBrowserEvent && !options.fromParent) {
    if (next && !document.fullscreenElement) {
      if (document.fullscreenEnabled && document.documentElement.requestFullscreen) {
        try { await document.documentElement.requestFullscreen(); } catch { }
      }
    } else if (!next && document.fullscreenElement && document.exitFullscreen) {
      try { await document.exitFullscreen(); } catch { }
    }
  }

  if (cityMapEmbed.enabled) {
    if (next) map.cooperativeGestures.disable();
    else if (!isPropertyDetailEmbed) map.cooperativeGestures.enable();
  }
  syncCompactControls();
  syncViewButtonsUI();
  updateScoutBadge();
  investorSites.syncGeometry();
  scheduleMapResizeSync();
  if (next && openPanelOnFullscreen) {
    openPanelOnFullscreen = false;
    setPanelHidden(false);
  }
  if (next && options.fromParent) byId('fs-exit-btn').focus({ preventScroll: true });
  setStatus(next
    ? 'Full-screen map view active — press F or Esc to return.'
    : 'Exited full-screen map view.');
}

document.addEventListener('fullscreenchange', () => {
  if (cityMapEmbed.hasParent) return;
  const nativeFs = Boolean(document.fullscreenElement);
  if (!nativeFs && isFullscreenMap) {
    setFullscreenMap(false, { fromBrowserEvent: true });
  } else if (nativeFs && !isFullscreenMap) {
    setFullscreenMap(true, { fromBrowserEvent: true });
  }
});

if (byId('fullscreen-btn')) byId('fullscreen-btn').onclick = () => setFullscreenMap(!isFullscreenMap);
if (byId('map-fs-btn')) byId('map-fs-btn').onclick = () => setFullscreenMap(!isFullscreenMap);
if (byId('fs-exit-btn')) byId('fs-exit-btn').onclick = () => setFullscreenMap(cityMapEmbed.enabled && !isFullscreenMap);
if (byId('toggle-panel-btn')) {
  byId('toggle-panel-btn').onclick = () => setPanelHidden(isFullscreenMap ? document.body.classList.contains('fs-show-panel') : !isPanelHidden);
}
if (byId('fs-show-panel-btn')) {
  byId('fs-show-panel-btn').onclick = () => {
    if (uiWorkspace === 'scout') {
      setPanelHidden(false);
      setWorkspace('explore', { keepCamera: true });
      return;
    }
    if (isFullscreenMap) setPanelHidden(document.body.classList.contains('fs-show-panel'));
    else setPanelHidden(cityMapEmbed.enabled && !isPanelHidden);
  };
}
if (byId('orbit-cw')) byId('orbit-cw').onclick = e => rotateByDeg(e.shiftKey ? -45 : 45);
if (byId('orbit-tour')) byId('orbit-tour').onclick = () => setAutoOrbit(!autoOrbitRaf);

const mapMoreToggle = byId('map-more-toggle');
const mapMorePanel = byId('map-more-panel');

function setMapMoreOpen(open, restoreFocus = false) {
  if (!mapMorePanel || mapMorePanel.hidden === !open) return false;
  if (open) {
    setJumpMenuOpen(false);
    investorSites.closeLivePanel();
  }
  mapMorePanel.hidden = !open;
  mapMoreToggle.setAttribute('aria-expanded', String(open));
  if (restoreFocus) mapMoreToggle.focus({ preventScroll: true });
  return true;
}

if (cityMapEmbed.enabled && mapMoreToggle) {
  const compactMap = matchMedia('(max-width: 640px)');
  const floatingBar = byId('map-floating-bar');
  const mobileControls = [
    [document.querySelector('.camera-tools'), mapMorePanel],
    [floatingBar, mapMorePanel],
    [byId('map-scout-toggle'), floatingBar, byId('fs-theme-btn')],
    [byId('orbit-cw'), floatingBar],
    [byId('fs-exit-btn'), byId('map-mobile-dismiss')],
  ].map(([control, container, before]) => ({ control, container, before, parent: control.parentNode, next: control.nextSibling }));

  function arrangeMapControls() {
    setMapMoreOpen(false);
    const useCompact = compactMap.matches && !(isPropertyDetailEmbed && !isFullscreenMap);
    document.documentElement.classList.toggle('map-compact', useCompact);
    byId('jump-btn').setAttribute('aria-label', useCompact ? 'Search landmarks and barangays' : 'Jump to landmark or barangay');
    for (const { control, container, before, parent, next } of mobileControls) {
      if (useCompact) container.insertBefore(control, before ?? null);
      else parent.insertBefore(control, next);
    }
  }

  syncCompactControls = arrangeMapControls;
  arrangeMapControls();
  compactMap.addEventListener('change', arrangeMapControls);
  mapMoreToggle.addEventListener('click', () => setMapMoreOpen(mapMorePanel.hidden));
  document.addEventListener('click', event => {
    if (!mapMorePanel.contains(event.target) && !mapMoreToggle.contains(event.target)) setMapMoreOpen(false);
  });
  mapMorePanel.addEventListener('click', event => {
    const control = event.target.closest('button');
    if (!['downtown', 'city', 'tilt', 'fs-show-panel-btn', 'map-scout-toggle'].includes(control?.id)) return;
    setMapMoreOpen(false, byId('side-panel').inert);
    if (!byId('side-panel').inert) byId('sheet-toggle').focus({ preventScroll: true });
  });
}

syncViewButtonsUI();

// Keyboard shortcuts (ignored when typing in inputs/textareas/selects)
document.addEventListener('keydown', e => {
  if (e.defaultPrevented) return;
  if (e.key === 'Escape') {
    if (setMapMoreOpen(false, true) || investorSites.closeLivePanel(true)) e.preventDefault();
    else if (autoOrbitRaf) stopAutoOrbit();
    else if (isFullscreenMap && !document.fullscreenElement) {
      e.preventDefault();
      setFullscreenMap(false);
    }
    return;
  }
  const tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === 'm') cityMapEmbed.enabled ? toggleMapScout() : setWorkspace(uiWorkspace === 'scout' ? 'explore' : 'scout');
  else if (k === 'f') { e.preventDefault(); setFullscreenMap(!isFullscreenMap); }
  else if (k === 'h') {
    e.preventDefault();
    byId(cityMapEmbed.enabled ? 'fs-show-panel-btn' : 'toggle-panel-btn')?.click();
  }
  else if (k === 'o') { e.preventDefault(); setAutoOrbit(!autoOrbitRaf); }
  else if (k === 'q') { e.preventDefault(); rotateByDeg(-45); }
  else if (k === 'e') { e.preventDefault(); rotateByDeg(45); }
  else if (k === 'j') { e.preventDefault(); setJumpMenuOpen(byId('jump-menu').hidden); }
  else if (k === '/') { e.preventDefault(); byId('hdr-search-btn')?.click(); }
  else if (k === 'd') byId('downtown')?.click();
  else if (k === '3') byId('tilt').click();
  else if (k === 'l') setLightingMode(nextLightingMode());
  else if (k === 'c') byId('city').click();
});

// Source tabs
document.querySelectorAll('.source-tabs .tab').forEach(btn => {
  btn.onclick = () => {
    activeSourceTab = btn.dataset.source;
    document.querySelectorAll('.source-tabs .tab').forEach(t => {
      const active = t === btn;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', String(active));
    });
    showResults();
  };
});

byId('query').oninput = () => {
  const hasVal = byId('query').value.length > 0;
  if (byId('clear-query')) byId('clear-query').hidden = !hasVal;
  if (byId('search-kbd')) byId('search-kbd').hidden = hasVal;
  showResults();
};
if (byId('clear-query')) {
  byId('clear-query').onclick = () => {
    byId('query').value = '';
    byId('query').dispatchEvent(new Event('input'));
    byId('query').focus();
  };
}
if (byId('stat-btn-mapped')) {
  byId('stat-btn-mapped').onclick = () => document.querySelector('.source-tabs .tab[data-source="all"]')?.click();
}
if (byId('stat-btn-official')) {
  byId('stat-btn-official').onclick = () => document.querySelector('.source-tabs .tab[data-source="official"]')?.click();
}
if (byId('stat-btn-avail')) {
  byId('stat-btn-avail').onclick = investorSites.openLivePanel;
}

function syncTiltLabel() {
  const pitch = Math.round(map.getPitch());
  const angled = pitch > 5;
  const tiltBtn = byId('tilt');
  if (tiltBtn) {
    tiltBtn.textContent = angled ? 'Top view' : '3D view';
    tiltBtn.setAttribute('aria-label', angled ? 'Switch to Top view' : 'Switch to 3D view');
    tiltBtn.setAttribute('aria-pressed', String(!angled));
    tiltBtn.classList.toggle('active', angled);
  }
  const { lng, lat } = map.getCenter();
  const z = map.getZoom().toFixed(1);
  byId('map-position').textContent = `${lat.toFixed(4)}° N  ${lng.toFixed(4)}° E  ·  z${z}`;
}

byId('dismiss-detail').onclick = clearInspection;

if (byId('downtown')) {
  byId('downtown').onclick = () => {
    map.easeTo({ ...DOWNTOWN_VIEW, padding: getMobileMapPadding(), duration: 720, easing: SMOOTH_EASE });
  };
}

byId('city').onclick = () => {
  map.fitBounds(cityBounds, { padding: getMobileMapPadding(), pitch: 0, bearing: 0, duration: 850, easing: SMOOTH_EASE });
};

byId('tilt').onclick = () => {
  const is3D = map.getPitch() > 5;
  map.easeTo({
    pitch: is3D ? 0 : DOWNTOWN_VIEW.pitch,
    bearing: is3D ? 0 : DOWNTOWN_VIEW.bearing,
    duration: 720,
    easing: SMOOTH_EASE
  });
};

map.on('pitchend', syncTiltLabel);
map.on('moveend', syncTiltLabel);

// Layer visibility toggles
function setLayersVisibility(ids, visible) {
  const v = visible ? 'visible' : 'none';
  for (const id of ids) {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', v);
  }
}

byId('toggle-official').onchange = e => {
  if (!e.target.checked && registry.getRecordByUid(selectedUid)?.sourceType === 'official') clearInspection();
  setLayersVisibility(['official-dots', 'official-names', 'scout-match-ring-official'], e.target.checked);
  syncMapDataSources();
};
byId('toggle-community').onchange = e => {
  if (!e.target.checked && registry.getRecordByUid(selectedUid)?.sourceType === 'community') clearInspection();
  setLayersVisibility(['scout-partner-ring', 'scout-match-ring', 'scout-match-labels', 'community-dots', 'community-names'], e.target.checked);
  syncMapDataSources();
};
byId('toggle-landmarks').onchange = e => {
  landmark3DLayer.setVisible(e.target.checked);
  setLayersVisibility(['landmark-dots', 'landmark-labels'], e.target.checked);
};
byId('toggle-barangays').onchange = e => setLayersVisibility(['barangay-lines', 'barangay-names'], e.target.checked);

// Offline JSON / CSV official thesis data loader
byId('official-file').onchange = async e => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    let rows = [], reviewedMatches = null, schemaConfig = null;
    if (file.name.toLowerCase().endsWith('.csv')) {
      rows = registry.parseCSV(text);
    } else {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) rows = parsed;
      else if (parsed && Array.isArray(parsed.records || parsed.establishments || parsed.data)) {
        rows = parsed.records || parsed.establishments || parsed.data;
        reviewedMatches = parsed.reviewedMatches || parsed.reviewed_matches || null;
        schemaConfig = parsed.schemaConfig || parsed.schema_config || null;
      }
    }
    const summary = registry.loadOfficialRecords(rows, { sourceName: file.name, reviewedMatches, schemaConfig });
    refreshAllViews();
    setStatus(`Loaded ${summary.officialTotal} official records (${summary.officialMappedCount} mapped, ${summary.officialFlaggedCount} flagged for coordinate review).`);
  } catch (err) {
    setStatus(`Could not read ${file.name}: ${err.message}`);
  } finally {
    e.target.value = '';
  }
};

byId('clear-official').onclick = () => {
  registry.clearOfficialRecords();
  clearInspection();
  refreshAllViews();
  setStatus('Official dataset cleared. Showing community map snapshot only.');
};

// Export / Import / Clear reviewed pin-to-building matches
byId('export-reviews').onclick = () => {
  const links = registry.getManualLinks();
  if (!links.length) {
    setStatus('No reviewed pin links to export yet. Click an amber Pin review dot and link it to a building first.');
    return;
  }
  const payload = {
    schema: 'locus-sf-reviewed-matches-v1',
    city: 'City of San Fernando, La Union (PSGC 103314000)',
    exported_at: new Date().toISOString(),
    count: links.length,
    reviewed_matches: links
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `reviewed_matches_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  setStatus(`Exported ${links.length} reviewed pin link${links.length > 1 ? 's' : ''} to JSON.`);
};

byId('import-reviews-file').onchange = async e => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const arr = Array.isArray(parsed) ? parsed : (parsed.reviewed_matches || parsed.reviewedMatches || []);
    const n = registry.importManualLinks(arr);
    refreshAllViews();
    setStatus(`Imported ${n} reviewed pin link${n !== 1 ? 's' : ''} from ${file.name}.`);
  } catch (err) {
    setStatus(`Could not import reviews: ${err.message}`);
  } finally {
    e.target.value = '';
  }
};

byId('clear-reviews').onclick = () => {
  registry.clearManualLinks();
  refreshAllViews();
  setStatus('Cleared locally saved manual pin links.');
};

// Public integration hook for embedding into the LOCUS SF thesis system
window.LOCUS_SF = {
  map,
  registry,
  scout,
  buildingsLayer: cityBuildings3DLayer,
  livingCityLayer,
  verifiedLandmarks: VERIFIED_LANDMARKS,
  loadProperties: investorSites.load,
  selectPropertyById: investorSites.goTo,
  setColorMode: setMapColorMode,
  setLightingMode,
  setThemeMode: setLightingMode,
  setFullscreen: setFullscreenMap,
  toggleFullscreen: () => setFullscreenMap(!isFullscreenMap),
  setPanelHidden,
  setAutoOrbit,
  setWorkspace,
  setPendingScoutSite,
  setMobileSheetCollapsed,
  setMobileSheetState,
  fitScoutSites,
  renderScoutPanel,
  exportReviewedMatches: () => registry.getManualLinks(),
  loadOfficialRecords(records, options) {
    const summary = registry.loadOfficialRecords(records, options);
    refreshAllViews();
    return summary;
  },
  clearOfficialRecords() {
    const summary = registry.clearOfficialRecords();
    refreshAllViews();
    return summary;
  },
  selectLandmarkById(id) {
    const lm = VERIFIED_LANDMARKS.find(item => item.id === id);
    if (lm) selectLandmark(lm);
  },
  selectRecordByUid(uid) {
    return selectRecord(registry.getRecordByUid(uid));
  },
  selectBuildingById(id) {
    const meta = cityBuildings3DLayer.getBuildingById(id);
    if (meta) selectBuilding(meta, { easeTo: true });
    return meta;
  }
};

investorSites.render();
investorSites.loadLive();
populateBarangayDropdown();
renderJumpList();
updateCountsUI();
showResults();
drawPins();
syncTiltLabel();

if (cityMapEmbed.enabled) {
  document.body.classList.add('panel-hidden');
  setLightingMode('day', { immediate: true });
  syncViewButtonsUI();

  const streetMotion = byId('toggle-street-motion');
  const streetMotionKey = 'locus.city-map.street-motion';
  let frameVisible = !cityMapEmbed.hasParent;

  try { streetMotion.checked = localStorage.getItem(streetMotionKey) !== 'off'; } catch { }

  function syncMapAnimation() {
    const visible = (frameVisible || isFullscreenMap) && !document.hidden;
    livingCityLayer?.setPaused(!visible || !streetMotion.checked);
    if (!visible && autoOrbitRaf) stopAutoOrbit();
  }
  streetMotion.addEventListener('change', () => {
    try { localStorage.setItem(streetMotionKey, streetMotion.checked ? 'on' : 'off'); } catch { }
    syncMapAnimation();
  });
  document.addEventListener('visibilitychange', syncMapAnimation);
  document.addEventListener('fullscreenchange', syncMapAnimation);
  let pendingSubjectProperty = null;
  let subjectPropertyRecord = null;
  let floodLayerVisible = false;
  let floodLayerLoaded = false;

  function syncNearbyButtonLabel(radiusVal, activeState) {
    const btn = document.getElementById('pm-nearby');
    if (!btn) return;
    const label = radiusVal >= 1000 ? `${radiusVal / 1000}km` : `${Math.round(radiusVal)}m`;
    const fullEl = btn.querySelector('.pm-label-full');
    const shortEl = btn.querySelector('.pm-label-short');
    if (fullEl) fullEl.textContent = `${label} nearby`;
    if (shortEl) shortEl.textContent = label;
    if (typeof activeState === 'boolean') {
      btn.classList.toggle('is-active', activeState);
      btn.setAttribute('aria-pressed', String(activeState));
    }
  }

  function applySubjectProperty(raw, opts = {}) {
    if (!raw) return;
    subjectPropertyRecord = raw;
    const showNearby = typeof opts.showNearby === 'boolean' ? opts.showNearby : isOpportunitiesEmbed;
    const radius = Number.isFinite(Number(opts.radius)) && Number(opts.radius) >= 50 ? Number(opts.radius) : initialEmbedRadius;
    if (!map.getSource('propertyPins')) {
      pendingSubjectProperty = { raw, opts: { showNearby, radius } };
      return;
    }
    pendingSubjectProperty = null;
    investorSites.focusSubjectProperty(raw, {
      instant: opts.instant !== false,
      showPopup: !isPropertyDetailEmbed || isFullscreenMap,
      showNearby,
      radius
    });
    if (isPropertyDetailEmbed) {
      ensurePropertyQuickBar();
      syncNearbyButtonLabel(radius, showNearby);
    }
  }

  function ensurePropertyQuickBar() {
    if (document.getElementById('property-mode-bar')) return;
    const bar = document.createElement('div');
    bar.id = 'property-mode-bar';
    bar.className = 'property-mode-bar';
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', 'Subject property map shortcuts');
    bar.innerHTML = `
      <button type="button" class="property-mode-btn" id="pm-recenter" title="Re-center on subject property and show details">
        <span class="pm-dot" aria-hidden="true"></span>
        <span class="pm-label-full">${isOpportunitiesEmbed ? 'Site' : 'Subject property'}</span>
        <span class="pm-label-short">Site</span>
      </button>
      ${isOpportunitiesEmbed ? '' : `<button type="button" class="property-mode-btn" id="pm-nearby" aria-pressed="false" title="Show 500 m nearby businesses around this property">
        <span class="pm-label-full">500m nearby</span>
        <span class="pm-label-short">500m</span>
      </button>`}
      <button type="button" class="property-mode-btn" id="pm-tilt" aria-pressed="true" title="Toggle 3D perspective or top-down view">
        <span>3D</span>
      </button>
    `;
    document.getElementById('map')?.appendChild(bar);
    bar.querySelector('#pm-recenter')?.addEventListener('click', () => {
      if (subjectPropertyRecord) {
        const showNearby = isOpportunitiesEmbed ? true : (bar.querySelector('#pm-nearby')?.getAttribute('aria-pressed') === 'true');
        investorSites.focusSubjectProperty(subjectPropertyRecord, {
          instant: false,
          showPopup: isOpportunitiesEmbed,
          showNearby,
          radius: investorSites.getRadius()
        });
      }
    });
    bar.querySelector('#pm-nearby')?.addEventListener('click', ev => {
      const btn = ev.currentTarget;
      const on = investorSites.setNearby();
      if (typeof on === 'boolean') {
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-pressed', String(on));
      }
    });
    bar.querySelector('#pm-tilt')?.addEventListener('click', ev => {
      const btn = ev.currentTarget;
      const is3D = map.getPitch() > 5;
      map.easeTo({ pitch: is3D ? 0 : 58, bearing: is3D ? 0 : -24, duration: 550, easing: SMOOTH_EASE });
      btn.setAttribute('aria-pressed', String(!is3D));
      btn.textContent = is3D ? '2D' : '3D';
    });
  }

  async function toggleDetailFloodLayer() {
    try {
      if (!floodLayerLoaded) {
        const apiBase = document.documentElement.dataset.apiBase || '../../api';
        const res = await fetch(new URL(apiBase.replace(/\/$/, '') + '/hazards.php?layer=flood', document.baseURI), { credentials: 'same-origin' });
        if (!res.ok) throw new Error('Flood data unavailable');
        const geo = await res.json();
        if (!map.getSource('detailFloodHazards')) {
          map.addSource('detailFloodHazards', { type: 'geojson', data: geo });
        }
        if (!map.getLayer('detail-flood-fill')) {
          map.addLayer({
            id: 'detail-flood-fill',
            type: 'fill',
            source: 'detailFloodHazards',
            paint: { 'fill-color': '#38bdf8', 'fill-opacity': 0.32 }
          }, 'property-fill');
          map.addLayer({
            id: 'detail-flood-line',
            type: 'line',
            source: 'detailFloodHazards',
            paint: { 'line-color': '#0284c7', 'line-width': 2, 'line-dasharray': [3, 2] }
          }, 'property-fill');
        }
        floodLayerLoaded = true;
      }
      floodLayerVisible = !floodLayerVisible;
      const vis = floodLayerVisible ? 'visible' : 'none';
      if (map.getLayer('detail-flood-fill')) map.setLayoutProperty('detail-flood-fill', 'visibility', vis);
      if (map.getLayer('detail-flood-line')) map.setLayoutProperty('detail-flood-line', 'visibility', vis);
      if (cityMapEmbed.hasParent) {
        window.parent.postMessage({ type: 'locus:flood-layer-state', active: floodLayerVisible }, window.origin);
      }
    } catch {
      if (cityMapEmbed.hasParent) {
        window.parent.postMessage({ type: 'locus:flood-layer-state', active: false, error: true }, window.origin);
      }
    }
  }

  if (isPropertyDetailEmbed) ensurePropertyQuickBar();
  const applyPendingSubject = () => {
    if (isPropertyDetailEmbed) ensurePropertyQuickBar();
    if (pendingSubjectProperty) applySubjectProperty(pendingSubjectProperty.raw || pendingSubjectProperty, pendingSubjectProperty.opts || {});
  };
  map.once('style.load', applyPendingSubject);
  map.once('load', applyPendingSubject);

  window.addEventListener('message', event => {
    if (!cityMapEmbed.accepts(event)) return;
    const msg = event.data;
    if (msg?.type === 'locus:city-map-visibility' && typeof msg.visible === 'boolean') {
      frameVisible = msg.visible;
    } else if (msg?.type === 'locus:city-map-expanded' && typeof msg.expanded === 'boolean') {
      setFullscreenMap(msg.expanded, { fromParent: true });
    } else if (msg?.type === 'locus:focus-property' && msg.property) {
      applySubjectProperty(msg.property, { showNearby: msg.showNearby, radius: msg.radius, instant: msg.instant });
    } else if (msg?.type === 'locus:set-screening-radius' && Number.isFinite(Number(msg.radius))) {
      const nextRadius = investorSites.setRadius(Number(msg.radius), { showNearby: msg.showNearby !== false, fit: msg.fit !== false });
      syncNearbyButtonLabel(nextRadius, msg.showNearby !== false);
    } else if (msg?.type === 'locus:set-lighting' && (msg.mode === 'day' || msg.mode === 'night')) {
      setLightingMode(msg.mode);
    } else if (msg?.type === 'locus:toggle-tilt') {
      const is3D = map.getPitch() > 5;
      map.easeTo({ pitch: is3D ? 0 : 58, bearing: is3D ? 0 : -24, duration: 550, easing: SMOOTH_EASE });
      const tiltBtn = document.getElementById('pm-tilt');
      if (tiltBtn) {
        tiltBtn.setAttribute('aria-pressed', String(!is3D));
        tiltBtn.textContent = is3D ? '2D' : '3D';
      }
    } else if (msg?.type === 'locus:fly-to-point' && Number.isFinite(Number(msg.lat)) && Number.isFinite(Number(msg.lng))) {
      const lng = Number(msg.lng), lat = Number(msg.lat);
      const needle = String(msg.name || '').trim().toLowerCase();
      let matchedRecord = null;
      let bestDist = Infinity;
      for (const rec of [...registry.getMappedOfficialRecords(), ...registry.getCommunityRecords()]) {
        if (!rec.hasValidCoords || !businessSourceVisible(rec)) continue;
        const d = LocusMarketScout.haversineM(lng, lat, rec.lng, rec.lat);
        const recName = String(rec.name || '').trim().toLowerCase();
        const nameMatch = Boolean(needle && recName && (recName === needle || recName.includes(needle) || needle.includes(recName)));
        if (nameMatch && d <= 220 && d < bestDist) {
          matchedRecord = rec;
          bestDist = d;
        } else if (!matchedRecord && d <= 28 && d < bestDist) {
          matchedRecord = rec;
          bestDist = d;
        }
      }
      const compactOffset = map.getContainer().clientHeight < 460 ? [0, 62] : [0, 0];
      if (matchedRecord) {
        selectRecord(matchedRecord).then(() => {
          map.flyTo({ center: [matchedRecord.lng, matchedRecord.lat], zoom: Math.max(17.3, map.getZoom()), pitch: 54, offset: compactOffset, duration: 760, essential: true });
          window.dispatchEvent(new CustomEvent('locus:beacon-point', { detail: { lng: matchedRecord.lng, lat: matchedRecord.lat } }));
        });
      } else {
        map.flyTo({ center: [lng, lat], zoom: Math.max(17.3, map.getZoom()), pitch: 54, offset: compactOffset, duration: 760, essential: true });
        showRichCardPopup(lng, lat, {
          kicker: msg.kicker || (msg.kind === 'terminal' ? 'Nearest public transit' : 'Nearby business'),
          badge: msg.distance || '',
          title: msg.name || 'Mapped place',
          subtitle: msg.category || 'Activity center',
          actionLabel: isPropertyDetailEmbed && !isFullscreenMap ? 'Explore in full 3D →' : '',
          onAction: isPropertyDetailEmbed && !isFullscreenMap ? () => setFullscreenMap(true) : null,
          offset: 14
        });
        window.dispatchEvent(new CustomEvent('locus:beacon-point', { detail: { lng, lat } }));
      }
    } else if (msg?.type === 'locus:toggle-flood-layer') {
      toggleDetailFloodLayer();
    } else if (msg?.type === 'locus:resize') {
      map.resize();
    }
    syncMapAnimation();
  });
  syncMapAnimation();
}

// Restore Market Scout only in the standalone explorer.
if (!cityMapEmbed.enabled && scout && scout.getState().active) {
  setWorkspace('scout', { keepCamera: true });
} else {
  updateScoutBadge();
}
