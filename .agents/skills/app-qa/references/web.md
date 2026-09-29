# Web driver notes

## If you have a browser tool
Drive the real UI. Prefer accessible selectors (role, label, text). After each significant action capture: screenshot, console messages, failed network requests. Save under `qa-artifacts/`.

## If you only have a shell
Use Playwright via Node or Python. If not installed and the network is available: `npm i -D @playwright/test && npx playwright install chromium`. If the network is blocked, fall back to curl for HTTP-level checks and static inspection of the source, and record UI coverage as "skipped (no browser)".

## Leave tests behind
For every journey you verified, write a runnable test in the project's existing test framework (or Playwright if none) under `tests/e2e/` or `qa/`. Tests for confirmed bugs should fail before the fix and pass after; that proves the fix. Keep them deterministic: no fixed sleeps, wait on conditions.

## Cross-browser
Run the core journeys on Chromium, Firefox, WebKit when available. Report browser-specific bugs with the browser named.

## Useful patterns
- Collect console errors and page errors on every page load and fail the check if any appear
- Listen for `response` events and flag any status >= 400 you did not expect
- Emulate devices via Playwright device descriptors for the responsive layer
