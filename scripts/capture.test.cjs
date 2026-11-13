const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '..', 'lib', 'capture.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const moduleShim = { exports: {} };
new Function('exports', 'require', 'module', compiled)(moduleShim.exports, require, moduleShim);
const { parseCapture } = moduleShim.exports;

test('extracts a South African monthly fibre payment', () => {
  const result = parseCapture('My fibre payment is due on the 25th every month. It is R899.');
  assert.equal(result.category, 'subscription');
  assert.equal(result.recurrence, 'monthly');
  assert.equal(result.amount, 899);
  assert.equal(result.currency, 'ZAR');
  assert.equal(result.confidence, 'high');
  assert.match(result.dueAt, /^\d{4}-\d{2}-25T/);
});

test('extracts an explicit named date', () => {
  const result = parseCapture('Renew vehicle licence on 18 March 2027');
  assert.equal(result.category, 'renewal');
  assert.equal(result.dueAt.slice(0, 10), '2027-03-18');
  assert.equal(result.confidence, 'medium');
});

test('extracts a relative date and decimal amount', () => {
  const result = parseCapture('Pay the electricity bill in 3 days for R1,250.50');
  const due = new Date(result.dueAt);
  const expected = new Date();
  expected.setDate(expected.getDate() + 3);
  assert.equal(due.getDate(), expected.getDate());
  assert.equal(result.amount, 1250.5);
  assert.equal(result.category, 'payment');
});

test('does not claim confidence when no date can be found', () => {
  const result = parseCapture('Remember to sort out the garage');
  assert.equal(result.confidence, 'low');
  assert.equal(result.recurrence, 'none');
  assert.equal(result.amount, null);
  assert.equal(result.dueAt, null);
});
