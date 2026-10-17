const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('assets/js/property-wizard.js','utf8');
const start = source.indexOf('    function validatePricingFields()');
const end = source.indexOf('    function syncPricing()',start);
const price = {value:'',error:'',setCustomValidity(text){this.error=text;}};
const lease = {value:'',error:'',setCustomValidity(text){this.error=text;}};
const modes = {sale:'amount',lease:'amount'};
let purpose = 'sale';
const context = vm.createContext({
  getListingPurpose:()=>purpose,
  value:name=>name==='sale_price_mode'?modes.sale:modes.lease,
  form:{querySelector:selector=>({value:selector.includes('sale_price_mode')?modes.sale:modes.lease})},
  $:selector=>selector==='#pwAskingPrice'?price:lease,
});
vm.runInContext(source.slice(start,end),context);
const validate = () => vm.runInContext('validatePricingFields()',context);
for(const raw of ['-5','+100','1e6','0xFF','10.50','Infinity','NaN','words','0','9,007,199,254,740,992']) {
  price.value=raw;validate();assert(price.error,`${raw} must not become a plausible asking price.`);
}
for(const raw of ['1','800,000','9007199254740991']) {
  price.value=raw;validate();assert.equal(price.error,'',`${raw} is a supported positive whole-peso amount.`);
}
price.value='-1';modes.sale='request';validate();assert.equal(price.error,'','Inactive amounts do not block price on request.');
purpose='lease';modes.lease='amount';lease.value='1e4';validate();assert(lease.error);assert.equal(price.error,'');
purpose='sale_or_lease';modes.sale='amount';price.value='5000';lease.value='1500';validate();assert.equal(price.error,'');assert.equal(lease.error,'');
const areaStart = source.indexOf('    const enteredAreaSqm =');
const areaEnd = source.indexOf('    function syncAreaLimits',areaStart);
let area='2500',unit='sqm';
const areaContext=vm.createContext({value:name=>name==='land_area'?area:name==='land_area_unit'?unit:''});
vm.runInContext(source.slice(areaStart,areaEnd)+';globalThis.convert=enteredAreaSqm;',areaContext);
assert.equal(areaContext.convert(),2500);
unit='hectares';area='0.25';assert.equal(areaContext.convert(),2500);
for(const raw of ['Infinity','1e309','abc','-1','0','']) {area=raw;assert.equal(areaContext.convert(),null);}
area='1e308';assert.equal(areaContext.convert(),null,'Hectare multiplication overflow must not produce Infinity.');
console.log('Wizard numeric inputs: invalid prices, inactive modes, exact area conversion and overflow checks passed.');
