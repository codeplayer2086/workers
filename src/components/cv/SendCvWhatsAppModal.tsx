import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Search,
  Send,
  X,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import type { CvLang } from '../../lib/cv-dictionary';
import { generateCvExportPayload } from '../../lib/cv-renderer';
import {
  buildWhatsAppCvCaption,
  formatNormalizedPhoneDisplay,
} from '../../lib/whatsapp-utils';
import type {
  AgentCustomerItem,
  Company,
  CompanyCvTemplate,
  WhatsAppSendResultItem,
  WorkerDetail,
  WorkerSummary,
} from '../../types/portal';
import { CVDocumentA4 } from './CVDocumentA4';

interface SendCvWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker?: WorkerDetail | null;
  companyOverride?: Company | null;
  templateOverride?: CompanyCvTemplate | null;
  initialLanguage?: CvLang;
  preselectedCustomerIds?: string[];
  onSent?: () => void;
}

export function SendCvWhatsAppModal({
  isOpen,
  onClose,
  worker = null,
  companyOverride = null,
  templateOverride = null,
  initialLanguage = 'AR',
  preselectedCustomerIds = [],
  onSent,
}: SendCvWhatsAppModalProps) {
  const { user, company: authCompany, template: authTemplate } = useAuth();
  const effectiveCompany = companyOverride ?? authCompany;
  const effectiveTemplate = templateOverride ?? authTemplate;

  const [customers, setCustomers] = useState<AgentCustomerItem[]>([]);
  const [gatewayConfigured, setGatewayConfigured] = useState<boolean>(true);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const [publishedWorkers, setPublishedWorkers] = useState<WorkerSummary[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(worker?.id || '');
  const [loadedWorker, setLoadedWorker] = useState<WorkerDetail | null>(worker);
  const [loadingWorkerDetail, setLoadingWorkerDetail] = useState(false);

  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>(preselectedCustomerIds);
  const [customerSearch, setCustomerSearch] = useState('');
  const [language, setLanguage] = useState<CvLang>(initialLanguage);
  const [format, setFormat] = useState<'PDF' | 'PNG'>('PDF');
  const [caption, setCaption] = useState('');

  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<WhatsAppSendResultItem[] | null>(null);

  const offscreenCvRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setResults(null);
    setLanguage(initialLanguage);
    setSelectedCustomerIds(preselectedCustomerIds);

    setLoadingCustomers(true);
    apiFetch<{
      gateway: { configured: boolean };
      customers: AgentCustomerItem[];
    }>('/api/whatsapp/customers')
      .then((res) => {
        setCustomers(res.customers);
        setGatewayConfigured(res.gateway.configured);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load verified householders');
      })
      .finally(() => setLoadingCustomers(false));

    if (worker) {
      setLoadedWorker(worker);
      setSelectedWorkerId(worker.id);
    } else {
      setLoadedWorker(null);
      apiFetch<WorkerSummary[]>('/api/candidates')
        .then((list) => {
          setPublishedWorkers(list);
          if (list.length > 0 && !selectedWorkerId) {
            setSelectedWorkerId(list[0].id);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, worker?.id]);

  useEffect(() => {
    if (!isOpen || worker || !selectedWorkerId) return;
    setLoadingWorkerDetail(true);
    apiFetch<{ candidate: WorkerDetail }>(`/api/candidates/${selectedWorkerId}`)
      .then((res) => {
        setLoadedWorker(res.candidate);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load selected candidate');
      })
      .finally(() => setLoadingWorkerDetail(false));
  }, [isOpen, worker, selectedWorkerId]);

  const activeWorker = worker ?? loadedWorker;
  const verifiedCustomers = useMemo(
    () => customers.filter((c) => c.whatsappStatus === 'VERIFIED'),
    [customers]
  );

  const filteredVerifiedCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return verifiedCustomers;
    return verifiedCustomers.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.phoneNumber.includes(q) ||
        (c.notes || '').toLowerCase().includes(q)
    );
  }, [verifiedCustomers, customerSearch]);

  const toggleCustomer = (id: string) => {
    setSelectedCustomerIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllVisible = () => {
    const ids = filteredVerifiedCustomers.map((c) => c.id);
    setSelectedCustomerIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const clearSelection = () => setSelectedCustomerIds([]);

  const previewSignedCaption = useMemo(() => {
    if (!activeWorker) return '';
    return buildWhatsAppCvCaption({
      customCaption: caption,
      agentName: user?.fullName || 'Agent',
      companyName: effectiveCompany?.nameEn || 'Recruitment Partner',
      workerCode: activeWorker.workerCode,
      workerName:
        language === 'AR'
          ? activeWorker.fullNameAr || activeWorker.fullNameEn
          : activeWorker.fullNameEn,
      language,
    });
  }, [activeWorker, caption, user?.fullName, effectiveCompany?.nameEn, language]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorker) {
      setError('Please select a published candidate first.');
      return;
    }
    if (selectedCustomerIds.length === 0) {
      setError('Select at least one WhatsApp-verified householder recipient.');
      return;
    }
    if (!offscreenCvRef.current) {
      setError('CV generator preview is still initializing. Please try again.');
      return;
    }

    setSending(true);
    setError(null);
    setResults(null);

    try {
      const payload = await generateCvExportPayload(
        offscreenCvRef.current,
        activeWorker.workerCode,
        language,
        format
      );

      const response = await apiFetch<{
        sentCount: number;
        failedCount: number;
        results: WhatsAppSendResultItem[];
      }>('/api/whatsapp/send-cv', {
        method: 'POST',
        body: JSON.stringify({
          workerId: activeWorker.id,
          customerIds: selectedCustomerIds,
          language,
          format,
          caption: caption.trim() || null,
          fileBase64: payload.base64,
          fileName: payload.fileName,
        }),
      });

      setResults(response.results);
      onSent?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to send CV through central WhatsApp'
      );
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Send Branded CV via WhatsApp"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <MessageCircle className="h-5 w-5 text-emerald-600" />
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Send Branded CV via WhatsApp
              </h2>
              <p className="text-xs text-slate-500">
                Dispatched via platform central sender on behalf of{' '}
                {effectiveCompany?.nameEn || 'your agency'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Send CV modal"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSend} className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {!gatewayConfigured && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <div>
                <p className="font-semibold">Central WhatsApp Gateway Not Configured</p>
                <p className="mt-0.5">
                  Configure <span className="font-mono-tabular">WHATSAPP_GATEWAY_URL</span>,{' '}
                  <span className="font-mono-tabular">WHATSAPP_GATEWAY_API_KEY</span>, and{' '}
                  <span className="font-mono-tabular">WHATSAPP_CENTRAL_INSTANCE</span> in{' '}
                  <span className="font-mono-tabular">.env</span> on your server to enable live
                  dispatches.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-800"
            >
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Candidate Selection (either locked to current worker or picker) */}
          {worker ? (
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-xs text-slate-500">Selected Candidate</p>
                <p className="text-sm font-bold text-slate-900">
                  {worker.fullNameEn}{' '}
                  <span className="font-mono-tabular text-xs font-semibold text-sky-700">
                    ({worker.workerCode})
                  </span>
                </p>
              </div>
              <span className="text-xs font-medium text-slate-600">
                Branded for {effectiveCompany?.nameEn || 'Agency'}
              </span>
            </div>
          ) : (
            <div>
              <label
                htmlFor="modal-worker-select"
                className="block text-xs font-semibold text-slate-700"
              >
                Select Published Candidate
              </label>
              <select
                id="modal-worker-select"
                value={selectedWorkerId}
                onChange={(e) => setSelectedWorkerId(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              >
                {publishedWorkers.length === 0 && (
                  <option value="">No published candidates available</option>
                )}
                {publishedWorkers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.workerCode} — {w.fullNameEn} ({w.occupationCode})
                  </option>
                ))}
              </select>
              {loadingWorkerDetail && (
                <p className="mt-1 text-xs text-slate-500">Loading candidate dossier...</p>
              )}
            </div>
          )}

          {/* Language & File Format Controls */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <span className="block text-xs font-semibold text-slate-700">CV Language</span>
              <div
                role="group"
                aria-label="WhatsApp CV Language"
                className="mt-1.5 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1"
              >
                <button
                  type="button"
                  onClick={() => setLanguage('EN')}
                  className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                    language === 'EN'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  English (EN)
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('AR')}
                  className={`font-arabic rounded-md px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                    language === 'AR'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  العربية (AR)
                </button>
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-700">Attachment Format</span>
              <div
                role="group"
                aria-label="WhatsApp CV Format"
                className="mt-1.5 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1"
              >
                <button
                  type="button"
                  onClick={() => setFormat('PDF')}
                  className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                    format === 'PDF'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  PDF Document
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('PNG')}
                  className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                    format === 'PNG'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  PNG Image
                </button>
              </div>
            </div>
          </div>

          {/* Verified Householder Recipients Selector */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700">
                Verified Householder Recipients ({selectedCustomerIds.length} selected)
              </span>
              {verifiedCustomers.length > 0 && (
                <div className="flex items-center gap-3 text-xs">
                  <button
                    type="button"
                    onClick={selectAllVisible}
                    className="font-medium text-sky-700 hover:underline"
                  >
                    Select visible
                  </button>
                  {selectedCustomerIds.length > 0 && (
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="font-medium text-slate-500 hover:text-slate-800"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>

            {loadingCustomers ? (
              <div className="mt-2 rounded-lg border border-slate-200 p-4 text-xs text-slate-500">
                Loading your verified householder contacts...
              </div>
            ) : verifiedCustomers.length === 0 ? (
              <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                <p className="font-semibold text-slate-800">
                  No WhatsApp-verified householders in your directory yet.
                </p>
                <p className="mt-1">
                  Only contacts with status <span className="font-semibold">Verified on WhatsApp</span>{' '}
                  can receive CV files.
                </p>
                <Link
                  to="/agent/customers"
                  onClick={onClose}
                  className="mt-2.5 inline-block rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Manage My Customers
                </Link>
              </div>
            ) : (
              <div className="mt-2 space-y-2 rounded-lg border border-slate-200 p-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Filter verified householders..."
                    className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-xs"
                  />
                </div>
                <div className="max-h-44 divide-y divide-slate-100 overflow-y-auto">
                  {filteredVerifiedCustomers.map((c) => {
                    const checked = selectedCustomerIds.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className="flex cursor-pointer items-center justify-between gap-3 py-2 px-1 hover:bg-slate-50"
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCustomer(c.id)}
                            className="h-4 w-4 rounded border-slate-300 text-slate-900"
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-semibold text-slate-900">
                              {c.fullName}
                            </span>
                            <span className="font-mono-tabular block text-[11px] text-slate-500">
                              {formatNormalizedPhoneDisplay(c.countryCode, c.phoneNumber)}
                            </span>
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 whitespace-nowrap shrink-0">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Verified
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Greeting Message + Appended Signature Preview */}
          <div>
            <label htmlFor="wa-caption-input" className="block text-xs font-semibold text-slate-700">
              Greeting Message (Optional)
            </label>
            <textarea
              id="wa-caption-input"
              rows={2}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a personal note for the family (leave blank for standard greeting)..."
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
            />
            {previewSignedCaption && (
              <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                <p className="font-semibold text-slate-700">WhatsApp Caption Preview:</p>
                <p
                  dir="auto"
                  className={`mt-1 whitespace-pre-line ${language === 'AR' ? 'font-arabic text-right' : ''}`}
                >
                  {previewSignedCaption}
                </p>
              </div>
            )}
          </div>

          {/* Per-Recipient Dispatch Results */}
          {results && (
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3.5">
              <p className="text-xs font-semibold text-slate-900">Dispatch Results</p>
              <div className="divide-y divide-slate-200">
                {results.map((r) => (
                  <div
                    key={r.customerId}
                    className="flex items-center justify-between gap-3 py-2 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-900">{r.customerName}</span>
                      <span className="font-mono-tabular ml-2 text-slate-500">
                        +{r.phoneNumber}
                      </span>
                      {r.errorMsg && (
                        <p className="mt-0.5 text-[11px] text-red-700">{r.errorMsg}</p>
                      )}
                    </div>
                    {r.status === 'SENT' ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 whitespace-nowrap">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Sent
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-semibold text-red-700 whitespace-nowrap">
                        <XCircle className="h-3.5 w-3.5" />
                        Failed
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={sending || !activeWorker || selectedCustomerIds.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
            >
              {sending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Generating & Sending...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>
                    {results ? 'Send Again' : `Send ${format} (${language})`} to{' '}
                    {selectedCustomerIds.length || 0}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Offscreen A4 Branded CV Generator Target */}
        {activeWorker && (
          <div
            className="pointer-events-none fixed -left-[9999px] top-0 opacity-100"
            aria-hidden="true"
          >
            <CVDocumentA4
              ref={offscreenCvRef}
              candidate={activeWorker}
              company={effectiveCompany}
              template={effectiveTemplate}
              language={language}
            />
          </div>
        )}
      </div>
    </div>
  );
}
