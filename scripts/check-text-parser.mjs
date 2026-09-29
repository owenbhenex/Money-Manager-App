
import { parseTransactionText } from "../lib/parse/text-transaction.ts";

const CATS = ["Food & Dining","Transportation","Groceries","Housing & Utilities","Entertainment","Healthcare","Personal Care","Income","Other"];

const cases = [
  { input: "Dinner with Alex at Chipotle for $24.50",    expAmount: 24.5,  expCat: "Food & Dining",  expMerchant: "Chipotle" },
  { input: "Uber ride $16.20",                            expAmount: 16.2,  expCat: "Transportation", expMerchant: "Uber" },
  { input: "latte $6.25 at Starbucks",                    expAmount: 6.25,  expCat: "Food & Dining",  expMerchant: "Starbucks" },
  { input: "yesterday groceries at Whole Foods 87.40",    expAmount: 87.4,  expCat: "Groceries",      expDate: true },
  { input: "Netflix subscription 15.49",                  expAmount: 15.49, expCat: "Entertainment" },
  { input: "rent 1200",                                   expAmount: 1200,  expCat: "Housing & Utilities" },
  { input: "no amount here",                              expAmount: 0,     expCat: "Other" },
];

let pass = 0, fail = 0;
for (const c of cases) {
  const r = parseTransactionText(c.input, CATS);
  const okAmt = Math.abs(r.amount - c.expAmount) < 0.01;
  const okCat = !c.expCat || r.category_name === c.expCat;
  const okMerch = !c.expMerchant || r.merchant.toLowerCase().includes(c.expMerchant.toLowerCase());
  const ok = okAmt && okCat && okMerch;
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  "${c.input}"`);
  console.log(`      -> amount=${r.amount} merchant="${r.merchant}" cat=${r.category_name} conf=${r.confidence} date=${r.date}`);
  if (!ok) console.log(`      expected: amount=${c.expAmount} cat=${c.expCat ?? "?"} merchant=${c.expMerchant ?? "?"}`);
}
console.log(`\n=== ${pass}/${pass+fail} PASS ===`);
process.exit(fail ? 1 : 0);
