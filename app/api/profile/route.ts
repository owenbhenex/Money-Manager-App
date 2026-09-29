import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );

  const updates = await req.json().catch(() => null);
  if (!updates || typeof updates !== "object") {
    return NextResponse.json(
      { success: false, error: "Invalid body" },
      { status: 400 },
    );
  }

  // Only allow safe fields
  const allowed: Record<string, any> = {};
  for (const k of [
    "currency",
    "timezone",
    "monthly_income",
    "monthly_savings_target",
    "onboarding_completed",
  ]) {
    if (k in updates) allowed[k] = updates[k];
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(allowed)
    .eq("id", user.id)
    .select()
    .single();
  if (error)
    return NextResponse.json(
      { success: false, error: "Update failed" },
      { status: 500 },
    );
  return NextResponse.json({ success: true, profile: data });
}
