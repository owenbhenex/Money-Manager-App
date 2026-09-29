'use client';

import React, { useState } from 'react';
import { DollarSign, Wallet, Target, ArrowRight, ArrowLeft, Check, Sparkles } from 'lucide-react';

interface OnboardingWizardProps {
  onComplete: (data: {
    currency: string;
    accounts: Array<{ name: string; type: string; balance: number }>;
    monthlyIncome: number;
    monthlySavingsTarget: number;
  }) => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 State: Currency
  const [currency, setCurrency] = useState('USD');
  const currencyOptions = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'AU$', name: 'Australian Dollar' },
    { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  ];

  // Step 2 State: Accounts
  const [accounts, setAccounts] = useState([
    { name: 'Primary Checking', type: 'checking', balance: 3500 },
    { name: 'High Yield Savings', type: 'savings', balance: 12000 },
    { name: 'Credit Card', type: 'credit_card', balance: -450 },
    { name: 'Physical Cash', type: 'cash', balance: 150 },
  ]);

  // Step 3 State: Income & Savings Target
  const [monthlyIncome, setMonthlyIncome] = useState(5500);
  const [monthlySavingsTarget, setMonthlySavingsTarget] = useState(1200);

  const calculatePreviewSafeToSpend = () => {
    const liquid = accounts
      .filter((a) => a.type === 'checking' || a.type === 'cash')
      .reduce((sum, a) => sum + Number(a.balance), 0);
    return Math.max(0, liquid - monthlySavingsTarget);
  };

  const handleFinish = () => {
    onComplete({
      currency,
      accounts,
      monthlyIncome,
      monthlySavingsTarget,
    });
  };

  return (
    <div className="min-h-screen bg-[#0A0E27] flex items-center justify-center p-4">
      <div className="w-full max-w-lg glass-modal rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl relative overflow-hidden">
        
        {/* Glow Accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-blue-500/10 blur-3xl pointer-events-none rounded-full" />

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step
                    ? 'w-10 bg-blue-500 shadow-sm shadow-blue-500/50'
                    : s < step
                    ? 'w-6 bg-emerald-500'
                    : 'w-6 bg-white/10'
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-medium text-slate-400">Step {step} of 3</span>
        </div>

        {/* STEP 1: Currency Selection */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
                <DollarSign className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white">Choose Base Currency</h2>
              <p className="text-xs text-slate-400 mt-1">
                All dashboards, charts, and safe-to-spend predictions will format in this currency.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {currencyOptions.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setCurrency(c.code)}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between transition ${
                    currency === c.code
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-md shadow-blue-500/10'
                      : 'bg-white/[0.02] border-white/5 text-slate-300 hover:border-white/20 hover:bg-white/[0.04]'
                  }`}
                >
                  <div>
                    <span className="font-bold text-sm block">{c.code}</span>
                    <span className="text-[11px] text-slate-400">{c.name}</span>
                  </div>
                  <span className="text-lg font-semibold tabular-nums text-slate-300">{c.symbol}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition mt-6"
            >
              Next: Setup Accounts
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: Initial Accounts & Balances */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
                <Wallet className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white">Initial Accounts & Balances</h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter your approximate starting balances. You can link bank accounts or adjust these anytime.
              </p>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {accounts.map((acc, index) => (
                <div
                  key={index}
                  className="p-3 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between gap-3"
                >
                  <div className="flex-1">
                    <span className="text-xs font-semibold text-white block">{acc.name}</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">{acc.type}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">{currency}</span>
                    <input
                      type="number"
                      value={acc.balance}
                      onChange={(e) => {
                        const updated = [...accounts];
                        updated[index].balance = parseFloat(e.target.value) || 0;
                        setAccounts(updated);
                      }}
                      className="w-28 bg-slate-900/80 border border-white/10 rounded-lg px-2.5 py-1 text-right text-sm font-semibold tabular-nums text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="h-12 px-4 bg-white/5 hover:bg-white/10 text-slate-300 font-medium text-xs rounded-xl flex items-center gap-1 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 h-12 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition"
              >
                Next: Targets & Safe-to-Spend
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Income & Savings Target */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                <Target className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white">Income & Target Savings</h2>
              <p className="text-xs text-slate-400 mt-1">
                Lumina uses this to project your real-time Safe-to-Spend number for discretionary purchases.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Expected Monthly Inflow ({currency})
                </label>
                <input
                  type="number"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-base font-semibold tabular-nums text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Target Monthly Savings ({currency})
                </label>
                <input
                  type="number"
                  value={monthlySavingsTarget}
                  onChange={(e) => setMonthlySavingsTarget(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-base font-semibold tabular-nums text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Dynamic Preview Card */}
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                    <Sparkles className="w-3 h-3" />
                    Projected Safe-to-Spend
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Calculated from liquid checking & savings buffer</p>
                </div>
                <div className="text-2xl font-bold tabular-nums text-emerald-300">
                  ${calculatePreviewSafeToSpend().toLocaleString("en-US")}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="h-12 px-4 bg-white/5 hover:bg-white/10 text-slate-300 font-medium text-xs rounded-xl flex items-center gap-1 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="button"
                onClick={handleFinish}
                className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition"
              >
                <Check className="w-4 h-4" />
                Finish Setup & Open App
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
