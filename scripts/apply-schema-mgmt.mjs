
import fs from 'node:fs';

const env = Object.fromEntries(
  fs.readFileSync('.env','utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#'))
    .map(l => [l.slice(0,l.indexOf('=')).trim(), l.slice(l.indexOf('=')+1).trim()])
);
const url = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
const ref = url.host.split('.')[0];
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const sql = fs.readFileSync('supabase/schema.sql','utf8');

console.log('project ref:', ref);
const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql }),
});
console.log('status:', res.status);
console.log((await res.text()).slice(0, 800));
