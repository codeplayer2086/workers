import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FileCheck2, Lock, Trash2, Upload } from 'lucide-react';
import { DashboardShell } from '../../components/layout/DashboardShell';
import {
  WorkerMultiStepForm,
  type WorkerFormPayload,
} from '../../components/forms/WorkerMultiStepForm';
import { apiFetch } from '../../lib/api';
import { DOC_TYPES } from '../../lib/cv-dictionary';
import type { Company, WorkerDetail, WorkerDocumentItem } from '../../types/portal';

export function WorkerEditPage() {
  const { id } = useParams<{ id: string }>();
  const [worker, setWorker] = useState<WorkerDetail | null>(null);
  const [documents, setDocuments] = useState<WorkerDocumentItem[]>([]);
  const [contractedCompany, setContractedCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Internal Compliance Upload
  const [docType, setDocType] = useState('PASSPORT_SCAN');
  const [docExpiry, setDocExpiry] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Contracted Modal
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractCompanyId, setContractCompanyId] = useState('');
  const [contractDate, setContractDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [contractNotes, setContractNotes] = useState('');

  const loadWorker = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [detail, compList] = await Promise.all([
        apiFetch<{
          worker: WorkerDetail;
          documents: WorkerDocumentItem[];
          contractedCompany: Company | null;
        }>(`/api/workers/${id}`),
        apiFetch<Company[]>('/api/admin/companies'),
      ]);
      setWorker(detail.worker);
      setDocuments(detail.documents);
      setContractedCompany(detail.contractedCompany);
      setCompanies(compList);
      if (compList.length > 0 && !contractCompanyId) {
        setContractCompanyId(compList[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load worker');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWorker();
  }, [id]);

  const handleSaveWorker = async (
    payload: WorkerFormPayload,
    photos: { faceFile: File | null; fullBodyFile: File | null }
  ) => {
    if (!id) return;
    setSubmitting(true);
    setError(null);
    setFeedback(null);
    try {
      if (photos.faceFile || photos.fullBodyFile) {
        const fd = new FormData();
        if (photos.faceFile) fd.append('facePhoto', photos.faceFile);
        if (photos.fullBodyFile) fd.append('fullBodyPhoto', photos.fullBodyFile);
        await apiFetch(`/api/workers/${id}/photos`, { method: 'POST', body: fd });
      }

      const updated = await apiFetch<WorkerDetail>(`/api/workers/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...payload,
          heightCm: payload.heightCm ? Number(payload.heightCm) : null,
          weightKg: payload.weightKg ? Number(payload.weightKg) : null,
          expectedSalarySar: payload.expectedSalarySar ? Number(payload.expectedSalarySar) : null,
        }),
      });
      setWorker(updated);
      setFeedback('Worker record saved and Arabic CV cache synchronized.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update worker');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (nextStatus: 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED') => {
    if (!id) return;
    setError(null);
    setFeedback(null);
    try {
      const updated = await apiFetch<WorkerDetail>(`/api/workers/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: nextStatus }),
      });
      setWorker(updated);
      setFeedback(`Worker status updated to ${updated.status}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change status');
    }
  };

  const handleContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError(null);
    try {
      const updated = await apiFetch<WorkerDetail>(`/api/workers/${id}/contract`, {
        method: 'POST',
        body: JSON.stringify({
          contractedCompanyId: contractCompanyId,
          contractedAt: contractDate,
          contractedNotes: contractNotes,
        }),
      });
      setWorker(updated);
      setContractedCompany(companies.find((c) => c.id === contractCompanyId) ?? null);
      setShowContractModal(false);
      setFeedback('Worker marked as CONTRACTED and hidden from other international agents.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark contracted');
    }
  };

  const handleUploadDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploadingDoc(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('docType', docType);
      if (docExpiry) fd.append('expiryDate', docExpiry);
      const doc = await apiFetch<WorkerDocumentItem>(`/api/workers/${id}/documents`, {
        method: 'POST',
        body: fd,
      });
      setDocuments((prev) => [doc, ...prev]);
      setFeedback(`Uploaded internal compliance file: ${doc.fileName}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Document upload failed');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!id) return;
    await apiFetch(`/api/workers/${id}/documents/${docId}`, { method: 'DELETE' });
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
  };

  return (
    <DashboardShell
      title={worker ? `${worker.fullNameEn} (${worker.workerCode})` : 'Edit Worker'}
      breadcrumb="Staff / Worker Directory / Edit"
      primaryAction={
        worker && (
          <Link
            to={`/agent/candidates/${worker.id}`}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            Preview A4 CV
          </Link>
        )
      }
    >
      {loading && <div className="p-8 text-sm text-slate-500">Loading worker dossier...</div>}

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}
      {feedback && (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {feedback}
        </div>
      )}

      {worker && (
        <div className="space-y-8">
          {/* Lifecycle & Contracting Control Strip */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5">
            <div>
              <p className="text-xs font-medium text-slate-500">Current Lifecycle Status</p>
              <p className="mt-1 font-display text-lg font-bold text-slate-900">
                {worker.status}
                {worker.status === 'CONTRACTED' && contractedCompany && (
                  <span className="ml-2 text-sm font-normal text-slate-600">
                    with {contractedCompany.nameEn}
                  </span>
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {worker.status !== 'PUBLISHED' && (
                <button
                  type="button"
                  onClick={() => handleStatusChange('PUBLISHED')}
                  className="rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  Publish to Agents
                </button>
              )}
              {worker.status === 'PUBLISHED' && (
                <button
                  type="button"
                  onClick={() => handleStatusChange('UNPUBLISHED')}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Unpublish
                </button>
              )}
              {worker.status !== 'CONTRACTED' && (
                <button
                  type="button"
                  onClick={() => setShowContractModal(true)}
                  className="rounded-lg bg-sky-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-800"
                >
                  Mark as Contracted
                </button>
              )}
            </div>
          </div>

          {/* Multi-Step Profile Editor */}
          <WorkerMultiStepForm
            initialWorker={worker}
            submitting={submitting}
            onSubmit={handleSaveWorker}
          />

          {/* Internal Compliance Document Vault (Strictly Hidden from Agents) */}
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="flex items-center gap-2 font-display text-base font-semibold text-slate-900">
                  <Lock className="h-4 w-4 text-slate-600" />
                  <span>Internal Compliance Document Vault</span>
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Strictly internal to Dhaka staff and Admin. International agents cannot view or
                  download these scanned documents.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  aria-label="Document type"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                >
                  {Object.entries(DOC_TYPES).map(([code, meta]) => (
                    <option key={code} value={code}>
                      {meta.en}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  aria-label="Document expiry date"
                  value={docExpiry}
                  onChange={(e) => setDocExpiry(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800">
                  <Upload className="h-3.5 w-3.5" />
                  <span>{uploadingDoc ? 'Uploading...' : 'Upload Scan'}</span>
                  <input type="file" onChange={handleUploadDoc} className="sr-only" />
                </label>
              </div>
            </div>

            {documents.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">
                No compliance scans uploaded yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-4 py-3 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <FileCheck2 className="h-4 w-4 text-sky-600" />
                      <div>
                        <p className="font-medium text-slate-900">{doc.fileName}</p>
                        <p className="text-xs text-slate-500">
                          {DOC_TYPES[doc.docType]?.en || doc.docType}
                          {doc.expiryDate
                            ? ` · Expires ${new Date(doc.expiryDate).toLocaleDateString()}`
                            : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={doc.filePath}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        View File
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteDoc(doc.id)}
                        aria-label={`Delete ${doc.fileName}`}
                        className="rounded p-1.5 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Mark as Contracted Modal */}
      {showContractModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mark Worker as Contracted"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        >
          <form
            onSubmit={handleContractSubmit}
            className="w-full max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-lg"
          >
            <h2 className="font-display text-lg font-bold text-slate-900">
              Mark Worker as Contracted
            </h2>
            <p className="text-xs text-slate-600">
              Recording external placement hides this worker immediately from all other Saudi/GCC
              agents.
            </p>

            <div>
              <label htmlFor="contract-company" className="block text-xs font-medium text-slate-700">
                Hiring Saudi / GCC Agency *
              </label>
              <select
                id="contract-company"
                required
                value={contractCompanyId}
                onChange={(e) => setContractCompanyId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameEn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="contract-date" className="block text-xs font-medium text-slate-700">
                Contract Date *
              </label>
              <input
                id="contract-date"
                type="date"
                required
                value={contractDate}
                onChange={(e) => setContractDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="contract-notes" className="block text-xs font-medium text-slate-700">
                Placement Notes
              </label>
              <textarea
                id="contract-notes"
                rows={2}
                value={contractNotes}
                onChange={(e) => setContractNotes(e.target.value)}
                placeholder="Visa reference or external coordination note..."
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowContractModal(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Confirm Contracted Status
              </button>
            </div>
          </form>
        </div>
      )}
    </DashboardShell>
  );
}
