import express from 'express';
import { requirePermission } from '../middleware/auth.js';
import { wrap } from '../middleware/helpers.js';
import { auditLog } from '../middleware/audit.js';
import { getGovernorStats } from '../services/governor.service.js';

// Espace gouverneur : statistiques agrégées en lecture seule.
const router = express.Router();

router.get('/dashboard', requirePermission('governor.stats'), auditLog('public_health.view','aggregate'), wrap(async (req, res) => {
  res.json(await getGovernorStats(req.query));
}));

router.get('/report',requirePermission('governor.stats'),auditLog('public_health.export','aggregate'),wrap(async(req,res)=>{
  const data=await getGovernorStats(req.query);
  const cell=v=>'"'+String(v==null?'Masqué (moins de 5)':v).replace(/"/g,'""')+'"';
  const LABELS={patients:'Patients inscrits',doctors:'Médecins disponibles',pharmacies:'Pharmacies',consultations30:'Consultations validées',prescriptions30:'Ordonnances émises',dispenses30:'Délivrances en pharmacie',appointments30:'Rendez-vous',labRequests30:'Examens demandés'};
  const rows=[['Indicateur','Valeur'],...Object.entries(data.kpis).map(([k,v])=>[LABELS[k]||k,v]),
    ['Période du',data.filters.from],['Période au',data.filters.to],['Ville',data.filters.city||'Toutes les villes'],
    ['Couverture',data.methodology.coverage],['Masquage',data.methodology.suppression],['Généré le',data.generatedAt]];
  res.set('Cache-Control','no-store').json({filename:`nova-indicateurs-${data.filters.from}-${data.filters.to}${data.filters.city?'-'+data.filters.city.replace(/[^A-Za-z0-9]+/g,'_'):''}.csv`,content:'\uFEFF'+rows.map(r=>r.map(cell).join(';')).join('\r\n')});
}));
export default router;
