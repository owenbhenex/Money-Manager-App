/**
 * QA: core money management features
 *   Money-01..12 = income/expense capture, accounts, income-vs-expense card
 */
const { chromium } = require("playwright-core");

const BASE = process.env.BASE || "http://localhost:3000";
const EXE = "C:/Users/owenb/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe";

(async () => {
  const browser = await chromium.launch({ executablePath: EXE });
  const results = [];
  const rec = (id, status, note = "") => {
    results.push({ id, status, note });
    console.log(`[${status}] ${id}${note ? " - " + note : ""}`);
  };
  const errors = [];

  // ---------- Desktop ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push("console: " + m.text().slice(0, 140));
    });

    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);

    // Money-01: Income vs Expenses card present
    const cardText = await page.textContent("body");
    const hasCard = cardText.includes("Income vs Expenses");
    rec("Money-01-card", hasCard ? "PASS" : "FAIL", hasCard ? "Income vs Expenses card rendered" : "card missing");

    // Money-02: income/expense/savings-rate figures present
    const income = await page.textContent('[data-testid="income-total"]').catch(() => null);
    const expense = await page.textContent('[data-testid="expense-total"]').catch(() => null);
    const rate = await page.textContent('[data-testid="savings-rate"]').catch(() => null);
    rec("Money-02-figures", income && expense && rate ? "PASS" : "FAIL",
        `income=${income} expense=${expense} rate=${rate}`);

    // Money-03: surplus/deficit badge
    const net = await page.textContent('[data-testid="net-savings"]').catch(() => null);
    rec("Money-03-net", net ? "PASS" : "FAIL", `net badge = ${net}`);

    // Money-04: Add Transaction opens the new modal (income + expense toggle)
    await page.locator('button:has-text("+ Add Transaction")').first().click();
    await page.waitForTimeout(700);
    const modalVisible = await page.locator('[aria-label="Add transaction"]').isVisible().catch(() => false);
    rec("Money-04-modal-open", modalVisible ? "PASS" : "FAIL", modalVisible ? "modal opened" : "did not open");

    // Money-05: income toggle exists
    const incomeBtn = page.locator('button:has-text("Income")').first();
    const hasIncomeToggle = await incomeBtn.isVisible().catch(() => false);
    rec("Money-05-income-toggle", hasIncomeToggle ? "PASS" : "FAIL", hasIncomeToggle ? "income type available" : "no income option");

    // Money-06: Add an INCOME transaction
    await incomeBtn.click();
    await page.waitForTimeout(300);
    await page.fill("#tx-amount", "2500");
    await page.fill("#tx-merchant", "qa_salary_inflow");
    const beforeIncome = income;
    await page.locator('button[type="submit"]:has-text("Save")').click();
    await page.waitForTimeout(1500);

    const bodyAfter = await page.textContent("body");
    const incomeLanded = bodyAfter.includes("qa_salary_inflow");
    rec("Money-06-income-saved", incomeLanded ? "PASS" : "FAIL", incomeLanded ? "income appears in ledger" : "not in ledger");

    const incomeAfter = await page.textContent('[data-testid="income-total"]').catch(() => null);
    rec("Money-07-income-updated", incomeAfter !== beforeIncome ? "PASS" : "FAIL",
        `income ${beforeIncome} -> ${incomeAfter}`);

    // Money-08: income shows positive (+ amount) in the ledger row
    const rowText = await page.evaluate(() => {
      const rows = [...document.querySelectorAll("div")].filter(
        (d) => d.textContent?.includes("qa_salary_inflow") && d.className?.includes?.("justify-between"),
      );
      return rows.length ? rows[0].textContent.trim() : "";
    });
    const showsPlus = /\+/.test(rowText);
    rec("Money-08-income-positive", showsPlus ? "PASS" : "FAIL",
        showsPlus ? `row shows: ${rowText.slice(0, 45)}` : `no + sign: ${rowText.slice(0, 45)}`);

    // Money-09: Add an EXPENSE with account + category
    await page.locator('button:has-text("+ Add Transaction")').first().click();
    await page.waitForTimeout(600);
    await page.locator('button:has-text("Expense")').first().click();
    await page.fill("#tx-amount", "77.50");
    await page.fill("#tx-merchant", "qa_expense_outflow");
    await page.waitForTimeout(300);
    const beforeExp = await page.getAttribute('[data-testid="expense-total"]', "textContent").catch(() => null);
    await page.locator('button[type="submit"]:has-text("Save")').click();
    await page.waitForTimeout(1500);
    const b3 = await page.textContent("body");
    rec("Money-09-expense-saved", b3.includes("qa_expense_outflow") ? "PASS" : "FAIL",
        b3.includes("qa_expense_outflow") ? "expense in ledger" : "not saved");
    const expAfter = await page.textContent('[data-testid="expense-total"]').catch(() => null);
    rec("Money-10-expense-updated", expAfter !== beforeExp ? "PASS" : "FAIL", `expense ${beforeExp} -> ${expAfter}`);

    // Money-11: validation — empty fields must not save
    await page.locator('button:has-text("+ Add Transaction")').first().click();
    await page.waitForTimeout(600);
    const submitDisabled = await page.locator('button[type="submit"]:has-text("Save")').isDisabled().catch(() => null);
    rec("Money-11-validation", submitDisabled === true ? "PASS" : "FAIL",
        submitDisabled === true ? "submit disabled when empty" : `disabled=${submitDisabled}`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    const closed = !(await page.locator('[aria-label="Add transaction"]').isVisible().catch(() => false));
    rec("Money-12-esc-closes", closed ? "PASS" : "FAIL", closed ? "Esc closes modal" : "Esc did not close");

    await ctx.close();
  }

  // ---------- Mobile: card must not overflow ----------
  for (const w of [320, 375, 768]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(`pageerror@${w}: ` + e.message));
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.waitForTimeout(900);
    const overflow = await page.evaluate(() =>
      Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    );
    rec(`Money-13-overflow-${w}`, overflow === 0 ? "PASS" : "FAIL", `horizontal overflow: ${overflow}px`);
    await ctx.close();
  }

  // ---------- Touch targets on the new buttons ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 900 }, hasTouch: true });
    const page = await ctx.newPage();
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const small = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll("button").forEach((b) => {
        const r = b.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && r.height < 44) out.push((b.textContent || "").trim().slice(0, 24) + ":" + Math.round(r.height));
      });
      return out;
    });
    rec("Money-14-touch-targets", small.length === 0 ? "PASS" : "FAIL", small.length ? small.join(", ") : "none under 44px");
    await ctx.close();
  }

  await browser.close();

  const counts = results.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});
  console.log("\n=== MONEY MANAGEMENT SUMMARY ===");
  console.log(JSON.stringify(counts));

  const realErrors = errors.filter((e) => !/favicon|manifest|Download the React|preload/i.test(e));
  if (realErrors.length) {
    console.log("\nJS/CONSOLE ERRORS:");
    realErrors.slice(0, 10).forEach((e) => console.log("  " + e));
  } else {
    console.log("\nNo JS/console errors.");
  }
  process.exit(counts.FAIL ? 1 : 0);
})().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
