
// One-off: is Supabase reachable, and do our tables exist?
// Rung check: node stdlib + already-installed @supabase/supabase-js. No new deps.
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) { console.log('FAIL: missing SUPABASE env'); process.exit(1); }
console.log('project host:', new URL(url).host);

const sb = createClient(url, anon);
const { data, error } = await sb.from('profiles').select('id').limit(1);
if (error) console.log('profiles query:', error.code, '|', error.message);
else console.log('profiles query: OK, rows =', data.length);

// Check each table we need
for (const t of ['accounts','categories','transactions','spending_rules','ai_insights','bank_connections']) {
  const { error: e } = await sb.from(t).select('id').limit(1);
  console.log(t.padEnd(18), e ? `${e.code} ${e.message}` : 'exists');
}
// Auth provider info
const { data: ad, error: ae } = await sb.auth.getSession();
console.log('anon session call:', ae ? ae.message : 'ok (no session expected)');
