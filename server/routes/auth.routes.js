import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { loginUser, phoneExists, sendOtp, verifyOtp } from '../services/auth.service.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET env variable is required. Set it in .env');

/* POST /api/auth/check — vérifie si le numéro existe */
router.post('/check', async (req, res, next) => {
  try {
    const { phone } = z.object({ phone: z.string().min(8) }).parse(req.body);
    const exists = await phoneExists(phone);
    if (!exists) return res.status(404).json({ error: 'not_found', message: 'Numéro non reconnu.' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/* POST /api/auth/otp/send — envoyer un OTP au téléphone */
router.post('/otp/send', async (req, res, next) => {
  try {
    const { phone } = z.object({ phone: z.string().min(8) }).parse(req.body);
    const result = await sendOtp(phone);
    if (!result) return res.status(404).json({ error: 'not_found', message: 'Numéro non reconnu.' });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/* POST /api/auth/otp/verify — vérifier OTP → JWT */
router.post('/otp/verify', async (req, res, next) => {
  try {
    const { phone, code } = z.object({
      phone: z.string().min(8),
      code:  z.string().length(4),
    }).parse(req.body);

    const result = await verifyOtp(phone, code);

    if (result.error) {
      const status = result.error === 'otp_max_attempts' ? 429
        : result.error === 'otp_expired' ? 410
        : 401;
      return res.status(status).json({ error: result.error, message: result.message });
    }

    const { user } = result;
    const token = jwt.sign(
      { id: user.id, role: user.role, patientId: user.patientId, doctorId: user.doctorId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, role: user.role, name: user.name, avatar: user.avatar, patientId: user.patientId, doctorId: user.doctorId },
    });
  } catch (err) {
    next(err);
  }
});

/* POST /api/auth/login — { phone, code } → JWT (legacy, rétrocompatible) */
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

    const token = jwt.sign(
      { id: user.id, role: user.role, patientId: user.patientId, doctorId: user.doctorId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, role: user.role, name: user.name, avatar: user.avatar, patientId: user.patientId, doctorId: user.doctorId },
    });
  } catch (err) {
    next(err);
  }
});

/* GET /api/auth/me — valide le token et retourne l'utilisateur */
router.get('/me', (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    res.json({ id: payload.id, role: payload.role, patientId: payload.patientId, doctorId: payload.doctorId });
  } catch {
    res.status(401).json({ error: 'invalid_token', message: 'Token invalide ou expiré.' });
  }
});

export default router;
