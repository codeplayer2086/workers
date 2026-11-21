import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardShell } from '../../components/layout/DashboardShell';
import { PrivateImage } from '../../components/common/PrivateImage';
import { apiFetch } from '../../lib/api';
import { OCCUPATIONS } from '../../lib/cv-dictionary';

interface EmployeeOverviewData {
  counts: {
    total: number;
    DRAFT: number;
    PUBLISHED: number;
    UNPUBLISHED: number;
    CONTRACTED: number;
  };
  recentWorkers: Array<{
    id: string;
    workerCode: string;
    fullNameEn: string;
    occupationCode: string;
    status: string;
    facePhotoPath: string | null;
    updatedAt: string;
  }>;
}

export function EmployeeOverviewPage() {
  const [data, setData] = useState<EmployeeOverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<EmployeeOverviewData>('/api/employee/overview')
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load worker summary'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardShell
      title="Dhaka Operations Overview"
      breadcrumb="Employee / Overview"
      primaryAction={
        <Link
          to="/employee/workers/new"
          className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
        >
          Register Worker
        </Link>
      }
    >
      {error && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      )}

      {data && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Drafts (Incomplete)</p>
              <p className="mt-2 font-mono-tabular text-3xl font-bold text-amber-700">
                {data.counts.DRAFT}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Published to Agents</p>
              <p className="mt-2 font-mono-tabular text-3xl font-bold text-emerald-700">
                {data.counts.PUBLISHED}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Unpublished (Hidden)</p>
              <p className="mt-2 font-mono-tabular text-3xl font-bold text-slate-700">
                {data.counts.UNPUBLISHED}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Contracted Placements</p>
              <p className="mt-2 font-mono-tabular text-3xl font-bold text-sky-700">
                {data.counts.CONTRACTED}
              </p>
            </div>
          </div>

          <section className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="font-display text-base font-semibold text-slate-900">
                Recently Updated Worker Records
              </h2>
              <Link
                to="/employee/workers"
                className="text-xs font-semibold text-sky-700 hover:underline"
              >
                Open Shared Directory
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {data.recentWorkers.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between gap-4 px-6 py-3.5 hover:bg-slate-50/70"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                      {w.facePhotoPath && (
                        <PrivateImage
                          src={w.facePhotoPath}
                          alt={w.fullNameEn}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{w.fullNameEn}</p>
                      <p className="text-xs text-slate-500">
                        <span className="font-mono-tabular">{w.workerCode}</span> ·{' '}
                        {OCCUPATIONS[w.occupationCode]?.en || w.occupationCode} ·{' '}
                        <span className="font-semibold text-slate-700">{w.status}</span>
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/employee/workers/${w.id}/edit`}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Manage
                  </Link>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </DashboardShell>
  );
}
