
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env","utf8").split(/\r?\n/).filter(l => l && !l.startsWith("#"))
    .map(l => [l.slice(0,l.indexOf("=")).trim(), l.slice(l.indexOf("=")+1).trim()])
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Drop the broken trigger + function completely, then test signup again to confirm the base works
console.log("=== Testing if signup works WITHOUT the trigger ===");
// We can't drop it via REST, but we can test whether the error persists

// Check the specific user creation without our custom logic
const { data: existing, error: listErr } = await sb.auth.admin.listUsers();
console.log("existing users:", existing?.users?.length ?? 0);
if (listErr) console.log("list error:", listErr.message);

// Check the RLS policies that might block the auth trigger
// The auth.users INSERT is done by supabase_auth_admin role, not service_role.
// Our SECURITY DEFINER function runs as 'postgres' — check what RLS blocks.

// Key insight test: can we insert into profiles AS postgres via SECURITY DEFINER?
// We already know direct insert works. The issue may be that the trigger's
// INSERT INTO profiles has no explicit DEFAULT and email is NOT NULL.
// Check: does the profiles table have any NOT NULL column without default besides email?
console.log("\nprofiles columns with NOT NULL and no default (must be supplied):");
console.log("  Expected: id, email (currency has DEFAULT 'USD')");
console.log("  -> Our function supplies id + email, so this should be fine.");

// Hypothesis: the trigger already ran during the FIRST user creation attempt and
// partially failed. Check for orphaned state.
const { data: allProfiles } = await sb.from("profiles").select("*");
console.log("\nall profiles:", JSON.stringify(allProfiles, null, 1));
