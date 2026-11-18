import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  FileImage,
  FileText,
  Maximize2,
  MessageCircle,
  X,
} from 'lucide-react';
import { DashboardShell } from '../../components/layout/DashboardShell';
import { CVDocumentA4 } from '../../components/cv/CVDocumentA4';
import { SendCvWhatsAppModal } from '../../components/cv/SendCvWhatsAppModal';
import { PrivateImage } from '../../components/common/PrivateImage';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import { generateCvExportPayload } from '../../lib/cv-renderer';
import {
  calculateAge,
  CV_LABELS,
  getCountryLabel,
  getEducationLabel,
  getLanguageLevelLabel,
  getMaritalStatusLabel,
  getNationalityLabel,
  getOccupationLabel,
  getReligionLabel,
  getSkillValueLabel,
  PROFILE_LABELS,
  SKILL_LABELS,
  type CvLang,
} from '../../lib/cv-dictionary';
import { triggerBlobDownload } from '../../lib/private-file';
import type { Company, CompanyCvTemplate, WorkerDetail } from '../../types/portal';

function formatDisplayDate(val: string | null | undefined, lang: CvLang): string {
  if (!val) return PROFILE_LABELS[lang].notSpecified;
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return PROFILE_LABELS[lang].notSpecified;
  return d.toLocaleDateString(lang === 'AR' ? 'ar-SA-u-nu-latn' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function AgentCandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [candidate, setCandidate] = useState<WorkerDetail | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [template, setTemplate] = useState<CompanyCvTemplate | null>(null);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [previewCompanyId, setPreviewCompanyId] = useState<string>('');
  const [language, setLanguage] = useState<CvLang>('EN');
  const [viewMode, setViewMode] = useState<'PROFILE' | 'CV'>('PROFILE');
  const [enlargedPhoto, setEnlargedPhoto] = useState<{ src: string; label: string } | null>(null);
  const [exporting, setExporting] = useState<'PNG' | 'PDF' | null>(null);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
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

  const recordLog = async (format: 'PDF' | 'PNG') => {
    if (!candidate) return;
    try {
      await apiFetch('/api/cv/log', {
        method: 'POST',
        body: JSON.stringify({
          workerId: candidate.id,
          language,
          format,
          companyId: company?.id,
        }),
      });
    } catch {
      // Non-blocking audit log
    }
  };

  const handleDownloadPng = async () => {
    const node = cvExportRef.current;
    if (!node || !candidate) return;
    setExporting('PNG');
    setStatusNote(null);
    setExportError(null);
    try {
      const payload = await generateCvExportPayload(node, candidate.workerCode, language, 'PNG');
      triggerBlobDownload(payload.blob, payload.fileName);
      await recordLog('PNG');
      setStatusNote(`Downloaded ${payload.fileName}`);
    } catch (err) {
      setExportError(
        err instanceof Error && err.message
          ? `PNG export failed: ${err.message}`
          : 'PNG export failed. Please reload and try again.'
      );
    } finally {
      setExporting(null);
    }
  };

  const handleDownloadPdf = async () => {
    const node = cvExportRef.current;
    if (!node || !candidate) return;
    setExporting('PDF');
    setStatusNote(null);
    setExportError(null);
    try {
      const payload = await generateCvExportPayload(node, candidate.workerCode, language, 'PDF');
      triggerBlobDownload(payload.blob, payload.fileName);
      await recordLog('PDF');
      setStatusNote(`Downloaded ${payload.fileName}`);
    } catch (err) {
      setExportError(
        err instanceof Error && err.message
          ? `PDF export failed: ${err.message}`
          : 'PDF export failed. Please reload and try again.'
      );
    } finally {
      setExporting(null);
    }
  };

  const isAr = language === 'AR';
  const pl = PROFILE_LABELS[language];
  const cvl = CV_LABELS[language];
  const age = candidate ? candidate.age ?? calculateAge(candidate.dateOfBirth) : 0;

  const displayName = candidate
    ? isAr
      ? candidate.fullNameAr || candidate.fullNameEn
      : candidate.fullNameEn
    : '';
  const displayBirthPlace = candidate
    ? isAr
      ? candidate.placeOfBirthAr || candidate.placeOfBirthEn || pl.notSpecified
      : candidate.placeOfBirthEn || pl.notSpecified
    : '';
  const displayNotes = candidate
    ? isAr
      ? candidate.notesAr || candidate.notesEn || pl.notSpecified
      : candidate.notesEn || pl.notSpecified
    : '';

  const availabilityLabel = candidate
    ? candidate.status === 'PUBLISHED'
      ? pl.availableNow
      : candidate.status === 'CONTRACTED'
        ? pl.contractedLabel
        : candidate.status === 'DRAFT'
          ? pl.draftLabel
          : pl.unpublishedLabel
    : '';

  const visible = template?.visibleFields ?? {
    height: true,
    weight: true,
    children: true,
    notes: true,
    education: true,
    placeOfBirth: true,
  };

  return (
    <DashboardShell
      title={candidate ? `${displayName} (${candidate.workerCode})` : 'Candidate Profile'}
      breadcrumb="Candidate Profile & Dual-Language CV"
      primaryAction={
        <Link
          to={user?.role === 'AGENT' ? '/agent/candidates' : '/employee/workers'}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{pl.backToDirectory}</span>
        </Link>
      }
    >
      {loading && <div className="p-8 text-sm text-slate-500">Loading candidate dossier...</div>}

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {candidate && (
        <div className="space-y-6">
          {/* Staff / Admin Template Switcher */}
          {(user?.role === 'ADMIN' || user?.role === 'EMPLOYEE') && allCompanies.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3">
              <span className="text-xs font-medium text-slate-600">
                Staff / Admin Preview: Render Profile & CV using Saudi Partner Template
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

          {/* Unified Top Toolbar: View Switcher + EN/AR Language Switcher + PDF/PNG Export */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-3.5">
            <div className="flex flex-wrap items-center gap-3">
              {/* Profile vs A4 CV View Toggle */}
              <div
                role="group"
                aria-label="Candidate Display Mode"
                className="inline-flex rounded-lg bg-slate-100 p-1"
              >
                <button
                  type="button"
                  onClick={() => setViewMode('PROFILE')}
                  className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    viewMode === 'PROFILE'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {pl.profileView}
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('CV')}
                  className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    viewMode === 'CV'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {pl.cvPreview}
                </button>
              </div>

              {/* Strict EN / AR Profile & CV Language Toggle */}
              <div
                role="group"
                aria-label="CV Language Switcher"
                className="inline-flex rounded-lg bg-slate-100 p-1"
              >
                <button
                  type="button"
                  onClick={() => setLanguage('EN')}
                  className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    language === 'EN'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('AR')}
                  className={`font-arabic rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    language === 'AR'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  العربية
                </button>
              </div>
            </div>

            {/* Direct PNG / PDF Export Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              {exportError && (
                <span role="alert" className="text-xs font-medium text-red-600">
                  {exportError}
                </span>
              )}
              {!exportError && statusNote && (
                <span className="text-xs font-medium text-emerald-700">{statusNote}</span>
              )}
              {user?.role === 'AGENT' && (
                <button
                  type="button"
                  onClick={() => setWhatsappModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-600 bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 whitespace-nowrap shrink-0"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Send via WhatsApp</span>
                </button>
              )}

              <button
                type="button"
                disabled={exporting !== null}
                onClick={handleDownloadPng}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <FileImage className="h-4 w-4 text-sky-600" />
                <span>{exporting === 'PNG' ? 'Rendering PNG...' : 'Download PNG'}</span>
              </button>

              <button
                type="button"
                disabled={exporting !== null}
                onClick={handleDownloadPdf}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {exporting === 'PDF' ? (
                  <Download className="h-4 w-4 animate-bounce" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                <span>{exporting === 'PDF' ? 'Generating PDF...' : 'Download PDF'}</span>
              </button>
            </div>
          </div>

          {/* MODE 1: Structured 2-Column Candidate Profile Dossier (EN / AR) */}
          {viewMode === 'PROFILE' && (
            <div
              dir={isAr ? 'rtl' : 'ltr'}
              className={`grid grid-cols-1 gap-6 lg:grid-cols-12 ${isAr ? 'font-arabic' : ''}`}
            >
              {/* Left Summary Column (Face Photo + Key Quick Facts + Full-Body Portrait) */}
              <aside className="space-y-5 lg:col-span-4">
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <div className="flex flex-col items-center text-center">
                    <button
                      type="button"
                      onClick={() =>
                        candidate.facePhotoPath &&
                        setEnlargedPhoto({
                          src: candidate.facePhotoPath,
                          label: `${displayName} — ${cvl.facePhotoLabel}`,
                        })
                      }
                      className="group relative h-44 w-36 overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                    >
                      {candidate.facePhotoPath ? (
                        <PrivateImage
                          src={candidate.facePhotoPath}
                          alt={`${displayName} portrait`}
                          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-slate-400">
                          No photo
                        </div>
                      )}
                    </button>

                    <h2 className="mt-4 font-display text-xl font-bold text-slate-900">
                      {displayName}
                    </h2>
                    <p className="mt-1 font-mono-tabular text-xs font-semibold text-sky-700">
                      {candidate.workerCode}
                    </p>
                  </div>

                  {/* Quick-Fact Key-Value List */}
                  <dl className="mt-6 divide-y divide-slate-100 border-t border-slate-100 text-xs">
                    <div className="flex items-center justify-between py-2.5">
                      <dt className="text-slate-500">{cvl.age}</dt>
                      <dd className="font-semibold text-slate-900 tabular-nums">
                        {age} {cvl.yearsOld}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between py-2.5">
                      <dt className="text-slate-500">{cvl.nationality}</dt>
                      <dd className="font-semibold text-slate-900">
                        {getNationalityLabel(candidate.nationality, candidate.gender, language)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between py-2.5">
                      <dt className="text-slate-500">{cvl.religion}</dt>
                      <dd className="font-semibold text-slate-900">
                        {getReligionLabel(candidate.religion, candidate.gender, language)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between py-2.5">
                      <dt className="text-slate-500">{cvl.maritalStatus}</dt>
                      <dd className="font-semibold text-slate-900">
                        {getMaritalStatusLabel(candidate.maritalStatus, candidate.gender, language)}
                      </dd>
                    </div>
                    {visible.children && (
                      <div className="flex items-center justify-between py-2.5">
                        <dt className="text-slate-500">{cvl.children}</dt>
                        <dd className="font-semibold text-slate-900 tabular-nums">
                          {candidate.childrenCount}
                        </dd>
                      </div>
                    )}
                    {visible.height && (
                      <div className="flex items-center justify-between py-2.5">
                        <dt className="text-slate-500">{cvl.height}</dt>
                        <dd className="font-semibold text-slate-900 tabular-nums">
                          {candidate.heightCm ? `${candidate.heightCm} ${cvl.cm}` : pl.notSpecified}
                        </dd>
                      </div>
                    )}
                    {visible.weight && (
                      <div className="flex items-center justify-between py-2.5">
                        <dt className="text-slate-500">{cvl.weight}</dt>
                        <dd className="font-semibold text-slate-900 tabular-nums">
                          {candidate.weightKg ? `${candidate.weightKg} ${cvl.kg}` : pl.notSpecified}
                        </dd>
                      </div>
                    )}
                    {template?.showSalary !== false && (
                      <div className="flex items-center justify-between py-2.5">
                        <dt className="text-slate-500">{cvl.monthlySalary}</dt>
                        <dd className="font-semibold text-slate-900 tabular-nums">
                          {candidate.expectedSalarySar
                            ? `${candidate.expectedSalarySar} ${cvl.sarPerMonth}`
                            : cvl.negotiable}
                        </dd>
                      </div>
                    )}
                    <div className="flex items-center justify-between py-2.5">
                      <dt className="text-slate-500">{cvl.agencyCode}</dt>
                      <dd className="font-mono-tabular font-semibold text-slate-900">
                        {candidate.agencyCode}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Mandatory Full-Body Standing Portrait (No Raw Documents for Agents) */}
                {candidate.fullBodyPhotoPath && (
                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-slate-800">{pl.fullBodyPortrait}</h3>
                      <button
                        type="button"
                        onClick={() =>
                          setEnlargedPhoto({
                            src: candidate.fullBodyPhotoPath!,
                            label: `${displayName} — ${pl.fullBodyPortrait}`,
                          })
                        }
                        className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:underline"
                      >
                        <Maximize2 className="h-3.5 w-3.5" />
                        <span>{pl.clickToEnlarge}</span>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setEnlargedPhoto({
                          src: candidate.fullBodyPhotoPath!,
                          label: `${displayName} — ${pl.fullBodyPortrait}`,
                        })
                      }
                      className="block w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                    >
                      <PrivateImage
                        src={candidate.fullBodyPhotoPath}
                        alt={`${displayName} full-body standing`}
                        className="h-80 w-full object-cover object-top"
                      />
                    </button>
                  </div>
                )}
              </aside>

              {/* Right Structured Sections (Matching Reference Card Layout) */}
              <div className="space-y-5 lg:col-span-8">
                {/* 1. Basic Info */}
                <section className="rounded-xl border border-slate-200 bg-white p-6">
                  <h3 className="font-display text-base font-bold text-slate-900">{pl.basicInfo}</h3>
                  <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-slate-500">{pl.candidateIdNo}</dt>
                      <dd className="mt-1 font-mono-tabular text-sm font-semibold text-slate-900">
                        {candidate.workerCode}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">{pl.designation}</dt>
                      <dd className="mt-1 text-sm font-semibold text-slate-900">
                        {getOccupationLabel(candidate.occupationCode, language)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">{cvl.age}</dt>
                      <dd className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">
                        {age} {cvl.yearsOld}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">{pl.availability}</dt>
                      <dd
                        className={`mt-1 text-sm font-semibold ${
                          candidate.status === 'PUBLISHED'
                            ? 'text-emerald-700'
                            : candidate.status === 'CONTRACTED'
                              ? 'text-sky-700'
                              : 'text-slate-700'
                        }`}
                      >
                        {availabilityLabel}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">{cvl.dateOfBirth}</dt>
                      <dd className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">
                        {formatDisplayDate(candidate.dateOfBirth, language)}
                      </dd>
                    </div>
                    {visible.placeOfBirth && (
                      <div>
                        <dt className="text-xs text-slate-500">{cvl.placeOfBirth}</dt>
                        <dd className="mt-1 text-sm font-semibold text-slate-900">
                          {displayBirthPlace}
                        </dd>
                      </div>
                    )}
                  </dl>
                </section>

                {/* 2. Identification & Travel Details */}
                {template?.showPassportNumber !== false && (
                  <section className="rounded-xl border border-slate-200 bg-white p-6">
                    <h3 className="font-display text-base font-bold text-slate-900">
                      {pl.identificationDetails}
                    </h3>
                    <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                      <div>
                        <dt className="text-xs text-slate-500">{cvl.passportNumber}</dt>
                        <dd className="mt-1 font-mono-tabular text-sm font-semibold text-slate-900">
                          {candidate.passportNumber}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">{cvl.passportExpiryDate}</dt>
                        <dd className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">
                          {formatDisplayDate(candidate.passportExpiryDate, language)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">{cvl.passportIssueDate}</dt>
                        <dd className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">
                          {formatDisplayDate(candidate.passportIssueDate, language)}
                        </dd>
                      </div>
                      {template?.showBorderAndIqama !== false && (
                        <>
                          <div>
                            <dt className="text-xs text-slate-500">{cvl.iqamaNumber}</dt>
                            <dd className="mt-1 font-mono-tabular text-sm font-semibold text-slate-900">
                              {candidate.iqamaNumber || pl.notSpecified}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-slate-500">{cvl.borderNumber}</dt>
                            <dd className="mt-1 font-mono-tabular text-sm font-semibold text-slate-900">
                              {candidate.borderNumber || pl.notSpecified}
                            </dd>
                          </div>
                        </>
                      )}
                    </dl>
                  </section>
                )}

                {/* 3. Education & Experience */}
                <section className="rounded-xl border border-slate-200 bg-white p-6">
                  <h3 className="font-display text-base font-bold text-slate-900">
                    {pl.educationAndExperience}
                  </h3>
                  <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                    {visible.education && (
                      <div>
                        <dt className="text-xs text-slate-500">{pl.highestQualifications}</dt>
                        <dd className="mt-1 text-sm font-semibold text-slate-900">
                          {getEducationLabel(candidate.educationCode, language)}
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-xs text-slate-500">{pl.employmentHistory}</dt>
                      <dd className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">
                        {candidate.experienceYears > 0
                          ? `${getOccupationLabel(candidate.occupationCode, language)} · ${candidate.experienceYears} ${cvl.yearsLabel}`
                          : cvl.freshCandidate}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-slate-500">{pl.experienceLocation}</dt>
                      <dd className="mt-1 text-sm font-semibold text-slate-900">
                        {candidate.previousCountries && candidate.previousCountries.length > 0
                          ? candidate.previousCountries
                              .map(
                                (item) =>
                                  `${getCountryLabel(item.countryCode, language)} (${item.years} ${cvl.yearsLabel})`
                              )
                              .join(' · ')
                          : cvl.noPreviousAbroad}
                      </dd>
                    </div>
                  </dl>
                </section>

                {/* 4. Skills & Language Proficiency */}
                <section className="rounded-xl border border-slate-200 bg-white p-6">
                  <h3 className="font-display text-base font-bold text-slate-900">
                    {pl.skillsAndKnowledge}
                  </h3>

                  <div className="mt-4 grid grid-cols-1 gap-4 border-b border-slate-100 pb-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-slate-500">{cvl.arabicLanguage}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {getLanguageLevelLabel(candidate.arabicLevel, language)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">{cvl.englishLanguage}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {getLanguageLevelLabel(candidate.englishLevel, language)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-2.5 sm:grid-cols-2">
                    {SKILL_LABELS.map((skill) => {
                      const val =
                        candidate.skillsMatrix[skill.key as keyof typeof candidate.skillsMatrix];
                      return (
                        <div
                          key={skill.key}
                          className="flex items-center justify-between border-b border-slate-100 py-2 text-xs"
                        >
                          <span className="font-medium text-slate-700">
                            {isAr ? skill.ar : skill.en}
                          </span>
                          <span
                            className={`font-semibold ${
                              val === 'YES'
                                ? 'text-emerald-700'
                                : val === 'WILLING'
                                  ? 'text-sky-700'
                                  : 'text-slate-400'
                            }`}
                          >
                            {getSkillValueLabel(val, candidate.gender, language)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* 5. Evaluator Notes & Remarks */}
                {visible.notes && (
                  <section className="rounded-xl border border-slate-200 bg-white p-6">
                    <h3 className="font-display text-base font-bold text-slate-900">
                      {pl.interviewerNotes}
                    </h3>
                    <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                      {displayNotes}
                    </p>
                  </section>
                )}
              </div>
            </div>
          )}

          {/* MODE 2 (or offscreen capture target): Exact 794x1123px A4 CV Document */}
          <div
            className={
              viewMode === 'CV'
                ? 'overflow-x-auto rounded-xl border border-slate-200 bg-slate-200/60 p-4 sm:p-8'
                : 'pointer-events-none fixed -left-[9999px] top-0 opacity-100'
            }
            aria-hidden={viewMode !== 'CV'}
          >
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

      {/* Photo Enlarge Lightbox Modal */}
      {enlargedPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={enlargedPhoto.label}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 p-4"
          onClick={() => setEnlargedPhoto(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-xl overflow-hidden rounded-xl bg-white p-3 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between px-2">
              <p className="text-xs font-semibold text-slate-800">{enlargedPhoto.label}</p>
              <button
                type="button"
                onClick={() => setEnlargedPhoto(null)}
                aria-label={pl.closePreview}
                className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <PrivateImage
              src={enlargedPhoto.src}
              alt={enlargedPhoto.label}
              className="max-h-[78vh] w-auto rounded-lg object-contain"
            />
          </div>
        </div>
      )}
      {/* Send CV via WhatsApp Modal */}
      {candidate && user?.role === 'AGENT' && (
        <SendCvWhatsAppModal
          isOpen={whatsappModalOpen}
          onClose={() => setWhatsappModalOpen(false)}
          worker={candidate}
          companyOverride={company}
          templateOverride={template}
          initialLanguage={language}
          onSent={() => {
            setStatusNote(`WhatsApp CV dispatch logged for ${candidate.workerCode}`);
          }}
        />
      )}
    </DashboardShell>
  );
}
