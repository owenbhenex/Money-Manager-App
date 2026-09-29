
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env","utf8").split(/\r?\n/).filter(l => l && !l.startsWith("#"))
    .map(l => [l.slice(0,l.indexOf("=")).trim(), l.slice(l.indexOf("=")+1).trim()])
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Try a few ways to read the function body
for (const name of ["handle_new_user", "seed_user_default_categories"]) {
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "OPTIONS",
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
  });
  console.log(name, "OPTIONS:", res.status);
}

// Check RLS status + whether service role can insert into auth
const { data: pols, error: polErr } = await sb.rpc("pg_policies" as any).select?.() ?? {};
console.log("policies probe:", polErr ? polErr.message : "n/a");
