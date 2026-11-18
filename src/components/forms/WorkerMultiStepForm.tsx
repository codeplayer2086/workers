import React, { useState } from 'react';
import { Check, Languages, Plus, Trash2, Upload } from 'lucide-react';
import {
  EDUCATION_LEVELS,
  GCC_COUNTRIES,
  OCCUPATIONS,
  SKILL_LABELS,
} from '../../lib/cv-dictionary';
import { apiFetch } from '../../lib/api';
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

const STEPS = [
  '1. Personal Info',
  '2. Passport & GCC',
  '3. Occupation & History',
  '4. Languages & Skills',
  '5. Photos & Arabic',
];

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
  const [step, setStep] = useState(0);
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
      setStep(0);
      setFormError('Full name in English is required.');
      return;
    }
    if (!form.passportNumber.trim() || form.passportNumber.trim().length < 5) {
      setStep(1);
      setFormError('Valid passport number (at least 5 characters) is required.');
      return;
    }
    const finalStatus = targetStatus ?? form.status;
    if (finalStatus === 'PUBLISHED' && (!facePreview || !fullBodyPreview)) {
      setStep(4);
      setFormError('Both Face Photo and Full-Body Photo are mandatory before publishing.');
      return;
    }
    await onSubmit({ ...form, status: finalStatus }, { faceFile, fullBodyFile });
  };

  return (
    <div className="space-y-6">
      {/* Step Navigation Bar */}
      <nav aria-label="Registration Steps" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {STEPS.map((label, idx) => {
          const isCurrent = step === idx;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setStep(idx)}
              className={`rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition-colors ${
                isCurrent
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          );
        })}
      </nav>

      {formError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {formError}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        {/* Step 1: Personal Info */}
        {step === 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <h2 className="font-display text-base font-semibold text-slate-900">
                Personal Information (English Input)
              </h2>
              <p className="text-xs text-slate-500">
                Enter candidate details in English. Arabic CV labels and transliteration are
                generated automatically.
              </p>
            </div>

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
                placeholder="e.g., Nasrin Akter"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="wkr-dob" className="block text-xs font-medium text-slate-700">
                Date of Birth *
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
              <label htmlFor="wkr-gender" className="block text-xs font-medium text-slate-700">
                Gender *
              </label>
              <select
                id="wkr-gender"
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value as 'FEMALE' | 'MALE' })}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
              </select>
            </div>

            <div>
              <label htmlFor="wkr-religion" className="block text-xs font-medium text-slate-700">
                Religion *
              </label>
              <select
                id="wkr-religion"
                value={form.religion}
                onChange={(e) =>
                  setForm({ ...form, religion: e.target.value as 'MUSLIM' | 'NON_MUSLIM' })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="MUSLIM">Muslim</option>
                <option value="NON_MUSLIM">Non-Muslim</option>
              </select>
            </div>

            <div>
              <label htmlFor="wkr-marital" className="block text-xs font-medium text-slate-700">
                Marital Status *
              </label>
              <select
                id="wkr-marital"
                value={form.maritalStatus}
                onChange={(e) =>
                  setForm({
                    ...form,
                    maritalStatus: e.target.value as 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED',
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="SINGLE">Single</option>
                <option value="MARRIED">Married</option>
                <option value="DIVORCED">Divorced</option>
                <option value="WIDOWED">Widowed</option>
              </select>
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
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
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

            <div className="grid grid-cols-2 gap-3">
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
        )}

        {/* Step 2: Passport & GCC */}
        {step === 1 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <h2 className="font-display text-base font-semibold text-slate-900">
                Passport & GCC Returnee Details
              </h2>
            </div>

            <div>
              <label htmlFor="wkr-passport" className="block text-xs font-medium text-slate-700">
                Passport Number *
              </label>
              <input
                id="wkr-passport"
                type="text"
                required
                value={form.passportNumber}
                onChange={(e) => setForm({ ...form, passportNumber: e.target.value.toUpperCase() })}
                placeholder="EB0491823"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-tabular text-sm uppercase"
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
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-tabular text-sm"
              />
            </div>

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
                KSA Border Number (For Returnees)
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
                Previous Iqama Number (For Returnees)
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
          </div>
        )}

        {/* Step 3: Occupation & History */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Occupation, Salary & Overseas Experience
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="wkr-occupation" className="block text-xs font-medium text-slate-700">
                  Primary Occupation *
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
                <label htmlFor="wkr-salary" className="block text-xs font-medium text-slate-700">
                  Expected Monthly Salary (SAR)
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
                <label htmlFor="wkr-education" className="block text-xs font-medium text-slate-700">
                  Education Level
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
                <label htmlFor="wkr-exp-years" className="block text-xs font-medium text-slate-700">
                  Total Overseas Experience (Years)
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
            </div>

            <div className="border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-700">
                  Previous Countries Worked
                </h3>
                <button
                  type="button"
                  onClick={handleAddCountry}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Country</span>
                </button>
              </div>
              {form.previousCountries.length === 0 ? (
                <p className="mt-2 text-xs text-slate-500">
                  No prior overseas experience added (candidate will be listed as Fresh).
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {form.previousCountries.map((entry, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <select
                        value={entry.countryCode}
                        onChange={(e) => {
                          const next = [...form.previousCountries];
                          next[idx] = { ...next[idx], countryCode: e.target.value };
                          setForm({ ...form, previousCountries: next });
                        }}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
                      >
                        {Object.entries(GCC_COUNTRIES).map(([code, labels]) => (
                          <option key={code} value={code}>
                            {labels.en}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={entry.years}
                        onChange={(e) => {
                          const next = [...form.previousCountries];
                          next[idx] = { ...next[idx], years: Number(e.target.value) };
                          setForm({ ...form, previousCountries: next });
                        }}
                        className="w-24 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                      />
                      <span className="text-xs text-slate-500">years</span>
                      <button
                        type="button"
                        onClick={() => {
                          setForm({
                            ...form,
                            previousCountries: form.previousCountries.filter((_, i) => i !== idx),
                          });
                        }}
                        aria-label="Remove country"
                        className="rounded p-1 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Languages & Domestic Skills */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Languages & Domestic Skills Matrix
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="wkr-arabic-lvl" className="block text-xs font-medium text-slate-700">
                  Arabic Language Proficiency
                </label>
                <select
                  id="wkr-arabic-lvl"
                  value={form.arabicLevel}
                  onChange={(e) =>
                    setForm({ ...form, arabicLevel: e.target.value as 'FLUENT' | 'BASIC' | 'NO' })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="FLUENT">Fluent</option>
                  <option value="BASIC">Basic</option>
                  <option value="NO">None</option>
                </select>
              </div>
              <div>
                <label htmlFor="wkr-english-lvl" className="block text-xs font-medium text-slate-700">
                  English Language Proficiency
                </label>
                <select
                  id="wkr-english-lvl"
                  value={form.englishLevel}
                  onChange={(e) =>
                    setForm({ ...form, englishLevel: e.target.value as 'FLUENT' | 'BASIC' | 'NO' })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="FLUENT">Fluent</option>
                  <option value="BASIC">Basic</option>
                  <option value="NO">None</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {SKILL_LABELS.map((skill) => {
                const current = form.skillsMatrix[skill.key as keyof SkillsMatrix];
                return (
                  <div
                    key={skill.key}
                    className="flex items-center justify-between rounded-lg border border-slate-200 px-3.5 py-2.5"
                  >
                    <span className="text-sm font-medium text-slate-800">{skill.en}</span>
                    <div className="flex items-center gap-1">
                      {(['YES', 'WILLING', 'NO'] as const).map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              skillsMatrix: { ...form.skillsMatrix, [skill.key]: val },
                            })
                          }
                          className={`rounded px-2 py-1 text-[11px] font-semibold transition-colors ${
                            current === val
                              ? val === 'YES'
                                ? 'bg-emerald-600 text-white'
                                : val === 'WILLING'
                                  ? 'bg-sky-600 text-white'
                                  : 'bg-slate-700 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {val === 'WILLING' ? 'Willing' : val === 'YES' ? 'Yes' : 'No'}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div>
              <label htmlFor="wkr-notes-en" className="block text-xs font-medium text-slate-700">
                Evaluator Notes (English)
              </label>
              <textarea
                id="wkr-notes-en"
                rows={3}
                value={form.notesEn}
                onChange={(e) => setForm({ ...form, notesEn: e.target.value })}
                placeholder="Summary of training, demeanor, cooking specialties, or driving experience..."
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        {/* Step 5: Mandatory Photos & Cached Arabic Review */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Mandatory CV Photographs & Arabic Fields
              </h2>
              <p className="text-xs text-slate-500">
                Both photos appear on every generated English and Arabic CV. Uploaded images are
                compressed on the server into lightweight private WebP assets.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Passport Face Photo */}
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-semibold text-slate-800">
                  1. Passport-Size Face Photo *
                </p>
                <div className="mt-3 flex items-center gap-4">
                  <div className="h-36 w-28 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    {facePreview ? (
                      <img
                        src={facePreview}
                        alt="Face photo preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-slate-400">
                        No photo
                      </div>
                    )}
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    <Upload className="h-4 w-4" />
                    <span>{facePreview ? 'Replace Face Photo' : 'Upload Face Photo'}</span>
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
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-semibold text-slate-800">
                  2. Full-Body Standing Photo *
                </p>
                <div className="mt-3 flex items-center gap-4">
                  <div className="h-36 w-28 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    {fullBodyPreview ? (
                      <img
                        src={fullBodyPreview}
                        alt="Full-body photo preview"
                        className="h-full w-full object-cover object-top"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-slate-400">
                        No photo
                      </div>
                    )}
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    <Upload className="h-4 w-4" />
                    <span>
                      {fullBodyPreview ? 'Replace Full-Body Photo' : 'Upload Full-Body Photo'}
                    </span>
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

            {/* Arabic Cached Fields Review */}
            <div className="border-t border-slate-200 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-semibold text-slate-800">
                    Arabic CV Fields (Auto-Translated / Manual Override)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Leave blank to auto-translate on save, or click Auto-Translate to preview now.
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

        {/* Footer Controls */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>
            {step < STEPS.length - 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
              >
                Next Step
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSave('DRAFT')}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save as Draft'}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSave('PUBLISHED')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              <span>{submitting ? 'Saving...' : 'Save & Publish'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
