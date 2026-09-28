-- =========================================================================
-- Lumina Money: Database Schema & Row-Level Security (RLS)
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES & ONBOARDING STATE
CREATE TABLE IF NOT EXISTS profiles (
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
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('checking', 'savings', 'credit_card', 'cash', 'investment')),
  balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  currency TEXT DEFAULT 'USD',
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
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
CREATE TABLE IF NOT EXISTS transactions (
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

-- 5. SPENDING & CATEGORIZATION RULES (Created conversationally via Copilot or UI)
CREATE TABLE IF NOT EXISTS spending_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_condition JSONB NOT NULL,
  action JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. AI INSIGHTS & NOTIFICATIONS
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('anomaly', 'budget_warning', 'saving_tip', 'monthly_review')),
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. BANK CONNECTIONS (Staged for Phase 2)
CREATE TABLE IF NOT EXISTS bank_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'sandbox',
  institution_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS POLICIES FOR ALL TABLES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own profile" ON profiles;
CREATE POLICY "Users can access own profile" ON profiles FOR ALL USING (auth.uid() = id);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own accounts" ON accounts;
CREATE POLICY "Users can access own accounts" ON accounts FOR ALL USING (auth.uid() = user_id);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own categories" ON categories;
CREATE POLICY "Users can access own categories" ON categories FOR ALL USING (auth.uid() = user_id);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own transactions" ON transactions;
CREATE POLICY "Users can access own transactions" ON transactions FOR ALL USING (auth.uid() = user_id);

ALTER TABLE spending_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own rules" ON spending_rules;
CREATE POLICY "Users can access own rules" ON spending_rules FOR ALL USING (auth.uid() = user_id);

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own insights" ON ai_insights;
CREATE POLICY "Users can access own insights" ON ai_insights FOR ALL USING (auth.uid() = user_id);

ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own connections" ON bank_connections;
CREATE POLICY "Users can access own connections" ON bank_connections FOR ALL USING (auth.uid() = user_id);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(user_id, category_id);
CREATE INDEX IF NOT EXISTS idx_spending_rules_user ON spending_rules(user_id) WHERE is_active = TRUE;

-- DEFAULT SYSTEM CATEGORIES SEED FUNCTION
CREATE OR REPLACE FUNCTION seed_user_default_categories(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO categories (user_id, name, icon, color, is_system) VALUES
    (target_user_id, 'Food & Dining', 'utensils', '#F59E0B', TRUE),
    (target_user_id, 'Transportation', 'car', '#3B82F6', TRUE),
    (target_user_id, 'Groceries', 'shopping-cart', '#10B981', TRUE),
    (target_user_id, 'Housing & Utilities', 'home', '#6366F1', TRUE),
    (target_user_id, 'Entertainment', 'film', '#EC4899', TRUE),
    (target_user_id, 'Healthcare', 'heart', '#EF4444', TRUE),
    (target_user_id, 'Personal Care', 'smile', '#8B5CF6', TRUE),
    (target_user_id, 'Income', 'briefcase', '#10B981', TRUE),
    (target_user_id, 'Other', 'more-horizontal', '#94A3B8', TRUE)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
