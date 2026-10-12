const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const viewSource = fs.readFileSync(path.join(__dirname, '../app/Support/property-wizard-view.php'), 'utf8');
const jsSource = fs.readFileSync(path.join(__dirname, '../assets/js/property-wizard.js'), 'utf8');
const cssSource = fs.readFileSync(path.join(__dirname, '../assets/css/property-wizard.css'), 'utf8');
const barangaysData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/barangays.json'), 'utf8')).barangays;

// 1. Verify 59 official barangays data
assert.equal(Object.keys(barangaysData).length, 59, 'Must have exactly 59 barangays');
for (const [name, info] of Object.entries(barangaysData)) {
  assert(info.psgc && /^0133140\d\d$/.test(info.psgc), `Barangay ${name} must have official PSGC code`);
}

// 2. Verify View has the 4 distinct section cards in Step 1
assert(viewSource.includes('data-section="about"'), 'Section 1: About the Property card must exist');
assert(viewSource.includes('data-section="details"'), 'Section 2: Listing Details card must exist');
assert(viewSource.includes('data-section="pricing"'), 'Section 3: Pricing card must exist');
assert(viewSource.includes('data-section="photos"'), 'Section 4: Property Photos card must exist');

// 3. Verify Required Section 1 elements
assert(viewSource.includes('name="property_name"'), 'Property name input must exist');
assert(viewSource.includes('name="property_subname"'), 'Property subname input must exist');
assert(viewSource.includes('name="description"'), 'Property description textarea must exist');

// 4. Verify Required Section 2 elements
assert(viewSource.includes('name="listing_purpose"'), 'Listing purpose must exist');
assert(viewSource.includes('data-property-category-select'), 'Property category select must exist');
assert(viewSource.includes('data-property-subtype-select'), 'Property subtype select must exist');
assert(viewSource.includes('name="status"'), 'Status select must exist');
assert(viewSource.includes('data-barangay-combobox'), 'Barangay combobox must exist');
assert(viewSource.includes('id="pwBarangayHidden"'), 'Hidden barangay canonical input must exist');
assert(viewSource.includes('id="pwBarangayPsgcHidden"'), 'Hidden barangay PSGC input must exist');
assert(viewSource.includes('id="pwBarangayTextInput"'), 'Searchable text input for barangay must exist');

// 5. Verify Required Section 3 elements
assert(viewSource.includes('id="pwAskingPrice"'), 'Asking price input must exist');
assert(viewSource.includes('name="sale_price_mode"'), 'Sale price mode must exist');
assert(viewSource.includes('data-sale-negotiable'), 'Sale negotiable option must exist');
assert(viewSource.includes('id="pwLeasePrice"'), 'Lease price input must exist');
assert(viewSource.includes('name="lease_price_mode"'), 'Lease price mode must exist');
assert(viewSource.includes('data-lease-negotiable'), 'Lease negotiable option must exist');

// 6. Verify Required Section 4 elements
assert(viewSource.includes('data-photo-gallery-grid'), 'Photo gallery grid must exist');
assert(viewSource.includes('data-photo-drop'), 'Photo dropzone must exist');

// 7. Verify CSS styles exist
assert(cssSource.includes('.pw-section-card'), '.pw-section-card CSS class must exist');
assert(cssSource.includes('.pw-barangay-combobox'), '.pw-barangay-combobox CSS class must exist');
assert(cssSource.includes('.pw-barangay-menu'), '.pw-barangay-menu CSS class must exist');
assert(cssSource.includes('.pw-gallery-card-controls'), '.pw-gallery-card-controls CSS class must exist');
assert(cssSource.includes('.pw-gallery-reorder-btn'), '.pw-gallery-reorder-btn CSS class must exist');

// 8. Verify Combobox List in JS contains all 59 San Fernando City barangays
const listMatch = jsSource.match(/const OFFICIAL_SFC_BARANGAYS = (\[[\s\S]*?\]);/);
assert(listMatch, 'OFFICIAL_SFC_BARANGAYS array must be defined in property-wizard.js');
const parsedList = eval(listMatch[1]);
assert.equal(parsedList.length, 59, 'OFFICIAL_SFC_BARANGAYS must contain exactly 59 items');
assert.equal(parsedList[0].name, 'Abut', 'First barangay must be Abut');
assert.equal(parsedList[58].name, 'Tanquigan', 'Last barangay must be Tanquigan');

// 9. Verify movePhoto function exists and reorder buttons are in syncPhotoUI
assert(jsSource.includes('function movePhoto('), 'movePhoto function must exist in property-wizard.js');
assert(jsSource.includes('data-gallery-move-left'), 'Move left button must be generated in syncPhotoUI');
assert(jsSource.includes('data-gallery-move-right'), 'Move right button must be generated in syncPhotoUI');

// 10. Verify Live Preview updates
assert(viewSource.includes('data-preview-location-badge'), 'Preview location badge must exist');
assert(viewSource.includes('data-preview-negotiable-badge'), 'Preview negotiable badge must exist');
assert(jsSource.includes('data-preview-location-badge'), 'preview() must update location badge');
assert(jsSource.includes('data-preview-negotiable-badge'), 'preview() must update negotiable badge');

console.log('Step 1 Basics UX Improvements: All 10 verification checks passed successfully!');
