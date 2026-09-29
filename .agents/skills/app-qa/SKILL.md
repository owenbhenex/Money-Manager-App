---
name: app-qa
description: End-to-end QA for any app (web, API, native mobile, desktop) - finds bugs, writes a severity-ranked report, then fixes them and re-tests. Covers functional E2E, API, UI/responsive, accessibility, performance, security basics, and console/network noise, on local, staging, or deployed environments. Use whenever the user asks to test, QA, audit, sanity-check, find bugs in, or "go through" an app, feature, build, or deployment, or says things like "does this actually work", "check everything", "test it end to end", "review before release", even if they never say "QA".
---

# app-qa: thorough end-to-end app testing

Goal: test an app the way a skeptical senior QA engineer would, produce a report a developer can act on, then fix what you found and prove the fixes work. Thoroughness is the point; the safety rules exist so thoroughness never damages real users or real money.

This skill is agent-agnostic. It assumes only that you can read files and run shell commands. If you have a browser, emulator, or HTTP client, use them; if not, degrade gracefully (see Step 1) and say what you skipped. Read `adapters/<your-agent>.md` first if one exists (`antigravity.md`, `hermes.md`), otherwise `adapters/generic.md`.

## Safety model (read before touching anything)

Testing is only trusted if it is safe to run. Classify the target environment in Step 1, then obey its tier:

| Tier | Environments | Allowed |
|------|--------------|---------|
| **Open** | localhost, dev containers, ephemeral/preview envs, staging with test data | Everything: destructive actions, bad input, load, data wipes, breaking things on purpose |
| **Guarded** | Deployed / production / any environment with real users or real data | Full read-only analysis, non-destructive interaction with test accounts, and everything else in the Open tier **only if the user has explicitly enabled it in this conversation** (e.g. "allow destructive actions on production") |

In the Guarded tier, without explicit enablement, never: process real payments, delete or modify real user data, send email/SMS/notifications to real people, run load or fuzz tests, or create accounts with real personal data. Log each skipped action in the report under "Not tested (safety)" so nothing is silently missing. If unsure which tier applies, treat it as Guarded and ask once.

Fixes always go to the local source repository, never to a live server. Testing a deployment does not mean editing it.

## Workflow

### Step 1: Recon
Read `references/recon.md`. Establish: platform(s), stack, environment and tier, available tools (browser, emulator, HTTP client, test runner), how to start the app, test credentials, and where the spec lives (PRD, AGENTS.md, README, user stories). Write a short "Test context" block that opens the report. Ask the user only for what you cannot discover (credentials, start command, target URL).

### Step 2: Plan
Build a test plan from two sources, and keep them distinct in the report:
1. **Specified behavior**: acceptance criteria and flows from the PRD/docs/stories. Each becomes at least one test case.
2. **Unspecified behavior**: anything a real user would hit that the docs do not cover: empty states, error states, back/refresh mid-flow, double-submit, slow or lost network, long/odd/unicode input, expired sessions, permissions, leftover placeholder text, dead links, broken layouts, non-functional quality (speed, accessibility, security hygiene).

If no spec exists, derive the intended behavior from the UI and code, and mark those expectations as "inferred" so the developer can correct you.

### Step 3: Run every applicable layer
Load each reference file only when you reach that layer. Skip a layer only if the platform makes it inapplicable or the tier forbids it, and record why.

- `references/functional-e2e.md`: user journeys, forms, state, data integrity
- `references/api.md`: endpoints, contracts, auth, errors, idempotency
- `references/ui-responsive.md`: layout, breakpoints, visual glitches, states, i18n
- `references/accessibility.md`: keyboard, semantics, contrast, screen-reader basics
- `references/performance.md`: load time, heavy assets, slow queries, jank
- `references/security-basics.md`: authn/authz, input handling, headers, secrets, data exposure (hygiene checks on the user's own app, not attack tooling)
- Platform drivers: `references/web.md` for browser apps, `references/mobile-native.md` for Android/iOS/React Native/Flutter

Throughout every layer, watch the console, network log, server logs, and crash logs. Errors that do not visibly break anything are still findings.

Record evidence as you go (screenshot path, request/response, log excerpt, exact steps). A bug without reproduction steps is not yet a bug report.

### Step 4: Report
Fill `templates/QA_REPORT.md` and save it as `QA_REPORT.md` in the project root (or the user's chosen folder). Rank by severity, dedupe (one root cause = one finding), and separate confirmed bugs from suspicions. Be honest about coverage: what was tested, what was not, and why. Then produce `QA_FIXES.md` from `templates/QA_FIXES.md`: an ordered fix plan, one entry per finding.

### Step 5: Fix, then prove it
Unless the user said report-only, continue straight into fixing. Read `references/fix-loop.md`. Summary: work on a dedicated git branch, highest severity first, one bug per commit, re-run the failing scenario after each fix, run the wider test suite to catch regressions, and update the status in both files. If a fix is risky, ambiguous, or needs a product decision, stop on that item, mark it "needs decision" and move on rather than guessing.

### Step 6: Final summary
Tell the user, briefly: counts by severity, what was fixed and verified, what remains and why, what was not tested, and where the files are. Lead with anything that blocks a release.

## Severity scale

- **Critical**: data loss, security breach, payment/money errors, app unusable or crashing on a core flow
- **High**: a core feature broken or badly degraded, no reasonable workaround
- **Medium**: feature partly broken or confusing, workaround exists
- **Low**: cosmetic, minor polish, edge-case nuisance
- **Info**: observation or improvement suggestion, not a defect

## Principles

- Reproduce before reporting; retry once to rule out flakiness and note it if intermittent.
- Do not trust the app's own success messages; verify the resulting state (data, network call, DB, UI).
- Prefer evidence over opinion. Say "I observed X when doing Y", not "this seems bad".
- Never invent test results. If a layer could not run, say so plainly.
- Keep test data identifiable (prefix with `qa_`) so it can be cleaned up, and clean up after yourself in the Open tier.
- Do not print secrets, tokens, or personal data into the report; redact them.
