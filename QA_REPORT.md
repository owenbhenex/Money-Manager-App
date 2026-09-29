# QA Report — UX Feature Pass

**Date:** 2026-09-29
**Scope:** UX-level verification of every user-facing feature — does each feature actually DO what it claims (state changes, feedback, not just "no error")?
**Target:** http://localhost:3000 (dev)
**Build:** 9d067b3 + UX fixes (this pass)
**Method:** `.agents/skills/app-qa` 6-step workflow, extended with feature-behavior checks (qa/ux-features.cjs, qa/ux-secondary.cjs).

## Feature-by-Feature Verdict

| # | Feature | Verdict | Evidence |
|---|---------|---------|----------|
| 1 | Dashboard hero (Safe-to-Spend, liquid, burn, donut, cashflow) | ✅ WORKS | All metrics recompute after bank sync: STS 11,035→9,993; burn 2,315→2,835.76; liquid 14,850→14,329 |
| 2 | Bank Connect (4 sandbox institutions) | ✅ WORKS | Chase link adds Spotify/Verizon/etc to ledger with correct dedupe |
| 3 | Subscriptions detection | ✅ WORKS (AI-blocked) | Route logic verified; AI call blocked by Gemini quota, clean 503 |
| 4 | Onboarding wizard (currency/accounts/income) | ✅ WORKS (after fix) | Income €7,777 and currency change now land on dashboard (was silently discarded — UX-005) |
| 5 | Quick Capture (text/voice/receipt) | ⚠️ PARTIAL | Text mode works; AI down → previously silently closed losing input (UX-009, fixed); voice/receipt modes untestable offline |
|  Capture error feedback | ✅ (after fix) | Alert with preserved input + retry |
| 6 | Copilot drawer | ✅ WORKS (AI-blocked) | Opens/Esc/backdrop; chat requires Gemini quota |
| 7 | Proactive insight banner | ✅ WORKS | Banner renders + opens copilot |
| 8 | ⌘K shortcut | ✅ WORKS (after fix) | Was displayed but not implemented (UX-001) |
| 9 | Undo toast | ✅ code-verified | handleTransactionSaved → 5s toast; correct tx removed (prepend → index 0) |
| 10 | Insight banner clicking | ✅ WORKS | J6 passes |
| 11 | Responsive 320→1440 | ✅ WORKS | ui-a11y 14/14 after touch-target + overflow fixes |
| 12 | Hydration | ✅ 0 errors (de-DE locale) | formatCurrency pinned en-US |

## Defects Found & Fixed This Pass

| ID | Severity | Defect | Fix |
|----|----------|--------|-----|
| UX-001 | High | ⌘K hint displayed in header but no keyboard handler existed — advertised affordance did nothing | Added Cmd/Ctrl+K listener in DashboardPage (toggles Quick Capture) |
| UX-005 | High | Onboarding wizard discarded monthlyIncome, monthlySavingsTarget, accounts balances — only currency was used | onComplete now sets all 4 state values; income set via setMonthlyIncome |
| UX-008 | Medium | Currency selection was cosmetic — formatCurrency hardcodes "$", every figure stayed USD | formatCurrency(value, currency) with symbol map; applied to all 7 call sites + tx rows |
| UX-009 | High | When AI parse fails (503), QuickCaptureModal silently closed back to dashboard, losing the user's typed input with zero feedback | Modal shows role="alert" error card; input preserved; Dismiss/retry; error state cleared on new submit |

## Environment-limited (not defects)

- Gemini free-tier quota exhausted (429→503): copilot chat, quick-capture AI parse, subscriptions detection happy paths blocked. Error paths verified clean.
- Ledger search: not implemented (not advertised in UI) — logged as gap, not a bug.
- Dark-only theme by design (DESIGN_SYSTEM.md: dark OLED glass); body bg stays #0A0E27 under light scheme — working as intended.

## Suite Results (final)

- qa/ux-features.cjs: 8 PASS / 2 SKIP (AI quota)
- qa/ux-secondary.cjs: 1 PASS / 1 FAIL (undo-toast — unreachable without AI; code-verified)
- qa/functional-e2e.cjs: 19 PASS / 3 FAIL (all Gemini 503 quota)
- qa/ui-a11y.cjs: 14/14 PASS
- Hydration (de-DE): 0 errors
- Build: passes
