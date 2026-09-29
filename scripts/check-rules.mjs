import { evaluateTransaction, evaluateBatch } from '../lib/rules/engine.ts';

const rules = [
  { id: 'r1', name: 'Chevron -> Transportation', trigger_condition: { merchant_contains: 'chevron' }, action: { type: 'set_category', value: 'Transportation' }, is_active: true },
  { id: 'r2', name: 'Ignore small coffee', trigger_condition: { merchant_contains: 'starbucks', max_amount: 6 }, action: { type: 'ignore_transaction' }, is_active: true },
  { id: 'r3', name: 'Inactive rule', trigger_condition: {}, action: { type: 'set_category', value: 'X' }, is_active: false },
];

const cases = [
  ['chevron gas matches r1', { id: 't1', merchant: 'CHEVRON 0042', amount: -45.2 }, 'r1'],
  ['starbucks 5.75 ignored by r2', { id: 't2', merchant: 'STARBUCKS #12', amount: -5.75 }, 'r2'],
  ['starbucks 8.99 no match', { id: 't3', merchant: 'STARBUCKS #12', amount: -8.99 }, null],
  ['inactive rule never fires', { id: 't4', merchant: 'anything', amount: -1 }, null],
];

let failed = 0;
for (const [name, tx, expectRule] of cases) {
  const r = evaluateTransaction(tx, rules);
  const got = r ? r.ruleId : null;
  const ok = got === expectRule;
  if (!ok) failed++;
  console.log(ok ? 'PASS' : 'FAIL', '-', name, '→', got);
}
const batch = evaluateBatch(cases.map(c => c[1]), rules);
console.log(batch.length === 2 ? 'PASS' : 'FAIL', '- batch returns 2 results, got', batch.length);
process.exit(failed ? 1 : 0);
