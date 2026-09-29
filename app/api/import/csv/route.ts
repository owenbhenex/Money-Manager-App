import { NextRequest, NextResponse } from "next/server";
import { parseBankCsv } from "@/lib/parse/csv";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 },
      );
    }
    if (file.size > 5_000_000) {
      return NextResponse.json(
        { success: false, error: "File too large (max 5MB)" },
        { status: 400 },
      );
    }
    const text = await file.text();
    const { rows, skipped } = parseBankCsv(text);

    // Persist when the user is signed in (rows stay client-side only otherwise)
    let saved = 0;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user && rows.length > 0) {
      const { data: inserted, error } = await supabase
        .from("transactions")
        .insert(
          rows.map((r) => ({
            user_id: user.id,
            merchant: r.merchant,
            amount: r.amount,
            currency: "USD",
            date: r.date,
            notes: r.notes ?? `Imported from ${file.name}`,
            capture_method: "csv_import",
            status: "confirmed",
          })),
        )
        .select();
      if (error) {
        console.error("CSV persist failed:", error.message);
        return NextResponse.json(
          { success: false, error: "Parsed OK but could not save" },
          { status: 500 },
        );
      }
      saved = inserted?.length ?? 0;
    }

    return NextResponse.json({
      success: true,
      rows,
      skipped,
      saved,
      total: rows.length,
    });
  } catch (err) {
    console.error("CSV import failed:", err);
    return NextResponse.json(
      { success: false, error: "Could not parse CSV file" },
      { status: 400 },
    );
  }
}
