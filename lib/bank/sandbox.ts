/**
 * Sandbox Bank Connector — Phase 2 mock provider.
 *
 * The `bank_connections` table is already pre-wired in the schema (see
 * docs/ARCHITECTURE.md §7). A real provider (Plaid/SimpleFin/Teller) would
 * exchange tokens and poll transactions; this sandbox returns deterministic
 * simulated data so the full connect → sync → ledger flow works end-to-end
 * without credentials or a DB migration.
 */

export interface SandboxInstitution {
  id: string;
  name: string;
  logo_color: string;
  accounts: Array<{
    name: string;
    type: "checking" | "savings" | "credit_card";
    balance: number;
    currency: string;
  }>;
}

export const SANDBOX_INSTITUTIONS: SandboxInstitution[] = [
  {
    id: "chase",
    name: "Chase Bank",
    logo_color: "#117ACA",
    accounts: [
      {
        name: "Total Checking",
        type: "checking",
        balance: 8420.55,
        currency: "USD",
      },
      {
        name: "Savings Plus",
        type: "savings",
        balance: 12400.0,
        currency: "USD",
      },
    ],
  },
  {
    id: "amex",
    name: "American Express",
    logo_color: "#2E77BB",
    accounts: [
      {
        name: "Gold Card",
        type: "credit_card",
        balance: -1842.3,
        currency: "USD",
      },
    ],
  },
  {
    id: "discover",
    name: "Discover",
    logo_color: "#FF6000",
    accounts: [
      {
        name: "It Cash Back",
        type: "credit_card",
        balance: -510.75,
        currency: "USD",
      },
    ],
  },
  {
    id: "wellsfargo",
    name: "Wells Fargo",
    logo_color: "#D71E28",
    accounts: [
      {
        name: "Everyday Checking",
        type: "checking",
        balance: 3210.4,
        currency: "USD",
      },
      { name: "Way2Save", type: "savings", balance: 6800.0, currency: "USD" },
    ],
  },
];

export interface SandboxTransaction {
  amount: number;
  merchant: string;
  category_name: string;
  date: string; // YYYY-MM-DD
  currency: string;
}

// Recurring merchants the sandbox emits so the subscriptions detector has signal.
const RECURRING_CHARGES = [
  { merchant: "Netflix", amount: 15.49, category_name: "Entertainment" },
  {
    merchant: "Spotify Premium",
    amount: 11.99,
    category_name: "Entertainment",
  },
  {
    merchant: "Adobe Creative Cloud",
    amount: 54.99,
    category_name: "Software",
  },
  { merchant: "iCloud Storage", amount: 2.99, category_name: "Software" },
  { merchant: "Planet Fitness", amount: 24.99, category_name: "Healthcare" },
  { merchant: "Verizon Wireless", amount: 85.0, category_name: "Utilities" },
];

const EVERYDAY_CHARGES = [
  { merchant: "Whole Foods Market", amount: 128.4, category_name: "Groceries" },
  { merchant: "Chipotle", amount: 16.85, category_name: "Food & Dining" },
  { merchant: "Uber", amount: 22.5, category_name: "Transportation" },
  { merchant: "Shell", amount: 48.2, category_name: "Transportation" },
  { merchant: "Amazon", amount: 34.99, category_name: "Shopping" },
];

function pickRecurring(institutionId: string): SandboxTransaction[] {
  // Deterministic subset per institution so repeated syncs are stable.
  const seed = institutionId.charCodeAt(0);
  return RECURRING_CHARGES.filter((_, i) => (seed + i) % 2 === 0).flatMap(
    (c) => {
      const day = 5 + ((seed + c.merchant.length) % 22);
      // Bill on the same day for the last 3 months — like a real subscription.
      return ["2026-07", "2026-08", "2026-09"].map((month) => ({
        ...c,
        date: `${month}-${String(day).padStart(2, "0")}`,
        currency: "USD",
      }));
    },
  );
}

function pickEveryday(
  institutionId: string,
  count: number,
): SandboxTransaction[] {
  const seed = institutionId.charCodeAt(0);
  return Array.from({ length: count }, (_, i) => {
    const charge = EVERYDAY_CHARGES[(seed + i) % EVERYDAY_CHARGES.length];
    const day = 1 + ((seed * (i + 3)) % 27);
    return {
      ...charge,
      // Vary the amount slightly so it isn't identical every row.
      amount: Math.round(charge.amount * (0.8 + (i % 5) * 0.1) * 100) / 100,
      date: `2026-09-${String(day).padStart(2, "0")}`,
      currency: "USD",
    };
  });
}

/**
 * Simulate pulling recent transactions for a connected institution.
 * In production this calls the provider's transactions endpoint.
 */
export function fetchSandboxTransactions(
  institutionId: string,
): SandboxTransaction[] {
  const seed = institutionId.charCodeAt(0) % 3;
  return [
    ...pickRecurring(institutionId),
    ...pickEveryday(institutionId, 3 + seed),
  ];
}

export function getInstitution(id: string): SandboxInstitution | undefined {
  return SANDBOX_INSTITUTIONS.find((i) => i.id === id);
}
