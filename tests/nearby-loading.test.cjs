'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const editorTools=require('../assets/js/property-editor-tools.js');
const source=fs.readFileSync('assets/js/property-wizard.js','utf8');
const functions=source.slice(source.indexOf('    function applyRadarPayload('),source.indexOf('    function processRadarData('));
assert(functions.includes('async function fetchRadar'));
const fixture={type:'FeatureCollection',features:[],coverage:'local_only',source:'Local test inventory',metrics:{observedBusinessCount:0}};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let checks=0;
const check=(a,b,message)=>{assert.deepEqual(a,b,message);checks++;};
function harness(get) {
  const results=[],states=[];
  const context=vm.createContext({window:{SFCPropertyEditorTools:{...editorTools,boundedRequest:(request,signal)=>editorTools.boundedRequest(request,signal,30)}},
    radarPendingKey:'',radarRefreshing:false,radarState:'idle',radarError:null,radarData:null,radarController:null,radarRevision:0,
    AbortController,dialog:{open:true},field:()=>null,get,queueAutosave(){},processRadarData:reference=>results.push([...reference]),renderRadarUI:()=>states.push(context.radarState),ready(){},radarContextIsCurrent:()=>context.radarData?.referenceCoordinates?.[0]===context.reference?.[0]});
  context.reference=[16.6159,120.3209];vm.runInContext(functions,context);
  return {context,results,states,run:(ref=context.reference,force=false)=>context.fetchRadar(ref,'cafe',force)};
}
(async()=>{
  let calls=[],finishLive;
  const first=harness((url)=>{calls.push(url);return url.includes('source=local')?Promise.resolve(fixture):new Promise(resolve=>{finishLive=resolve;});});
  const pending=first.run();await pause(2);
  check(first.context.radarState,'success','Local result renders while live mapping remains pending');
  check(first.context.radarRefreshing,true,'Live enrichment is tracked independently of the loaded list');
  await first.run();check(calls.length,2,'Repeated synchronization does not restart the same request');
  finishLive({...fixture,coverage:'mapped_only'});await pending;
  check(first.context.radarRefreshing,false,'Live completion clears pending state');
  await first.run();check(calls.length,2,'Current successful result is reused');
  await first.run(first.context.reference,true);check(calls.length,4,'Retry explicitly refreshes both sources');
  // A provider ignoring AbortSignal still cannot strand the UI.
  const hung=harness(()=>new Promise(()=>{}));await hung.run();
  check(hung.context.radarState,'error','Two stalled requests reach a terminal error');
  check(hung.context.radarRefreshing,false,'Timeout clears enrichment state');
  check(hung.context.radarPendingKey,'','Timeout clears duplicate-request guard');
  const offline=harness(url=>url.includes('source=local')?Promise.resolve(fixture):new Promise(()=>{}));await offline.run();
  check(offline.context.radarState,'success','Live timeout preserves usable local results');
  check(offline.context.radarData.meta.liveUnavailable,true,'Live failure is disclosed beside local data');
  let synchronizedRequests=0;
  offline.context.get=()=>{synchronizedRequests++;return new Promise(()=>{});};
  await offline.run();check(synchronizedRequests,0,'A settled offline result is reused instead of restarting the refresh on every synchronization');
  offline.context.get=()=>new Promise(()=>{});
  const retry=offline.run(offline.context.reference,true);await pause(2);
  check(offline.context.radarState,'success','Retry keeps current results visible while both providers stall');
  await retry;check(offline.context.radarState,'success','Failed retry does not discard usable records');
  const nearFeature={type:'Feature',id:'retained',properties:{name:'Saved Cafe'},geometry:{type:'Point',coordinates:[120.3209,16.616]}};
  const retained=harness(url=>url.includes('source=local')?Promise.resolve({...fixture,features:[nearFeature]}):Promise.reject(Error('Provider unavailable')));
  await retained.run();
  retained.context.get=()=>Promise.resolve({...fixture,liveUnavailable:true});
  await retained.run(retained.context.reference,true);
  check(retained.context.radarData.features[0].id,'retained','An empty fallback response on retry cannot erase the current useful inventory');
  const recovered=harness(url=>url.includes('source=local')?Promise.reject(Error('Local unavailable')):Promise.resolve({...fixture,coverage:'mapped_only'}));await recovered.run();
  check(recovered.context.radarState,'success','Live data still works when the local request fails');
  const invalid=harness(()=>Promise.resolve({error:'Unexpected response'}));await invalid.run();
  check(invalid.context.radarState,'error','Malformed responses reach an actionable terminal state');
  let oldResolve;
  const changed=harness(url=>url.includes('lat=16.615900')?new Promise(resolve=>{oldResolve=resolve;}):Promise.resolve(fixture));
  const old=changed.run();await pause(1);changed.context.reference=[16.62,120.33];await changed.run();
  oldResolve({...fixture,source:'Stale source'});await old;
  check(changed.context.radarData.referenceCoordinates[0],16.62,'Late responses cannot overwrite another reference point');
  check(changed.context.radarData.meta.source,'Local test inventory','Cancelled source never becomes active');
  const controller=new AbortController();controller.abort();let requested=false;
  await assert.rejects(editorTools.boundedRequest(()=>{requested=true;},controller.signal,20),{name:'AbortError'});checks++;
  check(requested,false,'Already-cancelled operations never start a request');
  // Run the production data renderer with both mapping libraries absent.
  const renderStart=source.indexOf('    function processRadarData('),renderEnd=source.indexOf('    function renderRadarUI()',renderStart);
  const feature=(id,latitude,longitude,props={})=>({type:'Feature',id,properties:{name:id,category:'cafe',...props},geometry:{type:'Point',coordinates:[longitude,latitude]}});
  const renderContext=vm.createContext({window:{},radarMap:null,radarLayers:[],hoverVectorLayer:null,radarLayerItems:new Map(),radarGroups:{},
    radarData:{features:[feature('near',16.616,120.3209),feature('near',16.616,120.3209),feature('outside',16.7,120.4),feature('null-distance-outside',16.7,120.4,{distanceMeters:null})],roads:{features:[{type:'Feature',id:'road-near',geometry:{type:'LineString',coordinates:[[120.314,16.6159],[120.328,16.6159]]},properties:{name:'Crossing road',distanceMeters:0}}]}},
    classify:()=> 'competitors',haversineDistanceKm:(a,b,c,d)=>Math.hypot((c-a)*111,(d-b)*106),renderRadarUI(){},applyRadarMapFilter(){}});
  vm.runInContext(source.slice(renderStart,renderEnd)+';processRadarData([16.6159,120.3209]);',renderContext);
  check(renderContext.radarGroups.competitors.length,1,'Business list works without Leaflet/Turf, deduplicates records and enforces radius');
  check(renderContext.radarGroups.competitors[0].feature.id,'near','Only the nearby business is listed');
  check(renderContext.radarGroups.roads.length,1,'Roads remain listed from server distances when both mapping libraries are absent');
  let reconnect;
  const refreshed=[];
  const onlineContext=vm.createContext({window:{addEventListener:(event,handler)=>{assert.equal(event,'online');reconnect=handler;}},
    dialog:{open:true},radarState:'error',radarData:null,radarPendingKey:'',
    $:()=>({checked:true}),point:()=>[16.6159,120.3209],withinCityCoverage:()=>true,value:()=> 'cafe',
    fetchRadar:(...args)=>refreshed.push(args)});
  const onlineStart=source.indexOf("    window.addEventListener('online', () => {");
  vm.runInContext(source.slice(onlineStart,source.indexOf('    });',onlineStart)+7),onlineContext);
  reconnect();check(refreshed.length,1,'Reconnection recovers even an initial error without a saved result');
  check(refreshed[0][2],true,'Reconnection bypasses the successful-cache shortcut');
  onlineContext.radarPendingKey='active';reconnect();check(refreshed.length,1,'Reconnection does not duplicate an active refresh');
  onlineContext.radarPendingKey='';onlineContext.dialog.open=false;reconnect();check(refreshed.length,1,'A closed editor does not start a reconnection search');
  console.log(`Nearby loading: ${checks} checks passed for local-first results, hard timeouts, cancellation, retry, stale responses and map-independent lists.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
