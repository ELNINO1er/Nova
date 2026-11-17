import './isolated-db.js';
/*
 * Demandes d'accès au dossier (retour testeur) : une demande accordée ou refusée n'apparaît plus « En attente »,
 * quelle que soit la façon dont le patient répond, et les demandes déjà bloquées en base sont masquées.
 */
import 'dotenv/config';
import { CONSENT_TERMS_VERSION } from '../services/consent-terms.js';
const ACK = { acknowledged: true, termsVersion: CONSENT_TERMS_VERSION };
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';

const db = await import('../db/database.js');
await db.initDb();
const doctor = await import('../services/doctor.service.js');
const patient = await import('../services/patient.service.js');
const access = await import('../services/access.js');
const D = 'doc-005';
const created = [];
let seq = 0;
const statuses = async (p) => (await patient.getConsents(p)).map((c) => c.status).sort();
const newPatient = async () => {
  const c = await doctor.createPatientByDoctor(D, { firstName: 'Demande', lastName: `Fictive${seq}`, phone: `03${String(Date.now() + seq++).slice(-8)}` });
  created.push(c.patientId); return c.patientId;
};

beforeAll(() => {});
afterAll(async () => {
  const l = created.map(() => '?').join(',');
  for (const t of ['nova_consents', 'nova_medical_profile', 'nova_notifications']) await db.pool.query(`DELETE FROM ${t} WHERE patient_id IN (${l})`, created).catch(() => {});
  await db.pool.query(`DELETE FROM nova_users WHERE patient_id IN (${l})`, created);
  await db.pool.query(`DELETE FROM nova_patients WHERE id IN (${l})`, created);
  await db.pool.end();
});

describe('demandes d’accès au dossier', () => {
  it('accord donné depuis « Qui a accès » : la demande d’origine ne reste pas « En attente »', async () => {
    const p = await newPatient();
    expect(await statuses(p)).toEqual(['pending']);
    await patient.grantDoctorAccess(p, D, ACK);
    expect(await statuses(p)).toEqual(['granted']);
    expect(await access.hasDoctorPatientAccess(D, p)).toBe(true);
  });

  it('accord sur la demande : une seule entrée « Accordé », aucune demande restante', async () => {
    const p = await newPatient();
    const req = (await patient.getConsents(p))[0];
    await patient.grantConsent(p, req.id, ACK);
    expect(await statuses(p)).toEqual(['granted']);
  });

  it('deux demandes ouvertes du même médecin : un accord les clôt toutes', async () => {
    const p = await newPatient();
    await db.pool.execute("INSERT INTO nova_consents (id, patient_id, doctor_id, status, scope, requested_at) VALUES (?, ?, ?, 'pending', '[\"clinical_record\"]', NOW(3) + INTERVAL 1 SECOND)", [randomUUID(), p, D]);
    expect(await statuses(p)).toEqual(['pending', 'pending']);
    const first = (await patient.getConsents(p))[0];
    await patient.grantConsent(p, first.id, ACK);
    expect(await statuses(p)).toEqual(['granted']);
  });

  it('données déjà bloquées (demande restée ouverte après un accord) : masquées sans modification', async () => {
    const p = await newPatient();
    await patient.grantDoctorAccess(p, D, ACK);
    // Reproduit l'état produit par l'ancienne version : demande antérieure jamais close.
    await db.pool.execute("INSERT INTO nova_consents (id, patient_id, doctor_id, status, scope, requested_at) VALUES (?, ?, ?, 'pending', '[\"clinical_record\"]', NOW(3) - INTERVAL 1 HOUR)", [randomUUID(), p, D]);
    expect(await statuses(p)).toEqual(['granted']);
  });

  it('retrait de l’accès : la demande ouverte est close, et une nouvelle demande reste possible ensuite', async () => {
    const p = await newPatient();
    await patient.revokeDoctorAccess(p, D);
    expect(await statuses(p)).toEqual(['revoked']);
    expect(await access.hasDoctorPatientAccess(D, p)).toBe(false);
    await new Promise((r) => setTimeout(r, 20));
    await db.pool.execute("INSERT INTO nova_consents (id, patient_id, doctor_id, status, scope, requested_at) VALUES (?, ?, ?, 'pending', '[\"clinical_record\"]', NOW(3) + INTERVAL 2 SECOND)", [randomUUID(), p, D]);
    expect(await statuses(p)).toEqual(['pending', 'revoked']);
  });

  it('consentement éclairé : aucun accord sans acceptation des conditions en vigueur', async () => {
    const p = await newPatient();
    await expect(patient.grantDoctorAccess(p, D)).rejects.toMatchObject({ status: 422, code: 'consent_terms_required' });
    await expect(patient.grantDoctorAccess(p, D, { acknowledged: true, termsVersion: '2020-01-01' })).rejects.toMatchObject({ status: 422 });
    const req = (await patient.getConsents(p))[0];
    await expect(patient.grantConsent(p, req.id, null)).rejects.toMatchObject({ status: 422 });
    expect(await access.hasDoctorPatientAccess(D, p)).toBe(false);
    await patient.grantConsent(p, req.id, ACK);
    const [[row]] = await db.pool.execute("SELECT terms_version, acknowledged_at FROM nova_consents WHERE patient_id = ? AND status = 'granted'", [p]);
    expect(row.terms_version).toBe(CONSENT_TERMS_VERSION);
    expect(row.acknowledged_at).toBeTruthy();
  });

  it('accès accordé avant cette version : marqué « à confirmer », confirmation sans perte d’accès', async () => {
    const p = await newPatient();
    await patient.grantDoctorAccess(p, D, ACK);
    await db.pool.execute("UPDATE nova_consents SET terms_version = NULL, acknowledged_at = NULL WHERE patient_id = ? AND status = 'granted'", [p]);
    let member = (await patient.getCareTeam(p)).find((m) => m.doctorId === D);
    expect(member).toMatchObject({ hasAccess: true, needsConfirmation: true });
    const before = member.expiresAt;
    await patient.grantDoctorAccess(p, D, ACK);
    member = (await patient.getCareTeam(p)).find((m) => m.doctorId === D);
    expect(member).toMatchObject({ hasAccess: true, needsConfirmation: false, expiresAt: before });
  });
});
