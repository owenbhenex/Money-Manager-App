'use client';

import React, { useState } from 'react';
import {
  Repeat,
  Sparkles,
  Loader2,
  AlertTriangle,
  DollarSign,
  CalendarClock,
} from 'lucide-react';

interface Subscription {
  merchant: string;
  amount: number;
  category_name: string;
  billing_cycle: 'monthly' | 'annual' | 'weekly';
  confidence: number;
  cancellation_tip: string;
}

interface SubscriptionsPanelProps {
  institutionIds: string[];
}

const CYCLE_LABEL: Record<string, string> = {
  monthly: '/mo',
  annual: '/yr',
  weekly: '/wk',
};

const CATEGORY_COLOR: Record<string, string> = {
  Entertainment: '#EC4899',
  Software: '#8B5CF6',
  Utilities: '#F59E0B',
  Healthcare: '#EF4444',
  Shopping: '#6366F1',
  'Food & Dining': '#F59E0B',
  Transportation: '#3B82F6',
  Groceries: '#10B981',
  Other: '#64748B',
};

/**
 * AI Recurring Subscriptions Detector — Phase 2.
 * Analyzes synced bank transactions to surface recurring charges and
 * actionable cancellation advice.
 */
export function SubscriptionsPanel({ institutionIds }: SubscriptionsPanelProps) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [isDetecting, setIsDetecting] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDetect = async () => {
    setIsDetecting(true);
    setError(null);
    try {
      const res = await fetch('/api/subscriptions/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institution_ids: institutionIds }),
      });
      const data = await res.json();
      if (data.success) {
        setSubscriptions(data.subscriptions || []);
        setMonthlyTotal(data.monthly_total || 0);
        setHasRun(true);
      } else {
        setError(data.error || 'Detection failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Detection failed';
      setError(message);
    } finally {
      setIsDetecting(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-5 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-400">
            <Repeat className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Recurring Subscriptions</h3>
            <p className="text-xs text-slate-400">AI-detected recurring charges</p>
          </div>
        </div>
        <button
          onClick={handleDetect}
          disabled={isDetecting || institutionIds.length === 0}
          className="flex items-center gap-2 px-3.5 py-2 min-h-[44px] rounded-xl bg-fuchsia-600/20 hover:bg-fuchsia-600/30 border border-fuchsia-500/40 text-fuchsia-300 text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDetecting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          {isDetecting ? 'Analyzing…' : 'Detect'}
        </button>
      </div>

      {/* Empty state */}
      {!hasRun && !isDetecting && institutionIds.length === 0 && (
        <div className="text-center py-8">
          <p className="text-xs text-slate-400">
            Connect a bank account to enable subscription detection.
          </p>
        </div>
      )}

      {!hasRun && !isDetecting && institutionIds.length > 0 && (
        <div className="text-center py-8">
          <p className="text-xs text-slate-400">
            {institutionIds.length} institution{institutionIds.length > 1 ? 's' : ''} connected.
            Tap Detect to scan for recurring charges.
          </p>
        </div>
      )}

      {isDetecting && (
        <div className="flex items-center justify-center py-8 gap-2">
          <Loader2 className="w-4 h-4 text-fuchsia-400 animate-spin" />
          <span className="text-xs text-slate-400">Scanning transaction history…</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="text-xs text-rose-300">{error}</span>
        </div>
      )}

      {/* Results */}
      {hasRun && !isDetecting && subscriptions.length > 0 && (
        <>
          {/* Monthly burn total */}
          <div className="mb-4 p-3.5 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-fuchsia-400" />
              <span className="text-xs text-slate-300">Estimated monthly recurring</span>
            </div>
            <span className="text-lg font-bold tabular-nums text-white">
              ${monthlyTotal.toLocaleString()}
            </span>
          </div>

          <div className="space-y-2">
            {subscriptions.map((sub, i) => (
              <div
                key={`${sub.merchant}-${i}`}
                className="p-3.5 rounded-xl glass-card border border-white/10 hover:border-white/20 transition"
                style={{ minHeight: '44px' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        backgroundColor: `${
                          CATEGORY_COLOR[sub.category_name] || CATEGORY_COLOR.Other
                        }20`,
                      }}
                    >
                      <Repeat
                        className="w-3.5 h-3.5"
                        style={{
                          color: CATEGORY_COLOR[sub.category_name] || CATEGORY_COLOR.Other,
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{sub.merchant}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span
                          className="px-1.5 py-0.2 rounded text-[10px] font-medium"
                          style={{
                            backgroundColor: `${
                              CATEGORY_COLOR[sub.category_name] || CATEGORY_COLOR.Other
                            }20`,
                            color: CATEGORY_COLOR[sub.category_name] || CATEGORY_COLOR.Other,
                          }}
                        >
                          {sub.category_name}
                        </span>
                        <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                          <CalendarClock className="w-2.5 h-2.5" />
                          {sub.billing_cycle}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {Math.round(sub.confidence * 100)}% confidence
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-white shrink-0">
                    ${Math.abs(sub.amount).toFixed(2)}
                    <span className="text-[10px] text-slate-400 font-normal">
                      {CYCLE_LABEL[sub.billing_cycle] || '/mo'}
                    </span>
                  </span>
                </div>

                {/* Cancellation tip */}
                {sub.cancellation_tip && (
                  <p className="mt-2 text-[11px] text-slate-400 pl-11">{sub.cancellation_tip}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {hasRun && !isDetecting && subscriptions.length === 0 && !error && (
        <div className="text-center py-8">
          <p className="text-xs text-slate-400">No recurring subscriptions detected.</p>
        </div>
      )}
    </div>
  );
}