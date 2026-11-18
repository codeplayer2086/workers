import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { DashboardShell } from '../../components/layout/DashboardShell';
import { CVDocumentA4 } from '../../components/cv/CVDocumentA4';
import { CVExportToolbar } from '../../components/cv/CVExportToolbar';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import type { CvLang } from '../../lib/cv-dictionary';
import type { Company, CompanyCvTemplate, WorkerDetail } from '../../types/portal';

export function AgentCandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [candidate, setCandidate] = useState<WorkerDetail | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [template, setTemplate] = useState<CompanyCvTemplate | null>(null);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [previewCompanyId, setPreviewCompanyId] = useState<string>('');
  const [language, setLanguage] = useState<CvLang>('EN');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cvExportRef = useRef<HTMLDivElement | null>(null);

  const loadCandidate = async (targetCompId?: string) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const qs = targetCompId ? `?companyId=${encodeURIComponent(targetCompId)}` : '';
      const res = await apiFetch<{
        candidate: WorkerDetail;
        company: Company | null;
        template: CompanyCvTemplate | null;
      }>(`/api/candidates/${id}${qs}`);
      setCandidate(res.candidate);
      setCompany(res.company);
      setTemplate(res.template);
      if (res.company && !previewCompanyId) {
        setPreviewCompanyId(res.company.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load candidate');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCandidate();
    if (user?.role === 'ADMIN' || user?.role === 'EMPLOYEE') {
      apiFetch<Company[]>('/api/admin/companies')
        .then(setAllCompanies)
        .catch(() => {});
    }
  }, [id]);

  const handleCompanyPreviewChange = (nextCompanyId: string) => {
    setPreviewCompanyId(nextCompanyId);
    void loadCandidate(nextCompanyId);
  };

  return (
    <DashboardShell
      title={candidate ? `${candidate.fullNameEn} — CV Studio` : 'Candidate Profile'}
      breadcrumb="Candidate Profile & Dual-Language CV"
      primaryAction={
        <Link
          to={user?.role === 'AGENT' ? '/agent/candidates' : '/employee/workers'}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Directory</span>
        </Link>
      }
    >
      {loading && <div className="p-8 text-sm text-slate-500">Loading candidate CV...</div>}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {candidate && (
        <div className="space-y-6">
          {/* Optional Company Switcher for Admin / Employee Preview */}
          {(user?.role === 'ADMIN' || user?.role === 'EMPLOYEE') && allCompanies.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3">
              <span className="text-xs font-medium text-slate-600">
                Staff / Admin Preview: Render CV using Saudi Partner Template
              </span>
              <select
                aria-label="Preview Company CV Template"
                value={previewCompanyId}
                onChange={(e) => handleCompanyPreviewChange(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800"
              >
                {allCompanies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameEn}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Language Switcher + PNG / PDF Download Toolbar */}
          <CVExportToolbar
            workerId={candidate.id}
            workerCode={candidate.workerCode}
            companyId={company?.id}
            language={language}
            onLanguageChange={setLanguage}
            cvRef={cvExportRef}
          />

          {/* Responsive Preview Frame around exact 794x1123px A4 Document */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-200/60 p-4 sm:p-8">
            <div className="mx-auto w-fit">
              <CVDocumentA4
                ref={cvExportRef}
                candidate={candidate}
                company={company}
                template={template}
                language={language}
              />
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
