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

  const { name, merchant_contains, category_name, action } = await req
    .json()
    .catch(() => null);
  if (!name || !merchant_contains || !action) {
    return NextResponse.json(
      { success: false, error: "name, merchant_contains, action required" },
      { status: 400 },
    );
  }

  const { data: rule, error } = await supabase
    .from("spending_rules")
    .insert({
      user_id: user.id,
      name,
      trigger_condition: { merchant_contains },
      action:
        action === "set_category"
          ? { type: "set_category", value: category_name }
          : { type: "ignore_transaction" },
      is_active: true,
    })
    .select()
    .single();
  if (error)
    return NextResponse.json(
      { success: false, error: "Could not save rule" },
      { status: 500 },
    );
  return NextResponse.json({ success: true, rule });
}
