export interface WorkerAnalyticsInput {
  id: string;
  workerCode: string;
  fullNameEn: string;
  status: 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' | 'CONTRACTED';
  occupationCode: string;
  passportExpiryDate: Date | string | null;
  facePhotoPath: string | null;
  fullBodyPhotoPath: string | null;
  contractedCompanyId: string | null;
}

export interface CompanyAnalyticsInput {
  id: string;
  nameEn: string;
  country: string;
  isActive: boolean;
}

export interface UserAnalyticsInput {
  role: 'ADMIN' | 'EMPLOYEE' | 'AGENT';
  companyId: string | null;
  isActive: boolean;
}

export interface DownloadAnalyticsInput {
  companyId: string;
  language: 'EN' | 'AR';
}

export interface WorkerAlertItem {
  workerId: string;
  workerCode: string;
  fullNameEn: string;
  status: string;
  alertType: 'PASSPORT_EXPIRING' | 'PASSPORT_EXPIRED' | 'MISSING_PHOTOS' | 'NO_COMPLIANCE_DOCS';
  detail: string;
  severity: 'high' | 'medium';
}

export interface OccupationStatItem {
  occupationCode: string;
  total: number;
  published: number;
  contracted: number;
  draft: number;
}

export interface CompanyEngagementItem {
  id: string;
  nameEn: string;
  country: string;
  isActive: boolean;
  agentCount: number;
  enExports: number;
  arExports: number;
  totalExports: number;
  contractedCount: number;
}

export function computeDaysUntil(
  targetDate: Date | string | null | undefined,
  referenceDate: Date = new Date()
): number | null {
  if (!targetDate) return null;
  const parsed = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
  if (Number.isNaN(parsed.getTime())) return null;
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((parsed.getTime() - referenceDate.getTime()) / msPerDay);
}

export function buildWorkerAlerts(
  workerList: WorkerAnalyticsInput[],
  docCountByWorker: Map<string, number>,
  referenceDate: Date = new Date()
): WorkerAlertItem[] {
  const alerts: WorkerAlertItem[] = [];

  for (const w of workerList) {
    if (w.status === 'CONTRACTED') continue;

    const daysLeft = computeDaysUntil(w.passportExpiryDate, referenceDate);
    if (daysLeft !== null && daysLeft < 0) {
      alerts.push({
        workerId: w.id,
        workerCode: w.workerCode,
        fullNameEn: w.fullNameEn,
        status: w.status,
        alertType: 'PASSPORT_EXPIRED',
        detail: `Passport expired ${Math.abs(daysLeft)} days ago`,
        severity: 'high',
      });
    } else if (daysLeft !== null && daysLeft <= 180) {
      alerts.push({
        workerId: w.id,
        workerCode: w.workerCode,
        fullNameEn: w.fullNameEn,
        status: w.status,
        alertType: 'PASSPORT_EXPIRING',
        detail: `Passport expires in ${daysLeft} days`,
        severity: 'medium',
      });
    }

    if (!w.facePhotoPath || !w.fullBodyPhotoPath) {
      alerts.push({
        workerId: w.id,
        workerCode: w.workerCode,
        fullNameEn: w.fullNameEn,
        status: w.status,
        alertType: 'MISSING_PHOTOS',
        detail: 'Missing mandatory face or full-body photo',
        severity: 'high',
      });
    }

    if ((docCountByWorker.get(w.id) ?? 0) === 0) {
      alerts.push({
        workerId: w.id,
        workerCode: w.workerCode,
        fullNameEn: w.fullNameEn,
        status: w.status,
        alertType: 'NO_COMPLIANCE_DOCS',
        detail: 'No internal compliance documents uploaded yet',
        severity: 'medium',
      });
    }
  }

  return alerts.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'high' ? -1 : 1;
    return a.workerCode.localeCompare(b.workerCode);
  });
}

export function buildOccupationBreakdown(
  workerList: WorkerAnalyticsInput[]
): OccupationStatItem[] {
  const map = new Map<string, OccupationStatItem>();
  for (const w of workerList) {
    const existing = map.get(w.occupationCode) ?? {
      occupationCode: w.occupationCode,
      total: 0,
      published: 0,
      contracted: 0,
      draft: 0,
    };
    existing.total += 1;
    if (w.status === 'PUBLISHED') existing.published += 1;
    else if (w.status === 'CONTRACTED') existing.contracted += 1;
    else if (w.status === 'DRAFT') existing.draft += 1;
    map.set(w.occupationCode, existing);
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export function buildCompanyEngagement(
  companyList: CompanyAnalyticsInput[],
  userList: UserAnalyticsInput[],
  downloadList: DownloadAnalyticsInput[],
  workerList: WorkerAnalyticsInput[]
): CompanyEngagementItem[] {
  return companyList
    .map((c) => {
      const agentCount = userList.filter(
        (u) => u.role === 'AGENT' && u.companyId === c.id && u.isActive
      ).length;
      const compDownloads = downloadList.filter((d) => d.companyId === c.id);
      const enExports = compDownloads.filter((d) => d.language === 'EN').length;
      const arExports = compDownloads.filter((d) => d.language === 'AR').length;
      const contractedCount = workerList.filter(
        (w) => w.status === 'CONTRACTED' && w.contractedCompanyId === c.id
      ).length;

      return {
        id: c.id,
        nameEn: c.nameEn,
        country: c.country,
        isActive: c.isActive,
        agentCount,
        enExports,
        arExports,
        totalExports: compDownloads.length,
        contractedCount,
      };
    })
    .sort((a, b) => b.totalExports - a.totalExports || b.contractedCount - a.contractedCount);
}
