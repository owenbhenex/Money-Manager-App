# System Architecture Document

## System Overview

Lumina Money is architected as a high-performance, serverless personal finance web application built with **Next.js 15 (App Router)**, **Supabase (PostgreSQL + RLS + Auth)**, and the **Google Gemini 2.5 Flash API**. The application is responsive-first (PWA) and packaged for native mobile deployment via **CapacitorJS**.

```
                           ┌───────────────────────────────────────────┐
                           │            Client Application             │
                           │  - Responsive Next.js App Router (PWA)   │
                           │  - Global Copilot Slide-Out Drawer        │
                           │  - Quick Capture Modal (FAB / Cmd+K)      │
                           │  - Capacitor Wrapper (Android / iOS)      │
                           └───────┬───────────────────────────┬───────┘
                                   │                           │
                        HTTPS / Next.js Server Actions    Supabase Client SDK
                        (AI & Ingestion Endpoints)        (PostgreSQL + RLS + Auth)
                                   │                           │
                                   ▼                           ▼
                      ┌─────────────────────────┐  ┌───────────────────────┐
                      │    Next.js API Layer    │  │       Supabase        │
                      │    (Serverless/Edge)    │  │  - Auth (Google OAuth │
                      │  - /api/quick-capture   │  │    & Email Magic Link)│
                      │  - /api/copilot/chat    │  │  - PostgreSQL + RLS   │
                      │  - /api/import/csv      │  │  - Receipt Storage    │
                      └────────────┬────────────┘  └───────────────────────┘
                                   │
                                   ▼
                      ┌─────────────────────────┐
                      │    Google Gemini API    │
                      │   (Gemini 2.5 Flash)    │
                      │  - Multimodal Vision    │
                      │  - Audio Transcription  │
                      │  - Tool/Function Calls  │
                      │    (Rule Generation)    │
                      └─────────────────────────┘
```

---

## Tech Stack Specification

| Component | Technology | Version | Purpose & Rationale |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | **Next.js (App Router)** | `15.x` | React 19, Server Components, Server Actions, lightweight client bundle, and instant routing. |
| **UI Styling & Tokens** | **CSS Variables + Tailwind CSS** | `3.4+` | Rapid vibe coding of the Dark OLED Glassmorphic design system with zero runtime overhead. |
| **Database & Auth** | **Supabase** | `Hosted/Local` | PostgreSQL database with strict per-user Row Level Security (RLS), Google OAuth 2.0, and Email Magic Link. |
| **AI Intelligence** | **Google Gemini API** | `gemini-2.5-flash` | Sub-second latency, cheap multimodal OCR & audio parsing, native JSON Schema extraction, and Function Calling for rule creation. |
| **Data Visualization** | **Recharts** | `2.x` | Modular, responsive SVG charting for Cash Flow trends and category Donut breakdowns. |
| **Icons** | **Lucide React** | `Latest` | Consistent outline iconography for financial controls without raw emoji placeholders. |
| **Mobile Runtime** | **CapacitorJS** | `6.x` | Native packaging for Android and iOS app stores wrapping the web build. |

---

## Complete Database Schema (Supabase PostgreSQL)

Every table enables **Row Level Security (RLS)** ensuring users only query their own data: `WHERE user_id = auth.uid()`.

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES & ONBOARDING STATE
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  monthly_income NUMERIC(12,2) DEFAULT 0.00,
  monthly_savings_target NUMERIC(12,2) DEFAULT 0.00,
  safe_to_spend_buffer NUMERIC(12,2) DEFAULT 0.00,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ACCOUNTS TABLE
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('checking', 'savings', 'credit_card', 'cash', 'investment')),
  balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'USD',
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CATEGORIES TABLE
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'tag',
  color TEXT DEFAULT '#3B82F6',
  monthly_budget NUMERIC(12,2) DEFAULT NULL,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TRANSACTIONS TABLE
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL, -- Negative for expenses, positive for income
  currency TEXT NOT NULL DEFAULT 'USD',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  merchant TEXT NOT NULL,
  notes TEXT,
  capture_method TEXT NOT NULL CHECK (capture_method IN ('manual', 'text_ai', 'voice_ai', 'receipt_ocr', 'csv_import', 'bank_sync')),
  ai_confidence NUMERIC(3,2),
  receipt_url TEXT,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('draft', 'confirmed', 'ignored')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SPENDING & CATEGORIZATION RULES (Created via AI Copilot or Settings)
CREATE TABLE spending_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_condition JSONB NOT NULL,
  -- Examples:
  -- {"field": "merchant", "operator": "contains", "value": "Uber"}
  -- {"field": "amount", "operator": "greater_than", "value": 100, "category_id": "uuid"}
  action JSONB NOT NULL,
  -- Examples:
  -- {"type": "set_category", "category_id": "uuid"}
  -- {"type": "create_alert", "severity": "warning", "message": "High dining spend detected"}
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. AI INSIGHTS & NOTIFICATIONS
CREATE TABLE ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('anomaly', 'budget_warning', 'saving_tip', 'monthly_review')),
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. BANK CONNECTIONS (Staged for Phase 2, schema pre-wired)
CREATE TABLE bank_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'sandbox', -- 'plaid', 'simplefin', 'teller', 'sandbox'
  institution_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS POLICIES FOR ALL TABLES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access own profile" ON profiles FOR ALL USING (auth.uid() = id);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access own accounts" ON accounts FOR ALL USING (auth.uid() = user_id);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access own categories" ON categories FOR ALL USING (auth.uid() = user_id);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access own transactions" ON transactions FOR ALL USING (auth.uid() = user_id);

ALTER TABLE spending_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access own rules" ON spending_rules FOR ALL USING (auth.uid() = user_id);

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access own insights" ON ai_insights FOR ALL USING (auth.uid() = user_id);

ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access own connections" ON bank_connections FOR ALL USING (auth.uid() = user_id);

-- INDEXES FOR HIGH-VELOCITY QUERYING
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX idx_transactions_category ON transactions(user_id, category_id);
CREATE INDEX idx_spending_rules_user ON spending_rules(user_id) WHERE is_active = TRUE;
```

---

## AI Architecture & Gemini Function Calling Contracts

### 1. Multimodal Quick Capture (`/api/quick-capture`)
Accepts FormData with `text`, `audio` (webm/wav/mp3), or `receipt` (image/jpeg, image/png).
Invokes Gemini 2.5 Flash with structured output schema:

```typescript
export interface ExtractedTransaction {
  amount: number;
  merchant: string;
  category_name: string;
  date: string; // YYYY-MM-DD
  confidence: number; // 0.00 to 1.00
  notes?: string;
  line_items?: Array<{ name: string; price: number }>;
}
```

### 2. Conversational Copilot & Tool Calling (`/api/copilot/chat`)
The Copilot endpoint uses **Gemini Function Calling (Tools)** to execute user instructions seamlessly:

#### Available Tools Defined for Gemini:
1. `create_spending_rule`:
   * **Parameters:** `rule_name: string`, `condition_field: string`, `operator: string`, `trigger_value: string | number`, `action_type: string`, `target_category_name?: string`
   * **Behavior:** Commits rule directly to `spending_rules` and responds with a confirmation summary in chat.
2. `get_spending_summary`:
   * **Parameters:** `start_date: string`, `end_date: string`, `category_name?: string`
   * **Behavior:** Queries Supabase and returns aggregate figures to ground the model's financial answer.
3. `update_budget_target`:
   * **Parameters:** `category_name: string`, `monthly_budget_amount: number`
   * **Behavior:** Updates `categories.monthly_budget`.

---

## Project Structure & File Layout

```
/app
  ├── (auth)
  │   ├── login/page.tsx               # Google OAuth & Magic Link login UI
  │   └── callback/route.ts            # Supabase OAuth token exchange callback
  ├── (onboarding)
  │   └── onboarding/page.tsx          # 3-Step Wizard (Currency -> Accounts -> Savings)
  ├── (dashboard)
  │   ├── layout.tsx                   # App shell: Navigation, Copilot Drawer, Quick-Capture FAB
  │   ├── page.tsx                     # Main Dashboard: Safe-to-Spend, Cashflow Chart, Alert Pills
  │   ├── transactions/page.tsx        # Ledger: Search, Filters, CSV Import trigger
  │   ├── budgets/page.tsx             # Budgets: Category pace meters, active AI rules viewer
  │   └── accounts/page.tsx            # Accounts: Balances, account manager
  ├── api
  │   ├── quick-capture/route.ts       # Multimodal parsing handler (Gemini 2.5 Flash)
  │   ├── copilot/chat/route.ts        # Streaming chat & Function Calling handler
  │   └── import/csv/route.ts          # Bank CSV upload and deduplication parser
  ├── layout.tsx                       # Root layout with fonts & theme provider
  └── globals.css                      # Design tokens & glassmorphic styles
/components
  ├── ui/                              # Atoms: Button, Input, Modal, Badge, Toast, Skeleton
  ├── onboarding/                      # StepCurrency, StepAccounts, StepSavings
  ├── quick-capture/                   # QuickCaptureModal, VoiceRecorder, ReceiptDropzone, ReviewCard
  ├── copilot/                         # CopilotDrawer, MessageBubble, RulePreviewCard, ActionPill
  ├── dashboard/                       # NetWorthCard, SafeToSpendMeter, SpendingChart, CategoryBreakdown
  └── transactions/                    # TransactionTable, CsvImportModal, CategoryBadge
/lib
  ├── supabase/
  │   ├── client.ts                    # Browser Supabase client
  │   ├── server.ts                    # Server Component & Server Action client
  │   └── middleware.ts                # Route protection (redirect to /login if unauthed)
  ├── ai/
  │   ├── gemini.ts                    # Gemini API initialization
  │   ├── tools.ts                     # Gemini Function Calling definitions
  │   └── schemas.ts                   # Structured JSON Schemas
  ├── rules/
  │   └── evaluator.ts                 # Evaluates spending_rules on transaction commit
  └── utils/                           # Formatters (currency, dates, math)
/types
  └── database.types.ts                # TypeScript interfaces mapped to Supabase tables
```

---

## Staged Ingestion Strategy

* **Day 1 MVP:**
  * Multimodal Quick Capture (Text, Voice, Receipt OCR via Gemini).
  * CSV/OFX File Upload (`/api/import/csv`) with automated merchant cleanup and deduplication against existing dates and amounts.
* **Phase 2 Expansion:**
  * Plaid / SimpleFin account link. `bank_connections` table is already in place; sandbox provider returns simulated webhooks without database migration required.

---

## Mobile Packaging (Capacitor & PWA)

1. Next.js configured with `next-pwa` for desktop and mobile home screen installation.
2. Capacitor initialized:
   ```bash
   npx cap init "Lumina Money" "com.luminamoney.app" --web-dir "out"
   npx cap add android
   npx cap add ios
   ```
3. Native device plugins: `@capacitor/camera` for receipts and `@capacitor/haptics` for touch confirmation feedback.
