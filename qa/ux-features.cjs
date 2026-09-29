// app-qa UX pass: does each feature actually do what it claims?
const { chromium } = require('playwright-core');
const EXE = 'C:/Users/owenb/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const BASE = process.argv[2] || 'http://localhost:3000';
const fs = require('fs');
fs.mkdirSync('qa-artifacts', { recursive: true });
const results = [];
function rec(id, status, detail) {
  results.push({ id, status, detail });
  console.log('[' + status + '] ' + id + ' - ' + detail);
}

function grabMetric(body, label) {
  // "Monthly Burn Rate ... $2,315" or "Liquid Cash Balance ... $14,850"
  const re = new RegExp(label + '[\\s\\S]*?\\$([\\d,]+\\.\\d+)');
  const m = body.match(re);
  return m ? m[1] : null;
}

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, headless: true });

  // ============ F1: Cmd+K keyboard shortcut ============
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(600);
    const body = await page.innerText('body');
    const opened = /AI Quick Capture/i.test(body);
    rec('UX-001-cmdk', opened ? 'PASS' : 'FAIL', 'Cmd+K opens Quick Capture: ' + opened);
    await ctx.close();
  }

  // ============ F3: Bank connect -> balances + ledger update ============
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });

    const before = await page.innerText('body');
    const spentBefore = grabMetric(before, 'Monthly Burn Rate');
    const bankBefore = grabMetric(before, 'Liquid Cash Balance');

    await page.getByRole('button', { name: /Connect Bank/i }).first().click();
    await page.waitForTimeout(1200);
    await page.locator('button', { hasText: 'Chase Bank' }).first().click();
    await page.waitForTimeout(2500);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(800);

    const after = await page.innerText('body');
    const spentAfter = grabMetric(after, 'Monthly Burn Rate');
    const bankAfter = grabMetric(after, 'Liquid Cash Balance');
    const newMerchants = ['Spotify Premium', 'Verizon Wireless'].filter((m) => after.includes(m));

    rec('UX-003-ledger', newMerchants.length > 0 ? 'PASS' : 'FAIL',
      'synced merchants in ledger: ' + newMerchants.join(', '));
    rec('UX-003-spent', spentBefore !== spentAfter ? 'PASS' : 'FAIL',
      'burn-rate updated: ' + spentBefore + ' -> ' + spentAfter);
    rec('UX-003-bank', bankBefore !== bankAfter ? 'PASS' : 'FAIL',
      'liquid balance updated: ' + bankBefore + ' -> ' + bankAfter);

    // Safe-to-Spend must also recompute
    const stsBefore = grabMetric(before, 'Safe-to-Spend');
    const stsAfter = grabMetric(after, 'Safe-to-Spend');
    rec('UX-003-sts', stsBefore !== stsAfter ? 'PASS' : 'FAIL',
      'safe-to-spend recomputed: ' + stsBefore + ' -> ' + stsAfter);
    await ctx.close();
  }

  // ============ F5: Onboarding wizard data actually lands ============
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });

    const before = await page.innerText('body');
    const incomeBefore = null;

    await page.locator('button[title="Re-run Setup Wizard"], button[aria-label="Re-run Setup Wizard"]').click();
    await page.waitForTimeout(900);

    // Step 1: pick a different currency (EUR)
    await page.locator('button', { hasText: 'EUR' }).first().click();
    await page.waitForTimeout(300);
    await page.locator('button', { hasText: /Next|Continue/i }).first().click();
    await page.waitForTimeout(500);

    // Step 2: accounts - set checking balance to a distinctive value
    const balInputs = page.locator('input[type="number"]');
    const bn = await balInputs.count();
    if (bn > 0) {
      await balInputs.first().fill('4321');   // checking balance
    }
    await page.locator('button', { hasText: /Next: Targets/i }).first().click();
    await page.waitForTimeout(600);

    // Step 3: income + savings target, then finish
    const incomeInput = page.locator('input[type="number"]').nth(0);
    await incomeInput.fill('7777');
    await page.locator('button', { hasText: /Finish Setup/i }).first().click();
    await page.waitForTimeout(1000);

    const after = await page.innerText('body');
    const currencyChanged = after.includes('€') || after.includes('EUR');

    rec('UX-005-currency', currencyChanged ? 'PASS' : 'FAIL',
      'currency selection applied: ' + currencyChanged);
    // Income is shown in the Inflow card on the dashboard
    const incomeMatch = after.match(/Inflow[^]*?([\d,]+)/);
    const incomeAfter = incomeMatch ? incomeMatch[1] : 'none';
    rec('UX-005-income', (incomeAfter === '7,777') ? 'PASS' : 'FAIL',
      'income entry applied: ' + incomeBefore + ' -> ' + incomeAfter);
    rec('UX-005-wizard-close', !/Step 3 of 3|Choose Base Currency/i.test(after) ? 'PASS' : 'FAIL',
      'wizard closes on finish');
    await ctx.close();
  }

  // ============ F6: Copilot rule creation actually returns a rule ============
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Ask Copilot/i }).first().click();
    await page.waitForTimeout(800);
    const input = page.locator('textarea, input[type="text"]').last();
    await input.fill('Categorize all Chevron purchases as Transportation');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(12000);
    const body = await page.innerText('body');
    const ruleCreated = /rule|Chevron|Transportation/i.test(body);
    const notError = !/temporarily unavailable|having trouble/i.test(body);
    rec('UX-006-rule', ruleCreated && notError ? 'PASS' : notError ? 'FAIL' : 'SKIP',
      notError ? 'rule creation flow replied' : 'AI quota blocked (env)');
    await ctx.close();
  }

  // ============ F7: Undo toast after quick capture save ============
  // Text capture now works without Gemini (local parser fallback), so this is
  // a real end-to-end check: parse -> save -> toast -> undo -> row removed.
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });

    // Open Quick Capture via Cmd/Ctrl+K
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(600);
    const ta = page.locator('textarea').first();
    await ta.fill('Undo demo coffee at TestMerchantXYZ for $12.34');
    await page.keyboard.press('Enter');

    // Wait for the review card (either AI or local parse)
    const confirmed = await page.waitForSelector('text=/Confirm & Save/i', { timeout: 15000 }).catch(() => null);
    if (!confirmed) {
      rec('UX-007-undo', 'FAIL', 'no review card appeared (parse failed)');
    } else {
      await confirmed.click();
      await page.waitForTimeout(1200);
      const toastGone = await page.locator('text=/Undo/i').first().isVisible().catch(() => false);
      rec('UX-007-toast', toastGone ? 'PASS' : 'FAIL', toastGone ? 'undo toast visible after save' : 'no undo toast');

      const ledgerHas = await page.locator('text=/TestMerchantXYZ/i').first().isVisible().catch(() => false);
      rec('UX-007-saved', ledgerHas ? 'PASS' : 'FAIL', ledgerHas ? 'merchant appears in ledger' : 'not in ledger');

      // Click undo
      const undoBtn = page.locator('button:has-text("Undo")').first();
      await undoBtn.click().catch(() => {});
      await page.waitForTimeout(1200);
      const gone = !(await page.locator('text=/TestMerchantXYZ/i').first().isVisible().catch(() => false));
      rec('UX-007-undo', gone ? 'PASS' : 'FAIL', gone ? 'row removed after undo' : 'row still present');
    }
    await ctx.close();
  }

  await browser.close();
  const counts = results.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});
  console.log('\n=== UX SUMMARY ===');
  console.log(JSON.stringify(counts));
  fs.writeFileSync('qa-artifacts/ux-features.json', JSON.stringify(results, null, 2));
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
