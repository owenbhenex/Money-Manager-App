
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
const env = Object.fromEntries(
  fs.readFileSync(".env","utf8").split("\n").filter(l=>l.includes("="))
    .map(l=>{const i=l.indexOf("=");return [l.slice(0,i).trim(),l.slice(i+1).trim()];})
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth:{autoRefreshToken:false,persistSession:false}});

// Does the trigger still exist? (via information_schema, exposed through PostgREST)
const { data: trig, error: terr } = await admin
  .from("information_schema.triggers")
  .select("trigger_name, event_object_table, action_statement, action_timing")
  .eq("trigger_name", "on_auth_user_created");
console.log("== TRIGGER ==");
if (terr) console.log("query error:", terr.message);
else if (!trig || trig.length === 0) console.log("NOT FOUND — trigger does not exist");
else trig.forEach(t => console.log(`  ${t.trigger_name} ${t.action_timing} ${t.event_object_table} -> ${t.action_statement}`));

// Function definition
const { data: func, error: ferr } = await admin
  .from("pg_proc")
  .select("proname")
  .eq("proname", "handle_new_user");
console.log("== FUNCTION handle_new_user ==", ferr ? ferr.message : (func.length ? "EXISTS" : "NOT FOUND"));

// Orphaned rows
const { data: profs } = await admin.from("profiles").select("id, email, currency, onboarding_completed");
console.log("== PROFILES ==", profs?.length ?? 0, "rows");
(profs ?? []).forEach(p => console.log("  ", p.email, p.currency, "completed:", p.onboarding_completed));

const { data: cats } = await admin.from("categories").select("user_id, name");
console.log("== CATEGORIES ==", cats?.length ?? 0, "rows");

const { data: tx } = await admin.from("transactions").select("id");
console.log("== TRANSACTIONS ==", tx?.length ?? 0, "rows");
