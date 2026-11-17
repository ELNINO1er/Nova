import './isolated-db.js';
// Espace médecin : journal d'accès dédoublonné, rendez-vous passés figés, documents sans chemin interne.
import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const db = await import('../db/database.js');
await db.initDb();
const { recordAccess } = await import('../middleware/audit.js');
const doctorSvc = await import('../services/doctor.service.js');

let pool, patientId, userId;
const DOCTOR = 'doc-005';
const req = { user: { id: 'test-doctor-user', role: 'doctor' } };

beforeAll(async () => {
  pool = db.pool;
  const c = await doctorSvc.createPatientByDoctor(DOCTOR, { firstName: 'Patient', lastName: 'Coherence', phone: `05${String(Date.now()).slice(-8)}` });
  patientId = c.patientId; userId = c.userId;
});

afterAll(async () => {
  for (const t of ['nova_access_logs', 'nova_appointments', 'nova_notifications', 'nova_medical_profile', 'nova_consents'])
    await pool.query(`DELETE FROM ${t} WHERE patient_id = ?`, [patientId]).catch(() => {});
  await pool.query('DELETE FROM nova_users WHERE id = ?', [userId]).catch(() => {});
  await pool.query('DELETE FROM nova_patients WHERE id = ?', [patientId]).catch(() => {});
});

describe('journal d’accès', () => {
  it('une même lecture répétée n’est inscrite qu’une fois sur la période', async () => {
    await recordAccess(req, [patientId, patientId], 'patient_directory');
    await recordAccess(req, [patientId], 'patient_directory');
    await recordAccess(req, [patientId], 'patient_photo');
    const [rows] = await pool.execute('SELECT data_accessed FROM nova_access_logs WHERE patient_id = ? AND accessor_id = ?', [patientId, req.user.id]);
    expect(rows.map((r) => r.data_accessed).sort()).toEqual(['patient_directory', 'patient_photo']);
  });
});

describe('rendez-vous', () => {
  it('un rendez-vous passé ne peut plus être confirmé ni annulé', async () => {
    const id = `appt-test-${Date.now()}`;
    await pool.execute(
      "INSERT INTO nova_appointments (id, patient_id, doctor_id, doctor_name, starts_at, status, specialty, location, mode) VALUES (?, ?, ?, 'Dr. Test', ?, 'requested', 'Médecine générale', 'Cabinet', 'in_person')",
      [id, patientId, DOCTOR, new Date(Date.now() - 86400000).toISOString()]
    );
    await expect(doctorSvc.updateDoctorAppointment(DOCTOR, id, { status: 'confirmed' })).rejects.toMatchObject({ status: 409 });
    await expect(doctorSvc.updateDoctorAppointment(DOCTOR, id, { status: 'cancelled' })).rejects.toMatchObject({ status: 409 });
  });
});

describe('documents du médecin', () => {
  it('indiquent la présence du fichier sans exposer son chemin', async () => {
    const docs = await doctorSvc.getDoctorDocuments(DOCTOR);
    for (const d of docs) {
      expect(d).not.toHaveProperty('filePath');
      expect(typeof d.hasFile).toBe('boolean');
    }
  });
});
