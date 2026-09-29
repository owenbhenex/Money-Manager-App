
import { generateLocalCopilotReply } from "../lib/ai/local-copilot.ts";

const ctx = {
  totalBalance: 14850, monthlySpent: 3180, monthlyIncome: 5800,
  savingsTarget: 1500, currency: "USD",
  topCategories: [
    { name: "Housing & Utilities", total: 950 },
    { name: "Food & Dining", total: 720 },
    { name: "Groceries", total: 310 },
  ],
  recentTransactions: [
    { merchant: "Chipotle", amount: -24.5 },
    { merchant: "Uber", amount: -16.2 },
    { merchant: "Starbucks", amount: -6.25 },
  ],
};

const cases = [
  { q: "categorize all Chevron as Transportation", expRule: { merchant_contains: "Chevron", category_name: "Transportation" } },
  { q: "Put Amazon in Groceries", expRule: { merchant_contains: "Amazon", category_name: "Groceries" } },
  { q: "How much did I spend this month?", expText: "3,180" },
  { q: "Where is my money going?", expText: "Housing" },
  { q: "What's my balance?", expText: "14,850" },
  { q: "Am I on track with savings?", expText: "on track" },
  { q: "Show my recent transactions", expText: "Chipotle" },
  { q: "Explain the Black-Scholes model", expText: "offline mode" },
];

let pass = 0, fail = 0;
for (const c of cases) {
  const r = generateLocalCopilotReply(c.q, ctx);
  let ok = false;
  if (c.expRule) {
    ok = r.rule?.merchant_contains.toLowerCase().includes(c.expRule.merchant_contains.toLowerCase())
         && c.expRule.category_name.toLowerCase().includes(r.rule?.category_name.toLowerCase() ?? "");
  } else {
    ok = r.text.toLowerCase().includes(c.expText.toLowerCase());
  }
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  Q: "${c.q}"`);
  console.log(`      -> ${r.rule ? `[RULE: ${r.rule.name}] ` : ""}${r.text.slice(0, 80)}`);
  if (!ok) console.log(`      expected: ${c.expRule ? JSON.stringify(c.expRule) : c.expText}`);
}
console.log(`\n=== ${pass}/${pass+fail} PASS ===`);
process.exit(fail ? 1 : 0);
