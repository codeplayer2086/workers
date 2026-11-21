import React, { useEffect, useState } from 'react';
import {
  Building2,
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
import type { AdminAgentRow, Company } from '../../types/portal';

type ViewMode = 'GRID' | 'LIST';

export function AdminAgentsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [agents, setAgents] = useState<AdminAgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      return (localStorage.getItem('maktab_admin_agents_view') as ViewMode) || 'GRID';
    } catch {
      return 'GRID';
    }
  });
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [profileTarget, setProfileTarget] = useState<AdminAgentRow | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<AdminAgentRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Strict 2-Step Creation Flow: Step 1 Select Company -> Step 2 Name, Email, Password
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    Promise.all([
      apiFetch<Company[]>('/api/admin/companies'),
      apiFetch<AdminAgentRow[]>('/api/admin/agents'),
    ])
      .then(([compList, agentList]) => {
        setCompanies(compList);
        setAgents(agentList);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load agents'))
      .finally(() => setLoading(false));
  }, []);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('maktab_admin_agents_view', mode);
    } catch {
      // Ignore storage error
    }
  };

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId) ?? null;

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId) {
      setError('Step 1: Please select an international company first.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setFeedback(null);
    try {
      const created = await apiFetch<AdminAgentRow>('/api/admin/agents', {
        method: 'POST',
        body: JSON.stringify({
          companyId: selectedCompanyId,
          fullName,
          email,
          password,
        }),
      });
      setAgents((prev) => [created, ...prev]);
      setFullName('');
      setEmail('');
      setPassword('');
      setFeedback(`Created agent account for ${created.fullName} under ${created.companyNameEn}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (agentId: string) => {
    try {
      const res = await apiFetch<{ id: string; isActive: boolean }>(
        `/api/admin/users/${agentId}/toggle`,
        { method: 'PATCH' }
      );
      setAgents((prev) =>
        prev.map((a) => (a.id === agentId ? { ...a, isActive: res.isActive } : a))
      );
      setProfileTarget((prev) =>
        prev && prev.id === agentId ? { ...prev, isActive: res.isActive } : prev
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update agent status');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/users/${deleteConfirmTarget.id}`, { method: 'DELETE' });
      setAgents((prev) => prev.filter((a) => a.id !== deleteConfirmTarget.id));
      setFeedback(`Deleted agent account for ${deleteConfirmTarget.fullName}.`);
      setDeleteConfirmTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete agent');
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdatedFromModal = (updated: ManagedUserProfileTarget) => {
    const asAgent = updated as AdminAgentRow;
    setAgents((prev) => prev.map((a) => (a.id === updated.id ? { ...a, ...asAgent } : a)));
    setProfileTarget((prev) => (prev && prev.id === updated.id ? { ...prev, ...asAgent } : prev));
    setFeedback(`Updated credentials and profile for ${updated.fullName}.`);
  };

  return (
    <DashboardShell title="International Agent Provisioning" breadcrumb="Admin / Agents">
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

        {/* Enforced 2-Step Agent Creation Form */}
        <form
          onSubmit={handleCreateAgent}
          className="rounded-xl border border-slate-200 bg-white p-6"
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Step 1: Select Company */}
            <div className="lg:col-span-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                Step 1 · Select International Company
              </p>
              <label
                htmlFor="agent-company-select"
                className="mt-2 block text-sm font-medium text-slate-800"
              >
                Assigned Saudi / GCC Agency *
              </label>
              <select
                id="agent-company-select"
                value={selectedCompanyId}
                onChange={(e) => {
                  setSelectedCompanyId(e.target.value);
                  setError(null);
                }}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
              >
                <option value="">-- Choose Partner Company First --</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameEn} ({c.country})
                  </option>
                ))}
              </select>

              {selectedCompany ? (
                <div className="mt-3 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-900">
                      {selectedCompany.nameEn}
                    </p>
                    <p className="truncate text-[11px] text-slate-500">
                      CVs will use this company&apos;s logo & fixed template
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-500">
                  <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
                  <span>Select a company to unlock Step 2 credential fields.</span>
                </div>
              )}
            </div>

            {/* Step 2: Agent Credentials */}
            <div className="lg:col-span-7">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Step 2 · Agent Name, Email & Password
              </p>
              <fieldset disabled={!selectedCompanyId} className="mt-2 space-y-4 disabled:opacity-50">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="agent-name" className="block text-xs font-medium text-slate-700">
                      Agent Full Name *
                    </label>
                    <input
                      id="agent-name"
                      type="text"
                      required
                      autoComplete="off"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g., Khalid Al-Mutairi"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="agent-email" className="block text-xs font-medium text-slate-700">
                      Agent Email *
                    </label>
                    <input
                      id="agent-email"
                      type="email"
                      required
                      autoComplete="off"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="khalid@company.sa"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <label
                      htmlFor="agent-password"
                      className="block text-xs font-medium text-slate-700"
                    >
                      Initial Password *
                    </label>
                    <div className="relative mt-1">
                      <input
                        id="agent-password"
                        type={showCreatePassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        className="w-full rounded-lg border border-slate-300 py-2 pl-3 pr-9 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCreatePassword((v) => !v)}
                        aria-label={showCreatePassword ? 'Hide initial password' : 'Show initial password'}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      >
                        {showCreatePassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={submitting || !selectedCompanyId}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap shrink-0"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>{submitting ? 'Creating Agent...' : 'Create Agent Account'}</span>
                  </button>
                </div>
              </fieldset>
            </div>
          </div>
        </form>

        {/* Agents Directory Container with Grid/List Switcher */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Partner Agents ({agents.length})
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
            <div className="p-6 text-sm text-slate-500">Loading agent accounts...</div>
          ) : agents.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No partner agents registered yet.
            </div>
          ) : viewMode === 'GRID' ? (
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
              {agents.map((agent) => {
                const isRevealed = Boolean(revealedIds[agent.id]);
                return (
                  <div
                    key={agent.id}
                    className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate font-display text-sm font-bold text-slate-900">
                            {agent.fullName}
                          </h3>
                          <p className="mt-0.5 flex items-center gap-1 truncate font-mono-tabular text-xs text-slate-600">
                            <Mail className="h-3 w-3 shrink-0 text-slate-400" />
                            {agent.email}
                          </p>
                        </div>
                        <span
                          className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                            agent.isActive
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-red-200 bg-red-50 text-red-700'
                          }`}
                        >
                          {agent.isActive ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <ShieldAlert className="h-3 w-3" />
                          )}
                          {agent.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </div>

                      <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span className="truncate font-medium">{agent.companyNameEn || '—'}</span>
                        </div>

                        <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                          <span className="flex items-center gap-1.5 font-mono-tabular text-xs text-slate-700">
                            <KeyRound className="h-3.5 w-3.5 shrink-0 text-sky-600" />
                            {agent.visiblePassword
                              ? isRevealed
                                ? agent.visiblePassword
                                : '••••••••'
                              : 'Not synced'}
                          </span>
                          {agent.visiblePassword && (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setRevealedIds((prev) => ({ ...prev, [agent.id]: !isRevealed }))
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
                                onClick={() => handleCopyPassword(agent.id, agent.visiblePassword!)}
                                aria-label={`Copy password for ${agent.fullName}`}
                                className="text-slate-500 hover:text-slate-900"
                              >
                                {copiedId === agent.id ? (
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
                        onClick={() => setProfileTarget(agent)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
                      >
                        <UserCog className="h-3.5 w-3.5" />
                        <span>Profile & Edit</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(agent.id)}
                          className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          {agent.isActive ? 'Suspend' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmTarget(agent)}
                          aria-label={`Delete ${agent.fullName}`}
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
                    <th className="px-6 py-3">Agent Name</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Password</th>
                    <th className="px-6 py-3">Assigned Company</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {agents.map((agent) => {
                    const isRevealed = Boolean(revealedIds[agent.id]);
                    return (
                      <tr key={agent.id} className="hover:bg-slate-50/60">
                        <td className="px-6 py-3 font-medium text-slate-900">{agent.fullName}</td>
                        <td className="px-6 py-3 font-mono-tabular text-xs text-slate-600">
                          {agent.email}
                        </td>
                        <td className="px-6 py-3">
                          <div className="inline-flex items-center gap-2 font-mono-tabular text-xs text-slate-700">
                            <span>
                              {agent.visiblePassword
                                ? isRevealed
                                  ? agent.visiblePassword
                                  : '••••••••'
                                : '—'}
                            </span>
                            {agent.visiblePassword && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRevealedIds((prev) => ({ ...prev, [agent.id]: !isRevealed }))
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
                                  onClick={() => handleCopyPassword(agent.id, agent.visiblePassword!)}
                                  aria-label={`Copy password for ${agent.fullName}`}
                                  className="text-slate-500 hover:text-slate-900"
                                >
                                  {copiedId === agent.id ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3 text-slate-700">{agent.companyNameEn || '—'}</td>
                        <td className="px-6 py-3 text-xs font-semibold">
                          <span className={agent.isActive ? 'text-emerald-700' : 'text-red-700'}>
                            {agent.isActive ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setProfileTarget(agent)}
                              className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
                            >
                              Profile & Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleActive(agent.id)}
                              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                            >
                              {agent.isActive ? 'Suspend' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmTarget(agent)}
                              aria-label={`Delete ${agent.fullName}`}
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
        companies={companies}
        onClose={() => setProfileTarget(null)}
        onUpdated={handleUpdatedFromModal}
        onToggled={(id, isActive) => {
          setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, isActive } : a)));
          setProfileTarget((prev) => (prev && prev.id === id ? { ...prev, isActive } : prev));
        }}
        onDeleted={(id) => {
          setAgents((prev) => prev.filter((a) => a.id !== id));
          setFeedback('Deleted agent account.');
        }}
      />

      {/* Quick Delete Confirmation Modal */}
      {deleteConfirmTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-agent-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 id="delete-agent-title" className="font-display text-base font-bold text-slate-900">
              Delete Agent {deleteConfirmTarget.fullName}?
            </h3>
            <p className="mt-2 text-xs text-slate-600">
              This will permanently remove {deleteConfirmTarget.email} and their private WhatsApp
              customer directory.
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
                {deleting ? 'Deleting...' : 'Delete Agent'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
