"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Mic,
  Camera,
  FileText,
  Check,
  RotateCcw,
  X,
  Loader2,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { ExtractedTransaction } from "@/types/database.types";

interface QuickCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionSaved: (tx: ExtractedTransaction) => void;
  availableCategories?: string[];
}

export function QuickCaptureModal({
  isOpen,
  onClose,
  onTransactionSaved,
  availableCategories = [
    "Food & Dining",
    "Transportation",
    "Groceries",
    "Utilities",
    "Entertainment",
    "Healthcare",
    "Personal Care",
    "Other",
  ],
}: QuickCaptureModalProps) {
  const [mode, setMode] = useState<"text" | "voice" | "receipt">("text");
  const [textInput, setTextInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] =
    useState<ExtractedTransaction | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);

  // Voice Recording state
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Receipt File state
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Keyboard shortcut Cmd/Ctrl + K or Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // 1. Submit Text or File to Gemini Quick Capture API
  const handleSubmit = async (
    overrideFile?: File,
    overrideMode?: "text" | "voice" | "receipt",
  ) => {
    const activeMode = overrideMode || mode;
    const activeFile = overrideFile || receiptFile;

    if (activeMode === "text" && !textInput.trim()) return;

    setIsProcessing(true);
    setExtractionError(null);
    setOfflineNotice(null);
    try {
      const formData = new FormData();
      formData.append("mode", activeMode);
      formData.append("text", textInput);
      formData.append("categories", JSON.stringify(availableCategories));
      if (activeFile) {
        formData.append("file", activeFile);
      }

      const res = await fetch("/api/quick-capture", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (json.success && json.data) {
        setExtractedData(json.data);
        setOfflineNotice(
          json.source === "local"
            ? "AI service unavailable — parsed on this device. Double-check the fields below."
            : null,
        );
      } else {
        // AI returned a graceful fallback shape (Manual Entry Needed) or hard
        // failure. Surface it to the user so input isn't silently lost.
        setExtractionError(
          json.error ||
            "Could not analyze input. Please try again or enter manually.",
        );
      }
    } catch (err) {
      console.error("Extraction failed:", err);
      setExtractionError(
        "Network error. Please check your connection and try again.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Voice Recorder Handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const file = new File([audioBlob], "voice-memo.webm", {
          type: "audio/webm",
        });
        handleSubmit(file, "voice");
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Audio permission denied:", err);
      alert("Microphone access is required for voice capture.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // 3. Receipt File Picker
  const handleReceiptSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      setReceiptPreview(URL.createObjectURL(file));
      handleSubmit(file, "receipt");
    }
  };

  // 4. Confirm Transaction
  const handleConfirm = () => {
    if (extractedData) {
      onTransactionSaved(extractedData);
      resetAndClose();
    }
  };

  const resetAndClose = () => {
    setTextInput("");
    setExtractedData(null);
    setExtractionError(null);
    setOfflineNotice(null);
    setReceiptFile(null);
    setReceiptPreview(null);
    setIsRecording(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md transition-opacity">
      <div className="relative w-full max-w-lg glass-modal rounded-2xl overflow-hidden border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                AI Quick Capture
              </h2>
              <p className="text-xs text-slate-400">
                Gemini 2.5 Multimodal Parser
              </p>
            </div>
          </div>
          <button
            onClick={resetAndClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6">
          {!extractedData ? (
            <>
              {/* Modality Tabs */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-900/60 rounded-xl border border-white/5 mb-5">
                <button
                  type="button"
                  onClick={() => setMode("text")}
                  className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition ${
                    mode === "text"
                      ? "bg-blue-600 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Text
                </button>
                <button
                  type="button"
                  onClick={() => setMode("voice")}
                  className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition ${
                    mode === "voice"
                      ? "bg-blue-600 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  Voice
                </button>
                <button
                  type="button"
                  onClick={() => setMode("receipt")}
                  className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition ${
                    mode === "receipt"
                      ? "bg-blue-600 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  Receipt OCR
                </button>
              </div>

              {/* Mode 1: Natural Language Text */}
              {mode === "text" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Type naturally (Merchant, Amount, Category)
                    </label>
                    <textarea
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmit();
                        }
                      }}
                      placeholder='e.g., "Dinner with Alex at Chipotle for $24.50" or "Uber ride $16.20"'
                      rows={3}
                      autoFocus
                      className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={isProcessing || !textInput.trim()}
                    onClick={() => handleSubmit()}
                    className="w-full h-11 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-sm rounded-xl flex items-center justify-center gap-2 transition"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        AI Parsing...
                      </>
                    ) : (
                      <>
                        Parse with Gemini
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {extractionError && (
                    <div
                      role="alert"
                      className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30"
                    >
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-red-300">
                            AI analysis unavailable
                          </p>
                          <p className="text-[11px] text-red-200/80 mt-0.5">
                            {extractionError}
                          </p>
                          <button
                            type="button"
                            onClick={() => setExtractionError(null)}
                            className="mt-2 text-[11px] font-semibold text-red-300 hover:text-red-200 underline underline-offset-2"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mode 2: Voice Memo */}
              {mode === "voice" && (
                <div className="text-center py-6 space-y-4">
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                        isRecording
                          ? "bg-red-500 text-white shadow-lg shadow-red-500/40 animate-pulse scale-110"
                          : "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600/30"
                      }`}
                      aria-label={
                        isRecording ? "Stop Recording" : "Start Recording"
                      }
                    >
                      <Mic className="w-8 h-8" />
                    </button>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {isRecording
                        ? "Listening... Tap to Stop"
                        : "Tap to Record Voice Memo"}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                      Speak your expense naturally, e.g. &quot;Spent forty-two
                      dollars at Trader Joe&apos;s for weekly groceries.&quot;
                    </p>
                  </div>
                  {isProcessing && (
                    <div className="flex items-center justify-center gap-2 text-xs text-indigo-400 pt-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Transcribing and analyzing with Gemini...
                    </div>
                  )}
                </div>
              )}

              {/* Mode 3: Receipt OCR */}
              {mode === "receipt" && (
                <div className="space-y-4">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleReceiptSelect}
                    accept="image/*"
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-white/10 hover:border-blue-500/40 bg-slate-950/40 rounded-xl p-8 text-center cursor-pointer transition group"
                  >
                    {receiptPreview ? (
                      <div className="relative max-h-48 overflow-hidden rounded-lg">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={receiptPreview}
                          alt="Receipt Preview"
                          className="w-full object-cover max-h-48 rounded-lg"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition">
                          <Camera className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-medium text-white">
                          Click to Snap or Upload Receipt
                        </p>
                        <p className="text-xs text-slate-400">
                          Supports JPG, PNG, WebP up to 10MB
                        </p>
                      </div>
                    )}
                  </div>
                  {isProcessing && (
                    <div className="flex items-center justify-center gap-2 text-xs text-blue-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Extracting merchant, totals, and line items...
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Review & 1-Tap Confirmation Card */
            <div className="space-y-5 animate-in fade-in duration-200">
              {offlineNotice && (
                <div
                  role="status"
                  className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-200/90">
                    {offlineNotice}
                  </p>
                </div>
              )}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                      Extracted Amount
                    </span>
                    <div className="text-3xl font-bold tabular-nums text-white mt-0.5">
                      ${Number(extractedData.amount).toFixed(2)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                    <Sparkles className="w-3 h-3" />
                    <span>
                      {Math.round((extractedData.confidence || 0.95) * 100)}%
                      match
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">
                      Merchant
                    </span>
                    <input
                      type="text"
                      value={extractedData.merchant}
                      onChange={(e) =>
                        setExtractedData({
                          ...extractedData,
                          merchant: e.target.value,
                        })
                      }
                      className="w-full bg-slate-900/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-white font-medium"
                    />
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Date</span>
                    <input
                      type="date"
                      value={extractedData.date}
                      onChange={(e) =>
                        setExtractedData({
                          ...extractedData,
                          date: e.target.value,
                        })
                      }
                      className="w-full bg-slate-900/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-white font-medium"
                    />
                  </div>
                </div>

                {/* Category Pill Selection */}
                <div>
                  <span className="text-slate-400 text-xs block mb-1.5">
                    Category
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {availableCategories.slice(0, 6).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() =>
                          setExtractedData({
                            ...extractedData,
                            category_name: cat,
                          })
                        }
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                          extractedData.category_name === cat
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setExtractedData(null)}
                  className="flex-1 h-11 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Re-parse
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="flex-[2] h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition"
                >
                  <Check className="w-4 h-4" />
                  Confirm & Save (Enter)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
