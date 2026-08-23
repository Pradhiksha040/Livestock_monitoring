import React, { useState } from 'react';
import { ShieldCheck, Loader2, AlertTriangle, Eye, EyeOff, UserPlus, ArrowLeft } from 'lucide-react';
import { register, login } from '../api';

export default function Register({ onRegisterSuccess, onBackToLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]         = useState('FARMER');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password.trim()) {
      setError('Please fill out all fields.');
      return;
    }
    setLoading(true);
    try {
      // 1. Create the account
      await register(username.trim(), password, role);
      // 2. Automatically log them in after registration
      await login(username.trim(), password);
      // 3. Notify App.jsx to transition to the dashboard
      onRegisterSuccess();
    } catch (err) {
      setError(err.message || 'Registration failed. Username may already exist.');
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
          <div className="flex items-center gap-2">
            <button 
              onClick={onBackToLogin}
              className="text-slate-400 hover:text-slate-200 transition-colors"
              aria-label="Back to Login"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Create Account</h2>
              <p className="text-slate-500 text-sm mt-0.5">Register a new profile</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Role Selection */}
            <div>
              <label className="form-label" htmlFor="register-role">Account Type</label>
              <select
                id="register-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="form-input"
              >
                <option value="FARMER">Farmer</option>
                <option value="VET">Veterinarian</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>

            {/* Username */}
            <div>
              <label className="form-label" htmlFor="register-username">Username</label>
              <input
                id="register-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(null); }}
                placeholder="Choose a username"
                className="form-input"
              />
            </div>

            {/* Password */}
            <div>
              <label className="form-label" htmlFor="register-password">Password</label>
              <div className="relative">
                <input
                  id="register-password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  placeholder="Create a password"
                  className="form-input pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
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
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-1"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Creating Account…</>
              ) : (
                <><UserPlus size={16} /> Register</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
