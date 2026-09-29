import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  evaluateTransaction,
  type Rule,
  type RuleInput,
} from "@/lib/rules/engine";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );

  const body = await req.json().catch(() => null);
  if (!body?.merchant || typeof body?.amount !== "number" || !body?.date) {
    return NextResponse.json(
      { success: false, error: "merchant, amount, date required" },
      { status: 400 },
    );
  }

  // Resolve category by name (AI returns names, DB wants ids)
  let categoryId: string | null = null;
  if (body.category_name) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("user_id", user.id)
      .eq("name", body.category_name)
      .maybeSingle();
    categoryId = cat?.id ?? null;
  }

  // Apply the user's spending rules
  const { data: dbRules } = await supabase
    .from("spending_rules")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true);
  const rules: Rule[] = (dbRules ?? []).map((r) => ({ ...r }));
  const ruleResult = evaluateTransaction(
    {
      id: "new",
      merchant: body.merchant,
      amount: body.amount,
      category_name: body.category_name,
      capture_method: body.capture_method,
    },
    rules,
  );
  if (ruleResult?.category) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("user_id", user.id)
      .eq("name", ruleResult.category)
      .maybeSingle();
    if (cat) categoryId = cat.id;
  }
  const status = ruleResult?.status === "ignored" ? "ignored" : "confirmed";

  const { data: inserted, error } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      account_id: body.account_id ?? null,
      category_id: categoryId,
      amount: body.amount,
      currency: body.currency ?? "USD",
      date: body.date,
      merchant: body.merchant,
      notes: body.notes ?? null,
      capture_method: body.capture_method ?? "manual",
      ai_confidence: body.ai_confidence ?? null,
      status,
    })
    .select("*, category:categories(*), account:accounts(*)")
    .single();

  if (error) {
    console.error("Transaction insert failed:", error);
    return NextResponse.json(
      { success: false, error: "Could not save transaction" },
      { status: 500 },
    );
  }
  return NextResponse.json({
    success: true,
    transaction: inserted,
    appliedRule: ruleResult?.ruleName ?? null,
  });
}

// DELETE /api/transactions?id= — undo
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );

  const id = new URL(req.url).searchParams.get("id");
  if (!id)
    return NextResponse.json(
      { success: false, error: "id required" },
      { status: 400 },
    );

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error)
    return NextResponse.json(
      { success: false, error: "Delete failed" },
      { status: 500 },
    );
  return NextResponse.json({ success: true });
}
