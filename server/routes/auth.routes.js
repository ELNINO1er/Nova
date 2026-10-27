import { Router } from 'express';
import { z } from 'zod';
import {
  changeInitialDoctorPassword, changeInitialPassword, phoneExists, sendOtp,
  startPhonePasswordLogin, verifyOtp,
} from '../services/auth.service.js';
import { verifyTotpEnrollment, verifyTotpLogin } from '../services/mfa.service.js';
import {
  signAccessToken, signRefreshToken, verifyRefreshToken,
  blacklistToken, requireAuth,
} from '../middleware/auth.js';

const router = Router();

const cookieOptions = {
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === 'true'
    || (process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false'),
  sameSite: 'lax',
  path: '/',
};

function setAuthCookies(res, token, refreshToken) {
  res.cookie('nova_access_token', token, { ...cookieOptions, maxAge: 60 * 60 * 1000 });
  res.cookie('nova_refresh_token', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
}

function clearAuthCookies(res) {
  res.clearCookie('nova_access_token', cookieOptions);
  res.clearCookie('nova_refresh_token', cookieOptions);
}

function completeLogin(res, user, extra = {}) {
  const tokenPayload = {
    id: user.id,
    role: user.role,
    patientId: user.patientId,
    doctorId: user.doctorId,
    pharmacyId: user.pharmacyId || null,
  };
  setAuthCookies(res, signAccessToken(tokenPayload), signRefreshToken(tokenPayload));
  return res.set('Cache-Control', 'no-store').json({
    user: { ...tokenPayload, name: user.name, avatar: user.avatar },
    ...extra,
  });
}

const strongPassword = z.string().min(12).max(128)
  .regex(/[a-z]/, 'Une minuscule est requise.')
  .regex(/[A-Z]/, 'Une majuscule est requise.')
  .regex(/\d/, 'Un chiffre est requis.')
  .regex(/[^A-Za-z0-9]/, 'Un caractère spécial est requis.');

function getCookie(req, name) {
  const raw = req.headers.cookie || '';
  const found = raw.split(';').map(v => v.trim()).find(v => v.startsWith(`${name}=`));
  if (!found) return null;
  try {
    return decodeURIComponent(found.slice(name.length + 1));
  } catch {
    return null;
  }
}

/* ── Connexion téléphone + mot de passe (patient, pharmacien, admin) ── */
router.post('/password/login', async (req, res, next) => {
  try {
    const { phone, password } = z.object({
      phone: z.string().min(8).max(20),
      password: z.string().min(1).max(128),
    }).parse(req.body);

    const result = await startPhonePasswordLogin(phone, password);
    if (result.error) {
      const status = result.error === 'account_locked' ? 423
        : result.error === 'use_doctor_login' ? 409
        : result.error === 'no_password' ? 403 : 401;
      // 401 réservé aux identifiants refusés : code distinct des erreurs de session côté client.
      return res.status(status).json({ error: result.error, message: result.message });
    }
    if (result.nextAction) return res.set('Cache-Control', 'no-store').json(result);
    return completeLogin(res, result.user);
  } catch (err) { next(err); }
});

/* Première connexion : remplacement obligatoire du mot de passe provisoire. */
router.post('/password/change', async (req, res, next) => {
  try {
    const { challengeId, newPassword } = z.object({
      challengeId: z.string().uuid(),
      newPassword: z.string().min(8).max(128),
    }).parse(req.body);
    return completeLogin(res, await changeInitialPassword(challengeId, newPassword));
  } catch (err) { next(err); }
});

/* ── Connexion par code SMS : désactivée tant qu'aucun fournisseur SMS n'est choisi ──
   Réactivable avec OTP_LOGIN_ENABLED=true (et SMS_PROVIDER=twilio|webhook). */
function otpLoginEnabled(_req, res, next) {
  if (process.env.OTP_LOGIN_ENABLED === 'true') return next();
  return res.status(410).json({ error: 'flow_disabled', message: 'Connectez-vous avec votre numéro et votre mot de passe.' });
}
router.use(['/check', '/otp/send', '/otp/verify'], otpLoginEnabled);

/* ── POST /api/auth/check — vérifie si le numéro existe ─────── */
router.post('/check', async (req, res, next) => {
  try {
    const { phone } = z.object({ phone: z.string().min(8) }).parse(req.body);
    const exists = await phoneExists(phone);
    if (!exists) return res.status(404).json({ error: 'not_found', message: 'Numéro non reconnu.' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

/* ── POST /api/auth/otp/send — envoyer un OTP ──────────────── */
router.post('/otp/send', async (req, res, next) => {
  try {
    const { phone } = z.object({ phone: z.string().min(8) }).parse(req.body);
    const result = await sendOtp(phone);
    if (!result) return res.status(404).json({ error: 'not_found', message: 'Numéro non reconnu.' });
    res.json(result);
  } catch (err) { next(err); }
});

/* ── POST /api/auth/otp/verify — vérifier OTP → tokens ─────── */
router.post('/otp/verify', async (req, res, next) => {
  try {
    const { phone, code } = z.object({
      phone: z.string().min(8),
      code:  z.string().length(4),
    }).parse(req.body);

    const result = await verifyOtp(phone, code);
    if (result.error) {
      const status = result.error === 'otp_max_attempts' ? 429
        : result.error === 'otp_expired' ? 410 : 401;
      return res.status(status).json({ error: result.error, message: result.message });
    }

    const { user } = result;
    // Les médecins doivent s'authentifier via le flux dédié (mot de passe + OTP),
    // pas via l'OTP téléphone générique — sinon le mot de passe est contournable.
    if (user.role === 'doctor') {
      return res.status(403).json({ error: 'forbidden', message: 'Veuillez utiliser la connexion médecin dédiée.' });
    }
    const tokenPayload = { id: user.id, role: user.role, patientId: user.patientId, doctorId: user.doctorId, pharmacyId: user.pharmacyId || null };
    const token = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);
    setAuthCookies(res, token, refreshToken);

    res.set('Cache-Control', 'no-store').json({
      user: { id: user.id, role: user.role, name: user.name, avatar: user.avatar, patientId: user.patientId, doctorId: user.doctorId, pharmacyId: user.pharmacyId || null },
    });
  } catch (err) { next(err); }
});

/* Ancienne connexion médecin par email : remplacée par numéro + mot de passe (/password/login). */
router.post('/doctor/password/start', (_req, res) => {
  res.status(410).json({ error: 'flow_disabled', message: 'Connectez-vous avec votre numéro et votre mot de passe.' });
});

/* Première activation : remplacement obligatoire du mot de passe provisoire. */
router.post('/doctor/password/change', async (req, res, next) => {
  try {
    const { challengeId, newPassword } = z.object({
      challengeId: z.string().uuid(),
      newPassword: strongPassword,
    }).parse(req.body);
    res.set('Cache-Control', 'no-store').json(
      await changeInitialDoctorPassword(challengeId, newPassword)
    );
  } catch (err) { next(err); }
});

/* Première activation : vérification du QR Authenticator et remise des secours. */
router.post('/doctor/totp/enroll/verify', async (req, res, next) => {
  try {
    const { challengeId, code } = z.object({
      challengeId: z.string().uuid(),
      code: z.string().regex(/^\d{6}$/),
    }).parse(req.body);
    const result = await verifyTotpEnrollment(challengeId, code);
    return completeLogin(res, result.user, { recoveryCodes: result.recoveryCodes });
  } catch (err) { next(err); }
});

/* Connexions suivantes : code TOTP ou code de récupération. */
router.post('/doctor/totp/verify', async (req, res, next) => {
  try {
    const { challengeId, code } = z.object({
      challengeId: z.string().uuid(),
      code: z.string().min(6).max(16),
    }).parse(req.body);
    const result = await verifyTotpLogin(challengeId, code);
    return completeLogin(res, result.user, { usedRecoveryCode: result.usedRecoveryCode });
  } catch (err) { next(err); }
});

// Ancien flux SMS médecin désactivé : il contournait l'activation TOTP.
router.post('/doctor/otp/verify', (_req, res) => {
  res.status(410).json({ error: 'flow_disabled', message: 'Utilisez le code de votre application Authenticator.' });
});

/* ── POST /api/auth/refresh — renouveler access token ───────── */
router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.body?.refreshToken || getCookie(req, 'nova_refresh_token');
    if (!refreshToken) {
      return res.status(401).json({ error: 'invalid_refresh', message: 'Refresh token manquant.' });
    }
    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) {
      return res.status(401).json({ error: 'invalid_refresh', message: 'Refresh token invalide ou expiré.' });
    }

    // Blacklist the old refresh token (rotation)
    await blacklistToken(refreshToken);

    const tokenPayload = { id: payload.id, role: payload.role, patientId: payload.patientId, doctorId: payload.doctorId, pharmacyId: payload.pharmacyId || null };
    const newToken = signAccessToken(tokenPayload);
    const newRefreshToken = signRefreshToken(tokenPayload);
    setAuthCookies(res, newToken, newRefreshToken);

    res.set('Cache-Control', 'no-store').json({ ok: true });
  } catch (err) { next(err); }
});

/* ── POST /api/auth/logout — invalider le token ─────────────── */
router.post('/logout', async (req, res, next) => {
  try {
  const accessToken = getCookie(req, 'nova_access_token');
  if (accessToken) await blacklistToken(accessToken);
  const refreshToken = getCookie(req, 'nova_refresh_token');
  if (refreshToken) await blacklistToken(refreshToken);
  clearAuthCookies(res);
  res.json({ ok: true, message: 'Déconnecté.' });
  } catch (err) { next(err); }
});

/* ── GET /api/auth/me — profil + permissions ────────────────── */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { pool } = await import('../db/database.js');
    const [permissions] = await pool.execute(
      `SELECT p.code FROM nova_permissions p
       JOIN nova_role_permissions rp ON rp.permission_id = p.id
       JOIN nova_roles r ON r.id = rp.role_id
       WHERE r.name = ?`,
      [req.user.role]
    );

    const [[account]] = await pool.execute('SELECT name, avatar FROM nova_users WHERE id = ? AND deleted_at IS NULL', [req.user.id]);
    if (!account) return res.status(401).json({ error: 'account_inactive', message: 'Compte introuvable ou desactive.' });
    res.set('Cache-Control', 'no-store').json({
      id: req.user.id,
      role: req.user.role,
      patientId: req.user.patientId,
      doctorId: req.user.doctorId,
      pharmacyId: req.user.pharmacyId,
      name: account.name,
      avatar: account.avatar,
      permissions: permissions.map(p => p.code),
    });
  } catch (err) { next(err); }
});

export default router;
