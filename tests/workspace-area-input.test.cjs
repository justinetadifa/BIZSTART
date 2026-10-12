const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

for (const workspace of ['admin', 'broker']) {
  const source = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', `${workspace}-workspace.js`), 'utf8');
  const start = source.indexOf('function updateAreaCalculation()');
  const end = source.indexOf('const subcatWrapper', start);
  assert(start >= 0 && end > start, 'Load the production area calculation and unit event handlers.');
  const handlers = {};
  const areaInput = {
    value: '2500',
    dispatchEvent() {},
    addEventListener(event, handler) { handlers[`area:${event}`] = handler; },
  };
  const areaUnit = {
    value: 'sqm',
    addEventListener(event, handler) { handlers[`unit:${event}`] = handler; },
  };
  const areaCalc = { textContent: '' };
  const context = vm.createContext({ areaInput, areaUnit, areaCalc, propertyWizard: {}, displayedAreaUnit: 'sqm', Event: class {} });
  vm.runInContext(source.slice(start, end), context);
  const refresh = () => vm.runInContext('updateAreaCalculation()', context);

  refresh();
  assert.equal(areaCalc.textContent, '2,500 m\u00b2 = 0.25 ha');
  assert.equal(areaInput.min, '0.5', 'Wizard minimum matches supported backend square-meter area.');
  areaUnit.value = 'hectares';
  handlers['unit:change']();
  assert.equal(areaInput.value, '0.25', 'Switching to hectares must preserve the physical area.');
  assert.equal(areaInput.min, '0.00005', 'Unit changes preserve the same minimum physical area.');
  assert.equal(areaCalc.textContent, '2,500 m\u00b2 = 0.25 ha');
  areaUnit.value = 'sqm';
  handlers['unit:change']();
  assert.equal(areaInput.value, '2500');

  areaInput.value = '1';
  refresh();
  areaUnit.value = 'hectares';
  handlers['unit:change']();
  assert.equal(areaInput.value, '0.0001');
  assert.equal(areaCalc.textContent, '1 m\u00b2 = 0.0001 ha');

  for (const invalid of ['Infinity', 'abc12', '-1', '0']) {
    areaInput.value = invalid;
    refresh();
    assert.equal(areaCalc.textContent, 'Enter a valid positive area.', `${invalid} must not produce a calculation.`);
  }
  areaInput.value = '';
  refresh();
  assert.equal(areaCalc.textContent, 'Leave blank if the area is not known.');
  console.log(`${workspace} workspace area input: passed`);
}
