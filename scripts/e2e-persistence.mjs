
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env", "utf8").split("\n").filter(l => l.includes("="))
    .map(l => { const i = l.indexOf("="); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const email = "e2e-persist-test@lumina.dev";
const password = "TestPass123!xyz";
const BASE = process.env.BASE || "http://localhost:3600";

async function main() {
  // 1. Ensure user exists and gets a session
  let session = null;
  const pwRes = await anon.auth.signInWithPassword({ email, password });
  if (pwRes.data.session) {
    session = pwRes.data.session;
  } else {
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error) throw new Error("createUser: " + created.error.message);
    const again = await anon.auth.signInWithPassword({ email, password });
    if (again.error) throw new Error("signIn: " + again.error.message);
    session = again.data.session;
  }
  const token = session.access_token;
  console.log("SESSION OK for", email);

  const H = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  // 2. GET /api/data as an authenticated user
  const dataRes = await fetch(`${BASE}/api/data`, { headers: H });
  const dataJson = await dataRes.json();
  console.log("GET /api/data ->", dataRes.status, "success=", dataJson.success);
  console.log("  profile:", dataJson.profile ? "yes" : "NO", "| categories:", dataJson.categories?.length, "| transactions:", dataJson.transactions?.length, "| accounts:", dataJson.accounts?.length);

  // 3. POST a transaction via the real app route
  const merchant = "E2E Test Merchant " + Date.now();
  const postRes = await fetch(`${BASE}/api/transactions`, {
    method: "POST", headers: H,
    body: JSON.stringify({ merchant, amount: -42.5, date: "2026-09-29", category_name: "Food & Dining", capture_method: "text_ai", ai_confidence: 0.95, currency: "USD" }),
  });
  const postJson = await postRes.json();
  console.log("POST /api/transactions ->", postRes.status, "success=", postJson.success);
  const newId = postJson.transaction?.id;
  console.log("  created id:", newId, "| merchant:", postJson.transaction?.merchant, "| category_id:", postJson.transaction?.category_id);

  // 4. Re-fetch — does it come back? (proves persistence, not just local state)
  const dataRes2 = await fetch(`${BASE}/api/data`, { headers: H });
  const dataJson2 = await dataRes2.json();
  const found = dataJson2.transactions?.find(t => t.id === newId);
  console.log("PERSISTED?", found ? "YES" : "NO", "| total now:", dataJson2.transactions?.length);

  // 5. Create a spending rule
  const ruleRes = await fetch(`${BASE}/api/rules`, {
    method: "POST", headers: H,
    body: JSON.stringify({ name: "E2E Rule", merchant_contains: "E2E", category_name: "Food & Dining", action: "set_category" }),
  });
  const ruleJson = await ruleRes.json();
  console.log("POST /api/rules ->", ruleRes.status, "success=", ruleJson.success);

  // 6. Update profile via onboarding endpoint
  const profRes = await fetch(`${BASE}/api/profile`, {
    method: "PATCH", headers: H,
    body: JSON.stringify({ currency: "EUR", monthly_income: 6000, monthly_savings_target: 1200, onboarding_completed: true }),
  });
  const profJson = await profRes.json();
  console.log("PATCH /api/profile ->", profRes.status, "success=", profJson.success);

  // 7. Delete the transaction (undo path)
  const delRes = await fetch(`${BASE}/api/transactions?id=${newId}`, { method: "DELETE", headers: H });
  const delJson = await delRes.json();
  console.log("DELETE /api/transactions ->", delRes.status, "success=", delJson.success);

  const dataRes3 = await fetch(`${BASE}/api/data`, { headers: H });
  const dataJson3 = await dataRes3.json();
  const stillThere = dataJson3.transactions?.find(t => t.id === newId);
  console.log("deleted?", stillThere ? "NO — still present" : "YES — gone");
  console.log("profile currency now:", dataJson3.profile?.currency, "| income:", dataJson3.profile?.monthly_income);

  // cleanup
  await admin.auth.admin.deleteUser(session.user.id);
  console.log("CLEANED UP");
}

main().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
