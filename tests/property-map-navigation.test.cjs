const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../assets/js/property-wizard.js'), 'utf8');
const between = (start, end) => {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  assert(from >= 0 && to > from, `Production function not found: ${start}`);
  return source.slice(from, to);
};
const oldPlot = [16.615, 120.316];
const target = [16.6215, 120.3892];
const fields = {lat:{value:String(oldPlot[0])}, lng:{value:String(oldPlot[1])}};
for (const field of Object.values(fields)) {
  field.listeners={};
  field.addEventListener=(name,handler)=>{field.listeners[name]=handler;};
}
const pair = {value:target.join(', '),removeAttribute(){},setAttribute(){},focus(){}};
const callbacks = [];
const canvas = {offsetParent:{},scrollIntoView(){this.revealed=true;}};
const map = {
  center:oldPlot.slice(), zoom:15, fits:0,
  stop(){},invalidateSize(){},getZoom(){return this.zoom;},getContainer(){return canvas;},
  setView(coords,zoom){this.center=Array.from(coords);this.zoom=zoom;},
  fitBounds(){this.center=oldPlot.slice();this.fits++;},
};
const marker = {coords:oldPlot.slice(),setLatLng(coords){this.coords=Array.from(coords);}};
const parcel = {getBounds(){return {plot:oldPlot};}};
const elements = {'[data-coordinate-pair]':pair,'[data-location-results]':{replaceChildren(){}},'[data-location-map]':canvas};
const context = vm.createContext({
  window:{L:{}},L:{},boundaryMap:map,parcelLayer:parcel,locationMarker:marker,boundary:{type:'Feature'},
  locationMethod:'draw',locationCapture:null,locationRevision:0,deviceAccuracyLayer:null,step:1,dialog:{open:true},
  field:name=>fields[name],value:name=>fields[name]?.value || '',$:selector=>elements[selector],
  point:()=>fields.lat.value && fields.lng.value ? [Number(fields.lat.value),Number(fields.lng.value)] : null,
  selectLocationMethod(method){context.locationMethod=method;},cancelSearch(){},
  assessHazards(){},preview(){},ready(){},updateCoordinateDetailsSummary(){},
  locationStatus(text){context.status=text;},notify(){},
  requestAnimationFrame(fn){callbacks.push(fn);},setTimeout(fn){callbacks.push(fn);},
  matchMedia:()=>({matches:true}),
});
vm.runInContext(
  between('    const parseCoordinates = ', '    function updateCoordinateDetailsSummary') +
  between('    function place(', '    function attachBoundary(') +
  between('    function applyCoordinates(', "    $('[data-coordinate-apply]')") +
  between('    function handleCoordinateInput(', '    const deviceButton='), context);

assert.equal(context.applyCoordinates(),true);
assert.deepEqual(marker.coords,target,'The marker must use the applied coordinate pair');
assert.deepEqual(map.center,target,'Applying coordinates must center the map on the new pin even when a plot exists');
assert.equal(map.fits,0,'A saved boundary must not override explicit coordinate navigation');
for(const callback of callbacks.splice(0))callback();
assert.deepEqual(map.center,target,'Deferred size updates must preserve the applied map center');
assert.equal(canvas.revealed,true,'Apply should bring the map into view after using offscreen coordinate controls');
assert.equal(fields.lat.value,'16.621500');
assert.equal(fields.lng.value,'120.389200');
assert.equal(context.locationMethod,'pin','Coordinate application should activate the pin workspace');

context.syncLocation(true,'pin');
assert.deepEqual(map.center,target,'Recenter must target the pin rather than the old plot');
context.locationMethod='draw';context.syncLocation(true,'boundary');
assert.deepEqual(map.center,oldPlot,'Explicit plot navigation should still frame the boundary');
assert.equal(map.fits,1);

pair.value='16.631, 120.401';
fields.lng.value='120.317222';
fields.lng.listeners.change();
assert.equal(pair.value,'16.631, 120.401','Numeric-field blur must preserve a pending coordinate pair');
assert.equal(context.applyCoordinates(),true);
assert.equal(fields.lat.value,'16.631000','The nonempty pair must take priority over existing numeric fields');
assert.equal(fields.lng.value,'120.401000');
assert.deepEqual(map.center,[16.631,120.401]);
pair.value='16.61, 181';
assert.equal(context.applyCoordinates(),false);
assert.deepEqual(map.center,[16.631,120.401],'Invalid input must leave the previous confirmed pin and camera intact');
callbacks.splice(0);canvas.revealed=false;pair.value='16.632, 120.402';
assert.equal(context.applyCoordinates(false),true);
for(const callback of callbacks.splice(0))callback();
assert.equal(canvas.revealed,false,'Applying a pending pair during Continue must not scroll the next step back to the map');
console.log('Property map navigation passed: applied coordinates, saved boundary, deferred sizing, pin focus, and plot focus.');
