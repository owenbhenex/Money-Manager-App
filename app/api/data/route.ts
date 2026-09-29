import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  const [profile, accounts, categories, transactions, rules] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_archived", false)
        .order("created_at"),
      supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id)
        .order("name"),
      supabase
        .from("transactions")
        .select("*, category:categories(*), account:accounts(*)")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(500),
      supabase
        .from("spending_rules")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true),
    ]);

  return NextResponse.json({
    success: true,
    user: { id: user.id, email: user.email },
    profile: profile.data,
    accounts: accounts.data,
    categories: categories.data,
    transactions: transactions.data,
    rules: rules.data,
  });
}
