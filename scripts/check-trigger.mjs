
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env", "utf8").split(/\r?\n/).filter(l => l && !l.startsWith("#"))
    .map(l => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Try to count profiles/categories via a direct API read (service role bypasses RLS)
const { data: profiles, error: pErr } = await sb.from("profiles").select("id, email, currency");
console.log("profiles:", pErr ? pErr.message : `${profiles.length} row(s)`);
if (profiles?.length) console.log("  ", profiles);

const { data: cats, error: cErr } = await sb.from("categories").select("id, user_id, name, is_system");
console.log("categories:", cErr ? cErr.message : `${cats.length} row(s)`);
if (cats?.length) {
  const byUser = cats.reduce((a, c) => { a[c.user_id] = (a[c.user_id] || 0) + 1; return a; }, {});
  console.log("   per user:", byUser);
}

// Try calling the seed function directly to see if it works
if (profiles?.length) {
  const uid = profiles[0].id;
  const { error: seedErr } = await sb.rpc("seed_user_default_categories", { target_user_id: uid });
  console.log("seed fn on existing profile:", seedErr ? seedErr.message : "ok");
  const { data: after } = await sb.from("categories").select("id").eq("user_id", uid);
  console.log("   categories for that user after seed:", after?.length ?? 0);
}
