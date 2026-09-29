
import { detectSubscriptions } from "../lib/parse/subscriptions.ts";

// 3 monthly recurring + 2 one-offs + 1 varying (should be excluded)
const tx = [
  { merchant: "Spotify Premium", amount: -10.99, date: "2026-07-01" },
  { merchant: "Spotify Premium", amount: -10.99, date: "2026-08-01" },
  { merchant: "Spotify Premium", amount: -10.99, date: "2026-09-01" },
  { merchant: "iCloud Storage", amount: -2.99, date: "2026-07-05" },
  { merchant: "iCloud Storage", amount: -2.99, date: "2026-08-05" },
  { merchant: "iCloud Storage", amount: -2.99, date: "2026-09-05" },
  { merchant: "Verizon Wireless", amount: -85.0, date: "2026-07-10" },
  { merchant: "Verizon Wireless", amount: -85.0, date: "2026-08-10" },
  { merchant: "Verizon Wireless", amount: -85.0, date: "2026-09-10" },
  { merchant: "Shell Gas", amount: -52.3, date: "2026-07-12" },
  { merchant: "Trader Joes", amount: -91.44, date: "2026-07-13" },
];

const found = detectSubscriptions(tx);
console.log(`Detected ${found.length} recurring charges:`);
found.forEach(s => console.log(`  ${s.merchant}  $${s.amount}  ${s.billing_cycle}  conf=${s.confidence.toFixed(2)}  n=${s.occurrences}`));

const names = found.map(s => s.merchant);
let pass = 0, fail = 0;
const check = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

check("detects exactly 3 recurring", found.length === 3);
check("Spotify detected", names.includes("Spotify Premium"));
check("iCloud detected", names.includes("iCloud Storage"));
check("Verizon detected", names.includes("Verizon Wireless"));
check("excludes one-offs (Shell/Trader Joes)", !names.some(n => /Shell|Trader/i.test(n)));
const total = found.filter(s => s.billing_cycle === "monthly").reduce((s,x)=>s+x.amount,0);
check("monthly total = 98.98", Math.abs(total - 98.98) < 0.01, `got ${total.toFixed(2)}`);

console.log(`\n=== ${pass}/${pass+fail} PASS ===`);
process.exit(fail ? 1 : 0);
