import React, { useEffect, useState } from 'react';
import { Building2, CheckCircle2, UserPlus } from 'lucide-react';
import { DashboardShell } from '../../components/layout/DashboardShell';
import { apiFetch } from '../../lib/api';
import type { Company } from '../../types/portal';

interface AgentRow {
  id: string;
  fullName: string;
  email: string;
  companyId: string | null;
  companyNameEn: string | null;
  companyNameAr: string | null;
  isActive: boolean;
  createdAt: string;
}

export function AdminAgentsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Strict 2-Step Creation Flow: Step 1 Select Company -> Step 2 Name, Email, Password
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<Company[]>('/api/admin/companies'),
      apiFetch<AgentRow[]>('/api/admin/agents'),
    ])
      .then(([compList, agentList]) => {
        setCompanies(compList);
        setAgents(agentList);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load agents'))
      .finally(() => setLoading(false));
  }, []);

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
      const created = await apiFetch<AgentRow>('/api/admin/agents', {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update agent status');
    }
  };

  return (
    <DashboardShell
      title="International Agent Provisioning"
      breadcrumb="Admin / Agents"
    >
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
              <label htmlFor="agent-company-select" className="mt-2 block text-sm font-medium text-slate-800">
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
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="khalid@company.sa"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <label htmlFor="agent-password" className="block text-xs font-medium text-slate-700">
                      Initial Password *
                    </label>
                    <input
                      id="agent-password"
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
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

        {/* Agents Table */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Active & Suspended Partner Agents
            </h2>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-slate-500">Loading agent accounts...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="px-6 py-3">Agent Name</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Assigned Company</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Access</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {agents.map((agent) => (
                    <tr key={agent.id} className="hover:bg-slate-50/60">
                      <td className="px-6 py-3 font-medium text-slate-900">{agent.fullName}</td>
                      <td className="px-6 py-3 font-mono-tabular text-xs text-slate-600">
                        {agent.email}
                      </td>
                      <td className="px-6 py-3 text-slate-700">{agent.companyNameEn || '—'}</td>
                      <td className="px-6 py-3 text-xs font-semibold">
                        <span className={agent.isActive ? 'text-emerald-700' : 'text-red-700'}>
                          {agent.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(agent.id)}
                          className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          {agent.isActive ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
