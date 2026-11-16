import './isolated-db.js';
/*
 * Régressions de l'audit du 15/11/2026 (base MySQL isolée, données fictives supprimées à la fin) :
 * - un report de rendez-vous ne prolonge jamais l'accès au dossier (fenêtre comptée depuis le partage) ;
 * - un partage révoqué reste révoqué, même après report ou nouvelle réservation sans partage ;
 * - une réservation instantanée sans partage laisse le dossier privé (confirmation immédiate conservée) ;
 * - activation patient : code serveur, usage unique, expirant, invalidé après activation ;
 * - mots de passe publiés refusés.
 */
import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const db = await import('../db/database.js');
await db.initDb();

const DAY = 86400000;
const DOCTOR = 'doc-005';
const OTHER_DOCTOR = 'doc-006';
const createdPatients = [];
let seq = 0;

const futureHour = (days, hour = 9) => {
  const d = new Date(Date.now() + days * DAY);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
};
const uniquePhone = () => `05${String(Date.now() + seq++).slice(-8)}`;

describe('Accès au dossier et activation (régressions)', () => {
  let pool; let access; let patientSvc; let doctorSvc; let auth; let professional;

  async function newPatient() {
    const created = await doctorSvc.createPatientByDoctor(DOCTOR, { firstName: 'Test', lastName: `Fictif${seq}`, phone: uniquePhone() });
    createdPatients.push(created.patientId);
    return created;
  }
  const sharedAt = async (apptId) => {
    const [[row]] = await pool.execute('SELECT record_shared_at FROM nova_appointments WHERE id = ?', [apptId]);
    return new Date(row.record_shared_at).getTime();
  };

  beforeAll(async () => {
    pool = db.pool;
    access = await import('../services/access.js');
    patientSvc = await import('../services/patient.service.js');
    doctorSvc = await import('../services/doctor.service.js');
    auth = await import('../services/auth.service.js');
    professional = await import('../services/professional.service.js');
    await pool.execute('UPDATE nova_doctors SET is_available = 1 WHERE id IN (?, ?)', [DOCTOR, OTHER_DOCTOR]);
  });

  afterAll(async () => {
    if (createdPatients.length) {
      const list = createdPatients.map(() => '?').join(',');
      await pool.query(`DELETE FROM nova_doctor_slots WHERE patient_id IN (${list})`, createdPatients);
      for (const table of ['nova_appointments', 'nova_consents', 'nova_medical_profile', 'nova_notifications']) {
        await pool.query(`DELETE FROM ${table} WHERE patient_id IN (${list})`, createdPatients).catch(() => {});
      }
      const [users] = await pool.query(`SELECT id FROM nova_users WHERE patient_id IN (${list})`, createdPatients);
      if (users.length) await pool.query(`DELETE FROM nova_auth_challenges WHERE user_id IN (${users.map(() => '?').join(',')})`, users.map(u => u.id));
      await pool.query(`DELETE FROM nova_users WHERE patient_id IN (${list})`, createdPatients);
      await pool.query(`DELETE FROM nova_patients WHERE id IN (${list})`, createdPatients);
    }
    await pool.end();
  });

  it('un report ne prolonge pas l’accès : la fenêtre de 90 jours part de la date du partage', async () => {
    const { patientId } = await newPatient();
    const appt = await patientSvc.createAppointment(patientId, { startsAt: futureHour(10), doctorId: DOCTOR, shareRecord: true });
    await doctorSvc.updateDoctorAppointment(DOCTOR, appt.id, { status: 'confirmed' });
    expect(await access.hasDoctorPatientAccess(DOCTOR, patientId)).toBe(true);

    // Partage donné il y a 80 jours : encore valable 10 jours.
    await pool.execute('UPDATE nova_appointments SET record_shared_at = ? WHERE id = ?', [new Date(Date.now() - 80 * DAY), appt.id]);
    const before = await access.getDoctorAccessDetails(DOCTOR, patientId);
    expect(before.reason).toBe('care');
    const expected = (await sharedAt(appt.id)) + access.CARE_WINDOW_DAYS * DAY;
    expect(Math.abs(Date.parse(before.expiresAt) - expected)).toBeLessThan(2000);

    // Le médecin reporte le rendez-vous très loin : l'échéance d'accès ne bouge pas.
    await doctorSvc.updateDoctorAppointment(DOCTOR, appt.id, { startsAt: futureHour(300, 10) });
    const after = await access.getDoctorAccessDetails(DOCTOR, patientId);
    expect(after.expiresAt).toBe(before.expiresAt);

    // Fenêtre écoulée (partage vieux de 91 jours) : plus d'accès malgré un rendez-vous futur confirmé.
    await pool.execute('UPDATE nova_appointments SET record_shared_at = ? WHERE id = ?', [new Date(Date.now() - 91 * DAY), appt.id]);
    const [[row]] = await pool.execute('SELECT status, starts_at FROM nova_appointments WHERE id = ?', [appt.id]);
    expect(row.status).toBe('confirmed');
    expect(Date.parse(row.starts_at)).toBeGreaterThan(Date.now() + 200 * DAY);
    expect(await access.hasDoctorPatientAccess(DOCTOR, patientId)).toBe(false);
    expect(await access.getDoctorAccessDetails(DOCTOR, patientId)).toBeNull();
    const list = await doctorSvc.getDoctorPatients(DOCTOR);
    expect((Array.isArray(list) ? list : list.data || []).some(p => p.id === patientId)).toBe(false);
  });

  it('un partage révoqué reste révoqué après report, changement de lieu ou nouvelle réservation sans partage', async () => {
    const { patientId } = await newPatient();
    const appt = await patientSvc.createAppointment(patientId, { startsAt: futureHour(12), doctorId: DOCTOR, shareRecord: true });
    await doctorSvc.updateDoctorAppointment(DOCTOR, appt.id, { status: 'confirmed' });
    expect(await access.hasDoctorPatientAccess(DOCTOR, patientId)).toBe(true);

    await patientSvc.revokeDoctorAccess(patientId, DOCTOR);
    expect(await access.hasDoctorPatientAccess(DOCTOR, patientId)).toBe(false);

    await doctorSvc.updateDoctorAppointment(DOCTOR, appt.id, { startsAt: futureHour(40, 11) });
    await doctorSvc.updateDoctorAppointment(DOCTOR, appt.id, { location: 'Autre cabinet' });
    expect(await access.hasDoctorPatientAccess(DOCTOR, patientId)).toBe(false);

    const second = await patientSvc.createAppointment(patientId, { startsAt: futureHour(50, 14), doctorId: DOCTOR, shareRecord: false });
    await doctorSvc.updateDoctorAppointment(DOCTOR, second.id, { status: 'confirmed' });
    expect(await access.hasDoctorPatientAccess(DOCTOR, patientId)).toBe(false);

    // L'annulation ferme aussi un accès encore valide.
    const { patientId: other } = await newPatient();
    const shared = await patientSvc.createAppointment(other, { startsAt: futureHour(15, 15), doctorId: DOCTOR, shareRecord: true });
    await doctorSvc.updateDoctorAppointment(DOCTOR, shared.id, { status: 'confirmed' });
    expect(await access.hasDoctorPatientAccess(DOCTOR, other)).toBe(true);
    await patientSvc.updateAppointment(other, shared.id, { status: 'cancelled' });
    expect(await access.hasDoctorPatientAccess(DOCTOR, other)).toBe(false);
  });

  it('réservation instantanée : confirmée tout de suite, dossier privé sans partage, ouvert seulement avec partage', async () => {
    const { patientId } = await newPatient();
    const date = futureHour(20).slice(0, 10);
    const slotA = await professional.addProfessionalSlot(DOCTOR, { date, time: '08:00' });
    const privateAppt = await patientSvc.bookSlot(patientId, slotA.id, DOCTOR);
    expect(privateAppt).toBeTruthy();
    const [[a]] = await pool.execute('SELECT status, record_shared_at FROM nova_appointments WHERE patient_id = ? AND doctor_id = ?', [patientId, DOCTOR]);
    expect(a.status).toBe('confirmed');
    expect(a.record_shared_at).toBeNull();
    expect(await access.hasDoctorPatientAccess(DOCTOR, patientId)).toBe(false);

    const slotB = await professional.addProfessionalSlot(DOCTOR, { date, time: '08:30' });
    await patientSvc.bookSlot(patientId, slotB.id, DOCTOR, true);
    expect(await access.hasDoctorPatientAccess(DOCTOR, patientId)).toBe(true);
  });

  it('activation patient : code généré par le serveur, usage unique, ancien code et demandes concurrentes invalidés', async () => {
    const created = await newPatient();
    expect(created.provisionalPassword).toBeUndefined();
    expect(created.activation.channel).toBe('sheet');
    expect(created.activation.code).toMatch(/^[A-Za-z2-9]{10}\d{2}$/);
    expect(Date.parse(created.activation.expiresAt)).toBeGreaterThan(Date.now() + 71 * 3600_000);

    // Deux connexions avec le code (ex. médecin puis patient) : une seule activation possible.
    const first = await auth.startPhonePasswordLogin(created.phone, created.activation.code);
    const second = await auth.startPhonePasswordLogin(created.phone, created.activation.code);
    expect(first.nextAction).toBe('change_password');
    expect(second.nextAction).toBe('change_password');
    const done = await auth.changeInitialPassword(second.challengeId, 'MonSecret2026x');
    expect(done.user?.patientId).toBe(created.patientId);
    await expect(auth.changeInitialPassword(first.challengeId, 'AutreSecret2026y')).rejects.toBeTruthy();
    await expect(auth.changeInitialPassword(second.challengeId, 'AutreSecret2026y')).rejects.toBeTruthy();

    // Le code ne fonctionne plus ; le mot de passe choisi par le patient, si.
    expect((await auth.startPhonePasswordLogin(created.phone, created.activation.code)).error).toBe('invalid_credentials');
    expect((await auth.startPhonePasswordLogin(created.phone, 'MonSecret2026x')).user?.patientId).toBe(created.patientId);

    // Compte activé : aucun nouveau code possible.
    await expect(doctorSvc.renewPatientActivation(DOCTOR, created.patientId)).rejects.toMatchObject({ status: 409 });
  });

  it('activation patient : expiration, renouvellement réservé au médecin créateur, comptes anciens préservés', async () => {
    const created = await newPatient();
    await expect(doctorSvc.renewPatientActivation(OTHER_DOCTOR, created.patientId)).rejects.toMatchObject({ status: 409 });

    const renewed = await doctorSvc.renewPatientActivation(DOCTOR, created.patientId);
    expect(renewed.code).not.toBe(created.activation.code);
    expect((await auth.startPhonePasswordLogin(created.phone, created.activation.code)).error).toBe('invalid_credentials');

    await pool.execute("UPDATE nova_users SET activation_expires_at = ? WHERE patient_id = ? AND role = 'patient'", [new Date(Date.now() - 1000), created.patientId]);
    expect((await auth.startPhonePasswordLogin(created.phone, renewed.code)).error).toBe('activation_expired');
    const pending = await doctorSvc.listPendingActivations(DOCTOR);
    expect(pending.find(p => p.patientId === created.patientId)).toMatchObject({ expired: true });
    expect(JSON.stringify(pending)).not.toContain(renewed.code);

    // Compte provisoire créé avant cette version (sans échéance) : toujours activable.
    await pool.execute("UPDATE nova_users SET activation_expires_at = NULL WHERE patient_id = ? AND role = 'patient'", [created.patientId]);
    expect((await auth.startPhonePasswordLogin(created.phone, renewed.code)).nextAction).toBe('change_password');
  });

  it('refuse les mots de passe publiés (politique, et connexion hors développement/test)', async () => {
    const published = String(process.env.PUBLISHED_PASSWORDS || '').split('|').filter(Boolean);
    if (!published.length) return; // valeurs fournies par l'environnement, jamais écrites dans le dépôt
    const { isPublicPassword } = await import('../services/public-passwords.js');
    for (const value of published) {
      expect(isPublicPassword(value)).toBe(true);
      expect(auth.passwordPolicyError('admin', value)).toMatch(/publié/);
    }
    const bcrypt = (await import('bcrypt')).default;
    const created = await newPatient();
    await pool.execute("UPDATE nova_users SET password_hash = ?, must_change_password = 0 WHERE patient_id = ? AND role = 'patient'",
      [await bcrypt.hash(published[0], 10), created.patientId]);
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect((await auth.startPhonePasswordLogin(created.phone, published[0])).error).toBe('compromised_password');
    } finally {
      process.env.NODE_ENV = previous;
    }
  });
});
