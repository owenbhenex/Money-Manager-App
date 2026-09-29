import { ExtractedTransaction } from "@/types/database.types";

/**
 * Deterministic natural-language expense parser (zero dependencies).
 * Used when Gemini is unavailable (quota/outage) so Quick Capture keeps working.
 *
 * Handles the common shapes people actually type:
 *   "Dinner with Alex at Chipotle for $24.50"
 *   "Uber ride $16.20"
 *   "latte $6.25 at Starbucks"
 *   "yesterday groceries at Whole Foods 87.40"
 */

// keyword -> category map. First hit wins, checked against the whole input.
const CATEGORY_KEYWORDS: [RegExp, string][] = [
  [
    /uber|lyft|taxi|gas|shell|chevron|exxon|parking|metro|train|bus\b/i,
    "Transportation",
  ],
  [
    /grocer|whole ?foods|trader joe|supermarket|market|aldi|costco/i,
    "Groceries",
  ],
  [
    /rent|electric|water bill|internet|utility|utilities|comcast|verizon|wifi/i,
    "Housing & Utilities",
  ],
  [
    /netflix|spotify|hulu|cinema|movie|theater|concert|game\b|xbox|playstation/i,
    "Entertainment",
  ],
  [
    /pharmacy|doctor|dentist|clinic|hospital|medicine|cvs|walgreens|medicine/i,
    "Healthcare",
  ],
  [
    /coffee|latte|starbucks|cafe|restaurant|dinner|lunch|breakfast|pizza|chipotle|mcdonald|kfc|burger|sushi|takeout|snack/i,
    "Food & Dining",
  ],
  [/gym|spa|salon|barber|haircut|cosmetic|skincare/i, "Personal Care"],
  [/salary|paycheck|invoice|freelance|refund|bonus/i, "Income"],
];

function pickCategory(input: string, available: string[]): string {
  for (const [re, cat] of CATEGORY_KEYWORDS) {
    if (re.test(input) && available.includes(cat)) return cat;
  }
  // Fuzzy: partial category-name match
  const lower = input.toLowerCase();
  for (const cat of available) {
    const head = cat.split(" ")[0].toLowerCase();
    if (head.length > 3 && lower.includes(head)) return cat;
  }
  return available.includes("Other") ? "Other" : (available[0] ?? "Other");
}

function extractAmount(input: string): number | null {
  // "$24.50", "24.50 dollars", "24.50", "1,250"
  // Ordered by specificity: currency-symbol, then comma-grouped, then plain.
  // Each alternative is anchored so "1200" is never truncated to "120".
  const patterns = [
    /\$\s*(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/,
    /\b(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?)\b/,
    /\b(\d+(?:\.\d{1,2})?)\s*(?:dollars?|bucks?|usd)\b/i,
    /\b(\d+(?:\.\d{1,2})?)\b/,
  ];
  for (const re of patterns) {
    const m = input.match(re);
    if (m) {
      const num = Number(m[1].replace(/,/g, ""));
      if (Number.isFinite(num) && num > 0) return Math.round(num * 100) / 100;
    }
  }
  return null;
}

function extractMerchant(input: string): string | null {
  // "at <Merchant>" — text between "at" and the next delimiter (amount/for/end)
  const atMatch = input.match(
    /\bat\s+([A-Za-z0-9'&.\- ]+?)(?=\s+(?:for\s+|\$|\d)|$)/i,
  );
  if (atMatch) {
    const name = atMatch[1].trim().replace(/\s+/g, " ");
    if (name.length >= 2 && !/^\d/.test(name)) return name;
  }
  // "<Merchant> for $X" — leading words before "for" or the amount
  const leadMatch = input.match(
    /^([A-Za-z][A-Za-z0-9'&.\- ]*?)(?=\s+(?:for\s+|\$)|\s+\d)/,
  );
  if (leadMatch) {
    const name = leadMatch[1].trim();
    if (name.length >= 2 && !/\b(with|ride|bought|paid|spent)\b/i.test(name))
      return name;
  }
  // Bare capitalized words: "Uber ride $16.20"
  const caps = input.match(/\b[A-Z][a-zA-Z'&.]+(?:\s+[A-Z][a-zA-Z'&.]+)*\b/);
  if (caps) return caps[0];
  return null;
}

function extractDate(input: string): string {
  const iso = (d: Date) => d.toISOString().split("T")[0];
  const today = new Date();
  if (/\byesterday\b/i.test(input)) {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    return iso(y);
  }
  if (/\btomorrow\b/i.test(input)) {
    const t = new Date(today);
    t.setDate(t.getDate() + 1);
    return iso(t);
  }
  // ISO date typed directly
  const direct = input.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (direct) return direct[1];
  return iso(today);
}

export function parseTransactionText(
  input: string,
  availableCategories: string[],
): ExtractedTransaction {
  const today = new Date().toISOString().split("T")[0];
  const amount = extractAmount(input);
  const merchant = extractMerchant(input);

  // Confidence: high when both core fields parse, medium otherwise.
  let confidence = 0.5;
  if (amount !== null && merchant) confidence = 0.7;
  else if (amount !== null) confidence = 0.55;

  const cleaned = input.trim().replace(/\s+/g, " ");
  const merchantOut =
    merchant ?? (cleaned.split(/\s+|\$|\d/)[0] || "Unknown Merchant");

  return {
    amount: amount ?? 0,
    merchant: merchantOut,
    category_name: pickCategory(input, availableCategories),
    date: extractDate(input) || today,
    confidence,
    notes: cleaned,
  };
}
