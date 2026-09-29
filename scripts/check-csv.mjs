
// ponytail: one runnable check for the CSV parser — fails loudly if parsing breaks.
// Run: node scripts/check-csv.mjs  (exercises lib/parse/csv.ts via tsx-free approach: duplicated assertions on the compiled logic)
// Since this is .ts, we compile it on the fly using Next's bundled swc via a tiny loader is overkill —
// instead assert the pure logic by importing the TS file through Node's --experimental-strip-types (Node 22.23 supports it).
import { parseBankCsv } from '../lib/parse/csv.ts';

const cases = [
  {
    name: 'chase-style single amount',
    csv: 'Date,Description,Amount\n2026-09-28,STARBUCKS 1234,-5.75\n2026-09-27, paycheck, 2500.00',
    expect: { rows: 2, first: { date: '2026-09-28', merchant: 'STARBUCKS 1234', amount: -5.75 } },
  },
  {
    name: 'double-column debit/credit',
    csv: 'Date,Merchant,Debit,Credit\n09/28/2026,"Whole Foods, Inc",115.56,\n09/27/2026,EMPLOYER INC,,3000.00',
    expect: { rows: 2, first: { date: '2026-09-28', merchant: 'Whole Foods, Inc', amount: -115.56 }, second: 3000 },
  },
  {
    name: 'no header, positional (keeps sign)',
    csv: '2026-09-26,AMZN MKTP,-42.10',
    expect: { rows: 1, first: { date: '2026-09-26', merchant: 'AMZN MKTP', amount: -42.10 } },
  },
  {
    name: 'garbage rows skipped',
    csv: 'Date,Description,Amount\n2026-09-28,Ok Merchant,-5.00\nnot-a-date,Bad Row,abc',
    expect: { rows: 1, first: { date: '2026-09-28', merchant: 'Ok Merchant', amount: -5.0 } },
  },
];

let failed = 0;
for (const c of cases) {
  const { rows, skipped } = parseBankCsv(c.csv);
  const e = c.expect;
  const okRow = rows.length === e.rows && (!e.first || (rows[0].date === e.first.date && rows[0].merchant === e.first.merchant && rows[0].amount === e.first.amount));
  const okSecond = !e.second || rows[1].amount === e.second;
  const ok = okRow && okSecond;
  console.log(ok ? 'PASS' : 'FAIL', '-', c.name, rows.length, 'rows,', skipped, 'skipped');
  if (!ok) { failed++; console.log('  got:', JSON.stringify(rows)); }
}
process.exit(failed ? 1 : 0);
