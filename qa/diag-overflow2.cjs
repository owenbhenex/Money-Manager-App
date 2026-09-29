// Diagnose horizontal overflow at small widths
const { chromium } = require('playwright-core');
const EXE = 'C:/Users/owenb/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const BASE = process.argv[2] || 'http://localhost:3400';

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, headless: true });
  for (const w of [320, 375]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const info = await page.evaluate(() => {
      const docW = document.documentElement.scrollWidth;
      const winW = window.innerWidth;
      const bad = [];
      document.querySelectorAll('*').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.right > winW + 1 && r.width > 0) {
          const lbl = el.getAttribute('aria-label') || el.innerText || el.className || el.tagName;
          bad.push(Math.round(r.width) + 'px ' + String(lbl).trim().slice(0, 40));
        }
        return bad;
      });
      return { docW, winW, bad: bad.slice(0, 8) };
    });
    console.log(w + 'px:', JSON.stringify(info));
    await ctx.close();
  }
  await browser.close();
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
