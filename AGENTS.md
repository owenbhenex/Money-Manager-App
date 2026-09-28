# Agent Instructions (AGENTS.md)

> For the complete documentation suite, refer to [/docs](file:///c:/Codez/money_manager/docs):
> - **[PRD.md](file:///c:/Codez/money_manager/docs/PRD.md)**: Product Requirements, Personas, 3-Step Onboarding, and Multimodal Quick Capture Flow
> - **[ARCHITECTURE.md](file:///c:/Codez/money_manager/docs/ARCHITECTURE.md)**: System Architecture, Next.js 15 + Supabase + Gemini 2.5 Stack, Complete SQL Schemas & RLS, and Tool Calling Contracts
> - **[DESIGN_SYSTEM.md](file:///c:/Codez/money_manager/docs/DESIGN_SYSTEM.md)**: Dark OLED Glassmorphic tokens, Global Copilot Drawer, Typography, Recharts, and Accessibility
> - **[docs/AGENTS.md](file:///c:/Codez/money_manager/docs/AGENTS.md)**: Full Agent development guidelines & 7-step implementation checklist

---

## Project Context
Lumina Money is an AI-powered personal finance manager built for solo developers to vibe-code quickly. It features multimodal Quick Capture (text, voice, receipt OCR) powered by Google Gemini 2.5 Flash, an adaptive spending rule engine created conversationally via an AI Copilot, and an interactive dark OLED glassmorphism dashboard backed by Supabase (PostgreSQL, Auth, RLS) and Next.js 15.

## Before You Start (Mandatory)
1. Read `docs/PRD.md` before writing features.
2. Read `docs/ARCHITECTURE.md` before writing backend/database/API code.
3. Read `docs/DESIGN_SYSTEM.md` before building UI components.
4. Inspect existing components before creating new ones.

## General Rules
- Use TypeScript with strict typing.
- Reuse existing modular components.
- Enforce Supabase Row-Level Security (RLS) on all tables.
- Keep Gemini API keys and secrets strictly on the server/edge layer.
- Ensure all mobile touch targets are at least 44×44px with ≥8px spacing.

## Standard Commands
```bash
npm install
npm run dev
npm run build
npm run lint
```
