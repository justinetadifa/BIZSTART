const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('assets/js/city-workspace.js', 'utf8');
const start = source.indexOf('function renderMarkers() {');
const end = source.indexOf('\nfunction setupCardHoverSync()', start);
assert.ok(start >= 0 && end > start, 'Production marker renderer exists');
const objects = [], layers = new Set(), removals = [];
let clusterRefreshes = 0, advanced = false;
const group = {
  addLayers(items) { items.forEach(item => layers.add(item)); },
  addLayer(item) { layers.add(item); },
  removeLayer(item) { removals.push(item); layers.delete(item); },
  refreshClusters() { clusterRefreshes++; },
  clearLayers() { throw new Error('An update must not clear all map markers.'); },
};
const context = vm.createContext({
  markers: group, markerMap: new Map(), filtered: [], activeMarker: null,
  advancedView: () => advanced,
  hasCoordinates: p => Number.isFinite(p.lat) && Number.isFinite(p.lng),
  createPillIcon: (p, hover, selected) => ({id:p.id,hover,selected,advanced}),
  createPopupContent: p => p.name,
  flyToPropertyMarker() {},
  document: { querySelector() { return null; } },
  L: { marker(point, options) {
    const marker = {
      point, icon:options.icon, handlers:{},
      bindPopup(content) { this.content=content; return this; },
      on(name, handler) { this.handlers[name]=handler; return this; },
      setLatLng(next) { this.point=next; },
      setIcon(icon) { this.icon=icon; },
      setPopupContent(content) { this.content=content; },
      setZIndexOffset() {},
    };
    objects.push(marker); return marker;
  } },
});
vm.runInContext(source.slice(start, end), context);
const p1={id:1,name:'First property',lat:16.61,lng:120.31};
const p2={id:2,name:'Selected property',lat:16.62,lng:120.32};
const p3={id:3,name:'Third property',lat:16.63,lng:120.33};
context.filtered=[p1,p2,p3]; context.renderMarkers();
assert.equal(objects.length,3); assert.equal(layers.size,3);
const selected=context.markerMap.get(2); context.activeMarker=selected;
context.filtered=[p3,p2,p1]; context.renderMarkers();
assert.equal(objects.length,3,'Sorting must reuse all existing marker objects');
assert.equal(context.markerMap.get(2),selected,'Sorting must preserve selected marker identity');
assert.equal(removals.length,0,'Sorting must not detach existing pins');

context.filtered=[p1,p2]; context.renderMarkers();
assert.equal(removals.length,1,'Filtering removes only the excluded marker');
assert.equal(layers.size,2); assert.equal(context.markerMap.get(2),selected);
advanced=true; context.renderMarkers();
assert.equal(objects.length,3,'Changing assessment view must reuse markers');
assert.equal(selected.icon.selected,true,'Selected marker keeps its selected styling');
assert.equal(selected.icon.advanced,true,'Assessment view updates marker styling');
assert.equal(clusterRefreshes,1,'Assessment view also refreshes cluster summaries');

context.filtered=[{...p1,name:'Updated property',lat:16.64},p2,p3]; context.renderMarkers();
assert.equal(objects.length,4,'Restoring the excluded listing creates only its missing marker');
assert.equal(context.markerMap.get(1).point[0],16.64,'Changed location updates the existing marker');
assert.equal(context.markerMap.get(1).content,'Updated property','Updated property retains accurate popup text');
assert.equal(context.markerMap.size,3); assert.equal(layers.size,3);

delete group.addLayers;
context.filtered=[p1,p2,p3,{id:4,name:'Fallback',lat:16.65,lng:120.35}];
context.renderMarkers();
assert.equal(layers.size,4,'Marker updates also work without the clustering plugin');
console.log('Map render performance passed: marker reuse, selection, filters, assessment view, coordinates, popups and plugin fallback.');
