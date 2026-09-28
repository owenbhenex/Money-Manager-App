// Hydration verification: load the page with a non-en-US browser locale
// (reproducing the original bug's conditions: Node server default vs browser
// locale). The fix pins 'en-US' in formatCurrency, so server and client HTML
// must match and React must report NO recoverable hydration errors.
const { chromium } = require('playwright-core');
const EXE = 'C:/Users/owenb/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const BASE = process.env.BASE_URL || 'http://localhost:3300';

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, headless: true });
  // de-DE formats 11035 as "11.035" — the exact locale family that triggered the bug.
  const ctx = await browser.newContext({ locale: 'de-DE', viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const recoverable = [];
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error' || /hydration|Hydration/.test(t)) recoverable.push(t.slice(0, 300));
  });
  page.on('pageerror', (e) => recoverable.push('pageerror: ' + e.message.slice(0, 300)));

  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const body = await page.innerText('body');
  const hasCorrectFormat = /11,035/.test(body); // en-US formatting everywhere

  console.log('locale: de-DE');
  console.log('hydration/recoverable errors:', recoverable.length);
  recoverable.slice(0, 3).forEach((r) => console.log('  ->', r));
  console.log('Safe-to-Spend rendered as 11,035 (en-US pinned):', hasCorrectFormat);

  const pass = recoverable.length === 0 && hasCorrectFormat;
  console.log(pass ? 'PASS: no hydration mismatch' : 'FAIL: hydration mismatch present');
  await browser.close();
  process.exit(pass ? 0 : 1);
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });