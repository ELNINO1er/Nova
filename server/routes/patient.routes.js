import { Router } from 'express';
import { z } from 'zod';
import { requirePatient } from '../middleware/auth.js';
import {
  createMedicationIntake,
  createNote,
  getAppointments,
  getConversations,
  getDashboard,
  getDocuments,
  getHistory,
  getMedicationToday,
  getNotes,
  getProfile,
  getSettings,
  getTreatments,
  getVaccinations,
  getVitals,
  updateNote,
  updateProfile,
  updateSettings,
  deleteNote,
} from '../services/patient.service.js';

const router = Router();

router.use(requirePatient);

router.get('/dashboard', (req, res) => res.json(getDashboard(req.user.patientId)));
router.get('/profile', (req, res) => res.json(getProfile(req.user.patientId)));
router.patch('/profile', validateBody(z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().min(8).optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  weightKg: z.number().positive().optional(),
  heightCm: z.number().positive().optional(),
})), (req, res) => res.json(updateProfile(req.user.patientId, req.body)));

router.get('/vitals', (req, res) => res.json(getVitals(req.user.patientId, req.query)));
router.get('/treatments', (req, res) => res.json(getTreatments(req.user.patientId)));
router.get('/medications/today', (req, res) => res.json(getMedicationToday(req.user.patientId)));
router.post('/medications/:scheduleId/intakes', validateBody(z.object({
  status: z.enum(['taken', 'missed', 'skipped']).default('taken'),
  takenAt: z.string().datetime().optional(),
})), (req, res) => res.status(201).json(createMedicationIntake(req.user.patientId, req.params.scheduleId, req.body)));

router.get('/appointments', (req, res) => res.json(getAppointments(req.user.patientId)));
router.get('/vaccinations', (req, res) => res.json(getVaccinations(req.user.patientId)));
router.get('/history', (req, res) => res.json(getHistory(req.user.patientId)));
router.get('/documents', (req, res) => res.json(getDocuments(req.user.patientId, req.query)));
router.get('/conversations', (req, res) => res.json(getConversations(req.user.patientId)));

router.get('/notes', (req, res) => res.json(getNotes(req.user.patientId)));
router.post('/notes', validateBody(z.object({
  title: z.string().min(1),
  content: z.string().default(''),
  color: z.enum(['amber', 'blue', 'emerald', 'pink']).default('amber'),
  pinned: z.boolean().default(false),
})), (req, res) => res.status(201).json(createNote(req.user.patientId, req.body)));
router.patch('/notes/:id', validateBody(z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  color: z.enum(['amber', 'blue', 'emerald', 'pink']).optional(),
  pinned: z.boolean().optional(),
})), (req, res) => res.json(updateNote(req.user.patientId, req.params.id, req.body)));
router.delete('/notes/:id', (req, res) => {
  deleteNote(req.user.patientId, req.params.id);
  res.status(204).send();
});

router.get('/settings', (req, res) => res.json(getSettings(req.user.patientId)));
router.patch('/settings', validateBody(z.record(z.unknown())), (req, res) => res.json(updateSettings(req.user.patientId, req.body)));

function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({
        error: 'validation_error',
        details: parsed.error.flatten(),
      });
    }
    req.body = parsed.data;
    next();
  };
}

export default router;
