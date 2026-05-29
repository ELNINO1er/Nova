import { Router } from 'express';
import { z } from 'zod';
import path from 'path';
import { requirePatient } from '../middleware/auth.js';
import { upload, uploadDir } from '../middleware/upload.js';
import {
  createMedicationIntake,
  createAppointment,
  createDocument,
  createNote,
  deleteAppointment,
  deleteDocument,
  getAppointments,
  getConversations,
  getConversation,
  createMessage,
  markConversationRead,
  getDashboard,
  getDocuments,
  getHistory,
  getLabResults,
  getLabResult,
  getMedicationToday,
  getMedicalProfile,
  getNotes,
  getProfile,
  getPrescriptions,
  getPrescription,
  getSettings,
  getTreatments,
  getVaccinations,
  getVitals,
  updateNote,
  updateAppointment,
  updateMedicalProfile,
  updateProfile,
  updateSettings,
  deleteNote,
} from '../services/patient.service.js';

const router = Router();
router.use(requirePatient);

/* helper : wrap async route handlers */
const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);

/* ─── Dashboard & Profil ─────────────────────────────────────── */

router.get('/dashboard', wrap(async (req, res) => {
  res.json(await getDashboard(req.user.patientId));
}));

router.get('/profile', wrap(async (req, res) => {
  res.json(await getProfile(req.user.patientId));
}));

router.patch('/profile', validateBody(z.object({
  firstName:             z.string().min(1).optional(),
  lastName:              z.string().min(1).optional(),
  birthDate:             z.string().optional(),
  sex:                   z.string().optional(),
  bloodType:             z.string().optional(),
  phone:                 z.string().min(8).optional(),
  email:                 z.string().email().optional(),
  address:               z.string().optional(),
  city:                  z.string().optional(),
  weightKg:              z.number().positive().optional(),
  heightCm:              z.number().positive().optional(),
  emergencyName:         z.string().optional(),
  emergencyRelationship: z.string().optional(),
  emergencyPhone:        z.string().optional(),
})), wrap(async (req, res) => {
  res.json(await updateProfile(req.user.patientId, req.body));
}));

/* ─── Vitaux ─────────────────────────────────────────────────── */

router.get('/vitals', wrap(async (req, res) => {
  res.json(await getVitals(req.user.patientId, req.query));
}));

/* ─── Traitements & Médicaments ──────────────────────────────── */

router.get('/treatments', wrap(async (req, res) => {
  res.json(await getTreatments(req.user.patientId));
}));

router.get('/medications/today', wrap(async (req, res) => {
  res.json(await getMedicationToday(req.user.patientId));
}));

router.post('/medications/:scheduleId/intakes', validateBody(z.object({
  status:  z.enum(['taken', 'missed', 'skipped']).default('taken'),
  takenAt: z.string().datetime().optional(),
})), wrap(async (req, res) => {
  res.status(201).json(
    await createMedicationIntake(req.user.patientId, req.params.scheduleId, req.body)
  );
}));

/* ─── Rendez-vous ────────────────────────────────────────────── */

router.get('/appointments', wrap(async (req, res) => {
  res.json(await getAppointments(req.user.patientId));
}));

router.post('/appointments', validateBody(z.object({
  startsAt:   z.string().datetime(),
  doctorName: z.string().min(1),
  specialty:  z.string().default('Médecine générale'),
  location:   z.string().default('À confirmer'),
  mode:       z.enum(['onsite', 'video']).default('onsite'),
  status:     z.enum(['requested', 'confirmed', 'cancelled']).default('requested'),
})), wrap(async (req, res) => {
  res.status(201).json(await createAppointment(req.user.patientId, req.body));
}));

router.patch('/appointments/:id', validateBody(z.object({
  startsAt:   z.string().datetime().optional(),
  doctorName: z.string().min(1).optional(),
  specialty:  z.string().optional(),
  location:   z.string().optional(),
  mode:       z.enum(['onsite', 'video']).optional(),
  status:     z.enum(['requested', 'confirmed', 'cancelled']).optional(),
})), wrap(async (req, res) => {
  res.json(await updateAppointment(req.user.patientId, req.params.id, req.body));
}));

router.delete('/appointments/:id', wrap(async (req, res) => {
  await deleteAppointment(req.user.patientId, req.params.id);
  res.status(204).send();
}));

/* ─── Vaccinations ───────────────────────────────────────────── */

router.get('/vaccinations', wrap(async (req, res) => {
  res.json(await getVaccinations(req.user.patientId));
}));

/* ─── Historique ─────────────────────────────────────────────── */

router.get('/history', wrap(async (req, res) => {
  res.json(await getHistory(req.user.patientId));
}));

/* ─── Documents ──────────────────────────────────────────────── */

router.get('/documents', wrap(async (req, res) => {
  res.json(await getDocuments(req.user.patientId, req.query));
}));

router.post('/documents', upload.single('file'), wrap(async (req, res) => {
  const title    = req.body.title    || (req.file ? req.file.originalname : 'Document');
  const category = req.body.category || 'other';
  const doc = await createDocument(req.user.patientId, {
    title,
    category,
    mimeType:  req.file ? req.file.mimetype    : (req.body.mimeType || 'application/pdf'),
    sizeBytes: req.file ? req.file.size        : Number(req.body.sizeBytes || 0),
    filePath:  req.file ? req.file.path        : null,
  });
  res.status(201).json(doc);
}));

router.delete('/documents/:id', wrap(async (req, res) => {
  await deleteDocument(req.user.patientId, req.params.id);
  res.status(204).send();
}));

/* ─── Conversations & Messages ───────────────────────────────── */

router.get('/conversations', wrap(async (req, res) => {
  res.json(await getConversations(req.user.patientId));
}));

router.get('/conversations/:id', wrap(async (req, res) => {
  const data = await getConversation(req.user.patientId, req.params.id);
  if (!data) return res.status(404).json({ error: 'not_found', message: 'Conversation introuvable' });
  res.json(data);
}));

router.post('/conversations/:id/messages', validateBody(z.object({
  body:           z.string().min(1).max(2000),
  attachmentName: z.string().optional(),
})), wrap(async (req, res) => {
  const msg = await createMessage(req.user.patientId, req.params.id, req.body);
  if (!msg) return res.status(404).json({ error: 'not_found', message: 'Conversation introuvable' });
  res.status(201).json(msg);
}));

router.patch('/conversations/:id/read', wrap(async (req, res) => {
  const result = await markConversationRead(req.user.patientId, req.params.id);
  if (!result) return res.status(404).json({ error: 'not_found', message: 'Conversation introuvable' });
  res.json(result);
}));

/* ─── Ordonnances ────────────────────────────────────────────── */

router.get('/prescriptions', wrap(async (req, res) => {
  res.json(await getPrescriptions(req.user.patientId, req.query));
}));

router.get('/prescriptions/:id', wrap(async (req, res) => {
  const data = await getPrescription(req.user.patientId, req.params.id);
  if (!data) return res.status(404).json({ error: 'not_found', message: 'Ordonnance introuvable' });
  res.json(data);
}));

/* ─── Résultats de laboratoire ───────────────────────────────── */

router.get('/lab-results', wrap(async (req, res) => {
  res.json(await getLabResults(req.user.patientId, req.query));
}));

router.get('/lab-results/:id', wrap(async (req, res) => {
  const data = await getLabResult(req.user.patientId, req.params.id);
  if (!data) return res.status(404).json({ error: 'not_found', message: 'Résultat introuvable' });
  res.json(data);
}));

/* ─── Profil médical ─────────────────────────────────────────── */

router.get('/medical-profile', wrap(async (req, res) => {
  res.json(await getMedicalProfile(req.user.patientId));
}));

router.patch('/medical-profile', validateBody(z.object({
  allergies:       z.array(z.string()).optional(),
  chronicDiseases: z.array(z.string()).optional(),
  familyHistory:   z.array(z.string()).optional(),
  surgicalHistory: z.array(z.string()).optional(),
})), wrap(async (req, res) => {
  res.json(await updateMedicalProfile(req.user.patientId, req.body));
}));

/* ─── Notes ──────────────────────────────────────────────────── */

router.get('/notes', wrap(async (req, res) => {
  res.json(await getNotes(req.user.patientId));
}));

router.post('/notes', validateBody(z.object({
  title:   z.string().min(1),
  content: z.string().default(''),
  color:   z.enum(['amber', 'blue', 'emerald', 'pink']).default('amber'),
  pinned:  z.boolean().default(false),
})), wrap(async (req, res) => {
  res.status(201).json(await createNote(req.user.patientId, req.body));
}));

router.patch('/notes/:id', validateBody(z.object({
  title:   z.string().min(1).optional(),
  content: z.string().optional(),
  color:   z.enum(['amber', 'blue', 'emerald', 'pink']).optional(),
  pinned:  z.boolean().optional(),
})), wrap(async (req, res) => {
  res.json(await updateNote(req.user.patientId, req.params.id, req.body));
}));

router.delete('/notes/:id', wrap(async (req, res) => {
  await deleteNote(req.user.patientId, req.params.id);
  res.status(204).send();
}));

/* ─── Paramètres ─────────────────────────────────────────────── */

router.get('/settings', wrap(async (req, res) => {
  res.json(await getSettings(req.user.patientId));
}));

router.patch('/settings', validateBody(z.record(z.unknown())), wrap(async (req, res) => {
  res.json(await updateSettings(req.user.patientId, req.body));
}));

/* ─── Middleware de validation ───────────────────────────────── */

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
