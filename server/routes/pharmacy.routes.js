import { Router } from 'express';
import { z } from 'zod';
import { requirePharmacist, requirePermission } from '../middleware/auth.js';
import { wrap, validateBody } from '../middleware/helpers.js';
import { auditLog, recordAccess } from '../middleware/audit.js';
import {
  verifyPrescriptionQR,
  assertQrMatches,
  getPrescriptionForPharmacy,
  dispensePrescription,
  getDispenseHistory,
  getPharmacyDashboard,
} from '../services/pharmacy.service.js';
import { getOrdersForPharmacy, updateOrderStatus } from '../services/pharmacy-order.service.js';

const router = Router();
router.use(requirePharmacist);

/* ─── Dashboard ───────────────────────────────────────────────── */
router.get('/dashboard', wrap(async (req, res) => {
  res.json(await getPharmacyDashboard(req.user.pharmacyId));
}));

/* ─── Vérifier ordonnance (scan QR) ───────────────────────────── */
router.post('/verify-prescription', requirePermission('pharmacy.verify'), validateBody(z.object({
  qrToken: z.string().min(1),
})), wrap(async (req, res) => {
  const result = await verifyPrescriptionQR(req.body.qrToken);
  if (!result) return res.status(404).json({ error: 'not_found', message: 'Ordonnance introuvable.' });
  await recordAccess(req, [result.patientId], 'pharmacy_prescription');
  res.json(result);
}));

/* ─── Voir détail ordonnance : uniquement avec le QR présenté par le patient ─── */
router.get('/prescription/:id', requirePermission('pharmacy.verify'), wrap(async (req, res) => {
  assertQrMatches(String(req.get('x-prescription-qr') || ''), req.params.id);
  const data = await getPrescriptionForPharmacy(req.params.id);
  if (!data) return res.status(404).json({ error: 'not_found', message: 'Ordonnance introuvable.' });
  await recordAccess(req, [data.patientId], 'pharmacy_prescription');
  res.json(data);
}));

/* ─── Délivrer ordonnance ─────────────────────────────────────── */
router.post('/dispense', requirePermission('pharmacy.dispense'), validateBody(z.object({
  prescriptionId: z.string().min(1),
  requestKey:z.string().min(8).max(100),
  qrToken:        z.string().min(1),
  status:         z.enum(['full', 'partial', 'refused']),
  items:          z.array(z.object({
    prescriptionItemId: z.string().min(1),
    quantityDispensed:  z.number().int().positive(),
    substituted:        z.boolean().default(false),
    substitutionName:   z.string().optional(),
    substitutionReason: z.string().optional(),
  })).max(100),
  notes: z.string().max(1000).optional(),
})), auditLog('prescription.dispense', 'dispense'), wrap(async (req, res) => {
  assertQrMatches(req.body.qrToken, req.body.prescriptionId);
  res.status(201).json(await dispensePrescription(
    req.user.pharmacyId,
    req.user.id,
    req.body
  ));
}));

/* ─── Commandes envoyées par les patients ─────────────────────── */
router.get('/orders', requirePermission('pharmacy.verify'), wrap(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const orders = await getOrdersForPharmacy(req.user.pharmacyId);
  await recordAccess(req, orders.map((o) => o.patientId), 'pharmacy_order');
  res.json(orders);
}));
router.patch('/orders/:id', requirePermission('pharmacy.verify'), validateBody(z.object({
  status: z.enum(['ready', 'unavailable']),
  message: z.string().max(500).optional(),
})), auditLog('pharmacy.order.update', 'pharmacy_order'), wrap(async (req, res) => {
  res.json(await updateOrderStatus(req.user.pharmacyId, req.params.id, req.body));
}));

/* ─── Historique délivrances ──────────────────────────────────── */
router.get('/dispenses', requirePermission('pharmacy.history'), wrap(async (req, res) => {
  res.json(await getDispenseHistory(req.user.pharmacyId, req.query));
}));

export default router;
