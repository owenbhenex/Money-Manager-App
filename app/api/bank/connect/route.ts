import { NextRequest, NextResponse } from "next/server";
import {
  SANDBOX_INSTITUTIONS,
  fetchSandboxTransactions,
  getInstitution,
} from "@/lib/bank/sandbox";
import { parseJsonBody, badRequest } from "@/lib/api/body";

interface ConnectBody {
  institution_id?: unknown;
}

/**
 * GET /api/bank/connect/institutions
 *   Returns the list of sandbox institutions a user can "link".
 *
 * POST /api/bank/connect
 *   body: { institution_id: string }
 *   Simulates linking: returns the institution + its accounts + a batch of
 *   synced transactions. In production this is the Plaid Link token exchange
 *   step; here it's deterministic mock data so the dashboard wiring is real.
 */

export async function GET() {
  return NextResponse.json({
    success: true,
    institutions: SANDBOX_INSTITUTIONS.map(
      ({ id, name, logo_color, accounts }) => ({
        id,
        name,
        logo_color,
        account_count: accounts.length,
      }),
    ),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await parseJsonBody<ConnectBody>(req);
    if (body === null) {
      return badRequest("Invalid JSON body");
    }
    const { institution_id } = body;

    if (!institution_id || typeof institution_id !== "string") {
      return badRequest("institution_id is required");
    }

    const institution = getInstitution(institution_id);
    if (!institution) {
      return NextResponse.json(
        { success: false, error: "Unknown institution" },
        { status: 404 },
      );
    }

    const transactions = fetchSandboxTransactions(institution_id);

    return NextResponse.json({
      success: true,
      connection: {
        provider: "sandbox",
        institution_name: institution.name,
        logo_color: institution.logo_color,
        status: "active",
        last_synced_at: new Date().toISOString(),
      },
      accounts: institution.accounts,
      transactions,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to link institution";
    console.error("Bank connect error:", error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
