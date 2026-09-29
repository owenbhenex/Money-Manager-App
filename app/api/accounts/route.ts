import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  const { accounts } = await req.json().catch(() => null);
  if (!Array.isArray(accounts) || accounts.length === 0) {
    return NextResponse.json(
      { success: false, error: "accounts array required" },
      { status: 400 },
    );
  }

  const rows = accounts
    .filter((a: any) => a.name && typeof a.balance === "number" && a.type)
    .map((a: any) => ({
      user_id: user.id,
      name: String(a.name).slice(0, 100),
      type: a.type,
      balance: a.balance,
      currency: a.currency || "USD",
    }));
  if (rows.length === 0) {
    return NextResponse.json(
      { success: false, error: "No valid accounts" },
      { status: 400 },
    );
  }

  const { data: inserted, error } = await supabase
    .from("accounts")
    .insert(rows)
    .select();
  if (error)
    return NextResponse.json(
      { success: false, error: "Could not save accounts" },
      { status: 500 },
    );
  return NextResponse.json({ success: true, accounts: inserted });
}
