import './isolated-db.js';
/*
 * Règles métier d'accès (base MySQL réelle, données de démonstration) :
 * - une simple demande de rendez-vous n'ouvre pas le dossier ; la confirmation du médecin l'ouvre ;
 * - la réinitialisation d'un compte sensible exige un second administrateur.
 * Les données créées sont supprimées à la fin.
 */
import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { CONSENT_TERMS_VERSION as SHARE_TERMS } from '../services/consent-terms.js';
const SHARE_ACK = { acknowledged: true, termsVersion: SHARE_TERMS };

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
    const appt = await patient.createAppointment(PATIENT, { startsAt, doctorId: DOCTOR, shareRecord: true, ack: SHARE_ACK });
    createdAppointments.push(appt.id);
    expect(await access.hasDoctorPatientAccess(DOCTOR, PATIENT)).toBe(false);

    // Le médecin voit la demande, sans données médicales, et peut y répondre.
    const agenda = await doctorSvc.getDoctorAppointments(DOCTOR);
    const row = agenda.find((a) => a.id === appt.id);
    expect(row).toMatchObject({ status: 'requested', recordShared: false, bloodType: null, cmuNumber: null });

    await doctorSvc.updateDoctorAppointment(DOCTOR, appt.id, { status: 'confirmed' });
    expect(await access.hasDoctorPatientAccess(DOCTOR, PATIENT)).toBe(true);

    await patient.revokeDoctorAccess(PATIENT, DOCTOR);
    expect(await access.hasDoctorPatientAccess(DOCTOR, PATIENT)).toBe(false);

    const withoutShare = await patient.createAppointment(PATIENT, {
      startsAt: new Date(Date.parse(startsAt) + 86400000).toISOString(),
      doctorId: DOCTOR,
      shareRecord: false,
    });
    createdAppointments.push(withoutShare.id);
    await doctorSvc.updateDoctorAppointment(DOCTOR, withoutShare.id, { status: 'confirmed' });
    expect(await access.hasDoctorPatientAccess(DOCTOR, PATIENT)).toBe(false);
    expect((await doctorSvc.getDoctorAppointments(DOCTOR)).find(a => a.id === withoutShare.id))
      .toMatchObject({ status: 'confirmed', recordShared: false, bloodType: null });

    await patient.updateAppointment(PATIENT, appt.id, { status: 'cancelled' });
    expect(await access.hasDoctorPatientAccess(DOCTOR, PATIENT)).toBe(false);
  });

  it('permet au patient de réinitialiser son mot de passe avec un code à usage unique', async () => {
    const bcrypt = (await import('bcrypt')).default;
    const auth = await import('../services/auth.service.js');
    const id = randomUUID();
    const phone = `08${String(Date.now()).slice(-8)}`;
    const previousPassword = 'AncienTest2026!';
    await pool.execute(
      "INSERT INTO nova_users (id, phone, code_hash, password_hash, role, name, created_at) VALUES (?, ?, 'x', ?, 'patient', 'Patient fictif', NOW())",
      [id, phone, await bcrypt.hash(previousPassword, 10)]
    );
    try {
      await expect(auth.issuePatientRecoveryCode(id, 'incorrect')).rejects.toMatchObject({ status: 400 });
      const { code } = await auth.issuePatientRecoveryCode(id, previousPassword);
      await expect(auth.recoverPatientPassword(phone, code, 'NouveauTest2026!')).resolves.toEqual({ ok: true });
      await expect(auth.recoverPatientPassword(phone, code, 'AutreTest2026!')).rejects.toMatchObject({ code: 'invalid_recovery' });
      const [[user]] = await pool.execute('SELECT password_hash, patient_recovery_hash, session_version FROM nova_users WHERE id = ?', [id]);
      expect(await bcrypt.compare('NouveauTest2026!', user.password_hash)).toBe(true);
      expect(user.patient_recovery_hash).toBeNull();
      expect(Number(user.session_version)).toBe(1);
    } finally {
      await pool.execute('DELETE FROM nova_users WHERE id = ?', [id]);
    }
  });

  it('exige Authenticator pour la connexion administrateur', async () => {
    const bcrypt = (await import('bcrypt')).default;
    const auth = await import('../services/auth.service.js');
    const mfa = await import('../services/mfa.service.js');
    const id = randomUUID();
    const phone = `06${String(Date.now()).slice(-8)}`;
    const password = 'AdminFictif2026!';
    await pool.execute(
      "INSERT INTO nova_users (id, phone, code_hash, password_hash, role, name, created_at) VALUES (?, ?, 'x', ?, 'admin', 'Admin fictif', NOW())",
      [id, phone, await bcrypt.hash(password, 10)]
    );
    try {
      const provisional = await auth.startPhonePasswordLogin(phone, password);
      expect(provisional).toMatchObject({ nextAction: 'change_password', role: 'admin' });
      const newPassword = 'AdminFictifNouveau2026!';
      const setup = await auth.changeInitialPassword(provisional.challengeId, newPassword);
      expect(setup).toMatchObject({ nextAction: 'enroll_totp', role: 'admin' });
      expect(setup.user).toBeUndefined();
      const enrolled = await mfa.verifyTotpEnrollment(setup.challengeId, mfa.generateTotpCode(setup.secret));
      expect(enrolled.user).toMatchObject({ id, role: 'admin' });
      const login = await auth.startPhonePasswordLogin(phone, newPassword);
      expect(login).toMatchObject({ nextAction: 'verify_totp', role: 'admin' });
      expect(login.user).toBeUndefined();
    } finally {
      await pool.execute('DELETE FROM nova_auth_challenges WHERE user_id = ?', [id]);
      await pool.execute('DELETE FROM nova_users WHERE id = ?', [id]);
    }
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

  it('refuse le partage du dossier à la réservation sans acceptation des conditions', async () => {
    const startsAt = new Date(Date.now() + 9 * 86400000).toISOString();
    await expect(patient.createAppointment(PATIENT, { startsAt, doctorId: DOCTOR, shareRecord: true }))
      .rejects.toMatchObject({ status: 422, code: 'consent_terms_required' });
    await expect(patient.bookSlot(PATIENT, 'creneau-inexistant', DOCTOR, true))
      .rejects.toMatchObject({ status: 422, code: 'consent_terms_required' });
  });
});
