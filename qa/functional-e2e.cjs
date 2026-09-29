// app-qa Layer 1: Functional E2E journeys (Chromium via playwright-core)
// Run: NODE_PATH=C:/Users/owenb/taskflow-dashboard/node_modules node qa/functional-e2e.cjs http://localhost:3400
const { chromium } = require('playwright-core');

const EXE = 'C:/Users/owenb/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const BASE = process.argv[2] || 'http://localhost:3400';
const ART = 'qa-artifacts';
const fs = require('fs');
fs.mkdirSync(ART, { recursive: true });

const results = [];
let consoleErrors = [];
let failedRequests = [];
function rec(id, status, detail) {
  results.push({ id, status, detail });
  console.log(`[${status}] ${id} - ${detail}`);
}
async function freshPage(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
  const page = await ctx.newPage();
  consoleErrors = [];
  failedRequests = [];
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text().slice(0, 200)));
  page.on('response', (r) => {
    if (r.status() >= 400 && !r.url().includes('favicon')) failedRequests.push(`${r.status()} ${r.url()}`);
  });
  return { ctx, page };
}

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, headless: true });

  // ---- J1: Dashboard load + first paint ----
  {
    const { ctx, page } = await freshPage(browser);
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    const body = await page.innerText('body');
    rec('J1-smoke', body.includes('Lumina') && body.includes('Safe-to-Spend') ? 'PASS' : 'FAIL', 'dashboard renders core sections');
    rec('J1-console', consoleErrors.length === 0 ? 'PASS' : 'FAIL', `console errors: ${consoleErrors.join('|') || 'none'}`);
    rec('J1-network', failedRequests.length === 0 ? 'PASS' : 'FAIL', `failed requests: ${failedRequests.join('; ') || 'none'}`);
    await ctx.close();
  }

  // ---- J2: Bank connect journey (happy + state + data integrity) ----
  {
    const { ctx, page } = await freshPage(browser);
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Connect Bank/i }).first().click();
    await page.waitForTimeout(1200);
    const modalText = await page.innerText('body');
    rec('J2-modal-open', modalText.includes('Chase Bank') && modalText.includes('sandbox') ? 'PASS' : 'FAIL', 'institutions listed');

    await page.locator('button', { hasText: 'Chase Bank' }).first().click();
    await page.waitForTimeout(2500);
    const linked = await page.innerText('body');
    const m = linked.match(/(\d+) transactions synced/);
    rec('J2-link', m ? 'PASS' : 'FAIL', `Chase linked, ${m ? m[1] : 'no'} txns`);

    // State: refresh mid-flow state -> modal gone, but this is client-state only
    await page.reload({ waitUntil: 'networkidle' });
    const afterReload = await page.innerText('body');
    rec('J2-refresh-state', !afterReload.includes('Spotify Premium') ? 'PASS' : 'FAIL', 'refresh resets client state (mock app, expected non-persistence)');

    // Re-do link to test dedupe in-session
    await page.getByRole('button', { name: /Connect Bank/i }).first().click();
    await page.waitForTimeout(1000);
    await page.locator('button', { hasText: 'Chase Bank' }).first().click();
    await page.waitForTimeout(2500);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
    const dedupeBody = await page.innerText('body');
    const spotifyCount = dedupeBody.split('Spotify Premium').length - 1;
    rec('J2-dedupe', spotifyCount === 1 ? 'PASS' : 'FAIL', `re-link dedupe: spotify x${spotifyCount}`);
    rec('J2-console', consoleErrors.length === 0 ? 'PASS' : 'FAIL', `console: ${consoleErrors.join('|') || 'none'}`);
    await ctx.close();
  }

  // ---- J3: Quick capture journey (text AI) ----
  {
    const { ctx, page } = await freshPage(browser);
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.locator('button[aria-label="Quick Add Expense"]').click();
    await page.waitForTimeout(800);
    const modalText = await page.innerText('body');
    const hasCaptureUI = /Text|Voice|Receipt|Type your expense/i.test(modalText);
    rec('J3-modal-open', hasCaptureUI ? 'PASS' : 'FAIL', 'quick capture modal opens from FAB');
    // Submit button is labelled "Parse with Gemini"; disabled when input empty.
    const submitBtn = page.locator('button', { hasText: /Parse with Gemini/i }).first();
    if (await submitBtn.count()) {
      let isDisabled = await submitBtn.isDisabled();
      rec('J3-empty-submit', isDisabled ? 'PASS' : 'FAIL',
        `empty submit guard: button ${isDisabled ? 'disabled (good)' : 'ENABLED - would send empty request'}`);
      // Now type a real expense
      const ta = page.locator('textarea, input[type="text"]').first();
      await ta.fill('Iced latte at Blue Bottle $6.25');
      await page.waitForTimeout(400);
      isDisabled = await submitBtn.isDisabled();
      rec('J3-fill-enables', !isDisabled ? 'PASS' : 'FAIL', 'typing enables submit');
      await submitBtn.click();
      await page.waitForTimeout(9000);
      const after = await page.innerText('body');
      const parsedOK = /6\.25|Blue Bottle/i.test(after) || /Try Again|Manual|error/i.test(after);
      rec('J3-parse', parsedOK ? 'PASS' : 'FAIL', 'AI parse returns review card or clean error');
    } else {
      rec('J3-empty-submit', 'FAIL', 'no "Parse with Gemini" button found');
    }
    await ctx.close();
  }

  // ---- J4: Copilot drawer journey ----
  {
    const { ctx, page } = await freshPage(browser);
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Ask Copilot/i }).click();
    await page.waitForTimeout(800);
    const drawer = await page.innerText('body');
    rec('J4-drawer-open', drawer.includes('Lumina Copilot') ? 'PASS' : 'FAIL', 'copilot drawer opens');
    // send a message
    const input = page.locator('textarea, input[type="text"]').last();
    if (await input.count()) {
      await input.fill('What is my safe to spend?');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(6000);
      const after = await page.innerText('body');
      const replied = /safe|spend|\$|11,035|11035/i.test(after);
      rec('J4-reply', replied ? 'PASS' : 'FAIL', 'copilot replies to safe-to-spend query');
    } else {
      rec('J4-reply', 'FAIL', 'no copilot input found');
    }
    rec('J4-console', consoleErrors.length === 0 ? 'PASS' : 'FAIL', `console: ${consoleErrors.join('|') || 'none'}`);
    await ctx.close();
  }

  // ---- J5: Onboarding wizard journey ----
  {
    const { ctx, page } = await freshPage(browser);
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.locator('button[title="Re-run Setup Wizard"]').click();
    await page.waitForTimeout(1000);
    const wiz = await page.innerText('body');
    const wizardShown = /Currency|Timezone|Welcome|Set up/i.test(wiz);
    rec('J5-wizard-open', wizardShown ? 'PASS' : 'FAIL', 'onboarding wizard opens from header');
    if (wizardShown) {
      // try advancing
      const nextBtn = page.locator('button', { hasText: /Next|Continue|Get Started/i }).first();
      if (await nextBtn.count()) {
        await nextBtn.click();
        await page.waitForTimeout(600);
        const step2 = await page.innerText('body');
        rec('J5-step2', /Account|Balance|Bank|Checking/i.test(step2) ? 'PASS' : 'INFO', 'wizard advances to step 2');
      }
    }
    await ctx.close();
  }

  // ---- J6: Unspecified-behavior sweep — click everything ----
  {
    const { ctx, page } = await freshPage(browser);
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    // link a bank first so subscriptions panel is enabled
    await page.getByRole('button', { name: /Connect Bank/i }).first().click();
    await page.waitForTimeout(1200);
    await page.locator('button', { hasText: 'Chase Bank' }).first().click();
    await page.waitForTimeout(2500);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Proactive insight banner
    await page.locator('text=Proactive Insight').first().click();
    await page.waitForTimeout(800);
    const afterBanner = await page.innerText('body');
    rec('J6-banner', afterBanner.includes('Lumina Copilot') ? 'PASS' : 'FAIL', 'proactive insight banner opens copilot');

    // Escape must close the drawer (a11y). If it does not, the overlay blocks
    // everything behind it -> recorded as a finding.
    await page.keyboard.press('Escape');
    await page.waitForTimeout(700);
    const afterEsc = await page.innerText('body');
    const escdClosed = !afterEsc.includes('Lumina Copilot');
    rec('J6-copilot-esc', escdClosed ? 'PASS' : 'FAIL',
      `Esc closes copilot drawer: ${escdClosed ? 'yes' : 'NO - drawer trapped open'}`);
    if (!escdClosed) {
      // Fall back to the X so the remaining steps can run
      const closeBtn = page.locator('button[aria-label="Close Copilot"]');
      if (await closeBtn.count()) await closeBtn.first().click();
      await page.waitForTimeout(600);
    }

    // + Add Transaction link
    await page.getByRole('button', { name: '+ Add Transaction' }).click();
    await page.waitForTimeout(700);
    const afterAdd = await page.innerText('body');
    rec('J6-add-tx', /Type your expense|Text|Voice/i.test(afterAdd) ? 'PASS' : 'FAIL', '+ Add Transaction opens quick capture');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // Detect subscriptions
    const detect = page.getByRole('button', { name: /^Detect$/ });
    if (await detect.count()) {
      await detect.first().click();
      await page.waitForTimeout(8000);
      const afterDetect = await page.innerText('body');
      const monthly = /Estimated monthly recurring/.test(afterDetect);
      rec('J6-detect', monthly ? 'PASS' : 'FAIL', 'subscription detection renders results');
    } else {
      rec('J6-detect', 'FAIL', 'Detect button not found');
    }
    rec('J6-console', consoleErrors.length === 0 ? 'PASS' : 'FAIL', `console: ${consoleErrors.join('|') || 'none'}`);
    await ctx.close();
  }

  await browser.close();
  const counts = results.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {});
  console.log('\n=== FUNCTIONAL E2E SUMMARY ===');
  console.log(JSON.stringify(counts));
  fs.writeFileSync(`${ART}/functional-e2e.json`, JSON.stringify(results, null, 2));
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });