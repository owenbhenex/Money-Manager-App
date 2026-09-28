// Retest for BUG-001 (passive: not applicable here, this is the UI retest) and BUG-002.
// BUG-002: Connect Bank must be reachable at mobile 375px.
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
  const page = await (await browser.newContext({ viewport: { width: 375, height: 812 } })).newPage();

  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  // --- BUG-002 retest: mobile entrypoint visible ---
  const mobileConnect = page.getByRole('button', { name: /Connect a bank account/i }).first();
  const visible = await mobileConnect.isVisible().catch(() => false);
  rec('TC-UI-012-RT', 'Responsive', 'P1', visible ? 'PASS' : 'FAIL',
    `Connect Bank visible at 375px: ${visible}`);

  // --- adjacency: connect via in-panel CTA, then verify bank sync on mobile ---
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(400);
  const panelCTA = page.getByRole('button', { name: /Connect a bank/i }).first();
  let viaPanel = await panelCTA.isVisible().catch(() => false);
  if (viaPanel) {
    // Pick the in-panel CTA (the one NOT in the header) — open the connect modal
    const allConnectButtons = page.getByRole('button', { name: /Connect a bank/i });
    const count = await allConnectButtons.count();
    // The header button is first; the panel CTA is the one inside SubscriptionsPanel.
    if (count >= 2) {
      await allConnectButtons.nth(count - 1).click();
      await page.waitForTimeout(1200);
      const modalOpen = await page.locator('text=Chase Bank').isVisible().catch(() => false);
      rec('TC-UI-012-CTA', 'Responsive', 'P2', modalOpen ? 'PASS' : 'FAIL',
        `Panel CTA opens modal on mobile: ${modalOpen}`);
    } else {
      rec('TC-UI-012-CTA', 'Responsive', 'P2', 'FAIL', 'in-panel CTA not found');
    }
  } else {
    rec('TC-UI-012-CTA', 'Responsive', 'P2', 'INFO', 'in-panel CTA not visible (header variant used)');
  }

  // --- also verify the in-panel CTA appears at desktop when no bank connected (fresh load) ---
  const page2 = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page2.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page2.waitForTimeout(600);
  const panelCTAdesktop = page2.getByRole('button', { name: /Connect a bank/i });
  let n = await panelCTAdesktop.count();
  rec('TC-UI-012-DSK', 'Responsive', 'P2', n >= 2 ? 'PASS' : 'INFO',
    `desktop: ${n} Connect-a-bank affordances (header+panel)`);
  await page2.screenshot({ path: `${OUT}/08-desktop-connect-ctas.png`, fullPage: true });

  await browser.close();
  const counts = results.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {});
  console.log('\n=== RETEST SUMMARY ===');
  console.log(JSON.stringify(counts));
  require('fs').writeFileSync(`${OUT}/retest-bug002.json`, JSON.stringify(results, null, 2));
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });