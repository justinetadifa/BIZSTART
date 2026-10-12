const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../assets/js/property-wizard.js'), 'utf8');
const barangays = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/barangays.json'), 'utf8')).barangays;
const between = (start, end) => {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  assert(from >= 0 && to > from, `Production location functions must exist: ${start}`);
  return source.slice(from, to);
};
const fields = {barangay:{value:''}, lat:{value:'16.616596'}, lng:{value:'120.317211'}};
const map = {
  center:null, zoom:null, bounds:null,
  stop(){}, invalidateSize(){},
  setView(center, zoom){this.center=center;this.zoom=zoom;},
  fitBounds(bounds){this.bounds=bounds;},
};
const context = vm.createContext({
  config:{barangays}, BARANGAY_COORDINATES:{}, locationMethod:'pin', locationRevision:0,
  field:name=>fields[name], document:{activeElement:null}, boundaryMap:map,
  point:()=>[Number(fields.lat.value),Number(fields.lng.value)],
  syncLocation:()=>{}, selectLocationMethod:()=>{}, locationStatus:()=>{},
  notify:()=>{}, updateCoordinateDetailsSummary:()=>{}, preview:()=>{}, ready:()=>{},
});
vm.runInContext(between('    function normalizeBarangay', '    function cancelSearch') + between('    function navigateLocation', '    function renderLocationResults'), context);

for (const query of ['Calabugao', 'Brgy. Calabugao', 'Baranggay Calabugao', 'Calabugao, San Fernando, La Union, Philippines']) {
  assert.equal(context.lookupExactBarangay(query).name, 'Calabugao');
}
assert.equal(context.lookupExactBarangay('Barangay IV').name, 'Barangay IV');
assert.equal(context.lookupExactBarangay('Brgy 4').name, 'Barangay IV');
assert.equal(context.lookupExactBarangay('Sibuan Otong').name, 'Sibuan-Otong');
assert.equal(context.lookupExactBarangay('San'), null, 'Ambiguous prefixes must require choosing a match');
assert(context.barangayMatches('San').length > 1);
assert.equal(context.lookupExactBarangay('Unknown barangay'), null);

const savedCoordinates = [fields.lat.value,fields.lng.value];
context.proceedToBarangay('Calabugao', false);
assert.equal(map.center[0], barangays.Calabugao.lat, 'Existing pin must not prevent searching another barangay');
assert.equal(map.center[1], barangays.Calabugao.lng);
assert.equal(fields.barangay.value, 'Calabugao');
assert.deepEqual([fields.lat.value,fields.lng.value], savedCoordinates, 'Barangay references must never overwrite the property coordinates');
assert.equal(context.proceedToBarangay('San'), false);
assert.equal(map.center[1], barangays.Calabugao.lng, 'An ambiguous query must not move to the first match');

context.navigateLocation({kind:'geocode',lat:16.62,lng:120.33,bounds:[[16.61,120.32],[16.63,120.34]],label:'Address reference'},false);
assert.equal(map.bounds[0][0],16.61, 'Real provider bounds should frame the search result');
assert.deepEqual([fields.lat.value,fields.lng.value],savedCoordinates, 'Address geocoding must not silently replace a property pin');
console.log('Property location search regressions passed: aliases, ambiguous choices, map navigation, bounds, and coordinate preservation.');
