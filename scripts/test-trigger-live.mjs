
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env", "utf8").split(/\r?\n/).filter(l => l && !l.startsWith("#"))
    .map(l => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// 1. Create user via admin API (the REAL signup path)
const email = "trigger-test2@lumina.dev";
const { data: created, error: createErr } = await sb.auth.admin.createUser({
  email,
  email_confirm: true,
});
if (createErr) { console.log("createUser:", createErr.message); process.exit(1); }
console.log("created auth user:", created.user.id);

// 2. Wait a moment for the trigger (synchronous in Postgres, but be safe)
await new Promise(r => setTimeout(r, 1500));

// 3. Check the profile was auto-created
const { data: profile } = await sb.from("profiles").select("id, email, currency").eq("email", email);
console.log("profile auto-created:", profile?.length === 1 ? "YES" : "NO");
if (profile?.[0]) console.log("  ", profile[0]);

// 4. Check categories were seeded
const { data: cats } = await sb.from("categories").select("name").eq("user_id", created.user.id);
console.log("categories seeded:", cats?.length ?? 0, "rows");
if (cats?.length) console.log("  ", cats.map(c => c.name).join(", "));

// 5. Cleanup the test user
const { error: delErr } = await sb.auth.admin.deleteUser(created.user.id);
console.log("cleanup:", delErr ? delErr.message : "deleted test user");
