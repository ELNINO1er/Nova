import './isolated-db.js';
/*
 * Cloisonnement des données prouvé par de vraies requêtes HTTP (base isolée, comptes et données fictifs).
 * Les routeurs de production sont montés aux mêmes chemins que server/index.js ; chaque rôle tente
 * d'atteindre des données qui ne sont pas les siennes. Couvre : dossier, documents, ordonnances,
 * résultats, messagerie, notes, export, partage, révocation, réservation sans partage, pharmacie (QR),
 * autorités, administration, accès anonyme, absence de service statique des documents.
 */
import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import express from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const UPLOADS = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-access-uploads-'));
process.env.UPLOAD_DIR = UPLOADS;
const db = await import('../db/database.js');
await db.initDb();
const { signAccessToken } = await import('../middleware/auth.js');
const doctorSvc = await import('../services/doctor.service.js');
const patientSvc = await import('../services/patient.service.js');
const { errorHandler } = await import('../middleware/errors.js');

const D1 = 'doc-005', D2 = 'doc-006';
const users = []; const patients = [];
let server; let base; let pool;
const tok = {};
let A, B, rxA, qrA, rxB, docA, noteA, convA;

async function addUser(role, extra = {}) {
  const id = randomUUID(); users.push(id);
  await pool.execute(
    "INSERT INTO nova_users (id, phone, code_hash, role, doctor_id, pharmacy_id, patient_id, name, must_change_password, created_at) VALUES (?, ?, 'x', ?, ?, ?, ?, 'Compte fictif', 0, ?)",
    [id, `09${String(Date.now() + users.length).slice(-8)}`, role, extra.doctorId || null, extra.pharmacyId || null, extra.patientId || null, new Date().toISOString()]
  );
  return signAccessToken({ id, role, patientId: extra.patientId || null, doctorId: extra.doctorId || null, pharmacyId: extra.pharmacyId || null, sessionVersion: 0 });
}
const call = async (who, method, url, body, headers = {}) => {
  const res = await fetch(`${base}${url}`, { method, headers: { ...(who ? { Authorization: `Bearer ${tok[who]}` } : {}), 'Content-Type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  return { status: res.status, text, json: (() => { try { return JSON.parse(text); } catch { return null; } })() };
};

beforeAll(async () => {
  pool = db.pool;
  const app = express();
  app.use(express.json());
  app.use('/api/patient/me', (await import('../routes/patient.routes.js')).default);
  app.use('/api/doctor/me', (await import('../routes/doctor.routes.js')).default);
  app.use('/api/pharmacy/me', (await import('../routes/pharmacy.routes.js')).default);
  app.use('/api/admin/me', (await import('../routes/admin.routes.js')).default);
  app.use('/api/governor/me', (await import('../routes/governor.routes.js')).default);
  app.use(errorHandler);
  await new Promise((r) => { server = app.listen(0, '127.0.0.1', r); });
  base = `http://127.0.0.1:${server.address().port}`;

  await pool.execute('UPDATE nova_doctors SET is_available = 1 WHERE id IN (?, ?)', [D1, D2]);
  const ca = await doctorSvc.createPatientByDoctor(D1, { firstName: 'Patiente', lastName: 'Alpha', phone: `08${String(Date.now()).slice(-8)}` });
  const cb = await doctorSvc.createPatientByDoctor(D2, { firstName: 'Patient', lastName: 'Bravo', phone: `07${String(Date.now()).slice(-8)}` });
  A = ca.patientId; B = cb.patientId; patients.push(A, B); users.push(ca.userId, cb.userId);
  await pool.execute("UPDATE nova_users SET must_change_password = 0 WHERE id IN (?, ?)", [ca.userId, cb.userId]);
  tok.A = signAccessToken({ id: ca.userId, role: 'patient', patientId: A, sessionVersion: 0 });
  tok.B = signAccessToken({ id: cb.userId, role: 'patient', patientId: B, sessionVersion: 0 });
  tok.D1 = await addUser('doctor', { doctorId: D1 });
  tok.D2 = await addUser('doctor', { doctorId: D2 });
  tok.PH = await addUser('pharmacist', { pharmacyId: 'ph-001' });
  tok.GOV = await addUser('governor');
  tok.ADM = await addUser('admin');

  // Données de la patiente A : partage explicite avec D1 uniquement.
  await patientSvc.grantDoctorAccess(A, D1);
  rxA = (await doctorSvc.createDoctorPrescription(D1, { patientId: A, items: [{ name: 'Amlodipine 5 mg', quantityPrescribed: 30 }], validDays: 30 })).id;
  await patientSvc.grantDoctorAccess(B, D2);
  rxB = (await doctorSvc.createDoctorPrescription(D2, { patientId: B, items: [{ name: 'Paracétamol 1 g', quantityPrescribed: 10 }], validDays: 30 })).id;
  qrA = (await call('A', 'GET', `/api/patient/me/prescriptions/${rxA}/qr`)).json;
  fs.mkdirSync(path.join(UPLOADS, A), { recursive: true });
  fs.writeFileSync(path.join(UPLOADS, A, 'resultat-fictif.pdf'), '%PDF-1.4 DOCUMENT FICTIF ALPHA');
  docA = (await patientSvc.createDocument(A, { title: 'Résultat fictif', category: 'lab', filePath: `${A}/resultat-fictif.pdf` })).id;
  noteA = (await patientSvc.createNote(A, { title: 'Note privée Alpha', content: 'contenu privé' })).id;
  convA = (await (await import('../services/messaging.service.js')).startConversation(D1, A)).id;
});

afterAll(async () => {
  await new Promise((r) => server.close(r));
  const list = patients.map(() => '?').join(',');
  for (const t of ['nova_prescription_items']) await pool.query(`DELETE i FROM ${t} i JOIN nova_prescriptions p ON p.id = i.prescription_id WHERE p.patient_id IN (${list})`, patients).catch(() => {});
  for (const t of ['nova_prescriptions', 'nova_documents', 'nova_notes', 'nova_messages', 'nova_conversations', 'nova_consents', 'nova_medical_profile', 'nova_notifications', 'nova_appointments', 'nova_medication_schedules'])
    await pool.query(`DELETE FROM ${t} WHERE patient_id IN (${list})`, patients).catch(() => {});
  await pool.query(`DELETE FROM nova_users WHERE id IN (${users.map(() => '?').join(',')})`, users);
  await pool.query(`DELETE FROM nova_patients WHERE id IN (${list})`, patients);
  fs.rmSync(UPLOADS, { recursive: true, force: true });
  await pool.end();
});

describe('Cloisonnement HTTP par rôle', () => {
  it('sans session : aucune donnée, aucun document', async () => {
    for (const url of ['/api/patient/me/profile', `/api/patient/me/documents/${docA}/download`, '/api/patient/me/export/json', `/api/doctor/me/patients/${A}`, '/api/admin/me/users', '/api/governor/me/dashboard']) {
      expect((await call(null, 'GET', url)).status, url).toBe(401);
    }
  });

  it('la patiente A lit son document ; le patient B ne peut ni le lire ni le supprimer', async () => {
    const own = await call('A', 'GET', `/api/patient/me/documents/${docA}/download`);
    expect(own.status).toBe(200);
    expect(own.text).toContain('DOCUMENT FICTIF ALPHA');
    expect((await call('B', 'GET', `/api/patient/me/documents/${docA}/download`)).status).toBe(404);
    expect((await call('B', 'DELETE', `/api/patient/me/documents/${docA}`)).status).toBe(404);
    expect((await call('A', 'GET', `/api/patient/me/documents/${docA}/download`)).status).toBe(200);
  });

  it('B ne peut atteindre ni l’ordonnance, ni son QR, ni la messagerie, ni les notes de A', async () => {
    expect((await call('B', 'GET', `/api/patient/me/prescriptions/${rxA}`)).status).toBe(404);
    expect((await call('B', 'GET', `/api/patient/me/prescriptions/${rxA}/qr`)).status).toBe(404);
    expect((await call('B', 'GET', `/api/patient/me/conversations/${convA}`)).status).toBe(404);
    await call('B', 'PATCH', `/api/patient/me/notes/${noteA}`, { title: 'piratée' });
    await call('B', 'DELETE', `/api/patient/me/notes/${noteA}`);
    const [[note]] = await pool.execute('SELECT title FROM nova_notes WHERE id = ?', [noteA]);
    expect(note.title).toBe('Note privée Alpha');
  });

  it('l’export de B ne contient aucune donnée de A', async () => {
    const res = await call('B', 'GET', '/api/patient/me/export/json');
    expect(res.status).toBe(200);
    for (const marker of [A, rxA, docA, noteA, 'Alpha', 'Amlodipine']) expect(res.text).not.toContain(marker);
    expect(res.text).toContain('Bravo');
  });

  it('médecin autorisé : accès ; médecin non autorisé : aucun accès aux données de A', async () => {
    expect((await call('D1', 'GET', `/api/doctor/me/patients/${A}`)).status).toBe(200);
    expect((await call('D2', 'GET', `/api/doctor/me/patients/${A}`)).status).toBe(404);
    expect((await call('D2', 'GET', `/api/doctor/me/patients/${A}/photo`)).status).toBe(403);
    expect((await call('D2', 'GET', `/api/doctor/me/prescriptions/${rxA}`)).status).toBe(404);
    expect((await call('D2', 'POST', `/api/doctor/me/patients/${A}/vitals`, { type: 'bp', value: '12/8', unit: 'cmHg' })).status).not.toBe(201);
    expect((await call('D2', 'POST', '/api/doctor/me/prescriptions', { patientId: A, items: [{ name: 'X', quantityPrescribed: 1 }] })).status).toBe(403);
    expect((await call('D2', 'GET', `/api/doctor/me/conversations/${convA}`)).status).not.toBe(200);
    const list = await call('D2', 'GET', '/api/doctor/me/patients');
    expect(list.text).not.toContain(A);
  });

  it('révocation : le partage retiré ferme immédiatement l’accès du médecin', async () => {
    expect((await call('A', 'POST', `/api/patient/me/care-team/${D1}/revoke`)).status).toBe(200);
    expect((await call('D1', 'GET', `/api/doctor/me/patients/${A}`)).status).toBe(404);
    expect((await call('D1', 'POST', '/api/doctor/me/prescriptions', { patientId: A, items: [{ name: 'X', quantityPrescribed: 1 }] })).status).toBe(403);
    expect((await call('A', 'POST', `/api/patient/me/care-team/${D1}/grant`)).status).toBe(200);
    expect((await call('D1', 'GET', `/api/doctor/me/patients/${A}`)).status).toBe(200);
  });

  it('réservation confirmée sans partage : le dossier reste privé', async () => {
    const at = new Date(Date.now() + 20 * 86400000); at.setUTCHours(10, 0, 0, 0);
    const appt = await call('A', 'POST', '/api/patient/me/appointments', { doctorId: D2, startsAt: at.toISOString(), shareRecord: false });
    expect(appt.status).toBe(201);
    expect((await call('D2', 'PATCH', `/api/doctor/me/appointments/${appt.json.id}`, { status: 'confirmed' })).status).toBe(200);
    expect((await call('D2', 'GET', `/api/doctor/me/patients/${A}`)).status).toBe(404);
  });

  it('pharmacie : rien sans le QR de l’ordonnance, et un QR ne vaut que pour son ordonnance', async () => {
    expect((await call('PH', 'GET', `/api/pharmacy/me/prescription/${rxA}`)).status).toBe(422);
    expect((await call('PH', 'GET', `/api/pharmacy/me/prescription/${rxB}`, null, { 'x-prescription-qr': qrA.token || qrA.qrToken || '' })).status).toBe(422);
    const ok = await call('PH', 'POST', '/api/pharmacy/me/verify-prescription', { qrToken: qrA.token || qrA.qrToken });
    expect(ok.status).toBe(200);
    const bad = await call('PH', 'POST', '/api/pharmacy/me/dispense', { prescriptionId: rxB, requestKey: 'cle-test-0001', qrToken: qrA.token || qrA.qrToken, status: 'full', items: [] });
    expect(bad.status).toBe(422);
  });

  it('chaque rôle reste dans son espace (patient, médecin, pharmacien, autorité, administrateur)', async () => {
    const cases = [['A', '/api/doctor/me/patients'], ['A', '/api/admin/me/users'], ['A', '/api/governor/me/dashboard'], ['A', '/api/pharmacy/me/dispenses'],
      ['D1', '/api/admin/me/users'], ['D1', '/api/patient/me/profile'], ['PH', `/api/doctor/me/patients/${A}`], ['PH', '/api/patient/me/export/json'],
      ['GOV', '/api/admin/me/users'], ['GOV', `/api/doctor/me/patients/${A}`], ['GOV', '/api/patient/me/profile']];
    for (const [who, url] of cases) expect([401, 403], `${who} → ${url}`).toContain((await call(who, 'GET', url)).status);
    expect((await call('GOV', 'GET', '/api/governor/me/dashboard')).status).toBe(200);
    expect((await call('ADM', 'GET', '/api/admin/me/users')).status).toBe(200);
  });

  it('une date de naissance aberrante est refusée par l’API (profil patient et création par le médecin)', async () => {
    expect((await call('A', 'PATCH', '/api/patient/me/profile', { birthDate: '0008-05-12' })).status).toBe(422);
    expect((await call('A', 'PATCH', '/api/patient/me/profile', { birthDate: '2999-01-01' })).status).toBe(422);
    const ok = await call('A', 'PATCH', '/api/patient/me/profile', { birthDate: '1991-03-14' });
    expect(ok.status).toBe(200);
    expect((await call('D1', 'POST', '/api/doctor/me/patients', { firstName: 'Date', lastName: 'Fausse', phone: '0102030499', birthDate: '0008-05-12' })).status).toBe(422);
  });

  it('les autorités ne reçoivent aucun nom ni identifiant de patient', async () => {
    const res = await call('GOV', 'GET', '/api/governor/me/dashboard');
    for (const marker of [A, B, 'Alpha', 'Bravo']) expect(res.text).not.toContain(marker);
  });

  it('les documents ne sont pas servis statiquement et restent hors du dossier public', async () => {
    const index = fs.readFileSync(new URL('../index.js', import.meta.url), 'utf8');
    expect(index).not.toMatch(/static\([^)]*upload/i);
    const { uploadDir } = await import('../middleware/upload.js');
    const dist = path.resolve(new URL('../../dist', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
    expect(path.resolve(uploadDir).startsWith(dist)).toBe(false);
    expect(path.resolve(uploadDir)).toBe(path.resolve(UPLOADS));
  });
});
