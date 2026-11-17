import './isolated-db.js';
// Fermeture du compte patient : mot de passe exigé, sessions fermées, accès retirés, dossier conservé.
import 'dotenv/config';
import { CONSENT_TERMS_VERSION } from '../services/consent-terms.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import bcrypt from 'bcrypt';

const ACK = { acknowledged: true, termsVersion: CONSENT_TERMS_VERSION };
const db = await import('../db/database.js');
await db.initDb();
const doctorSvc = await import('../services/doctor.service.js');
const patientSvc = await import('../services/patient.service.js');
const emergency = await import('../services/emergency.service.js');
const { closeOwnPatientAccount, setPatientAccountActive } = await import('../services/account-closure.service.js');
const { getDoctorAccessDetails } = await import('../services/access.js');
const { resolveAccessToken, signAccessToken } = await import('../middleware/auth.js');

const D1 = 'doc-005';
let pool, A, userA;

beforeAll(async () => {
  pool = db.pool;
  const c = await doctorSvc.createPatientByDoctor(D1, { firstName: 'Patiente', lastName: 'Fermeture', phone: `05${String(Date.now()).slice(-8)}` });
  A = c.patientId; userA = c.userId;
  await pool.execute('UPDATE nova_users SET must_change_password = 0, password_hash = ? WHERE id = ?', [await bcrypt.hash('MotDePasseFictif1', 4), userA]);
  await patientSvc.grantDoctorAccess(A, D1, ACK);
  await emergency.getOrCreateEmergencyToken(A);
});

afterAll(async () => {
  for (const t of ['nova_consents', 'nova_emergency_links', 'nova_notifications', 'nova_medical_profile', 'nova_appointments', 'nova_access_logs'])
    await pool.query(`DELETE FROM ${t} WHERE patient_id = ?`, [A]).catch(() => {});
  await pool.query('DELETE FROM nova_users WHERE id = ?', [userA]);
  await pool.query('DELETE FROM nova_patients WHERE id = ?', [A]);
  await pool.end();
});

describe('Fermeture du compte patient', () => {
  it('exige le mot de passe actuel', async () => {
    await expect(closeOwnPatientAccount(userA, A, 'mauvais')).rejects.toMatchObject({ status: 400, code: 'wrong_password' });
  });

  it('ferme le compte : session refusée, accès médecin retiré, QR supprimé, dossier conservé', async () => {
    const before = signAccessToken({ id: userA, role: 'patient', patientId: A, sessionVersion: 0 });
    expect(await getDoctorAccessDetails(D1, A)).not.toBeNull();
    await closeOwnPatientAccount(userA, A, 'MotDePasseFictif1');
    expect((await resolveAccessToken(before)).error).toBe('token_revoked');
    expect(await getDoctorAccessDetails(D1, A)).toBeNull();
    const [[link]] = await pool.execute('SELECT COUNT(*) n FROM nova_emergency_links WHERE patient_id = ?', [A]);
    expect(Number(link.n)).toBe(0);
    const [[p]] = await pool.execute('SELECT id FROM nova_patients WHERE id = ?', [A]);
    expect(p.id).toBe(A);
  });

  it('un administrateur peut rouvrir le compte, sans rétablir les accès', async () => {
    expect(await setPatientAccountActive(A, true)).toEqual({ active: true });
    const [[u]] = await pool.execute('SELECT disabled_at FROM nova_users WHERE id = ?', [userA]);
    expect(u.disabled_at).toBeNull();
    expect(await getDoctorAccessDetails(D1, A)).toBeNull();
  });
});
