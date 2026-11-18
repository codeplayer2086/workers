import React, { useEffect, useState } from 'react';
import {
  Building2,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import type { Company } from '../../types/portal';

export interface ManagedUserProfileTarget {
  id: string;
  fullName: string;
  email: string;
  role: 'AGENT' | 'EMPLOYEE';
  companyId?: string | null;
  companyNameEn?: string | null;
  companyNameAr?: string | null;
  isActive: boolean;
  createdAt: string;
  visiblePassword: string | null;
}

export function AdminUserProfileModal({
  user,
  companies,
  onClose,
  onUpdated,
  onToggled,
  onDeleted,
}: {
  user: ManagedUserProfileTarget | null;
  companies?: Company[];
  onClose: () => void;
  onUpdated: (updated: ManagedUserProfileTarget) => void;
  onToggled: (id: string, isActive: boolean) => void;
  onDeleted: (id: string) => void;
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [copiedPwd, setCopiedPwd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setEmail(user.email);
      setNewPassword('');
      setCompanyId(user.companyId ?? '');
      setShowCurrentPwd(false);
      setShowNewPwd(false);
      setCopiedPwd(false);
      setConfirmDelete(false);
      setError(null);
      setFeedback(null);
    }
  }, [user]);

  if (!user) return null;

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setFeedback(null);
    try {
      const updated = await apiFetch<ManagedUserProfileTarget>(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          password: newPassword.trim() ? newPassword.trim() : undefined,
          companyId: user.role === 'AGENT' ? companyId : undefined,
        }),
      });
      onUpdated(updated);
      setNewPassword('');
      setFeedback('Account credentials and profile saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update account');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    setError(null);
    try {
      const res = await apiFetch<{ id: string; isActive: boolean }>(
        `/api/admin/users/${user.id}/toggle`,
        { method: 'PATCH' }
      );
      onToggled(res.id, res.isActive);
      setFeedback(res.isActive ? 'Account activated.' : 'Account suspended.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle status');
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      onDeleted(user.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
      setDeleting(false);
    }
  };

  const handleCopyPassword = async () => {
    if (!user.visiblePassword) return;
    try {
      await navigator.clipboard.writeText(user.visiblePassword);
      setCopiedPwd(true);
      setTimeout(() => setCopiedPwd(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-user-profile-title"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
              {user.role === 'AGENT' ? 'Agent Profile & Credentials' : 'Employee Profile & Credentials'}
            </p>
            <h2
              id="admin-user-profile-title"
              className="mt-0.5 font-display text-lg font-bold text-slate-900"
            >
              {user.fullName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile dialog"
            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
              {error}
            </div>
          )}
          {feedback && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
              {feedback}
            </div>
          )}

          {/* Profile Snapshot & Current Password Vault */}
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-medium text-slate-500">Account Email</p>
              <p className="mt-0.5 flex items-center gap-1.5 font-mono-tabular text-xs font-semibold text-slate-900">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                {user.email}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-medium text-slate-500">Status</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold">
                {user.isActive ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Active Access</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
                    <span className="text-red-700">Suspended</span>
                  </>
                )}
              </p>
            </div>

            {user.role === 'AGENT' && (
              <div>
                <p className="text-[11px] font-medium text-slate-500">Assigned Company</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  {user.companyNameEn || '—'}
                </p>
              </div>
            )}

            <div className={user.role === 'EMPLOYEE' ? 'sm:col-span-2' : ''}>
              <p className="text-[11px] font-medium text-slate-500">
                Current Password (Admin Visibility)
              </p>
              <div className="mt-1 flex items-center gap-2">
                <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5">
                  <KeyRound className="h-3.5 w-3.5 shrink-0 text-sky-600" />
                  <span className="font-mono-tabular text-xs font-semibold text-slate-900">
                    {user.visiblePassword
                      ? showCurrentPwd
                        ? user.visiblePassword
                        : '••••••••••••'
                      : 'Reset password below to sync visibility'}
                  </span>
                </div>
                {user.visiblePassword && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowCurrentPwd((v) => !v)}
                      aria-label={showCurrentPwd ? 'Hide password' : 'Reveal password'}
                      className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100"
                    >
                      {showCurrentPwd ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      aria-label="Copy password"
                      className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100"
                    >
                      {copiedPwd ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Admin Edit Form */}
          <form onSubmit={handleSaveChanges} className="space-y-4">
            <h3 className="font-display text-sm font-semibold text-slate-900">
              Update Name, Email & Password
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-700">Full Name *</label>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Set New Password (optional)
                </label>
                <div className="relative mt-1">
                  <input
                    type={showNewPwd ? 'text' : 'password'}
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Leave blank to keep existing"
                    className="w-full rounded-lg border border-slate-300 py-2 pl-3 pr-9 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPwd((v) => !v)}
                    aria-label={showNewPwd ? 'Hide new password' : 'Show new password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showNewPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {user.role === 'AGENT' && companies && (
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Assigned Company *
                  </label>
                  <select
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggle}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {user.isActive ? 'Suspend Access' : 'Activate Access'}
                </button>

                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Account</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-2.5 py-1.5">
                    <span className="text-xs font-semibold text-red-800">Confirm delete?</span>
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={handleDelete}
                      className="rounded bg-red-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-50"
                    >
                      {deleting ? 'Deleting...' : 'Yes, Delete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
