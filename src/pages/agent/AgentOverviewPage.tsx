import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardShell } from '../../components/layout/DashboardShell';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import { OCCUPATIONS } from '../../lib/cv-dictionary';

interface AgentOverviewData {
  publishedCount: number;
  byOccupation: Record<string, number>;
  customerCount?: number;
  verifiedCustomerCount?: number;
  whatsappSentCount?: number;
  recentDownloads: Array<{
    id: string;
    language: 'EN' | 'AR';
    format: 'PDF' | 'PNG';
    downloadedAt: string;
    workerId: string;
    workerCode: string;
    fullNameEn: string;
    occupationCode: string;
  }>;
}

export function AgentOverviewPage() {
  const { company } = useAuth();
  const [data, setData] = useState<AgentOverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<AgentOverviewData>('/api/agent/overview')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardShell
      title={company ? `${company.nameEn} Portal` : 'International Agent Portal'}
      breadcrumb="Agent / Overview"
      primaryAction={
        <Link
          to="/agent/candidates"
          className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
        >
          Browse Candidates
        </Link>
      }
    >
      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      )}

      {data && (
        <div className="space-y-8">
          {/* Summary KPI Row */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Available Published Candidates</p>
              <p className="mt-2 font-mono-tabular text-3xl font-bold text-slate-900">
                {data.publishedCount}
              </p>
              <p className="mt-1 text-xs text-slate-500">Verified & ready for external selection</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Your Recent CV Exports</p>
              <p className="mt-2 font-mono-tabular text-3xl font-bold text-sky-700">
                {data.recentDownloads.length}
              </p>
              <p className="mt-1 text-xs text-slate-500">Branded with {company?.nameEn}</p>
            </div>

            <Link
              to="/agent/customers"
              className="rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-sky-400"
            >
              <p className="text-xs font-medium text-slate-500">WhatsApp Verified Householders</p>
              <p className="mt-2 font-mono-tabular text-3xl font-bold text-emerald-700">
                {data.verifiedCustomerCount ?? 0}
                <span className="ml-1.5 text-sm font-medium text-slate-400">
                  / {data.customerCount ?? 0}
                </span>
              </p>
              <p className="mt-1 text-xs text-sky-700 hover:underline">Open private directory</p>
            </Link>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">CVs Sent via WhatsApp</p>
              <p className="mt-2 font-mono-tabular text-3xl font-bold text-slate-900">
                {data.whatsappSentCount ?? 0}
              </p>
              <p className="mt-1 text-xs text-slate-500">Dispatched via central sender</p>
            </div>
          </section>

          {/* Occupation Availability Breakdown */}
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Available Candidates by Occupation
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {Object.entries(OCCUPATIONS).map(([code, labels]) => (
                <Link
                  key={code}
                  to={`/agent/candidates?occupation=${code}`}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 transition-colors hover:border-sky-400 hover:bg-sky-50/40"
                >
                  <p className="font-mono-tabular text-2xl font-bold text-slate-900">
                    {data.byOccupation[code] ?? 0}
                  </p>
                  <p className="mt-1 truncate text-xs font-medium text-slate-600">{labels.en}</p>
                </Link>
              ))}
            </div>
          </section>

          {/* Agent Recent Downloads */}
          <section className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="font-display text-base font-semibold text-slate-900">
                Your Recent CV Downloads
              </h2>
            </div>
            {data.recentDownloads.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                You haven&apos;t downloaded any candidate CVs yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.recentDownloads.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 px-6 py-3.5 hover:bg-slate-50"
                  >
                    <div>
                      <Link
                        to={`/agent/candidates/${item.workerId}`}
                        className="text-sm font-semibold text-slate-900 hover:text-sky-700"
                      >
                        {item.fullNameEn}
                      </Link>
                      <p className="text-xs text-slate-500">
                        <span className="font-mono-tabular">{item.workerCode}</span> ·{' '}
                        {OCCUPATIONS[item.occupationCode]?.en || item.occupationCode} ·{' '}
                        <span className="font-mono-tabular font-semibold text-slate-700">
                          {item.language} / {item.format}
                        </span>
                      </p>
                    </div>
                    <span className="font-mono-tabular text-xs text-slate-500">
                      {new Date(item.downloadedAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </DashboardShell>
  );
}
