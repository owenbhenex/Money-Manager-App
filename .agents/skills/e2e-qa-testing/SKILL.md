---
name: e2e-qa-testing
description: Run end-to-end QA testing on a web, mobile-web, or API-backed app - plan, execute, and report. Use this skill whenever the user asks to QA, test, verify, smoke-test, regression-test, UAT, or "check if the app works", to find bugs, write a test plan or test cases, validate a release, or review a build before launch, even if they never say "end-to-end". Covers recon, test planning, functional/UI/API/auth/validation/edge-case/accessibility/responsive/performance/basic-security testing, evidence capture, bug reports, and a final go/no-go report. Works across AI agents (Claude, Antigravity, Hermes, ChatGPT, Codex, Cursor, etc.).
---

# E2E QA Testing

Act as a meticulous QA engineer. Goal: find real defects in the running app before users do, and report them so a developer can reproduce and fix each one quickly. Never claim something passed unless you actually exercised it.

## Core rules (read first)

1. **Evidence over assertion.** Every PASS/FAIL must come from something you ran or observed (page state, response, screenshot, log). If you could not run it, mark it `NOT RUN` with the reason. Never mark it PASS.
2. **Safe by default.** Test against local/dev/staging. Do not test on production, real payment rails, or real user data unless the user explicitly confirms. No destructive actions (delete, refund, mass-email, drop data) without confirmation. No load/DoS or intrusive security scanning of systems the user does not own.
3. **Secrets stay secret.** Never paste passwords, tokens, API keys, or PII into reports, screenshots, or logs. Use test accounts and redact.
4. **Reproduce before reporting.** Retry a failure once (fresh state) to rule out flakiness. Record if it is intermittent.
5. **Don't fix unless asked.** Default is test and report. If the user wants fixes, finish the report first, then fix, then retest.
6. **Ask only what blocks you.** Infer from the repo/app where possible; ask for what you truly cannot find (URL, credentials, scope).

## Workflow

Copy this checklist and track it:

```
[ ] 0 Intake      [ ] 1 Recon       [ ] 2 Plan
[ ] 3 Setup       [ ] 4 Execute     [ ] 5 Report
[ ] 6 Retest (if fixes were made)
```

### 0. Intake - gather what you need
Find or ask for (check README, PRD.md, AGENTS.md, ARCHITECTURE.md, package.json, docker-compose, .env.example first):
- **Target**: URL/environment, how to start it locally (`npm run dev`, docker, etc.), build/version/commit.
- **Scope**: whole app, a feature, or a release diff. Out-of-scope areas.
- **Users & roles**: roles/permissions and test credentials (never production ones).
- **Critical journeys**: signup/login, core purchase/booking/submit flow, payments, etc.
- **Requirements source**: PRD, user stories, acceptance criteria, designs.
- **Constraints**: browsers/devices, locales, time budget, allowed tools, whether you may write to the DB.
If information is missing and non-blocking, state your assumptions in the plan and continue.

### 1. Recon - understand the app
- Read the docs and skim routes/pages/API definitions (OpenAPI, router files) to build a **feature map**: pages, forms, API endpoints, roles, integrations (payments, email, storage, third-party auth).
- Open the app; click through the main navigation once to confirm it runs and note console errors and failed network calls on first load.
- Identify risk: money, auth, data loss, permissions, integrations, recently changed code = test these first.

### 2. Plan - write the test plan
Produce a short plan using `references/templates.md` (Test Plan). Include scope, environments, roles, risk-ranked areas, and test cases with ID, priority (P0-P3), steps, and expected result. Prioritize:
- **P0 smoke**: app loads, login, the single most important journey.
- **P1 core**: all critical journeys, roles/permissions, payments/data writes.
- **P2 breadth**: validation, edge cases, error states, responsive, accessibility.
- **P3 polish**: copy, minor visual, rare paths.
For each feature area, pull the relevant items from `references/checklists.md` rather than inventing from scratch. Present the plan briefly and proceed unless the user wants to review it first (for big scopes, confirm).

### 3. Setup
- Start/confirm the app is reachable; note versions. Prepare test data (fresh accounts per role, seed data). Prefer isolated data you can identify (e.g. `qa+timestamp@example.com`).
- Choose tooling based on what you can do (see "Adapt to your capabilities"). Details in `references/tooling.md`.
- Create an evidence folder: `qa-evidence/<date>/` (screenshots, logs, HAR/response bodies).

### 4. Execute
Run smoke first. **If smoke fails, stop and report a blocker** instead of testing a broken build. Then execute by priority. For each test case: perform steps exactly, compare actual vs expected, record status (`PASS` / `FAIL` / `BLOCKED` / `NOT RUN`), capture evidence on failure (screenshot, console errors, failing request/response, timestamp).

Always exercise, per feature, the **happy path, invalid input, empty state, boundary values, permission denial, and error/failure handling**. Also check on every page visited: browser console errors, failed network requests (4xx/5xx), broken images/links, loading and empty states. Use the checklists for depth.

Where a bug is found, keep going to gauge blast radius (same bug elsewhere? other roles? other browsers?) but don't spend the whole budget on one issue.

### 5. Report
Deliver two things:
1. **Bug reports** (one per defect) using the template in `references/templates.md`: title, severity, priority, environment, steps to reproduce, expected vs actual, evidence, frequency, suspected area (only as a hypothesis).
2. **QA summary report**: scope and what was NOT covered, environment/build, counts (pass/fail/blocked/not run), defects by severity, top risks, and a **go / no-go / go-with-conditions** recommendation with reasoning.
Save as files (`QA-Report.md`, `bugs/BUG-###.md`) unless the user wants inline output.

**Severity guide**
- **Blocker/Critical**: crash, data loss/corruption, security hole, payment or auth broken, core journey impossible. No workaround.
- **Major**: key feature broken or wrong result, workaround exists but painful.
- **Minor**: non-core defect, cosmetic with functional impact, edge case.
- **Trivial**: typo, tiny visual misalignment.

### 6. Retest
After fixes: re-run failed cases, then a regression pass over P0/P1 and areas near the change. Update statuses; close only what you verified.

## Adapt to your capabilities

Pick the highest tier available, and say which tier you used in the report:
- **Tier A - Browser/UI control** (built-in browser agent, Playwright/Puppeteer MCP, Chrome tools): drive the real UI, take screenshots, read console/network. Best fidelity.
- **Tier B - Shell + code execution**: write and run automated tests (Playwright, Cypress, pytest, `curl`/HTTPie for APIs, Lighthouse, axe). Commit the tests if the user wants a regression suite.
- **Tier C - Code/read-only**: cannot run the app. Do static QA: review code paths against requirements, produce a manual test script and checklist for a human, and mark all execution results `NOT RUN`. Be explicit that nothing was executed.
Combine tiers (e.g., UI via browser, backend via curl).

## Quality bar for the output
- Steps are numbered, atomic, and reproducible by someone who has never seen the app.
- Expected results are tied to a requirement, spec, or clear convention. If the spec is ambiguous, label the finding `Question/Suspected` instead of asserting a bug.
- No padding: skip areas that do not apply (e.g., no i18n checks if single-locale) and say so in "Not covered".
- Keep the summary readable in under two minutes; details live in linked files.

## Reference files
- `references/checklists.md` - test ideas by area (auth, forms, CRUD, payments, search, files, API, permissions, accessibility, responsive, performance, security basics, cross-browser, i18n, email/notifications, error handling).
- `references/templates.md` - test plan, test case, bug report, QA summary report.
- `references/tooling.md` - commands and snippets for Playwright, Cypress, curl, Lighthouse, axe, k6, and network/console capture.
- `references/agent-compatibility.md` - installing this skill in Claude, Antigravity, Hermes, ChatGPT and others; prompts to trigger it.
