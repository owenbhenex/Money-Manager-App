// Regression pass after BUG-001/BUG-002 fixes: re-run the P0 UI cases.
const { chromium } = require('playwright-core');
const EXE = 'C:/Users/owenb/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const BASE = process.env.BASE_URL || 'http://localhost:3200';
const OUT = 'qa-evidence/2026-09-28';
const results = [];
function rec(id, area, priority, status, detail) {
  results.push({ id, area, priority, status, detail });
  console.log(`[${status}] ${id} (${area}) - ${detail}`);
}

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const consoleErrors = [];
  const failedRequests = [];
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('response', (r) => r.status() >= 400 && failedRequests.push(`${r.status()} ${r.url()}`));

  // TC-UI-001 smoke
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  const bodyText = await page.innerText('body');
  rec('TC-UI-001', 'Smoke', 'P0',
    bodyText.includes('Lumina') && bodyText.includes('Safe-to-Spend') ? 'PASS' : 'FAIL',
    'Dashboard renders');

  // TC-UI-003 modal
  await page.getByRole('button', { name: /Connect Bank/i }).first().click();
  await page.waitForTimeout(1200);
  const modalText = await page.innerText('body');
  rec('TC-UI-003', 'Bank', 'P0', modalText.includes('Chase Bank') ? 'PASS' : 'FAIL',
    'Institutions listed in modal');

  // TC-UI-004 link Chase
  await page.locator('button', { hasText: 'Chase Bank' }).first().click();
  await page.waitForTimeout(2500);
  const afterLink = await page.innerText('body');
  const m = afterLink.match(/(\d+) transactions synced/);
  rec('TC-UI-004', 'Bank', 'P0', m ? 'PASS' : 'FAIL', `Chase connected ${m ? m[1] + ' txns' : 'no sync'}`);

  // TC-UI-005 ledger
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  const bodyAfter = await page.innerText('body');
  const found = ['Spotify Premium', 'Verizon Wireless', 'Whole Foods Market'].filter((x) => bodyAfter.includes(x));
  rec('TC-UI-005', 'Ledger', 'P0', found.length >= 2 ? 'PASS' : 'FAIL', `synced merchants: ${found.join(', ')}`);

  // TC-A11Y-001 FAB
  const fab = page.locator('button[aria-label="Quick Add Expense"]');
  const fabBox = await fab.boundingBox();
  rec('TC-A11Y-001', 'A11y', 'P1', fabBox && fabBox.width >= 44 ? 'PASS' : 'FAIL',
    `FAB ${fabBox ? Math.round(fabBox.width) + 'x' + Math.round(fabBox.height) : 'n/a'}`);

  // TC-A11Y-004 Esc closes modal (already used above; verify again quickly)
  await page.getByRole('button', { name: /Connect Bank/i }).first().click();
  await page.waitForTimeout(800);
  const vis1 = await page.locator('text=Sandbox mode').isVisible().catch(() => false);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  const vis2 = await page.locator('text=Sandbox mode').isVisible().catch(() => false);
  rec('TC-A11Y-004', 'A11y', 'P1', vis1 && !vis2 ? 'PASS' : 'FAIL', `Esc closed modal (${vis1}->${vis2})`);

  // TC-UI-011 mobile no h-scroll
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(700);
  const hasHScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  rec('TC-UI-011', 'Responsive', 'P2', !hasHScroll ? 'PASS' : 'FAIL', `no horizontal scroll at 375px`);

  // Health
  const realFailures = failedRequests.filter((f) => !f.includes('favicon') && !f.includes('429'));
  rec('TC-UI-009', 'Health', 'P1', realFailures.length === 0 ? 'PASS' : 'FAIL',
    `failed requests: ${realFailures.join('; ') || 'none'}`);
  rec('TC-UI-010', 'Health', 'P1', consoleErrors.length === 0 ? 'PASS' : 'FAIL',
    `console errors: ${consoleErrors.slice(0, 2).join(' | ') || 'none'}`);

  await page.screenshot({ path: `${OUT}/09-regression-after-fixes.png`, fullPage: true });
  await browser.close();
  const counts = results.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {});
  console.log('\n=== REGRESSION SUMMARY ===');
  console.log(JSON.stringify(counts));
  require('fs').writeFileSync(`${OUT}/regression-results.json`, JSON.stringify(results, null, 2));
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });