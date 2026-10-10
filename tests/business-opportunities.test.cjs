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

  console.log('✅ ALL BUSINESS OPPORTUNITIES JS TESTS PASSED SUCCESSFULLY (100% compliance).');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
