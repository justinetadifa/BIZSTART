'use strict';
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const fs = require('node:fs');
const vm = require('node:vm');
const tools = require('../assets/js/property-editor-tools.js');
const input = {business_type:'cafe', radius_m:500, reference_lat:16.6159, reference_lng:120.3209,
  counts:{places:30, businesses:20, competitors:5, complementary:5, anchors:3},
  source:'Synthetic inventory', observed_at:'2026-10-17T00:00:00Z', coverage:'local_only'};
function evaluate(observations) {
  return JSON.parse(execFileSync('php', ['-r', "require 'app/Support/NearbyBusinessScreening.php'; echo json_encode(App\\Support\\NearbyBusinessScreening::evaluate(json_decode(stream_get_contents(STDIN), true)));"],
    {input:JSON.stringify(observations), encoding:'utf8', windowsHide:true}));
}
let checks = 0;
function check(actual, expected, message) { assert.deepEqual(actual, expected, message); checks++; }
const record = evaluate(input), reference = [input.reference_lat, input.reference_lng];
const result = tools.nearbyScreening(record, reference, 'cafe');
check(result.score, 92.5, 'Client uses full precision server score');
check(result.contribution, 13.88, 'Same 15% contribution as PHP');
check(result.provisional, true, 'Screening is explicitly provisional');
for (const [snapshot, ref, type] of [[record,[16.62,120.33],'cafe'], [record,reference,'retail'], [record,null,'cafe'],
  [null,reference,'cafe'], [{...record,score:100},reference,'cafe'], [{...record,is_verified:true},reference,'cafe'],
  [{...record,model_version:'old-model'},reference,'cafe']]) {
  check(tools.nearbyScreening(snapshot,ref,type),null,'Stale, malformed, or mismatched record never supplies a score');
}
const empty = evaluate({...input,counts:{places:0,businesses:0,competitors:0,complementary:0,anchors:0}});
check(tools.nearbyScreening(empty,reference,'cafe').score,null,'Empty scan stays pending');
// Run the production context resolver against both freshly scanned and reopened observations.
const source = fs.readFileSync('assets/js/property-wizard.js', 'utf8');
const fields = {reference_label:'location',lat:String(reference[0]),lng:String(reference[1]),radar_business_type:'cafe',nearby_screening:JSON.stringify(record)};
const context = vm.createContext({mceWeight:key=>require('../assets/js/mce-active-weights.js').create().weight(key),window:{SFCPropertyEditorTools:tools},boundary:null,radarData:null,
  value:name=>fields[name] || '',point:(lat='lat',lng='lng')=>fields[lat]&&fields[lng]?[Number(fields[lat]),Number(fields[lng])]:null});
vm.runInContext(source.slice(source.indexOf('    function nearbyReferencePoint()'),source.indexOf('    function classify(feature)')),context);
check(context.currentNearbyEvaluation().score,92.5,'Reopening restores the saved provisional preview before any scan');
fields.radar_business_type = 'retail';
check(context.currentNearbyEvaluation(),null,'Changing the selected business profile invalidates saved observations');
fields.radar_business_type = 'cafe'; fields.lat = '16.62';
check(context.currentNearbyEvaluation(),null,'Moving the property pin invalidates saved location observations');
fields.lat = String(reference[0]);
context.radarData = {referenceCoordinates:reference,businessType:'cafe',screening:empty};
check(context.currentNearbyEvaluation().score,null,'New empty scan replaces a previously complete score');
context.radarData = {referenceCoordinates:reference,businessType:'cafe',screening:record};
check(context.currentNearbyEvaluation().score,92.5,'Fresh scan and reopened snapshot resolve the same score');
console.log(`Nearby screening client: ${checks} PHP parity, context and restore checks passed.`);
