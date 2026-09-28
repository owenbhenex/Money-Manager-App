import { NextRequest, NextResponse } from 'next/server';

/**
 * Safely parse a JSON request body.
 * Malformed JSON previously surfaced as HTTP 500 with the raw V8 parser
 * message leaked to the client (BUG-001). This returns a clean 400 with a
 * generic error instead. Shared by all POST route handlers.
 */
export async function parseJsonBody<T = Record<string, unknown>>(
  req: NextRequest
): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

export function badRequest(message: string) {
  return NextResponse.json({ success: false, error: message }, { status: 400 });
}