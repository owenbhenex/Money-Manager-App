"use client";

import { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Plus,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Wallet,
  ShieldCheck,
  RotateCcw,
  Sliders,
  Search,
  Scale,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { QuickCaptureModal } from "@/components/quick-capture/QuickCaptureModal";
import { CopilotDrawer } from "@/components/copilot/CopilotDrawer";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { BankConnectModal } from "@/components/bank/BankConnectModal";
import { SubscriptionsPanel } from "@/components/subscriptions/SubscriptionsPanel";
import { ExtractedTransaction, Transaction } from "@/types/database.types";
import { Building2, Upload } from "lucide-react";
import { CsvImportModal } from "@/components/import/CsvImportModal";
import { evaluateBatch, type Rule, type RuleInput } from "@/lib/rules/engine";
import { useFinancialData } from "@/lib/hooks/useFinancialData";

// Locale-stable currency formatter.
// toLocaleString() without an explicit locale uses the runtime default, which
// differs between the Node server and the browser (e.g. "11.035" vs "11,035").
// That mismatch breaks React hydration, so always pin 'en-US' here.
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "\u20ac",
  GBP: "\u00a3",
  JPY: "\u00a5",
  CAD: "CA$",
  AUD: "AU$",
  IDR: "Rp",
  SGD: "S$",
};
const formatCurrency = (value: number, currencyCode = "USD") =>
  `${CURRENCY_SYMBOLS[currencyCode] ?? "$"}${value.toLocaleString("en-US")}`;

// Mock Cashflow Trajectory
const cashflowData = [
  { day: "Sep 1", spend: 85, budget: 120 },
  { day: "Sep 5", spend: 340, budget: 600 },
  { day: "Sep 10", spend: 720, budget: 1200 },
  { day: "Sep 15", spend: 1150, budget: 1800 },
  { day: "Sep 20", spend: 1680, budget: 2400 },
  { day: "Sep 25", spend: 2040, budget: 3000 },
  { day: "Sep 28", spend: 2315, budget: 3360 },
];

// Mock Category Donut
const categoryData = [
  { name: "Food & Dining", value: 720, color: "#F59E0B" },
  { name: "Housing & Utilities", value: 950, color: "#6366F1" },
  { name: "Transportation", value: 280, color: "#3B82F6" },
  { name: "Groceries", value: 310, color: "#10B981" },
  { name: "Entertainment", value: 160, color: "#EC4899" },
];

export default function DashboardPage() {
  // Real Supabase data when signed in; empty (demo fallback) when not.
  const {
    data: userData,
    loading: dataLoading,
    isAuthenticated,
    reload: reloadUserData,
  } = useFinancialData();

  // Derived display data: prefer real rows once loaded, otherwise use mock data
  // so the dashboard stays interactive for visitors who never signed in.
  const dbTransactions = userData.transactions;
  const dbAccounts = userData.accounts;
  const dbCategories = userData.categories;

  const [isOnboarding, setIsOnboarding] = useState(false);
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isBankConnectOpen, setIsBankConnectOpen] = useState(false);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);

  // Conversational rules created via Copilot function calling
  const [rules, setRules] = useState<Rule[]>([]);

  // Track connected sandbox institutions so the subscriptions detector knows
  // which transaction streams to analyze.
  const [connectedInstitutions, setConnectedInstitutions] = useState<string[]>(
    [],
  );

  // Undo Toast state
  const [lastLoggedTx, setLastLoggedTx] = useState<ExtractedTransaction | null>(
    null,
  );
  const [undoToastVisible, setUndoToastVisible] = useState(false);

  // Financial State
  const [currency, setCurrency] = useState("USD");
  const [monthlyIncome, setMonthlyIncome] = useState(5800);
  const [monthlySavingsTarget, setMonthlySavingsTarget] = useState(1500);
  const [liquidBalance, setLiquidBalance] = useState(14850);
  const [monthlySpent, setMonthlySpent] = useState(2315);

  const safeToSpend = Math.max(
    0,
    liquidBalance - monthlySavingsTarget - monthlySpent,
  );

  // Net Worth: mock accounts (checking/savings are assets, credit card is a liability).
  // Liquidity-exact linking happens in the accounts table once Supabase is live.
  const MOCK_ACCOUNTS = [
    { name: "Primary Checking", type: "checking", balance: 3500 },
    { name: "High Yield Savings", type: "savings", balance: 12000 },
    { name: "Credit Card", type: "credit_card", balance: -450 },
    { name: "Physical Cash", type: "cash", balance: 150 },
  ];
  const totalAssets = MOCK_ACCOUNTS.filter((a) => a.balance > 0).reduce(
    (s, a) => s + a.balance,
    0,
  );
  const totalLiabilities = Math.abs(
    MOCK_ACCOUNTS.filter((a) => a.balance < 0).reduce(
      (s, a) => s + a.balance,
      0,
    ),
  );
  const netWorth = totalAssets - totalLiabilities;

  // Budget progress per category (categoryData is the mock September spend)
  const budgetProgress = categoryData.map((c) => ({
    name: c.name,
    spent: c.value,
    // ponytail: naive even-split budget proxy until real budgets exist in DB.
    budget: Math.max(c.value, Math.round((c.value / 0.7) * 10) / 10),
  }));

  // Sync DB data into local state once, when authenticated data arrives.
  // Uses a ref so switching accounts or re-onboarding can re-sync later.
  const syncedRef = useRef(false);
  useEffect(() => {
    if (!isAuthenticated || syncedRef.current) return;
    if (userData.profile) {
      syncedRef.current = true;
      const pf = userData.profile as {
        currency?: string;
        monthly_income?: number;
        monthly_savings_target?: number;
        onboarding_completed?: boolean;
      };
      if (pf.currency) setCurrency(pf.currency);
      if (typeof pf.monthly_income === "number")
        setMonthlyIncome(pf.monthly_income);
      if (typeof pf.monthly_savings_target === "number")
        setMonthlySavingsTarget(pf.monthly_savings_target);
      if (pf.onboarding_completed) setIsOnboarding(false);
    }
    if (dbAccounts.length > 0) {
      const liquid = dbAccounts
        .filter(
          (a: { type?: string }) => a.type === "checking" || a.type === "cash",
        )
        .reduce(
          (s: number, a: { balance?: number }) => s + Number(a.balance ?? 0),
          0,
        );
      setLiquidBalance(liquid);
    }
    if (dbTransactions.length > 0) {
      setTransactions(dbTransactions);
    }
    if (userData.rules.length > 0) {
      setRules(userData.rules);
    }
  }, [isAuthenticated, userData, dbAccounts, dbTransactions]);

  // Cmd/Ctrl+K opens Quick Capture — the header displays this shortcut.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsQuickCaptureOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Transactions State
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: "tx-1",
      user_id: "user-1",
      account_id: "acc-1",
      category_id: "cat-1",
      amount: -18.4,
      currency: "USD",
      date: "2026-09-28",
      merchant: "Chipotle Mexican Grill",
      notes: "Quick capture memo",
      capture_method: "text_ai",
      ai_confidence: 0.98,
      receipt_url: null,
      status: "confirmed",
      created_at: new Date().toISOString(),
      category: {
        id: "c1",
        user_id: "u1",
        name: "Food & Dining",
        icon: "utensils",
        color: "#F59E0B",
        monthly_budget: 800,
        is_system: true,
        created_at: "",
      },
    },
    {
      id: "tx-2",
      user_id: "user-1",
      account_id: "acc-1",
      category_id: "cat-2",
      amount: -42.5,
      currency: "USD",
      date: "2026-09-27",
      merchant: "Chevron Fuel",
      notes: "Auto-tagged via Gas rule",
      capture_method: "receipt_ocr",
      ai_confidence: 0.94,
      receipt_url: null,
      status: "confirmed",
      created_at: new Date().toISOString(),
      category: {
        id: "c2",
        user_id: "u1",
        name: "Transportation",
        icon: "car",
        color: "#3B82F6",
        monthly_budget: 350,
        is_system: true,
        created_at: "",
      },
    },
    {
      id: "tx-3",
      user_id: "user-1",
      account_id: "acc-1",
      category_id: "cat-3",
      amount: -129.8,
      currency: "USD",
      date: "2026-09-26",
      merchant: "Whole Foods Market",
      notes: "Weekly organic groceries",
      capture_method: "manual",
      ai_confidence: 1.0,
      receipt_url: null,
      status: "confirmed",
      created_at: new Date().toISOString(),
      category: {
        id: "c3",
        user_id: "u1",
        name: "Groceries",
        icon: "shopping-cart",
        color: "#10B981",
        monthly_budget: 500,
        is_system: true,
        created_at: "",
      },
    },
    {
      id: "tx-4",
      user_id: "user-1",
      account_id: "acc-1",
      category_id: "cat-4",
      amount: 2900.0,
      currency: "USD",
      date: "2026-09-25",
      merchant: "Direct Deposit / Payroll",
      notes: "Bi-weekly freelance retainer",
      capture_method: "bank_sync",
      ai_confidence: 1.0,
      receipt_url: null,
      status: "confirmed",
      created_at: new Date().toISOString(),
      category: {
        id: "c4",
        user_id: "u1",
        name: "Income",
        icon: "briefcase",
        color: "#10B981",
        monthly_budget: null,
        is_system: true,
        created_at: "",
      },
    },
  ]);

  // Ledger search
  const [ledgerSearch, setLedgerSearch] = useState("");
  const q = ledgerSearch.trim().toLowerCase();
  const qNum = ledgerSearch.replace(/[^0-9.]/g, "");
  const filteredTransactions = q
    ? transactions.filter(
        (t) =>
          t.merchant.toLowerCase().includes(q) ||
          (t.category?.name ?? "").toLowerCase().includes(q) ||
          (qNum && String(Math.abs(t.amount)).includes(qNum)),
      )
    : transactions;

  // Handle Quick Capture Save
  const handleTransactionSaved = async (extracted: ExtractedTransaction) => {
    // Persist when authenticated
    if (isAuthenticated) {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant: extracted.merchant,
          amount: -Math.abs(extracted.amount),
          date: extracted.date || new Date().toISOString().split("T")[0],
          category_name: extracted.category_name,
          notes: extracted.notes || "Logged via Lumina Quick Capture",
          capture_method: "text_ai",
          ai_confidence: extracted.confidence,
          currency,
        }),
      });
      const json = await res.json();
      if (json.success) {
        const newTx = json.transaction as Transaction;
        setTransactions((prev) => [newTx, ...prev]);
        setMonthlySpent((prev) => prev + Math.abs(extracted.amount));
        setLiquidBalance((prev) => prev - Math.abs(extracted.amount));
        setLastLoggedTx(extracted);
        setUndoToastVisible(true);
        setTimeout(() => setUndoToastVisible(false), 5000);
        return;
      }
    }
    // Demo mode (not authenticated)
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      user_id: "user-1",
      account_id: "acc-1",
      category_id: null,
      amount: -Math.abs(extracted.amount),
      currency,
      date: extracted.date || new Date().toISOString().split("T")[0],
      merchant: extracted.merchant,
      notes: extracted.notes || "Logged via Lumina Quick Capture",
      capture_method: "text_ai",
      ai_confidence: extracted.confidence,
      receipt_url: null,
      status: "confirmed",
      created_at: new Date().toISOString(),
      category: {
        id: "cat-new",
        user_id: "user-1",
        name: extracted.category_name,
        icon: "tag",
        color: "#3B82F6",
        monthly_budget: null,
        is_system: false,
        created_at: "",
      },
    };

    setTransactions((prev) => [newTx, ...prev]);
    setMonthlySpent((prev) => prev + extracted.amount);
    setLiquidBalance((prev) => prev - extracted.amount);

    // Show 5-second undo toast
    setLastLoggedTx(extracted);
    setUndoToastVisible(true);
    setTimeout(() => {
      setUndoToastVisible(false);
    }, 5000);
  };

  const handleUndo = async () => {
    if (!lastLoggedTx || transactions.length === 0) return;
    const removed = transactions[0];
    if (isAuthenticated && removed?.id) {
      await fetch(`/api/transactions?id=${removed.id}`, { method: "DELETE" });
    }
    setTransactions((prev) => prev.slice(1));
    setMonthlySpent((prev) => Math.max(0, prev - Math.abs(removed.amount)));
    setLiquidBalance((prev) => prev + Math.abs(removed.amount));
    setUndoToastVisible(false);
  };

  // Phase 2: handle transactions pulled from a sandbox bank connection.
  // Dedupes by merchant+date+amount and keeps balances in sync.
  const handleCsvImport = (
    rows: { date: string; merchant: string; amount: number; notes?: string }[],
  ) => {
    // Apply rule engine to categorize/dedupe imports
    const ruleInputs: RuleInput[] = rows.map((r) => ({
      id: `csv-${r.date}-${r.merchant}`.toLowerCase().replace(/\s+/g, "-"),
      merchant: r.merchant,
      amount: r.amount,
    }));
    const results = evaluateBatch(ruleInputs, rules);
    const overrides = new Map(results.map((r) => [r.txId, r.category ?? ""]));
    setTransactions((prev) => {
      const csvTxs: Transaction[] = rows.map((r) => ({
        id: `csv-${r.date}-${r.merchant}`.toLowerCase().replace(/\s+/g, "-"),
        user_id: "user-1",
        account_id: "acc-1",
        category_id: "cat-csv",
        amount: r.amount,
        currency,
        date: r.date,
        merchant: r.merchant,
        notes: r.notes || "Imported via CSV",
        capture_method: "csv_import",
        ai_confidence: 0,
        receipt_url: null,
        status: "confirmed",
        created_at: new Date().toISOString(),
        category: {
          id: "cat-csv",
          user_id: "user-1",
          name:
            overrides.get(
              `csv-${r.date}-${r.merchant}`.toLowerCase().replace(/\s+/g, "-"),
            ) || "Other",
          icon: "tag",
          color: "#94A3B8",
          monthly_budget: null,
          is_system: false,
          created_at: "",
        },
      }));
      // Dedupe by merchant+amount+date (same pattern as bank sync)
      const seen = new Set(
        prev.map((t) => `${t.merchant}|${t.amount}|${t.date}`),
      );
      const deduped = csvTxs.filter(
        (t) => !seen.has(`${t.merchant}|${t.amount}|${t.date}`),
      );
      const totalSpent = deduped
        .filter((t) => t.amount < 0)
        .reduce((s, t) => s + Math.abs(t.amount), 0);
      setMonthlySpent((p) => p + totalSpent);
      setLiquidBalance((p) => p - totalSpent);
      return [...deduped, ...prev];
    });
  };

  // When Copilot calls create_rule, persist it and re-evaluate existing txns
  const handleRuleCreated = async (rule: Rule) => {
    setRules((prev) => [...prev, rule]);
    if (isAuthenticated) {
      await fetch("/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: rule.name,
          merchant_contains: rule.trigger_condition?.merchant_contains ?? "",
          category_name: rule.action?.value ?? "",
          action: rule.action?.type ?? "set_category",
        }),
      });
    }
    // Re-categorize existing transactions that match the new rule
    const inputs: RuleInput[] = transactions.map((t) => ({
      id: t.id,
      merchant: t.merchant,
      amount: t.amount,
      category_name: t.category?.name,
      capture_method: t.capture_method,
    }));
    const results = evaluateBatch(inputs, [rule]);
    if (results.length === 0) return;
    const catMap = new Map(results.map((r) => [r.txId, r.category]));
    setTransactions((prev) =>
      prev.map((t) =>
        catMap.has(t.id)
          ? { ...t, category: { ...t.category!, name: catMap.get(t.id)! } }
          : t,
      ),
    );
  };

  const handleBankTransactionsImported = (newTxs: Transaction[]) => {
    setTransactions((prev) => {
      const seen = new Set(
        prev.map((t) => `${t.merchant}|${t.amount}|${t.date}`),
      );
      const deduped = newTxs.filter(
        (t) => !seen.has(`${t.merchant}|${t.amount}|${t.date}`),
      );
      // Record which institution these came from (by account_id prefix).
      const newInsts = deduped
        .map((t) => (t.account_id || "").replace("bank-", ""))
        .filter((id, i, arr) => id && arr.indexOf(id) === i);
      setConnectedInstitutions((prevInsts) => {
        const merged = [...new Set([...prevInsts, ...newInsts])];
        return merged;
      });
      // Update financial aggregates from the new (expense) transactions.
      const newSpend = deduped
        .filter((t) => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      setMonthlySpent(
        (prevSpend) => prevSpend + Math.round(newSpend * 100) / 100,
      );
      setLiquidBalance((prevBal) => prevBal - Math.round(newSpend * 100) / 100);
      return [...deduped, ...prev];
    });
  };

  if (isOnboarding) {
    return (
      <OnboardingWizard
        onComplete={async (data) => {
          setCurrency(data.currency);
          setMonthlyIncome(data.monthlyIncome);
          setMonthlySavingsTarget(data.monthlySavingsTarget);
          setLiquidBalance(
            data.accounts
              .filter((a) => a.type === "checking" || a.type === "cash")
              .reduce((sum, a) => sum + Number(a.balance), 0),
          );
          if (isAuthenticated) {
            await fetch("/api/profile", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                currency: data.currency,
                monthly_income: data.monthlyIncome,
                monthly_savings_target: data.monthlySavingsTarget,
                onboarding_completed: true,
              }),
            });
            await fetch("/api/accounts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ accounts: data.accounts }),
            });
            await reloadUserData();
          }
          setIsOnboarding(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0E27] text-slate-100 flex flex-col pb-24">
      {/* 1. Header Bar */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0A0E27]/80 backdrop-blur-xl px-3 sm:px-8 py-3.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white">
                Lumina
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                AI Copilot
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden md:block">
              Personal Finance Operating System
            </p>
          </div>
        </div>

        {/* Global Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <button
            onClick={() => setIsQuickCaptureOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 min-h-[44px] rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 transition"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>Quick Log</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-slate-400">
              ⌘K
            </kbd>
          </button>

          <button
            onClick={() => setIsBankConnectOpen(true)}
            className="flex sm:hidden items-center justify-center w-11 h-11 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition"
            title="Connect a bank account"
            aria-label="Connect a bank account"
          >
            <Building2 className="w-4 h-4 text-blue-400" />
          </button>

          <button
            onClick={() => setIsBankConnectOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 min-h-[44px] rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 transition"
            title="Connect a bank account"
          >
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            <span>Connect Bank</span>
          </button>

          <button
            onClick={() => setIsCsvImportOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 min-h-[44px] rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 transition"
            title="Import a bank CSV statement"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={() => setIsCopilotOpen(true)}
            className="flex items-center gap-2 px-3.5 min-h-[44px] rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-semibold shadow-sm transition"
            title="Ask Copilot"
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">Ask Copilot</span>
          </button>

          <button
            onClick={() => setIsOnboarding(true)}
            className="hidden min-[400px]:flex w-11 h-11 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 items-center justify-center text-slate-400 hover:text-white transition"
            title="Re-run Setup Wizard"
            aria-label="Re-run Setup Wizard"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Proactive AI Nudge Banner */}
        <div
          onClick={() => setIsCopilotOpen(true)}
          className="p-3.5 sm:p-4 rounded-2xl glass-card border border-indigo-500/30 hover:border-indigo-500/50 bg-gradient-to-r from-indigo-950/40 via-slate-900/40 to-transparent flex items-center justify-between cursor-pointer transition group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-white block">
                Proactive Insight: Food & Dining is 28% ahead of standard pace
              </span>
              <p className="text-[11px] text-slate-400">
                You have $80 remaining in dining for the next 3 days. Tap to ask
                Lumina for safe spending tips.
              </p>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition shrink-0" />
        </div>

        {/* 3. Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Safe-to-Spend */}
          <div className="glass-card rounded-2xl p-5 border border-white/10 relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Safe-to-Spend</span>
              <div className="flex items-center gap-1 text-emerald-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Optimal</span>
              </div>
            </div>
            <div className="text-3xl font-bold tabular-nums text-white mt-1">
              {formatCurrency(safeToSpend, currency)}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Free to spend without encroaching on your{" "}
              {formatCurrency(monthlySavingsTarget, currency)} savings goal.
            </p>
          </div>

          {/* Liquid Net Worth */}
          <div className="glass-card rounded-2xl p-5 border border-white/10">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Liquid Cash Balance</span>
              <div className="flex items-center gap-1 text-blue-400 font-medium">
                <Wallet className="w-3.5 h-3.5" />
                <span>Checking & Cash</span>
              </div>
            </div>
            <div className="text-3xl font-bold tabular-nums text-white mt-1">
              {formatCurrency(liquidBalance, currency)}
            </div>
            <div className="flex items-center gap-1 text-xs text-emerald-400 mt-2 font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+6.4% vs last month</span>
            </div>
          </div>

          {/* Monthly Spend vs Inflow */}
          <div className="glass-card rounded-2xl p-5 border border-white/10">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Monthly Burn Rate</span>
              <span className="text-slate-400">Pace: 39%</span>
            </div>
            <div className="text-3xl font-bold tabular-nums text-white mt-1">
              {formatCurrency(monthlySpent, currency)}
            </div>
            <div className="mt-2.5">
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (monthlySpent / monthlyIncome) * 100)}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>Inflow: {formatCurrency(monthlyIncome, currency)}</span>
                <span>
                  Target: {formatCurrency(monthlySavingsTarget, currency)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3b. Net Worth + Budget Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Net Worth Card */}
          <div className="glass-card rounded-2xl p-5 border border-white/10">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Net Worth</span>
              <div className="flex items-center gap-1 text-indigo-400 font-medium">
                <Scale className="w-3.5 h-3.5" />
                <span>Assets & minus; Liabilities</span>
              </div>
            </div>
            <div className="text-3xl font-bold tabular-nums text-white mt-1">
              {formatCurrency(netWorth, currency)}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">
                  Assets
                </p>
                <p className="text-sm font-bold tabular-nums text-emerald-300">
                  {formatCurrency(totalAssets, currency)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-[10px] uppercase tracking-wider text-red-400 font-semibold">
                  Liabilities
                </p>
                <p className="text-sm font-bold tabular-nums text-red-300">
                  {formatCurrency(totalLiabilities, currency)}
                </p>
              </div>
            </div>
          </div>

          {/* Budget Progress Bars */}
          <div className="glass-card rounded-2xl p-5 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">
                Budget Progress
              </h3>
              <span className="text-[10px] text-slate-400">
                {budgetProgress.length} categories
              </span>
            </div>
            <div className="space-y-3">
              {budgetProgress.map((b) => {
                const pct = Math.min(100, b.spent / b.budget) * 100;
                const over = b.spent > b.budget;
                return (
                  <div key={b.name}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-300">{b.name}</span>
                      <span
                        className={`tabular-nums font-semibold ${over ? "text-red-400" : "text-slate-400"}`}
                      >
                        {formatCurrency(b.spent, currency)} /{" "}
                        {formatCurrency(b.budget, currency)}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${over ? "bg-red-500" : "bg-emerald-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 4. Analytics Visualizers (Recharts) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cash Flow Trajectory Chart */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-5 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Cash Flow Trajectory
                </h3>
                <p className="text-xs text-slate-400">
                  Cumulative spend vs planned budget threshold
                </p>
              </div>
              <span className="text-xs text-emerald-400 font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                Below Upper Bound
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={cashflowData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="spendGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop
                        offset="95%"
                        stopColor="#3B82F6"
                        stopOpacity={0.0}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="day"
                    stroke="#64748B"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#64748B"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0D132D",
                      borderColor: "rgba(255,255,255,0.12)",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="spend"
                    stroke="#3B82F6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#spendGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Breakdown Donut */}
          <div className="glass-card rounded-2xl p-5 border border-white/10 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Top Spending Categories
              </h3>
              <p className="text-xs text-slate-400">September distribution</p>
            </div>

            <div className="h-44 w-full my-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0D132D",
                      borderColor: "rgba(255,255,255,0.12)",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-1.5">
              {categoryData.map((cat) => (
                <div
                  key={cat.name}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-slate-300">{cat.name}</span>
                  </div>
                  <span className="font-semibold tabular-nums text-white">
                    ${cat.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 5. Recent Transactions Table */}
        <div className="glass-card rounded-2xl p-5 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Recent Transactions
              </h3>
              <p className="text-xs text-slate-400">
                Real-time ledger with AI auto-categorization
              </p>
            </div>
            <button
              onClick={() => setIsQuickCaptureOpen(true)}
              className="inline-flex items-center justify-center min-h-[44px] px-2 rounded-lg text-xs text-blue-400 hover:text-blue-300 font-medium transition"
            >
              + Add Transaction
            </button>
          </div>

          {/* Search / filter */}
          <div className="px-2 pb-2">
            <input
              type="search"
              value={ledgerSearch}
              onChange={(e) => setLedgerSearch(e.target.value)}
              placeholder="Search merchant, category, amount…"
              aria-label="Search transactions"
              className="w-full h-10 bg-slate-900/80 border border-white/10 rounded-xl px-3.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="divide-y divide-white/5">
            {filteredTransactions.map((tx) => (
              <div
                key={tx.id}
                className="py-3 flex items-center justify-between hover:bg-white/[0.02] px-2 rounded-xl transition"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      tx.amount > 0
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-white/5 text-slate-300 border border-white/10"
                    }`}
                  >
                    {tx.amount > 0 ? (
                      <ArrowDownLeft className="w-4 h-4" />
                    ) : (
                      <DollarSign className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white block">
                      {tx.merchant}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span>{tx.date}</span>
                      <span>•</span>
                      <span className="px-1.5 py-0.2 rounded bg-white/5 text-[10px] text-slate-300 font-medium">
                        {tx.category?.name || "General"}
                      </span>
                      {tx.capture_method.includes("ai") && (
                        <span className="flex items-center gap-0.5 text-[10px] text-indigo-400">
                          <Sparkles className="w-2.5 h-2.5" />
                          AI
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`text-sm font-bold tabular-nums block ${
                      tx.amount > 0 ? "text-emerald-400" : "text-slate-100"
                    }`}
                  >
                    {tx.amount > 0
                      ? `+${CURRENCY_SYMBOLS[currency] ?? "$"}${tx.amount.toFixed(2)}`
                      : `-${CURRENCY_SYMBOLS[currency] ?? "$"}${Math.abs(tx.amount).toFixed(2)}`}
                  </span>
                  <span className="text-[10px] text-slate-500 capitalize">
                    {tx.capture_method.replace("_", " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Phase 2: AI Recurring Subscriptions Detector */}
        <SubscriptionsPanel
          institutionIds={connectedInstitutions}
          onConnectBank={() => setIsBankConnectOpen(true)}
        />
      </main>

      {/* 6. Undo Notification Toast */}
      {undoToastVisible && lastLoggedTx && (
        <div className="fixed bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-900 border border-white/20 shadow-2xl text-xs text-white animate-in slide-in-from-bottom duration-200">
          <span>
            Logged: <strong>{lastLoggedTx.merchant}</strong> ($
            {lastLoggedTx.amount})
          </span>
          <button
            onClick={handleUndo}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-blue-400 font-semibold transition"
          >
            <RotateCcw className="w-3 h-3" />
            Undo
          </button>
        </div>
      )}

      {/* 7. Floating Action Button (FAB) */}
      <button
        onClick={() => setIsQuickCaptureOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white flex items-center justify-center shadow-xl shadow-blue-600/30 transition transform hover:scale-105 active:scale-95"
        aria-label="Quick Add Expense"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Quick Capture Modal Component */}
      <QuickCaptureModal
        isOpen={isQuickCaptureOpen}
        onClose={() => setIsQuickCaptureOpen(false)}
        onTransactionSaved={handleTransactionSaved}
      />

      {/* Copilot Drawer Component */}
      <CopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        onRuleCreated={handleRuleCreated}
        financialContext={{
          currency,
          liquidBalance,
          monthlyIncome,
          monthlySpent,
          monthlySavingsTarget,
          safeToSpend,
          categories: categoryData.map((c) => c.name),
        }}
      />

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={isCsvImportOpen}
        onClose={() => setIsCsvImportOpen(false)}
        onImport={handleCsvImport}
      />

      {/* Phase 2: Bank Connect Modal */}
      <BankConnectModal
        isOpen={isBankConnectOpen}
        onClose={() => setIsBankConnectOpen(false)}
        onTransactionsImported={handleBankTransactionsImported}
      />
    </div>
  );
}
