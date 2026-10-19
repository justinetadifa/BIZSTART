const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

async function run() {
  console.log('=== Running Street View & Nearby Businesses Verification Test ===');

  // 1. Check property-details-view.js markup
  const detailsModule = await import(pathToFileURL(path.resolve('assets/js/property-details-view.js')).href);
  const sampleProp = {
    id: 217,
    name: 'Prime Commercial Corner Lot',
    lat: 16.6159,
    lng: 120.3210,
    barangay: 'Biday',
    city: 'San Fernando City',
    images: ['sample.jpg'],
    category: 'Commercial Land',
    status: 'Available'
  };

  const dockHtml = detailsModule.propertyMediaDockMarkup(sampleProp, (x) => x, (x) => x);
  assert(dockHtml.includes('id="propertyMediaStreetViewPane"'), 'Street view pane must be rendered');
  assert(dockHtml.includes('class="streetview-top-toolbar'), 'Street view top toolbar must be rendered');
  assert(dockHtml.includes('output=embed'), 'Street view must use standard working output=embed');
  assert(!dockHtml.includes('svembed'), 'Deprecated svembed must NOT be used');
  assert(dockHtml.includes('map_action=pano'), 'Direct 360 panorama action must be included');
  assert(dockHtml.includes('earth.google.com/web/search'), 'Google Earth 3D link must be included');
  assert(dockHtml.includes('Launch 360° Street View'), 'Prominent launch button must be present');
  console.log('✅ PASS: property-details-view.js Street View dock markup verified');

  // 2. Check CSS styling
  const css = fs.readFileSync('assets/css/property-presentation.css', 'utf8');
  assert(css.includes('.streetview-viewport-box'), 'CSS must define .streetview-viewport-box');
  assert(css.includes('.streetview-top-toolbar'), 'CSS must define .streetview-top-toolbar');
  assert(css.includes('.streetview-action-pill'), 'CSS must define .streetview-action-pill');
  assert(css.includes('.streetview-overlay-bar'), 'CSS must define .streetview-overlay-bar');
  assert(css.includes('.streetview-launch-btn'), 'CSS must define .streetview-launch-btn');
  console.log('✅ PASS: property-presentation.css Street View styling verified');

  // 3. Verify SurroundingsRadar PHP source code contracts
  const radarPhp = fs.readFileSync('app/Support/SurroundingsRadar.php', 'utf8');
  assert(radarPhp.includes('https://overpass.osm.ch/api/interpreter'), 'SurroundingsRadar must include fast working overpass mirror');
  assert(radarPhp.includes('NearbyBusinesses::directory'), 'SurroundingsRadar must hook into NearbyBusinesses::directory()');
  assert(radarPhp.includes('loadLocalRoads'), 'SurroundingsRadar must define and use loadLocalRoads()');
  assert(radarPhp.includes('roads.geojson'), 'SurroundingsRadar must load roads.geojson as local network fallback');
  console.log('✅ PASS: SurroundingsRadar.php contracts verified');

  console.log('\nAll Street View & Nearby Businesses verification checks passed successfully!');
}

run().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
