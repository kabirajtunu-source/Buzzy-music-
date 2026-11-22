import crypto from 'crypto';
import type {NextFunction, Request, Response} from 'express';
import {db} from './db.ts';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  role: 'user' | 'admin';
  plan: 'free' | 'premium';
  created_at: string;
}

export interface AuthedRequest extends Request {
  user?: AuthUser;
  sessionTokenHash?: string;
}

export const SESSION_COOKIE_NAME = 'buzzly_session';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derived = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derived.length) return false;
  return crypto.timingSafeEqual(keyBuf, derived);
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function createSession(userId: string): {token: string; expiresAt: string} {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();
  db.prepare(`INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`).run(
    id,
    userId,
    tokenHash,
    expiresAt
  );
  return {token, expiresAt};
}

export function setSessionCookie(res: Response, token: string, expiresAt: string) {
  const maxAgeMs = Math.max(0, new Date(expiresAt).getTime() - Date.now());
  const securePart = '; Secure; SameSite=None; Partitioned';
  const cookieStr = `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Max-Age=${Math.floor(
    maxAgeMs / 1000
  )}${securePart}`;
  res.setHeader('Set-Cookie', cookieStr);
}

export function clearSessionCookie(res: Response) {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0; Secure; SameSite=None; Partitioned`
  );
}

function extractToken(req: Request): {token: string | null; viaCookie: boolean} {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return {token: authHeader.slice(7).trim(), viaCookie: false};
  }
  const cookieToken = req.cookies?.[SESSION_COOKIE_NAME];
  if (typeof cookieToken === 'string' && cookieToken.length > 0) {
    return {token: cookieToken, viaCookie: true};
  }
  return {token: null, viaCookie: false};
}

function passesCsrfCheck(req: Request): boolean {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true;
  if (req.headers['x-requested-with'] === 'BuzzlyWeb') return true;
  const origin = req.headers.origin;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost === host) return true;
    } catch {
      return false;
    }
  }
  return false;
}

export function resolveUserFromRequest(req: AuthedRequest): AuthUser | undefined {
  const {token, viaCookie} = extractToken(req);
  if (!token) return undefined;
  if (viaCookie && !passesCsrfCheck(req)) return undefined;

  const tokenHash = hashToken(token);
  const row = db
    .prepare(
      `
      SELECT u.id, u.name, u.email, u.avatar_url, u.role, u.plan, u.created_at, s.expires_at
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?
    `
    )
    .get(tokenHash) as (AuthUser & {expires_at: string}) | undefined;

  if (!row) return undefined;
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
    return undefined;
  }

  req.sessionTokenHash = tokenHash;
  const {expires_at: _exp, ...user} = row;
  return user;
}

export function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  req.user = resolveUserFromRequest(req);
  next();
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const user = resolveUserFromRequest(req);
  if (!user) {
    res.status(401).json({error: 'Authentication required'});
    return;
  }
  req.user = user;
  next();
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const user = resolveUserFromRequest(req);
  if (!user) {
    res.status(401).json({error: 'Authentication required'});
    return;
  }
  if (user.role !== 'admin') {
    res.status(403).json({error: 'Admin privileges required'});
    return;
  }
  req.user = user;
  next();
}
