const { chromium } = require('playwright-core');
const EXE = 'C:/Users/owenb/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
(async () => {
  const browser = await chromium.launch({ executablePath: EXE, headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto('http://localhost:3600/', { waitUntil: 'networkidle' });
  const search = page.locator('input[aria-label="Search transactions"]');
  console.log('search inputs found:', await search.count());
  await search.fill('Chipotle');
  await page.waitForTimeout(600);
  const txt = await page.innerText('body');
  console.log('has Chipotle:', txt.includes('Chipotle'));
  console.log('has Whole Foods:', txt.includes('Whole Foods Market'));
  console.log('has Direct Deposit:', txt.includes('Direct Deposit'));
  // count ledger rows
  const rows = await page.locator('div.divide-y > div').count();
  console.log('ledger rows visible:', rows);
  await browser.close();
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
