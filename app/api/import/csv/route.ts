import { NextRequest, NextResponse } from 'next/server';
import { parseBankCsv } from '@/lib/parse/csv';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }
    if (file.size > 5_000_000) {
      return NextResponse.json({ success: false, error: 'File too large (max 5MB)' }, { status: 400 });
    }
    const text = await file.text();
    const { rows, skipped } = parseBankCsv(text);
    return NextResponse.json({ success: true, rows, skipped, total: rows.length });
  } catch (err) {
    console.error('CSV import failed:', err);
    return NextResponse.json({ success: false, error: 'Could not parse CSV file' }, { status: 400 });
  }
}
