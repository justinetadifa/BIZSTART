'use strict';
const assert = require('node:assert/strict');
const tools = require('../assets/js/property-editor-tools.js');
const fs = require('node:fs');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const preview = {version:'locus-saved-screening-v1',is_verified:false,score:91.5,completed_count:5,status:'provisional',reason:'City review pending.'};
let checks = 0;
const check = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++; };
check(tools.listingAssessment({screeningAssessment:preview}).score,91.5,'Saved five-criterion preview is visible on the card');
check(tools.listingAssessment({assessmentComplete:false,iaiScore:null,screeningAssessment:preview}).status,'Provisional','Unverified preview is not presented as final IAI');
check(tools.listingAssessment({assessmentComplete:true,iaiScore:0,screeningAssessment:preview}).score,0,'A verified zero is a real result');
check(tools.listingAssessment({assessmentComplete:true,iaiScore:86.2,screeningAssessment:preview}).label,'Verified IAI','Current verified result takes precedence');
for (const status of ['prohibited','technical_review_hold','location_needed']) {
  check(tools.listingAssessment({screeningAssessment:{...preview,status}}).score,null,'Held or misplaced preview never shows an actionable score');
}
check(tools.listingAssessment({screeningAssessment:{...preview,score:null,completed_count:4,status:'incomplete'}}).count,4,'Incomplete listing reports actual criterion progress');
check(tools.listingAssessment({}).score,null,'Missing data never becomes zero');
check(tools.listingAssessment({screeningAssessment:{...preview,score:NaN}}).score,null,'Non-finite rating cannot render');
const incomplete = {...preview,score:null,completed_count:3,status:'incomplete',criteria:{cost:{label:'Cost & market',score:null},nearby:{label:'Nearby businesses',score:null}}};
check(tools.listingAssessment({screeningAssessment:incomplete}).reason,'Next: Cost & market · 1 more','The card identifies the next missing input without an overwhelming list');
check(tools.listingAssessment({screeningAssessment:{...incomplete,criteria:{cost:{label:'Cost & market',score:null}}}}).reason,'Next: Cost & market','A single missing criterion has no extra count');
const source = fs.readFileSync('assets/js/property-wizard.js','utf8');
const start = source.indexOf('    function calculateWizardCompositeMce(');
const end = source.indexOf('    if (typeof window',start);
const context = vm.createContext({mceModel:require('../assets/js/mce-active-weights.js').create()});vm.runInContext(source.slice(start,end),context);
const scores = {spatial_accessibility:100,infrastructure_readiness:100,property_cost_market_competitiveness:100,nearby_businesses:92.5,risk_constraints:100,zoning_compatibility:100};
check(context.calculateWizardCompositeMce(scores).provisionalScore,98.9,'Preview sums all five weighted criteria, including nearby');
check(context.calculateWizardCompositeMce({...scores,zoning_compatibility:null}).provisionalScore,98.9,'Numeric calculation remains visible while zoning is pending');
check(context.calculateWizardCompositeMce({...scores,nearby_businesses:null}).provisionalScore,null,'Four criteria never produce a reweighted total');
check(context.calculateWizardCompositeMce({...scores,_riskCritical:true}).provisionalScore,null,'Hazard holds apply to the preview');
check(context.calculateWizardCompositeMce({...scores,_zoningProhibited:true}).provisionalScore,null,'Prohibited activity withholds the preview');
const zoningCases = [['C-1','retail_convenience'],['R-1','retail_convenience'],['R-1','ind_heavy_manufacturing'],['unknown','retail_convenience'],['C-1','unknown']];
const zoning = JSON.parse(execFileSync('php',['-r',"require 'app/Support/ZoningRulesEngine.php'; $cases=json_decode(stream_get_contents(STDIN),true); echo json_encode(App\\Support\\ZoningRulesEngine::getScreeningData()+['results'=>array_map(static fn($c)=>App\\Support\\ZoningRulesEngine::evaluate($c[0],$c[1]),$cases)]);"],{input:JSON.stringify(zoningCases),encoding:'utf8',windowsHide:true}));
const zoningSource = source.slice(source.indexOf('    function evaluateZoningCompatibilityClient()'),source.indexOf('    function syncZoningCompatibility()'));
for (const [index,[zone,activity]] of zoningCases.entries()) {
  const c = vm.createContext({value:key=>({zoning_classification:zone,proposed_activity:activity})[key] || '',$:()=>null,field:()=>null,getZoningEngineData:()=>zoning,zoningReferenceStatus:status=>status});
  vm.runInContext(zoningSource,c);const client=c.evaluateZoningCompatibilityClient(),server=zoning.results[index];
  check(client.score,server.score,'Actual embedded rules produce the same gate score as PHP');
  check(client.isComplete,server.is_complete,'Actual embedded rules produce the same completion status as PHP');
  check(client.isEligible,false,'Intake reference never asserts verified parcel eligibility');
}
console.log(`Listing assessment: ${checks} result, progress, verification and gate checks passed.`);
