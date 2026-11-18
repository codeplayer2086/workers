import React, { useEffect, useState } from 'react';
import { DashboardShell } from '../../components/layout/DashboardShell';
import { apiFetch } from '../../lib/api';
import type { AuditLogItem, CvDownloadLogItem } from '../../types/portal';

export function AdminLogsPage() {
  const [tab, setTab] = useState<'downloads' | 'audits'>('downloads');
  const [downloads, setDownloads] = useState<CvDownloadLogItem[]>([]);
  const [audits, setAudits] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ downloads: CvDownloadLogItem[]; audits: AuditLogItem[] }>('/api/admin/logs')
      .then((res) => {
        setDownloads(res.downloads);
        setAudits(res.audits);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardShell title="CV Download & System Audit Logs" breadcrumb="Admin / Activity Logs">
      <div className="space-y-5">
        <div className="inline-flex rounded-lg bg-slate-200/70 p-1">
          <button
            type="button"
            onClick={() => setTab('downloads')}
            className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
              tab === 'downloads' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            CV Downloads ({downloads.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('audits')}
            className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
              tab === 'audits' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            System Audit Trail ({audits.length})
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">Loading logs...</div>
          ) : tab === 'downloads' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="px-6 py-3">Worker Code</th>
                    <th className="px-6 py-3">Candidate</th>
                    <th className="px-6 py-3">Company</th>
                    <th className="px-6 py-3">Agent</th>
                    <th className="px-6 py-3">Language / Format</th>
                    <th className="px-6 py-3 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {downloads.map((d) => (
                    <tr key={d.id}>
                      <td className="px-6 py-3 font-mono-tabular text-xs font-semibold text-slate-900">
                        {d.workerCode}
                      </td>
                      <td className="px-6 py-3 font-medium text-slate-800">{d.workerNameEn}</td>
                      <td className="px-6 py-3 text-slate-600">{d.companyNameEn}</td>
                      <td className="px-6 py-3 text-slate-600">{d.agentName}</td>
                      <td className="px-6 py-3 font-mono-tabular text-xs font-semibold text-sky-700">
                        {d.language} · {d.format}
                      </td>
                      <td className="px-6 py-3 text-right font-mono-tabular text-xs text-slate-500">
                        {new Date(d.downloadedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="px-6 py-3">Action</th>
                    <th className="px-6 py-3">Entity</th>
                    <th className="px-6 py-3">Actor</th>
                    <th className="px-6 py-3">Details</th>
                    <th className="px-6 py-3 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {audits.map((a) => (
                    <tr key={a.id}>
                      <td className="px-6 py-3 font-mono-tabular text-xs font-semibold text-slate-900">
                        {a.action}
                      </td>
                      <td className="px-6 py-3 text-xs text-slate-600">
                        {a.entityType} {a.entityId ? `· ${a.entityId}` : ''}
                      </td>
                      <td className="px-6 py-3 text-slate-700">
                        {a.actorName || 'System'} {a.actorRole ? `(${a.actorRole})` : ''}
                      </td>
                      <td className="px-6 py-3 font-mono-tabular text-xs text-slate-500">
                        {a.metadata ? JSON.stringify(a.metadata) : '—'}
                      </td>
                      <td className="px-6 py-3 text-right font-mono-tabular text-xs text-slate-500">
                        {new Date(a.createdAt).toLocaleString()}
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
