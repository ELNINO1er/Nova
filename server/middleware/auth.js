import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { pool } from '../db/database.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET env variable is required. Set it in .env');
if (process.env.NODE_ENV === 'production' && JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must contain at least 32 characters in production.');
}

const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || (JWT_SECRET + '-refresh');
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_REFRESH_SECRET || REFRESH_SECRET.length < 32 || REFRESH_SECRET === JWT_SECRET)) {
  throw new Error('JWT_REFRESH_SECRET must be distinct and contain at least 32 characters in production.');
}

/* ── Token blacklist (in-memory, swap for Redis in production) ── */
const blacklistedTokens = new Set();

export async function blacklistToken(token) {
  const decoded = jwt.decode(token);
  if (!decoded?.jti || !decoded?.exp) return;
  blacklistedTokens.add(decoded.jti);
  const delay = Math.max(0, decoded.exp * 1000 - Date.now());
  setTimeout(() => blacklistedTokens.delete(decoded.jti), Math.min(delay, 2_147_483_647));
  await pool.execute(
    'INSERT IGNORE INTO nova_revoked_tokens (jti, expires_at) VALUES (?, FROM_UNIXTIME(?))',
    [decoded.jti, decoded.exp]
  );
}

export async function isBlacklisted(token) {
  const decoded = jwt.decode(token);
  if (!decoded?.jti) return false;
  if (blacklistedTokens.has(decoded.jti)) return true;
  const [[row]] = await pool.execute(
    'SELECT jti FROM nova_revoked_tokens WHERE jti = ? AND expires_at > NOW()',
    [decoded.jti]
  );
  if (row) blacklistedTokens.add(decoded.jti);
  return Boolean(row);
}

/* ── Token helpers ──────────────────────────────────────────────── */

export function signAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30m', jwtid: randomUUID() });
}

export function signRefreshToken(payload) {
  return jwt.sign({ ...payload, type: 'refresh' }, REFRESH_SECRET, { expiresIn: '7d', jwtid: randomUUID() });
}

export async function verifyRefreshToken(token) {
  if (await isBlacklisted(token)) return null;
  try {
    const payload = jwt.verify(token, REFRESH_SECRET);
    if (payload.type !== 'refresh') return null;
    return payload;
  } catch {
    return null;
  }
}

/* ── Core verify ────────────────────────────────────────────────── */

async function verifyToken(req, res) {
  const header = req.headers.authorization;
  const cookieToken = getCookie(req, 'nova_access_token');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : cookieToken;
  if (!token) {
    res.status(401).json({ error: 'unauthorized', message: 'Token manquant.' });
    return null;
  }
  try {
    if (await isBlacklisted(token)) {
      res.status(401).json({ error: 'token_revoked', message: 'Token révoqué. Reconnectez-vous.' });
      return null;
    }
    const payload = jwt.verify(token, JWT_SECRET);
    const [[account]] = await pool.execute('SELECT role, session_version FROM nova_users WHERE id=? AND deleted_at IS NULL AND disabled_at IS NULL', [payload.id || '']);
    if (!account || account.role !== payload.role || Number(account.session_version) !== Number(payload.sessionVersion || 0)) {
      res.status(401).json({ error: 'token_revoked', message: 'Session révoquée. Reconnectez-vous.' });
      return null;
    }
    req.token = token; // Store for potential blacklisting on logout
    return payload;
  } catch (error) {
    if (!['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(error?.name)) {
      res.status(503).json({ error: 'auth_unavailable', message: 'Service d’authentification temporairement indisponible.' });
      return null;
    }
    res.status(401).json({ error: 'invalid_token', message: 'Token invalide ou expiré.' });
    return null;
  }
}

function getCookie(req, name) {
  const raw = req.headers.cookie || '';
  const found = raw.split(';').map(v => v.trim()).find(v => v.startsWith(`${name}=`));
  if (!found) return null;
  // Un cookie mal encodé ne doit pas lever d'exception : les middlewares async
  // ne sont pas couverts par Express 4 et feraient tomber le processus.
  try {
    return decodeURIComponent(found.slice(name.length + 1));
  } catch {
    return null;
  }
}

/* ── Role-based middlewares ─────────────────────────────────────── */

export async function requirePatient(req, res, next) {
  const payload = await verifyToken(req, res);
  if (!payload) return;
  if (payload.role !== 'patient') {
    return res.status(403).json({ error: 'forbidden', message: 'Accès réservé aux patients.' });
  }
  req.user = { id: payload.id, role: payload.role, patientId: payload.patientId };
  next();
}

export async function requireDoctor(req, res, next) {
  const payload = await verifyToken(req, res);
  if (!payload) return;
  if (payload.role !== 'doctor') {
    return res.status(403).json({ error: 'forbidden', message: 'Accès réservé aux médecins.' });
  }
  req.user = { id: payload.id, role: payload.role, doctorId: payload.doctorId };
  next();
}

export async function requirePharmacist(req, res, next) {
  const payload = await verifyToken(req, res);
  if (!payload) return;
  if (payload.role !== 'pharmacist') {
    return res.status(403).json({ error: 'forbidden', message: 'Accès réservé aux pharmaciens.' });
  }
  req.user = { id: payload.id, role: payload.role, pharmacyId: payload.pharmacyId };
  next();
}

export async function requireAdmin(req, res, next) {
  const payload = await verifyToken(req, res);
  if (!payload) return;
  if (payload.role !== 'admin') {
    return res.status(403).json({ error: 'forbidden', message: 'Accès réservé aux administrateurs.' });
  }
  req.user = { id: payload.id, role: payload.role };
  next();
}

/**
 * Generic auth middleware — accepts any authenticated user.
 */
export async function requireAuth(req, res, next) {
  const payload = await verifyToken(req, res);
  if (!payload) return;
  req.user = {
    id: payload.id,
    role: payload.role,
    patientId: payload.patientId || null,
    doctorId: payload.doctorId || null,
    pharmacyId: payload.pharmacyId || null,
  };
  next();
}

/**
 * Permission-based middleware — checks if user's role has the required permission.
 * Usage: requirePermission('doctor.prescriptions')
 */
export function requirePermission(permissionCode) {
  return async (req, res, next) => {
    const payload = await verifyToken(req, res);
    if (!payload) return;

    req.user = {
      id: payload.id,
      role: payload.role,
      patientId: payload.patientId || null,
      doctorId: payload.doctorId || null,
      pharmacyId: payload.pharmacyId || null,
    };

    try {
      const [[perm]] = await pool.execute(
        `SELECT rp.role_id FROM nova_role_permissions rp
         JOIN nova_roles r ON r.id = rp.role_id
         JOIN nova_permissions p ON p.id = rp.permission_id
         WHERE r.name = ? AND p.code = ?
         LIMIT 1`,
        [payload.role, permissionCode]
      );

      if (!perm) {
        return res.status(403).json({
          error: 'forbidden',
          message: `Permission requise : ${permissionCode}`,
        });
      }

      next();
    } catch {
      return res.status(500).json({ error: 'server_error', message: 'Erreur vérification permissions.' });
    }
  };
}
