import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { wrap } from '../middleware/helpers.js';
import { getPublicEmergencyCard } from '../services/emergency.service.js';

// Routes sans compte. Seule la fiche d'urgence ouverte par le QR est exposée ici.
const router = Router();

// Limite les essais de jetons (le jeton fait 256 bits : la limite protège surtout la base).
const emergencyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_requests', message: 'Trop de demandes. Réessayez dans quelques minutes.' },
});

router.get('/emergency/:token', emergencyLimiter, wrap(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.set('Referrer-Policy', 'no-referrer');
  const card = await getPublicEmergencyCard(req.params.token);
  if (!card) return res.status(404).json({ error: 'not_found', message: 'QR code d’urgence invalide ou désactivé.' });
  res.json(card);
}));

export default router;
