/**
 * Login.jsx — JWT Authentication Screen
 * Shown when no access token exists in localStorage.
 * Calls POST /api/token/ and stores the tokens on success.
 */
import React, { useState } from 'react';
import { ShieldCheck, Loader2, AlertTriangle, Eye, EyeOff, Stethoscope } from 'lucide-react';
import { login } from '../api';

export default function Login({ onLoginSuccess, onGoToRegister }) {
  const [username,   setUsername]   = useState('');
  const [password,   setPassword]   = useState('');
  const [showPass,   setShowPass]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password.trim()) {
      setError('Please enter your username and password.');
      return;
    }
    setLoading(true);
    try {
      await login(username.trim(), password);
      onLoginSuccess(); // Tell App.jsx to switch to main view
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-brand-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-500/15 border border-brand-500/30 mb-4">
            <ShieldCheck size={32} className="text-brand-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">LiveStock Comply</h1>
          <p className="text-slate-500 text-sm mt-1">AI Withdrawal Compliance Platform</p>
        </div>

        {/* Card */}
        <div className="glass-card p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Sign in</h2>
            <p className="text-slate-500 text-sm mt-0.5">Use your Django admin credentials</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Username */}
            <div>
              <label className="form-label" htmlFor="login-username">Username</label>
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(null); }}
                placeholder="e.g. admin"
                className="form-input"
              />
            </div>

            {/* Password */}
            <div>
              <label className="form-label" htmlFor="login-password">Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  placeholder="••••••••"
                  className="form-input pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                  aria-label="Toggle password visibility"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              id="login-btn"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-1"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Signing in…</>
              ) : (
                <><Stethoscope size={16} /> Sign In</>
              )}
            </button>
          </form>

          {/* Hint */}
          <div className="text-xs text-slate-600 text-center pt-1 border-t border-slate-800/60 mt-6 pt-4">
            <p className="mb-2">Don't have an account?</p>
            <button
              type="button"
              onClick={onGoToRegister}
              className="text-brand-400 hover:text-brand-300 font-medium transition-colors"
            >
              Create an account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
