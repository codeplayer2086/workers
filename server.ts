import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import { and, count, desc, eq, inArray, like, or } from 'drizzle-orm';
import { db } from './src/db/index.ts';
import {
  agentCustomers,
  auditLogs,
  companies,
  companyCvTemplates,
  cvDownloadLogs,
  cvShareLogs,
  users,
  workerDocuments,
  workers,
} from './src/db/schema.ts';
import { ensureDatabaseSeeded } from './src/db/seed.ts';
import {
  clearSessionCookie,
  hashPassword,
  requireAuth,
  requireRole,
  setSessionCookie,
  signSessionToken,
  verifyPassword,
  type AuthRequest,
} from './src/lib/server-auth.ts';
import {
  adminUpdateUserSchema,
  companyCreateSchema,
  contractWorkerSchema,
  createAgentCustomerSchema,
  createAgentSchema,
  createEmployeeSchema,
  cvLogSchema,
  cvTemplateUpdateSchema,
  selfProfileUpdateSchema,
  sendCvWhatsAppSchema,
  workerInputSchema,
} from './src/lib/validation.ts';
import {
  resolvePrivateFilePath,
  saveOptimizedPhoto,
  savePrivateDocumentFile,
  type PrivateFileBucket,
} from './src/lib/image-storage.ts';
import {
  translateCompanyNameToArabic,
  translateWorkerFieldsToArabic,
} from './src/lib/arabic-translator.ts';
import { decryptPasswordForAdmin, encryptPasswordForAdmin } from './src/lib/password-vault.ts';
import { calculateAge } from './src/lib/cv-dictionary.ts';
import { isMysqlConfigured } from './src/lib/runtime-config.ts';
import {
  buildCompanyEngagement,
  buildOccupationBreakdown,
  buildWorkerAlerts,
} from './src/lib/admin-analytics.ts';
import {
  buildWhatsAppCvCaption,
  normalizeWhatsAppPhone,
  type WhatsAppVerificationStatus,
} from './src/lib/whatsapp-utils.ts';
import {
  GatewayNotConfiguredError,
  getCentralGatewayStatus,
  sendCvMediaViaCentralWhatsApp,
  verifyNumberOnCentralWhatsApp,
} from './src/lib/whatsapp-gateway.ts';

const PORT = Number(process.env.PORT || 3000);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
});

async function writeAudit(
  actorId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      id: `aud_${crypto.randomUUID().slice(0, 12)}`,
      actorId,
      action,
      entityType,
      entityId,
      metadata: metadata ?? null,
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

async function deleteUserSafely(targetUserId: string, adminActorId: string): Promise<void> {
  await db
    .update(workers)
    .set({ registeredById: adminActorId })
    .where(eq(workers.registeredById, targetUserId));
  await db
    .update(workers)
    .set({ updatedById: null })
    .where(eq(workers.updatedById, targetUserId));
  await db
    .update(auditLogs)
    .set({ actorId: null })
    .where(eq(auditLogs.actorId, targetUserId));
  await db.delete(cvDownloadLogs).where(eq(cvDownloadLogs.agentId, targetUserId));
  await db.delete(users).where(eq(users.id, targetUserId));
}

async function generateNextWorkerCode(): Promise<string> {
  const year = new Date().getUTCFullYear();
  const prefix = `WKR-${year}-`;
  const existing = await db
    .select({ workerCode: workers.workerCode })
    .from(workers)
    .where(like(workers.workerCode, `${prefix}%`));

  let maxNum = 0;
  for (const row of existing) {
    const suffix = row.workerCode.replace(prefix, '');
    const parsed = Number.parseInt(suffix, 10);
    if (!Number.isNaN(parsed) && parsed > maxNum) {
      maxNum = parsed;
    }
  }
  return `${prefix}${String(maxNum + 1).padStart(4, '0')}`;
}

async function getUserContextPayload(userId: string) {
  const [userRow] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!userRow) return null;

  let company = null;
  let template = null;
  if (userRow.companyId) {
    const [comp] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, userRow.companyId))
      .limit(1);
    company = comp ?? null;
    if (comp) {
      const [tpl] = await db
        .select()
        .from(companyCvTemplates)
        .where(eq(companyCvTemplates.companyId, comp.id))
        .limit(1);
      template = tpl ?? null;
    }
  }

  return {
    user: {
      id: userRow.id,
      fullName: userRow.fullName,
      email: userRow.email,
      role: userRow.role,
      companyId: userRow.companyId,
      isActive: userRow.isActive,
    },
    company,
    template,
  };
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '16mb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  // Ensure MySQL schema & seed data exist lazily on API traffic when configured
  app.use('/api', async (req, res, next) => {
    if (req.path === '/health') {
      next();
      return;
    }
    if (!isMysqlConfigured(process.env)) {
      if (req.path === '/auth/me' && req.method === 'GET') {
        res.json({ user: null, company: null, template: null });
        return;
      }
      res.status(500).json({
        error:
          'MySQL database is not configured in this environment. Add MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, and MYSQL_DATABASE (or DATABASE_URL) in AI Studio Secrets, your hosting environment variables, or .env.',
      });
      return;
    }
    try {
      await ensureDatabaseSeeded();
      next();
    } catch (err) {
      console.error('Database initialization failed:', err);
      res.status(500).json({
        error: 'Unable to connect to MySQL database. Verify MySQL server and .env credentials.',
      });
    }
  });

  // ── AUTHENTICATION ──────────────────────────────────────────────────────────
  app.post('/api/auth/login', async (req, res) => {
    try {
      const email = String(req.body?.email ?? '').trim().toLowerCase();
      const password = String(req.body?.password ?? '');
      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      const [userRow] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (!userRow || !verifyPassword(password, userRow.passwordHash)) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }
      if (!userRow.isActive) {
        res.status(401).json({ error: 'This account has been deactivated by the Administrator' });
        return;
      }

      const token = signSessionToken(userRow.id, userRow.role);
      setSessionCookie(req, res, token);
      const context = await getUserContextPayload(userRow.id);
      res.json({ token, ...context });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Authentication failed' });
    }
  });

  app.post('/api/auth/firebase', requireAuth, async (req: AuthRequest, res) => {
    try {
      const token = signSessionToken(req.currentUser!.id, req.currentUser!.role);
      setSessionCookie(req, res, token);
      const context = await getUserContextPayload(req.currentUser!.id);
      res.json({ token, ...context });
    } catch (err) {
      console.error('Firebase sync error:', err);
      res.status(500).json({ error: 'Failed to synchronize account' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });

  app.get('/api/auth/me', async (req: AuthRequest, res) => {
    try {
      const authHeader = req.headers.authorization;
      const bearerToken =
        authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
      const cookieToken =
        typeof req.cookies?.maktab_session === 'string' ? req.cookies.maktab_session : null;
      if (!bearerToken && !cookieToken) {
        res.json({ user: null, company: null, template: null });
        return;
      }
      await requireAuth(req, res, async () => {
        const context = await getUserContextPayload(req.currentUser!.id);
        res.json(context);
      });
    } catch (err) {
      console.error('Auth me error:', err);
      res.status(500).json({ error: 'Failed to load profile' });
    }
  });

  // ── SELF-SERVICE PROFILE (ADMIN, EMPLOYEE, AGENT) ───────────────────────────
  app.get('/api/profile', requireAuth, async (req: AuthRequest, res) => {
    try {
      const context = await getUserContextPayload(req.currentUser!.id);
      if (!context) {
        res.status(404).json({ error: 'Account not found' });
        return;
      }
      res.json(context);
    } catch (err) {
      console.error('Get profile error:', err);
      res.status(500).json({ error: 'Failed to load profile details' });
    }
  });

  app.put('/api/profile', requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.currentUser!.id;
      const parsed = selfProfileUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid profile update' });
        return;
      }

      const normalizedEmail = parsed.data.email.trim().toLowerCase();
      const [dup] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);
      if (dup && dup.id !== userId) {
        res.status(409).json({ error: 'Another account already uses this email address' });
        return;
      }

      const updateValues: {
        fullName: string;
        email: string;
        updatedAt: Date;
        passwordHash?: string;
        encryptedPassword?: string;
      } = {
        fullName: parsed.data.fullName,
        email: normalizedEmail,
        updatedAt: new Date(),
      };

      if (parsed.data.password) {
        updateValues.passwordHash = hashPassword(parsed.data.password);
        updateValues.encryptedPassword = encryptPasswordForAdmin(parsed.data.password);
      }

      await db.update(users).set(updateValues).where(eq(users.id, userId));

      await writeAudit(userId, 'PROFILE_UPDATED', 'User', userId, {
        email: normalizedEmail,
        passwordChanged: Boolean(parsed.data.password),
      });

      const context = await getUserContextPayload(userId);
      res.json(context);
    } catch (err) {
      console.error('Update profile error:', err);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  // ── PROTECTED PRIVATE FILE STREAMING ─────────────────────────────────────────
  app.get('/api/files/:bucket/:filename', requireAuth, (req: AuthRequest, res) => {
    const bucket = String(req.params.bucket) as PrivateFileBucket;
    const filename = String(req.params.filename);

    if (bucket === 'docs' && req.currentUser!.role === 'AGENT') {
      res.status(403).json({ error: 'Agents are not permitted to download raw compliance files' });
      return;
    }

    const fullPath = resolvePrivateFilePath(bucket, filename);
    if (!fullPath || !fs.existsSync(fullPath)) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.sendFile(fullPath);
  });

  // ── ADMIN ENDPOINTS ──────────────────────────────────────────────────────────
  app.get('/api/admin/overview', requireAuth, requireRole('ADMIN'), async (_req, res) => {
    try {
      const allWorkers = await db
        .select({
          id: workers.id,
          workerCode: workers.workerCode,
          fullNameEn: workers.fullNameEn,
          status: workers.status,
          occupationCode: workers.occupationCode,
          passportExpiryDate: workers.passportExpiryDate,
          facePhotoPath: workers.facePhotoPath,
          fullBodyPhotoPath: workers.fullBodyPhotoPath,
          contractedCompanyId: workers.contractedCompanyId,
        })
        .from(workers);

      const statusCounts = {
        total: allWorkers.length,
        DRAFT: allWorkers.filter((w) => w.status === 'DRAFT').length,
        PUBLISHED: allWorkers.filter((w) => w.status === 'PUBLISHED').length,
        UNPUBLISHED: allWorkers.filter((w) => w.status === 'UNPUBLISHED').length,
        CONTRACTED: allWorkers.filter((w) => w.status === 'CONTRACTED').length,
      };

      const allCompanies = await db
        .select({
          id: companies.id,
          nameEn: companies.nameEn,
          country: companies.country,
          isActive: companies.isActive,
        })
        .from(companies);

      const allUsers = await db
        .select({
          role: users.role,
          companyId: users.companyId,
          isActive: users.isActive,
        })
        .from(users);

      const docCounts = await db
        .select({
          workerId: workerDocuments.workerId,
          count: count(),
        })
        .from(workerDocuments)
        .groupBy(workerDocuments.workerId);
      const docCountByWorker = new Map(docCounts.map((d) => [d.workerId, Number(d.count)]));

      const allDownloadsForStats = await db
        .select({
          companyId: cvDownloadLogs.companyId,
          language: cvDownloadLogs.language,
        })
        .from(cvDownloadLogs);

      const recentDownloads = await db
        .select({
          id: cvDownloadLogs.id,
          language: cvDownloadLogs.language,
          format: cvDownloadLogs.format,
          downloadedAt: cvDownloadLogs.downloadedAt,
          workerCode: workers.workerCode,
          workerNameEn: workers.fullNameEn,
          agentName: users.fullName,
          companyNameEn: companies.nameEn,
        })
        .from(cvDownloadLogs)
        .innerJoin(workers, eq(cvDownloadLogs.workerId, workers.id))
        .innerJoin(users, eq(cvDownloadLogs.agentId, users.id))
        .innerJoin(companies, eq(cvDownloadLogs.companyId, companies.id))
        .orderBy(desc(cvDownloadLogs.downloadedAt))
        .limit(8);

      const recentAudits = await db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          createdAt: auditLogs.createdAt,
          actorName: users.fullName,
          actorRole: users.role,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.actorId, users.id))
        .orderBy(desc(auditLogs.createdAt))
        .limit(8);

      const alerts = buildWorkerAlerts(allWorkers, docCountByWorker).slice(0, 8);
      const occupationBreakdown = buildOccupationBreakdown(allWorkers);
      const companyEngagement = buildCompanyEngagement(
        allCompanies,
        allUsers,
        allDownloadsForStats,
        allWorkers
      );

      res.json({
        statusCounts,
        companyCount: allCompanies.length,
        agentCount: allUsers.filter((u) => u.role === 'AGENT').length,
        employeeCount: allUsers.filter((u) => u.role === 'EMPLOYEE').length,
        totalDownloads: allDownloadsForStats.length,
        recentDownloads,
        recentAudits,
        alerts,
        occupationBreakdown,
        companyEngagement,
      });
    } catch (err) {
      console.error('Admin overview failed:', err);
      res.status(500).json({ error: 'Failed to load admin metrics' });
    }
  });

  app.get(
    '/api/admin/companies',
    requireAuth,
    requireRole('ADMIN', 'EMPLOYEE'),
    async (_req, res) => {
      try {
        const companyRows = await db.select().from(companies).orderBy(companies.nameEn);
        const templateRows = await db.select().from(companyCvTemplates);
        const templateMap = new Map(templateRows.map((t) => [t.companyId, t]));
        const agentCounts = await db
          .select({
            companyId: users.companyId,
            count: count(),
          })
          .from(users)
          .where(eq(users.role, 'AGENT'))
          .groupBy(users.companyId);
        const countMap = new Map(agentCounts.map((a) => [a.companyId, Number(a.count)]));

        res.json(
          companyRows.map((c) => ({
            ...c,
            template: templateMap.get(c.id) ?? null,
            agentCount: countMap.get(c.id) ?? 0,
          }))
        );
      } catch (err) {
        console.error('Fetch companies error:', err);
        res.status(500).json({ error: 'Failed to load companies' });
      }
    }
  );

  app.post(
    '/api/companies/translate-preview',
    requireAuth,
    requireRole('ADMIN'),
    async (req, res) => {
      try {
        const nameEn = String(req.body?.nameEn ?? '');
        const nameAr = await translateCompanyNameToArabic(nameEn);
        res.json({ nameAr });
      } catch (err) {
        console.error('Company Arabic translate error:', err);
        res.status(500).json({ error: 'Company name translation failed' });
      }
    }
  );

  app.post('/api/admin/companies', requireAuth, requireRole('ADMIN'), async (req: AuthRequest, res) => {
    try {
      const parsed = companyCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid company payload' });
        return;
      }

      const resolvedNameAr =
        parsed.data.nameAr.trim() || (await translateCompanyNameToArabic(parsed.data.nameEn));

      const id = `comp_${crypto.randomUUID().slice(0, 10)}`;
      await db.insert(companies).values({
        id,
        nameEn: parsed.data.nameEn,
        nameAr: resolvedNameAr,
        country: parsed.data.country,
        licenseNumber: parsed.data.licenseNumber || null,
        address: parsed.data.address || null,
        contactEmail: parsed.data.contactEmail || null,
        contactPhone: parsed.data.contactPhone || null,
        logoPath: '/api/files/logos/seed_aljazira_logo.webp',
      });

      const tplId = `tpl_${crypto.randomUUID().slice(0, 10)}`;
      await db.insert(companyCvTemplates).values({
        id: tplId,
        companyId: id,
        primaryColor: '#0F172A',
        secondaryColor: '#F1F5F9',
        accentColor: '#0284C7',
        headerTextEn: `${parsed.data.nameEn} — Candidate Recruitment Dossier`,
        headerTextAr: `${resolvedNameAr} — ملف السيرة الذاتية للمرشح`,
        footerTextEn: 'Verified by Dhaka Placement Office',
        footerTextAr: 'ملف موثق من مكتب الإرسال في دكا',
        visibleFields: {
          height: true,
          weight: true,
          children: true,
          notes: true,
          education: true,
          placeOfBirth: true,
        },
      });

      const [created] = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
      const [tpl] = await db
        .select()
        .from(companyCvTemplates)
        .where(eq(companyCvTemplates.id, tplId))
        .limit(1);

      await writeAudit(req.currentUser!.id, 'COMPANY_CREATED', 'Company', id, {
        nameEn: created.nameEn,
        nameAr: created.nameAr,
      });

      res.status(201).json({ ...created, template: tpl, agentCount: 0 });
    } catch (err) {
      console.error('Create company error:', err);
      res.status(500).json({ error: 'Failed to create company' });
    }
  });

  app.put('/api/admin/companies/:id', requireAuth, requireRole('ADMIN'), async (req: AuthRequest, res) => {
    try {
      const id = String(req.params.id);
      const parsed = companyCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid company payload' });
        return;
      }
      const resolvedNameAr =
        parsed.data.nameAr.trim() || (await translateCompanyNameToArabic(parsed.data.nameEn));
      await db
        .update(companies)
        .set({
          nameEn: parsed.data.nameEn,
          nameAr: resolvedNameAr,
          country: parsed.data.country,
          licenseNumber: parsed.data.licenseNumber || null,
          address: parsed.data.address || null,
          contactEmail: parsed.data.contactEmail || null,
          contactPhone: parsed.data.contactPhone || null,
          updatedAt: new Date(),
        })
        .where(eq(companies.id, id));

      const [updated] = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
      if (!updated) {
        res.status(404).json({ error: 'Company not found' });
        return;
      }
      await writeAudit(req.currentUser!.id, 'COMPANY_UPDATED', 'Company', id);
      res.json(updated);
    } catch (err) {
      console.error('Update company error:', err);
      res.status(500).json({ error: 'Failed to update company' });
    }
  });

  app.delete('/api/admin/companies/:id', requireAuth, requireRole('ADMIN'), async (req: AuthRequest, res) => {
    try {
      const id = String(req.params.id);
      const [existing] = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
      if (!existing) {
        res.status(404).json({ error: 'Company not found' });
        return;
      }

      await db
        .update(workers)
        .set({ contractedCompanyId: null })
        .where(eq(workers.contractedCompanyId, id));
      await db.delete(cvDownloadLogs).where(eq(cvDownloadLogs.companyId, id));

      const companyAgents = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.companyId, id));
      for (const agent of companyAgents) {
        await deleteUserSafely(agent.id, req.currentUser!.id);
      }

      await db.delete(companies).where(eq(companies.id, id));
      await writeAudit(req.currentUser!.id, 'COMPANY_DELETED', 'Company', id, {
        nameEn: existing.nameEn,
        deletedAgentCount: companyAgents.length,
      });
      res.json({ ok: true, id });
    } catch (err) {
      console.error('Delete company error:', err);
      res.status(500).json({ error: 'Failed to delete company' });
    }
  });

  app.post(
    '/api/admin/companies/:id/logo',
    requireAuth,
    requireRole('ADMIN'),
    upload.single('logo'),
    async (req: AuthRequest, res) => {
      try {
        const id = String(req.params.id);
        if (!req.file) {
          res.status(400).json({ error: 'Logo image file is required' });
          return;
        }
        const [existing] = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
        if (!existing) {
          res.status(404).json({ error: 'Company not found' });
          return;
        }
        const logoPath = await saveOptimizedPhoto(req.file.buffer, 'logos', `logo_${id}`);
        await db
          .update(companies)
          .set({ logoPath, updatedAt: new Date() })
          .where(eq(companies.id, id));

        res.json({ logoPath });
      } catch (err) {
        console.error('Logo upload error:', err);
        res.status(500).json({ error: 'Failed to process company logo' });
      }
    }
  );

  app.put(
    '/api/admin/companies/:id/template',
    requireAuth,
    requireRole('ADMIN'),
    async (req: AuthRequest, res) => {
      try {
        const companyId = String(req.params.id);
        const parsed = cvTemplateUpdateSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid template data' });
          return;
        }

        await db
          .update(companyCvTemplates)
          .set({
            primaryColor: parsed.data.primaryColor,
            secondaryColor: parsed.data.secondaryColor,
            accentColor: parsed.data.accentColor,
            headerTextEn: parsed.data.headerTextEn ?? null,
            headerTextAr: parsed.data.headerTextAr ?? null,
            footerTextEn: parsed.data.footerTextEn ?? null,
            footerTextAr: parsed.data.footerTextAr ?? null,
            showPassportNumber: parsed.data.showPassportNumber,
            showSalary: parsed.data.showSalary,
            showBorderAndIqama: parsed.data.showBorderAndIqama,
            visibleFields: parsed.data.visibleFields,
            updatedAt: new Date(),
          })
          .where(eq(companyCvTemplates.companyId, companyId));

        const [updated] = await db
          .select()
          .from(companyCvTemplates)
          .where(eq(companyCvTemplates.companyId, companyId))
          .limit(1);

        if (!updated) {
          res.status(404).json({ error: 'CV template not found for this company' });
          return;
        }
        await writeAudit(req.currentUser!.id, 'CV_TEMPLATE_UPDATED', 'CompanyCvTemplate', updated.id, {
          companyId,
        });
        res.json(updated);
      } catch (err) {
        console.error('Template update error:', err);
        res.status(500).json({ error: 'Failed to update CV template' });
      }
    }
  );

  app.get('/api/admin/agents', requireAuth, requireRole('ADMIN'), async (_req, res) => {
    try {
      const rows = await db
        .select({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          role: users.role,
          companyId: users.companyId,
          isActive: users.isActive,
          createdAt: users.createdAt,
          encryptedPassword: users.encryptedPassword,
          companyNameEn: companies.nameEn,
          companyNameAr: companies.nameAr,
        })
        .from(users)
        .leftJoin(companies, eq(users.companyId, companies.id))
        .where(eq(users.role, 'AGENT'))
        .orderBy(desc(users.createdAt));

      res.json(
        rows.map(({ encryptedPassword, ...rest }) => ({
          ...rest,
          visiblePassword: decryptPasswordForAdmin(encryptedPassword),
        }))
      );
    } catch (err) {
      console.error('Fetch agents error:', err);
      res.status(500).json({ error: 'Failed to load agents' });
    }
  });

  app.post('/api/admin/agents', requireAuth, requireRole('ADMIN'), async (req: AuthRequest, res) => {
    try {
      const parsed = createAgentSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid agent payload' });
        return;
      }

      const [company] = await db
        .select()
        .from(companies)
        .where(eq(companies.id, parsed.data.companyId))
        .limit(1);
      if (!company) {
        res.status(400).json({ error: 'Selected international company does not exist' });
        return;
      }

      const normalizedEmail = parsed.data.email.toLowerCase();
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);
      if (existing.length > 0) {
        res.status(409).json({ error: 'An account with this email already exists' });
        return;
      }

      const id = `usr_${crypto.randomUUID().slice(0, 10)}`;
      await db.insert(users).values({
        id,
        fullName: parsed.data.fullName,
        email: normalizedEmail,
        passwordHash: hashPassword(parsed.data.password),
        encryptedPassword: encryptPasswordForAdmin(parsed.data.password),
        role: 'AGENT',
        companyId: company.id,
        isActive: true,
      });

      const [created] = await db.select().from(users).where(eq(users.id, id)).limit(1);

      await writeAudit(req.currentUser!.id, 'AGENT_CREATED', 'User', id, {
        companyId: company.id,
        email: normalizedEmail,
      });

      res.status(201).json({
        id: created.id,
        fullName: created.fullName,
        email: created.email,
        role: created.role,
        companyId: created.companyId,
        isActive: created.isActive,
        createdAt: created.createdAt,
        companyNameEn: company.nameEn,
        companyNameAr: company.nameAr,
        visiblePassword: parsed.data.password,
      });
    } catch (err) {
      console.error('Create agent error:', err);
      res.status(500).json({ error: 'Failed to create agent account' });
    }
  });

  app.get('/api/admin/employees', requireAuth, requireRole('ADMIN'), async (_req, res) => {
    try {
      const rows = await db
        .select({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
          encryptedPassword: users.encryptedPassword,
        })
        .from(users)
        .where(eq(users.role, 'EMPLOYEE'))
        .orderBy(desc(users.createdAt));

      res.json(
        rows.map(({ encryptedPassword, ...rest }) => ({
          ...rest,
          visiblePassword: decryptPasswordForAdmin(encryptedPassword),
        }))
      );
    } catch (err) {
      console.error('Fetch employees error:', err);
      res.status(500).json({ error: 'Failed to load employees' });
    }
  });

  app.post('/api/admin/employees', requireAuth, requireRole('ADMIN'), async (req: AuthRequest, res) => {
    try {
      const parsed = createEmployeeSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid employee data' });
        return;
      }

      const normalizedEmail = parsed.data.email.toLowerCase();
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);
      if (existing.length > 0) {
        res.status(409).json({ error: 'An account with this email already exists' });
        return;
      }

      const id = `usr_${crypto.randomUUID().slice(0, 10)}`;
      await db.insert(users).values({
        id,
        fullName: parsed.data.fullName,
        email: normalizedEmail,
        passwordHash: hashPassword(parsed.data.password),
        encryptedPassword: encryptPasswordForAdmin(parsed.data.password),
        role: 'EMPLOYEE',
        companyId: null,
        isActive: true,
      });

      const [created] = await db.select().from(users).where(eq(users.id, id)).limit(1);

      await writeAudit(req.currentUser!.id, 'EMPLOYEE_CREATED', 'User', id, {
        email: normalizedEmail,
      });

      res.status(201).json({
        id: created.id,
        fullName: created.fullName,
        email: created.email,
        role: created.role,
        isActive: created.isActive,
        createdAt: created.createdAt,
        visiblePassword: parsed.data.password,
      });
    } catch (err) {
      console.error('Create employee error:', err);
      res.status(500).json({ error: 'Failed to create employee account' });
    }
  });

  app.put('/api/admin/users/:id', requireAuth, requireRole('ADMIN'), async (req: AuthRequest, res) => {
    try {
      const id = String(req.params.id);
      const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (!existing) {
        res.status(404).json({ error: 'User account not found' });
        return;
      }

      const parsed = adminUpdateUserSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid user update' });
        return;
      }

      const normalizedEmail = parsed.data.email.trim().toLowerCase();
      const [dup] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);
      if (dup && dup.id !== id) {
        res.status(409).json({ error: 'Another account already uses this email address' });
        return;
      }

      let nextCompanyId = existing.companyId;
      let companyNameEn: string | null = null;
      let companyNameAr: string | null = null;

      if (existing.role === 'AGENT') {
        const targetCompanyId = parsed.data.companyId ?? existing.companyId;
        if (!targetCompanyId) {
          res.status(400).json({ error: 'Agent accounts must remain assigned to a company' });
          return;
        }
        const [comp] = await db
          .select()
          .from(companies)
          .where(eq(companies.id, targetCompanyId))
          .limit(1);
        if (!comp) {
          res.status(400).json({ error: 'Selected international company does not exist' });
          return;
        }
        nextCompanyId = comp.id;
        companyNameEn = comp.nameEn;
        companyNameAr = comp.nameAr;
      }

      const updateValues: {
        fullName: string;
        email: string;
        companyId: string | null;
        updatedAt: Date;
        passwordHash?: string;
        encryptedPassword?: string;
      } = {
        fullName: parsed.data.fullName,
        email: normalizedEmail,
        companyId: nextCompanyId,
        updatedAt: new Date(),
      };

      if (parsed.data.password) {
        updateValues.passwordHash = hashPassword(parsed.data.password);
        updateValues.encryptedPassword = encryptPasswordForAdmin(parsed.data.password);
      }

      await db.update(users).set(updateValues).where(eq(users.id, id));
      const [updated] = await db.select().from(users).where(eq(users.id, id)).limit(1);

      await writeAudit(req.currentUser!.id, 'USER_UPDATED_BY_ADMIN', 'User', id, {
        email: normalizedEmail,
        passwordChanged: Boolean(parsed.data.password),
        role: existing.role,
      });

      res.json({
        id: updated.id,
        fullName: updated.fullName,
        email: updated.email,
        role: updated.role,
        companyId: updated.companyId,
        companyNameEn,
        companyNameAr,
        isActive: updated.isActive,
        createdAt: updated.createdAt,
        visiblePassword: decryptPasswordForAdmin(updated.encryptedPassword),
      });
    } catch (err) {
      console.error('Admin update user error:', err);
      res.status(500).json({ error: 'Failed to update user account' });
    }
  });

  app.delete('/api/admin/users/:id', requireAuth, requireRole('ADMIN'), async (req: AuthRequest, res) => {
    try {
      const id = String(req.params.id);
      if (id === req.currentUser!.id) {
        res.status(400).json({ error: 'You cannot delete your own active Admin account' });
        return;
      }
      const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (!existing) {
        res.status(404).json({ error: 'User account not found' });
        return;
      }
      await deleteUserSafely(id, req.currentUser!.id);
      await writeAudit(req.currentUser!.id, 'USER_DELETED', 'User', id, {
        fullName: existing.fullName,
        email: existing.email,
        role: existing.role,
      });
      res.json({ ok: true, id });
    } catch (err) {
      console.error('Delete user error:', err);
      res.status(500).json({ error: 'Failed to delete user account' });
    }
  });

  app.patch('/api/admin/users/:id/toggle', requireAuth, requireRole('ADMIN'), async (req: AuthRequest, res) => {
    try {
      const id = String(req.params.id);
      if (id === req.currentUser!.id) {
        res.status(400).json({ error: 'You cannot deactivate your own active Admin account' });
        return;
      }
      const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (!existing) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      const nextActive = !existing.isActive;
      await db
        .update(users)
        .set({ isActive: nextActive, updatedAt: new Date() })
        .where(eq(users.id, id));
      await writeAudit(req.currentUser!.id, 'USER_STATUS_TOGGLED', 'User', id, {
        isActive: nextActive,
      });
      res.json({ id: existing.id, isActive: nextActive });
    } catch (err) {
      console.error('Toggle user error:', err);
      res.status(500).json({ error: 'Failed to update user status' });
    }
  });

  app.get('/api/admin/logs', requireAuth, requireRole('ADMIN'), async (_req, res) => {
    try {
      const downloads = await db
        .select({
          id: cvDownloadLogs.id,
          language: cvDownloadLogs.language,
          format: cvDownloadLogs.format,
          downloadedAt: cvDownloadLogs.downloadedAt,
          workerCode: workers.workerCode,
          workerNameEn: workers.fullNameEn,
          agentName: users.fullName,
          companyNameEn: companies.nameEn,
        })
        .from(cvDownloadLogs)
        .innerJoin(workers, eq(cvDownloadLogs.workerId, workers.id))
        .innerJoin(users, eq(cvDownloadLogs.agentId, users.id))
        .innerJoin(companies, eq(cvDownloadLogs.companyId, companies.id))
        .orderBy(desc(cvDownloadLogs.downloadedAt))
        .limit(100);

      const audits = await db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          metadata: auditLogs.metadata,
          createdAt: auditLogs.createdAt,
          actorName: users.fullName,
          actorRole: users.role,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.actorId, users.id))
        .orderBy(desc(auditLogs.createdAt))
        .limit(100);

      res.json({ downloads, audits });
    } catch (err) {
      console.error('Fetch logs error:', err);
      res.status(500).json({ error: 'Failed to load system logs' });
    }
  });

  // ── EMPLOYEE & ADMIN SHARED WORKER DIRECTORY ────────────────────────────────
  app.get(
    '/api/employee/overview',
    requireAuth,
    requireRole('ADMIN', 'EMPLOYEE'),
    async (_req, res) => {
      try {
        const allWorkers = await db
          .select({
            id: workers.id,
            workerCode: workers.workerCode,
            fullNameEn: workers.fullNameEn,
            occupationCode: workers.occupationCode,
            status: workers.status,
            facePhotoPath: workers.facePhotoPath,
            updatedAt: workers.updatedAt,
          })
          .from(workers)
          .orderBy(desc(workers.updatedAt));

        res.json({
          counts: {
            total: allWorkers.length,
            DRAFT: allWorkers.filter((w) => w.status === 'DRAFT').length,
            PUBLISHED: allWorkers.filter((w) => w.status === 'PUBLISHED').length,
            UNPUBLISHED: allWorkers.filter((w) => w.status === 'UNPUBLISHED').length,
            CONTRACTED: allWorkers.filter((w) => w.status === 'CONTRACTED').length,
          },
          recentWorkers: allWorkers.slice(0, 6),
        });
      } catch (err) {
        console.error('Employee overview error:', err);
        res.status(500).json({ error: 'Failed to load worker summary' });
      }
    }
  );

  app.post(
    '/api/workers/translate-preview',
    requireAuth,
    requireRole('ADMIN', 'EMPLOYEE'),
    async (req, res) => {
      try {
        const fullNameEn = String(req.body?.fullNameEn ?? '');
        const placeOfBirthEn = String(req.body?.placeOfBirthEn ?? '');
        const notesEn = String(req.body?.notesEn ?? '');
        const result = await translateWorkerFieldsToArabic({
          fullNameEn,
          placeOfBirthEn,
          notesEn,
        });
        res.json(result);
      } catch (err) {
        console.error('Translate preview error:', err);
        res.status(500).json({ error: 'Translation failed' });
      }
    }
  );

  app.get('/api/workers', requireAuth, requireRole('ADMIN', 'EMPLOYEE'), async (req, res) => {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : '';
      const occupation = typeof req.query.occupation === 'string' ? req.query.occupation : '';
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

      const conditions = [];
      if (status && ['DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'CONTRACTED'].includes(status)) {
        conditions.push(eq(workers.status, status as 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' | 'CONTRACTED'));
      }
      if (occupation) {
        conditions.push(eq(workers.occupationCode, occupation));
      }
      if (search) {
        const pattern = `%${search}%`;
        conditions.push(
          or(
            like(workers.fullNameEn, pattern),
            like(workers.workerCode, pattern),
            like(workers.passportNumber, pattern)
          )
        );
      }

      const rows = await db
        .select({
          id: workers.id,
          workerCode: workers.workerCode,
          status: workers.status,
          fullNameEn: workers.fullNameEn,
          fullNameAr: workers.fullNameAr,
          dateOfBirth: workers.dateOfBirth,
          gender: workers.gender,
          religion: workers.religion,
          maritalStatus: workers.maritalStatus,
          passportNumber: workers.passportNumber,
          occupationCode: workers.occupationCode,
          expectedSalarySar: workers.expectedSalarySar,
          experienceYears: workers.experienceYears,
          facePhotoPath: workers.facePhotoPath,
          fullBodyPhotoPath: workers.fullBodyPhotoPath,
          contractedCompanyId: workers.contractedCompanyId,
          contractedAt: workers.contractedAt,
          updatedAt: workers.updatedAt,
          contractedCompanyName: companies.nameEn,
        })
        .from(workers)
        .leftJoin(companies, eq(workers.contractedCompanyId, companies.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(workers.updatedAt));

      const docCounts = await db
        .select({
          workerId: workerDocuments.workerId,
          count: count(),
        })
        .from(workerDocuments)
        .groupBy(workerDocuments.workerId);
      const docCountMap = new Map(docCounts.map((d) => [d.workerId, Number(d.count)]));

      res.json(
        rows.map((r) => ({
          ...r,
          age: calculateAge(r.dateOfBirth),
          documentCount: docCountMap.get(r.id) ?? 0,
        }))
      );
    } catch (err) {
      console.error('List workers error:', err);
      res.status(500).json({ error: 'Failed to load worker directory' });
    }
  });

  app.get('/api/workers/:id', requireAuth, requireRole('ADMIN', 'EMPLOYEE'), async (req, res) => {
    try {
      const id = String(req.params.id);
      const [worker] = await db.select().from(workers).where(eq(workers.id, id)).limit(1);
      if (!worker) {
        res.status(404).json({ error: 'Worker not found' });
        return;
      }

      const documents = await db
        .select()
        .from(workerDocuments)
        .where(eq(workerDocuments.workerId, id))
        .orderBy(desc(workerDocuments.createdAt));

      let contractedCompany = null;
      if (worker.contractedCompanyId) {
        const [comp] = await db
          .select()
          .from(companies)
          .where(eq(companies.id, worker.contractedCompanyId))
          .limit(1);
        contractedCompany = comp ?? null;
      }

      res.json({ worker, documents, contractedCompany });
    } catch (err) {
      console.error('Fetch worker detail error:', err);
      res.status(500).json({ error: 'Failed to load worker details' });
    }
  });

  app.post('/api/workers', requireAuth, requireRole('ADMIN', 'EMPLOYEE'), async (req: AuthRequest, res) => {
    try {
      const parsed = workerInputSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid worker payload' });
        return;
      }

      const data = parsed.data;
      const passportNorm = data.passportNumber.toUpperCase();
      const existingPassport = await db
        .select({ id: workers.id })
        .from(workers)
        .where(eq(workers.passportNumber, passportNorm))
        .limit(1);
      if (existingPassport.length > 0) {
        res.status(409).json({ error: `Passport number ${passportNorm} is already registered` });
        return;
      }

      const autoAr = await translateWorkerFieldsToArabic({
        fullNameEn: data.fullNameEn,
        placeOfBirthEn: data.placeOfBirthEn,
        notesEn: data.notesEn,
      });

      const id = `wkr_${crypto.randomUUID().slice(0, 10)}`;
      const workerCode = await generateNextWorkerCode();

      await db.insert(workers).values({
        id,
        workerCode,
        status: data.status,
        fullNameEn: data.fullNameEn,
        fullNameAr: data.fullNameAr?.trim() || autoAr.fullNameAr,
        dateOfBirth: new Date(data.dateOfBirth),
        gender: data.gender,
        nationality: data.nationality,
        religion: data.religion,
        maritalStatus: data.maritalStatus,
        childrenCount: data.childrenCount,
        placeOfBirthEn: data.placeOfBirthEn || null,
        placeOfBirthAr: data.placeOfBirthAr?.trim() || autoAr.placeOfBirthAr || null,
        heightCm: data.heightCm ?? null,
        weightKg: data.weightKg ?? null,
        phoneNumber: data.phoneNumber || null,
        addressEn: data.addressEn || null,
        passportNumber: passportNorm,
        passportIssueDate: data.passportIssueDate ? new Date(data.passportIssueDate) : null,
        passportExpiryDate: data.passportExpiryDate ? new Date(data.passportExpiryDate) : null,
        borderNumber: data.borderNumber || null,
        iqamaNumber: data.iqamaNumber || null,
        agencyCode: data.agencyCode,
        occupationCode: data.occupationCode,
        expectedSalarySar: data.expectedSalarySar ?? null,
        educationCode: data.educationCode || null,
        experienceYears: data.experienceYears,
        previousCountries: data.previousCountries,
        arabicLevel: data.arabicLevel,
        englishLevel: data.englishLevel,
        skillsMatrix: data.skillsMatrix,
        notesEn: data.notesEn || null,
        notesAr: data.notesAr?.trim() || autoAr.notesAr || null,
        registeredById: req.currentUser!.id,
        updatedById: req.currentUser!.id,
      });

      const [created] = await db.select().from(workers).where(eq(workers.id, id)).limit(1);

      await writeAudit(req.currentUser!.id, 'WORKER_CREATED', 'Worker', id, {
        workerCode,
        status: created.status,
      });

      res.status(201).json(created);
    } catch (err) {
      console.error('Create worker error:', err);
      res.status(500).json({ error: 'Failed to register worker' });
    }
  });

  app.put('/api/workers/:id', requireAuth, requireRole('ADMIN', 'EMPLOYEE'), async (req: AuthRequest, res) => {
    try {
      const id = String(req.params.id);
      const [existing] = await db.select().from(workers).where(eq(workers.id, id)).limit(1);
      if (!existing) {
        res.status(404).json({ error: 'Worker not found' });
        return;
      }

      const parsed = workerInputSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid worker payload' });
        return;
      }
      const data = parsed.data;
      const passportNorm = data.passportNumber.toUpperCase();

      if (passportNorm !== existing.passportNumber) {
        const dup = await db
          .select({ id: workers.id })
          .from(workers)
          .where(eq(workers.passportNumber, passportNorm))
          .limit(1);
        if (dup.length > 0) {
          res.status(409).json({ error: `Passport number ${passportNorm} belongs to another worker` });
          return;
        }
      }

      let fullNameAr = data.fullNameAr?.trim() || '';
      let placeOfBirthAr = data.placeOfBirthAr?.trim() || '';
      let notesAr = data.notesAr?.trim() || '';

      if (!fullNameAr || data.fullNameEn !== existing.fullNameEn) {
        const autoAr = await translateWorkerFieldsToArabic({
          fullNameEn: data.fullNameEn,
          placeOfBirthEn: data.placeOfBirthEn,
          notesEn: data.notesEn,
        });
        if (!fullNameAr) fullNameAr = autoAr.fullNameAr;
        if (!placeOfBirthAr) placeOfBirthAr = autoAr.placeOfBirthAr;
        if (!notesAr) notesAr = autoAr.notesAr;
      }

      await db
        .update(workers)
        .set({
          status: data.status,
          fullNameEn: data.fullNameEn,
          fullNameAr: fullNameAr || null,
          dateOfBirth: new Date(data.dateOfBirth),
          gender: data.gender,
          nationality: data.nationality,
          religion: data.religion,
          maritalStatus: data.maritalStatus,
          childrenCount: data.childrenCount,
          placeOfBirthEn: data.placeOfBirthEn || null,
          placeOfBirthAr: placeOfBirthAr || null,
          heightCm: data.heightCm ?? null,
          weightKg: data.weightKg ?? null,
          phoneNumber: data.phoneNumber || null,
          addressEn: data.addressEn || null,
          passportNumber: passportNorm,
          passportIssueDate: data.passportIssueDate ? new Date(data.passportIssueDate) : null,
          passportExpiryDate: data.passportExpiryDate ? new Date(data.passportExpiryDate) : null,
          borderNumber: data.borderNumber || null,
          iqamaNumber: data.iqamaNumber || null,
          agencyCode: data.agencyCode,
          occupationCode: data.occupationCode,
          expectedSalarySar: data.expectedSalarySar ?? null,
          educationCode: data.educationCode || null,
          experienceYears: data.experienceYears,
          previousCountries: data.previousCountries,
          arabicLevel: data.arabicLevel,
          englishLevel: data.englishLevel,
          skillsMatrix: data.skillsMatrix,
          notesEn: data.notesEn || null,
          notesAr: notesAr || null,
          updatedById: req.currentUser!.id,
          updatedAt: new Date(),
        })
        .where(eq(workers.id, id));

      const [updated] = await db.select().from(workers).where(eq(workers.id, id)).limit(1);

      await writeAudit(req.currentUser!.id, 'WORKER_UPDATED', 'Worker', id, {
        workerCode: updated.workerCode,
        status: updated.status,
      });

      res.json(updated);
    } catch (err) {
      console.error('Update worker error:', err);
      res.status(500).json({ error: 'Failed to update worker' });
    }
  });

  app.post(
    '/api/workers/:id/photos',
    requireAuth,
    requireRole('ADMIN', 'EMPLOYEE'),
    upload.fields([
      { name: 'facePhoto', maxCount: 1 },
      { name: 'fullBodyPhoto', maxCount: 1 },
    ]),
    async (req: AuthRequest, res) => {
      try {
        const id = String(req.params.id);
        const [existing] = await db.select().from(workers).where(eq(workers.id, id)).limit(1);
        if (!existing) {
          res.status(404).json({ error: 'Worker not found' });
          return;
        }

        const files = req.files as Record<string, Express.Multer.File[]> | undefined;
        let facePhotoPath = existing.facePhotoPath;
        let fullBodyPhotoPath = existing.fullBodyPhotoPath;

        if (files?.facePhoto?.[0]) {
          facePhotoPath = await saveOptimizedPhoto(files.facePhoto[0].buffer, 'face', id);
        }
        if (files?.fullBodyPhoto?.[0]) {
          fullBodyPhotoPath = await saveOptimizedPhoto(files.fullBodyPhoto[0].buffer, 'full', id);
        }

        await db
          .update(workers)
          .set({
            facePhotoPath,
            fullBodyPhotoPath,
            updatedById: req.currentUser!.id,
            updatedAt: new Date(),
          })
          .where(eq(workers.id, id));

        res.json({
          facePhotoPath,
          fullBodyPhotoPath,
        });
      } catch (err) {
        console.error('Worker photo upload error:', err);
        res.status(500).json({ error: 'Failed to optimize and save photographs' });
      }
    }
  );

  app.post(
    '/api/workers/:id/documents',
    requireAuth,
    requireRole('ADMIN', 'EMPLOYEE'),
    upload.single('file'),
    async (req: AuthRequest, res) => {
      try {
        const workerId = String(req.params.id);
        if (!req.file) {
          res.status(400).json({ error: 'Document file is required' });
          return;
        }
        const docType = String(req.body?.docType || 'OTHER');
        const expiryDateStr = req.body?.expiryDate ? String(req.body.expiryDate) : null;

        const saved = savePrivateDocumentFile(req.file.buffer, req.file.originalname);
        const docId = `doc_${crypto.randomUUID().slice(0, 10)}`;
        await db.insert(workerDocuments).values({
          id: docId,
          workerId,
          docType,
          fileName: saved.safeOriginalName,
          filePath: saved.filePath,
          expiryDate: expiryDateStr ? new Date(expiryDateStr) : null,
          uploadedById: req.currentUser!.id,
        });

        const [doc] = await db
          .select()
          .from(workerDocuments)
          .where(eq(workerDocuments.id, docId))
          .limit(1);

        await writeAudit(req.currentUser!.id, 'DOCUMENT_UPLOADED', 'WorkerDocument', doc.id, {
          workerId,
          docType,
        });

        res.status(201).json(doc);
      } catch (err) {
        console.error('Document upload error:', err);
        res.status(500).json({ error: 'Failed to store compliance document' });
      }
    }
  );

  app.delete(
    '/api/workers/:id/documents/:docId',
    requireAuth,
    requireRole('ADMIN', 'EMPLOYEE'),
    async (req: AuthRequest, res) => {
      try {
        const workerId = String(req.params.id);
        const docId = String(req.params.docId);
        await db
          .delete(workerDocuments)
          .where(and(eq(workerDocuments.id, docId), eq(workerDocuments.workerId, workerId)));
        res.json({ ok: true });
      } catch (err) {
        console.error('Delete document error:', err);
        res.status(500).json({ error: 'Failed to remove document' });
      }
    }
  );

  app.post(
    '/api/workers/:id/status',
    requireAuth,
    requireRole('ADMIN', 'EMPLOYEE'),
    async (req: AuthRequest, res) => {
      try {
        const id = String(req.params.id);
        const nextStatus = String(req.body?.status || '');
        if (!['DRAFT', 'PUBLISHED', 'UNPUBLISHED'].includes(nextStatus)) {
          res.status(400).json({ error: 'Invalid target status' });
          return;
        }
        const [existing] = await db.select().from(workers).where(eq(workers.id, id)).limit(1);
        if (!existing) {
          res.status(404).json({ error: 'Worker not found' });
          return;
        }
        if (nextStatus === 'PUBLISHED' && (!existing.facePhotoPath || !existing.fullBodyPhotoPath)) {
          res.status(400).json({
            error: 'Both Face Photo and Full-Body Photo are mandatory before publishing to agents',
          });
          return;
        }

        await db
          .update(workers)
          .set({
            status: nextStatus as 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED',
            updatedById: req.currentUser!.id,
            updatedAt: new Date(),
          })
          .where(eq(workers.id, id));

        const [updated] = await db.select().from(workers).where(eq(workers.id, id)).limit(1);

        await writeAudit(req.currentUser!.id, `WORKER_${nextStatus}`, 'Worker', id, {
          workerCode: updated.workerCode,
        });

        res.json(updated);
      } catch (err) {
        console.error('Status update error:', err);
        res.status(500).json({ error: 'Failed to update worker status' });
      }
    }
  );

  app.post(
    '/api/workers/:id/contract',
    requireAuth,
    requireRole('ADMIN', 'EMPLOYEE'),
    async (req: AuthRequest, res) => {
      try {
        const id = String(req.params.id);
        const parsed = contractWorkerSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid contract payload' });
          return;
        }

        const [existing] = await db.select().from(workers).where(eq(workers.id, id)).limit(1);
        if (!existing) {
          res.status(404).json({ error: 'Worker not found' });
          return;
        }

        const [company] = await db
          .select()
          .from(companies)
          .where(eq(companies.id, parsed.data.contractedCompanyId))
          .limit(1);
        if (!company) {
          res.status(400).json({ error: 'Selected hiring company not found' });
          return;
        }

        await db
          .update(workers)
          .set({
            status: 'CONTRACTED',
            contractedCompanyId: company.id,
            contractedAt: new Date(parsed.data.contractedAt),
            contractedNotes: parsed.data.contractedNotes || null,
            updatedById: req.currentUser!.id,
            updatedAt: new Date(),
          })
          .where(eq(workers.id, id));

        const [updated] = await db.select().from(workers).where(eq(workers.id, id)).limit(1);

        await writeAudit(req.currentUser!.id, 'WORKER_CONTRACTED', 'Worker', id, {
          workerCode: updated.workerCode,
          contractedCompanyId: company.id,
        });

        res.json(updated);
      } catch (err) {
        console.error('Contract worker error:', err);
        res.status(500).json({ error: 'Failed to mark worker as contracted' });
      }
    }
  );

  // ── AGENT CANDIDATE PORTAL & CV ENGINE ─────────────────────────────────────
  app.get('/api/agent/overview', requireAuth, requireRole('AGENT'), async (req: AuthRequest, res) => {
    try {
      const published = await db
        .select({ occupationCode: workers.occupationCode })
        .from(workers)
        .where(eq(workers.status, 'PUBLISHED'));

      const byOccupation: Record<string, number> = {};
      for (const w of published) {
        byOccupation[w.occupationCode] = (byOccupation[w.occupationCode] ?? 0) + 1;
      }

      const recentDownloads = await db
        .select({
          id: cvDownloadLogs.id,
          language: cvDownloadLogs.language,
          format: cvDownloadLogs.format,
          downloadedAt: cvDownloadLogs.downloadedAt,
          workerId: workers.id,
          workerCode: workers.workerCode,
          fullNameEn: workers.fullNameEn,
          occupationCode: workers.occupationCode,
        })
        .from(cvDownloadLogs)
        .innerJoin(workers, eq(cvDownloadLogs.workerId, workers.id))
        .where(eq(cvDownloadLogs.agentId, req.currentUser!.id))
        .orderBy(desc(cvDownloadLogs.downloadedAt))
        .limit(8);

      const agentCustomersRows = await db
        .select({
          id: agentCustomers.id,
          whatsappStatus: agentCustomers.whatsappStatus,
        })
        .from(agentCustomers)
        .where(eq(agentCustomers.agentId, req.currentUser!.id));

      const shareCountRows = await db
        .select({ value: count() })
        .from(cvShareLogs)
        .where(
          and(eq(cvShareLogs.agentId, req.currentUser!.id), eq(cvShareLogs.status, 'SENT'))
        );

      res.json({
        publishedCount: published.length,
        byOccupation,
        recentDownloads,
        customerCount: agentCustomersRows.length,
        verifiedCustomerCount: agentCustomersRows.filter((c) => c.whatsappStatus === 'VERIFIED')
          .length,
        whatsappSentCount: Number(shareCountRows[0]?.value ?? 0),
      });
    } catch (err) {
      console.error('Agent overview error:', err);
      res.status(500).json({ error: 'Failed to load agent dashboard' });
    }
  });

  app.get(
    '/api/candidates',
    requireAuth,
    requireRole('AGENT', 'ADMIN', 'EMPLOYEE'),
    async (req, res) => {
      try {
        // Strict isolation: PUBLISHED only
        const rows = await db
          .select({
            id: workers.id,
            workerCode: workers.workerCode,
            status: workers.status,
            fullNameEn: workers.fullNameEn,
            fullNameAr: workers.fullNameAr,
            dateOfBirth: workers.dateOfBirth,
            gender: workers.gender,
            nationality: workers.nationality,
            religion: workers.religion,
            maritalStatus: workers.maritalStatus,
            childrenCount: workers.childrenCount,
            placeOfBirthEn: workers.placeOfBirthEn,
            placeOfBirthAr: workers.placeOfBirthAr,
            heightCm: workers.heightCm,
            weightKg: workers.weightKg,
            occupationCode: workers.occupationCode,
            expectedSalarySar: workers.expectedSalarySar,
            educationCode: workers.educationCode,
            experienceYears: workers.experienceYears,
            previousCountries: workers.previousCountries,
            arabicLevel: workers.arabicLevel,
            englishLevel: workers.englishLevel,
            skillsMatrix: workers.skillsMatrix,
            facePhotoPath: workers.facePhotoPath,
            fullBodyPhotoPath: workers.fullBodyPhotoPath,
            updatedAt: workers.updatedAt,
          })
          .from(workers)
          .where(eq(workers.status, 'PUBLISHED'))
          .orderBy(desc(workers.updatedAt));

        const search = String(req.query.search || '').trim().toLowerCase();
        const occupation = String(req.query.occupation || '');
        const religion = String(req.query.religion || '');
        const maritalStatus = String(req.query.maritalStatus || '');
        const gender = String(req.query.gender || '');
        const arabicLevel = String(req.query.arabicLevel || '');
        const englishLevel = String(req.query.englishLevel || '');
        const skill = String(req.query.skill || '');
        const minAge = req.query.minAge ? Number(req.query.minAge) : null;
        const maxAge = req.query.maxAge ? Number(req.query.maxAge) : null;
        const minExp = req.query.minExp ? Number(req.query.minExp) : null;

        const enriched = rows
          .map((r) => ({ ...r, age: calculateAge(r.dateOfBirth) }))
          .filter((r) => {
            if (
              search &&
              !r.fullNameEn.toLowerCase().includes(search) &&
              !r.workerCode.toLowerCase().includes(search)
            ) {
              return false;
            }
            if (occupation && r.occupationCode !== occupation) return false;
            if (religion && r.religion !== religion) return false;
            if (maritalStatus && r.maritalStatus !== maritalStatus) return false;
            if (gender && r.gender !== gender) return false;
            if (arabicLevel && r.arabicLevel !== arabicLevel) return false;
            if (englishLevel && r.englishLevel !== englishLevel) return false;
            if (minAge !== null && !Number.isNaN(minAge) && r.age < minAge) return false;
            if (maxAge !== null && !Number.isNaN(maxAge) && r.age > maxAge) return false;
            if (minExp !== null && !Number.isNaN(minExp) && r.experienceYears < minExp) return false;
            if (skill && r.skillsMatrix[skill as keyof typeof r.skillsMatrix] !== 'YES') {
              return false;
            }
            return true;
          });

        res.json(enriched);
      } catch (err) {
        console.error('Candidates list error:', err);
        res.status(500).json({ error: 'Failed to load published candidates' });
      }
    }
  );

  app.get(
    '/api/candidates/:id',
    requireAuth,
    requireRole('AGENT', 'ADMIN', 'EMPLOYEE'),
    async (req: AuthRequest, res) => {
      try {
        const id = String(req.params.id);
        const [worker] = await db.select().from(workers).where(eq(workers.id, id)).limit(1);
        if (!worker) {
          res.status(404).json({ error: 'Candidate not found' });
          return;
        }
        if (req.currentUser!.role === 'AGENT' && worker.status !== 'PUBLISHED') {
          res.status(404).json({ error: 'Candidate is not available' });
          return;
        }

        // Determine company & template for CV rendering
        let targetCompanyId = req.currentUser!.companyId;
        if (req.currentUser!.role !== 'AGENT') {
          const requestedComp =
            typeof req.query.companyId === 'string' ? req.query.companyId : null;
          if (requestedComp) {
            targetCompanyId = requestedComp;
          } else {
            const [firstComp] = await db.select({ id: companies.id }).from(companies).limit(1);
            targetCompanyId = firstComp?.id ?? null;
          }
        }

        let company = null;
        let template = null;
        if (targetCompanyId) {
          const [comp] = await db
            .select()
            .from(companies)
            .where(eq(companies.id, targetCompanyId))
            .limit(1);
          company = comp ?? null;
          if (comp) {
            const [tpl] = await db
              .select()
              .from(companyCvTemplates)
              .where(eq(companyCvTemplates.companyId, comp.id))
              .limit(1);
            template = tpl ?? null;
          }
        }

        // Strip internal-only phone/address from AGENT responses
        const safeWorker = {
          id: worker.id,
          workerCode: worker.workerCode,
          status: worker.status,
          fullNameEn: worker.fullNameEn,
          fullNameAr: worker.fullNameAr,
          dateOfBirth: worker.dateOfBirth,
          age: calculateAge(worker.dateOfBirth),
          gender: worker.gender,
          nationality: worker.nationality,
          religion: worker.religion,
          maritalStatus: worker.maritalStatus,
          childrenCount: worker.childrenCount,
          placeOfBirthEn: worker.placeOfBirthEn,
          placeOfBirthAr: worker.placeOfBirthAr,
          heightCm: worker.heightCm,
          weightKg: worker.weightKg,
          passportNumber: worker.passportNumber,
          passportIssueDate: worker.passportIssueDate,
          passportExpiryDate: worker.passportExpiryDate,
          borderNumber: worker.borderNumber,
          iqamaNumber: worker.iqamaNumber,
          agencyCode: worker.agencyCode,
          occupationCode: worker.occupationCode,
          expectedSalarySar: worker.expectedSalarySar,
          educationCode: worker.educationCode,
          experienceYears: worker.experienceYears,
          previousCountries: worker.previousCountries,
          arabicLevel: worker.arabicLevel,
          englishLevel: worker.englishLevel,
          skillsMatrix: worker.skillsMatrix,
          notesEn: worker.notesEn,
          notesAr: worker.notesAr,
          facePhotoPath: worker.facePhotoPath,
          fullBodyPhotoPath: worker.fullBodyPhotoPath,
        };

        res.json({ candidate: safeWorker, company, template });
      } catch (err) {
        console.error('Candidate detail error:', err);
        res.status(500).json({ error: 'Failed to load candidate profile' });
      }
    }
  );

  app.post(
    '/api/cv/log',
    requireAuth,
    requireRole('AGENT', 'ADMIN', 'EMPLOYEE'),
    async (req: AuthRequest, res) => {
      try {
        const parsed = cvLogSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: 'Invalid CV log payload' });
          return;
        }
        const companyId =
          req.currentUser!.companyId ||
          parsed.data.companyId ||
          (await db.select({ id: companies.id }).from(companies).limit(1))[0]?.id;
        if (!companyId) {
          res.status(400).json({ error: 'Company context required for CV log' });
          return;
        }

        const logId = `cvlog_${crypto.randomUUID().slice(0, 10)}`;
        await db.insert(cvDownloadLogs).values({
          id: logId,
          workerId: parsed.data.workerId,
          agentId: req.currentUser!.id,
          companyId,
          language: parsed.data.language,
          format: parsed.data.format,
        });

        const [log] = await db
          .select()
          .from(cvDownloadLogs)
          .where(eq(cvDownloadLogs.id, logId))
          .limit(1);

        await writeAudit(req.currentUser!.id, 'CV_DOWNLOADED', 'Worker', parsed.data.workerId, {
          language: parsed.data.language,
          format: parsed.data.format,
          companyId,
        });

        res.status(201).json(log);
      } catch (err) {
        console.error('CV log error:', err);
        res.status(500).json({ error: 'Failed to record CV download' });
      }
    }
  );

  // ── PRIVATE AGENT CUSTOMER DIRECTORY & CENTRAL WHATSAPP CV SHARING ──────────
  app.get('/api/whatsapp/status', requireAuth, requireRole('AGENT'), (_req, res) => {
    res.json(getCentralGatewayStatus());
  });

  app.get(
    '/api/whatsapp/customers',
    requireAuth,
    requireRole('AGENT'),
    async (req: AuthRequest, res) => {
      try {
        const agentId = req.currentUser!.id;
        const customers = await db
          .select()
          .from(agentCustomers)
          .where(eq(agentCustomers.agentId, agentId))
          .orderBy(desc(agentCustomers.updatedAt));

        const logs = await db
          .select({
            id: cvShareLogs.id,
            agentId: cvShareLogs.agentId,
            customerId: cvShareLogs.customerId,
            workerId: cvShareLogs.workerId,
            language: cvShareLogs.language,
            format: cvShareLogs.format,
            status: cvShareLogs.status,
            errorMsg: cvShareLogs.errorMsg,
            sentAt: cvShareLogs.sentAt,
            workerCode: workers.workerCode,
            workerNameEn: workers.fullNameEn,
            workerNameAr: workers.fullNameAr,
            occupationCode: workers.occupationCode,
          })
          .from(cvShareLogs)
          .innerJoin(workers, eq(cvShareLogs.workerId, workers.id))
          .where(eq(cvShareLogs.agentId, agentId))
          .orderBy(desc(cvShareLogs.sentAt));

        const logsByCustomer = new Map<string, typeof logs>();
        for (const row of logs) {
          const arr = logsByCustomer.get(row.customerId) ?? [];
          arr.push(row);
          logsByCustomer.set(row.customerId, arr);
        }

        res.json({
          gateway: getCentralGatewayStatus(),
          customers: customers.map((c) => ({
            ...c,
            shareLogs: logsByCustomer.get(c.id) ?? [],
          })),
        });
      } catch (err) {
        console.error('List WhatsApp customers error:', err);
        res.status(500).json({ error: 'Failed to load householder directory' });
      }
    }
  );

  app.post(
    '/api/whatsapp/customers',
    requireAuth,
    requireRole('AGENT'),
    async (req: AuthRequest, res) => {
      try {
        const agentId = req.currentUser!.id;
        const parsed = createAgentCustomerSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({
            error: parsed.error.issues[0]?.message || 'Invalid customer details',
          });
          return;
        }

        let normalizedPhone: string;
        try {
          normalizedPhone = normalizeWhatsAppPhone(
            parsed.data.countryCode,
            parsed.data.phoneNumber
          );
        } catch (err) {
          res.status(400).json({
            error: err instanceof Error ? err.message : 'Invalid phone number',
          });
          return;
        }

        const existing = await db
          .select({ id: agentCustomers.id })
          .from(agentCustomers)
          .where(
            and(
              eq(agentCustomers.agentId, agentId),
              eq(agentCustomers.phoneNumber, normalizedPhone)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          res.status(409).json({
            error: `Phone number +${normalizedPhone} is already saved in your customer directory`,
          });
          return;
        }

        let whatsappStatus: WhatsAppVerificationStatus = 'UNVERIFIED';
        let whatsappJid: string | null = null;
        let gatewayWarning: string | null = null;

        try {
          const check = await verifyNumberOnCentralWhatsApp(normalizedPhone);
          if (check.isRegistered) {
            whatsappStatus = 'VERIFIED';
            whatsappJid = check.jid;
          } else {
            whatsappStatus = 'NOT_REGISTERED';
            whatsappJid = null;
          }
        } catch (err) {
          whatsappStatus = 'UNVERIFIED';
          whatsappJid = null;
          gatewayWarning =
            err instanceof GatewayNotConfiguredError
              ? err.message
              : err instanceof Error
                ? `WhatsApp check deferred (${err.message}). You can click Re-verify once the gateway is online.`
                : 'Central WhatsApp gateway could not be reached right now.';
        }

        const id = `cust_${crypto.randomUUID().slice(0, 12)}`;
        await db.insert(agentCustomers).values({
          id,
          agentId,
          fullName: parsed.data.fullName,
          countryCode: parsed.data.countryCode,
          phoneNumber: normalizedPhone,
          whatsappJid,
          whatsappStatus,
          notes: parsed.data.notes || null,
        });

        const [created] = await db
          .select()
          .from(agentCustomers)
          .where(eq(agentCustomers.id, id))
          .limit(1);

        await writeAudit(agentId, 'AGENT_CUSTOMER_CREATED', 'AgentCustomer', id, {
          phoneNumber: normalizedPhone,
          whatsappStatus,
        });

        res.status(201).json({
          customer: {
            ...created,
            shareLogs: [],
          },
          whatsappStatus,
          gatewayWarning,
        });
      } catch (err) {
        console.error('Create WhatsApp customer error:', err);
        res.status(500).json({ error: 'Failed to save customer' });
      }
    }
  );

  app.post(
    '/api/whatsapp/customers/:id/verify',
    requireAuth,
    requireRole('AGENT'),
    async (req: AuthRequest, res) => {
      try {
        const agentId = req.currentUser!.id;
        const id = String(req.params.id);

        const [customer] = await db
          .select()
          .from(agentCustomers)
          .where(and(eq(agentCustomers.id, id), eq(agentCustomers.agentId, agentId)))
          .limit(1);

        if (!customer) {
          res.status(404).json({ error: 'Customer not found in your private directory' });
          return;
        }

        let check: { isRegistered: boolean; jid: string | null };
        try {
          check = await verifyNumberOnCentralWhatsApp(customer.phoneNumber);
        } catch (err) {
          if (err instanceof GatewayNotConfiguredError) {
            res.status(500).json({ error: err.message });
            return;
          }
          res.status(502).json({
            error:
              err instanceof Error
                ? `WhatsApp gateway verification failed: ${err.message}`
                : 'Unable to reach central WhatsApp gateway',
          });
          return;
        }

        const nextStatus: WhatsAppVerificationStatus = check.isRegistered
          ? 'VERIFIED'
          : 'NOT_REGISTERED';
        const nextJid = check.isRegistered ? check.jid : null;

        await db
          .update(agentCustomers)
          .set({
            whatsappStatus: nextStatus,
            whatsappJid: nextJid,
            updatedAt: new Date(),
          })
          .where(and(eq(agentCustomers.id, id), eq(agentCustomers.agentId, agentId)));

        const [updated] = await db
          .select()
          .from(agentCustomers)
          .where(eq(agentCustomers.id, id))
          .limit(1);

        await writeAudit(agentId, 'AGENT_CUSTOMER_VERIFIED', 'AgentCustomer', id, {
          whatsappStatus: nextStatus,
        });

        res.json({ customer: updated });
      } catch (err) {
        console.error('Re-verify WhatsApp customer error:', err);
        res.status(500).json({ error: 'Failed to re-verify WhatsApp number' });
      }
    }
  );

  app.delete(
    '/api/whatsapp/customers/:id',
    requireAuth,
    requireRole('AGENT'),
    async (req: AuthRequest, res) => {
      try {
        const agentId = req.currentUser!.id;
        const id = String(req.params.id);

        const [existing] = await db
          .select({ id: agentCustomers.id })
          .from(agentCustomers)
          .where(and(eq(agentCustomers.id, id), eq(agentCustomers.agentId, agentId)))
          .limit(1);

        if (!existing) {
          res.status(404).json({ error: 'Customer not found in your directory' });
          return;
        }

        await db
          .delete(agentCustomers)
          .where(and(eq(agentCustomers.id, id), eq(agentCustomers.agentId, agentId)));

        await writeAudit(agentId, 'AGENT_CUSTOMER_DELETED', 'AgentCustomer', id);
        res.json({ ok: true });
      } catch (err) {
        console.error('Delete WhatsApp customer error:', err);
        res.status(500).json({ error: 'Failed to delete customer' });
      }
    }
  );

  app.post(
    '/api/whatsapp/send-cv',
    requireAuth,
    requireRole('AGENT'),
    async (req: AuthRequest, res) => {
      try {
        const agentId = req.currentUser!.id;
        const gateway = getCentralGatewayStatus();
        if (!gateway.configured) {
          res.status(500).json({
            error:
              'Central WhatsApp gateway is not configured. Set WHATSAPP_GATEWAY_URL, WHATSAPP_GATEWAY_API_KEY, and WHATSAPP_CENTRAL_INSTANCE in .env.',
          });
          return;
        }

        const parsed = sendCvWhatsAppSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({
            error: parsed.error.issues[0]?.message || 'Invalid WhatsApp CV dispatch payload',
          });
          return;
        }

        const data = parsed.data;
        const uniqueCustomerIds = Array.from(new Set(data.customerIds));

        const [worker] = await db
          .select({
            id: workers.id,
            workerCode: workers.workerCode,
            fullNameEn: workers.fullNameEn,
            fullNameAr: workers.fullNameAr,
            status: workers.status,
          })
          .from(workers)
          .where(eq(workers.id, data.workerId))
          .limit(1);

        if (!worker || worker.status !== 'PUBLISHED') {
          res.status(404).json({ error: 'Published candidate not found' });
          return;
        }

        const recipients = await db
          .select()
          .from(agentCustomers)
          .where(
            and(
              eq(agentCustomers.agentId, agentId),
              inArray(agentCustomers.id, uniqueCustomerIds)
            )
          );

        if (recipients.length !== uniqueCustomerIds.length) {
          res.status(403).json({
            error: 'One or more selected recipients do not belong to your private customer directory',
          });
          return;
        }

        const unverified = recipients.filter((r) => r.whatsappStatus !== 'VERIFIED');
        if (unverified.length > 0) {
          res.status(400).json({
            error: `Only WhatsApp-verified householders can receive CVs. Unverified: ${unverified
              .map((u) => u.fullName)
              .join(', ')}`,
          });
          return;
        }

        let companyName = 'Partner Agency';
        if (req.currentUser!.companyId) {
          const [comp] = await db
            .select({ nameEn: companies.nameEn })
            .from(companies)
            .where(eq(companies.id, req.currentUser!.companyId))
            .limit(1);
          if (comp?.nameEn) companyName = comp.nameEn;
        }

        const signedCaption = buildWhatsAppCvCaption({
          customCaption: data.caption,
          agentName: req.currentUser!.fullName,
          companyName,
          workerCode: worker.workerCode,
          workerName:
            data.language === 'AR' ? worker.fullNameAr || worker.fullNameEn : worker.fullNameEn,
          language: data.language,
        });

        const results: Array<{
          customerId: string;
          customerName: string;
          phoneNumber: string;
          status: 'SENT' | 'FAILED';
          errorMsg: string | null;
          logId: string;
        }> = [];

        for (const recipient of recipients) {
          const dispatch = await sendCvMediaViaCentralWhatsApp({
            recipientJidOrPhone: recipient.whatsappJid || recipient.phoneNumber,
            format: data.format,
            fileBase64: data.fileBase64,
            fileName: data.fileName,
            caption: signedCaption,
          });

          const status: 'SENT' | 'FAILED' = dispatch.ok ? 'SENT' : 'FAILED';
          const errorMsg = dispatch.ok ? null : dispatch.errorMsg || 'Dispatch failed';
          const logId = `shlog_${crypto.randomUUID().slice(0, 12)}`;

          await db.insert(cvShareLogs).values({
            id: logId,
            agentId,
            customerId: recipient.id,
            workerId: worker.id,
            language: data.language,
            format: data.format,
            status,
            errorMsg,
          });

          results.push({
            customerId: recipient.id,
            customerName: recipient.fullName,
            phoneNumber: recipient.phoneNumber,
            status,
            errorMsg,
            logId,
          });
        }

        const sentCount = results.filter((r) => r.status === 'SENT').length;
        const failedCount = results.length - sentCount;

        await writeAudit(agentId, 'CV_SENT_WHATSAPP', 'Worker', worker.id, {
          workerCode: worker.workerCode,
          language: data.language,
          format: data.format,
          sentCount,
          failedCount,
        });

        res.json({
          sentCount,
          failedCount,
          signedCaption,
          results,
        });
      } catch (err) {
        if (err instanceof GatewayNotConfiguredError) {
          res.status(500).json({ error: err.message });
          return;
        }
        console.error('Send CV via WhatsApp error:', err);
        res.status(500).json({ error: 'Failed to dispatch CV via central WhatsApp gateway' });
      }
    }
  );

  app.use('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  // ── VITE / STATIC FRONTEND SERVING ─────────────────────────────────────────
  const isCompiledBundle = import.meta.url.endsWith('.mjs') || import.meta.url.endsWith('.js');
  const serveStatic = process.env.NODE_ENV === 'production' || process.env.SERVE_STATIC === 'true' || isCompiledBundle;

  if (!serveStatic) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Maktab Placement server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
