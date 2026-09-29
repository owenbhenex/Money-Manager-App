// Bank-export CSV parser. Pure function, no I/O.
// Handles the two most common bank-export dialects:
//   date,description,amount        (Chase/Wells style)
//   date,merchant,debit,credit     (double-column style)
// plus a few named-header variants. Deliberately forgiving on date formats.

export interface CsvTransaction {
  date: string;      // YYYY-MM-DD
  merchant: string;
  amount: number;    // negative = expense (normalized)
  notes?: string;
}

const DATE_FORMATS = [
  /^(\d{4})-(\d{2})-(\d{2})$/,                  // 2026-09-28
  /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,            // 9/28/2026 (US)
];

function normalizeDate(raw: string): string | null {
  const s = raw.trim().replace(/"/g, '');
  let m = DATE_FORMATS[0].exec(s);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = DATE_FORMATS[1].exec(s);
  if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  return null;
}

const AMOUNT = /^-?\$?[\d,]+\.?\d*$/;

function parseAmount(raw: string): number | null {
  const s = raw.trim().replace(/[$,]/g, '').replace(/"/g, '');
  if (!s || isNaN(Number(s))) return null;
  return Number(s);
}

function splitCsvLine(line: string): string[] {
  // Handles quoted fields with embedded commas
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      out.push(cur); cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out.map((f) => f.trim());
}

export function parseBankCsv(text: string, maxRows = 5000): { rows: CsvTransaction[]; skipped: number } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { rows: [], skipped: 0 };

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const hasHeader = header.some((h) => ['date', 'description', 'merchant', 'amount', 'debit', 'credit', 'posted'].some((k) => h.includes(k)));
  const dataLines = hasHeader ? lines.slice(1) : lines;

  // Column indexes by header name
  const idx = (names: string[]) => header.findIndex((h) => names.some((n) => h.includes(n)));

  // Column indexes: header-named when present, else positional (date, merchant, amount)
  const dateI = hasHeader ? idx(['date', 'posted']) : 0;
  const descI = hasHeader ? Math.max(idx(['description', 'merchant', 'name', 'payee']), dateI + 1) : 1;
  const amountI = hasHeader ? idx(['amount']) : 2;
  const debitI = hasHeader ? idx(['debit', 'withdrawal']) : -1;
  const creditI = hasHeader ? idx(['credit', 'deposit']) : -1;
  const notesI = hasHeader ? idx(['notes', 'memo', 'category']) : -1;

  const rows: CsvTransaction[] = [];
  let skipped = 0;
  for (const line of dataLines) {
    const f = splitCsvLine(line);
    const date = normalizeDate(f[dateI] ?? '');
    let amount: number | null = null;
    if (debitI >= 0 || creditI >= 0) {
      const debit = debitI >= 0 ? parseAmount(f[debitI] ?? '') : null;
      const credit = creditI >= 0 ? parseAmount(f[creditI] ?? '') : null;
      if (debit) amount = -Math.abs(debit);
      else if (credit) amount = Math.abs(credit);
    }
    if (amount === null && amountI >= 0) {
      const raw = parseAmount(f[amountI] ?? '');
      if (raw !== null) amount = raw; // keep sign as-is
    }
    const merchant = (f[descI] ?? '').replace(/"/g, '').trim();
    if (!date || amount === null || amount === 0 || !merchant) { skipped++; continue; }
    rows.push({ date, merchant, amount, notes: notesI >= 0 ? f[notesI] : undefined });
    if (rows.length >= maxRows) break;
  }
  return { rows, skipped };
}
