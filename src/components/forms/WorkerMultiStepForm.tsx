import React, { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Languages, Plus, Trash2, Upload } from 'lucide-react';
import {
  EDUCATION_LEVELS,
  GCC_COUNTRIES,
  OCCUPATIONS,
  SKILL_LABELS,
} from '../../lib/cv-dictionary';
import { apiFetch } from '../../lib/api';
import { PrivateImage } from '../common/PrivateImage';
import type { PreviousCountryExperience, SkillsMatrix } from '../../db/schema.ts';
import type { WorkerDetail } from '../../types/portal';

export interface WorkerFormPayload {
  status: 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' | 'CONTRACTED';
  fullNameEn: string;
  fullNameAr: string;
  dateOfBirth: string;
  gender: 'FEMALE' | 'MALE';
  nationality: string;
  religion: 'MUSLIM' | 'NON_MUSLIM';
  maritalStatus: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
  childrenCount: number;
  placeOfBirthEn: string;
  placeOfBirthAr: string;
  heightCm: string;
  weightKg: string;
  phoneNumber: string;
  addressEn: string;
  passportNumber: string;
  passportIssueDate: string;
  passportExpiryDate: string;
  borderNumber: string;
  iqamaNumber: string;
  agencyCode: string;
  occupationCode: string;
  expectedSalarySar: string;
  educationCode: string;
  experienceYears: number;
  previousCountries: PreviousCountryExperience[];
  arabicLevel: 'FLUENT' | 'BASIC' | 'NO';
  englishLevel: 'FLUENT' | 'BASIC' | 'NO';
  skillsMatrix: SkillsMatrix;
  notesEn: string;
  notesAr: string;
}

function toDateInput(val: string | null | undefined): string {
  if (!val) return '';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export function WorkerMultiStepForm({
  initialWorker,
  submitting,
  onSubmit,
}: {
  initialWorker?: WorkerDetail;
  submitting: boolean;
  onSubmit: (
    payload: WorkerFormPayload,
    photos: { faceFile: File | null; fullBodyFile: File | null }
  ) => Promise<void>;
}) {
  const [showAdvanced, setShowAdvanced] = useState(Boolean(initialWorker));
  const [translating, setTranslating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [faceFile, setFaceFile] = useState<File | null>(null);
  const [fullBodyFile, setFullBodyFile] = useState<File | null>(null);
  const [facePreview, setFacePreview] = useState<string | null>(
    initialWorker?.facePhotoPath ?? null
  );
  const [fullBodyPreview, setFullBodyPreview] = useState<string | null>(
    initialWorker?.fullBodyPhotoPath ?? null
  );

  const [form, setForm] = useState<WorkerFormPayload>(() => ({
    status: initialWorker?.status ?? 'DRAFT',
    fullNameEn: initialWorker?.fullNameEn ?? '',
    fullNameAr: initialWorker?.fullNameAr ?? '',
    dateOfBirth: toDateInput(initialWorker?.dateOfBirth) || '1997-05-15',
    gender: initialWorker?.gender ?? 'FEMALE',
    nationality: initialWorker?.nationality ?? 'Bangladeshi',
    religion: initialWorker?.religion ?? 'MUSLIM',
    maritalStatus: initialWorker?.maritalStatus ?? 'MARRIED',
    childrenCount: initialWorker?.childrenCount ?? 0,
    placeOfBirthEn: initialWorker?.placeOfBirthEn ?? '',
    placeOfBirthAr: initialWorker?.placeOfBirthAr ?? '',
    heightCm: initialWorker?.heightCm ? String(initialWorker.heightCm) : '',
    weightKg: initialWorker?.weightKg ? String(initialWorker.weightKg) : '',
    phoneNumber: initialWorker?.phoneNumber ?? '',
    addressEn: initialWorker?.addressEn ?? '',
    passportNumber: initialWorker?.passportNumber ?? '',
    passportIssueDate: toDateInput(initialWorker?.passportIssueDate),
    passportExpiryDate: toDateInput(initialWorker?.passportExpiryDate),
    borderNumber: initialWorker?.borderNumber ?? '',
    iqamaNumber: initialWorker?.iqamaNumber ?? '',
    agencyCode: initialWorker?.agencyCode ?? 'BGD-DHK-09',
    occupationCode: initialWorker?.occupationCode ?? 'HOUSEMAID',
    expectedSalarySar: initialWorker?.expectedSalarySar
      ? String(initialWorker.expectedSalarySar)
      : '1200',
    educationCode: initialWorker?.educationCode ?? 'SECONDARY',
    experienceYears: initialWorker?.experienceYears ?? 0,
    previousCountries: initialWorker?.previousCountries ?? [],
    arabicLevel: initialWorker?.arabicLevel ?? 'NO',
    englishLevel: initialWorker?.englishLevel ?? 'BASIC',
    skillsMatrix: initialWorker?.skillsMatrix ?? {
      baby_care: 'YES',
      child_care: 'YES',
      elderly_care: 'WILLING',
      cleaning: 'YES',
      washing: 'YES',
      ironing: 'YES',
      arabic_cooking: 'WILLING',
      sewing: 'NO',
    },
    notesEn: initialWorker?.notesEn ?? '',
    notesAr: initialWorker?.notesAr ?? '',
  }));

  const handleFaceSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFaceFile(file);
    setFacePreview(URL.createObjectURL(file));
  };

  const handleFullBodySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFullBodyFile(file);
    setFullBodyPreview(URL.createObjectURL(file));
  };

  const handleAddCountry = () => {
    setForm((prev) => ({
      ...prev,
      previousCountries: [...prev.previousCountries, { countryCode: 'KSA', years: 2 }],
    }));
  };

  const handleAutoTranslate = async () => {
    setTranslating(true);
    setFormError(null);
    try {
      const res = await apiFetch<{
        fullNameAr: string;
        placeOfBirthAr: string;
        notesAr: string;
      }>('/api/workers/translate-preview', {
        method: 'POST',
        body: JSON.stringify({
          fullNameEn: form.fullNameEn,
          placeOfBirthEn: form.placeOfBirthEn,
          notesEn: form.notesEn,
        }),
      });
      setForm((prev) => ({
        ...prev,
        fullNameAr: res.fullNameAr || prev.fullNameAr,
        placeOfBirthAr: res.placeOfBirthAr || prev.placeOfBirthAr,
        notesAr: res.notesAr || prev.notesAr,
      }));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Auto-translation failed');
    } finally {
      setTranslating(false);
    }
  };

  const handleSave = async (targetStatus?: 'DRAFT' | 'PUBLISHED') => {
    setFormError(null);
    if (!form.fullNameEn.trim()) {
      setFormError('Full Name (English) is required.');
      document.getElementById('wkr-name-en')?.focus();
      return;
    }
    if (!form.passportNumber.trim() || form.passportNumber.trim().length < 5) {
      setFormError('Valid Passport Number (at least 5 characters) is required.');
      document.getElementById('wkr-passport')?.focus();
      return;
    }
    const finalStatus = targetStatus ?? form.status;
    if (finalStatus === 'PUBLISHED' && (!facePreview || !fullBodyPreview)) {
      setFormError('Both Personal Face Photo and Full-Body Photo are required before publishing.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    await onSubmit({ ...form, status: finalStatus }, { faceFile, fullBodyFile });
  };

  const renderPreviewImage = (src: string, alt: string, className: string) => {
    if (src.startsWith('blob:') || src.startsWith('data:')) {
      return <img src={src} alt={alt} className={className} />;
    }
    return <PrivateImage src={src} alt={alt} className={className} />;
  };

  return (
    <div className="space-y-6">
      {formError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {formError}
        </div>
      )}

      <div className="space-y-8 rounded-xl border border-slate-200 bg-white p-6">
        {/* 1. Candidate Photographs */}
        <section className="space-y-3 border-b border-slate-100 pb-6">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Candidate Photographs
            </h2>
            <p className="text-xs text-slate-500">
              Photos are automatically optimized to WebP and stored privately on server storage
              (outside public web folders).
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Personal / Face Photo */}
            <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
              <div className="h-24 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
                {facePreview ? (
                  renderPreviewImage(facePreview, 'Personal face preview', 'h-full w-full object-cover')
                ) : (
                  <div className="flex h-full items-center justify-center text-[11px] text-slate-400">
                    No photo
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-800">Personal Photo (Face) *</p>
                <p className="mt-0.5 text-[11px] text-slate-500">Passport-size portrait</p>
                <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                  <Upload className="h-3.5 w-3.5" />
                  <span>{facePreview ? 'Change File' : 'Choose File'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFaceSelect}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>

            {/* Full-Body Photo */}
            <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
              <div className="h-24 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
                {fullBodyPreview ? (
                  renderPreviewImage(
                    fullBodyPreview,
                    'Full-body standing preview',
                    'h-full w-full object-cover object-top'
                  )
                ) : (
                  <div className="flex h-full items-center justify-center text-[11px] text-slate-400">
                    No photo
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-800">Full Image (Standing) *</p>
                <p className="mt-0.5 text-[11px] text-slate-500">Full-length standing photo</p>
                <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                  <Upload className="h-3.5 w-3.5" />
                  <span>{fullBodyPreview ? 'Change File' : 'Choose File'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFullBodySelect}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Basic & Passport Grid (Fast 3-Column Layout like Reference Form) */}
        <section className="space-y-4 border-b border-slate-100 pb-6">
          <h2 className="font-display text-base font-semibold text-slate-900">
            CV & Passport Information
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="wkr-name-en" className="block text-xs font-medium text-slate-700">
                Full Name (English) *
              </label>
              <input
                id="wkr-name-en"
                type="text"
                required
                value={form.fullNameEn}
                onChange={(e) => setForm({ ...form, fullNameEn: e.target.value })}
                placeholder="Name"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="wkr-dob" className="block text-xs font-medium text-slate-700">
                Birthdate *
              </label>
              <input
                id="wkr-dob"
                type="date"
                required
                value={form.dateOfBirth}
                onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="wkr-passport" className="block text-xs font-medium text-slate-700">
                Passport No. *
              </label>
              <input
                id="wkr-passport"
                type="text"
                required
                value={form.passportNumber}
                onChange={(e) => setForm({ ...form, passportNumber: e.target.value.toUpperCase() })}
                placeholder="Passport No."
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-tabular text-sm uppercase"
              />
            </div>

            <div>
              <label htmlFor="wkr-height" className="block text-xs font-medium text-slate-700">
                Height (cm)
              </label>
              <input
                id="wkr-height"
                type="number"
                value={form.heightCm}
                onChange={(e) => setForm({ ...form, heightCm: e.target.value })}
                placeholder="158"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="wkr-weight" className="block text-xs font-medium text-slate-700">
                Weight (kg)
              </label>
              <input
                id="wkr-weight"
                type="number"
                value={form.weightKg}
                onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                placeholder="54"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="wkr-agency-code" className="block text-xs font-medium text-slate-700">
                Sending Agency Code
              </label>
              <input
                id="wkr-agency-code"
                type="text"
                value={form.agencyCode}
                onChange={(e) => setForm({ ...form, agencyCode: e.target.value })}
                placeholder="BGD-DHK-09"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-tabular text-sm"
              />
            </div>

            <div>
              <label htmlFor="wkr-nationality" className="block text-xs font-medium text-slate-700">
                Nationality
              </label>
              <input
                id="wkr-nationality"
                type="text"
                value={form.nationality}
                onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="wkr-occupation" className="block text-xs font-medium text-slate-700">
                Occupation *
              </label>
              <select
                id="wkr-occupation"
                value={form.occupationCode}
                onChange={(e) => setForm({ ...form, occupationCode: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {Object.entries(OCCUPATIONS).map(([code, labels]) => (
                  <option key={code} value={code}>
                    {labels.en}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="wkr-education" className="block text-xs font-medium text-slate-700">
                Educational Qualification
              </label>
              <select
                id="wkr-education"
                value={form.educationCode}
                onChange={(e) => setForm({ ...form, educationCode: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {Object.entries(EDUCATION_LEVELS).map(([code, labels]) => (
                  <option key={code} value={code}>
                    {labels.en}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="wkr-salary" className="block text-xs font-medium text-slate-700">
                Expected Salary (SAR / Month)
              </label>
              <input
                id="wkr-salary"
                type="number"
                value={form.expectedSalarySar}
                onChange={(e) => setForm({ ...form, expectedSalarySar: e.target.value })}
                placeholder="1200"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-tabular text-sm"
              />
            </div>

            <div>
              <label htmlFor="wkr-exp-years" className="block text-xs font-medium text-slate-700">
                Total Experience (Years)
              </label>
              <input
                id="wkr-exp-years"
                type="number"
                min={0}
                max={40}
                value={form.experienceYears}
                onChange={(e) => setForm({ ...form, experienceYears: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-tabular text-sm"
              />
            </div>

            <div>
              <label htmlFor="wkr-pob" className="block text-xs font-medium text-slate-700">
                Place of Birth (District, Country)
              </label>
              <input
                id="wkr-pob"
                type="text"
                value={form.placeOfBirthEn}
                onChange={(e) => setForm({ ...form, placeOfBirthEn: e.target.value })}
                placeholder="e.g., Cumilla, Bangladesh"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        {/* 3. Quick-Tap Attributes (Big Tactile Buttons matching Reference) */}
        <section className="grid grid-cols-1 gap-6 border-b border-slate-100 pb-6 md:grid-cols-2">
          <div>
            <span className="block text-xs font-medium text-slate-700">Marital Status</span>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  { value: 'SINGLE', label: 'Single' },
                  { value: 'MARRIED', label: 'Married' },
                  { value: 'DIVORCED', label: 'Divorced' },
                  { value: 'WIDOWED', label: 'Widowed' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({ ...form, maritalStatus: opt.value })}
                  className={`rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition-colors ${
                    form.maritalStatus === opt.value
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="wkr-children" className="block text-xs font-medium text-slate-700">
              Number of Children
            </label>
            <input
              id="wkr-children"
              type="number"
              min={0}
              max={20}
              value={form.childrenCount}
              onChange={(e) => setForm({ ...form, childrenCount: Number(e.target.value) })}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-700">Gender</span>
            <div className="mt-2 grid grid-cols-2 gap-2.5">
              {(
                [
                  { value: 'FEMALE', label: 'Female' },
                  { value: 'MALE', label: 'Male' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({ ...form, gender: opt.value })}
                  className={`rounded-lg border px-4 py-2.5 text-left text-xs font-semibold transition-colors ${
                    form.gender === opt.value
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-700">Religion</span>
            <div className="mt-2 grid grid-cols-2 gap-2.5">
              {(
                [
                  { value: 'MUSLIM', label: 'Muslim' },
                  { value: 'NON_MUSLIM', label: 'Non-Muslim' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({ ...form, religion: opt.value })}
                  className={`rounded-lg border px-4 py-2.5 text-left text-xs font-semibold transition-colors ${
                    form.religion === opt.value
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Domestic Skills & Spoken Languages (Tactile Button Grid) */}
        <section className="space-y-5 border-b border-slate-100 pb-6">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Domestic Skills & Spoken Languages
          </h2>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {SKILL_LABELS.map((skill) => {
              const current = form.skillsMatrix[skill.key as keyof SkillsMatrix];
              return (
                <div key={skill.key}>
                  <span className="block text-xs font-medium text-slate-700">{skill.en}</span>
                  <div className="mt-1.5 grid grid-cols-3 gap-2">
                    {(
                      [
                        { value: 'YES', label: 'Yes' },
                        { value: 'WILLING', label: 'Willing to Learn' },
                        { value: 'NO', label: 'No' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            skillsMatrix: { ...form.skillsMatrix, [skill.key]: opt.value },
                          })
                        }
                        className={`rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-colors ${
                          current === opt.value
                            ? opt.value === 'YES'
                              ? 'border-emerald-700 bg-emerald-600 text-white'
                              : opt.value === 'WILLING'
                                ? 'border-sky-700 bg-sky-600 text-white'
                                : 'border-slate-800 bg-slate-800 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            <div>
              <span className="block text-xs font-medium text-slate-700">Arabic Proficiency</span>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {(
                  [
                    { value: 'NO', label: 'Poor / None' },
                    { value: 'BASIC', label: 'Basic / Fair' },
                    { value: 'FLUENT', label: 'Fluent / Good' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm({ ...form, arabicLevel: opt.value })}
                    className={`rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-colors ${
                      form.arabicLevel === opt.value
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-xs font-medium text-slate-700">English Proficiency</span>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {(
                  [
                    { value: 'NO', label: 'Poor / None' },
                    { value: 'BASIC', label: 'Basic / Fair' },
                    { value: 'FLUENT', label: 'Fluent / Good' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm({ ...form, englishLevel: opt.value })}
                    className={`rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-colors ${
                      form.englishLevel === opt.value
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 5. Previous Experience Table (Inline + Add Country) */}
        <section className="space-y-3 border-b border-slate-100 pb-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-slate-900">Experiences</h2>
            <button
              type="button"
              onClick={handleAddCountry}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Country</span>
            </button>
          </div>

          {form.previousCountries.length === 0 ? (
            <p className="text-xs text-slate-500">
              No prior overseas countries added (candidate is marked as Fresh). Click{' '}
              <strong>Add Country</strong> if they worked abroad previously.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                    <th className="w-12 px-3 py-2.5">#</th>
                    <th className="px-3 py-2.5">Country</th>
                    <th className="w-40 px-3 py-2.5">Years Worked</th>
                    <th className="w-14 px-3 py-2.5 text-right">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {form.previousCountries.map((entry, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 font-mono-tabular text-slate-500">{idx + 1}.</td>
                      <td className="px-3 py-2">
                        <select
                          aria-label={`Previous country ${idx + 1}`}
                          value={entry.countryCode}
                          onChange={(e) => {
                            const next = [...form.previousCountries];
                            next[idx] = { ...next[idx], countryCode: e.target.value };
                            setForm({ ...form, previousCountries: next });
                          }}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
                        >
                          {Object.entries(GCC_COUNTRIES).map(([code, labels]) => (
                            <option key={code} value={code}>
                              {labels.en}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          aria-label={`Years in country ${idx + 1}`}
                          min={1}
                          max={30}
                          value={entry.years}
                          onChange={(e) => {
                            const next = [...form.previousCountries];
                            next[idx] = { ...next[idx], years: Number(e.target.value) };
                            setForm({ ...form, previousCountries: next });
                          }}
                          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              previousCountries: form.previousCountries.filter((_, i) => i !== idx),
                            })
                          }
                          aria-label="Remove country"
                          className="rounded p-1.5 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="pt-2">
            <label htmlFor="wkr-notes-en" className="block text-xs font-medium text-slate-700">
              Evaluator Notes (English)
            </label>
            <textarea
              id="wkr-notes-en"
              rows={2}
              value={form.notesEn}
              onChange={(e) => setForm({ ...form, notesEn: e.target.value })}
              placeholder="Summary of training, demeanor, cooking specialties, or driving experience..."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </section>

        {/* 6. Collapsible Optional Details: Passport Dates, GCC Returnee IDs, Internal Contact & Arabic Override */}
        <section>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-100"
          >
            <span>
              Optional Details: Passport Expiry, Border / Iqama, Internal Contact & Arabic Override
            </span>
            {showAdvanced ? (
              <ChevronUp className="h-4 w-4 text-slate-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-500" />
            )}
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-5 pt-2">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label htmlFor="wkr-pissue" className="block text-xs font-medium text-slate-700">
                    Passport Issue Date
                  </label>
                  <input
                    id="wkr-pissue"
                    type="date"
                    value={form.passportIssueDate}
                    onChange={(e) => setForm({ ...form, passportIssueDate: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="wkr-pexpiry" className="block text-xs font-medium text-slate-700">
                    Passport Expiry Date
                  </label>
                  <input
                    id="wkr-pexpiry"
                    type="date"
                    value={form.passportExpiryDate}
                    onChange={(e) => setForm({ ...form, passportExpiryDate: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="wkr-border" className="block text-xs font-medium text-slate-700">
                    KSA Border Number (Returnees)
                  </label>
                  <input
                    id="wkr-border"
                    type="text"
                    value={form.borderNumber}
                    onChange={(e) => setForm({ ...form, borderNumber: e.target.value })}
                    placeholder="Optional"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-tabular text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="wkr-iqama" className="block text-xs font-medium text-slate-700">
                    Previous Iqama Number (Returnees)
                  </label>
                  <input
                    id="wkr-iqama"
                    type="text"
                    value={form.iqamaNumber}
                    onChange={(e) => setForm({ ...form, iqamaNumber: e.target.value })}
                    placeholder="Optional"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-tabular text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="wkr-phone" className="block text-xs font-medium text-slate-700">
                    Candidate Phone (Internal Only)
                  </label>
                  <input
                    id="wkr-phone"
                    type="text"
                    value={form.phoneNumber}
                    onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                    placeholder="+880 1..."
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="wkr-address" className="block text-xs font-medium text-slate-700">
                    Home Address (Internal Only)
                  </label>
                  <input
                    id="wkr-address"
                    type="text"
                    value={form.addressEn}
                    onChange={(e) => setForm({ ...form, addressEn: e.target.value })}
                    placeholder="Village, Upazila, District"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-800">
                      Arabic Profile & CV Override
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Leave blank to auto-translate when saving, or preview now.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={translating || !form.fullNameEn.trim()}
                    onClick={handleAutoTranslate}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Languages className="h-3.5 w-3.5 text-sky-600" />
                    <span>{translating ? 'Translating...' : 'Auto-Translate to Arabic'}</span>
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      Full Name (Arabic)
                    </label>
                    <input
                      type="text"
                      dir="rtl"
                      value={form.fullNameAr}
                      onChange={(e) => setForm({ ...form, fullNameAr: e.target.value })}
                      placeholder="تلقائي عند الحفظ"
                      className="font-arabic mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      Place of Birth (Arabic)
                    </label>
                    <input
                      type="text"
                      dir="rtl"
                      value={form.placeOfBirthAr}
                      onChange={(e) => setForm({ ...form, placeOfBirthAr: e.target.value })}
                      placeholder="تلقائي عند الحفظ"
                      className="font-arabic mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-700">
                      Evaluator Notes (Arabic)
                    </label>
                    <textarea
                      rows={2}
                      dir="rtl"
                      value={form.notesAr}
                      onChange={(e) => setForm({ ...form, notesAr: e.target.value })}
                      placeholder="تلقائي عند الحفظ"
                      className="font-arabic mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Primary Action Bar */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-5">
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSave('DRAFT')}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save as Draft'}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSave('PUBLISHED')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-6 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            <span>{submitting ? 'Saving...' : 'Save & Publish'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
