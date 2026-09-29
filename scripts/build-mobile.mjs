import fs from 'node:fs';
import { execSync } from 'node:child_process';

// Static export can't include server routes (API handlers, auth callbacks),
// so stash them for the build. The mobile shell talks to the hosted API.
const STASH_DIRS = ['app/api', 'app/auth'];
const STASH = 'node_modules/.build-stash';

const moved = [];
try {
  if (fs.existsSync('.next/dev/types/validator.ts')) fs.rmSync('.next/dev/types/validator.ts', { force: true });
  fs.mkdirSync(STASH, { recursive: true });
  for (const dir of STASH_DIRS) {
    if (fs.existsSync(dir)) {
      fs.renameSync(dir, `${STASH}/${dir.replace(/\//g, '__')}`);
      moved.push(dir);
      console.log('stashed', dir);
    }
  }

  execSync('npx next build', { stdio: 'inherit', shell: true, env: { ...process.env, MOBILE_BUILD: '1' } });
  execSync('npx cap sync android', { stdio: 'inherit', shell: true });
} finally {
  for (const dir of moved) {
    fs.renameSync(`${STASH}/${dir.replace(/\//g, '__')}`, dir);
    console.log('restored', dir);
  }
  if (fs.existsSync(STASH)) fs.rmSync(STASH, { recursive: true, force: true });
}
