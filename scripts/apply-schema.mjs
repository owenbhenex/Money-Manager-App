
// Apply supabase/schema.sql using only node stdlib + already-installed deps.
// Uses Supabase's PostgREST query endpoint when direct psql isn't available.
// Note: `exec_sql` RPC does not exist by default on new projects.
import fs from 'node:fs';

const env = Object.fromEntries(
  fs.readFileSync('.env','utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#'))
    .map(l => [l.slice(0,l.indexOf('=')).trim(), l.slice(l.indexOf('=')+1).trim()])
);
const sql = fs.readFileSync('supabase/schema.sql','utf8');
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) { console.log('FAIL: no SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
});
console.log('status:', res.status);
console.log((await res.text()).slice(0, 600));
