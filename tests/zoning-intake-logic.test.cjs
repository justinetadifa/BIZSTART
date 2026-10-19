const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const vm = require('node:vm');
const data = JSON.parse(execFileSync(process.env.PHP_BINARY || 'C:/xampp/php/php.exe', ['tests/zoning-intake-logic.test.php', '--json'], {encoding:'utf8'}));
const source = readFileSync('assets/js/property-wizard.js', 'utf8');
const names = ['zoningReferenceStatus', 'fallbackZoningEvaluation', 'evaluateZoningCompatibilityClient', 'filterZoningActivitiesByCategory', 'applyAllowedUsesFilter', 'renderZoningAllowedAndConditionalUses'];
const functions = names.map(name => {
  const start = source.indexOf(`    function ${name}(`);
  assert(start >= 0, `Find production ${name}`);
  return source.slice(start, source.indexOf('\n    }', start) + 6);
}).join('\n');
let input = {}, elements = {}, items = [], checks = 0;
const context = {value:key=>input[key] || '', getZoningEngineData:()=>data,
  $:key=>elements[key], all:()=>items, setText:(key,text)=>{if(elements[key])elements[key].textContent=text;},
  escape:text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])), reportedZoningUses:[]};
vm.createContext(context); vm.runInContext(functions, context);
const check = (ok,message) => {assert.ok(ok,message);checks++;};
for(const [zone, rules] of Object.entries(data.rules)) for(const [activity, rule] of Object.entries(rules)) {
  input = {zoning_classification:zone, proposed_activity:activity};
  const result = context.evaluateZoningCompatibilityClient();
  check(result.status === rule.status && result.score === rule.score, `PHP/browser parity ${zone}/${activity}`);
  check(!result.isEligible && !result.isOfficialCityRule && result.iaiContribution === null, 'Reference results cannot grant official eligibility or points.');
}
input={zoning_classification:'C-2', existing_land_use:'Institutional'};
check(context.evaluateZoningCompatibilityClient().score === null, 'Existing use never supplies a proposed activity.');
for(const proposed_activity of ['institutional','unknown','<script>']) {
  input={zoning_classification:'C-2',proposed_activity};
  check(context.evaluateZoningCompatibilityClient().status === 'undetermined', 'Only exact recognized activities are evaluated.');
}
input={zoning_classification:'R-1',proposed_activity:'food_cafe'};
const conditional=context.evaluateZoningCompatibilityClient();
check(conditional.requirements.length > 0 && conditional.unmetConditions.length === 0, 'Unconfirmed requirements are not fabricated violations.');

const options=[{value:'food_cafe'}, {value:'inst_school'}];
const groups=options.map((option,i)=>({dataset:{categoryGroup:i?'institutional':'food'},querySelectorAll:()=>[option]}));
const activitySelect={value:'food_cafe',querySelectorAll:()=>groups};
elements={'#pwZoningActivity':activitySelect};
context.filterZoningActivitiesByCategory('institutional');
check(activitySelect.value === '' && options[0].disabled && !options[1].disabled, 'Changing group clears the incompatible activity without selecting the first alternative.');
activitySelect.value='inst_school';context.filterZoningActivitiesByCategory('institutional');
check(activitySelect.value === 'inst_school', 'A compatible activity selection is retained.');
context.filterZoningActivitiesByCategory('');
check(options.every(option=>!option.disabled), 'All-groups view restores every option.');

const container={innerHTML:''};
elements={'#pwAllowedUsesContainer':container};input={zoning_classification:'C-2'};
context.renderZoningAllowedAndConditionalUses(['inst_school']);
check(container.innerHTML.includes('data-zoning-pick="inst_school"') && !container.innerHTML.includes('type="checkbox"'), 'Reference activities offer checks rather than editable permission checkboxes.');
check((container.innerHTML.match(/data-zoning-pick=/g)||[]).length === 29, 'The reference includes every status, not only allowed activities.');

items=[{dataset:{actText:'cafe food',ruleStatus:'conditional'}},{dataset:{actText:'school institutional',ruleStatus:'permitted'}}];
elements={'#pwAllowedUsesSearch':{value:'school'},'#pwZoningRuleStatusFilter':{value:'permitted'},'[data-zoning-no-matches]':{hidden:true}};
context.applyAllowedUsesFilter();check(items[0].hidden && !items[1].hidden, 'Text and status filters combine.');
elements['#pwZoningRuleStatusFilter'].value='prohibited';context.applyAllowedUsesFilter();
check(items.every(item=>item.hidden) && !elements['[data-zoning-no-matches]'].hidden, 'An empty filtered result has an explicit message.');
check(!source.includes("data.set('clup_allowed_uses'"), 'Browsing reference rules never overwrites reported allowed-use records on save.');
console.log(`Zoning intake presentation: ${checks} server-to-browser, selection and filter checks passed.`);
