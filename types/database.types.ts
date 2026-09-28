export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Profile {
  id: string;
  email: string;
  currency: string;
  timezone: string;
  monthly_income: number;
  monthly_savings_target: number;
  safe_to_spend_buffer: number;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export type AccountType = 'checking' | 'savings' | 'credit_card' | 'cash' | 'investment';

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  is_archived: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  monthly_budget: number | null;
  is_system: boolean;
  created_at: string;
}

export type CaptureMethod = 'manual' | 'text_ai' | 'voice_ai' | 'receipt_ocr' | 'csv_import' | 'bank_sync';
export type TransactionStatus = 'draft' | 'confirmed' | 'ignored';

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string | null;
  category_id: string | null;
  amount: number;
  currency: string;
  date: string;
  merchant: string;
  notes: string | null;
  capture_method: CaptureMethod;
  ai_confidence: number | null;
  receipt_url: string | null;
  status: TransactionStatus;
  created_at: string;
  // Joined fields
  account?: Account | null;
  category?: Category | null;
}

export interface SpendingRule {
  id: string;
  user_id: string;
  name: string;
  trigger_condition: {
    field: 'merchant' | 'amount' | 'category_name' | 'day_of_month';
    operator: 'contains' | 'equals' | 'in' | 'greater_than' | 'less_than';
    value: string | number | string[];
    secondary_field?: string;
    secondary_value?: string | number;
  };
  action: {
    type: 'set_category' | 'create_alert' | 'adjust_budget';
    category_id?: string;
    category_name?: string;
    message?: string;
    severity?: 'info' | 'warning' | 'critical';
  };
  is_active: boolean;
  created_at: string;
}

export type InsightType = 'anomaly' | 'budget_warning' | 'saving_tip' | 'monthly_review';

export interface AiInsight {
  id: string;
  user_id: string;
  title: string;
  message: string;
  insight_type: InsightType;
  is_read: boolean;
  metadata: Record<string, any>;
  created_at: string;
}

export interface ExtractedTransaction {
  amount: number;
  merchant: string;
  category_name: string;
  date: string;
  confidence: number;
  notes?: string;
  payment_account_suggested?: string;
  line_items?: Array<{ name: string; price: number }>;
}
