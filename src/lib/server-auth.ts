import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { adminAuth } from './firebase-admin.ts';
import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };
import type { UserRole } from './validation.ts';
import { getCookieSecurityOptions } from './runtime-config.ts';

const SESSION_COOKIE_NAME = 'maktab_session';
const TOKEN_SECRET =
  process.env.SESSION_SECRET ||
  `${firebaseConfig.projectId}:${firebaseConfig.apiKey}:maktab-placement-session`;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

interface SessionPayload {
  userId: string;
  role: UserRole;
  exp: number;
}

export function signSessionToken(userId: string, role: UserRole): string {
  const payload: SessionPayload = {
    userId,
    role,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
  return `sess_${data}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  if (!token.startsWith('sess_')) return null;
  const raw = token.slice(5);
  const [data, sig] = raw.split('.');
  if (!data || !sig) return null;
  const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as SessionPayload;
    if (!parsed.userId || !parsed.exp || parsed.exp < Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export interface AuthenticatedUser {
  id: string;
  uid: string | null;
  fullName: string;
  email: string;
  role: UserRole;
  companyId: string | null;
  isActive: boolean;
}

export interface AuthRequest extends Request {
  currentUser?: AuthenticatedUser;
}

function isHttpsRequest(req: Request): boolean {
  const forwarded = req.headers['x-forwarded-proto'];
  if (typeof forwarded === 'string' && forwarded.split(',')[0].trim() === 'https') {
    return true;
  }
  return Boolean(req.secure);
}

export function setSessionCookie(req: Request, res: Response, token: string): void {
  const cookieOpts = getCookieSecurityOptions(isHttpsRequest(req));
  res.cookie(SESSION_COOKIE_NAME, token, {
    ...cookieOpts,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });
}

export function clearSessionCookie(req: Request, res: Response): void {
  const cookieOpts = getCookieSecurityOptions(isHttpsRequest(req));
  res.clearCookie(SESSION_COOKIE_NAME, cookieOpts);
}

export async function getOrLinkFirebaseUser(
  uid: string,
  email: string,
  displayName?: string | null
): Promise<AuthenticatedUser | null> {
  const existingByUid = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
  if (existingByUid.length > 0) {
    const u = existingByUid[0];
    return {
      id: u.id,
      uid: u.uid,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      companyId: u.companyId,
      isActive: u.isActive,
    };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingByEmail = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existingByEmail.length > 0) {
    const u = existingByEmail[0];
    await db
      .update(users)
      .set({ uid, updatedAt: new Date() })
      .where(eq(users.id, u.id));
    return {
      id: u.id,
      uid,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      companyId: u.companyId,
      isActive: u.isActive,
    };
  }

  // Upsert workspace owner signing in via Google Sign-In as ADMIN
  const newId = `usr_${crypto.randomUUID().slice(0, 12)}`;
  await db
    .insert(users)
    .values({
      id: newId,
      uid,
      fullName: displayName?.trim() || normalizedEmail.split('@')[0] || 'Agency Administrator',
      email: normalizedEmail,
      passwordHash: hashPassword(crypto.randomBytes(24).toString('hex')),
      role: 'ADMIN',
      companyId: null,
      isActive: true,
    })
    .onDuplicateKeyUpdate({
      set: {
        email: normalizedEmail,
        updatedAt: new Date(),
      },
    });

  const [inserted] = await db.select().from(users).where(eq(users.uid, uid)).limit(1);

  return {
    id: inserted.id,
    uid: inserted.uid,
    fullName: inserted.fullName,
    email: inserted.email,
    role: inserted.role,
    companyId: inserted.companyId,
    isActive: inserted.isActive,
  };
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken =
      authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const cookieToken =
      typeof req.cookies?.[SESSION_COOKIE_NAME] === 'string'
        ? req.cookies[SESSION_COOKIE_NAME]
        : null;
    const token = bearerToken || cookieToken;

    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (token.startsWith('sess_')) {
      const payload = verifySessionToken(token);
      if (!payload) {
        res.status(401).json({ error: 'Invalid or expired session' });
        return;
      }
      const rows = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
      if (rows.length === 0 || !rows[0].isActive) {
        res.status(401).json({ error: 'Account is inactive or not found' });
        return;
      }
      const u = rows[0];
      req.currentUser = {
        id: u.id,
        uid: u.uid,
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        companyId: u.companyId,
        isActive: u.isActive,
      };
      next();
      return;
    }

    // Otherwise verify as Firebase ID token
    const decoded = await adminAuth.verifyIdToken(token);
    if (!decoded.email) {
      res.status(401).json({ error: 'Verified account email is required' });
      return;
    }
    const user = await getOrLinkFirebaseUser(
      decoded.uid,
      decoded.email,
      typeof decoded.name === 'string' ? decoded.name : null
    );
    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Account is inactive' });
      return;
    }
    req.currentUser = user;
    next();
  } catch (err) {
    console.error('Authentication check failed:', err);
    res.status(401).json({ error: 'Unauthorized: Invalid credentials' });
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.currentUser) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!allowedRoles.includes(req.currentUser.role)) {
      res.status(403).json({ error: 'Forbidden: Insufficient role permissions' });
      return;
    }
    next();
  };
}
