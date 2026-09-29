# Accessibility

Target WCAG 2.1 AA as the baseline.

## Automated pass
Run axe-core (via Playwright `@axe-core/playwright`, browser extension, or CLI) or Lighthouse accessibility on every distinct page/screen. Record violations with rule id and element. Automation catches only part of the issues; do the manual pass too.

## Manual pass
- **Keyboard only**: Tab through the whole page. Everything interactive reachable and operable? Visible focus indicator? Logical order? No keyboard traps? Modals trap focus and return it on close? Escape closes overlays?
- **Semantics**: one h1, sensible heading order, landmarks (main/nav), buttons vs links used correctly, lists as lists
- **Names**: every input has a label, every icon-only button has an accessible name, images have meaningful alt (or empty alt if decorative)
- **Contrast**: text at least 4.5:1 (3:1 for large text and UI components)
- **Zoom/reflow**: usable at 200% zoom and 320px width without two-way scrolling
- **Errors**: form errors are announced and tied to their fields, not conveyed by color alone
- **Media**: captions/transcripts where relevant; no autoplay with sound
- **Motion**: respects prefers-reduced-motion

## Mobile native
Use TalkBack (Android) or VoiceOver (iOS) if available; otherwise check content descriptions / accessibility labels in the UI hierarchy dump, dynamic text scaling, and touch target sizes.
