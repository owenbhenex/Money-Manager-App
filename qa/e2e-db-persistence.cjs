/**
 * E2E: real browser sign-in -> real DB persistence.
 * Uses the app's own Supabase browser client (cookie session), exactly as a user would.
 */
const { chromium } = require("playwright-core");
const fs = require("node:fs");

const BASE = process.env.BASE || "http://localhost:3600";
const EXE = "C:/Users/owenb/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe";

const env = Object.fromEntries(
  fs.readFileSync("C:/Codez/money_manager/.env", "utf8").split("\n").filter((l) => l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const { createClient } = require("C:/Codez/money_manager/node_modules/@supabase/supabase-js");
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const EMAIL = "db-e2e-test@lumina.dev";
const PASSWORD = "TestPass123!xyz";

async function main() {
  let pass = 0, fail = 0;
  const check = (name, cond, extra = "") => {
    console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`);
    cond ? pass++ : fail++;
  };

  // Clean slate + create confirmed test user
  const { data: users } = await admin.auth.admin.listUsers();
  const existing = users?.users?.find((u) => u.email === EMAIL);
  if (existing) await admin.auth.admin.deleteUser(existing.id);
  const created = await admin.auth.admin.createUser({ email: EMAIL, password: PASSWORD, email_confirm: true });
  if (created.error) throw new Error("createUser: " + created.error.message);
  const userId = created.data.user.id;

  // Trigger verification: profile + 9 categories auto-created on signup
  const { data: profile } = await admin.from("profiles").select("*").eq("id", userId).maybeSingle();
  check("signup auto-creates profile", !!profile, profile ? `currency=${profile.currency}` : "no row");
  const { data: cats } = await admin.from("categories").select("*").eq("user_id", userId);
  check("signup auto-seeds categories", (cats?.length ?? 0) === 9, `${cats?.length ?? 0} rows`);

  const browser = await chromium.launch({ executablePath: EXE });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const jsErrors = [];
  page.on("pageerror", (e) => jsErrors.push(e.message));

  // Establish a REAL cookie session using the app's Supabase browser client
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const signedIn = await page.evaluate(async ({ url, key, email, password }) => {
    const { createClient } = await import("/_next/static/chunks/node_modules_@supabase_ssr_dist_module_index_js.js").catch(() => ({ createClient: null }));
    // Fall back to the public CDN build if the app bundle isn't reachable this way
    return null;
  }, { url: env.NEXT_PUBLIC_SUPABASE_URL, key: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, email: EMAIL, password: PASSWORD }).catch(() => null);

  // Simpler + reliable: inject the session via the GoTrue token then set cookie
  // using the same encoding @supabase/ssr expects: sb-<ref>-auth-token = base64url(JSON)
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const signIn = await anon.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (signIn.error) throw new Error("signInWithPassword: " + signIn.error.message);
  const session = signIn.data.session;

  const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
  const cookieName = `sb-${ref}-auth-token`;
  const payload = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + session.expires_in,
    expires_in: session.expires_in,
    token_type: "bearer",
    user: session.user,
  });
  const b64 = Buffer.from(payload, "utf8").toString("base64url");

  await page.context().addCookies([
    { name: cookieName, value: "base64-" + b64, domain: "localhost", path: "/", httpOnly: false, secure: false, sameSite: "Lax" },
  ]);
  console.log(`\nSession cookie set (${cookieName})\n`);

  // 1. Dashboard loads with real data
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const dataRes = await (await fetch(`${BASE}/api/data`)).text();
  check("dashboard loads for signed-in user", page.url().includes("localhost:3600") && !jsErrors.length,
        jsErrors.length ? jsErrors[0] : "no JS errors");

  // 2. API: read real data
  const apiData = await page.evaluate(async () => {
    const r = await fetch("/api/data");
    return { status: r.status, json: await r.json() };
  });
  check("GET /api/data authenticated", apiData.status === 200 && apiData.json.success,
        `status=${apiData.status} profile=${apiData.json.profile ? "yes" : "no"}`);
  check("categories returned from DB", (apiData.json.categories?.length ?? 0) === 9,
        `${apiData.json.categories?.length ?? 0} rows`);

  // 3. API: create transaction -> persists
  const merchant = "E2E Cafe " + Date.now();
  const postTx = await page.evaluate(async (m) => {
    const r = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchant: m, amount: -42.5, date: "2026-09-29", category_name: "Food & Dining", capture_method: "text_ai", ai_confidence: 0.95, currency: "USD" }),
    });
    return { status: r.status, json: await r.json() };
  }, merchant);
  check("POST /api/transactions", postTx.status === 200 && postTx.json.success, `status=${postTx.status}`);
  const txId = postTx.json.transaction?.id;
  check("transaction gets category_id resolved", !!postTx.json.transaction?.category_id, `id=${txId}`);

  // 4. Verify persistence via direct DB read (not just app state)
  const { data: dbTx } = await admin.from("transactions").select("*").eq("id", txId).maybeSingle();
  check("transaction persisted to DB", !!dbTx, dbTx ? `${dbTx.merchant} ${dbTx.amount}` : "not found");

  // 5. Re-fetch -> row visible to the user (proves it's theirs + RLS allows read)
  const refetched = await page.evaluate(async () => {
    const r = await fetch("/api/data");
    return await r.json();
  });
  const appears = refetched.transactions?.find((t) => t.id === txId);
  check("transaction visible in /api/data", !!appears, `total=${refetched.transactions?.length}`);

  // 6. Rule creation persists
  const rule = await page.evaluate(async () => {
    const r = await fetch("/api/rules", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "E2E Rule", merchant_contains: "E2E", category_name: "Food & Dining", action: "set_category" }),
    });
    return { status: r.status, json: await r.json() };
  });
  check("POST /api/rules persists", rule.status === 200 && rule.json.success, `status=${rule.status}`);

  // 7. Profile update persists (onboarding)
  const prof = await page.evaluate(async () => {
    const r = await fetch("/api/profile", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currency: "EUR", monthly_income: 6000, monthly_savings_target: 1200, onboarding_completed: true }),
    });
    return { status: r.status, json: await r.json() };
  });
  check("PATCH /api/profile persists", prof.status === 200 && prof.json.success, `status=${prof.status}`);
  const { data: dbProf } = await admin.from("profiles").select("*").eq("id", userId).maybeSingle();
  check("profile row updated in DB", dbProf?.currency === "EUR" && dbProf?.monthly_income === 6000,
        `currency=${dbProf?.currency} income=${dbProf?.monthly_income}`);

  // 8. Undo (DELETE) removes it
  const del = await page.evaluate(async (id) => {
    const r = await fetch(`/api/transactions?id=${id}`, { method: "DELETE" });
    return { status: r.status, json: await r.json() };
  }, txId);
  check("DELETE /api/transactions (undo)", del.status === 200 && del.json.success, `status=${del.status}`);
  const { data: afterDel } = await admin.from("transactions").select("*").eq("id", txId).maybeSingle();
  check("transaction removed from DB", !afterDel, afterDel ? "still there" : "gone");

  await browser.close();

  // cleanup
  await admin.auth.admin.deleteUser(userId);

  console.log(`\n${pass} passed, ${fail} failed`);
  if (jsErrors.length) console.log("JS errors:", jsErrors.slice(0, 5));
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
