'use client';

import { useState, useRef } from 'react';
import { X, FileText, Upload, Loader2, CheckCircle2 } from 'lucide-react';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (rows: { date: string; merchant: string; amount: number; notes?: string }[]) => void;
}

export function CsvImportModal({ isOpen, onClose, onImport }: CsvImportModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ count: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  async function handleFile(file: File) {
    setIsProcessing(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/import/csv', { method: 'POST', body: fd });
      const json = await res.json();
      if (json.success) {
        setResult({ count: json.rows.length, skipped: json.skipped });
        onImport(json.rows);
      } else {
        setError(json.error || 'Import failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" role="dialog" aria-label="Import bank CSV">
      <div className="w-full max-w-md glass-modal rounded-3xl p-6 border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold text-white">Import Bank CSV</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] text-slate-400 mb-4">
          Upload a bank or card statement export. Supported: date, merchant, amount columns (Chase, Wells Fargo, and most banks).
        </p>

        <label
          className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/15 rounded-xl p-8 cursor-pointer hover:border-blue-500/40 hover:bg-blue-500/5 transition"
          onDragOver={(e) => e.preventDefault()}
        >
          {isProcessing ? (
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          ) : (
            <Upload className="w-6 h-6 text-slate-400" />
          )}
          <span className="text-xs text-slate-300">
            {isProcessing ? 'Parsing…' : 'Drop file here or click to browse'}
          </span>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            disabled={isProcessing}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </label>

        {error && (
          <div role="alert" className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <p className="text-xs text-emerald-300">
              Imported {result.count} transactions{result.skipped > 0 ? `, ${result.skipped} rows skipped` : ''}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
