"use client";

import React, { useState, useEffect } from "react";
import { X, ArrowDownLeft, ArrowUpRight, Check, Loader2 } from "lucide-react";

export interface AccountLite {
  id: string;
  name: string;
  type: string;
  balance: number;
}

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

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: {
    type: "income" | "expense";
    merchant: string;
    amount: number; // always positive; sign applied by caller
    date: string;
    category_name: string | null;
    account_id: string | null;
    notes: string | null;
  }) => Promise<void> | void;
  accounts: AccountLite[];
  categories: string[];
  currency?: string;
  initialType?: "income" | "expense";
}

export function AddTransactionModal({
  isOpen,
  onClose,
  onSave,
  accounts,
  categories,
  currency = "USD",
  initialType = "expense",
}: AddTransactionModalProps) {
  const [type, setType] = useState<"income" | "expense">(initialType);
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState("");
  const [accountId, setAccountId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keyboard: Esc closes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const numAmount = Number(amount);
  const valid =
    merchant.trim().length > 0 && Number.isFinite(numAmount) && numAmount > 0;

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        type,
        merchant: merchant.trim(),
        amount: numAmount,
        date,
        category_name: category || null,
        account_id: accountId || null,
        notes: notes.trim() || null,
      });
      // Reset + close on success
      setMerchant("");
      setAmount("");
      setNotes("");
      setCategory("");
      setAccountId("");
      setError(null);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save transaction",
      );
    } finally {
      setSaving(false);
    }
  };

  const expenseCats = categories.filter((c) => c !== "Income");
  const incomeCats = categories.filter((c) => c === "Income" || c === "Other");
  const shownCats = type === "income" ? incomeCats : expenseCats;
  if (type === "expense" && !category && expenseCats.length) {
    // no-op; category is optional
  }

  const inputCls =
    "w-full h-11 bg-slate-950/60 border border-white/10 rounded-xl px-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  const labelCls = "block text-xs font-medium text-slate-300 mb-1.5";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Add transaction"
    >
      <div
        className="relative w-full max-w-md glass-modal rounded-2xl overflow-hidden border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                Add Transaction
              </h2>
              <p className="text-xs text-slate-400">
                Income or expense, any account
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-900/60 rounded-xl border border-white/5">
            <button
              type="button"
              onClick={() => setType("expense")}
              aria-pressed={type === "expense"}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium transition ${
                type === "expense"
                  ? "bg-red-500/90 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Expense
            </button>
            <button
              type="button"
              onClick={() => setType("income")}
              aria-pressed={type === "income"}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium transition ${
                type === "income"
                  ? "bg-emerald-500/90 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              Income
            </button>
          </div>

          {/* Amount — big and first */}
          <div>
            <label className={labelCls} htmlFor="tx-amount">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                {CURRENCY_SYMBOLS[currency] ?? "$"}
              </span>
              <input
                id="tx-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={
                  inputCls + " pl-8 text-lg font-semibold tabular-nums"
                }
                autoFocus
                required
              />
            </div>
          </div>

          {/* Merchant + Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="tx-merchant">
                Description
              </label>
              <input
                id="tx-merchant"
                type="text"
                placeholder={
                  type === "income" ? "e.g. Salary" : "e.g. Chipotle"
                }
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="tx-date">
                Date
              </label>
              <input
                id="tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputCls}
                required
              />
            </div>
          </div>

          {/* Account + Category row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="tx-account">
                Account
              </label>
              <select
                id="tx-account"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className={inputCls + " appearance-none"}
              >
                <option value="">No account</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id} className="bg-slate-900">
                    {a.name} (
                    {(CURRENCY_SYMBOLS[currency] ?? "$") +
                      a.balance.toLocaleString("en-US")}
                    )
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="tx-category">
                Category
              </label>
              <select
                id="tx-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputCls + " appearance-none"}
              >
                <option value="">None</option>
                {shownCats.map((c) => (
                  <option key={c} value={c} className="bg-slate-900">
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls} htmlFor="tx-notes">
              Notes (optional)
            </label>
            <input
              id="tx-notes"
              type="text"
              placeholder="Anything worth remembering"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputCls}
            />
          </div>

          {error && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-red-500/10 border border-red-500/30"
            >
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!valid || saving}
              className={`flex-[2] h-11 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg transition disabled:opacity-50 ${
                type === "income"
                  ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20"
                  : "bg-blue-600 hover:bg-blue-500 shadow-blue-600/20"
              }`}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save {type === "income" ? "Income" : "Expense"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
