import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import { DashboardShell } from '../../components/layout/DashboardShell';
import { apiFetch } from '../../lib/api';
import { OCCUPATIONS, SKILL_LABELS } from '../../lib/cv-dictionary';
import type { WorkerSummary } from '../../types/portal';

export function AgentCandidatesPage() {
  const [searchParams] = useSearchParams();
  const [candidates, setCandidates] = useState<WorkerSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [occupation, setOccupation] = useState(() => searchParams.get('occupation') || '');
  const [religion, setReligion] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [gender, setGender] = useState('');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [minExp, setMinExp] = useState('');
  const [arabicLevel, setArabicLevel] = useState('');
  const [skill, setSkill] = useState('');

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (occupation) params.set('occupation', occupation);
      if (religion) params.set('religion', religion);
      if (maritalStatus) params.set('maritalStatus', maritalStatus);
      if (gender) params.set('gender', gender);
      if (minAge) params.set('minAge', minAge);
      if (maxAge) params.set('maxAge', maxAge);
      if (minExp) params.set('minExp', minExp);
      if (arabicLevel) params.set('arabicLevel', arabicLevel);
      if (skill) params.set('skill', skill);

      const list = await apiFetch<WorkerSummary[]>(`/api/candidates?${params.toString()}`);
      setCandidates(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCandidates();
  }, [occupation, religion, maritalStatus, gender, arabicLevel, skill, minExp]);

  const handleReset = () => {
    setSearch('');
    setOccupation('');
    setReligion('');
    setMaritalStatus('');
    setGender('');
    setMinAge('');
    setMaxAge('');
    setMinExp('');
    setArabicLevel('');
    setSkill('');
  };

  return (
    <DashboardShell
      title="Available Candidate Catalog"
      breadcrumb="Agent / Candidate Catalog"
    >
      <div className="space-y-6">
        {/* Multi-Criteria Filter Panel */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void loadCandidates();
          }}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <SlidersHorizontal className="h-3.5 w-3.5 text-sky-600" />
              <span>Filter Published Workers</span>
            </h2>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              Reset Filters
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or code..."
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-xs"
              />
            </div>

            <select
              aria-label="Occupation filter"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
            >
              <option value="">All Occupations</option>
              {Object.entries(OCCUPATIONS).map(([code, labels]) => (
                <option key={code} value={code}>
                  {labels.en}
                </option>
              ))}
            </select>

            <select
              aria-label="Religion filter"
              value={religion}
              onChange={(e) => setReligion(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
            >
              <option value="">Any Religion</option>
              <option value="MUSLIM">Muslim</option>
              <option value="NON_MUSLIM">Non-Muslim</option>
            </select>

            <select
              aria-label="Marital status filter"
              value={maritalStatus}
              onChange={(e) => setMaritalStatus(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
            >
              <option value="">Any Marital Status</option>
              <option value="SINGLE">Single</option>
              <option value="MARRIED">Married</option>
              <option value="DIVORCED">Divorced</option>
              <option value="WIDOWED">Widowed</option>
            </select>

            <select
              aria-label="Gender filter"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
            >
              <option value="">Any Gender</option>
              <option value="FEMALE">Female</option>
              <option value="MALE">Male</option>
            </select>

            <select
              aria-label="Arabic proficiency filter"
              value={arabicLevel}
              onChange={(e) => setArabicLevel(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
            >
              <option value="">Any Arabic Level</option>
              <option value="FLUENT">Fluent Arabic</option>
              <option value="BASIC">Basic Arabic</option>
              <option value="NO">No Prior Arabic</option>
            </select>

            <select
              aria-label="Domestic skill filter"
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
            >
              <option value="">Any Specific Skill</option>
              {SKILL_LABELS.map((s) => (
                <option key={s.key} value={s.key}>
                  Has Skill: {s.en}
                </option>
              ))}
            </select>

            <select
              aria-label="Experience years filter"
              value={minExp}
              onChange={(e) => setMinExp(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
            >
              <option value="">Any Experience</option>
              <option value="1">1+ Years Abroad</option>
              <option value="2">2+ Years Abroad</option>
              <option value="4">4+ Years Abroad</option>
            </select>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min={18}
                max={60}
                value={minAge}
                onChange={(e) => setMinAge(e.target.value)}
                placeholder="Min age"
                className="w-1/2 rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
              />
              <input
                type="number"
                min={18}
                max={60}
                value={maxAge}
                onChange={(e) => setMaxAge(e.target.value)}
                placeholder="Max age"
                className="w-1/2 rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
              />
            </div>

            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Apply Filters
            </button>
          </div>
        </form>

        {/* Candidate Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white" />
            ))}
          </div>
        ) : candidates.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <p className="text-sm font-medium text-slate-700">
              No published candidates match the selected criteria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {candidates.map((c) => (
              <article
                key={c.id}
                className="flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="h-28 w-22 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                      {c.facePhotoPath ? (
                        <img
                          src={c.facePhotoPath}
                          alt={c.fullNameEn}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-slate-400">
                          No Photo
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-mono-tabular text-xs font-semibold text-sky-700">
                        {c.workerCode}
                      </p>
                      <h3 className="mt-0.5 truncate font-display text-base font-bold text-slate-900">
                        {c.fullNameEn}
                      </h3>
                      <p className="mt-0.5 text-xs font-medium text-slate-700">
                        {OCCUPATIONS[c.occupationCode]?.en || c.occupationCode}
                      </p>

                      <div className="mt-3 space-y-1 text-xs text-slate-600">
                        <p className="font-mono-tabular">
                          Age {c.age} · {c.religion === 'MUSLIM' ? 'Muslim' : 'Non-Muslim'} ·{' '}
                          {c.maritalStatus.charAt(0) + c.maritalStatus.slice(1).toLowerCase()}
                        </p>
                        <p className="font-mono-tabular">
                          {c.experienceYears > 0
                            ? `${c.experienceYears} yrs GCC / abroad`
                            : 'Fresh candidate'}
                        </p>
                        {c.expectedSalarySar && (
                          <p className="font-mono-tabular font-semibold text-slate-900">
                            {c.expectedSalarySar} SAR / month
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3">
                  <span className="text-xs text-slate-500">EN & AR CV Ready</span>
                  <Link
                    to={`/agent/candidates/${c.id}`}
                    className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
                  >
                    Open Profile & CV
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
