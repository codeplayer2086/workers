import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { loginWithCredentials, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const redirectForRole = (role: 'ADMIN' | 'EMPLOYEE' | 'AGENT') => {
    if (role === 'ADMIN') navigate('/admin');
    else if (role === 'EMPLOYEE') navigate('/employee');
    else navigate('/agent');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await loginWithCredentials(email, password);
      redirectForRole(user.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const user = await loginWithGoogle();
      redirectForRole(user.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google Sign-In failed');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError(null);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Left Brand / Overview Panel */}
      <div className="hidden w-1/2 flex-col justify-between bg-slate-900 p-12 text-white lg:flex">
        <div>
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-sky-400" />
            <span className="font-display text-xl font-bold tracking-tight">Maktab Placement</span>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            Bangladesh-to-GCC International Recruitment & Candidate Dossier System
          </p>
        </div>

        <div className="max-w-lg space-y-6">
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-white [text-wrap:balance]">
            Centralized worker registry & dual-language Saudi CV studio.
          </h1>
          <p className="text-base leading-relaxed text-slate-300">
            Register verified candidates in Dhaka, safeguard passport and GAMCA compliance records
            privately, and empower partner Saudi agencies to export separate English or Arabic A4
            CVs in PDF and PNG.
          </p>

          <div className="grid grid-cols-3 gap-6 border-t border-slate-800 pt-6">
            <div>
              <p className="font-mono-tabular text-2xl font-bold text-white">EN / AR</p>
              <p className="mt-1 text-xs text-slate-400">Separate single-language A4 CVs</p>
            </div>
            <div>
              <p className="font-mono-tabular text-2xl font-bold text-white">PDF / PNG</p>
              <p className="mt-1 text-xs text-slate-400">Company-branded print exports</p>
            </div>
            <div>
              <p className="font-mono-tabular text-2xl font-bold text-white">3 Roles</p>
              <p className="mt-1 text-xs text-slate-400">Strict Admin, Staff & Agent isolation</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Private enterprise portal · Public registration disabled
        </p>
      </div>

      {/* Right Sign-In Form */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-7">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sky-700 lg:hidden">
              <Building2 className="h-5 w-5" />
              <span className="font-display text-lg font-bold text-slate-900">Maktab Placement</span>
            </div>
            <h2 className="font-display text-2xl font-bold text-slate-900">Portal Sign In</h2>
            <p className="mt-1 text-sm text-slate-600">
              Sign in with your agency-issued credentials or authorized Google account.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-slate-700">
                Email Address
              </label>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@agency.com"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              <span>{submitting ? 'Signing in...' : 'Sign In'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-slate-200" />
            <span className="mx-3 shrink-0 text-xs text-slate-400">or</span>
            <div className="flex-grow border-t border-slate-200" />
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={handleGoogleSignIn}
            className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <ShieldCheck className="h-4 w-4 text-sky-600" />
            <span>Sign in with Google</span>
          </button>

          {/* Role Credentials Quick-Fill for Verification */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-700">
              Seeded Portal Accounts (Quick Fill)
            </p>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemo('admin@dhakarecruit.com', 'Admin@1234')}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-left text-xs font-medium text-slate-800 hover:border-sky-400 hover:bg-sky-50"
              >
                <span className="block font-semibold">Admin</span>
                <span className="block truncate text-[11px] text-slate-500">Dhaka HQ</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo('employee@dhakarecruit.com', 'Staff@1234')}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-left text-xs font-medium text-slate-800 hover:border-sky-400 hover:bg-sky-50"
              >
                <span className="block font-semibold">Employee</span>
                <span className="block truncate text-[11px] text-slate-500">Staff Portal</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo('agent.riyadh@aljazira.sa', 'Agent@1234')}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-left text-xs font-medium text-slate-800 hover:border-sky-400 hover:bg-sky-50"
              >
                <span className="block font-semibold">Saudi Agent</span>
                <span className="block truncate text-[11px] text-slate-500">Al-Jazira</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
