# Design System Document

## Brand Direction
* **Aesthetic:** **Dark OLED Glassmorphism** (Fintech Precision meets AI Intelligence).
* **Personality:** High-trust, ultra-clean, modern, calming, and friction-free.
* **Core Philosophy:** **UX-First.** Visual hierarchy, data legibility, and rapid touch interactions take priority over unnecessary decorative noise. Financial figures must feel immediate and crystal clear.

---

## Color Tokens

```css
:root {
  /* Canvas & Surfaces (OLED Deep Slate) */
  --color-background: #0A0E27;       /* Canvas background */
  --color-surface-base: #0F172A;     /* Primary surface background */
  --color-surface-card: rgba(255, 255, 255, 0.04); /* Glassmorphism card surface */
  --color-surface-card-hover: rgba(255, 255, 255, 0.08);
  --color-surface-modal: #131B38;    /* Elevated dialogs & sheets */
  --color-surface-drawer: #0D132D;   /* Global Copilot slide-out drawer */

  /* Text & Foreground */
  --color-text-primary: #F8FAFC;     /* Primary headings and balances */
  --color-text-secondary: #94A3B8;   /* Labels, metadata, and timestamps */
  --color-text-muted: #64748B;       /* Helper text and hints */
  --color-text-inverted: #0A0E27;    /* Text on bright badges */

  /* Brand & Core Actions */
  --color-primary: #3B82F6;          /* Trust Blue - Primary buttons, links */
  --color-primary-dark: #1E40AF;
  --color-primary-foreground: #FFFFFF;

  /* AI Copilot Identity */
  --color-ai-accent: #6366F1;        /* Electric Indigo - AI pills, streaming, badges */
  --color-ai-glow: rgba(99, 102, 241, 0.25);
  --color-ai-surface: rgba(99, 102, 241, 0.08);

  /* Semantic Financial States */
  --color-success: #10B981;          /* Inflow, positive cash flow, savings */
  --color-success-bg: rgba(16, 185, 129, 0.12);
  --color-warning: #F59E0B;          /* Budget near limit (>75%), rule alert */
  --color-warning-bg: rgba(245, 158, 11, 0.12);
  --color-destructive: #EF4444;      /* Outflow/expenses, budget exceeded, delete */
  --color-destructive-bg: rgba(239, 68, 68, 0.12);

  /* Borders & Dividers */
  --color-border-glass: rgba(255, 255, 255, 0.08);
  --color-border-subtle: rgba(255, 255, 255, 0.04);
  --color-border-active: rgba(59, 130, 246, 0.50);
  --color-border-ai: rgba(99, 102, 241, 0.40);
}
```

---

## Typography

* **Google Fonts Import:**
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  ```
* **Font Families:**
  * **Headings & Financial Tickers:** `'IBM Plex Sans', -apple-system, sans-serif`
  * **Body, UI Controls & Labels:** `'Inter', -apple-system, sans-serif`
  * **Numbers & Ledger Balances:** Use tabular figures: `font-variant-numeric: tabular-nums;` to prevent layout shift on real-time balance calculations.

* **Type Scale:**
  * **Display / Big Balances:** `36px` / Line-height `44px` / Weight `700` (IBM Plex Sans)
  * **Heading 1 (H1):** `28px` / Line-height `36px` / Weight `700`
  * **Heading 2 (H2):** `20px` / Line-height `28px` / Weight `600`
  * **Heading 3 (H3):** `16px` / Line-height `24px` / Weight `600`
  * **Body Large:** `16px` / Line-height `24px` / Weight `400`
  * **Body Medium (Default):** `14px` / Line-height `20px` / Weight `400`
  * **Caption / Label:** `12px` / Line-height `16px` / Weight `500`

---

## Spacing & Layout Scale (8px Grid)

| Token | Size | Typical Use |
| :--- | :--- | :--- |
| `space-1` | `4px` | Icon-to-text gap, badge inner padding |
| `space-2` | `8px` | Minimum touch spacing, tight row gap |
| `space-3` | `12px` | Card internal header padding, pill padding |
| `space-4` | `16px` | Standard container padding, input field padding |
| `space-6` | `24px` | Section margins, grid gaps |
| `space-8` | `32px` | Card outer margin, modal padding |
| `space-12`| `48px` | Major section vertical rhythm |
| `space-16`| `64px` | Hero spacing, desktop gutters |

---

## Component Specifications

### 1. Global Slide-Out Copilot Drawer
* **Placement:** Slides out from the right on desktop (`width: 440px`), full-screen drawer on mobile (`width: 100%`).
* **Header:** Displays AI status indicator (green pulse for active), Copilot title, and close button.
* **Chat Stream Area:**
  * User message bubble: Dark slate (`#1E293B`), aligned right.
  * AI message bubble: Electric indigo tinted glass surface (`var(--color-ai-surface)`), aligned left. Token-by-token typewriter reveal with `role="status"` live region.
* **Function Calling Execution Card:**
  * When a rule is generated conversationally, Copilot displays an embedded glass card:
    * Icon: Sparkles / Sliders.
    * Text: *"Created Rule: [Rule Name]"* with active condition summary.
    * Actions: `[View Rules]` or `[Undo]`.
* **Input Area:** Bottom sticky input bar with voice-record button, send button, and suggested prompt chips above the input (*"Am I on budget?", "Set a rule for Uber"*).

### 2. Quick-Capture Modal & Floating Action Button (FAB)
* **Desktop Trigger:** `Cmd/Ctrl + K` or persistent navbar button.
* **Mobile Trigger:** Centered Floating Action Button (`56×56px`) with plus/sparkle icon.
* **Modal Layout:** Frosted glass overlay (`backdrop-filter: blur(24px)`).
  * Auto-focused multi-line input field supporting plain English (*"Coffee at Peet's $5.40"*).
  * Modal footer includes toggle buttons: `[Voice Mic]`, `[Upload Receipt]`, and `[Log (Enter)]`.
  * Instant Review Card displays extracted details with 1-tap `[Confirm]` button.

### 3. 3-Step Onboarding Wizard
* **Container:** Centered glass card (`max-width: 540px`).
* **Step Progress Indicator:** 3-segmented bar with active indigo fill and checkmark badges.
* **Step 1 (Currency):** Grid of searchable currency chips (`USD $`, `EUR €`, `GBP £`, etc.).
* **Step 2 (Accounts):** Dynamic list with pre-filled default cards (Checking, Savings, Credit Card) with inline opening balance fields.
* **Step 3 (Target):** Income input + interactive monthly savings slider with live calculated Safe-to-Spend preview.

### 4. Interactive Charts & Data Visualizers
* **Cash Flow Trajectory (Recharts Area Chart):**
  * Line stroke: `#3B82F6` (2px).
  * Fill gradient: `rgba(59, 130, 246, 0.20)` fading to `transparent`.
  * Tooltip: Custom dark glass tooltip showing exact date and running total.
* **Category Breakdown (Recharts Donut Chart):**
  * Inner radius `65%`, outer radius `85%`.
  * Center text: Total spent this month (`IBM Plex Sans` 20px Bold).
  * Category legend with direct percentage badges.

---

## Accessibility & Ergonomic Rules (WCAG 2.2 AA)

1. **Color Contrast:** Body copy `#F8FAFC` on `#0A0E27` background provides 16:1 contrast ratio (far exceeding 4.5:1 requirement).
2. **Touch Targets:** All interactive buttons and touchables are ≥ `44×44pt` on iOS and `48×48dp` on Android with at least `8px` spacing between adjacent controls.
3. **Keyboard Operability:** 
   * `Cmd/Ctrl + K` toggles Quick Capture.
   * `Cmd/Ctrl + J` toggles the Copilot Drawer.
   * `Esc` closes any active modal or drawer.
   * Visible focus indicators (`focus:ring-2 focus:ring-blue-500`) on all interactive controls.
4. **Motion Safety:** Respects `@media (prefers-reduced-motion: reduce)` by disabling sliding drawer transitions and glowing pulse animations.
