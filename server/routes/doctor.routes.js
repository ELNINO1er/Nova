import { Router } from 'express';
import { z } from 'zod';
import { requireDoctor } from '../middleware/auth.js';
import {
  getDoctorDashboard,
  getDoctorPatients,
  getDoctorPatient,
  getDoctorAppointments,
  updateDoctorAppointment,
  getDoctorConsultations,
  createConsultation,
  updateConsultation,
  getDoctorStats,
  getDoctorProfile,
  getDoctorPrescriptions,
  getDoctorPrescription,
  createDoctorPrescription,
  getDoctorLabRequests,
  createDoctorLabRequest,
  getChronicPatients,
  getDoctorAlerts,
  createDoctorAlert,
  resolveDoctorAlert,
  getDoctorFinances,
  getDoctorFullReputation,
  getDoctorSignatureData,
  saveDoctorSignatureData,
  createPatientByDoctor,
} from '../services/doctor.service.js';

import { wrap, validateBody } from '../middleware/helpers.js';
import { auditLog, accessLog } from '../middleware/audit.js';

const router = Router();
router.use(requireDoctor);

/* ─── Dashboard ────────────────────────────────────────────── */
router.get('/dashboard', wrap(async (req, res) => {
  res.json(await getDoctorDashboard(req.user.doctorId));
}));

/* ─── Patients ─────────────────────────────────────────────── */
router.get('/patients', wrap(async (req, res) => {
  res.json(await getDoctorPatients(req.user.doctorId, req.query));
}));

router.post('/patients', validateBody(z.object({
  firstName:             z.string().min(1),
  lastName:              z.string().min(1),
  phone:                 z.string().min(8),
  cmuNumber:             z.string().optional(),
  birthDate:             z.string().optional(),
  sex:                   z.enum(['M', 'F']).optional(),
  bloodType:             z.string().optional(),
  email:                 z.string().email().optional(),
  address:               z.string().optional(),
  city:                  z.string().optional(),
  weightKg:              z.number().positive().optional(),
  heightCm:              z.number().positive().optional(),
  emergencyName:         z.string().optional(),
  emergencyRelationship: z.string().optional(),
  emergencyPhone:        z.string().optional(),
  allergies:             z.array(z.string()).optional(),
  chronicDiseases:       z.array(z.string()).optional(),
})), auditLog('patient.create', 'patient'), wrap(async (req, res) => {
  res.status(201).json(await createPatientByDoctor(req.user.doctorId, req.body));
}));

router.get('/patients/:id', accessLog('patient_record'), wrap(async (req, res) => {
  const data = await getDoctorPatient(req.user.doctorId, req.params.id);
  if (!data) return res.status(404).json({ error: 'not_found', message: 'Patient introuvable ou non autorisé.' });
  res.json(data);
}));

/* ─── Rendez-vous ──────────────────────────────────────────── */
router.get('/appointments', wrap(async (req, res) => {
  res.json(await getDoctorAppointments(req.user.doctorId, req.query));
}));

router.patch('/appointments/:id', validateBody(z.object({
  status:   z.enum(['confirmed','cancelled','requested']).optional(),
  startsAt: z.string().datetime().optional(),
  location: z.string().optional(),
})), wrap(async (req, res) => {
  const result = await updateDoctorAppointment(req.user.doctorId, req.params.id, req.body);
  if (!result) return res.status(404).json({ error: 'not_found' });
  res.json(result);
}));

/* ─── Consultations ────────────────────────────────────────── */
router.get('/consultations', wrap(async (req, res) => {
  res.json(await getDoctorConsultations(req.user.doctorId));
}));

router.post('/consultations', validateBody(z.object({
  patientId:          z.string().min(1),
  motif:              z.string().optional(),
  diagnosisMain:      z.string().optional(),
  diagnosisSecondary: z.string().optional(),
  notes:              z.string().optional(),
  recommendations:    z.string().optional(),
})), auditLog('consultation.create', 'consultation'), wrap(async (req, res) => {
  res.status(201).json(await createConsultation(req.user.doctorId, req.body));
}));

router.patch('/consultations/:id', validateBody(z.object({
  motif:              z.string().optional(),
  diagnosisMain:      z.string().optional(),
  diagnosisSecondary: z.string().optional(),
  notes:              z.string().optional(),
  recommendations:    z.string().optional(),
  status:             z.enum(['draft','completed']).optional(),
})), wrap(async (req, res) => {
  const result = await updateConsultation(req.user.doctorId, req.params.id, req.body);
  if (!result) return res.status(404).json({ error: 'not_found' });
  res.json(result);
}));

/* ─── Statistiques ─────────────────────────────────────────── */
router.get('/stats', wrap(async (req, res) => {
  res.json(await getDoctorStats(req.user.doctorId));
}));

/* ─── Profil ────────────────────────────────────────────────── */
router.get('/profile', wrap(async (req, res) => {
  const data = await getDoctorProfile(req.user.doctorId);
  if (!data) return res.status(404).json({ error: 'not_found' });
  res.json(data);
}));

/* ─── Ordonnances (médecin) ─────────────────────────────────── */
router.get('/prescriptions', wrap(async (req, res) => {
  res.json(await getDoctorPrescriptions(req.user.doctorId));
}));

router.get('/prescriptions/:id', wrap(async (req, res) => {
  const data = await getDoctorPrescription(req.user.doctorId, req.params.id);
  if (!data) return res.status(404).json({ error: 'not_found' });
  res.json(data);
}));

router.post('/prescriptions', validateBody(z.object({
  patientId: z.string().min(1),
  items:     z.array(z.object({
    name:         z.string().min(1),
    dosage:       z.string().optional(),
    frequency:    z.string().optional(),
    duration:     z.string().optional(),
    instructions: z.string().optional(),
  })).min(1),
  notes:     z.string().optional(),
  validDays: z.number().int().positive().optional(),
})), auditLog('prescription.create', 'prescription'), wrap(async (req, res) => {
  res.status(201).json(await createDoctorPrescription(req.user.doctorId, req.body));
}));

/* ─── Suivi chroniques ──────────────────────────────────────── */
router.get('/chronic-patients', wrap(async (req, res) => {
  res.json(await getChronicPatients(req.user.doctorId));
}));

/* ─── Alertes médecin ───────────────────────────────────────── */
router.get('/alerts', wrap(async (req, res) => {
  res.json(await getDoctorAlerts(req.user.doctorId));
}));

router.post('/alerts', validateBody(z.object({
  patientId: z.string().min(1),
  type:      z.enum(['chronic', 'urgent', 'followup', 'lab', 'other']),
  level:     z.enum(['info', 'warning', 'critical']).optional(),
  title:     z.string().min(1),
  body:      z.string().optional(),
})), auditLog('alert.create', 'alert'), wrap(async (req, res) => {
  res.status(201).json(await createDoctorAlert(req.user.doctorId, req.body));
}));

router.patch('/alerts/:id/resolve', wrap(async (req, res) => {
  const result = await resolveDoctorAlert(req.user.doctorId, req.params.id);
  if (!result) return res.status(404).json({ error: 'not_found' });
  res.json(result);
}));

/* ─── Finances ──────────────────────────────────────────────── */
router.get('/finances', wrap(async (req, res) => {
  res.json(await getDoctorFinances(req.user.doctorId));
}));

/* ─── Réputation complète ───────────────────────────────────── */
router.get('/reputation', wrap(async (req, res) => {
  res.json(await getDoctorFullReputation(req.user.doctorId));
}));

/* ─── Signature électronique ────────────────────────────────── */
router.get('/signature', wrap(async (req, res) => {
  res.json(await getDoctorSignatureData(req.user.doctorId));
}));

router.post('/signature', validateBody(z.object({
  signatureData: z.string().min(1).max(500000),
})), wrap(async (req, res) => {
  res.json(await saveDoctorSignatureData(req.user.doctorId, req.body.signatureData));
}));

/* ─── Demandes d'analyses ───────────────────────────────────── */
router.get('/lab-requests', wrap(async (req, res) => {
  res.json(await getDoctorLabRequests(req.user.doctorId));
}));

router.post('/lab-requests', validateBody(z.object({
  patientId:      z.string().min(1),
  type:           z.string().min(1),
  title:          z.string().min(1),
  notes:          z.string().optional(),
  consultationId: z.string().optional(),
})), wrap(async (req, res) => {
  res.status(201).json(await createDoctorLabRequest(req.user.doctorId, req.body));
}));

/* ─── Consentement : demander accès dossier patient ──────────── */
router.post('/consents/:patientId/request', validateBody(z.object({
  scope: z.array(z.string()).min(1),
})), auditLog('consent.request', 'consent'), wrap(async (req, res) => {
  const { randomUUID } = await import('node:crypto');
  const { pool } = await import('../db/database.js');

  // Vérifier que le patient existe
  const [[patient]] = await pool.execute('SELECT id FROM nova_patients WHERE id = ?', [req.params.patientId]);
  if (!patient) return res.status(404).json({ error: 'not_found', message: 'Patient introuvable.' });

  // Vérifier s'il y a déjà un consentement pending
  const [[existing]] = await pool.execute(
    'SELECT id FROM nova_consents WHERE patient_id = ? AND doctor_id = ? AND status = ?',
    [req.params.patientId, req.user.doctorId, 'pending']
  );
  if (existing) return res.status(409).json({ error: 'already_pending', message: 'Une demande est déjà en attente.' });

  const id = randomUUID();
  await pool.execute(
    `INSERT INTO nova_consents (id, patient_id, doctor_id, status, scope) VALUES (?, ?, ?, 'pending', ?)`,
    [id, req.params.patientId, req.user.doctorId, JSON.stringify(req.body.scope)]
  );

  // Notification au patient
  const [[doctor]] = await pool.execute('SELECT first_name, last_name, specialty FROM nova_doctors WHERE id = ?', [req.user.doctorId]);
  const doctorName = doctor ? `Dr. ${doctor.first_name} ${doctor.last_name}` : 'Un médecin';
  await pool.execute(
    `INSERT INTO nova_notifications (id, patient_id, type, title, body, link_page, created_at)
     VALUES (?, ?, 'consent', ?, ?, 'consents', NOW())`,
    [randomUUID(), req.params.patientId, 'Demande d\'accès à votre dossier',
     `${doctorName} (${doctor?.specialty || ''}) demande l'accès à votre dossier médical.`]
  );

  res.status(201).json({ id, status: 'pending', patientId: req.params.patientId });
}));

/* ─── Voir statut délivrance d'une ordonnance ────────────────── */
router.get('/prescriptions/:id/dispense-status', wrap(async (req, res) => {
  const { pool } = await import('../db/database.js');
  const [[rx]] = await pool.execute(
    'SELECT id, status, doctor_id FROM nova_prescriptions WHERE id = ? AND doctor_id = ?',
    [req.params.id, req.user.doctorId]
  );
  if (!rx) return res.status(404).json({ error: 'not_found' });

  const [dispenses] = await pool.execute(
    `SELECT d.id, d.status, d.dispensed_at, d.notes, ph.name AS pharmacy_name
     FROM nova_dispenses d JOIN nova_pharmacies ph ON ph.id = d.pharmacy_id
     WHERE d.prescription_id = ? ORDER BY d.dispensed_at DESC`,
    [req.params.id]
  );

  res.json({
    prescriptionId: rx.id,
    prescriptionStatus: rx.status,
    dispenses: dispenses.map(d => ({
      id: d.id, status: d.status, pharmacyName: d.pharmacy_name,
      dispensedAt: d.dispensed_at, notes: d.notes,
    })),
  });
}));

export default router;
