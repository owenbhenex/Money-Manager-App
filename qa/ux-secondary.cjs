// Verify undo toast + dark-mode; undo exercised via a real UI action that does
// not require Gemini: scanning a receipt also calls handleTransactionSaved, but
// with quota out we instead check the toast via the manual-add fallback path.
const { chromium } = require('playwright-core');
const EXE = 'C:/Users/owenb/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const BASE = process.argv[2] || 'http://localhost:3000';
const results = [];
function rec(id, status, detail) { results.push({ id, status, detail }); console.log('[' + status + '] ' + id + ' - ' + detail); }

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, headless: true });

  // --- Undo toast: reachable without AI? Try the receipt/manual add fallback ---
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.locator('button[aria-label="Quick Add Expense"]').click();
    await page.waitForTimeout(700);
    const ta = page.locator('textarea, input[type="text"]').first();
    await ta.fill('coffee $4.20');
    const btn = page.locator('button', { hasText: 'Parse with Gemini' });
    if (await btn.count()) { await btn.click(); }
    await page.waitForTimeout(9000);
    const body = await page.innerText('body');
    const hasManualFallback = /Manual Entry|Add Manually|Enter manually|Add Transaction/i.test(body);
    rec('U-001-manual-fallback', hasManualFallback ? 'PASS' : 'FAIL',
      'manual-entry fallback offered: ' + hasManualFallback);
    const hasundo = /Undo/i.test(body);
    rec('U-002-undo-toast', hasundo ? 'PASS' : 'FAIL', 'undo toast present: ' + hasundo);
    await ctx.close();
  }

  // --- Dark / light: does the app respect prefers-color-scheme? ---
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    rec('U-003-colorscheme', 'INFO', 'body bg under light scheme: ' + bg);
    await ctx.close();
  }

  // --- Ledger sort / search behaviour ---
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    const search = page.locator('input[type="search"], input[placeholder*="Search" i]');
    if (await search.count()) {
      await search.first().fill('Chipotle');
      await page.waitForTimeout(500);
      const body = await page.innerText('body');
      const filtered = !body.includes('Spotify') && body.includes('Chipotle');
      rec('U-004-search', filtered ? 'PASS' : 'FAIL', 'ledger search filters: ' + filtered);
    } else {
      rec('U-004-search', 'INFO', 'no search input present');
    }
    await ctx.close();
  }

  await browser.close();
  console.log('\n=== UX2 SUMMARY ===');
  console.log(JSON.stringify(results.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {})));
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
