
import fs from "node:fs";
const env = Object.fromEntries(
  fs.readFileSync(".env","utf8").split("\n").filter(l=>l.includes("="))
    .map(l=>{const i=l.indexOf("=");return [l.slice(0,i).trim(),l.slice(i+1).trim()];})
);
const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function probe(label, path, body, key) {
  const res = await fetch(URL_BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  const txt = await res.text();
  console.log(`\n--- ${label} -> HTTP ${res.status} ---`);
  console.log(txt.slice(0, 600));
}

await probe("admin createUser /auth/v1/admin/users", "/auth/v1/admin/users",
  { email: "raw-admin-test@lumina.dev", password: "TestPass123!xyz", email_confirm: true }, SVC);

await probe("public signup /auth/v1/signup", "/auth/v1/signup",
  { email: "raw-signup-test@lumina.dev", password: "TestPass123!xyz" }, ANON);
