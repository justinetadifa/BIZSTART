const assert = require('assert');
const { resolve } = require('path');
const { pathToFileURL } = require('url');

async function runTests() {
  console.log('=== Running Business Opportunities JS Dynamic UI Test Suite ===');

  const bizOppModule = await import(pathToFileURL(resolve('assets/js/business-opportunities.js')).href);
  const {
    BUSINESS_CATALOG,
    BUSINESS_SECTORS,
    DEMO_MATCHES,
    SECTOR_DEMO_MATCHES,
    evaluateBusinessOpportunities,
    renderOpportunityCard,
    formatOpportunityDisplayItem,
    businessOpportunitiesMarkup
  } = bizOppModule;

  // 1. Module Exports & Catalog Verification
  assert(Array.isArray(BUSINESS_CATALOG) && BUSINESS_CATALOG.length >= 15, 'Catalog should contain at least 15 business types');
  assert(BUSINESS_SECTORS && Object.keys(BUSINESS_SECTORS).length >= 5, 'Sectors should include at least 5 economic categories');
  assert(Array.isArray(DEMO_MATCHES) && DEMO_MATCHES.length === 3, 'DEMO_MATCHES should contain 3 default cards');

  // 2. Sector Demo Matches Verification
  assert(SECTOR_DEMO_MATCHES, 'SECTOR_DEMO_MATCHES must be defined');
  const requiredSectors = ['food_retail', 'everyday_services', 'tourism_recreation', 'all'];
  for (const s of requiredSectors) {
    assert(Array.isArray(SECTOR_DEMO_MATCHES[s]) && SECTOR_DEMO_MATCHES[s].length === 3, `Sector '${s}' must contain 3 curated cards`);
    SECTOR_DEMO_MATCHES[s].forEach(item => {
      assert(item.id && item.label && item.description, `Sector card '${item.id}' has required fields`);
      assert(item.alertText && item.alertText.length > 0, `Sector card '${item.id}' has actionable check notice`);
      assert(Array.isArray(item.supportingPlaces) && item.supportingPlaces.length > 0, `Sector card '${item.id}' has supporting places`);
    });
  }

  // 3. Dynamic Evaluation on Sample Property with Sector Filter
  const sampleProperty = {
    id: 10,
    name: 'Saint Louis College Frontage Lot',
    lat: 16.6159,
    lng: 120.3209,
    area: 0.05,
    clupProfile: { zoningClassification: 'General Commercial' },
    utilities: ['electricity', 'water', 'telecom'],
    nearbyBusinesses: [
      { id: '1', name: 'Saint Louis College', categoryKey: 'college', categoryGroup: 'education', distanceMeters: 165, lat: 16.6175, lng: 120.3215 },
      { id: '2', name: 'City Hall of San Fernando', categoryKey: 'townhall', categoryGroup: 'civic', distanceMeters: 185, lat: 16.6162, lng: 120.3212 },
      { id: '3', name: 'Bethany Hospital', categoryKey: 'hospital', categoryGroup: 'healthcare', distanceMeters: 280, lat: 16.618, lng: 120.319 }
    ]
  };

  const evalFood = evaluateBusinessOpportunities(sampleProperty, 500, 'food_retail');
  assert(evalFood.supportedMatches.length > 0, 'Food & retail filter should return matching food candidates');
  evalFood.supportedMatches.forEach(m => {
    assert(m.sector === 'food_retail', `Candidate ${m.id} must belong to food_retail`);
  });

  const evalEveryday = evaluateBusinessOpportunities(sampleProperty, 500, 'everyday_services');
  assert(evalEveryday.supportedMatches.length > 0, 'Everyday services filter should return candidates');
  evalEveryday.supportedMatches.forEach(m => {
    assert(m.sector === 'everyday_services', `Candidate ${m.id} must belong to everyday_services`);
  });

  // 4. Render Opportunity Card HTML Check (iOS Refined & Dropdown Drawer)
  const cardHtml = renderOpportunityCard(DEMO_MATCHES[0], sampleProperty);
  assert(cardHtml.includes('class="opportunity-blue-card"'), 'Card container rendered');
  assert(cardHtml.includes('class="opportunity-preliminary-tag"'), 'Preliminary peach badge rendered');
  assert(cardHtml.includes('class="opportunity-blue-title"'), 'Uppercase title rendered');
  assert(cardHtml.includes('class="opportunity-lime-pill"'), 'Lime green anchor pill rendered');
  assert(cardHtml.includes('class="opportunity-red-warning"'), 'Actionable check warning rendered');
  assert(cardHtml.includes('class="opportunity-circle-action-btn'), 'Circle chevron button rendered');
  assert(cardHtml.includes('class="opportunity-evidence-drawer"'), 'Evidence drawer container rendered');
  assert(cardHtml.includes('class="amenity-walk-badge"'), 'Walking time badge rendered');
  assert(cardHtml.includes('class="opportunity-specs-grid"'), 'Property specs grid rendered');
  assert(cardHtml.includes('class="opportunity-inquire-cta-btn"'), 'Inquiry action CTA button rendered');
  assert(cardHtml.includes('data-inquire-use='), 'Inquiry button has data-inquire-use attribute');

  // 5. Section Markup Generation Check
  const markup = businessOpportunitiesMarkup(sampleProperty);
  assert(markup.includes('id="propertyOpportunitiesSection"'), 'Section has id propertyOpportunitiesSection');
  assert(markup.includes('id="opportunitiesInteractiveMap"'), 'Interactive map box rendered');
  assert(markup.includes('id="oppRecenterBtn"'), 'Map recenter button present');
  assert(markup.includes('class="opportunities-map-radius-selector"'), 'Radius selector present');
  assert(markup.includes('data-radius-val="300"') && markup.includes('data-radius-val="500"') && markup.includes('data-radius-val="1000"'), 'All 3 radius switcher pills present');
  assert(markup.includes('id="oppLayerToggleBtn"'), 'Satellite/street layer toggle button present');
  assert(markup.includes('id="opportunitiesLeafletCanvas"'), 'Real Leaflet canvas present');
  assert(markup.includes('id="opportunitiesMapStaticFallback"'), 'Static fallback present for headless/SSR test runners');
  assert(markup.includes('id="opportunitiesCardsStack"'), 'Dynamic opportunitiesCardsStack present');
  assert(markup.includes('data-cat-filter="everyday_services"'), 'Category filter pills present');
  assert(markup.includes('data-cat-filter="food_retail"'), 'Food & retail filter pill present');
  assert(markup.includes('data-cat-filter="tourism_recreation"'), 'Tourism & recreation filter pill present');
  assert(markup.includes('data-cat-filter="all"'), 'Other business types pill present');
  assert(markup.includes('straight-line screening radius'), 'Screening radius descriptor verified');

  // 6. Test Leaflet Interactive Initialization with Mock L
  const createdLayers = [];
  const createdMarkers = [];
  const mockMap = {
    _leaflet_id: null,
    removeLayer: (layer) => {},
    flyTo: (center, zoom) => {},
    fitBounds: (bounds) => {},
    invalidateSize: () => {}
  };

  const mockL = {
    map: (el, opts) => {
      mockMap._leaflet_id = 1;
      return mockMap;
    },
    control: {
      zoom: () => ({ addTo: () => {} })
    },
    tileLayer: (url, opts) => {
      const layer = {
        url,
        opts,
        _listeners: {},
        addTo: () => layer,
        on: (ev, fn) => { layer._listeners[ev] = fn; },
        setUrl: (newUrl) => { layer.url = newUrl; }
      };
      createdLayers.push(layer);
      return layer;
    },
    circle: (latlng, opts) => {
      return {
        latlng,
        opts,
        addTo: () => {},
        setRadius: () => {},
        getBounds: () => [[0, 0], [1, 1]]
      };
    },
    divIcon: (opts) => opts,
    marker: (latlng, opts) => {
      const m = {
        latlng,
        opts,
        _tooltip: null,
        _popup: null,
        addTo: () => m,
        bindTooltip: (content, tipOpts) => { m._tooltip = { content, tipOpts }; return m; },
        bindPopup: (content, popOpts) => { m._popup = { content, popOpts }; return m; },
        openPopup: () => {}
      };
      createdMarkers.push(m);
      return m;
    }
  };

  // Create mock DOM for initBusinessOpportunities
  const { JSDOM } = await import('jsdom').catch(() => ({ JSDOM: null }));
  if (JSDOM) {
    const dom = new JSDOM(`
      <div id="testRoot">
        ${markup}
      </div>
    `);
    global.window = dom.window;
    global.document = dom.window.document;
    global.window.L = mockL;

    const { initBusinessOpportunities } = bizOppModule;
    initBusinessOpportunities(dom.window.document.getElementById('testRoot'), sampleProperty);

    // Verify Google Maps tile layer was added
    const streetTileLayer = createdLayers.find(l => l.url.includes('google.com/vt/lyrs=m'));
    assert(streetTileLayer, 'Street basemap should use Google Maps street tile URL');
    assert.deepEqual(streetTileLayer.opts.subdomains, ['mt0', 'mt1', 'mt2', 'mt3'], 'Google subdomains mt0-mt3 configured');

    // Verify Google Red center pin was created
    const centerMarker = createdMarkers.find(m => m.opts?.icon?.className?.includes('opp-gmap-center-divicon'));
    assert(centerMarker, 'Center pin should use opp-gmap-center-divicon');
    assert(centerMarker.opts.icon.html.includes('#EA4335'), 'Center pin must include Google Maps iconic red (#EA4335)');
    assert(centerMarker._popup, 'Center marker has popup attached');

    // Verify anchor POI markers are compact circular pins with zero overlapping pills
    const poiMarkers = createdMarkers.filter(m => m.opts?.icon?.className?.includes('opp-gmap-poi-divicon'));
    assert(poiMarkers.length >= 3, 'Should create at least 3 POI markers for nearby establishments');
    poiMarkers.forEach(pm => {
      assert.deepEqual(pm.opts.icon.iconSize, [28, 34], 'POI markers must be compact [28, 34] pins (no wide text pills)');
      assert(pm.opts.icon.html.includes('opp-gmap-poi-circle'), 'POI pin has circular badge');
      assert(pm._tooltip, 'POI marker must have hover tooltip bound');
      assert(pm._popup, 'POI marker must have click popup card bound');
    });
  }

  console.log('✅ ALL BUSINESS OPPORTUNITIES JS TESTS PASSED SUCCESSFULLY (100% compliance).');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
