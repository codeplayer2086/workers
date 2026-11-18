import React, { useEffect, useState } from 'react';
import { Building2, Palette, Plus, Upload } from 'lucide-react';
import { DashboardShell } from '../../components/layout/DashboardShell';
import { apiFetch } from '../../lib/api';
import type { Company, CompanyCvTemplate } from '../../types/portal';

export function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // New Company Form State
  const [newNameEn, setNewNameEn] = useState('');
  const [newNameAr, setNewNameAr] = useState('');
  const [newCountry, setNewCountry] = useState('Saudi Arabia');
  const [newLicense, setNewLicense] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');

  // Template Editor State
  const [tpl, setTpl] = useState<CompanyCvTemplate | null>(null);
  const [savingTpl, setSavingTpl] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const list = await apiFetch<Company[]>('/api/admin/companies');
      setCompanies(list);
      if (list.length > 0 && !selectedId) {
        setSelectedId(list[0].id);
        setTpl(list[0].template ?? null);
      } else if (selectedId) {
        const match = list.find((c) => c.id === selectedId);
        if (match) setTpl(match.template ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCompanies();
  }, []);

  const selectedCompany = companies.find((c) => c.id === selectedId) ?? null;

  const handleSelectCompany = (comp: Company) => {
    setSelectedId(comp.id);
    setTpl(comp.template ?? null);
    setFeedback(null);
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFeedback(null);
    try {
      const created = await apiFetch<Company>('/api/admin/companies', {
        method: 'POST',
        body: JSON.stringify({
          nameEn: newNameEn,
          nameAr: newNameAr,
          country: newCountry,
          licenseNumber: newLicense || null,
          contactEmail: newEmail || null,
          contactPhone: newPhone || null,
          address: newAddress || null,
        }),
      });
      setCompanies((prev) => [...prev, created]);
      setSelectedId(created.id);
      setTpl(created.template ?? null);
      setShowCreateForm(false);
      setNewNameEn('');
      setNewNameAr('');
      setNewLicense('');
      setNewEmail('');
      setNewPhone('');
      setNewAddress('');
      setFeedback(`Registered ${created.nameEn} with a default CV template.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create company');
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCompany) return;
    setUploadingLogo(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const res = await apiFetch<{ logoPath: string }>(
        `/api/admin/companies/${selectedCompany.id}/logo`,
        { method: 'POST', body: fd }
      );
      setCompanies((prev) =>
        prev.map((c) => (c.id === selectedCompany.id ? { ...c, logoPath: res.logoPath } : c))
      );
      setFeedback('Company logo updated and optimized.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logo upload failed');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany || !tpl) return;
    setSavingTpl(true);
    setError(null);
    setFeedback(null);
    try {
      const updated = await apiFetch<CompanyCvTemplate>(
        `/api/admin/companies/${selectedCompany.id}/template`,
        {
          method: 'PUT',
          body: JSON.stringify({
            primaryColor: tpl.primaryColor,
            secondaryColor: tpl.secondaryColor,
            accentColor: tpl.accentColor,
            headerTextEn: tpl.headerTextEn,
            headerTextAr: tpl.headerTextAr,
            footerTextEn: tpl.footerTextEn,
            footerTextAr: tpl.footerTextAr,
            showPassportNumber: tpl.showPassportNumber,
            showSalary: tpl.showSalary,
            showBorderAndIqama: tpl.showBorderAndIqama,
            visibleFields: tpl.visibleFields,
          }),
        }
      );
      setCompanies((prev) =>
        prev.map((c) => (c.id === selectedCompany.id ? { ...c, template: updated } : c))
      );
      setTpl(updated);
      setFeedback(`Saved fixed CV template for ${selectedCompany.nameEn}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save CV template');
    } finally {
      setSavingTpl(false);
    }
  };

  return (
    <DashboardShell
      title="International Companies & CV Templates"
      breadcrumb="Admin / Companies"
      primaryAction={
        <button
          type="button"
          onClick={() => setShowCreateForm((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>{showCreateForm ? 'Cancel' : 'Register Company'}</span>
        </button>
      }
    >
      <div className="space-y-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}
        {feedback && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {feedback}
          </div>
        )}

        {showCreateForm && (
          <form
            onSubmit={handleCreateCompany}
            className="rounded-xl border border-slate-200 bg-white p-6"
          >
            <h2 className="font-display text-base font-semibold text-slate-900">
              Register Saudi / GCC Hiring Agency
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Company Name (English) *
                </label>
                <input
                  type="text"
                  required
                  value={newNameEn}
                  onChange={(e) => setNewNameEn(e.target.value)}
                  placeholder="e.g., Al-Watan Manpower Co."
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Company Name (Arabic) *
                </label>
                <input
                  type="text"
                  required
                  dir="rtl"
                  value={newNameAr}
                  onChange={(e) => setNewNameAr(e.target.value)}
                  placeholder="مثال: شركة الوطن للاستقدام"
                  className="font-arabic mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Country</label>
                <input
                  type="text"
                  value={newCountry}
                  onChange={(e) => setNewCountry(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">License Number</label>
                <input
                  type="text"
                  value={newLicense}
                  onChange={(e) => setNewLicense(e.target.value)}
                  placeholder="KSA-MOMRA-..."
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Contact Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Contact Phone</label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+966 ..."
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-700">Office Address</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Create Company & Default CV Template
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Company List (4 cols) */}
          <div className="space-y-3 lg:col-span-4">
            {loading ? (
              <div className="h-48 animate-pulse rounded-xl border border-slate-200 bg-white" />
            ) : (
              companies.map((comp) => (
                <button
                  key={comp.id}
                  type="button"
                  onClick={() => handleSelectCompany(comp)}
                  className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                    selectedId === comp.id
                      ? 'border-sky-600 bg-sky-50/50'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white p-1">
                    {comp.logoPath ? (
                      <img
                        src={comp.logoPath}
                        alt={comp.nameEn}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <Building2 className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm font-semibold text-slate-900">
                      {comp.nameEn}
                    </p>
                    <p dir="rtl" className="font-arabic truncate text-xs text-slate-600">
                      {comp.nameAr}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {comp.country} · {comp.agentCount ?? 0} agents
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Fixed Company CV Template Editor (8 cols) */}
          <div className="lg:col-span-8">
            {selectedCompany && tpl ? (
              <form
                onSubmit={handleSaveTemplate}
                className="space-y-6 rounded-xl border border-slate-200 bg-white p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-3">
                    {selectedCompany.logoPath && (
                      <img
                        src={selectedCompany.logoPath}
                        alt={selectedCompany.nameEn}
                        referrerPolicy="no-referrer"
                        className="h-12 w-12 rounded-lg border border-slate-200 object-contain p-1"
                      />
                    )}
                    <div>
                      <h2 className="font-display text-base font-bold text-slate-900">
                        {selectedCompany.nameEn}
                      </h2>
                      <p className="text-xs text-slate-500">
                        Fixed Company-Branded CV Template Configuration
                      </p>
                    </div>
                  </div>

                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    <Upload className="h-3.5 w-3.5" />
                    <span>{uploadingLogo ? 'Uploading...' : 'Upload Logo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="sr-only"
                    />
                  </label>
                </div>

                {/* Color Palette */}
                <div>
                  <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <Palette className="h-4 w-4 text-sky-600" />
                    <span>Brand Colors</span>
                  </h3>
                  <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <label className="block rounded-lg border border-slate-200 p-3">
                      <span className="block text-xs font-medium text-slate-600">Primary Color</span>
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="color"
                          value={tpl.primaryColor}
                          onChange={(e) => setTpl({ ...tpl, primaryColor: e.target.value })}
                          className="h-8 w-10 cursor-pointer rounded border border-slate-300"
                        />
                        <span className="font-mono-tabular text-xs text-slate-700">
                          {tpl.primaryColor}
                        </span>
                      </div>
                    </label>
                    <label className="block rounded-lg border border-slate-200 p-3">
                      <span className="block text-xs font-medium text-slate-600">
                        Secondary Banner
                      </span>
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="color"
                          value={tpl.secondaryColor}
                          onChange={(e) => setTpl({ ...tpl, secondaryColor: e.target.value })}
                          className="h-8 w-10 cursor-pointer rounded border border-slate-300"
                        />
                        <span className="font-mono-tabular text-xs text-slate-700">
                          {tpl.secondaryColor}
                        </span>
                      </div>
                    </label>
                    <label className="block rounded-lg border border-slate-200 p-3">
                      <span className="block text-xs font-medium text-slate-600">Accent Stripe</span>
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="color"
                          value={tpl.accentColor}
                          onChange={(e) => setTpl({ ...tpl, accentColor: e.target.value })}
                          className="h-8 w-10 cursor-pointer rounded border border-slate-300"
                        />
                        <span className="font-mono-tabular text-xs text-slate-700">
                          {tpl.accentColor}
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Custom Headers & Footers */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      CV Header Text (English)
                    </label>
                    <input
                      type="text"
                      value={tpl.headerTextEn || ''}
                      onChange={(e) => setTpl({ ...tpl, headerTextEn: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      CV Header Text (Arabic)
                    </label>
                    <input
                      type="text"
                      dir="rtl"
                      value={tpl.headerTextAr || ''}
                      onChange={(e) => setTpl({ ...tpl, headerTextAr: e.target.value })}
                      className="font-arabic mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      CV Footer Text (English)
                    </label>
                    <input
                      type="text"
                      value={tpl.footerTextEn || ''}
                      onChange={(e) => setTpl({ ...tpl, footerTextEn: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      CV Footer Text (Arabic)
                    </label>
                    <input
                      type="text"
                      dir="rtl"
                      value={tpl.footerTextAr || ''}
                      onChange={(e) => setTpl({ ...tpl, footerTextAr: e.target.value })}
                      className="font-arabic mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                {/* Visible Fields Checkboxes */}
                <div>
                  <h3 className="text-xs font-semibold text-slate-700">
                    Fields Shown on Company CVs
                  </h3>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <label className="flex items-center gap-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={tpl.showPassportNumber}
                        onChange={(e) => setTpl({ ...tpl, showPassportNumber: e.target.checked })}
                      />
                      <span>Passport Number</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={tpl.showSalary}
                        onChange={(e) => setTpl({ ...tpl, showSalary: e.target.checked })}
                      />
                      <span>Expected Salary</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={tpl.showBorderAndIqama}
                        onChange={(e) => setTpl({ ...tpl, showBorderAndIqama: e.target.checked })}
                      />
                      <span>Border & Iqama No.</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={tpl.visibleFields.height}
                        onChange={(e) =>
                          setTpl({
                            ...tpl,
                            visibleFields: { ...tpl.visibleFields, height: e.target.checked },
                          })
                        }
                      />
                      <span>Height (cm)</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={tpl.visibleFields.weight}
                        onChange={(e) =>
                          setTpl({
                            ...tpl,
                            visibleFields: { ...tpl.visibleFields, weight: e.target.checked },
                          })
                        }
                      />
                      <span>Weight (kg)</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={tpl.visibleFields.notes}
                        onChange={(e) =>
                          setTpl({
                            ...tpl,
                            visibleFields: { ...tpl.visibleFields, notes: e.target.checked },
                          })
                        }
                      />
                      <span>Evaluator Notes</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end border-t border-slate-200 pt-4">
                  <button
                    type="submit"
                    disabled={savingTpl}
                    className="rounded-lg bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {savingTpl ? 'Saving Template...' : 'Save Company CV Template'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                Select an international company to customize its CV template.
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
