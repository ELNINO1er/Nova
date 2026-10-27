import express from 'express';
import { requirePermission } from '../middleware/auth.js';
import { wrap } from '../middleware/helpers.js';
import { getGovernorStats } from '../services/governor.service.js';

// Espace gouverneur : statistiques agrégées en lecture seule.
const router = express.Router();

router.get('/dashboard', requirePermission('governor.stats'), wrap(async (_req, res) => {
  res.json(await getGovernorStats());
}));

export default router;
