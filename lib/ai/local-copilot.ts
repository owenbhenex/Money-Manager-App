/**
 * Rule-based Copilot reply generator (no AI).
 * Handles the questions people actually ask, using the financial context
 * the client already sends. Deterministic, instant, works offline.
 */

export interface CopilotContext {
  totalBalance?: number;
  monthlySpent?: number;
  monthlyIncome?: number;
  savingsTarget?: number;
  currency?: string;
  topCategories?: { name: string; total: number }[];
  recentTransactions?: {
    merchant: string;
    amount: number;
    date?: string;
    category_name?: string;
  }[];
}

export interface LocalReply {
  text: string;
  rule?: {
    name: string;
    merchant_contains: string;
    category_name: string;
    action: "set_category" | "ignore_transaction";
  };
}

const money = (n: number, cur = "USD") => {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "\u20ac",
    GBP: "\u00a3",
    JPY: "\u00a5",
    IDR: "Rp",
  };
  return `${symbols[cur] ?? "$"}${Math.round(n).toLocaleString("en-US")}`;
};

export function generateLocalCopilotReply(
  question: string,
  ctx: CopilotContext = {},
): LocalReply {
  const q = question.toLowerCase().trim();
  const cur = ctx.currency ?? "USD";

  // ---- Rule creation intent ----
  // "categorize (all) X as Y" / "put X in Y" / "always categorize X as Y"
  const rulePatterns = [
    /(?:categorize|categorise|put|classify|label)\s+(?:all\s+)?(.+?)\s+(?:as|in|under)\s+(.+?)(?:\s+(?:from|starting|plz|please|category))?$/i,
    /^(?:always\s+)?make\s+(.+?)\s+(?:be\s+)?(.+?)$/i,
    /(?:set|make)\s+(.+?)\s+(?:category|to)\s+(.+?)$/i,
  ];
  for (const re of rulePatterns) {
    const m = question.match(re);
    if (m) {
      const merchant = m[1]
        .trim()
        .replace(/^(all|every)\s+/i, "")
        .replace(/\s+purchases?\s*$/i, "")
        .trim();
      const category = m[2].trim();
      if (merchant && category && merchant.length < 40) {
        return {
          text: `Done — I set up a rule so every transaction containing "${merchant}" is automatically categorized as ${category}. You can review or remove it in Rules.`,
          rule: {
            name: `${merchant} → ${category}`,
            merchant_contains: merchant,
            category_name: category,
            action: "set_category",
          },
        };
      }
    }
  }

  // ---- How much did I spend ----
  if (
    /(how much|total|sum).*(spend|spent)|spending (this month|total)/i.test(q)
  ) {
    if (typeof ctx.monthlySpent === "number") {
      return {
        text: `You've spent ${money(ctx.monthlySpent, cur)} so far this month.`,
      };
    }
  }

  // ---- Top categories ----
  if (
    /(top|biggest|largest|most|where).*(categor|spend)|breakdown|where.*money/i.test(
      q,
    )
  ) {
    if (ctx.topCategories?.length) {
      const lines = ctx.topCategories
        .slice(0, 5)
        .map((c, i) => `${i + 1}. ${c.name} — ${money(c.total, cur)}`);
      return { text: `Here's where your money went:\n${lines.join("\n")}` };
    }
  }

  // ---- Balance ----
  if (
    /(how much|what).*(do i have|left|balance|remain)|current balance|safe.?to.?spend/i.test(
      q,
    )
  ) {
    if (typeof ctx.totalBalance === "number") {
      const target = ctx.savingsTarget ?? 0;
      const spent = ctx.monthlySpent ?? 0;
      const safe = Math.max(0, ctx.totalBalance - target - spent);
      return {
        text: `Your liquid balance is ${money(ctx.totalBalance, cur)}. After this month's spending of ${money(spent, cur)} and your ${money(target, cur)} savings target, you have about ${money(safe, cur)} safe to spend.`,
      };
    }
  }

  // ---- Savings / am I on track ----
  if (/(saving|save|on track|budget|afford)/i.test(q)) {
    const income = ctx.monthlyIncome ?? 0;
    const target = ctx.savingsTarget ?? 0;
    const spent = ctx.monthlySpent ?? 0;
    if (income > 0) {
      const remaining = income - spent;
      const verdict =
        spent <= income - target
          ? "You're on track for your savings target."
          : "You're pacing above target this month.";
      return {
        text: `You've spent ${money(spent, cur)} of ${money(income, cur)} income — ${money(remaining, cur)} left. ${verdict}`,
      };
    }
  }

  // ---- Recent transactions ----
  if (/(recent|latest|last few|show).*(transaction|purchase|charge)/i.test(q)) {
    if (ctx.recentTransactions?.length) {
      const lines = ctx.recentTransactions
        .slice(0, 5)
        .map((t) => `• ${t.merchant} — ${money(Math.abs(t.amount), cur)}`);
      return {
        text: `Here are your latest transactions:\n${lines.join("\n")}`,
      };
    }
  }

  // ---- Fallback: acknowledge + guide (never a dead end) ----
  return {
    text: 'I\'m running in offline mode right now, so I can answer questions about your balance, spending totals, top categories, and savings progress — plus I can still create categorization rules (try "categorize all Chevron as Transportation"). For deeper conversational analysis, that needs the AI service, which is currently unavailable.',
  };
}
