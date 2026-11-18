import React, { useEffect, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { DashboardShell } from '../components/layout/DashboardShell';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';

export function ProfilePage() {
  const { user, company, refreshSession } = useAuth();

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  const [savingInfo, setSavingInfo] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setEmail(user.email);
    }
  }, [user]);

  if (!user) return null;

  const roleDisplay =
    user.role === 'ADMIN'
      ? 'System Administrator'
      : user.role === 'EMPLOYEE'
        ? 'Dhaka Operations Staff'
        : 'International Partner Agent';

  const handleSaveProfileInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFeedback(null);
    setSavingInfo(true);
    try {
      await apiFetch('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
        }),
      });
      await refreshSession();
      setFeedback('Profile name and email updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile details');
    } finally {
      setSavingInfo(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFeedback(null);

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      await apiFetch('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          password: newPassword,
        }),
      });
      await refreshSession();
      setNewPassword('');
      setConfirmPassword('');
      setFeedback('Your password has been updated. Use your new password on future sign-ins.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  const initials = user.fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');

  return (
    <DashboardShell title="My Account Profile" breadcrumb="Account / Profile">
      <div className="space-y-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}
        {feedback && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {feedback}
          </div>
        )}

        {/* Profile Identity Header Card */}
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-900 font-display text-lg font-bold text-white">
                {initials || 'MP'}
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">{user.fullName}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1.5 font-mono-tabular">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    {user.email}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold text-slate-700">
                    <ShieldCheck className="h-3.5 w-3.5 text-sky-600" />
                    {roleDisplay}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{user.isActive ? 'Active Account' : 'Suspended'}</span>
            </div>
          </div>

          {company && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
                  {company.logoPath ? (
                    <img
                      src={company.logoPath}
                      alt={company.nameEn}
                      referrerPolicy="no-referrer"
                      className="h-8 w-8 object-contain"
                    />
                  ) : (
                    <Building2 className="h-4 w-4 text-slate-500" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Assigned Partner Agency</p>
                  <p className="font-display text-sm font-semibold text-slate-900">
                    {company.nameEn}
                  </p>
                  <p dir="rtl" className="font-arabic text-xs text-slate-600">
                    {company.nameAr}
                  </p>
                </div>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p>{company.country}</p>
                {company.licenseNumber && (
                  <p className="font-mono-tabular text-slate-700">{company.licenseNumber}</p>
                )}
              </div>
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Update Name & Email */}
          <form
            onSubmit={handleSaveProfileInfo}
            className="rounded-xl border border-slate-200 bg-white p-6"
          >
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
              <UserIcon className="h-4 w-4 text-sky-600" />
              <h3 className="font-display text-base font-semibold text-slate-900">
                Personal Details
              </h3>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="profile-full-name" className="block text-xs font-medium text-slate-700">
                  Full Name *
                </label>
                <input
                  id="profile-full-name"
                  type="text"
                  required
                  minLength={2}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </div>

              <div>
                <label htmlFor="profile-email" className="block text-xs font-medium text-slate-700">
                  Email Address *
                </label>
                <input
                  id="profile-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={savingInfo}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
              >
                {savingInfo ? 'Saving Changes...' : 'Save Name & Email'}
              </button>
            </div>
          </form>

          {/* Update Password */}
          <form
            onSubmit={handleUpdatePassword}
            className="rounded-xl border border-slate-200 bg-white p-6"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-sky-600" />
                <h3 className="font-display text-base font-semibold text-slate-900">
                  Change Password
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswords((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                {showPasswords ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                <span>{showPasswords ? 'Hide' : 'Show'}</span>
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="profile-new-password" className="block text-xs font-medium text-slate-700">
                  New Password *
                </label>
                <input
                  id="profile-new-password"
                  type={showPasswords ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="profile-confirm-password"
                  className="block text-xs font-medium text-slate-700"
                >
                  Confirm New Password *
                </label>
                <input
                  id="profile-confirm-password"
                  type={showPasswords ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={savingPassword}
                className="rounded-lg bg-sky-700 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-800 disabled:opacity-50 whitespace-nowrap"
              >
                {savingPassword ? 'Updating Password...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardShell>
  );
}
