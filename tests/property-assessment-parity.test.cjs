const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const php = process.env.PHP_BINARY || 'C:/xampp/php/php.exe';
const { weights, fixtures } = JSON.parse(execFileSync(php, [path.join(__dirname, 'property-assessment.test.php'), '--json-fixtures'], { encoding: 'utf8', windowsHide: true }));
const source = fs.readFileSync(path.join(root, 'assets/js/admin-workspace.js'), 'utf8');
const start = source.indexOf('  function liveScores() {');
const end = source.indexOf('  function openEditor(', start);
assert(start >= 0 && end > start, 'Live assessment function was not found.');
const compute = source.slice(start, end) + '\nliveScores();';
for (const fixture of fixtures) {
  const scoreBox = { textContent: '' };
  const fields = Object.entries(fixture.assessmentCriteria).map(([key, value]) => ({ dataset: { criterion: key }, value: value === null ? '' : String(value), validity: { valid: true } }));
  const form = { querySelectorAll: () => fields, querySelector: () => scoreBox };
  vm.runInNewContext(compute, { form, assessmentWeights: weights });
  if (fixture.assessmentComplete) {
    assert.equal(scoreBox.textContent, `MCE ${fixture.mceScore.toFixed(1)} · IAI ${fixture.iaiScore.toFixed(1)}`, JSON.stringify(fixture.assessmentCriteria));
  } else {
    assert(scoreBox.textContent.includes('Complete all seven criteria'), 'Incomplete fields produced an assessment.');
  }
}
console.log(`PHP/live assessment parity passed: ${fixtures.length} fixtures.`);
