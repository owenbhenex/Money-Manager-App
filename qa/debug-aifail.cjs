// What does the user actually SEE when AI is down (503 + fallback shape)?
const { chromium } = require('playwright-core');
const EXE = 'C:/Users/owenb/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const BASE = process.argv[2] || 'http://localhost:3000';
(async () => {
  const browser = await chromium.launch({ executablePath: EXE, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: [] });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.locator('button[aria-label="Quick Add Expense"]').click();
  await page.waitForTimeout(700);
  const ta = page.locator('textarea').first();
  await ta.fill('latte $6.25 at Starbucks');
  await page.locator('button', { hasText: 'Parse with Gemini' }).first().click();

  // poll the modal state
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(2000);
    const txt = await page.innerText('body');
    const stillProcessing = /Analyzing|Processing|Loading/i.test(txt);
    if (!stillProcessing) break;
  }
  const txt = await page.innerText('body');
  console.log('--- MODAL TEXT AFTER PARSE ATTEMPT ---');
  console.log(txt.slice(0, 900));
  console.log('--- checks ---');
  console.log('shows any error message:', /unavailable|trouble|error|failed|try again/i.test(txt));
  console.log('shows manual entry fallback:', /Manual Entry/i.test(txt));
  console.log('stuck/explains what happened:', txt.length > 100);
  await ctx.close();
  await browser.close();
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
