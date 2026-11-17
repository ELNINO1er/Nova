import './isolated-db.js';
/*
 * Messagerie : pièces jointes (éléments du dossier) et temps réel (Socket.IO), sur base isolée et données fictives.
 * Prouve que l'on ne peut joindre que des éléments du dossier du patient de la conversation, que seuls les
 * deux participants lisent une pièce jointe, et que les évènements temps réel ne vont qu'aux participants.
 */
import 'dotenv/config';
import { CONSENT_TERMS_VERSION } from '../services/consent-terms.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import express from 'express';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { io as ioClient } from 'socket.io-client';

const ACK = { acknowledged: true, termsVersion: CONSENT_TERMS_VERSION };
const UPLOADS = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-msg-uploads-'));
process.env.UPLOAD_DIR = UPLOADS;
const db = await import('../db/database.js');
await db.initDb();
const { signAccessToken } = await import('../middleware/auth.js');
const doctorSvc = await import('../services/doctor.service.js');
const patientSvc = await import('../services/patient.service.js');
const { startConversation } = await import('../services/messaging.service.js');
const { initRealtime, closeRealtime } = await import('../realtime.js');
const { errorHandler } = await import('../middleware/errors.js');

const D1 = 'doc-005', D2 = 'doc-006';
const users = []; const patients = []; const sockets = [];
let server; let base; let pool;
const tok = {};
let A, B, rxA, rxB, docA, convA;

async function addUser(role, extra = {}) {
  const id = randomUUID(); users.push(id);
  await pool.execute(
    "INSERT INTO nova_users (id, phone, code_hash, role, doctor_id, patient_id, name, must_change_password, created_at) VALUES (?, ?, 'x', ?, ?, ?, 'Compte fictif', 0, ?)",
    [id, `06${String(Date.now() + users.length).slice(-8)}`, role, extra.doctorId || null, extra.patientId || null, new Date().toISOString()]
  );
  return signAccessToken({ id, role, patientId: extra.patientId || null, doctorId: extra.doctorId || null, sessionVersion: 0 });
}
const call = async (who, method, url, body) => {
  const res = await fetch(`${base}${url}`, { method, headers: { Authorization: `Bearer ${tok[who]}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  return { status: res.status, text, json: (() => { try { return JSON.parse(text); } catch { return null; } })() };
};
// Connexion temps réel ; résout à la connexion ou rejette sur refus.
const connect = (token) => new Promise((resolve, reject) => {
  const s = ioClient(base, { path: '/socket.io', transports: ['websocket'], auth: token ? { token } : {}, reconnection: false });
  sockets.push(s);
  s.on('connect', () => resolve(s));
  s.on('connect_error', (err) => reject(err));
});
const collect = (socket, event) => { const got = []; socket.on(event, (p) => got.push(p)); return got; };
const settle = (ms = 300) => new Promise((r) => setTimeout(r, ms));

beforeAll(async () => {
  pool = db.pool;
  const app = express();
  app.use(express.json());
  app.use('/api/patient/me', (await import('../routes/patient.routes.js')).default);
  app.use('/api/doctor/me', (await import('../routes/doctor.routes.js')).default);
  app.use(errorHandler);
  server = http.createServer(app);
  initRealtime(server, { allowedOrigins: [] });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;

  await pool.execute('UPDATE nova_doctors SET is_available = 1 WHERE id IN (?, ?)', [D1, D2]);
  const ca = await doctorSvc.createPatientByDoctor(D1, { firstName: 'Patiente', lastName: 'Messagerie', phone: `05${String(Date.now()).slice(-8)}` });
  const cb = await doctorSvc.createPatientByDoctor(D2, { firstName: 'Patient', lastName: 'Voisin', phone: `04${String(Date.now()).slice(-8)}` });
  A = ca.patientId; B = cb.patientId; patients.push(A, B); users.push(ca.userId, cb.userId);
  await pool.execute('UPDATE nova_users SET must_change_password = 0 WHERE id IN (?, ?)', [ca.userId, cb.userId]);
  tok.A = signAccessToken({ id: ca.userId, role: 'patient', patientId: A, sessionVersion: 0 });
  tok.B = signAccessToken({ id: cb.userId, role: 'patient', patientId: B, sessionVersion: 0 });
  tok.D1 = await addUser('doctor', { doctorId: D1 });
  tok.D2 = await addUser('doctor', { doctorId: D2 });

  await patientSvc.grantDoctorAccess(A, D1, ACK);
  await patientSvc.grantDoctorAccess(B, D2, ACK);
  rxA = (await doctorSvc.createDoctorPrescription(D1, { patientId: A, items: [{ name: 'Amlodipine 5 mg', quantityPrescribed: 30 }], validDays: 30 })).id;
  rxB = (await doctorSvc.createDoctorPrescription(D2, { patientId: B, items: [{ name: 'Paracétamol 1 g', quantityPrescribed: 10 }], validDays: 30 })).id;
  fs.mkdirSync(path.join(UPLOADS, A), { recursive: true });
  fs.writeFileSync(path.join(UPLOADS, A, 'bilan.pdf'), '%PDF-1.4 BILAN FICTIF');
  docA = (await patientSvc.createDocument(A, { title: 'Bilan fictif', category: 'lab', filePath: `${A}/bilan.pdf` })).id;
  convA = (await startConversation(D1, A)).id;
});

afterAll(async () => {
  for (const s of sockets) s.close();
  await closeRealtime();
  await new Promise((r) => server.close(() => r()));
  const list = patients.map(() => '?').join(',');
  await pool.query(`DELETE m FROM nova_messages m JOIN nova_conversations c ON c.id = m.conversation_id WHERE c.patient_id IN (${list})`, patients);
  await pool.query(`DELETE i FROM nova_prescription_items i JOIN nova_prescriptions p ON p.id = i.prescription_id WHERE p.patient_id IN (${list})`, patients).catch(() => {});
  for (const t of ['nova_prescriptions', 'nova_documents', 'nova_conversations', 'nova_consents', 'nova_medical_profile', 'nova_notifications', 'nova_medication_schedules'])
    await pool.query(`DELETE FROM ${t} WHERE patient_id IN (${list})`, patients).catch(() => {});
  await pool.query(`DELETE FROM nova_notifications WHERE user_id IN (${users.map(() => '?').join(',')})`, users).catch(() => {});
  await pool.query(`DELETE FROM nova_users WHERE id IN (${users.map(() => '?').join(',')})`, users);
  await pool.query(`DELETE FROM nova_patients WHERE id IN (${list})`, patients);
  fs.rmSync(UPLOADS, { recursive: true, force: true });
  await pool.end();
});

describe('Messagerie : pièces jointes', () => {
  it('le médecin voit le nom du patient dans sa liste de conversations', async () => {
    const res = await call('D1', 'GET', '/api/doctor/me/conversations');
    expect(res.json.find((c) => c.id === convA)?.patientName).toBe('Patiente Messagerie');
  });

  it('la patiente joint son ordonnance ; le médecin en lit le détail', async () => {
    const sent = await call('A', 'POST', `/api/patient/me/conversations/${convA}/messages`, { body: '', attachment: { type: 'prescription', id: rxA } });
    expect(sent.status).toBe(201);
    expect(sent.json.attachment).toMatchObject({ type: 'prescription', id: rxA, title: 'Ordonnance' });
    const conv = await call('D1', 'GET', `/api/doctor/me/conversations/${convA}`);
    const msg = conv.json.messages.find((m) => m.id === sent.json.id);
    expect(msg.attachment.title).toBe('Ordonnance');
    const detail = await call('D1', 'GET', `/api/doctor/me/conversations/${convA}/messages/${msg.id}/attachment`);
    expect(detail.status).toBe(200);
    expect(detail.json.items.map((i) => i.name)).toContain('Amlodipine 5 mg');
  });

  it('le médecin joint un document du dossier ; la patiente le télécharge', async () => {
    const sent = await call('D1', 'POST', `/api/doctor/me/conversations/${convA}/messages`, { body: 'Voici votre bilan', attachment: { type: 'document', id: docA } });
    expect(sent.status).toBe(201);
    const file = await call('A', 'GET', `/api/patient/me/conversations/${convA}/messages/${sent.json.id}/attachment/file`);
    expect(file.status).toBe(200);
    expect(file.text).toContain('BILAN FICTIF');
  });

  it('refuse un élément d’un autre dossier et un message vide', async () => {
    const other = await call('A', 'POST', `/api/patient/me/conversations/${convA}/messages`, { body: 'x', attachment: { type: 'prescription', id: rxB } });
    expect(other.status).toBe(422);
    const summary = await call('D1', 'POST', `/api/doctor/me/conversations/${convA}/messages`, { attachment: { type: 'medical_summary', id: B } });
    expect(summary.status).toBe(422);
    expect((await call('A', 'POST', `/api/patient/me/conversations/${convA}/messages`, { body: '   ' })).status).toBe(422);
    expect((await call('A', 'POST', `/api/patient/me/conversations/${convA}/messages`, { attachment: { type: 'note', id: 'x' } })).status).toBe(422);
  });

  it('seuls les participants lisent les pièces jointes et la liste des éléments joignables', async () => {
    const conv = await call('A', 'GET', `/api/patient/me/conversations/${convA}`);
    const withAtt = conv.json.messages.find((m) => m.attachment);
    expect((await call('B', 'GET', `/api/patient/me/conversations/${convA}/messages/${withAtt.id}/attachment`)).status).toBe(404);
    expect((await call('D2', 'GET', `/api/doctor/me/conversations/${convA}/messages/${withAtt.id}/attachment`)).status).toBe(404);
    expect((await call('D2', 'GET', `/api/doctor/me/conversations/${convA}/attachables`)).status).toBe(404);
    const own = await call('A', 'GET', `/api/patient/me/conversations/${convA}/attachables`);
    expect(own.json.prescription.map((p) => p.id)).toEqual([rxA]);
    expect(own.text).not.toContain(rxB);
  });

  it('après révocation, le médecin ne lit plus les pièces jointes', async () => {
    const conv = await call('A', 'GET', `/api/patient/me/conversations/${convA}`);
    const withAtt = conv.json.messages.find((m) => m.attachment);
    await patientSvc.revokeDoctorAccess(A, D1);
    try {
      expect((await call('D1', 'GET', `/api/doctor/me/conversations/${convA}/messages/${withAtt.id}/attachment`)).status).not.toBe(200);
    } finally {
      await patientSvc.grantDoctorAccess(A, D1, ACK);
    }
  });
});

describe('Messagerie : temps réel', () => {
  it('refuse une connexion sans session', async () => {
    await expect(connect(null)).rejects.toThrow();
    await expect(connect('jeton-invalide')).rejects.toThrow();
  });

  it('un message arrive en direct chez les deux participants, et chez eux seulement', async () => {
    const sD1 = await connect(tok.D1), sA = await connect(tok.A), sB = await connect(tok.B), sD2 = await connect(tok.D2);
    const gotD1 = collect(sD1, 'message:new'), gotA = collect(sA, 'message:new');
    const gotB = collect(sB, 'message:new'), gotD2 = collect(sD2, 'message:new');
    const notifD1 = collect(sD1, 'notification:new');
    const sent = await call('A', 'POST', `/api/patient/me/conversations/${convA}/messages`, { body: 'Bonjour docteur (temps réel)' });
    expect(sent.status).toBe(201);
    await settle(1400); // la notification part après la validation de la transaction
    expect(gotD1.map((e) => e.message.id)).toContain(sent.json.id);
    expect(gotA.map((e) => e.message.id)).toContain(sent.json.id);
    expect(gotB).toHaveLength(0);
    expect(gotD2).toHaveLength(0);
    expect(notifD1.length).toBeGreaterThan(0);
  });

  it('la lecture par le médecin est signalée à la patiente', async () => {
    const sA = await connect(tok.A);
    const reads = collect(sA, 'conversation:read');
    expect((await call('D1', 'PATCH', `/api/doctor/me/conversations/${convA}/read`)).status).toBe(200);
    await settle();
    expect(reads).toEqual([{ conversationId: convA, readerRole: 'doctor' }]);
  });
});
