
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env", "utf8").split(/\r?\n/).filter(l => l && !l.startsWith("#"))
    .map(l => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// auth.admin.listUsers gives us the shape without needing SQL
const { data, error } = await sb.auth.admin.listUsers();
if (error) { console.log("admin listUsers:", error.message); process.exit(0); }
console.log("existing auth users:", data.users.length);
if (data.users[0]) {
  const u = data.users[0];
  console.log("sample user keys:", Object.keys(u).join(", "));
}

// Also try the dashboard-users insert through PostgREST with minimal columns
// (id, email are NOT NULL; everything else has defaults)
const { data: inserted, error: insErr } = await sb
  .from("users")
  .insert([{ id: crypto.randomUUID(), email: "trigger-test@lumina.dev", encrypted_password: "x", raw_app_meta_data: { provider: "email", providers: ["email"] } }])
  .select();
console.log("service-role insert into auth users:", insErr ? `${insErr.code} ${insErr.message}` : "INSERTED");
