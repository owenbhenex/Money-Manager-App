# QA Report: Lumina Money

**Date:** 2026-09-28  **Tester:** Hermes Agent (app-qa skill)  **Build/commit:** 6cc70b0
**Target:** http://localhost:3400 (next dev)  **Environment:** local  **Safety tier:** Open

## Summary

Core journeys are healthy: dashboard, bank connect + sync + dedupe, quick-capture modal flow, copilot chat, onboarding wizard, and all API validation paths pass. This pass found 7 defects — none Critical. The most user-visible are the Copilot drawer ignoring Escape (traps keyboard users), several sub-44px touch targets violating the project's own AGENTS.md rule, and a 320px horizontal overflow. Upstream Gemini free-tier quota exhaustion (20 req/day, all consumed during testing) blocked live AI-parse verification late in the run — this is environmental, not an app defect, but the app surfaces that upstream 429 as a 500 with the full raw Gemini error payload leaked to the client, which is an error-hygiene finding.

**Recommendation: GO WITH CONDITIONS** — fix QA-002 (Esc), QA-003 (touch targets), QA-004 (320px overflow) before calling Phase 2 mobile-ready.

| Severity | Found | Fixed and verified | Open |
|----------|-------|--------------------|------|
| Critical | 0 | 0 | 0 |
| High | 2 | 0 | 2 |
| Medium | 3 | 0 | 3 |
| Low | 2 | 0 | 2 |
| Info | 1 | 0 | 1 |

## Test context
- Platforms and stack: Next.js 16.3.6 (Turbopack) web app, React 19, Gemini 2.5 Flash API routes, mock client-side data (no live DB)
- Spec source(s): docs/PRD.md, docs/ARCHITECTURE.md, AGENTS.md (44px touch-target rule, no-raw-emoji-icon rule), docs/DESIGN_SYSTEM.md
- Accounts/roles: none (no auth in mock app)
- Tools used: playwright-core + Chromium 1234 (headless), curl, npm audit, grep for secret scanning

### Coverage
| Layer | Status | Notes |
|-------|--------|-------|
| Functional E2E | run | 22 checks: dashboard, bank, quick-capture, copilot, onboarding, unspecified-behavior sweep. AI-parse live check throttled by quota (see QA-005 env note) |
| API | run | Contract + validation matrix on all 4 routes (status codes, wrong types, missing fields, malformed JSON, GET/POST method rules) |
| UI / responsive | run | 320/375/768/1024/1440px; screenshots in qa-artifacts/ |
| Accessibility | partial | Esc-close, touch targets, headings, landmarks, button labels. No screen-reader pass, no contrast pass (no axe available offline) |
| Performance | partial | Observational only: dev-mode response times; no Lighthouse (quota/network) |
| Security basics | run | Headers, secrets in bundle, .env tracking, npm audit |
| Native mobile | skip | No Capacitor build exists yet (Phase 2 backlog) |

## Findings

### QA-001: manifest.json referenced but missing (404)
- **Severity:** Low  **Type:** functional  **Source:** unspecified
- **Where:** app/layout.tsx:30 → GET /manifest.json  **Environment:** curl, all browsers
- **Steps to reproduce:**
  1. `curl -o /dev/null -w "%{http_code}" http://localhost:3400/manifest.json`
- **Expected:** 200 with a PWA manifest (app metadata references `/manifest.json` and PWA install is in ARCHITECTURE.md)
- **Actual:** 404 — console shows a failed request on every page load; PWA install impossible
- **Evidence:** curl status 404; public/ contains only stock create-next-app SVGs
- **Suspected cause:** manifest never created; layout wired optimistically
- **Frequency:** always
- **Status:** Open

### QA-002: Copilot drawer ignores Escape — keyboard trap
- **Severity:** High  **Type:** a11y/UX  **Source:** specified (WCAG 2.1 AA baseline in accessibility.md; sibling modals already do this)
- **Where:** components/copilot/CopilotDrawer.tsx:104 (backdrop div has no onClick; no keydown handler)
- **Steps to reproduce:**
  1. Open Copilot (Ask Copilot button or Proactive Insight banner)
  2. Press Escape
  3. Try to click anything on the dashboard behind the drawer
- **Expected:** Escape closes the drawer; clicking the backdrop closes it
- **Actual:** Nothing closes except the small X (aria-label "Close Copilot"). The full-screen overlay intercepts all pointer events behind it. Automated E2E confirmed: "Esc closes Copilot: NO - drawer trapped open"; clicks on dashboard elements underneath time out
- **Evidence:** qa-artifacts/functional-e2e.json (J6-copilot-esc FAIL), Playwright timeout log showing overlay intercepting pointer events
- **Suspected cause:** no keydown listener (QuickCaptureModal has one at line 39-44; CopilotDrawer never got it), backdrop div missing onClick={onClose}
- **Frequency:** always
- **Status:** Open

### QA-003: Multiple touch targets below 44×44px
- **Severity:** High  **Type:** a11y  **Source:** specified (AGENTS.md: "Ensure all mobile touch targets are at least 44×44px with ≥8px spacing")
- **Where:** Dashboard header + transactions card
- **Steps to reproduce:**
  1. Load dashboard at 1440×900
  2. Measure: "Quick Log ⌘K" 142×31, "Connect Bank" 128×36, "Ask Copilot" 119×30, header icon buttons 32×32, "+ Add Transaction" 105×16
- **Expected:** every interactive element ≥ 44×44px
- **Actual:** 5 elements under 44px height (16–36px). The "+ Add Transaction" text-button at 16px height is the worst
- **Evidence:** qa-artifacts/ui-a11y.json (A2-touch-targets FAIL with measured sizes)
- **Suspected cause:** header buttons sized py-1.5/text-xs; "+ Add Transaction" is a bare text link
- **Frequency:** always
- **Status:** Open

### QA-004: Horizontal scroll at 320px viewport
- **Severity:** Medium  **Type:** UI  **Source:** specified (accessibility.md reflow: usable at 320px)
- **Where:** Dashboard, 320px width (small phones)
- **Steps to reproduce:**
  1. Set viewport to 320×568 (iPhone SE class)
  2. Observe document.scrollWidth = 370 vs window 320
- **Expected:** no two-way scrolling at 320px
- **Actual:** 50px horizontal overflow
- **Evidence:** qa-artifacts/ui-a11y.json (R1-scroll-320 FAIL), qa-artifacts/responsive-320.png
- **Suspected cause:** likely the cash-flow chart area or metric-card grid min-width at the smallest breakpoint; needs diagnosis
- **Frequency:** always
- **Status:** Open

### QA-005: Upstream Gemini 429 surfaced as HTTP 500 + raw error payload leak
- **Severity:** Medium  **Type:** API/error-hygiene  **Source:** specified (api.md: "4xx vs 5xx correctness; internal payloads in responses are a finding")
- **Where:** /api/quick-capture, /api/copilot/chat, /api/subscriptions/detect
- **Steps to reproduce:**
  1. Exhaust the Gemini free-tier quota (20 req/day) or block the key
  2. POST any AI route
- **Expected:** 503 with a clean message like "AI service temporarily unavailable"
- **Actual:** 500 with the entire upstream Gemini JSON error (quota IDs, project metrics, retry hints, docs URLs) embedded in the response's `error` field
- **Evidence:** curl responses; dev-server log (429 RESOURCE_EXHAUSTED → route catch → 500)
- **Suspected cause:** catch blocks pass `error.message` straight through; no mapping of upstream 429/503 to a safe status/message
- **Frequency:** always under quota exhaustion
- **Status:** Open
- **Env note:** the quota itself (all 20 free-tier requests consumed) also blocked live verification of the AI-parse journey late in this run — route logic was verified earlier in the session and via the UI's graceful error card

### QA-006: Copilot drawer overlay blocks page until X found (derivative of QA-002)
- **Severity:** merged into QA-002 — one root cause (no Esc/backdrop close), one fix

### QA-007: Quick-capture mode tabs and header share no visible focus state at small widths
- **Severity:** Low  **Type:** a11y  **Source:** unspecified (inferred from accessibility.md "visible focus indicator")
- **Where:** QuickCaptureModal mode switcher (Text/Voice/Receipt)
- **Steps:** Tab through modal; focus ring on mode tabs is subtle (border-white/10 → /20 shift only)
- **Expected:** clearly visible focus ring on all interactive elements
- **Actual:** low-contrast focus indication
- **Evidence:** manual DOM inspection; no axe available to confirm programmatically
- **Status:** Open (needs decision — DESIGN_SYSTEM.md may define the focus token; verify against spec before changing)

### QA-008 (Info): No loading feedback on copilot drawer first message send
- **Severity:** Info  **Type:** UX  **Source:** unspecified
- **Where:** CopilotDrawer input → reply latency (1–6s observed live)
- **Observed:** the drawer shows a Loader2 spinner inside the input row (verified in code), so this is handled; noting the earlier observed 6s latency on first message as a UX observation tied to Gemini cold start, not a defect
- **Status:** Info only

## Not tested (and why)
- Live AI-parse E2E late in run — Gemini free-tier daily quota (20 requests) exhausted by the test suite itself; earlier-in-session runs verified these routes green
- Screen-reader / voiceover pass — no assistive tech in environment; axe-core not installed and network quota prioritized for app testing
- Contrast audit — requires axe/Lighthouse; deferred
- Cross-browser (Firefox/WebKit) — only Chromium binary available on this machine
- Native mobile (Capacitor) — no build exists yet (Phase 2 backlog item)
- Supabase auth/RLS — app runs on mock data; no live DB to test against

## Observations and suggestions
- The e2e-qa-testing skill folder is deleted in git and app-qa is untracked — commit the swap so the team shares one QA skill
- Consider vendoring playwright-core as a devDependency so `qa/*.cjs` suites run without the external taskflow-dashboard NODE_PATH
- Sandbox bank data is deterministic (good for tests); consider a per-user seed when demoing so two demos don't show identical "bank data"