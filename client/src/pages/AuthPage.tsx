import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register, continueAsGuest } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, pass);
      } else {
        await register(name, email, pass);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setLoading(true);
    try {
      await continueAsGuest();
      navigate('/');
    } catch {
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full bg-neutral-900/80 border border-neutral-800 rounded-xl pl-10 pr-4 py-3 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-neutral-600 focus:ring-1 focus:ring-neutral-700 transition-all duration-200';

  return (
    <div className="min-h-screen bg-[#090A0F] flex items-center justify-center relative overflow-hidden">
      {/* Subtle ambient light */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-white/[0.02] rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm px-6">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-semibold tracking-tight text-white mb-1.5">Lumina</h1>
          <p className="text-neutral-500 text-sm leading-relaxed">Research intelligence, simplified.</p>
        </div>

        {/* Card */}
        <div className="bg-neutral-900/40 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-7">
          {/* Tab switcher */}
          <div className="flex rounded-xl bg-neutral-900/80 p-1 mb-6">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  mode === m
                    ? 'bg-white text-black shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'register' && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  required
                  className={inputClass}
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                className={inputClass}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="Password"
                required
                minLength={6}
                className={inputClass}
              />
            </div>

            {error && (
              <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/15 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white hover:bg-neutral-200 text-black font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-sm active:scale-[0.98] disabled:opacity-50 mt-1"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-neutral-400 border-t-black rounded-full animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.06]" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-neutral-900/80 px-3 text-xs text-neutral-600">or</span>
            </div>
          </div>

          <button
            onClick={handleGuest}
            disabled={loading}
            className="w-full bg-neutral-900/60 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-200"
          >
            Continue as Guest
          </button>
        </div>

        <p className="text-center text-neutral-600 text-xs mt-8 tracking-wide">
          Lumina · Research & Knowledge Discovery
        </p>
      </div>
    </div>
  );
}
