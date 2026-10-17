'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const tools = require('../assets/js/property-editor-tools.js');
const source = fs.readFileSync('assets/js/property-wizard.js','utf8');
const configStart = source.indexOf('    const HAZARD_CONFIG = [');
const configEnd = source.indexOf('\n    ];', configStart)+7;
const fnStart = source.indexOf('    function assessHazards()');
const fnEnd = source.indexOf('\n    }',fnStart)+6;
assert(configStart>0 && configEnd>configStart && fnEnd>fnStart);
const config = vm.runInNewContext(source.slice(configStart,configEnd)+';HAZARD_CONFIG');
let checks=0;
const check=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);checks++;};
function browserRisk(findings) {
  const nodes=new Map(), inputs=config.map(item=>({value:findings[item.key] ?? '',addEventListener(){}}));
  const node=selector=>{
    const index=config.findIndex(item=>selector==='[data-finding-hazard="'+item.key+'"]'||selector==='[name="'+item.inputName+'"]');
    if(index>=0)return inputs[index];
    if(!nodes.has(selector))nodes.set(selector,{hidden:true,textContent:'',className:'',innerHTML:'',style:{},dataset:{}});
    return nodes.get(selector);
  };
  const context=vm.createContext({window:{},boundary:null,context:null,point:()=>null,withinCityCoverage:()=>false,
    $:node,all:selector=>selector==='[data-finding-hazard]'||selector==='.pw-finding-input'?inputs:[],
    setText:(selector,text)=>{node(selector).textContent=String(text);},escape:String,HAZARD_CONFIG:config});
  vm.runInContext(source.slice(fnStart,fnEnd)+';assessHazards();',context);
  return {score:node('[data-risk-total-score]').textContent,points:node('[data-risk-iai-pts]').textContent,
    critical:!node('[data-risk-critical-banner]').hidden,hold:node('[data-risk-preview-card]').dataset.technicalReviewHold==='true',next:node('[data-risk-next-action]').textContent};
}
const map={flood:'flood_susceptibility',faults:'active_fault',landslide:'landslide_susceptibility',storm_surge:'storm_surge',liquefaction:'liquefaction_susceptibility',tsunami:'tsunami_exposure'};
function phpRisk(findings) {
  const input=Object.fromEntries(Object.entries(findings).map(([key,value])=>[map[key],value]));
  return JSON.parse(execFileSync(process.env.PHP_BINARY||'php',['-r',"require 'app/Support/RiskConstraintsEngine.php'; echo json_encode(App\\Support\\RiskConstraintsEngine::evaluate(json_decode(stream_get_contents(STDIN),true)));"],{input:JSON.stringify(input),encoding:'utf8',windowsHide:true}));
}
const clear=Object.fromEntries(Object.keys(map).map(key=>[key,'none']));
for(const findings of [clear,{...clear,flood:'low'},{...clear,landslide:'low'},
  {...clear,flood:'low',landslide:'moderate',storm_surge:'high',tsunami:'low'},
  {...clear,faults:'critical'},{...clear,faults:'0'},{...clear,tsunami:'unknown'},{...clear,flood:''},
  {...clear,liquefaction:'very_high'},{...clear,flood:'0'},{}]) {
  const client=browserRisk(findings),server=phpRisk(findings);
  check(client.score,server.score==null?'—':Number(server.score).toFixed(1),'Browser/PHP hazard score parity');
  check(client.points,server.iai_contribution==null?'—':Number(server.iai_contribution).toFixed(2),'Browser/PHP contribution parity');
  check(client.hold,Boolean(server.has_critical_constraint),'Technical review hold survives the weighted total');
  check(client.critical,server.subcriteria.active_fault.score===0,'Active fault conflict remains visible');
}
check(browserRisk({...clear,tsunami:'unknown'}).next.includes('Tsunami'),true,'Missing hazard is named');
const benchmarks={isComplete:true,scores:{commercial_activity:80,complementary_businesses:90,competitive_pressure:70,activity_anchors:80}};
check(tools.nearbyBenchmark(benchmarks),{score:80,contribution:12},'Nearby uses 15% contribution');
check(tools.nearbyBenchmark({isComplete:true,scores:Object.fromEntries(Object.keys(benchmarks.scores).map(key=>[key,0]))}),{score:0,contribution:0},'Zero benchmark ratings remain valid zero ratings');
for(const invalid of [null,{}, {...benchmarks,isComplete:false}, {...benchmarks,scores:{...benchmarks.scores,activity_anchors:null}},
  {...benchmarks,scores:{...benchmarks.scores,commercial_activity:101}}, {...benchmarks,scores:{...benchmarks.scores,competitive_pressure:'70'}}])check(tools.nearbyBenchmark(invalid),null,'Incomplete or malformed benchmark never becomes a score');
for(const [point,expected] of [[[16.6159,120.3209],true],[[14.5995,120.9842],false],[null,false],[[16.54,120.26],true],[[NaN,120.3],false]])check(tools.inCoverage(point),expected,'Conservative map extent');
const history=tools.history(3);history.reset({title:'Original'});history.push({title:'First edit'});history.push({title:'Second edit'});
check(history.undo(),{title:'First edit'},'Undo restores previous state');
check(history.redo(),{title:'Second edit'},'Redo restores next state');
history.undo();history.push({title:'Replacement edit'});check(history.canRedo,false,'New edit discards redo branch');
history.reset({title:'Another property'});check(history.canUndo,false,'History is isolated when switching properties');
const state={tags:['Commercial Lot']};history.push(state);state.tags.push('Residential Lot');check(history.undo(),{title:'Another property'},'Snapshots do not alias mutable inputs');
const persisted=JSON.parse(execFileSync(process.env.PHP_BINARY||'php',['-r',"require 'app/Support/PropertyParcel.php'; $parcel=App\\Support\\PropertyParcel::fromPayload(['land_area'=>100,'hazard_finding_flood'=>'high']); $cleared=App\\Support\\PropertyParcel::fromPayload(['hazard_finding_flood'=>''], $parcel); echo json_encode([$parcel['observations']['flood_susceptibility'], $cleared['observations']['flood_susceptibility']]);"],{encoding:'utf8',windowsHide:true}));
check(persisted,['high',''],'Clearing a saved hazard finding removes its canonical observation');
console.log('Property editor calculations: '+checks+' checks passed across production hazard/PHP parity, nearby benchmarks, coordinate extent and undo/redo.');
