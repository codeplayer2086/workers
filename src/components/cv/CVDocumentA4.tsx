import React from 'react';
import {
  calculateAge,
  CV_LABELS,
  getCountryLabel,
  getEducationLabel,
  getGenderLabel,
  getLanguageLevelLabel,
  getMaritalStatusLabel,
  getNationalityLabel,
  getOccupationLabel,
  getReligionLabel,
  getSkillValueLabel,
  SKILL_LABELS,
  type CvLang,
} from '../../lib/cv-dictionary';
import type { Company, CompanyCvTemplate, WorkerDetail } from '../../types/portal';
import { PrivateImage } from '../common/PrivateImage';

function formatDate(dateVal: string | null | undefined, lang: CvLang): string {
  if (!dateVal) return '—';
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return '—';
  if (lang === 'AR') {
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export const CVDocumentA4 = React.forwardRef<
  HTMLDivElement,
  {
    candidate: WorkerDetail;
    company: Company | null;
    template: CompanyCvTemplate | null;
    language: CvLang;
  }
>(function CVDocumentA4({ candidate, company, template, language }, ref) {
  const isArabic = language === 'AR';
  const labels = CV_LABELS[language];

  const primaryColor = template?.primaryColor || '#0F172A';
  const secondaryColor = template?.secondaryColor || '#F1F5F9';
  const accentColor = template?.accentColor || '#0284C7';
  const showPassport = template?.showPassportNumber ?? true;
  const showSalary = template?.showSalary ?? true;
  const showBorderIqama = template?.showBorderAndIqama ?? true;
  const visible = template?.visibleFields ?? {
    height: true,
    weight: true,
    children: true,
    notes: true,
    education: true,
    placeOfBirth: true,
  };

  const companyName = isArabic
    ? company?.nameAr || 'الوكالة الدولية للاستقدام'
    : company?.nameEn || 'International Recruitment Agency';

  const headerSubtitle = isArabic
    ? template?.headerTextAr || labels.cvTitle
    : template?.headerTextEn || labels.cvTitle;

  const footerText = isArabic
    ? template?.footerTextAr || ''
    : template?.footerTextEn || '';

  const candidateName = isArabic
    ? candidate.fullNameAr || candidate.fullNameEn
    : candidate.fullNameEn;

  const placeOfBirth = isArabic
    ? candidate.placeOfBirthAr || candidate.placeOfBirthEn || '—'
    : candidate.placeOfBirthEn || '—';

  const notes = isArabic
    ? candidate.notesAr || candidate.notesEn || ''
    : candidate.notesEn || '';

  const age = candidate.age ?? calculateAge(candidate.dateOfBirth);
  const previousCountries = Array.isArray(candidate.previousCountries)
    ? candidate.previousCountries
    : [];

  return (
    <div
      ref={ref}
      dir={isArabic ? 'rtl' : 'ltr'}
      data-testid="cv-a4-document"
      data-cv-lang={language}
      style={{ width: '794px', height: '1123px', backgroundColor: '#ffffff' }}
      className={`relative flex flex-col justify-between overflow-hidden border border-slate-300 text-slate-900 shadow-sm ${
        isArabic ? 'font-arabic' : ''
      }`}
    >
      {/* Top Branded Header */}
      <div>
        <div
          style={{ backgroundColor: primaryColor }}
          className="flex items-center justify-between px-7 py-5 text-white"
        >
          <div className="flex items-center gap-4">
            {company?.logoPath && (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-1">
                <PrivateImage
                  src={company.logoPath}
                  alt={companyName}
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-contain"
                />
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold leading-tight text-white">{companyName}</h2>
              <p className="mt-1 text-xs text-slate-200">{headerSubtitle}</p>
            </div>
          </div>

          <div className={isArabic ? 'text-left' : 'text-right'}>
            <p className="text-[11px] uppercase tracking-wide text-slate-300">{labels.refCode}</p>
            <p className="font-mono-tabular text-base font-bold text-white">
              {candidate.workerCode}
            </p>
            <p
              style={{ color: '#bae6fd' }}
              className="mt-0.5 text-xs font-semibold"
            >
              {getOccupationLabel(candidate.occupationCode, language)}
            </p>
          </div>
        </div>

        {/* Accent Stripe */}
        <div style={{ backgroundColor: accentColor, height: '4px' }} />

        {/* Candidate Identity + Face Photo Banner */}
        <div
          style={{ backgroundColor: secondaryColor }}
          className="flex items-center justify-between gap-6 border-b border-slate-200 px-7 py-4"
        >
          <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
            <div className="col-span-2">
              <p className="text-[11px] font-medium text-slate-500">{labels.fullName}</p>
              <p className="text-xl font-bold text-slate-900">{candidateName}</p>
            </div>

            <div>
              <p className="text-[11px] font-medium text-slate-500">{labels.appliedPosition}</p>
              <p className="font-semibold text-slate-900">
                {getOccupationLabel(candidate.occupationCode, language)}
              </p>
            </div>

            {showSalary && (
              <div>
                <p className="text-[11px] font-medium text-slate-500">{labels.monthlySalary}</p>
                <p className="font-mono-tabular font-bold text-slate-900">
                  {candidate.expectedSalarySar
                    ? `${candidate.expectedSalarySar} ${labels.sarPerMonth}`
                    : labels.negotiable}
                </p>
              </div>
            )}

            <div>
              <p className="text-[11px] font-medium text-slate-500">{labels.nationality}</p>
              <p className="font-medium text-slate-800">
                {getNationalityLabel(candidate.nationality, candidate.gender, language)}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-medium text-slate-500">{labels.religion}</p>
              <p className="font-medium text-slate-800">
                {getReligionLabel(candidate.religion, candidate.gender, language)}
              </p>
            </div>
          </div>

          {/* Mandatory Passport Face Photo */}
          <div className="shrink-0 text-center">
            <div className="h-[146px] w-[114px] overflow-hidden rounded border border-slate-300 bg-white p-1">
              {candidate.facePhotoPath ? (
                <PrivateImage
                  src={candidate.facePhotoPath}
                  alt={labels.facePhotoLabel}
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-100 text-[10px] text-slate-400">
                  {labels.facePhotoLabel}
                </div>
              )}
            </div>
            <p className="mt-1 text-[10px] font-medium text-slate-500">{labels.facePhotoLabel}</p>
          </div>
        </div>

        {/* Main Body: Two-Column Split (Structured Tables + Full-Body Standing Photo) */}
        <div className="grid grid-cols-12 gap-5 px-7 py-4">
          {/* Structured Details Tables (8 cols) */}
          <div className="col-span-8 space-y-4">
            {/* Personal Details */}
            <section>
              <h3
                style={{ color: primaryColor, borderColor: accentColor }}
                className="mb-2 border-b pb-1 text-xs font-bold tracking-wide"
              >
                {labels.personalDetails}
              </h3>
              <table className="w-full border-collapse text-xs">
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="w-1/4 py-1.5 font-medium text-slate-500">{labels.dateOfBirth}</td>
                    <td className="w-1/4 py-1.5 font-mono-tabular font-semibold text-slate-900">
                      <span dir="ltr" className="inline-block">
                        {formatDate(candidate.dateOfBirth, language)}
                      </span>
                    </td>
                    <td className="w-1/4 py-1.5 font-medium text-slate-500">{labels.age}</td>
                    <td className="w-1/4 py-1.5 font-mono-tabular font-semibold text-slate-900">
                      {age} {labels.yearsOld}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-1.5 font-medium text-slate-500">{labels.gender}</td>
                    <td className="py-1.5 font-medium text-slate-900">
                      {getGenderLabel(candidate.gender, language)}
                    </td>
                    <td className="py-1.5 font-medium text-slate-500">{labels.maritalStatus}</td>
                    <td className="py-1.5 font-medium text-slate-900">
                      {getMaritalStatusLabel(candidate.maritalStatus, candidate.gender, language)}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    {visible.children && (
                      <>
                        <td className="py-1.5 font-medium text-slate-500">{labels.children}</td>
                        <td className="py-1.5 font-mono-tabular font-medium text-slate-900">
                          {candidate.childrenCount}
                        </td>
                      </>
                    )}
                    {visible.placeOfBirth && (
                      <>
                        <td className="py-1.5 font-medium text-slate-500">{labels.placeOfBirth}</td>
                        <td className="py-1.5 font-medium text-slate-900">{placeOfBirth}</td>
                      </>
                    )}
                  </tr>
                  <tr className="border-b border-slate-100">
                    {visible.height && (
                      <>
                        <td className="py-1.5 font-medium text-slate-500">{labels.height}</td>
                        <td className="py-1.5 font-mono-tabular font-medium text-slate-900">
                          {candidate.heightCm ? `${candidate.heightCm} ${labels.cm}` : '—'}
                        </td>
                      </>
                    )}
                    {visible.weight && (
                      <>
                        <td className="py-1.5 font-medium text-slate-500">{labels.weight}</td>
                        <td className="py-1.5 font-mono-tabular font-medium text-slate-900">
                          {candidate.weightKg ? `${candidate.weightKg} ${labels.kg}` : '—'}
                        </td>
                      </>
                    )}
                  </tr>
                  {visible.education && (
                    <tr>
                      <td className="py-1.5 font-medium text-slate-500">{labels.education}</td>
                      <td colSpan={3} className="py-1.5 font-medium text-slate-900">
                        {getEducationLabel(candidate.educationCode, language)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>

            {/* Passport & GCC History */}
            <section>
              <h3
                style={{ color: primaryColor, borderColor: accentColor }}
                className="mb-2 border-b pb-1 text-xs font-bold tracking-wide"
              >
                {labels.passportDetails}
              </h3>
              <table className="w-full border-collapse text-xs">
                <tbody>
                  {showPassport && (
                    <tr className="border-b border-slate-100">
                      <td className="w-1/4 py-1.5 font-medium text-slate-500">
                        {labels.passportNumber}
                      </td>
                      <td className="w-1/4 py-1.5 font-mono-tabular font-bold text-slate-900">
                        {candidate.passportNumber}
                      </td>
                      <td className="w-1/4 py-1.5 font-medium text-slate-500">{labels.agencyCode}</td>
                      <td className="w-1/4 py-1.5 font-mono-tabular font-medium text-slate-900">
                        {candidate.agencyCode}
                      </td>
                    </tr>
                  )}
                  <tr className="border-b border-slate-100">
                    <td className="py-1.5 font-medium text-slate-500">
                      {labels.passportIssueDate}
                    </td>
                    <td className="py-1.5 font-mono-tabular font-medium text-slate-900">
                      <span dir="ltr" className="inline-block">
                        {formatDate(candidate.passportIssueDate, language)}
                      </span>
                    </td>
                    <td className="py-1.5 font-medium text-slate-500">
                      {labels.passportExpiryDate}
                    </td>
                    <td className="py-1.5 font-mono-tabular font-medium text-slate-900">
                      <span dir="ltr" className="inline-block">
                        {formatDate(candidate.passportExpiryDate, language)}
                      </span>
                    </td>
                  </tr>
                  {showBorderIqama && (
                    <tr className="border-b border-slate-100">
                      <td className="py-1.5 font-medium text-slate-500">{labels.borderNumber}</td>
                      <td className="py-1.5 font-mono-tabular font-medium text-slate-900">
                        {candidate.borderNumber || '—'}
                      </td>
                      <td className="py-1.5 font-medium text-slate-500">{labels.iqamaNumber}</td>
                      <td className="py-1.5 font-mono-tabular font-medium text-slate-900">
                        {candidate.iqamaNumber || '—'}
                      </td>
                    </tr>
                  )}
                  <tr className="border-b border-slate-100">
                    <td className="py-1.5 font-medium text-slate-500">{labels.experienceYears}</td>
                    <td colSpan={3} className="py-1.5 font-semibold text-slate-900">
                      {candidate.experienceYears > 0
                        ? `${candidate.experienceYears} ${labels.yearsLabel}`
                        : labels.freshCandidate}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 font-medium text-slate-500">
                      {labels.previousCountries}
                    </td>
                    <td colSpan={3} className="py-1.5 font-medium text-slate-900">
                      {previousCountries.length > 0
                        ? previousCountries
                            .map(
                              (c) =>
                                `${getCountryLabel(c.countryCode, language)} (${c.years} ${labels.yearsLabel})`
                            )
                            .join(' · ')
                        : labels.noPreviousAbroad}
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>

            {/* Language & Domestic Skills Matrix */}
            <section>
              <h3
                style={{ color: primaryColor, borderColor: accentColor }}
                className="mb-2 border-b pb-1 text-xs font-bold tracking-wide"
              >
                {labels.languagesAndSkills}
              </h3>

              <div className="mb-2.5 grid grid-cols-2 gap-3 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-600">{labels.arabicLanguage}</span>
                  <span className="font-bold text-slate-900">
                    {getLanguageLevelLabel(candidate.arabicLevel, language)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-600">{labels.englishLanguage}</span>
                  <span className="font-bold text-slate-900">
                    {getLanguageLevelLabel(candidate.englishLevel, language)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {SKILL_LABELS.map((skill) => {
                  const val =
                    candidate.skillsMatrix?.[skill.key as keyof typeof candidate.skillsMatrix] ??
                    'NO';
                  return (
                    <div
                      key={skill.key}
                      className="flex items-center justify-between border-b border-slate-100 py-1"
                    >
                      <span className="text-slate-700">{isArabic ? skill.ar : skill.en}</span>
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

            {/* Evaluator Notes */}
            {visible.notes && notes && (
              <section>
                <h3
                  style={{ color: primaryColor, borderColor: accentColor }}
                  className="mb-1.5 border-b pb-1 text-xs font-bold tracking-wide"
                >
                  {labels.additionalNotes}
                </h3>
                <p className="text-xs leading-relaxed text-slate-700">{notes}</p>
              </section>
            )}
          </div>

          {/* Mandatory Full-Body Standing Photo Panel (4 cols) */}
          <div className="col-span-4 flex flex-col">
            <div className="flex flex-1 flex-col items-center justify-between rounded border border-slate-300 bg-slate-50 p-2">
              <div className="h-[465px] w-full overflow-hidden rounded bg-white">
                {candidate.fullBodyPhotoPath ? (
                  <PrivateImage
                    src={candidate.fullBodyPhotoPath}
                    alt={labels.fullBodyPhotoLabel}
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover object-top"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                    {labels.fullBodyPhotoLabel}
                  </div>
                )}
              </div>
              <p className="mt-2 text-center text-[11px] font-semibold text-slate-600">
                {labels.fullBodyPhotoLabel}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Branded Footer */}
      <footer
        style={{ backgroundColor: secondaryColor, borderColor: accentColor }}
        className="border-t-2 px-7 py-3 text-[11px] text-slate-600"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <p className="font-semibold text-slate-900">{companyName}</p>
            {footerText && <p>{footerText}</p>}
          </div>
          <div className={`space-y-0.5 ${isArabic ? 'text-left' : 'text-right'}`}>
            {company?.licenseNumber && (
              <p className="font-mono-tabular">
                {labels.licenseLabel}: {company.licenseNumber}
              </p>
            )}
            {(company?.contactPhone || company?.contactEmail) && (
              <p className="font-mono-tabular">
                {company.contactPhone && (
                  <span dir="ltr" className="inline-block">
                    {company.contactPhone}
                  </span>
                )}
                {company.contactPhone && company.contactEmail ? ' · ' : ''}
                {company.contactEmail && (
                  <span dir="ltr" className="inline-block">
                    {company.contactEmail}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
});
