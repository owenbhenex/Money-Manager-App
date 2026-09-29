const { chromium } = require('playwright-core');
const EXE = 'C:/Users/owenb/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
(async () => {
  const browser = await chromium.launch({ executablePath: EXE, headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto('http://localhost:3600/', { waitUntil: 'networkidle' });
  const search = page.locator('input[aria-label="Search transactions"]');
  await search.click();
  await page.keyboard.type('Chipotle', { delay: 50 });
  await page.waitForTimeout(700);
  // rows inside the ledger container specifically
  const rows = await page.locator('div.divide-y > div.rounded-xl').count();
  console.log('ledger rows after typing Chipotle:', rows);
  const v = await search.inputValue();
  console.log('search value:', JSON.stringify(v));
  // merchants visible in the ledger area only
  const merchants = await page.locator('div.divide-y span.text-sm.font-semibold').allInnerTexts();
  console.log('ledger merchants:', merchants);
  await browser.close();
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
