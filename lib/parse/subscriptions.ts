/**
 * Deterministic recurring-charge detector (no AI).
 * Group by normalized merchant; a merchant is "recurring" when it appears
 * >= 2 times with similar amounts (±10%). Pure math, zero dependencies.
 */

export interface RecurringCharge {
  merchant: string;
  amount: number;
  billing_cycle: "monthly" | "annual" | "weekly";
  confidence: number;
  occurrences: number;
}

interface TxLike {
  merchant: string;
  amount: number;
  date?: string;
}

function normalize(merchant: string): string {
  return merchant
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectSubscriptions(
  transactions: TxLike[],
  opts: { minOccurrences?: number; tolerance?: number } = {},
): RecurringCharge[] {
  const minOccurrences = opts.minOccurrences ?? 3;
  const tolerance = opts.tolerance ?? 0.1;

  const groups = new Map<string, TxLike[]>();
  for (const tx of transactions) {
    if (!tx.merchant) continue;
    const key = normalize(tx.merchant);
    groups.set(key, [...(groups.get(key) ?? []), tx]);
  }

  const results: RecurringCharge[] = [];
  for (const [key, txs] of groups) {
    if (txs.length < minOccurrences) continue;
    const amounts = txs.map((t) => Math.abs(t.amount));
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;

    // All occurrences within tolerance of the average?
    const stable = amounts.every((a) => Math.abs(a - avg) <= avg * tolerance);
    if (!stable) continue;

    // Cycle from the gap between DISTINCT charge dates. Duplicate entries
    // (same merchant+date arriving from multiple institutions) must not count
    // as 0-day gaps, so dedupe to unique dates before measuring. Median is
    // robust to one irregular billing month.
    let cycle: "monthly" | "annual" | "weekly" = "monthly";
    let confidence = 0.6 + Math.min(txs.length, 5) * 0.05;
    const dated = txs.filter((t) => t.date);
    if (dated.length >= 2) {
      const uniqueDays = [...new Set(dated.map((t) => t.date!))]
        .map((d) => Math.floor(new Date(d).getTime() / 86_400_000))
        .sort((a, b) => a - b);
      const gaps: number[] = [];
      for (let i = 1; i < uniqueDays.length; i++) {
        const g = uniqueDays[i] - uniqueDays[i - 1];
        // Ignore near-duplicate days: multiple institutions can report the
        // same monthly bill on slightly different days (e.g. the 6th and 8th).
        // Only gaps >= 5 days represent a real billing interval.
        if (g >= 5) gaps.push(g);
      }
      if (gaps.length > 0) {
        const sorted = [...gaps].sort((a, b) => a - b);
        const medianGap =
          sorted.length % 2 === 1
            ? sorted[(sorted.length - 1) / 2]
            : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
        if (medianGap >= 300) {
          cycle = "annual";
          confidence += 0.1;
        } else if (medianGap <= 10) {
          cycle = "weekly";
          confidence += 0.1;
        } else if (medianGap >= 25 && medianGap <= 35) {
          cycle = "monthly";
          confidence += 0.15;
        }
      }
    }

    results.push({
      merchant: txs[0].merchant, // original casing
      amount: Math.round(avg * 100) / 100,
      billing_cycle: cycle,
      confidence: Math.min(confidence, 0.95),
      occurrences: txs.length,
    });
  }

  return results.sort(
    (a, b) =>
      b.amount * (b.billing_cycle === "monthly" ? 1 : 0.1) -
      a.amount * (a.billing_cycle === "monthly" ? 1 : 0.1),
  );
}
