'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Sparkles, Mail, LogIn, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState<'oauth' | 'magic' | null>(null);

  async function signInWithGoogle() {
    setLoading('oauth');
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading('magic');
    await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(null);
    setSent(true);
  }

  return (
    <div className="min-h-screen bg-[#0A0E27] flex items-center justify-center p-4">
      <div className="w-full max-w-sm glass-modal rounded-3xl p-8 border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-blue-500/10 blur-3xl pointer-events-none rounded-full" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="font-bold text-white">Lumina Money</span>
          </div>

          {sent ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-white">Check your inbox</p>
              <p className="text-[11px] text-slate-400">
                We sent a magic link to <strong>{email}</strong>. Click it to sign in.
              </p>
            </div>
          ) : (
            <>
              <p className="text-[11px] text-slate-400 mb-6">
                Sign in to start managing your money with AI.
              </p>

              <button
                onClick={signInWithGoogle}
                disabled={loading !== null}
                className="w-full h-12 bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-900 font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition"
              >
                {loading === 'oauth' ? <Loader2 className='w-4 h-4 animate-spin' /> : <LogIn className='w-4 h-4' />}
                Continue with Google
              </button>

              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-[10px] text-slate-500 uppercase tracking-widest">or</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <form onSubmit={signInWithEmail} className="space-y-3">
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full h-12 bg-slate-900/80 border border-white/10 rounded-xl pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading !== null || !email.trim()}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition"
                >
                  {loading === 'magic' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Send magic link
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
