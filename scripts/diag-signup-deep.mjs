
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
const env = Object.fromEntries(
  fs.readFileSync(".env","utf8").split("\n").filter(l=>l.includes("="))
    .map(l=>{const i=l.indexOf("=");return [l.slice(0,i).trim(),l.slice(i+1).trim()];})
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth:{autoRefreshToken:false,persistSession:false}});
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// 1. List users
const { data } = await admin.auth.admin.listUsers();
console.log("Auth users:", data?.users?.length ?? 0);

// 2. Try signUp with even simpler data
const r = await anon.auth.signUp({ email: "test2@lumina.dev", password: "TestPass123!xyz" });
console.log("signUp:", r.error?.message ?? "OK", "| needs confirmation:", r.data?.user && !r.data.session ? "yes":"no");

// 3. Check if any profile was created despite the error
const { data: p2 } = await admin.from("profiles").select("*").eq("email", "test2@lumina.dev").maybeSingle();
console.log("profile after signup:", p2 ? "YES" : "NO");

// 4. Try RPC to get the function source
const rpcRes = await admin.rpc("get_table_names").catch(() => null);
console.log("rpc capability:", rpcRes?.error?.message ?? "no rpc");

// 5. Profiles policies
const { data: pols } = await admin.from("pg_policies").select("*").eq("tablename","profiles");
if (pols && pols.length) {
  pols.forEach(p => console.log("POLICY profiles:", p.policyname, "cmd:", p.cmd, "qual:", p.qualifier));
} else {
  console.log("pg_policies not accessible via PostgREST");
}
