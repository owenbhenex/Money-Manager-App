# QA Report - Lumina Money @ b76af41 (Phase 2)   2026-09-28
Recommendation: GO WITH CONDITIONS — all P0 journeys pass (dashboard, bank connect + sync + dedup, AI subscription detection, live Gemini quick-capture and copilot); the two findings are a minor API error-hygiene issue and a Major mobile reachability gap that blocks Phase 2 on phones only.

## Coverage
Approach/tier used: A + B (real Chromium 1234 driven via playwright-core, plus curl for API-level tests; live Gemini 2.5 Flash key active)
Tested: dashboard smoke, bank institution listing/link/sync (all 4 institutions), transaction dedup on re-link, second-institution link, AI recurring-subscription detection (deterministic + consistent across runs, raw-transaction payload mode), quick-capture text extraction, copilot grounded advisory, error paths (invalid/missing/wrong-type/malformed payloads), console/network health on every page state, mobile 375px layout, touch-target sizes (FAB, Detect, modal rows), Esc-to-close modal.
Not tested: voice memo and receipt OCR upload paths (would need audio/image fixtures + mics), Copilot drawer UI interaction (API only), Supabase auth/RLS (app is mock-data, no live DB), cross-browser (Chromium only — no Firefox/WebKit binaries on this machine), CSV import (`/api/import/csv` from docs not yet implemented), onboarding wizard walkthrough (pre-existing Phase 1 UI, unchanged this phase).

## Results
| Status | Count | Notes |
| PASS   | 21    | |
| FAIL   | 2     | BUG-001, BUG-002 |
| INFO   | 1     | baseline ledger render |
| BLOCKED/NOT RUN | 0 (in-scope) | 6 areas out of scope as listed above |

Highlights (see qa-evidence/2026-09-28/ui-results.json + dedup-a11y-results.json for full detail):
- TC-UI-004/005 PASS: Chase link -> 6 txns synced -> merchants visible in ledger
- TC-DEDUP-001 PASS: re-linking same bank adds ZERO duplicates (Spotify 1->1, Verizon 1->1)
- TC-UI-008 PASS: AI detection found Spotify/iCloud/Verizon at $99.98/mo with cancel tips
- TC-SMOKE-002/003 PASS: live Gemini extraction (Starbucks $5.75, conf 0.95) + grounded copilot math
- TC-A11Y PASS: FAB 56x56, Detect 90x44, Esc closes modal; 375px no horizontal scroll

## Defects
| Severity | Count | IDs |
| Critical/Blocker | 0 | |
| Major | 1 | BUG-002 (Connect Bank hidden <640px -> Phase 2 unreachable on mobile) |
| Minor | 1 | BUG-001 (malformed JSON -> 500 + parser message leak on all 3 POST routes) |

Top issues:
- BUG-002: mobile users cannot reach bank sync or subscriptions at all (no alternate entry)
- BUG-001: all POST routes leak V8 parser internals on invalid JSON; should be 400 + generic message

## Risks & observations
- API latency: Gemini quick-capture ~1-2s, subscription detection ~3-5s — acceptable but the Detect button shows no result-timeout guard; if Gemini fails the panel surfaces the error string (verified error path returns clean JSON).
- Sandbox determinism is intentional (stable tests) but means every user sees the same "bank data".
- Copilot route returns createdRule payload to client but nothing persists it (mock-data app; known Phase 1 state, reconfirmed).
- CopilotDrawer still contains unused-import lint warnings (pre-existing, not regressed by Phase 2).
- `.env` NOT tracked in git (verified), no secrets in client bundle observed in network capture.

## Environment
http://localhost:3100 (next dev, Turbopack), Node v22.23.1, commit b76af41, Chromium 1234 headless (playwright-core from taskflow-dashboard/node_modules), Windows 11.
Evidence: qa-evidence/2026-09-28/ (7 screenshots, ui-results.json, dedup-a11y-results.json, bugs/BUG-001.md, BUG-002.md)

## Next steps
1. Fix BUG-002 (mobile entrypoint for bank sync; suggest CTA inside SubscriptionsPanel when empty + un-hide header button as icon-only on <sm)
2. Fix BUG-001 (shared safe-parse helper → 400 on bad JSON across all 3 routes)
3. Re-run the two failed cases + a quick regression of TC-UI-003..008 after fixes
4. Automate the UI suite as a committed `npm run test:e2e` script (playwright-core is external to this repo — vendor it as a devDependency)
5. Future: receipt/voice fixture tests, cross-browser via Playwright projects, real Supabase RLS verification when auth lands
