import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/lib/ai/gemini';
import { fetchSandboxTransactions } from '@/lib/bank/sandbox';
import { SandboxTransaction } from '@/lib/bank/sandbox';

/**
 * Recurring Subscriptions Detector — Phase 2.
 *
 * Sends the recent transaction stream to Gemini and asks it to identify
 * recurring monthly charges (subscriptions, memberships, bills) and suggest
 * cancellations. Returns structured JSON so the UI can render clean cards.
 */

interface DetectedSubscription {
  merchant: string;
  amount: number;
  category_name: string;
  billing_cycle: 'monthly' | 'annual' | 'weekly';
  confidence: number;
  cancellation_tip: string;
}

const SUBSCRIPTION_DETECTOR_PROMPT = `
You are Lumina's recurring-charge detector.
Given a list of recent bank transactions, identify recurring subscriptions and memberships — services that charge the same or near-same amount on a regular cycle.

Rules:
1. Only flag charges that are clearly recurring (same merchant + similar amount across the window).
2. Estimate the billing cycle: monthly, annual, or weekly.
3. confidence is 0.00–1.00 based on how clear the recurrence is.
4. cancellation_tip: one short, actionable sentence on how the user could cancel or save on it (e.g. "Cancel in Account → Membership settings" or "Switch to the ad-supported tier to save $6/mo").
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Accept either a list of institutions or raw transactions.
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
        message: 'No transactions provided for analysis.',
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Transactions:
${JSON.stringify(transactions, null, 2)}

${SUBSCRIPTION_DETECTOR_PROMPT}`,
      config: {
        systemInstruction: 'You are a precise financial analysis engine. Return only valid JSON.',
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '[]';
    let subscriptions: DetectedSubscription[];
    try {
      subscriptions = JSON.parse(text) as DetectedSubscription[];
    } catch {
      subscriptions = [];
    }

    // Compute the monthly total so the UI can show it without re-summing.
    const monthlyTotal = subscriptions
      .filter((s) => s.billing_cycle === 'monthly')
      .reduce((sum, s) => sum + Math.abs(s.amount), 0);

    return NextResponse.json({
      success: true,
      subscriptions,
      monthly_total: Math.round(monthlyTotal * 100) / 100,
      analyzed_count: transactions.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to detect subscriptions';
    console.error('Subscriptions detector error:', error);
    return NextResponse.json(
      { success: false, error: message, subscriptions: [], monthly_total: 0 },
      { status: 500 }
    );
  }
}