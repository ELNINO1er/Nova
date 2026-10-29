import express from 'express';
import { requirePermission } from '../middleware/auth.js';
import { wrap } from '../middleware/helpers.js';
import { auditLog } from '../middleware/audit.js';
import { getGovernorStats } from '../services/governor.service.js';

// Espace gouverneur : statistiques agrégées en lecture seule.
const router = express.Router();

router.get('/dashboard', requirePermission('governor.stats'), wrap(async (req, res) => {
  res.json(await getGovernorStats(req.query));
}));

router.get('/report',requirePermission('governor.stats'),auditLog('public_health.export','aggregate'),wrap(async(req,res)=>{
  const data=await getGovernorStats(req.query);
  const cell=v=>'"'+String(v==null?'Masque':v).replace(/"/g,'""')+'"';
  const rows=[['Indicateur','Valeur'],...Object.entries(data.kpis),['Depuis',data.filters.from],['Jusqu au',data.filters.to],['Perimetre',data.methodology.coverage]];
  res.set('Cache-Control','no-store').json({filename:'nova-indicateurs.csv',content:'\uFEFF'+rows.map(r=>r.map(cell).join(';')).join('\r\n')});
}));
export default router;
