"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  X,
  Send,
  Sliders,
  CheckCircle2,
  Loader2,
  ArrowRight,
} from "lucide-react";

interface CopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  financialContext?: {
    currency: string;
    liquidBalance: number;
    monthlyIncome: number;
    monthlySpent: number;
    monthlySavingsTarget: number;
    safeToSpend: number;
    categories: string[];
  };
  onRuleCreated?: (rule: any) => void;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdRule?: any;
}

export function CopilotDrawer({
  isOpen,
  onClose,
  financialContext,
  onRuleCreated,
}: CopilotDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hello! I'm Lumina, your personal finance copilot. You can ask me about your safe-to-spend balance, evaluate a purchase, or create automated spending rules just by chatting.",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Escape closes the drawer (a11y — matches QuickCaptureModal behaviour)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputValue;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: textToSend,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role === "user" ? "user" : "model",
            content: m.content,
          })),
          financialContext,
        }),
      });

      const data = await res.json();
      if (data.reply) {
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.reply,
          createdRule: data.createdRule,
        };
        setMessages((prev) => [...prev, assistantMsg]);

        if (data.createdRule && onRuleCreated) {
          onRuleCreated(data.createdRule);
        }
      }
    } catch (err) {
      console.error("Failed to query copilot:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md h-full glass-drawer flex flex-col border-l border-white/10 shadow-2xl animate-in slide-in-from-right duration-250"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0D132D]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">
                  Lumina Copilot
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  AI Advisor
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Gemini 2.5 Active Context
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
            aria-label="Close Copilot"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Financial Snapshot Bar */}
        {financialContext && (
          <div className="px-5 py-2.5 bg-slate-900/40 border-b border-white/5 flex items-center justify-between text-xs">
            <span className="text-slate-400">Safe-to-Spend:</span>
            <span className="font-bold tabular-nums text-emerald-400">
              ${financialContext.safeToSpend.toLocaleString()}
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">Spent:</span>
            <span className="font-semibold tabular-nums text-slate-200">
              ${financialContext.monthlySpent.toLocaleString()}
            </span>
          </div>
        )}

        {/* Message Feed */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-white/[0.04] border border-indigo-500/20 text-slate-100"
                }`}
              >
                {msg.content}
              </div>

              {/* Function Calling Badge (Automated Rule Created) */}
              {msg.createdRule && (
                <div className="mt-2 p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs w-[85%] flex items-start gap-2.5 text-indigo-200 animate-in fade-in duration-300">
                  <Sliders className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 font-semibold text-white">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Rule Active: {msg.createdRule.rule_name}
                    </div>
                    <p className="text-[11px] text-indigo-300/80 mt-0.5">
                      Action:{" "}
                      {msg.createdRule.action_type === "set_category"
                        ? "Auto-categorize"
                        : "Spending Alert"}
                      {msg.createdRule.merchant &&
                        ` on "${msg.createdRule.merchant}"`}
                      {msg.createdRule.threshold_amount &&
                        ` over $${msg.createdRule.threshold_amount}`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-xs text-indigo-400 w-fit">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Lumina is reasoning with your finances...
            </div>
          )}
        </div>

        {/* Quick Suggestion Pills */}
        <div className="px-5 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar border-t border-white/5">
          <button
            onClick={() => handleSend("Can I afford a $150 dinner tonight?")}
            className="whitespace-nowrap px-3 py-1 rounded-full text-xs bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition"
          >
            Can I afford a $150 dinner?
          </button>
          <button
            onClick={() =>
              handleSend(
                "Set a rule: categorize all Uber rides as Transportation",
              )
            }
            className="whitespace-nowrap px-3 py-1 rounded-full text-xs bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition"
          >
            Rule: Uber to Transportation
          </button>
          <button
            onClick={() => handleSend("Analyze my monthly spending pace")}
            className="whitespace-nowrap px-3 py-1 rounded-full text-xs bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition"
          >
            Analyze my spending pace
          </button>
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-white/10 bg-slate-950/60">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask advice or dictate an automation rule..."
              className="flex-1 bg-slate-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white flex items-center justify-center transition shrink-0"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
