
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
const env = Object.fromEntries(
  fs.readFileSync(".env","utf8").split("\n").filter(l=>l.includes("="))
    .map(l=>{const i=l.indexOf("=");return [l.slice(0,i).trim(),l.slice(i+1).trim()];})
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth:{autoRefreshToken:false,persistSession:false}});

const r = await admin.auth.admin.createUser({
  email: "diag-createuser@lumina.dev",
  password: "TestPass123!xyz",
  email_confirm: true,
});
console.log("error:", r.error?.message, "| code:", r.error?.code);
console.log("user:", r.data?.user?.id ?? "none");
