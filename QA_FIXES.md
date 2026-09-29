# QA Fix Plan: Lumina Money

Branch: `qa/fixes-2026-09-28`  Baseline test result before fixes: functional-e2e 18/22 fail-4, ui-a11y 11/14 fail-3

Ordered by severity, then by dependency.

| ID | Severity | Fix summary | Files touched | Test added | Status | Commit |
|----|----------|-------------|---------------|------------|--------|--------|
| QA-001 | Low | Create public/manifest.json | public/manifest.json | curl returns 200 | Open | |
| QA-002 | High | Add Esc handler + backdrop onClick to CopilotDrawer | components/copilot/CopilotDrawer.tsx | ui-a11y A1-copilot-esc | Open | |
| QA-003 | High | Enforce min-h-[44px] on header buttons + "+ Add Transaction" | app/page.tsx | ui-a11y A2-touch-targets | Open | |
| QA-004 | Medium | Fix 320px horizontal overflow | app/page.tsx (chart/grid) | ui-a11y R1-scroll-320 | Open | |
| QA-005 | Medium | Map upstream Gemini 429/503 → 503 + clean message in all 3 AI routes | lib/ai/gemini.ts, 3 route.ts | curl returns 503 under quota | Open | |
| QA-007 | Low | Verify focus token in DESIGN_SYSTEM.md; apply to mode tabs if missing | QuickCaptureModal.tsx | manual keyboard pass | Open | |

## Details

### QA-002: Copilot drawer ignores Escape
- **Root cause:** CopilotDrawer renders at `fixed inset-0 z-40` with no keydown listener and backdrop div has no onClick. Sibling QuickCaptureModal already implements the pattern correctly (lines 36-44).
- **Change:** Add useEffect keydown handler for Escape that calls onClose; add onClick={onClose} to backdrop and stopPropagation on the inner drawer panel.
- **Verification:** ui-a11y A1-copilot-esc passes (Esc closes drawer)

### QA-003: Sub-44px touch targets
- **Root cause:** Header buttons use py-1.5/text-xs; "+ Add Transaction" is a bare text className with no padding/min-height.
- **Change:** Add min-h-[44px] to header interactive buttons; give "+ Add Transaction" an inline-flex/min-h-[44px]/px-2 wrapper.
- **Verification:** A2-touch-targets PASS (0 under-44px targets)

### QA-004: 320px overflow
- **Root cause:** needs diagnosis (likely the 3-col metric grid or chart min-width). Will measure offenders then add a single-column stack at the `xs`/`<sm` breakpoint.
- **Verification:** R1-scroll-320 PASS

### QA-005: Upstream 429 → 500 + payload leak
- **Root cause:** all three AI route catch blocks do `error.message` straight through; Gemini SDK throws with the full upstream JSON in the message.
- **Change:** in lib/ai/gemini.ts add a helper `mapAiError(error)` → `{ status: 503, message: 'AI service temporarily unavailable' }` for 429/RESOURCE_EXHAUSTED, else 500 with redacted message. Use in all three catch blocks.
- **Verification:** curl under quota returns 503 with clean message; valid request still 200