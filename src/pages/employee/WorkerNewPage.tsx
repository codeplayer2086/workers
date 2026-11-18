import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardShell } from '../../components/layout/DashboardShell';
import {
  WorkerMultiStepForm,
  type WorkerFormPayload,
} from '../../components/forms/WorkerMultiStepForm';
import { apiFetch } from '../../lib/api';

export function WorkerNewPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (
    payload: WorkerFormPayload,
    photos: { faceFile: File | null; fullBodyFile: File | null }
  ) => {
    setSubmitting(true);
    setError(null);
    try {
      // Save initial record as DRAFT first if photos need to be uploaded before publishing
      const initialStatus =
        payload.status === 'PUBLISHED' && (photos.faceFile || photos.fullBodyFile)
          ? 'DRAFT'
          : payload.status;

      const created = await apiFetch<{ id: string }>('/api/workers', {
        method: 'POST',
        body: JSON.stringify({
          ...payload,
          status: initialStatus,
          heightCm: payload.heightCm ? Number(payload.heightCm) : null,
          weightKg: payload.weightKg ? Number(payload.weightKg) : null,
          expectedSalarySar: payload.expectedSalarySar ? Number(payload.expectedSalarySar) : null,
        }),
      });

      if (photos.faceFile || photos.fullBodyFile) {
        const fd = new FormData();
        if (photos.faceFile) fd.append('facePhoto', photos.faceFile);
        if (photos.fullBodyFile) fd.append('fullBodyPhoto', photos.fullBodyFile);
        await apiFetch(`/api/workers/${created.id}/photos`, {
          method: 'POST',
          body: fd,
        });
      }

      if (payload.status === 'PUBLISHED' && initialStatus === 'DRAFT') {
        await apiFetch(`/api/workers/${created.id}/status`, {
          method: 'POST',
          body: JSON.stringify({ status: 'PUBLISHED' }),
        });
      }

      navigate(`/employee/workers/${created.id}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create worker');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardShell title="Register New Worker" breadcrumb="Staff / Worker Directory / New">
      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      <WorkerMultiStepForm submitting={submitting} onSubmit={handleSubmit} />
    </DashboardShell>
  );
}
