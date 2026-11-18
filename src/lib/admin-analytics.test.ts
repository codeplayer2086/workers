import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCompanyEngagement,
  buildOccupationBreakdown,
  buildWorkerAlerts,
  computeDaysUntil,
} from './admin-analytics';

test('computeDaysUntil calculates positive and negative day offsets accurately', () => {
  const now = new Date('2026-11-18T00:00:00Z');
  assert.equal(computeDaysUntil('2026-12-18T00:00:00Z', now), 30);
  assert.equal(computeDaysUntil('2026-11-08T00:00:00Z', now), -10);
  assert.equal(computeDaysUntil(null, now), null);
});

test('buildWorkerAlerts flags expiring passports, missing photos, and missing compliance docs for non-contracted workers', () => {
  const now = new Date('2026-11-18T00:00:00Z');
  const docsMap = new Map<string, number>([['w1', 2]]);
  const alerts = buildWorkerAlerts(
    [
      {
        id: 'w1',
        workerCode: 'WKR-2026-0001',
        fullNameEn: 'Amina Begum',
        status: 'PUBLISHED',
        occupationCode: 'HOUSEMAID',
        passportExpiryDate: '2027-01-18T00:00:00Z', // 61 days left
        facePhotoPath: '/api/files/face/a.webp',
        fullBodyPhotoPath: '/api/files/full/a.webp',
        contractedCompanyId: null,
      },
      {
        id: 'w2',
        workerCode: 'WKR-2026-0002',
        fullNameEn: 'Rahima Akter',
        status: 'DRAFT',
        occupationCode: 'COOK',
        passportExpiryDate: '2030-01-01T00:00:00Z',
        facePhotoPath: null,
        fullBodyPhotoPath: null,
        contractedCompanyId: null,
      },
      {
        id: 'w3',
        workerCode: 'WKR-2026-0003',
        fullNameEn: 'Salma Begum',
        status: 'CONTRACTED',
        occupationCode: 'DRIVER',
        passportExpiryDate: '2025-01-01T00:00:00Z',
        facePhotoPath: null,
        fullBodyPhotoPath: null,
        contractedCompanyId: 'comp_1',
      },
    ],
    docsMap,
    now
  );

  assert.equal(alerts.some((a) => a.workerId === 'w1' && a.alertType === 'PASSPORT_EXPIRING'), true);
  assert.equal(alerts.some((a) => a.workerId === 'w2' && a.alertType === 'MISSING_PHOTOS'), true);
  assert.equal(alerts.some((a) => a.workerId === 'w2' && a.alertType === 'NO_COMPLIANCE_DOCS'), true);
  // Contracted workers are excluded from active readiness alerts
  assert.equal(alerts.some((a) => a.workerId === 'w3'), false);
});

test('buildOccupationBreakdown and buildCompanyEngagement aggregate supply and partner exports', () => {
  const workers = [
    {
      id: 'w1',
      workerCode: 'WKR-1',
      fullNameEn: 'A',
      status: 'PUBLISHED' as const,
      occupationCode: 'HOUSEMAID',
      passportExpiryDate: null,
      facePhotoPath: 'a',
      fullBodyPhotoPath: 'b',
      contractedCompanyId: null,
    },
    {
      id: 'w2',
      workerCode: 'WKR-2',
      fullNameEn: 'B',
      status: 'CONTRACTED' as const,
      occupationCode: 'HOUSEMAID',
      passportExpiryDate: null,
      facePhotoPath: 'a',
      fullBodyPhotoPath: 'b',
      contractedCompanyId: 'c1',
    },
  ];
  const occ = buildOccupationBreakdown(workers);
  assert.equal(occ[0].occupationCode, 'HOUSEMAID');
  assert.equal(occ[0].total, 2);
  assert.equal(occ[0].published, 1);
  assert.equal(occ[0].contracted, 1);

  const engagement = buildCompanyEngagement(
    [{ id: 'c1', nameEn: 'Al-Jazira', country: 'Saudi Arabia', isActive: true }],
    [{ role: 'AGENT', companyId: 'c1', isActive: true }],
    [
      { companyId: 'c1', language: 'EN' },
      { companyId: 'c1', language: 'AR' },
      { companyId: 'c1', language: 'AR' },
    ],
    workers
  );
  assert.equal(engagement[0].agentCount, 1);
  assert.equal(engagement[0].enExports, 1);
  assert.equal(engagement[0].arExports, 2);
  assert.equal(engagement[0].contractedCount, 1);
});
