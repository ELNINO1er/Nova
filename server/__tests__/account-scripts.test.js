import './isolated-db.js';
/*
 * Scripts d'exploitation sur les comptes existants (base MySQL isolée) :
 * - disable-demo-accounts : cible exactement les comptes de démo du seed, ignore un identifiant réattribué,
 *   ne touche pas aux comptes légitimes ;
 * - patient-activations legacy : encadre les anciens comptes en attente sans toucher aux patients activés ;
 * - patient-activations pre-rollback : rend inutilisables les codes à échéance avant un retour arrière.
 * L'état des comptes de démo est rétabli à la fin.
 */
import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';

const db = await import('../db/database.js');
await db.initDb();

const DOCTOR = 'doc-005';
const createdPatients = [];
const createdUsers = [];
let seq = 0;
const uniquePhone = () => `04${String(Date.now() + seq++).slice(-8)}`;

describe('Scripts de traitement des comptes', () => {
  let pool; let demoScript; let activationScript; let doctorSvc; let auth; let snapshot;

  beforeAll(async () => {
    pool = db.pool;
    demoScript = await import('../scripts/disable-demo-accounts.js');
    activationScript = await import('../scripts/patient-activations.js');
    doctorSvc = await import('../services/doctor.service.js');
    auth = await import('../services/auth.service.js');
    const ids = Object.keys(demoScript.DEMO_ACCOUNTS);
    [snapshot] = await pool.query(
      `SELECT id, phone, password_hash, disabled_at, session_version, must_change_password FROM nova_users WHERE id IN (${ids.map(() => '?').join(',')})`, ids
    );
  });

  afterAll(async () => {
    for (const r of snapshot) {
      await pool.execute(
        'UPDATE nova_users SET phone = ?, password_hash = ?, disabled_at = ?, session_version = ?, must_change_password = ? WHERE id = ?',
        [r.phone, r.password_hash, r.disabled_at, r.session_version, r.must_change_password, r.id]
      );
    }
    if (createdUsers.length) await pool.query(`DELETE FROM nova_users WHERE id IN (${createdUsers.map(() => '?').join(',')})`, createdUsers);
    if (createdPatients.length) {
      const list = createdPatients.map(() => '?').join(',');
      const [users] = await pool.query(`SELECT id FROM nova_users WHERE patient_id IN (${list})`, createdPatients);
      if (users.length) await pool.query(`DELETE FROM nova_auth_challenges WHERE user_id IN (${users.map(() => '?').join(',')})`, users.map((u) => u.id));
      for (const t of ['nova_consents', 'nova_medical_profile', 'nova_notifications']) await pool.query(`DELETE FROM ${t} WHERE patient_id IN (${list})`, createdPatients).catch(() => {});
      await pool.query(`DELETE FROM nova_users WHERE patient_id IN (${list})`, createdPatients);
      await pool.query(`DELETE FROM nova_patients WHERE id IN (${list})`, createdPatients);
    }
    await pool.end();
  });

  async function staffUser(role, password) {
    const id = randomUUID();
    createdUsers.push(id);
    await pool.execute(
      "INSERT INTO nova_users (id, phone, code_hash, password_hash, must_change_password, role, name, created_at) VALUES (?, ?, 'x', ?, 0, ?, 'Compte légitime fictif', ?)",
      [id, uniquePhone(), await bcrypt.hash(password, 10), role, new Date().toISOString()]
    );
    return id;
  }

  it('désactivation des comptes de démo : cible exacte, identifiant réattribué ignoré, comptes légitimes intacts', async () => {
    const published = String(process.env.PUBLISHED_PASSWORDS || '').split('|').filter(Boolean);
    const legit = await staffUser('pharmacist', 'MotDePasseLegitime2026');
    const legitPublished = published.length ? await staffUser('patient', published[0]) : null;
    await pool.execute("UPDATE nova_users SET phone = ? WHERE id = 'user-002'", [uniquePhone()]); // identifiant réattribué
    const [[before]] = await pool.execute('SELECT password_hash, session_version FROM nova_users WHERE id = ?', [legit]);

    const plan = await demoScript.planDemoDisable({ published, scan: published.length > 0 });
    const expected = Object.keys(demoScript.DEMO_ACCOUNTS).filter((id) => id !== 'user-002' && snapshot.some((s) => s.id === id));
    expect(plan.demo.map((r) => r.id).sort()).toEqual(expected.sort());
    expect(plan.skipped.map((r) => r.id)).toEqual(['user-002']);
    expect(plan.compromised.map((r) => r.id)).not.toContain(legit);
    if (legitPublished) expect(plan.compromised.map((r) => r.id)).toContain(legitPublished);

    const done = await demoScript.applyDemoDisable(plan);
    expect(done.disabled).toBe(expected.length);
    const [rows] = await pool.query(`SELECT id, disabled_at, password_hash FROM nova_users WHERE id IN (${expected.map(() => '?').join(',')})`, expected);
    expect(rows.every((r) => r.disabled_at && r.password_hash === null)).toBe(true);
    const [[reassigned]] = await pool.execute("SELECT disabled_at FROM nova_users WHERE id = 'user-002'");
    expect(reassigned.disabled_at).toBeNull();
    const [[after]] = await pool.execute('SELECT password_hash, session_version, disabled_at FROM nova_users WHERE id = ?', [legit]);
    expect(after).toEqual({ ...before, disabled_at: null });
    if (legitPublished) {
      const [[kept]] = await pool.execute('SELECT password_hash, disabled_at FROM nova_users WHERE id = ?', [legitPublished]);
      expect(kept.password_hash).not.toBeNull(); // sans --include-compromised : seulement listé
    }
  });

  async function pendingPatient() {
    const created = await doctorSvc.createPatientByDoctor(DOCTOR, { firstName: 'Activation', lastName: `Fictive${seq}`, phone: uniquePhone() });
    createdPatients.push(created.patientId);
    return created;
  }

  it('anciens comptes en attente : échéance posée et médecin créateur retrouvé, patients activés intacts', async () => {
    // Compte « ancienne version » : mot de passe provisoire sans échéance ni médecin enregistré.
    const legacy = await pendingPatient();
    await pool.execute("UPDATE nova_users SET activation_expires_at = NULL, activation_doctor_id = NULL, activation_channel = NULL WHERE patient_id = ?", [legacy.patientId]);
    // Ancien compte sans trace du médecin créateur.
    const orphan = await pendingPatient();
    await pool.execute("UPDATE nova_users SET activation_expires_at = NULL, activation_doctor_id = NULL WHERE patient_id = ?", [orphan.patientId]);
    await pool.execute('DELETE FROM nova_consents WHERE patient_id = ?', [orphan.patientId]);
    // Patient déjà activé.
    const active = await pendingPatient();
    const login = await auth.startPhonePasswordLogin(active.phone, active.activation.code);
    await auth.changeInitialPassword(login.challengeId, 'PatientActif2026x');
    await pool.execute("UPDATE nova_users SET activation_expires_at = NULL, activation_doctor_id = NULL WHERE patient_id = ?", [active.patientId]);
    const [[activeBefore]] = await pool.execute("SELECT * FROM nova_users WHERE patient_id = ?", [active.patientId]);

    const plan = await activationScript.planLegacy();
    const ids = async (pid) => (await pool.execute("SELECT id FROM nova_users WHERE patient_id = ?", [pid]))[0][0].id;
    const [legacyId, orphanId, activeId] = [await ids(legacy.patientId), await ids(orphan.patientId), await ids(active.patientId)];
    expect(plan.withCreator.find((r) => r.id === legacyId)).toMatchObject({ creator: DOCTOR });
    expect(plan.withoutCreator.map((r) => r.id)).toContain(orphanId);
    expect([...plan.withCreator, ...plan.withoutCreator].map((r) => r.id)).not.toContain(activeId);

    await activationScript.applyLegacy(plan, 7);
    const [[l]] = await pool.execute("SELECT activation_expires_at, activation_doctor_id FROM nova_users WHERE patient_id = ?", [legacy.patientId]);
    expect(l.activation_doctor_id).toBe(DOCTOR);
    expect(Math.abs(new Date(l.activation_expires_at).getTime() - (Date.now() + 7 * 86400000))).toBeLessThan(60_000);
    // L'ancien mot de passe provisoire marche jusqu'à l'échéance, et le médecin peut en générer un nouveau.
    expect((await auth.startPhonePasswordLogin(legacy.phone, legacy.activation.code)).nextAction).toBe('change_password');
    expect((await doctorSvc.renewPatientActivation(DOCTOR, legacy.patientId)).code).toBeTruthy();
    const [[o]] = await pool.execute("SELECT activation_expires_at FROM nova_users WHERE patient_id = ?", [orphan.patientId]);
    expect(o.activation_expires_at).toBeNull();
    const [[activeAfter]] = await pool.execute("SELECT * FROM nova_users WHERE patient_id = ?", [active.patientId]);
    expect(activeAfter).toEqual(activeBefore);
  });

  it('avant retour arrière : codes à échéance neutralisés, patients activés intacts, reprise par « Nouveau code »', async () => {
    const expired = await pendingPatient();
    await pool.execute("UPDATE nova_users SET activation_expires_at = ? WHERE patient_id = ?", [new Date(Date.now() - 3600_000), expired.patientId]);
    const valid = await pendingPatient();
    const active = await pendingPatient();
    const login = await auth.startPhonePasswordLogin(active.phone, active.activation.code);
    await auth.changeInitialPassword(login.challengeId, 'PatientActif2026y');
    const [[activeBefore]] = await pool.execute("SELECT * FROM nova_users WHERE patient_id = ?", [active.patientId]);

    const userId = async (pid) => (await pool.execute("SELECT id FROM nova_users WHERE patient_id = ?", [pid]))[0][0].id;
    const strict = await activationScript.planPreRollback({ expiredOnly: true });
    expect(strict.map((r) => r.id)).toContain(await userId(expired.patientId));
    expect(strict.map((r) => r.id)).not.toContain(await userId(valid.patientId));

    const plan = await activationScript.planPreRollback();
    expect(plan.map((r) => r.id)).toEqual(expect.arrayContaining([await userId(expired.patientId), await userId(valid.patientId)]));
    expect(plan.map((r) => r.id)).not.toContain(await userId(active.patientId));
    await activationScript.applyPreRollback(plan);

    for (const p of [expired, valid]) {
      expect((await auth.startPhonePasswordLogin(p.phone, p.activation.code)).error).toBe('no_password');
    }
    const [[activeAfter]] = await pool.execute("SELECT * FROM nova_users WHERE patient_id = ?", [active.patientId]);
    expect(activeAfter).toEqual(activeBefore);
    expect((await auth.startPhonePasswordLogin(active.phone, 'PatientActif2026y')).user?.patientId).toBe(active.patientId);

    // Reprise après retour à cette version : le compte apparaît expiré et le médecin génère un nouveau code.
    const pending = await doctorSvc.listPendingActivations(DOCTOR);
    expect(pending.find((r) => r.patientId === valid.patientId)).toMatchObject({ expired: true });
    const renewed = await doctorSvc.renewPatientActivation(DOCTOR, valid.patientId);
    expect((await auth.startPhonePasswordLogin(valid.phone, renewed.code)).nextAction).toBe('change_password');
  });
});
