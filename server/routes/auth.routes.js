import { Router } from 'express';
import { z } from 'zod';
import {
  loginUser, phoneExists, sendOtp, verifyOtp,
} from '../services/auth.service.js';
import {
  signAccessToken, signRefreshToken, verifyRefreshToken,
  blacklistToken, requireAuth,
} from '../middleware/auth.js';

const router = Router();

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
    const tokenPayload = { id: user.id, role: user.role, patientId: user.patientId, doctorId: user.doctorId, pharmacyId: user.pharmacyId || null };
    const token = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    res.json({
      token,
      refreshToken,
      user: { id: user.id, role: user.role, name: user.name, avatar: user.avatar, patientId: user.patientId, doctorId: user.doctorId },
    });
  } catch (err) { next(err); }
});

/* ── POST /api/auth/login — legacy (rétrocompatible) ────────── */
router.post('/login', async (req, res, next) => {
  try {
    const { phone, code } = z.object({
      phone: z.string().min(8),
      code:  z.string().length(4),
    }).parse(req.body);

    const user = await loginUser(phone, code);
    if (!user) {
      return res.status(401).json({ error: 'invalid_credentials', message: 'Code incorrect.' });
    }

    const tokenPayload = { id: user.id, role: user.role, patientId: user.patientId, doctorId: user.doctorId };
    const token = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    res.json({
      token,
      refreshToken,
      user: { id: user.id, role: user.role, name: user.name, avatar: user.avatar, patientId: user.patientId, doctorId: user.doctorId },
    });
  } catch (err) { next(err); }
});

/* ── POST /api/auth/refresh — renouveler access token ───────── */
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = z.object({ refreshToken: z.string().min(1) }).parse(req.body);
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return res.status(401).json({ error: 'invalid_refresh', message: 'Refresh token invalide ou expiré.' });
    }

    // Blacklist the old refresh token (rotation)
    blacklistToken(refreshToken);

    const tokenPayload = { id: payload.id, role: payload.role, patientId: payload.patientId, doctorId: payload.doctorId, pharmacyId: payload.pharmacyId || null };
    const newToken = signAccessToken(tokenPayload);
    const newRefreshToken = signRefreshToken(tokenPayload);

    res.json({ token: newToken, refreshToken: newRefreshToken });
  } catch (err) { next(err); }
});

/* ── POST /api/auth/logout — invalider le token ─────────────── */
router.post('/logout', requireAuth, (req, res) => {
  if (req.token) blacklistToken(req.token);
  res.json({ ok: true, message: 'Déconnecté.' });
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

    res.json({
      id: req.user.id,
      role: req.user.role,
      patientId: req.user.patientId,
      doctorId: req.user.doctorId,
      pharmacyId: req.user.pharmacyId,
      permissions: permissions.map(p => p.code),
    });
  } catch (err) { next(err); }
});

export default router;
