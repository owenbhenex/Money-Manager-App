// Tier A/B UI test for Lumina Money - drives real Chromium via playwright-core.
// Run with: NODE_PATH=C:/Users/owenb/taskflow-dashboard/node_modules node qa-evidence/ui-test.cjs
const { chromium } = require('playwright-core');

const EXE =
  'C:/Users/owenb/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const BASE = 'http://localhost:3100';
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
  page.on('response', (r) => {
    if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.url()}`);
  });

  // ---------- TC-UI-001: dashboard smoke ----------
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const bodyText = await page.innerText('body');
  if (bodyText.includes('Lumina') && bodyText.includes('Safe-to-Spend')) {
    rec('TC-UI-001', 'Smoke', 'P0', 'PASS', 'Dashboard renders Lumina shell + Safe-to-Spend');
  } else {
    rec('TC-UI-001', 'Smoke', 'P0', 'FAIL', 'Dashboard missing expected content');
  }
  await page.screenshot({ path: `${OUT}/01-dashboard.png`, fullPage: false });

  // ---------- TC-UI-002: initial transaction count ----------
  const rowsBefore = await page.locator('text=Chipotle Mexican Grill').count();
  const txRowsBefore = await page.evaluate(() => document.body.innerText.split('\n').length);
  rec('TC-UI-002', 'Ledger', 'P1', 'INFO', `rendered ${txRowsBefore} text lines before sync`);

  // ---------- TC-UI-003: open Connect Bank modal ----------
  const connectBtn = page.getByRole('button', { name: /Connect Bank/i });
  if (!(await connectBtn.count())) {
    rec('TC-UI-003', 'Bank', 'P0', 'FAIL', 'Connect Bank button not found');
  } else {
    await connectBtn.first().click();
    await page.waitForTimeout(1200);
    const modalText = await page.innerText('body');
    if (modalText.includes('Chase Bank') && modalText.includes('sandbox')) {
      rec('TC-UI-003', 'Bank', 'P0', 'PASS', 'Modal open, institutions listed (Chase visible)');
    } else {
      rec('TC-UI-003', 'Bank', 'P0', 'FAIL', 'Institutions not rendered in modal');
    }
    await page.screenshot({ path: `${OUT}/02-bank-modal.png` });
  }

  // ---------- TC-UI-004: link Chase ----------
  const chaseBtn = page.locator('button', { hasText: 'Chase Bank' }).first();
  if (await chaseBtn.count()) {
    await chaseBtn.click();
    await page.waitForTimeout(2500);
    const afterLink = await page.innerText('body');
    if (afterLink.includes('connected') && afterLink.includes('transactions synced')) {
      const m = afterLink.match(/(\d+) transactions synced/);
      rec('TC-UI-004', 'Bank', 'P0', 'PASS', `Chase connected, ${m ? m[1] : '?'} txns synced`);
    } else {
      rec('TC-UI-004', 'Bank', 'P0', 'FAIL', 'Success state not shown after linking');
    }
    await page.screenshot({ path: `${OUT}/03-bank-connected.png` });
  } else {
    rec('TC-UI-004', 'Bank', 'P0', 'BLOCKED', 'Chase button not present');
  }

  // ---------- TC-UI-005: close modal, verify synced txns in ledger ----------
  const closeBtn = page.locator('button[aria-label], button').filter({ hasText: '' });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  const bodyAfter = await page.innerText('body');
  // Sandbox syncs include Spotify Premium / Verizon / Whole Foods
  const found = ['Spotify Premium', 'Verizon Wireless', 'Whole Foods Market'].filter((m) =>
    bodyAfter.includes(m)
  );
  if (found.length >= 2) {
    rec('TC-UI-005', 'Ledger', 'P0', 'PASS', `Synced txns visible in ledger: ${found.join(', ')}`);
  } else {
    rec('TC-UI-005', 'Ledger', 'P0', 'FAIL', `Expected synced merchants missing. Found: ${found}`);
  }
  await page.screenshot({ path: `${OUT}/04-ledger-after-sync.png`, fullPage: true });

  // ---------- TC-UI-006: subscriptions panel ----------
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  const subPanel = await page.innerText('body');
  if (subPanel.includes('Recurring Subscriptions')) {
    rec('TC-UI-006', 'Subscriptions', 'P1', 'PASS', 'Subscriptions panel rendered');
  } else {
    rec('TC-UI-006', 'Subscriptions', 'P1', 'FAIL', 'Subscriptions panel not found');
  }

  // Count institutions connected -> panel should enable Detect
  const detectBtn = page.getByRole('button', { name: /Detect/i });
  let detectEnabled = false;
  if (await detectBtn.count()) {
    detectEnabled = await detectBtn.first().isEnabled();
    rec(
      'TC-UI-007',
      'Subscriptions',
      'P1',
      detectEnabled ? 'PASS' : 'FAIL',
      `Detect button ${detectEnabled ? 'enabled' : 'DISABLED'} after bank connect`
    );
    await page.screenshot({ path: `${OUT}/05-subs-panel-empty.png` });

    // ---------- TC-UI-008: run detection ----------
    await detectBtn.first().click();
    await page.waitForTimeout(6000);
    const afterDetect = await page.innerText('body');
    const hasMonthly = /Estimated monthly recurring/.test(afterDetect);
    const hasSubs = ['Spotify Premium', 'Verizon Wireless', 'iCloud Storage'].filter((s) =>
      afterDetect.includes(s)
    );
    if (hasMonthly && hasSubs.length >= 2) {
      const mt = afterDetect.match(/\$[\d,]+\.?\d*/g);
      rec(
        'TC-UI-008',
        'Subscriptions',
        'P0',
        'PASS',
        `Detection rendered cards: ${hasSubs.join(', ')}`
      );
    } else {
      rec(
        'TC-UI-008',
        'Subscriptions',
        'P0',
        'FAIL',
        `Detection incomplete. monthly=${hasMonthly} subs=${hasSubs}`
      );
    }
    await page.screenshot({ path: `${OUT}/06-subs-detected.png`, fullPage: true });
  } else {
    rec('TC-UI-007', 'Subscriptions', 'P1', 'FAIL', 'Detect button not found');
  }

  // ---------- TC-UI-009: console/network health ----------
  const realFailures = failedRequests.filter((f) => !f.includes('favicon'));
  rec(
    'TC-UI-009',
    'Health',
    'P1',
    realFailures.length === 0 ? 'PASS' : 'FAIL',
    `failed requests: ${realFailures.length ? realFailures.join('; ') : 'none'}`
  );
  rec(
    'TC-UI-010',
    'Health',
    'P1',
    consoleErrors.length === 0 ? 'PASS' : 'FAIL',
    `console errors: ${consoleErrors.length ? consoleErrors.slice(0, 3).join(' | ') : 'none'}`
  );

  // ---------- TC-UI-011: mobile viewport ----------
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(700);
  const hasHScroll = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 2
  );
  rec(
    'TC-UI-011',
    'Responsive',
    'P2',
    hasHScroll ? 'FAIL' : 'PASS',
    `375px width horizontal scroll: ${hasHScroll}`
  );
  await page.screenshot({ path: `${OUT}/07-mobile-375.png`, fullPage: false });

  // Connect Bank button is sm:flex (hidden on mobile) - note it
  const mobileConnect = await page
    .getByRole('button', { name: /Connect Bank/i })
    .first()
    .isVisible()
    .catch(() => false);
  rec(
    'TC-UI-012',
    'Responsive',
    'P2',
    mobileConnect ? 'PASS' : 'FAIL',
    `Connect Bank visible on mobile 375px: ${mobileConnect}`
  );

  await browser.close();

  const counts = results.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {});
  console.log('\n=== SUMMARY ===');
  console.log(JSON.stringify(counts));
  require('fs').writeFileSync(
    `${OUT}/ui-results.json`,
    JSON.stringify(results, null, 2)
  );
})().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
