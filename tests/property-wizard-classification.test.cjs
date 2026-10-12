const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const source = fs.readFileSync('assets/js/property-wizard.js','utf8');
const start = source.indexOf('  function normalizeClassification(');
const end = source.indexOf('  window.SFCPropertyWizard',start);
assert(start > 0 && end > start);
const context = vm.createContext({});
vm.runInContext(source.slice(start,end) + '; globalThis.normalize = normalizeClassification;',context);
const php = process.env.PHP_BINARY || (process.platform === 'win32' ? 'C:/xampp/php/php.exe' : 'php');
const catalog = JSON.parse(execFileSync(php,['-r',"require 'app/Support/PropertyCatalog.php'; echo json_encode(App\\Support\\PropertyCatalog::classificationCatalog());"],{encoding:'utf8'}));
const normalize = (...args) => JSON.parse(JSON.stringify(context.normalize(catalog,...args)));
for (const [category,options] of Object.entries(catalog.categories)) {
  for (const primary of options) {
    assert.equal(normalize(category,primary).primary,primary);
    const extras = normalize(category,primary,[...options,primary,'Invalid choice']);
    assert.deepEqual(extras.additional,options.filter(item=>item!==primary));
    assert.equal(extras.category,category);
  }
}
assert.deepEqual(normalize('Building','Commercial Lot','Industrial Lot'),{category:'Building',primary:'',additional:[]});
assert.deepEqual(normalize('Commercial','Commercial Lot, Restaurant'),{category:'Building',primary:'Commercial',additional:[]});
assert.deepEqual(normalize('Vacant Land','Commercial'),{category:'Land',primary:'Commercial Lot',additional:[]});
assert.deepEqual(normalize(' building ','warehouse, office','Warehouse, Corporate Office, commercial lot'),{category:'Building',primary:'Warehouse / Storage',additional:['Office','Corporate Office']});
assert.deepEqual(normalize('Land','Raw Land','Commercial, Retail / Storefront, Agricultural'),{category:'Land',primary:'Raw Land',additional:['Commercial','Agricultural']});
console.log('Property wizard classification: all server choices, legacy aliases, restore order and stale tags passed.');
