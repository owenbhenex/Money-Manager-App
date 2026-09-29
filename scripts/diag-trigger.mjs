
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env", "utf8").split(/\r?\n/).filter(l => l && !l.startsWith("#"))
    .map(l => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Check if the earlier magic-link user got a profile
const { data: profiles } = await sb.from("profiles").select("id, email, currency");
console.log("current profiles:", JSON.stringify(profiles));

// Test: does the trigger fire when we call auth.admin.createUser with minimal args?
// Try the "signInWithOtp" path instead — that's what the app uses
console.log("\ntesting OTP path (what the app actually calls):");
const { error: otpErr } = await sb.auth.signInWithOtp({
  email: "trigger-test4@lumina.dev",
  options: { shouldCreateUser: true, emailRedirectTo: "http://localhost:3600/auth/callback" },
});
console.log("  OTP send:", otpErr ? `${otpErr.code} ${otpErr.message}` : "SENT");

await new Promise(r => setTimeout(r, 2000));
const { data: afterP } = await sb.from("profiles").select("id, email").eq("email", "trigger-test4@lumina.dev");
console.log("  profile created by OTP:", afterP?.length === 1 ? "YES" : "NO");
