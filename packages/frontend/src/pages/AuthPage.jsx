import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Activity, ShieldCheck, ArrowRight, Lock, Mail, ArrowLeft } from 'lucide-react';

export default function AuthPage({ initialEmail = '', onBack }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isRegister) {
        await register(email, password);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#182D26] px-4 selection:bg-[#E5F455] selection:text-[#182D26] relative">
      {/* Background ambient radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(229,244,85,0.06)_0%,transparent_70%)] pointer-events-none" />

      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-6 left-6 text-sm text-emerald-100/70 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#25443a] bg-[#12221c]/60 backdrop-blur transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Overview
        </button>
      )}

      <div className="max-w-md w-full bg-[#12221c] border border-[#25443a] rounded-2xl p-8 shadow-2xl relative z-10">
        <div className="flex items-center space-x-3 mb-8 justify-center">
          <div className="p-2.5 bg-[#E5F455] rounded-xl text-[#182D26] shadow-md shadow-black/20">
            <Activity className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Anchor <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#E5F455]/15 text-[#E5F455] border border-[#E5F455]/30">Reliability</span>
            </h1>
            <p className="text-xs text-emerald-100/60">Distributed API Monitoring Engine</p>
          </div>
        </div>

        <div className="flex gap-2 p-1 bg-[#182D26] rounded-xl mb-6 border border-[#25443a]">
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(''); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              !isRegister 
                ? 'bg-[#E5F455] text-[#182D26] shadow' 
                : 'text-emerald-100/70 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(''); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              isRegister 
                ? 'bg-[#E5F455] text-[#182D26] shadow' 
                : 'text-emerald-100/70 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-emerald-100/80 mb-1.5">Email address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-emerald-100/40 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@company.com"
                className="w-full bg-[#182D26] border border-[#25443a] rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-emerald-100/30 focus:outline-none focus:border-[#E5F455] focus:ring-1 focus:ring-[#E5F455] transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-emerald-100/80 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-emerald-100/40 absolute left-3 top-3" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#182D26] border border-[#25443a] rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-emerald-100/30 focus:outline-none focus:border-[#E5F455] focus:ring-1 focus:ring-[#E5F455] transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#E5F455] hover:bg-[#d8e747] text-[#182D26] font-semibold text-sm py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 mt-2 active:scale-[0.99]"
          >
            {submitting ? 'Authenticating...' : (isRegister ? 'Complete Registration' : 'Sign In')}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#25443a] text-center">
          <p className="text-xs text-emerald-100/50 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#E5F455]" />
            Enterprise grade end-to-end telemetry security
          </p>
        </div>
      </div>
    </div>
  );
}
