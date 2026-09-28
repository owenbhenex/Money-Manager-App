'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  Loader2,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Plug,
} from 'lucide-react';
import { Transaction, Category } from '@/types/database.types';

interface BankConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionsImported: (txs: Transaction[]) => void;
}

interface Institution {
  id: string;
  name: string;
  logo_color: string;
  account_count: number;
}

interface ConnectedAccount {
  name: string;
  type: string;
  balance: number;
  currency: string;
}

interface SandboxTransaction {
  amount: number;
  merchant: string;
  category_name: string;
  date: string;
  currency: string;
}

const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  'Food & Dining': { icon: 'utensils', color: '#F59E0B' },
  Transportation: { icon: 'car', color: '#3B82F6' },
  Groceries: { icon: 'shopping-cart', color: '#10B981' },
  Entertainment: { icon: 'film', color: '#EC4899' },
  Utilities: { icon: 'zap', color: '#F59E0B' },
  Healthcare: { icon: 'heart', color: '#EF4444' },
  Software: { icon: 'cpu', color: '#8B5CF6' },
  Shopping: { icon: 'shopping-bag', color: '#6366F1' },
  Other: { icon: 'tag', color: '#64748B' },
};

export function BankConnectModal({
  isOpen,
  onClose,
  onTransactionsImported,
}: BankConnectModalProps) {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [connection, setConnection] = useState<{
    institution_name: string;
    logo_color: string;
    last_synced_at: string;
  } | null>(null);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [syncedCount, setSyncedCount] = useState(0);

  // Load the sandbox institution list when the modal opens.
  // Using state-derived transition detection instead of refs so the render
  // stays pure and the network call still fires exactly once per open.
  const [lastOpenState, setLastOpenState] = useState(isOpen);
  if (isOpen !== lastOpenState) {
    setLastOpenState(isOpen);
    if (isOpen && institutions.length === 0) {
      setLoadingList(true);
      fetch('/api/bank/connect')
        .then((r) => r.json())
        .then((data) => {
          if (data.success) setInstitutions(data.institutions);
        })
        .catch(console.error)
        .finally(() => setLoadingList(false));
    }
  }

  // Esc to close.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const handleLink = async (institutionId: string) => {
    setLinkingId(institutionId);
    try {
      const res = await fetch('/api/bank/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institution_id: institutionId }),
      });
      const data = await res.json();

      if (data.success) {
        setConnection({
          institution_name: data.connection.institution_name,
          logo_color: data.connection.logo_color,
          last_synced_at: data.connection.last_synced_at,
        });
        setAccounts(data.accounts);
        setSyncedCount(data.transactions.length);

        // Convert sandbox transactions into the app Transaction shape.
        const newTxs: Transaction[] = data.transactions.map(
          (t: SandboxTransaction, idx: number) => {
            const meta = CATEGORY_META[t.category_name] || CATEGORY_META.Other;
            const category: Category = {
              id: `cat-bank-${idx}`,
              user_id: 'user-1',
              name: t.category_name,
              icon: meta.icon,
              color: meta.color,
              monthly_budget: null,
              is_system: true,
              created_at: '',
            };
            return {
              id: `bank-tx-${Date.now()}-${idx}`,
              user_id: 'user-1',
              account_id: `bank-${institutionId}`,
              category_id: null,
              amount: -Math.abs(t.amount),
              currency: t.currency,
              date: t.date,
              merchant: t.merchant,
              notes: 'Synced via sandbox bank connection',
              capture_method: 'bank_sync',
              ai_confidence: 0.9,
              receipt_url: null,
              status: 'confirmed',
              created_at: new Date().toISOString(),
              category,
            };
          }
        );
        onTransactionsImported(newTxs);
      }
    } catch (err) {
      console.error('Bank link failed:', err);
    } finally {
      setLinkingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg glass-modal rounded-3xl border border-white/15 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Plug className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Connect a Bank</h3>
              <p className="text-[11px] text-slate-400">Sandbox mode · no real credentials</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {connection ? (
            /* --- Success / Synced State --- */
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-white">
                    {connection.institution_name} connected
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {syncedCount} transactions synced ·{' '}
                    {new Date(connection.last_synced_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              {/* Imported accounts */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  Imported Accounts
                </p>
                {accounts.map((acct, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-xl glass-card border border-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${connection.logo_color}20` }}
                      >
                        <Building2 className="w-4 h-4" style={{ color: connection.logo_color }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{acct.name}</p>
                        <p className="text-[11px] text-slate-400 capitalize">{acct.type}</p>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-bold tabular-nums ${
                        acct.balance >= 0 ? 'text-slate-100' : 'text-rose-400'
                      }`}
                    >
                      {acct.balance >= 0 ? '' : '-'}${Math.abs(acct.balance).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  setConnection(null);
                  setAccounts([]);
                  setSyncedCount(0);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Link another institution
              </button>
            </div>
          ) : (
            /* --- Institution Picker --- */
            <>
              <p className="text-xs text-slate-400">
                Select an institution to simulate linking. The sandbox provider returns simulated
                transactions — no real banking credentials are used.
              </p>

              {loadingList ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  {institutions.map((inst) => (
                    <button
                      key={inst.id}
                      onClick={() => handleLink(inst.id)}
                      disabled={linkingId !== null}
                      className="w-full flex items-center justify-between p-3.5 rounded-xl glass-card border border-white/10 hover:border-white/20 hover:bg-white/5 transition group disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${inst.logo_color}20` }}
                        >
                          <Building2 className="w-4 h-4" style={{ color: inst.logo_color }} />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-white">{inst.name}</p>
                          <p className="text-[11px] text-slate-400">
                            {inst.account_count} account{inst.account_count > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      {linkingId === inst.id ? (
                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                      ) : (
                        <div className="flex items-center gap-1 text-xs font-medium text-blue-400 group-hover:gap-2 transition-all">
                          Link
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}