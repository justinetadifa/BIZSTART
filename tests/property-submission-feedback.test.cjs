const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('assets/js/property-wizard.js', 'utf8');
const start = source.indexOf('  window.SFCPropertySubmission =');
const end = source.indexOf('  window.SFCPropertyWizard =', start);
const context = vm.createContext({ window: {} });
vm.runInContext(source.slice(start, end), context);
const submission = context.window.SFCPropertySubmission;

for (const [approvalState, expected] of [['approved', 'Approved'], ['pending_review', 'Pending review'], ['rejected', 'Rejected'], ['draft', 'Draft']]) {
  const result = submission.describe({ property: { approvalState, status: 'Available' } });
  assert.equal(result.status, expected);
  assert(result.message.includes(`Status: ${expected}.`));
  assert(result.message.includes('Availability: Available.'));
}
assert.equal(submission.describe({ property: { approvalState: 'approved' } }, true).title, 'Property updated');
assert(submission.describe({ property: { approval_state: 'pending_review', status: 'Reserved' } }).message.includes('Status: Pending review. Availability: Reserved.'));
assert(!submission.describe({ property: {} }).message.includes('review'), 'A missing status must never invent a review state.');

const submit = { disabled: false, innerHTML: '<span>Submit for review</span>', textContent: '' };
const input = { disabled: false, value: 'Entered property name' };
const unavailable = { disabled: true, value: 'Previously disabled input' };
const close = { disabled: false };
const attributes = {};
const events = {};
const form = {
  querySelectorAll: () => [submit, input, unavailable],
  querySelector: () => submit,
  setAttribute: (name, value) => { attributes[name] = value; },
  removeAttribute: name => { delete attributes[name]; },
};
const dialog = {
  querySelectorAll: () => [close],
  addEventListener: (type, handler) => { events[type] = handler; },
  removeEventListener: type => { delete events[type]; },
};
const finish = submission.pending(form, dialog);
assert.equal(submit.textContent, 'Submitting…');
assert.equal(attributes['aria-busy'], 'true');
assert([submit, input, unavailable, close].every(control => control.disabled));
let canceled = false;
events.cancel({ preventDefault: () => { canceled = true; } });
assert(canceled, 'Escape must not dismiss an editor during an outstanding upload.');
finish();
assert.equal(submit.disabled, false);
assert.equal(close.disabled, false);
assert.equal(input.disabled, false);
assert.equal(unavailable.disabled, true, 'Preexisting disabled state must survive both success and failure.');
assert.equal(input.value, 'Entered property name', 'Ending a pending request must preserve the entered data.');
assert.equal(submit.innerHTML, '<span>Submit for review</span>');
assert.equal(attributes['aria-busy'], undefined);
assert.equal(events.cancel, undefined);
console.log('Submission feedback: actual status, pending lock, data preservation, and control restoration passed.');
