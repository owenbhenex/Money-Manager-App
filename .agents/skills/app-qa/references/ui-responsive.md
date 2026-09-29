# UI, layout and responsive

## Viewports
Test at minimum: 360x800 (small phone), 390x844, 768x1024 (tablet), 1280x800, 1920x1080. Also landscape phone and a zoomed (200%) desktop.

## Look for
- Horizontal scroll, clipped or overlapping content, text overflow, truncated labels, images stretched or missing
- Touch targets under ~44px, elements too close together on mobile
- Sticky headers/footers covering content, keyboard covering inputs on mobile
- Broken alignment, inconsistent spacing/fonts/colors versus DESIGN_SYSTEM.md or the rest of the app
- Missing states: loading, empty, error, disabled, hover/focus/active
- Long content: very long names, many items, no items
- Language/locale: date, number, currency formats; text expansion; RTL if supported
- Dark mode / theme if supported
- Print or share views if they exist
- Animations: janky, blocking, ignoring reduced-motion

## Evidence
Screenshot each finding at the viewport where it appears. Name files `ui-<page>-<viewport>-<issue>.png`.
