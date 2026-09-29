
// Verify RLS blocks unauthenticated access and allows only own rows.
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env", "utf8").split(/\r?\n/).filter(l => l && !l.startsWith("#"))
    .map(l => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// 1. Without auth: should get an RLS error (empty result or permission denied)
const { data: txnNoAuth, error: txnErr } = await sb.from("transactions").select("*");
console.log("unauthed transactions:", txnErr ? `${txnErr.code} ${txnErr.message}` : `got ${txnNoAuth?.length ?? 0} rows (RLS blocks = empty)`);

// 2. Sign up with magic link to test auth works
const { data: signUpData, error: signUpErr } = await sb.auth.signInWithOtp({
  email: "owenbhenex+lumina-test@gmail.com",
  options: { shouldCreateUser: true, emailRedirectTo: "http://localhost:3600/auth/callback" },
});
console.log("\nauth OTP send:", signUpErr ? signUpErr.message : "magic link sent (check inbox)");

// 3. Check if a trigger exists to auto-create profiles on signup
//    (schema.sql doesn't include one — we'll need to add it)
const { data: triggers, error: trigErr } = await sb.rpc("exec_sql", { query: "SELECT tgname FROM pg_trigger WHERE tgrelid = 'profiles'::regclass;" }).select();
console.log("profile triggers:", trigErr ? "no exec_sql (expected)" : triggers?.length ?? 0);
