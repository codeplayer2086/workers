import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  CheckCircle2,
  EyeOff,
  FileText,
  LayoutGrid,
  List,
  Pencil,
  Search,
  UserPlus,
} from 'lucide-react';
import { DashboardShell } from '../../components/layout/DashboardShell';
import { apiFetch } from '../../lib/api';
import { OCCUPATIONS } from '../../lib/cv-dictionary';
import type { WorkerSummary } from '../../types/portal';

const STATUS_TABS = ['ALL', 'PUBLISHED', 'DRAFT', 'UNPUBLISHED', 'CONTRACTED'] as const;
type DirectoryViewMode = 'GRID' | 'LIST';

function WorkerStatusBadge({ status }: { status: WorkerSummary['status'] }) {
  if (status === 'PUBLISHED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="h-3 w-3" />
        Published
      </span>
    );
  }
  if (status === 'CONTRACTED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 whitespace-nowrap">
        <Briefcase className="h-3 w-3" />
        Contracted
      </span>
    );
  }
  if (status === 'DRAFT') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 whitespace-nowrap">
        <FileText className="h-3 w-3" />
        Draft
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 whitespace-nowrap">
      <EyeOff className="h-3 w-3" />
      Unpublished
    </span>
  );
}

export function WorkersDirectoryPage() {
  const [workers, setWorkers] = useState<WorkerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [occupationFilter, setOccupationFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<DirectoryViewMode>('GRID');

  const loadWorkers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (occupationFilter) params.set('occupation', occupationFilter);
      if (search.trim()) params.set('search', search.trim());
      const rows = await apiFetch<WorkerSummary[]>(`/api/workers?${params.toString()}`);
      setWorkers(rows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkers();
  }, [statusFilter, occupationFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void loadWorkers();
  };

  return (
    <DashboardShell
      title="Shared Worker Directory"
      breadcrumb="Staff / Worker Directory"
      primaryAction={
        <Link
          to="/employee/workers/new"
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
        >
          <UserPlus className="h-4 w-4" />
          <span>Register Worker</span>
        </Link>
      }
    >
      <div className="space-y-5">
        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  statusFilter === tab
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab === 'ALL' ? 'All Records' : tab}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              aria-label="Filter by occupation"
              value={occupationFilter}
              onChange={(e) => setOccupationFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800"
            >
              <option value="">All Occupations</option>
              {Object.entries(OCCUPATIONS).map(([code, labels]) => (
                <option key={code} value={code}>
                  {labels.en}
                </option>
              ))}
            </select>

            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, code, passport..."
                className="w-52 rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900"
              />
            </form>

            <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('GRID')}
                aria-label="Grid box view"
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  viewMode === 'GRID'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Boxes</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('LIST')}
                aria-label="List table view"
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
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
        </div>

        {/* Directory Boxes / Table */}
        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Loading workers...
          </div>
        ) : workers.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
            <p className="text-sm font-medium text-slate-700">No workers match these filters.</p>
            <Link
              to="/employee/workers/new"
              className="mt-3 inline-block rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
            >
              Register First Worker
            </Link>
          </div>
        ) : viewMode === 'GRID' ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {workers.map((w) => (
              <div
                key={w.id}
                className="flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white transition-colors hover:border-slate-300"
              >
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                      {w.facePhotoPath ? (
                        <img
                          src={w.facePhotoPath}
                          alt={w.fullNameEn}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover object-top"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[11px] font-medium text-slate-400">
                          No Photo
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono-tabular text-[11px] font-semibold text-sky-700">
                          {w.workerCode}
                        </span>
                        <WorkerStatusBadge status={w.status} />
                      </div>
                      <h2 className="mt-1 truncate font-display text-base font-bold text-slate-900">
                        {w.fullNameEn}
                      </h2>
                      {w.fullNameAr && (
                        <p dir="rtl" className="font-arabic truncate text-xs text-slate-600">
                          {w.fullNameAr}
                        </p>
                      )}
                      <p className="mt-1 text-xs font-medium text-slate-700">
                        {OCCUPATIONS[w.occupationCode]?.en || w.occupationCode}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-xs">
                    <div>
                      <p className="text-[11px] text-slate-500">Passport</p>
                      <p className="font-mono-tabular truncate font-semibold text-slate-900">
                        {w.passportNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-500">Age / Exp</p>
                      <p className="font-mono-tabular font-semibold text-slate-900">
                        {w.age}y · {w.experienceYears > 0 ? `${w.experienceYears}y` : 'Fresh'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-500">Docs</p>
                      <p className="font-mono-tabular font-semibold text-slate-900">
                        {w.documentCount ?? 0} {(w.documentCount ?? 0) === 1 ? 'file' : 'files'}
                      </p>
                    </div>
                  </div>

                  {w.status === 'CONTRACTED' && w.contractedCompanyName && (
                    <p className="mt-2 truncate rounded-md border border-sky-100 bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-800">
                      Hired by: {w.contractedCompanyName}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3">
                  <Link
                    to={`/agent/candidates/${w.id}`}
                    className="inline-flex flex-1 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                  >
                    Profile & CV
                  </Link>
                  <Link
                    to={`/employee/workers/${w.id}/edit`}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="px-5 py-3">Candidate</th>
                    <th className="px-5 py-3">Passport</th>
                    <th className="px-5 py-3">Occupation</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Docs</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workers.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                            {w.facePhotoPath && (
                              <img
                                src={w.facePhotoPath}
                                alt={w.fullNameEn}
                                referrerPolicy="no-referrer"
                                className="h-full w-full object-cover object-top"
                              />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{w.fullNameEn}</p>
                            <p className="font-mono-tabular text-xs text-slate-500">
                              {w.workerCode} · {w.age} yrs · {w.religion}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-mono-tabular text-xs font-medium text-slate-700">
                        {w.passportNumber}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-700">
                        {OCCUPATIONS[w.occupationCode]?.en || w.occupationCode}
                        <span className="block text-[11px] text-slate-500">
                          {w.experienceYears > 0 ? `${w.experienceYears} yrs exp` : 'Fresh'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs">
                        <WorkerStatusBadge status={w.status} />
                        {w.status === 'CONTRACTED' && w.contractedCompanyName && (
                          <span className="mt-1 block text-[11px] font-normal text-slate-500">
                            {w.contractedCompanyName}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 font-mono-tabular text-xs text-slate-600">
                        {w.documentCount ?? 0} {(w.documentCount ?? 0) === 1 ? 'file' : 'files'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            to={`/agent/candidates/${w.id}`}
                            className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          >
                            Profile & CV
                          </Link>
                          <Link
                            to={`/employee/workers/${w.id}/edit`}
                            className="rounded-md bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800"
                          >
                            Edit
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
