"use client";

import { useEffect, useState, useCallback } from "react";
import { Transaction } from "@/types/database.types";
import { Rule } from "@/lib/rules/engine";

export interface UserData {
  user: { id: string; email: string | null } | null;
  profile: Record<string, any> | null;
  accounts: any[];
  categories: any[];
  transactions: Transaction[];
  rules: Rule[];
}

/**
 * Load the signed-in user's data.
 * When nobody is signed in (401), returns empty state so the dashboard can
 * fall back to its demo data — same UX as before for anonymous visitors.
 */
export function useFinancialData() {
  const [data, setData] = useState<UserData>({
    user: null,
    profile: null,
    accounts: [],
    categories: [],
    transactions: [],
    rules: [],
  });
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/data");
      if (res.status === 401) {
        setIsAuthenticated(false);
        setData({
          user: null,
          profile: null,
          accounts: [],
          categories: [],
          transactions: [],
          rules: [],
        });
        return;
      }
      const json = await res.json();
      if (json.success) {
        setIsAuthenticated(true);
        setData({
          user: json.user,
          profile: json.profile,
          accounts: json.accounts,
          categories: json.categories,
          transactions: json.transactions,
          rules: json.rules,
        });
      }
    } catch (err) {
      console.error("Failed to load financial data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return {
    data,
    loading,
    isAuthenticated,
    reload: load,
    setTransactions: (t: Transaction[]) =>
      setData((d) => ({ ...d, transactions: t })),
  };
}
