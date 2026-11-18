import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardShell } from '../../components/layout/DashboardShell';
import { apiFetch } from '../../lib/api';
import type { CvDownloadLogItem } from '../../types/portal';

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

  return (
    <DashboardShell
      title="Executive Overview"
      breadcrumb="Admin / Overview"
      primaryAction={
        <Link
          to="/admin/agents"
          className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
        >
          Provision Agent
        </Link>
      }
    >
      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-8">
          {/* KPI Strip */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Published Candidates</p>
              <p className="mt-2 font-mono-tabular text-3xl font-bold text-slate-900">
                {data.statusCounts.PUBLISHED}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {data.statusCounts.total} total · {data.statusCounts.DRAFT} drafts
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Contracted Placements</p>
              <p className="mt-2 font-mono-tabular text-3xl font-bold text-emerald-700">
                {data.statusCounts.CONTRACTED}
              </p>
              <p className="mt-1 text-xs text-slate-500">Hidden from other international agents</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Partner Companies & Agents</p>
              <p className="mt-2 font-mono-tabular text-3xl font-bold text-slate-900">
                {data.companyCount} / {data.agentCount}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {data.employeeCount} Dhaka staff accounts
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

          {/* Recent CV Download Activity */}
          <section className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900">
                  Recent Partner CV Exports
                </h2>
                <p className="text-xs text-slate-500">
                  Audit record of English and Arabic CVs downloaded by Saudi agents.
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
              <div className="p-8 text-center text-sm text-slate-500">
                No CV downloads recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                      <th className="px-6 py-3">Worker Code</th>
                      <th className="px-6 py-3">Candidate</th>
                      <th className="px-6 py-3">Saudi Company</th>
                      <th className="px-6 py-3">Agent</th>
                      <th className="px-6 py-3">Format</th>
                      <th className="px-6 py-3 text-right">Downloaded</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.recentDownloads.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/70">
                        <td className="px-6 py-3 font-mono-tabular text-xs font-semibold text-slate-900">
                          {row.workerCode}
                        </td>
                        <td className="px-6 py-3 font-medium text-slate-800">{row.workerNameEn}</td>
                        <td className="px-6 py-3 text-slate-600">{row.companyNameEn}</td>
                        <td className="px-6 py-3 text-slate-600">{row.agentName}</td>
                        <td className="px-6 py-3 font-mono-tabular text-xs font-medium text-slate-800">
                          {row.language} / {row.format}
                        </td>
                        <td className="px-6 py-3 text-right font-mono-tabular text-xs text-slate-500">
                          {new Date(row.downloadedAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </DashboardShell>
  );
}
