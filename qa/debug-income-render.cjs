
const { chromium } = require("playwright-core");
const BASE = "http://localhost:3000";
const EXE = "C:/Users/owenb/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe";

(async () => {
  const browser = await chromium.launch({ executablePath: EXE });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  // Add income
  await page.locator('button:has-text("+ Add Transaction")').first().click();
  await page.waitForTimeout(600);
  await page.locator('button:has-text("Income")').first().click();
  await page.fill("#tx-amount", "1234");
  await page.fill("#tx-merchant", "qa_render_check");
  await page.locator('button[type="submit"]:has-text("Save")').click();
  await page.waitForTimeout(1500);

  // Read the actual rendered amount text for this row
  const txt = await page.evaluate(() => {
    const rows = [...document.querySelectorAll("div")].filter(d =>
      d.textContent?.includes("qa_render_check") && d.className?.includes?.("justify-between"));
    return rows.map(r => r.textContent.trim().slice(0, 120));
  });
  console.log("RENDERED ROWS:");
  txt.forEach(t => console.log("  " + t));

  await browser.close();
})();
