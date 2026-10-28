/*
 * Tests d'intégration (base MySQL réelle) : accès aux dossiers, rendez-vous, QR pharmacie.
 * S'appuient sur les données de démonstration (SEED_DEMO) et nettoient ce qu'ils créent.
 * Ignorés automatiquement si la base n'est pas joignable.
 */
import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';

let db = null;
try {
  db = await import('../db/database.js');
  await db.initDb();
} catch (err) {
  // Base indisponible (ex. poste sans MySQL) : la suite est ignorée, la raison est affichée.
  console.warn(`[integration] base indisponible, tests ignorés : ${err.code || ''} ${err.message}`);
  db = null;
}
const runIf = db ? describe : describe.skip;

runIf('Intégration lot 1', () => {
  let pool; let access; let patient; let doctorSvc; let pharmacy;
  const PATIENT = 'patient-demo';
  const DOCTOR = 'doc-001';
  const OTHER_DOCTOR = 'doc-003';
  const createdAppointments = [];
  const startedAt = new Date(Date.now() - 1000);

  beforeAll(async () => {
    pool = db.pool;
    access = await import('../services/access.js');
    patient = await import('../services/patient.service.js');
    doctorSvc = await import('../services/doctor.service.js');
    pharmacy = await import('../services/pharmacy.service.js');
    // Point de départ connu : le médecin de démo a un accès explicite.
    await patient.grantDoctorAccess(PATIENT, DOCTOR);
  });

  afterAll(async () => {
    if (createdAppointments.length) {
      await pool.query(`DELETE FROM nova_appointments WHERE id IN (${createdAppointments.map(() => '?').join(',')})`, createdAppointments);
    }
    await pool.execute('DELETE FROM nova_consents WHERE patient_id = ? AND doctor_id = ? AND requested_at >= ?', [PATIENT, DOCTOR, startedAt]);
    await pool.end();
  });

  it('une révocation coupe l’accès du médecin, y compris dans sa liste de patients', async () => {
    expect(await access.hasDoctorPatientAccess(DOCTOR, PATIENT)).toBe(true);
    await patient.revokeDoctorAccess(PATIENT, DOCTOR);
    expect(await access.hasDoctorPatientAccess(DOCTOR, PATIENT)).toBe(false);
    expect(await doctorSvc.getDoctorPatient(DOCTOR, PATIENT)).toBeNull();
    const list = await doctorSvc.getDoctorPatients(DOCTOR);
    expect(list.some((p) => p.id === PATIENT)).toBe(false);
    await expect(doctorSvc.createConsultation(DOCTOR, { patientId: PATIENT, motif: 'Test' })).rejects.toMatchObject({ status: 403 });
  });

  it('un nouvel accord rétablit l’accès', async () => {
    await patient.grantDoctorAccess(PATIENT, DOCTOR);
    expect(await access.hasDoctorPatientAccess(DOCTOR, PATIENT)).toBe(true);
  });

  it('une demande de rendez-vous est créée « requested » et le patient ne peut pas la confirmer', async () => {
    const startsAt = new Date(Date.now() + 40 * 86400000).toISOString().slice(0, 13) + ':00:00.000Z';
    const appt = await patient.createAppointment(PATIENT, { startsAt, doctorId: OTHER_DOCTOR, mode: 'onsite' });
    createdAppointments.push(appt.id);
    expect(appt.status).toBe('requested');
    await expect(patient.updateAppointment(PATIENT, appt.id, { status: 'confirmed' })).rejects.toMatchObject({ status: 409 });
  });

  it('refuse un deuxième rendez-vous sur le même horaire du même médecin', async () => {
    const startsAt = new Date(Date.now() + 41 * 86400000).toISOString().slice(0, 13) + ':00:00.000Z';
    const first = await patient.createAppointment(PATIENT, { startsAt, doctorId: OTHER_DOCTOR });
    createdAppointments.push(first.id);
    await expect(patient.createAppointment(PATIENT, { startsAt, doctorId: OTHER_DOCTOR })).rejects.toMatchObject({ status: 409 });
  });

  it('refuse une date passée', async () => {
    await expect(patient.createAppointment(PATIENT, { startsAt: '2020-01-01T10:00:00.000Z', doctorId: OTHER_DOCTOR })).rejects.toMatchObject({ status: 422 });
  });

  it('annule sans supprimer, et une nouvelle tentative est sans effet', async () => {
    const startsAt = new Date(Date.now() + 42 * 86400000).toISOString().slice(0, 13) + ':00:00.000Z';
    const appt = await patient.createAppointment(PATIENT, { startsAt, doctorId: OTHER_DOCTOR });
    createdAppointments.push(appt.id);
    const cancelled = await patient.cancelAppointment(PATIENT, appt.id);
    expect(cancelled.status).toBe('cancelled');
    const again = await patient.cancelAppointment(PATIENT, appt.id);
    expect(again.status).toBe('cancelled');
    const [[row]] = await pool.execute('SELECT id FROM nova_appointments WHERE id = ?', [appt.id]);
    expect(row).toBeTruthy();
    // Le médecin ne peut pas rouvrir un rendez-vous annulé.
    await expect(doctorSvc.updateDoctorAppointment(OTHER_DOCTOR, appt.id, { status: 'confirmed' })).rejects.toMatchObject({ status: 409 });
  });

  it('un patient ne peut pas agir sur le rendez-vous d’un autre patient', async () => {
    const startsAt = new Date(Date.now() + 43 * 86400000).toISOString().slice(0, 13) + ':00:00.000Z';
    const appt = await patient.createAppointment(PATIENT, { startsAt, doctorId: OTHER_DOCTOR });
    createdAppointments.push(appt.id);
    expect(await patient.cancelAppointment('patient-inexistant', appt.id)).toBeNull();
  });

  it('exige le QR de l’ordonnance côté pharmacie', () => {
    const qr = jwt.sign({ type: 'prescription', prescriptionId: 'presc-1' }, process.env.JWT_SECRET);
    expect(() => pharmacy.assertQrMatches(qr, 'presc-1')).not.toThrow();
    expect(() => pharmacy.assertQrMatches(qr, 'presc-2')).toThrow(/ne correspond pas/);
    expect(() => pharmacy.assertQrMatches('', 'presc-1')).toThrow(/invalide/);
  });
});
