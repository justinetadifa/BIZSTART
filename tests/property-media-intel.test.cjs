const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');

(async () => {
  const source = readFileSync('assets/js/property-details-view.js', 'utf8')
    .replace('./utils.js', pathToFileURL(resolve('assets/js/utils.js')).href)
    .replace('./business-opportunities.js', pathToFileURL(resolve('assets/js/business-opportunities.js')).href);

  const {
    propertyMediaDockMarkup,
    derivePropertyApprovedLandUses,
    derivePropertyBusinessRecommendation,
    setupPropertyGallery
  } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

  console.log('=== Running Property Media Intel Bar Tests ===');

  // Test 1: Property 10 / Building Barangay IV matching panel mockup
  const mockProperty = {
    id: 10,
    name: 'Building · Barangay IV',
    barangay: 'Barangay IV',
    category: 'Building',
    zoningClassification: 'C-3',
    proposedActivity: 'gym',
    media: [
      { kind: 'image', source: 'assets/images/Property10.png' },
      { kind: 'image', source: 'assets/images/Property2.png' }
    ]
  };

  const approvedUses = derivePropertyApprovedLandUses(mockProperty);
  assert.deepEqual(approvedUses, ['COMMERCIAL', 'MIXED USE'], 'C-3 zoning must derive Commercial and Mixed Use');

  const bizRec = derivePropertyBusinessRecommendation(mockProperty);
  assert.equal(bizRec.shortLabel, 'GYM', 'Gym activity must produce punchy GYM badge');
  assert.equal(bizRec.id, 'gym');

  const html = propertyMediaDockMarkup(mockProperty, () => 'assets/images/Property10.png', p => p);
  assert(html.includes('class="property-media-intel-bar"'), 'Media dock markup must include property-media-intel-bar');
  assert(html.includes('APPROVED LAND USE'), 'Must render APPROVED LAND USE section label');
  assert(html.includes('pill-landuse'), 'Must render pill-landuse badges');
  assert(html.includes('COMMERCIAL'), 'Must render COMMERCIAL badge');
  assert(html.includes('MIXED USE'), 'Must render MIXED USE badge');
  assert(html.includes('BUSINESS RECOMMENDATION'), 'Must render BUSINESS RECOMMENDATION section label');
  assert(html.includes('pill-biz'), 'Must render pill-biz button');
  assert(html.includes('GYM'), 'Must render GYM recommendation badge');
  assert(html.includes('pill-more'), 'Must render MORE action button');
  assert(html.includes('property-gallery-thumbnails'), 'Must render thumbnail strip alongside capsules');

  // Test 2: CSS rules verification
  const css = readFileSync('assets/css/property-details.css', 'utf8');
  assert(css.includes('.property-media-intel-bar'), 'CSS must define .property-media-intel-bar');
  assert(css.includes('.property-intel-grid'), 'CSS must define .property-intel-grid');
  assert(css.includes('.property-intel-pill.pill-landuse'), 'CSS must define .pill-landuse');
  assert(css.includes('.property-intel-pill.pill-biz'), 'CSS must define .pill-biz');
  assert(css.includes('.property-intel-pill.pill-more'), 'CSS must define .pill-more');

  console.log('✅ ALL PROPERTY MEDIA INTEL BAR TESTS PASSED (100% compliance).');
})();
