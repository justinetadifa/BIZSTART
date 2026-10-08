const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class Element {
  constructor(value = '') { this.value = value; this.textContent = ''; this.hidden = false; this.style = {}; this.attributes = {}; this.listeners = {}; this.children = {}; }
  addEventListener(name, fn) { (this.listeners[name] ||= []).push(fn); }
  dispatch(name) { for (const fn of this.listeners[name] || []) fn(); }
  setAttribute(name, value) { this.attributes[name] = value; }
  removeAttribute(name) { delete this.attributes[name]; }
  querySelector(selector) { return this.children[selector]; }
}
const keys = ['spatial_accessibility','infrastructure_readiness','economic_viability','nearby_businesses','zoning_compatibility','risk_constraints','environmental_safety'];
const root = new Element();
for (const selector of ['[data-assessment-status]','[data-assessment-method]','[data-legacy-assessment]','[data-recalculate-assessment]']) root.children[selector] = new Element();
const total = root.children['[data-live-scores]'] = new Element();
for (const selector of ['[data-total-mce]','[data-total-iai]','[data-computed-summary]']) total.children[selector] = new Element();
const context = root.children['[data-spatial-context]'] = new Element(); context.children.dl = new Element();
const cards = keys.map(key => {
  const card = new Element(); card.dataset = {assessmentCriterion:key};
  for (const selector of ['[data-score-value]','[data-score-justification]','[data-score-evidence]','[data-score-rule]']) card.children[selector] = new Element();
  const bar = card.children['[role="progressbar"]'] = new Element(); bar.children.span = new Element(); return card;
});
root.querySelectorAll = () => cards;
const form = new Element(); form.children['[data-automatic-assessment]'] = root;
form.elements = Object.fromEntries(Object.entries({lat:'16.615',lng:'120.316',category:'Land',land_area:'2500',land_area_unit:'sqm'}).map(([key,value]) => [key,new Element(value)]));
const dialog = new Element();
const requests = [];
const sandbox = {window:{},AbortController,URLSearchParams,setTimeout,clearTimeout,fetch:(url,options) => new Promise(resolve => requests.push({url,options,resolve}))};
vm.runInNewContext(fs.readFileSync('assets/js/admin-assessment.js','utf8'),sandbox);
const card = sandbox.window.SFCAutomaticAssessment(form,{apiBase:'/api',dialog});
const response = assessment => ({ok:true,json:async()=>({assessment})});
const assessment = (value, complete = true) => ({assessmentMode:'automatic',assessmentComplete:complete,mceScore:value,iaiScore:value,completedCount:complete?7:1,assessmentCriteria:Object.fromEntries(keys.map(key=>[key,value])),criteriaDetails:{spatial_accessibility:{justification:'Calculated from: a verified road geometry',evidence:[{source:'Official local layer',version:'test-v1'}]}},spatialContext:[]});

(async()=>{
  card.setProperty({assessmentMode:'legacy_manual',assessmentCriteria:{spatial_accessibility:90}});
  assert.equal(root.children['[data-legacy-assessment]'].hidden,false);
  assert.equal(total.children['[data-total-mce]'].textContent,'—','Legacy values must not appear as automatic scores');
  const zero = card.refresh(); requests.at(-1).resolve(response(assessment(0))); await zero;
  assert.equal(total.children['[data-total-mce]'].textContent,'0.0');
  assert.equal(cards[0].children['[data-score-value]'].textContent,'0.0%');
  assert.equal(cards[0].children['[role="progressbar"]'].attributes['aria-valuenow'],'0');
  assert(cards[0].children['[data-score-justification]'].textContent.includes('verified road geometry'));
  const before=requests.length;await card.refresh();assert.equal(requests.length,before,'An unchanged preview should be reused');
  const stale=card.refresh(true);const first=requests.at(-1);
  form.elements.lat.value='16.616';const latest=card.refresh();const second=requests.at(-1);
  second.resolve(response(assessment(83.1)));await latest;first.resolve(response(assessment(22)));await stale;
  assert.equal(total.children['[data-total-mce]'].textContent,'83.1','A slow earlier response must not overwrite a newer location');
  assert(first.options.signal.aborted);
  const partial=card.refresh(true);requests.at(-1).resolve(response(assessment(0,false)));await partial;
  assert.equal(total.children['[data-total-mce]'].textContent,'—','Incomplete source coverage must not produce a total');
  assert.equal(cards[0].children['[data-score-value]'].textContent,'0.0%','Known zero remains visible in a partial assessment');
  form.elements.lng.value='';await card.refresh();assert(root.children['[data-assessment-status]'].textContent.includes('valid latitude'));
  form.elements.lng.value='120.316';form.elements.land_area.value='';const closing=card.refresh(true);const closedRequest=requests.at(-1);
  assert.equal(new URL(closedRequest.url,'https://example.test').searchParams.get('land_area'),'','Unknown area must remain blank in a location-only assessment request');
  dialog.dispatch('close');closedRequest.resolve(response(assessment(100)));await closing;
  assert.equal(total.children['[data-total-mce]'].textContent,'—','Closing the editor must invalidate an outstanding preview');
  assert(closedRequest.options.signal.aborted);
  const php=fs.readFileSync('app/Support/property-wizard-view.php','utf8');
  const start=php.indexOf('data-automatic-assessment>');const end=php.indexOf('data-assessment-method',start);
  assert(start>=0 && end>start,'The rendered wizard must contain the automatic scorecard');
  const scorecard=php.slice(start,end);
  assert(!/<input\b/.test(scorecard),'Automatic criteria must have no editable or hidden score inputs');
  assert(!fs.readFileSync('assets/js/admin-workspace.js','utf8').includes("data.set('assessmentCriteria'"),'The browser must not submit numeric scores');
  console.log('PASS: read-only scorecard, zero/missing evidence, legacy separation, cache, stale requests and closing cancellation.');
})().catch(error=>{console.error(error);process.exitCode=1;});
