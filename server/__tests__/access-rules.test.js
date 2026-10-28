/*
 * Règles métier d'accès (base MySQL réelle, données de démonstration) :
 * - une simple demande de rendez-vous n'ouvre pas le dossier ; la confirmation du médecin l'ouvre ;
 * - la réinitialisation d'un compte sensible exige un second administrateur.
 * Les données créées sont supprimées à la fin.
 */
import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';

const db = await import('../db/database.js');
await db.initDb();

describe('Règles d’accès', () => {
  let pool; let access; let patient; let doctorSvc; let admin;
  const PATIENT = 'patient-demo';
  const DOCTOR = 'doc-003';
  const ADMIN_A = randomUUID();
  const ADMIN_B = randomUUID();
  const TARGET = randomUUID();
  const createdAppointments = [];
  const startedAt = new Date(Date.now() - 1000);

  beforeAll(async () => {
    pool = db.pool;
    access = await import('../services/access.js');
    patient = await import('../services/patient.service.js');
    doctorSvc = await import('../services/doctor.service.js');
    admin = await import('../services/admin.service.js');
    // Point de départ connu : aucun accord explicite ni rendez-vous confirmé avec ce médecin.
    await patient.revokeDoctorAccess(PATIENT, DOCTOR);
    const now = new Date().toISOString();
    await pool.execute(
      `INSERT INTO nova_users (id, phone, code_hash, password_hash, must_change_password, role, name, avatar, created_at, updated_at)
       VALUES (?, ?, 'x', 'x', 0, 'governor', 'Compte test réinitialisation', 'CT', ?, ?)`,
      [TARGET, `09${String(Date.now()).slice(-8)}`, now, now]
    );
  });

  afterAll(async () => {
    if (createdAppointments.length) {
      await pool.query(`DELETE FROM nova_appointments WHERE id IN (${createdAppointments.map(() => '?').join(',')})`, createdAppointments);
    }
    await pool.execute('DELETE FROM nova_consents WHERE patient_id = ? AND doctor_id = ? AND requested_at >= ?', [PATIENT, DOCTOR, startedAt]);
    await pool.execute('DELETE FROM nova_reset_requests WHERE target_user_id = ?', [TARGET]);
    await pool.execute('DELETE FROM nova_users WHERE id = ?', [TARGET]);
    await pool.end();
  });

  it('une demande de rendez-vous n’ouvre pas le dossier ; la confirmation du médecin l’ouvre', async () => {
    const startsAt = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 13) + ':00:00.000Z';
    const appt = await patient.createAppointment(PATIENT, { startsAt, doctorId: DOCTOR, shareRecord: true });
    createdAppointments.push(appt.id);
    expect(await access.hasDoctorPatientAccess(DOCTOR, PATIENT)).toBe(false);

    // Le médecin voit la demande, sans données médicales, et peut y répondre.
    const agenda = await doctorSvc.getDoctorAppointments(DOCTOR);
    const row = agenda.find((a) => a.id === appt.id);
    expect(row).toMatchObject({ status: 'requested', recordShared: false, bloodType: null, cmuNumber: null });

    await doctorSvc.updateDoctorAppointment(DOCTOR, appt.id, { status: 'confirmed' });
    expect(await access.hasDoctorPatientAccess(DOCTOR, PATIENT)).toBe(true);

    await patient.updateAppointment(PATIENT, appt.id, { status: 'cancelled' });
    expect(await access.hasDoctorPatientAccess(DOCTOR, PATIENT)).toBe(false);
  });

  it('la réinitialisation d’un compte sensible attend un second administrateur', async () => {
    const pending = await admin.resetUserPassword(TARGET, ADMIN_A);
    expect(pending).toMatchObject({ pending: true });
    expect(pending.provisionalPassword).toBeUndefined();

    await expect(admin.resetUserPassword(TARGET, ADMIN_B)).rejects.toMatchObject({ status: 409 });
    await expect(admin.decideResetRequest(pending.requestId, ADMIN_A, true)).rejects.toMatchObject({ status: 403 });

    const done = await admin.decideResetRequest(pending.requestId, ADMIN_B, true);
    expect(done.provisionalPassword).toMatch(/.{12,}/);
    expect(await admin.decideResetRequest(pending.requestId, ADMIN_B, true)).toBeNull();
  });
});
