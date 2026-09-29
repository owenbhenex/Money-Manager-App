// app-qa Layer: UI/Responsive + Accessibility basics
// Run: NODE_PATH=C:/Users/owenb/taskflow-dashboard/node_modules node qa/ui-a11y.cjs http://localhost:3400
const { chromium } = require('playwright-core');
const EXE = 'C:/Users/owenb/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const BASE = process.argv[2] || 'http://localhost:3400';
const ART = 'qa-artifacts';
const fs = require('fs');
fs.mkdirSync(ART, { recursive: true });
const results = [];
function rec(id, status, detail) { results.push({ id, status, detail }); console.log(`[${status}] ${id} - ${detail}`); }

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, headless: true });

  // ---- A1: Escape closes every overlay ----
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });

    await page.locator('button[aria-label="Quick Add Expense"]').click();
    await page.waitForTimeout(700);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    let body = await page.innerText('body');
    rec('A1-qc-esc', !/AI Quick Capture/i.test(body) ? 'PASS' : 'FAIL', 'Esc closes Quick Capture');

    await page.getByRole('button', { name: /Connect Bank/i }).first().click();
    await page.waitForTimeout(1000);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    body = await page.innerText('body');
    rec('A1-bank-esc', !/Sandbox mode/i.test(body) ? 'PASS' : 'FAIL', 'Esc closes Bank Connect');

    await page.getByRole('button', { name: /Ask Copilot/i }).click();
    await page.waitForTimeout(800);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    body = await page.innerText('body');
    const copilotClosed = !/Lumina Copilot/i.test(body);
    rec('A1-copilot-esc', copilotClosed ? 'PASS' : 'FAIL', `Esc closes Copilot: ${copilotClosed ? 'yes' : 'NO'}`);
    if (!copilotClosed) {
      const x = page.locator('button[aria-label="Close Copilot"]');
      if (await x.count()) await x.first().click();
      await page.waitForTimeout(400);
    }
    await ctx.close();
  }

  // ---- A2: Touch targets >= 44x44 ----
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    const bad = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('button, a, [role="button"]').forEach((el) => {
        const r = el.getBoundingClientRect();
        if ((r.width > 0 && r.height > 0) && (r.width < 44 || r.height < 44)) {
          const lbl = el.getAttribute('aria-label') || el.innerText || el.tagName;
          out.push(Math.round(r.width) + 'x' + Math.round(r.height) + ' ' + String(lbl).trim().slice(0, 30));
        }
      });
      return out;
    });
    rec('A2-touch-targets', bad.length === 0 ? 'PASS' : 'FAIL', 'under-44px: ' + (bad.join('; ') || 'none'));
    await ctx.close();
  }

  // ---- A3: Headings, landmarks, button labels ----
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    const st = await page.evaluate(() => ({
      h1: document.querySelectorAll('h1').length,
      main: document.querySelectorAll('main').length,
      unlabeled: Array.from(document.querySelectorAll('button')).filter((b) => {
        const lbl = (b.getAttribute('aria-label') || b.innerText || b.title || '').trim();
        return !lbl;
      }).length,
    }));
    rec('A3-h1', st.h1 >= 1 ? 'PASS' : 'FAIL', 'h1 count: ' + st.h1);
    rec('A3-main', st.main >= 1 ? 'PASS' : 'FAIL', 'main landmark: ' + st.main);
    rec('A3-labels', st.unlabeled === 0 ? 'PASS' : 'FAIL', 'unlabeled buttons: ' + st.unlabeled);
    await ctx.close();
  }

  // ---- R1: Responsive no horizontal scroll, key elements reachable ----
  {
    for (const vp of [{ n: '320', w: 320, h: 568 }, { n: '375', w: 375, h: 812 }, { n: '768', w: 768, h: 1024 }, { n: '1024', w: 1024, h: 768 }, { n: '1440', w: 1440, h: 900 }]) {
      const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
      const page = await ctx.newPage();
      await page.goto(BASE + '/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      const info = await page.evaluate(() => ({
        scrollW: document.documentElement.scrollWidth,
        winW: window.innerWidth,
      }));
      const overflow = info.scrollW > info.winW + 2;
      rec('R1-scroll-' + vp.n, !overflow ? 'PASS' : 'FAIL', `${vp.n}px horizontal scroll: ${overflow} (${info.scrollW} vs ${info.winW})`);
      // mobile: Connect Bank must be reachable
      if (vp.w < 640) {
        const vis = await page.getByRole('button', { name: /Connect a bank account/i }).first().isVisible().catch(() => false);
        rec('R1-mobilebank-' + vp.n, vis ? 'PASS' : 'FAIL', `${vp.n}px Connect Bank reachable: ${vis}`);
      }
      await page.screenshot({ path: `${ART}/responsive-${vp.n}.png`, fullPage: false });
      await ctx.close();
    }
  }

  await browser.close();
  const counts = results.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {});
  console.log('\n=== UI / A11Y SUMMARY ===');
  console.log(JSON.stringify(counts));
  fs.writeFileSync(`${ART}/ui-a11y.json`, JSON.stringify(results, null, 2));
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
