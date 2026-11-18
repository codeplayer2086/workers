import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  ClipboardCheck,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { DashboardShell } from '../../components/layout/DashboardShell';
import { apiFetch } from '../../lib/api';
import { getOccupationLabel } from '../../lib/cv-dictionary';
import type {
  CompanyEngagementItem,
  OccupationStatItem,
  WorkerAlertItem,
} from '../../lib/admin-analytics';
import type { AuditLogItem, CvDownloadLogItem } from '../../types/portal';

interface AdminOverviewData {
  statusCounts: {
    total: number;
    DRAFT: number;
    PUBLISHED: number;
    UNPUBLISHED: number;
    CONTRACTED: number;
  };
  companyCount: number;
  agentCount: number;
  employeeCount: number;
  totalDownloads: number;
  recentDownloads: CvDownloadLogItem[];
  recentAudits: Array<Omit<AuditLogItem, 'metadata'>>;
  alerts: WorkerAlertItem[];
  occupationBreakdown: OccupationStatItem[];
  companyEngagement: CompanyEngagementItem[];
}

export function AdminOverviewPage() {
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<AdminOverviewData>('/api/admin/overview')
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load metrics'))
      .finally(() => setLoading(false));
  }, []);

  const totalWorkers = data?.statusCounts.total || 0;

  return (
    <DashboardShell
      title="Executive Overview"
      breadcrumb="Admin / Overview"
      primaryAction={
        <div className="flex items-center gap-2">
          <Link
            to="/employee/workers/new"
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            Register Worker
          </Link>
          <Link
            to="/admin/agents"
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            Provision Agent
          </Link>
        </div>
      }
    >
      {loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white" />
            <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white" />
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {/* Row 1: Primary KPI Strip */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Published Candidates</p>
              <p className="mt-2 font-mono-tabular text-3xl font-bold text-slate-900">
                {data.statusCounts.PUBLISHED}
              </p>
              <p className="mt-1 text-xs text-slate-500 tabular-nums">
                {data.statusCounts.total} total / {data.statusCounts.DRAFT} drafts
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Contracted Placements</p>
              <p className="mt-2 font-mono-tabular text-3xl font-bold text-emerald-700">
                {data.statusCounts.CONTRACTED}
              </p>
              <p className="mt-1 text-xs text-slate-500">Hidden from international catalog</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Partner Agencies & Staff</p>
              <p className="mt-2 font-mono-tabular text-3xl font-bold text-slate-900">
                {data.companyCount} / {data.agentCount}
              </p>
              <p className="mt-1 text-xs text-slate-500 tabular-nums">
                {data.companyCount} companies · {data.agentCount} agents · {data.employeeCount} staff
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">CV Exports Recorded</p>
              <p className="mt-2 font-mono-tabular text-3xl font-bold text-sky-700">
                {data.totalDownloads}
              </p>
              <p className="mt-1 text-xs text-slate-500">EN & AR in PDF / PNG formats</p>
            </div>
          </section>

          {/* Row 2: Worker Pipeline + Occupation Supply */}
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Pipeline Breakdown */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="font-display text-base font-semibold text-slate-900">
                    Recruitment Pipeline
                  </h2>
                  <p className="text-xs text-slate-500">
                    Live candidate distribution across lifecycle stages.
                  </p>
                </div>
                <Link
                  to="/employee/workers"
                  className="text-xs font-semibold text-sky-700 hover:underline whitespace-nowrap shrink-0"
                >
                  Open Directory
                </Link>
              </div>

              <div className="mt-5 space-y-4">
                {(
                  [
                    {
                      key: 'PUBLISHED',
                      label: 'Published to Saudi Agents',
                      count: data.statusCounts.PUBLISHED,
                      barClass: 'bg-sky-600',
                    },
                    {
                      key: 'DRAFT',
                      label: 'Drafts Pending Completion',
                      count: data.statusCounts.DRAFT,
                      barClass: 'bg-amber-500',
                    },
                    {
                      key: 'CONTRACTED',
                      label: 'Contracted & Placed',
                      count: data.statusCounts.CONTRACTED,
                      barClass: 'bg-emerald-600',
                    },
                    {
                      key: 'UNPUBLISHED',
                      label: 'Unpublished / On Hold',
                      count: data.statusCounts.UNPUBLISHED,
                      barClass: 'bg-slate-400',
                    },
                  ] as const
                ).map((stage) => {
                  const pct =
                    totalWorkers > 0 ? Math.round((stage.count / totalWorkers) * 100) : 0;
                  return (
                    <Link
                      key={stage.key}
                      to={`/employee/workers?status=${stage.key}`}
                      className="block rounded-lg p-2 -mx-2 transition-colors hover:bg-slate-50"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-800">{stage.label}</span>
                        <span className="font-mono-tabular font-semibold text-slate-900">
                          {stage.count} ({pct}%)
                        </span>
                      </div>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${stage.barClass}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Quick Management Links */}
              <div className="mt-6 grid grid-cols-2 gap-2.5 border-t border-slate-100 pt-4">
                <Link
                  to="/admin/companies"
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-slate-500" />
                    <span>Companies & CV</span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                </Link>
                <Link
                  to="/admin/agents"
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2">
                    <UserCheck className="h-3.5 w-3.5 text-slate-500" />
                    <span>Agent Accounts</span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                </Link>
                <Link
                  to="/admin/employees"
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-slate-500" />
                    <span>Dhaka Staff</span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                </Link>
                <Link
                  to="/employee/workers/new"
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2">
                    <UserPlus className="h-3.5 w-3.5 text-slate-500" />
                    <span>New Worker</span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                </Link>
              </div>
            </div>

            {/* Candidate Supply by Occupation */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="font-display text-base font-semibold text-slate-900">
                    Supply by Occupation
                  </h2>
                  <p className="text-xs text-slate-500">
                    Available published candidates vs contracted placements.
                  </p>
                </div>
                <span className="font-mono-tabular text-xs font-medium text-slate-500">
                  {data.occupationBreakdown.length} categories
                </span>
              </div>

              {data.occupationBreakdown.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  No worker records registered yet.
                </div>
              ) : (
                <div className="mt-4 divide-y divide-slate-100">
                  {data.occupationBreakdown.map((occ) => {
                    const widthPct =
                      totalWorkers > 0 ? Math.max(8, Math.round((occ.total / totalWorkers) * 100)) : 0;
                    return (
                      <div key={occ.occupationCode} className="py-3 first:pt-1 last:pb-0">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">
                            {getOccupationLabel(occ.occupationCode, 'EN')}
                          </span>
                          <span className="font-mono-tabular text-slate-600">
                            {occ.published} published · {occ.contracted} contracted ·{' '}
                            <strong className="text-slate-900">{occ.total}</strong> total
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-slate-800"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Row 3: Compliance & Passport Watch + Partner Agency Engagement */}
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Compliance & Readiness Alerts */}
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <div>
                  <h2 className="font-display text-base font-semibold text-slate-900">
                    Compliance & Readiness Alerts
                  </h2>
                  <p className="text-xs text-slate-500">
                    Expiring passports (180d), missing portraits, or incomplete document vaults.
                  </p>
                </div>
                <span className="font-mono-tabular text-xs font-semibold text-slate-700">
                  {data.alerts.length} active
                </span>
              </div>

              {data.alerts.length === 0 ? (
                <div className="flex items-center justify-center gap-2 p-8 text-xs text-slate-500">
                  <ClipboardCheck className="h-4 w-4 text-emerald-600" />
                  <span>All active worker dossiers have valid passports, photos, and compliance scans.</span>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data.alerts.map((alert, idx) => (
                    <div
                      key={`${alert.workerId}-${alert.alertType}-${idx}`}
                      className="flex items-center justify-between gap-4 px-6 py-3.5"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <AlertTriangle
                          className={`mt-0.5 h-4 w-4 shrink-0 ${
                            alert.severity === 'high' ? 'text-red-600' : 'text-amber-600'
                          }`}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-slate-900">
                            <span className="font-mono-tabular">{alert.workerCode}</span> ·{' '}
                            {alert.fullNameEn}
                          </p>
                          <p className="text-xs text-slate-600">{alert.detail}</p>
                        </div>
                      </div>
                      <Link
                        to={`/employee/workers/${alert.workerId}/edit`}
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                      >
                        Review
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Partner Agency Performance */}
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <div>
                  <h2 className="font-display text-base font-semibold text-slate-900">
                    Partner Agency Activity
                  </h2>
                  <p className="text-xs text-slate-500">
                    Active agents, EN/AR CV exports, and contracted hires by company.
                  </p>
                </div>
                <Link
                  to="/admin/companies"
                  className="text-xs font-semibold text-sky-700 hover:underline whitespace-nowrap shrink-0"
                >
                  Manage
                </Link>
              </div>

              {data.companyEngagement.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No Saudi/GCC partner companies registered yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                        <th className="px-5 py-3">Partner Agency</th>
                        <th className="px-4 py-3 text-right">Agents</th>
                        <th className="px-4 py-3 text-right">EN / AR CVs</th>
                        <th className="px-5 py-3 text-right">Hired</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.companyEngagement.map((comp) => (
                        <tr key={comp.id} className="hover:bg-slate-50/70">
                          <td className="px-5 py-3 font-medium text-slate-900">
                            {comp.nameEn}
                            <span className="block text-[11px] font-normal text-slate-500">
                              {comp.country}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono-tabular text-slate-700">
                            {comp.agentCount}
                          </td>
                          <td className="px-4 py-3 text-right font-mono-tabular text-slate-700">
                            {comp.enExports} / {comp.arExports}
                          </td>
                          <td className="px-5 py-3 text-right font-mono-tabular font-semibold text-emerald-700">
                            {comp.contractedCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* Row 4: Recent Partner CV Exports & Recent Audit Events */}
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white lg:col-span-2">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <div>
                  <h2 className="font-display text-base font-semibold text-slate-900">
                    Recent Partner CV Exports
                  </h2>
                  <p className="text-xs text-slate-500">
                    Latest English and Arabic CVs exported by Saudi agents.
                  </p>
                </div>
                <Link
                  to="/admin/logs"
                  className="text-xs font-semibold text-sky-700 hover:underline whitespace-nowrap shrink-0"
                >
                  View All Logs
                </Link>
              </div>

              {data.recentDownloads.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No CV downloads recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                        <th className="px-5 py-3">Worker</th>
                        <th className="px-4 py-3">Saudi Company</th>
                        <th className="px-4 py-3">Agent</th>
                        <th className="px-4 py-3">Format</th>
                        <th className="px-5 py-3 text-right">Downloaded</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.recentDownloads.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/70">
                          <td className="px-5 py-3">
                            <span className="font-mono-tabular font-semibold text-slate-900">
                              {row.workerCode}
                            </span>
                            <span className="block text-slate-600">{row.workerNameEn}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{row.companyNameEn}</td>
                          <td className="px-4 py-3 text-slate-700">{row.agentName}</td>
                          <td className="px-4 py-3 font-mono-tabular font-semibold text-slate-800">
                            {row.language} / {row.format}
                          </td>
                          <td className="px-5 py-3 text-right font-mono-tabular text-slate-500">
                            {new Date(row.downloadedAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Audit Trail */}
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <div>
                  <h2 className="font-display text-base font-semibold text-slate-900">
                    Recent Staff & Admin Activity
                  </h2>
                  <p className="text-xs text-slate-500">Latest audited operations.</p>
                </div>
              </div>

              {data.recentAudits.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No audit entries yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data.recentAudits.map((log) => (
                    <div key={log.id} className="px-5 py-3">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-slate-900">
                          {log.action.replaceAll('_', ' ')}
                        </span>
                        <span className="font-mono-tabular text-[11px] text-slate-400">
                          {new Date(log.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {log.actorName || 'System'} · {log.entityType}
                        {log.entityId ? ` (${log.entityId})` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </DashboardShell>
  );
}
