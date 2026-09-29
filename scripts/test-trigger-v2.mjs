
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env", "utf8").split(/\r?\n/).filter(l => l && !l.startsWith("#"))
    .map(l => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const email = "trigger-test3@lumina.dev";
const { data, error } = await sb.auth.admin.createUser({
  email,
  email_confirm: true,
});

if (error) {
  console.log("error message:", error.message);
  console.log("error code:", error.code);
  // Try the error object fully
  console.log("full error:", JSON.stringify(error, null, 2));
  // Check if the trigger function has an issue by calling it directly
  // for the existing user
  const { data: existing } = await sb.auth.admin.listUsers();
  if (existing?.users?.[0]) {
    const uid = existing.users[0].id;
    console.log("testing handle_new_user via direct insert on profiles...");
    const { data: p, error: pErr } = await sb.from("profiles").insert([{ id: uid, email: "owenbhenex+lumina-test@gmail.com", currency: "USD" }]).select();
    console.log("  manual profile insert:", pErr ? pErr.message : "OK");
    
    // Check the trigger definition
    console.log("calling seed_user_default_categories...");
    const { error: seedErr } = await sb.rpc("seed_user_default_categories", { target_user_id: uid });
    console.log("  seed fn:", seedErr ? seedErr.message : "OK");
    const { data: catCount } = await sb.from("categories").select("id").eq("user_id", uid);
    console.log("  categories after seed:", catCount?.length ?? 0);
  }
}
