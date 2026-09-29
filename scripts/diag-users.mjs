
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
const env = Object.fromEntries(
  fs.readFileSync(".env","utf8").split("\n").filter(l=>l.includes("="))
    .map(l=>{const i=l.indexOf("=");return [l.slice(0,i).trim(),l.slice(i+1).trim()];})
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth:{autoRefreshToken:false,persistSession:false}});

// List all auth users
const { data, error } = await admin.auth.admin.listUsers();
if (error) { console.log("listUsers error:", error.message); process.exit(1); }
console.log("Total auth users:", data.users.length);
for (const u of data.users) {
  console.log("  ", u.id, u.email, "confirmed:", u.email_confirmed_at ? "yes":"no");
}

// Try anon signUp (what the app actually does)
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const email2 = "signup-test@lumina.dev";
const r2 = await anon.auth.signUp({ email: email2, password: "TestPass123!xyz" });
console.log("\nsignUp result:", r2.error?.message ?? "OK", "| user:", r2.data.user?.id ?? "none", "| session:", r2.data.session ? "yes":"no");

// Check if profile was created
const { data: prof } = await admin.from('profiles').select('*').eq('email', email2).maybeSingle();
console.log("profile for signup-test:", prof ? "YES" : "NO");
