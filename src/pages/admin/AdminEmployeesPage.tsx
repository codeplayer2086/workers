import React, { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  LayoutGrid,
  List,
  Mail,
  ShieldAlert,
  Trash2,
  UserCog,
  UserPlus,
} from 'lucide-react';
import { DashboardShell } from '../../components/layout/DashboardShell';
import {
  AdminUserProfileModal,
  type ManagedUserProfileTarget,
} from '../../components/admin/AdminUserProfileModal';
import { apiFetch } from '../../lib/api';
import type { AdminEmployeeRow } from '../../types/portal';

type ViewMode = 'GRID' | 'LIST';

export function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<AdminEmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      return (localStorage.getItem('maktab_admin_employees_view') as ViewMode) || 'GRID';
    } catch {
      return 'GRID';
    }
  });
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [profileTarget, setProfileTarget] = useState<AdminEmployeeRow | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<AdminEmployeeRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleCopyPassword = async (id: string, visiblePwd: string) => {
    try {
      await navigator.clipboard.writeText(visiblePwd);
      setCopiedId(id);
      setTimeout(() => setCopiedId((curr) => (curr === id ? null : curr)), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  useEffect(() => {
    apiFetch<AdminEmployeeRow[]>('/api/admin/employees')
      .then(setEmployees)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load staff'))
      .finally(() => setLoading(false));
  }, []);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('maktab_admin_employees_view', mode);
    } catch {
      // Ignore storage error
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFeedback(null);
    try {
      const created = await apiFetch<AdminEmployeeRow>('/api/admin/employees', {
        method: 'POST',
        body: JSON.stringify({ fullName, email, password }),
      });
      setEmployees((prev) => [created, ...prev]);
      setFullName('');
      setEmail('');
      setPassword('');
      setFeedback(`Created Dhaka staff account for ${created.fullName}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create employee');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const res = await apiFetch<{ id: string; isActive: boolean }>(
        `/api/admin/users/${id}/toggle`,
        { method: 'PATCH' }
      );
      setEmployees((prev) =>
        prev.map((emp) => (emp.id === id ? { ...emp, isActive: res.isActive } : emp))
      );
      setProfileTarget((prev) =>
        prev && prev.id === id ? { ...prev, isActive: res.isActive } : prev
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/users/${deleteConfirmTarget.id}`, { method: 'DELETE' });
      setEmployees((prev) => prev.filter((emp) => emp.id !== deleteConfirmTarget.id));
      setFeedback(`Deleted employee account for ${deleteConfirmTarget.fullName}.`);
      setDeleteConfirmTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete employee');
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdatedFromModal = (updated: ManagedUserProfileTarget) => {
    const asEmp = updated as AdminEmployeeRow;
    setEmployees((prev) => prev.map((emp) => (emp.id === updated.id ? { ...emp, ...asEmp } : emp)));
    setProfileTarget((prev) => (prev && prev.id === updated.id ? { ...prev, ...asEmp } : prev));
    setFeedback(`Updated credentials and profile for ${updated.fullName}.`);
  };

  return (
    <DashboardShell title="Dhaka Staff Accounts" breadcrumb="Admin / Employees">
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

        <form onSubmit={handleCreate} className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Register Internal Employee Account
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            All internal employees share the central Dhaka worker directory.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
            <input
              type="text"
              required
              autoComplete="off"
              aria-label="Staff Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Staff Full Name"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="email"
              required
              autoComplete="off"
              aria-label="Staff Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@dhakarecruit.com"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="relative">
              <input
                type={showCreatePassword ? 'text' : 'password'}
                required
                minLength={6}
                autoComplete="new-password"
                aria-label="Staff Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 6 chars)"
                className="w-full rounded-lg border border-slate-300 py-2 pl-3 pr-9 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowCreatePassword((v) => !v)}
                aria-label={showCreatePassword ? 'Hide new employee password' : 'Show new employee password'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                {showCreatePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add Employee</span>
            </button>
          </div>
        </form>

        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Internal Agency Staff ({employees.length})
            </h2>

            <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => handleViewModeChange('GRID')}
                aria-label="Grid view"
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  viewMode === 'GRID'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Grid</span>
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange('LIST')}
                aria-label="List view"
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  viewMode === 'LIST'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                <span>List</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-slate-500">Loading staff accounts...</div>
          ) : employees.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No internal employees registered yet.
            </div>
          ) : viewMode === 'GRID' ? (
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
              {employees.map((emp) => {
                const isRevealed = Boolean(revealedIds[emp.id]);
                return (
                  <div
                    key={emp.id}
                    className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate font-display text-sm font-bold text-slate-900">
                            {emp.fullName}
                          </h3>
                          <p className="mt-0.5 flex items-center gap-1 truncate font-mono-tabular text-xs text-slate-600">
                            <Mail className="h-3 w-3 shrink-0 text-slate-400" />
                            {emp.email}
                          </p>
                        </div>
                        <span
                          className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                            emp.isActive
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-red-200 bg-red-50 text-red-700'
                          }`}
                        >
                          {emp.isActive ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <ShieldAlert className="h-3 w-3" />
                          )}
                          {emp.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </div>

                      <div className="mt-3 border-t border-slate-100 pt-3">
                        <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                          <span className="flex items-center gap-1.5 font-mono-tabular text-xs text-slate-700">
                            <KeyRound className="h-3.5 w-3.5 shrink-0 text-sky-600" />
                            {emp.visiblePassword
                              ? isRevealed
                                ? emp.visiblePassword
                                : '••••••••'
                              : 'Not synced'}
                          </span>
                          {emp.visiblePassword && (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setRevealedIds((prev) => ({ ...prev, [emp.id]: !isRevealed }))
                                }
                                aria-label={isRevealed ? 'Hide password' : 'Show password'}
                                className="text-slate-500 hover:text-slate-900"
                              >
                                {isRevealed ? (
                                  <EyeOff className="h-3.5 w-3.5" />
                                ) : (
                                  <Eye className="h-3.5 w-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopyPassword(emp.id, emp.visiblePassword!)}
                                aria-label={`Copy password for ${emp.fullName}`}
                                className="text-slate-500 hover:text-slate-900"
                              >
                                {copiedId === emp.id ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        onClick={() => setProfileTarget(emp)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
                      >
                        <UserCog className="h-3.5 w-3.5" />
                        <span>Profile & Edit</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggle(emp.id)}
                          className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          {emp.isActive ? 'Suspend' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmTarget(emp)}
                          aria-label={`Delete ${emp.fullName}`}
                          className="rounded-md border border-red-200 bg-red-50 p-1.5 text-red-700 hover:bg-red-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Password</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map((emp) => {
                    const isRevealed = Boolean(revealedIds[emp.id]);
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/60">
                        <td className="px-6 py-3 font-medium text-slate-900">{emp.fullName}</td>
                        <td className="px-6 py-3 font-mono-tabular text-xs text-slate-600">
                          {emp.email}
                        </td>
                        <td className="px-6 py-3">
                          <div className="inline-flex items-center gap-2 font-mono-tabular text-xs text-slate-700">
                            <span>
                              {emp.visiblePassword
                                ? isRevealed
                                  ? emp.visiblePassword
                                  : '••••••••'
                                : '—'}
                            </span>
                            {emp.visiblePassword && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRevealedIds((prev) => ({ ...prev, [emp.id]: !isRevealed }))
                                  }
                                  aria-label={isRevealed ? 'Hide password' : 'Show password'}
                                  className="text-slate-500 hover:text-slate-900"
                                >
                                  {isRevealed ? (
                                    <EyeOff className="h-3.5 w-3.5" />
                                  ) : (
                                    <Eye className="h-3.5 w-3.5" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCopyPassword(emp.id, emp.visiblePassword!)}
                                  aria-label={`Copy password for ${emp.fullName}`}
                                  className="text-slate-500 hover:text-slate-900"
                                >
                                  {copiedId === emp.id ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3 text-xs font-semibold">
                          <span className={emp.isActive ? 'text-emerald-700' : 'text-red-700'}>
                            {emp.isActive ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setProfileTarget(emp)}
                              className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
                            >
                              Profile & Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggle(emp.id)}
                              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                            >
                              {emp.isActive ? 'Suspend' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmTarget(emp)}
                              aria-label={`Delete ${emp.fullName}`}
                              className="rounded-md border border-red-200 bg-red-50 p-1 text-red-700 hover:bg-red-100"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Admin Profile & Credential Editor Modal */}
      <AdminUserProfileModal
        user={profileTarget}
        onClose={() => setProfileTarget(null)}
        onUpdated={handleUpdatedFromModal}
        onToggled={(id, isActive) => {
          setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, isActive } : e)));
          setProfileTarget((prev) => (prev && prev.id === id ? { ...prev, isActive } : prev));
        }}
        onDeleted={(id) => {
          setEmployees((prev) => prev.filter((e) => e.id !== id));
          setFeedback('Deleted employee account.');
        }}
      />

      {/* Quick Delete Confirmation Modal */}
      {deleteConfirmTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-employee-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3
              id="delete-employee-title"
              className="font-display text-base font-bold text-slate-900"
            >
              Delete Employee {deleteConfirmTarget.fullName}?
            </h3>
            <p className="mt-2 text-xs text-slate-600">
              This will permanently remove {deleteConfirmTarget.email}. Any worker profiles they
              registered will remain preserved in the shared directory.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteConfirmTarget(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Employee'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
