# Agent Instructions (AGENTS.md)

## Project Context
Lumina Money is an AI-powered personal finance manager built for solo developers to vibe-code quickly. It features multimodal Quick Capture (text, voice, receipt OCR) powered by Google Gemini 2.5 Flash, an adaptive spending rule engine created conversationally via an AI Copilot, and an interactive dark OLED glassmorphism dashboard backed by Supabase (PostgreSQL, Auth, RLS) and Next.js 15.

---

## Before You Start (Mandatory)
Before writing or modifying any code in this repository:
1. **Read [PRD.md](file:///c:/Codez/money_manager/docs/PRD.md)** — Understand user personas, core features, the 3-step onboarding flow, and the multimodal Quick Capture flow.
2. **Read [ARCHITECTURE.md](file:///c:/Codez/money_manager/docs/ARCHITECTURE.md)** — Review data flows, database schemas, edge route contracts, and Gemini Function Calling tool definitions.
3. **Read [DESIGN_SYSTEM.md](file:///c:/Codez/money_manager/docs/DESIGN_SYSTEM.md)** — Check color tokens, typography scales, glassmorphism rules, touch targets, and accessibility requirements.
4. **Inspect existing components** before creating new ones to prevent code duplication.

---

## Immediate Implementation Roadmap (Phase 1 MVP)

Follow this structured order when scaffolding and building the application:

1. **Scaffold Next.js 15 Project:**
   ```bash
   npx -y create-next-app@latest ./ --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm
   npm install @supabase/supabase-js @supabase/ssr @google/genai lucide-react recharts clsx tailwind-merge
   ```
2. **Database Schema & RLS Setup:**
   * Run the complete SQL migration script provided in `docs/ARCHITECTURE.md` in the Supabase SQL Editor.
   * Verify all 7 tables have Row Level Security (RLS) active.
3. **Design System & Theme Tokens:**
   * Configure `globals.css` with the CSS custom variables defined in `docs/DESIGN_SYSTEM.md`.
   * Configure Google Fonts import for `IBM Plex Sans` and `Inter`.
4. **Authentication & 3-Step Onboarding Wizard:**
   * Configure Supabase Auth (`/login` and `/auth/callback`).
   * Build the 3-step wizard under `/onboarding`: Currency & Timezone → Opening Accounts → Income & Savings Target.
5. **Multimodal Quick Capture Engine:**
   * Build `/api/quick-capture` with Gemini 2.5 Flash structured output schema.
   * Create the Quick-Capture Modal with instant 1-tap review card and optimistic ledger insertion.
6. **Global Copilot Slide-Out Drawer:**
   * Build `/api/copilot/chat` with streaming text and Gemini Function Calling tools (`create_spending_rule`, `get_spending_summary`).
   * Create the global slide-out drawer accessible via `Cmd/Ctrl + K` or floating toggle.
7. **Dashboard & Transaction Ledger:**
   * Build the Safe-to-Spend meter, Cash Flow area chart, Category donut chart, and transaction filter table.
   * Add CSV import file parser (`/api/import/csv`).

---

## General Rules & Standards
* **Language & Typing:** Use strict **TypeScript** everywhere. No `any` types. Validate incoming API payloads using Zod or Gemini structured schemas.
* **Component Modularity:** Keep components single-responsibility. Reusable primitives go in `/components/ui/`, feature modules go in `/components/<feature>/`.
* **State & Data Fetching:** Use React Server Components (RSC) and Server Actions for data mutations. Use optimistic updates on transaction logging.
* **Iconography:** Use `lucide-react`. Never use raw emojis as UI icons or action buttons.
* **Touch Ergonomics:** Ensure all mobile touchable buttons are ≥ `44×44px` with at least `8px` spacing.

---

## Security & Privacy Non-Negotiables
* **API Key Hygiene:**
  * `GEMINI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` must **never** be exposed in client bundles or public repositories.
  * All Gemini AI invocations must execute inside Server Actions or Route Handlers (`/app/api/...`).
* **Database Isolation:**
  * Every table MUST enforce Row Level Security: `WHERE user_id = auth.uid()`.
* **Bank Integrations:**
  * Financial integrations are strictly read-only and advisory. No automated money movement or payment execution.

---

## Standard Commands
```bash
# Development server
npm run dev

# Production build validation
npm run build

# Code linting
npm run lint
```
