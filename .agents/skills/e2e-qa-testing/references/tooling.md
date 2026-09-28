# Tooling Cheat Sheet

Contents: Playwright · Cypress · API with curl · Lighthouse · Accessibility (axe) · Load (k6) · Capturing console/network · Test data tips · Flakiness

## Playwright (preferred for E2E)
```bash
npm init playwright@latest          # or: npm i -D @playwright/test && npx playwright install
npx playwright test                  # run all
npx playwright test --headed --project=chromium
npx playwright test --trace on       # then: npx playwright show-trace trace.zip
npx playwright codegen <url>         # record steps to draft tests
```
Minimal test with failure evidence and console capture:
```ts
import { test, expect } from '@playwright/test';

test('login then reach dashboard', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  page.on('response', r => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));

  await page.goto(process.env.BASE_URL!);
  await page.getByLabel('Email').fill(process.env.QA_USER!);
  await page.getByLabel('Password').fill(process.env.QA_PASS!);
  await page.getByRole('button', { name: /log in/i }).click();
  await expect(page).toHaveURL(/dashboard/);
  expect(errors, errors.join('\n')).toEqual([]);
});
```
Config tips: `use: { baseURL, screenshot: 'only-on-failure', video: 'retain-on-failure', trace: 'retain-on-failure' }`; projects for chromium/firefox/webkit and mobile devices (`devices['iPhone 13']`, `devices['Pixel 7']`). Prefer role/label locators over CSS; use auto-waiting, avoid fixed sleeps. Credentials come from env vars, never hardcoded.

## Cypress (if the repo already uses it)
```bash
npx cypress open        # interactive
npx cypress run --browser chrome
```

## API testing with curl
```bash
curl -i -X POST "$BASE/api/login" -H 'Content-Type: application/json' \
  -d '{"email":"qa@example.com","password":"'"$QA_PASS"'"}'
curl -i "$BASE/api/orders/123" -H "Authorization: Bearer $TOKEN"        # expect 200
curl -i "$BASE/api/orders/123"                                          # expect 401
curl -i "$BASE/api/orders/999999" -H "Authorization: Bearer $TOKEN"     # expect 404
curl -w '\n%{time_total}s\n' -o /dev/null -s "$BASE/api/health"         # timing
```
Also: Postman/Newman collections, `httpie`, or `pytest` + `requests`. If an OpenAPI spec exists, derive cases from it (Schemathesis can fuzz safely on staging you own: `schemathesis run openapi.json --base-url $BASE`).

## Lighthouse (performance, a11y, best practices, SEO)
```bash
npx lighthouse <url> --output html --output-path qa-evidence/lh.html --chrome-flags="--headless"
npx lighthouse <url> --preset=desktop --only-categories=performance,accessibility
```

## Accessibility with axe
```bash
npm i -D @axe-core/playwright
```
```ts
import AxeBuilder from '@axe-core/playwright';
const results = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze();
expect(results.violations).toEqual([]);
```
Follow with manual keyboard + screen-reader spot checks.

## Load (only on systems you own, with permission)
```bash
k6 run --vus 20 --duration 1m script.js
```
```js
import http from 'k6/http'; import { check } from 'k6';
export const options = { thresholds: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<800'] } };
export default () => { check(http.get(`${__ENV.BASE}/api/health`), { ok: r => r.status === 200 }); };
```

## Capturing evidence when using an agent browser
- Screenshot on every failure and at key steps; record URL and timestamp
- Read the console and network panel after each significant action
- Save response bodies for failing API calls (redact tokens/PII)

## Test data tips
- Unique identifiers: `qa+$(date +%s)@example.com`
- Use sandbox keys and test card numbers from the payment provider's docs
- Clean up data you created if allowed; otherwise list it in the report
- Reset state between cases (fresh browser context / incognito)

## Flakiness handling
Re-run failures once in a fresh context. Same result = real defect. Intermittent = report as flaky with frequency, likely causes (race, timing, shared data, third-party), and the conditions observed.
