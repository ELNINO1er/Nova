import express from 'express';
import { z } from 'zod';
import { requireAdmin, requirePermission } from '../middleware/auth.js';
import { parsePagination } from '../middleware/paginate.js';
import { auditLog } from '../middleware/audit.js';
import { validateBody } from '../middleware/helpers.js';
import { phoneSchema } from '../services/phone.js';
import {
  getAdminAccessLogs,
  getAdminAuditLogs,
  getAdminDashboard,
  getAdminSystem,
  getAdminUsers,
  setDoctorAvailability,
  setPharmacyOpen,
  createDoctorAccount,
  resetUserPassword,
  listResetRequests,
  decideResetRequest,
  createStaffAccount,
  createDoctorLogin,
} from '../services/admin.service.js';

const router = express.Router();

router.use(requireAdmin);

router.get('/dashboard', requirePermission('admin.stats'), async (_req, res, next) => {
  try {
    res.json(await getAdminDashboard());
  } catch (err) {
    next(err);
  }
});

router.get('/users', requirePermission('admin.users'), async (req, res, next) => {
  try {
    const pagination = parsePagination(req.query);
    res.json(await getAdminUsers({ ...req.query, ...pagination }));
  } catch (err) {
    next(err);
  }
});

router.get('/audit-logs', requirePermission('admin.audit_logs'), async (req, res, next) => {
  try {
    const pagination = parsePagination(req.query);
    res.json(await getAdminAuditLogs({ ...req.query, ...pagination }));
  } catch (err) {
    next(err);
  }
});

router.get('/access-logs', requirePermission('admin.audit_logs'), async (req, res, next) => {
  try {
    const pagination = parsePagination(req.query);
    res.json(await getAdminAccessLogs({ ...req.query, ...pagination }));
  } catch (err) {
    next(err);
  }
});

router.get('/system', requirePermission('admin.stats'), async (_req, res, next) => {
  try {
    res.json(await getAdminSystem());
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/doctors/:id/status',
  requirePermission('admin.doctors.validate'),
  auditLog('admin.doctor.status_update', 'doctor'),
  async (req, res, next) => {
    try {
      const doctor = await setDoctorAvailability(req.params.id, Boolean(req.body?.isAvailable));
      if (!doctor) return res.status(404).json({ error: 'not_found', message: 'Medecin introuvable.' });
      res.json(doctor);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/doctors',
  requirePermission('admin.doctors.validate'),
  validateBody(z.object({
    firstName: z.string().trim().min(2).max(100),
    lastName: z.string().trim().min(2).max(100),
    email: z.string().email().max(191),
    phone: phoneSchema,
    licenseNumber: z.string().trim().min(4).max(100),
    specialty: z.string().trim().min(2).max(100),
    city: z.string().trim().min(2).max(100).default('Abidjan'),
    address: z.string().trim().max(255).optional(),
  })),
  auditLog('admin.doctor.create', 'doctor'),
  async (req, res, next) => {
    try { res.status(201).json(await createDoctorAccount(req.body)); }
    catch (err) { next(err); }
  }
);

router.patch(
  '/pharmacies/:id/status',
  requirePermission('admin.pharmacies'),
  auditLog('admin.pharmacy.status_update', 'pharmacy'),
  async (req, res, next) => {
    try {
      const pharmacy = await setPharmacyOpen(req.params.id, Boolean(req.body?.isOpen));
      if (!pharmacy) return res.status(404).json({ error: 'not_found', message: 'Pharmacie introuvable.' });
      res.json(pharmacy);
    } catch (err) {
      next(err);
    }
  }
);


/* Réinitialiser le mot de passe d'un compte (mot de passe oublié, compte bloqué). */
router.post(
  '/users/:id/reset-password',
  requirePermission('admin.users'),
  auditLog('admin.user.password_reset', 'user'),
  async (req, res, next) => {
    try {
      const result = await resetUserPassword(req.params.id, req.user.id);
      if (!result) return res.status(404).json({ error: 'not_found', message: 'Compte introuvable.' });
      res.set('Cache-Control', 'no-store').status(result.pending ? 202 : 200).json(result);
    } catch (err) { next(err); }
  }
);

/* Double validation : réinitialisations de comptes sensibles en attente d'un second administrateur. */
router.get('/reset-requests', requirePermission('admin.users'), async (_req, res, next) => {
  try { res.json(await listResetRequests()); } catch (err) { next(err); }
});

for (const [action, approve] of [['approve', true], ['reject', false]]) {
  router.post(
    `/reset-requests/:id/${action}`,
    requirePermission('admin.users'),
    auditLog(`admin.user.password_reset_${action}`, 'reset_request'),
    async (req, res, next) => {
      try {
        const result = await decideResetRequest(req.params.id, req.user.id, approve);
        if (!result) return res.status(404).json({ error: 'not_found', message: 'Demande introuvable ou expirée.' });
        res.set('Cache-Control', 'no-store').json(result);
      } catch (err) { next(err); }
    }
  );
}

/* Créer l'accès de connexion d'un médecin enregistré sans compte. */
router.post(
  '/doctors/:id/account',
  requirePermission('admin.doctors.validate'),
  validateBody(z.object({ phone: phoneSchema })),
  auditLog('admin.doctor.account_create', 'doctor'),
  async (req, res, next) => {
    try {
      const result = await createDoctorLogin(req.params.id, req.body.phone);
      if (!result) return res.status(404).json({ error: 'not_found', message: 'Médecin introuvable.' });
      res.status(201).set('Cache-Control', 'no-store').json(result);
    } catch (err) { next(err); }
  }
);

/* Créer un compte pharmacien (rattaché à une pharmacie) ou gouverneur.
   Les médecins ont leur propre route (/doctors) ; les patients sont créés par leur médecin. */
router.post(
  '/accounts',
  requirePermission('admin.users'),
  validateBody(z.object({
    role: z.enum(['pharmacist', 'governor']),
    name: z.string().trim().min(2).max(120),
    phone: phoneSchema,
    pharmacyId: z.string().min(1).optional(),
  }).refine((v) => v.role !== 'pharmacist' || v.pharmacyId, { message: 'Pharmacie requise.', path: ['pharmacyId'] })),
  auditLog('admin.account.create', 'user'),
  async (req, res, next) => {
    try { res.status(201).set('Cache-Control', 'no-store').json(await createStaffAccount(req.body)); }
    catch (err) { next(err); }
  }
);

export default router;
