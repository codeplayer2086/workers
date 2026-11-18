import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import { and, count, desc, eq, like, or } from 'drizzle-orm';
import { db } from './src/db/index.ts';
import {
  auditLogs,
  companies,
  companyCvTemplates,
  cvDownloadLogs,
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
  companyCreateSchema,
  contractWorkerSchema,
  createAgentSchema,
  createEmployeeSchema,
  cvLogSchema,
  cvTemplateUpdateSchema,
  workerInputSchema,
} from './src/lib/validation.ts';
import {
  resolvePrivateFilePath,
  saveOptimizedPhoto,
  savePrivateDocumentFile,
  type PrivateFileBucket,
} from './src/lib/image-storage.ts';
import { translateWorkerFieldsToArabic } from './src/lib/arabic-translator.ts';
import { calculateAge } from './src/lib/cv-dictionary.ts';
import { isMysqlConfigured } from './src/lib/runtime-config.ts';

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
  app.use(express.json({ limit: '4mb' }));
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
      const allWorkers = await db.select({ status: workers.status }).from(workers);
      const statusCounts = {
        total: allWorkers.length,
        DRAFT: allWorkers.filter((w) => w.status === 'DRAFT').length,
        PUBLISHED: allWorkers.filter((w) => w.status === 'PUBLISHED').length,
        UNPUBLISHED: allWorkers.filter((w) => w.status === 'UNPUBLISHED').length,
        CONTRACTED: allWorkers.filter((w) => w.status === 'CONTRACTED').length,
      };

      const allCompanies = await db.select().from(companies);
      const allUsers = await db.select().from(users);
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
        .limit(10);

      const [downloadCountRow] = await db
        .select({ totalDownloads: count() })
        .from(cvDownloadLogs);

      res.json({
        statusCounts,
        companyCount: allCompanies.length,
        agentCount: allUsers.filter((u) => u.role === 'AGENT').length,
        employeeCount: allUsers.filter((u) => u.role === 'EMPLOYEE').length,
        totalDownloads: Number(downloadCountRow?.totalDownloads ?? 0),
        recentDownloads,
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

  app.post('/api/admin/companies', requireAuth, requireRole('ADMIN'), async (req: AuthRequest, res) => {
    try {
      const parsed = companyCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid company payload' });
        return;
      }

      const id = `comp_${crypto.randomUUID().slice(0, 10)}`;
      await db.insert(companies).values({
        id,
        nameEn: parsed.data.nameEn,
        nameAr: parsed.data.nameAr,
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
        headerTextAr: `${parsed.data.nameAr} — ملف السيرة الذاتية للمرشح`,
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
      await db
        .update(companies)
        .set({
          nameEn: parsed.data.nameEn,
          nameAr: parsed.data.nameAr,
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
          companyNameEn: companies.nameEn,
          companyNameAr: companies.nameAr,
        })
        .from(users)
        .leftJoin(companies, eq(users.companyId, companies.id))
        .where(eq(users.role, 'AGENT'))
        .orderBy(desc(users.createdAt));
      res.json(rows);
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
        })
        .from(users)
        .where(eq(users.role, 'EMPLOYEE'))
        .orderBy(desc(users.createdAt));
      res.json(rows);
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
      });
    } catch (err) {
      console.error('Create employee error:', err);
      res.status(500).json({ error: 'Failed to create employee account' });
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

      res.json({
        publishedCount: published.length,
        byOccupation,
        recentDownloads,
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
