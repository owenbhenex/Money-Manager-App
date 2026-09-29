import { NextRequest, NextResponse } from "next/server";
import { ai, mapAiError } from "@/lib/ai/gemini";
import { detectSubscriptions } from "@/lib/parse/subscriptions";
import {
  fetchSandboxTransactions,
  SandboxTransaction,
} from "@/lib/bank/sandbox";
import { parseJsonBody, badRequest } from "@/lib/api/body";

/**
 * Recurring Subscriptions Detector — Phase 2.
 *
 * Primary path is a deterministic group-by-merchant detector (always works).
 * When Gemini is reachable it adds merchant labeling + cancellation tips, but
 * detection itself never depends on the model being available.
 */

interface DetectedSubscription {
  merchant: string;
  amount: number;
  category_name: string;
  billing_cycle: "monthly" | "annual" | "weekly";
  confidence: number;
  cancellation_tip: string;
}

interface DetectBody {
  transactions?: SandboxTransaction[];
  institution_ids?: string[];
}

const SUBSCRIPTION_DETECTOR_PROMPT = `
You are Lumina's recurring-charge detector.
Given a list of recent bank transactions, identify recurring subscriptions and memberships — services that charge the same or near-same amount on a regular cycle.

Rules:
1. Only flag charges that are clearly recurring (same merchant + similar amount across the window).
2. Estimate the billing cycle: monthly, annual, or weekly.
3. confidence is 0.00–1.00 based on how clear the recurrence is.
4. cancellation_tip: one short, actionable sentence on how the user could cancel or save on it.
5. Do NOT include one-time purchases, groceries, or gas.
6. Return ONLY a JSON array of objects.

JSON shape:
[
  {
    "merchant": string,
    "amount": number,
    "category_name": string,
    "billing_cycle": "monthly" | "annual" | "weekly",
    "confidence": number,
    "cancellation_tip": string
  }
]
`;

// Heuristic category guess for a detected subscription (no AI needed).
function guessCategory(merchant: string): string {
  const m = merchant.toLowerCase();
  if (/spotify|netflix|hulu|disney|youtube|prime|icloud|apple/i.test(m))
    return "Entertainment";
  if (/verizon|at&t|tmobile|comcast|xfinity|internet/i.test(m))
    return "Housing & Utilities";
  if (/gym|fitness|classpass|peloton/i.test(m)) return "Healthcare";
  if (/audible|kindle|news|times|magazine/i.test(m)) return "Entertainment";
  return "Other";
}

export async function POST(req: NextRequest) {
  try {
    const body = await parseJsonBody<DetectBody>(req);
    if (body === null) {
      return badRequest("Invalid JSON body");
    }
    let transactions: SandboxTransaction[] = body.transactions ?? [];
    if (body.institution_ids && Array.isArray(body.institution_ids)) {
      for (const id of body.institution_ids) {
        transactions = transactions.concat(fetchSandboxTransactions(id));
      }
    }

    if (transactions.length === 0) {
      return NextResponse.json({
        success: true,
        subscriptions: [],
        message: "No transactions provided for analysis.",
        source: "local",
      });
    }

    // 1. Deterministic detection — always available.
    const detected = detectSubscriptions(transactions);
    const localList: DetectedSubscription[] = detected.map((s) => ({
      merchant: s.merchant,
      amount: s.amount,
      category_name: guessCategory(s.merchant),
      billing_cycle: s.billing_cycle,
      confidence: s.confidence,
      cancellation_tip: `Appears ${s.occurrences}× — review this recurring ${s.billing_cycle} charge in your account to cancel or downgrade.`,
    }));
    const monthlyTotal = localList
      .filter((s) => s.billing_cycle === "monthly")
      .reduce((sum, s) => sum + Math.abs(s.amount), 0);

    // 2. Optional Gemini enrichment (cancellation tips + better labels).
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Transactions:\n${JSON.stringify(transactions, null, 2)}\n\n${SUBSCRIPTION_DETECTOR_PROMPT}`,
        config: {
          systemInstruction:
            "You are a precise financial analysis engine. Return only valid JSON.",
          responseMimeType: "application/json",
        },
      });

      let geminiList: DetectedSubscription[] = [];
      try {
        geminiList = JSON.parse(
          response.text || "[]",
        ) as DetectedSubscription[];
      } catch {
        geminiList = [];
      }
      if (Array.isArray(geminiList) && geminiList.length > 0) {
        // Merge: prefer Gemini labels/tips, keep local detections it missed.
        const byMerchant = new Map<string, DetectedSubscription>();
        for (const s of localList) byMerchant.set(s.merchant.toLowerCase(), s);
        const merged = geminiList.map((g) => {
          const base = byMerchant.get(g.merchant?.toLowerCase() ?? "");
          if (base) byMerchant.delete(g.merchant.toLowerCase());
          return { ...(base ?? {}), ...g } as DetectedSubscription;
        });
        for (const leftover of byMerchant.values()) merged.push(leftover);
        const geminiMonthly = merged
          .filter((s) => s.billing_cycle === "monthly")
          .reduce((sum, s) => sum + Math.abs(s.amount), 0);
        return NextResponse.json({
          success: true,
          subscriptions: merged,
          monthly_total: Math.round(geminiMonthly * 100) / 100,
          analyzed_count: transactions.length,
          source: "gemini",
        });
      }
      throw new Error("Gemini returned no usable subscriptions");
    } catch (error) {
      console.error(
        "[subscriptions] Gemini unavailable, using local detector:",
        error,
      );
      return NextResponse.json({
        success: true,
        subscriptions: localList,
        monthly_total: Math.round(monthlyTotal * 100) / 100,
        analyzed_count: transactions.length,
        source: "local",
        notice: "Detected on-device (AI service unavailable).",
      });
    }
  } catch (error) {
    const mapped = mapAiError(error);
    console.error("Subscriptions detector error:", error);
    return NextResponse.json(
      {
        success: false,
        error: mapped.message,
        subscriptions: [],
        monthly_total: 0,
      },
      { status: mapped.status },
    );
  }
}
