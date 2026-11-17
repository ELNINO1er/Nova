import './isolated-db.js';
// Circuit ordonnance : patient → pharmacie → délivrance → médecin (base isolée, données fictives).
import 'dotenv/config';
import { CONSENT_TERMS_VERSION } from '../services/consent-terms.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import express from 'express';
import { randomUUID } from 'node:crypto';

const ACK = { acknowledged: true, termsVersion: CONSENT_TERMS_VERSION };
const db = await import('../db/database.js');
await db.initDb();
const { signAccessToken } = await import('../middleware/auth.js');
const doctorSvc = await import('../services/doctor.service.js');
const patientSvc = await import('../services/patient.service.js');
const { errorHandler } = await import('../middleware/errors.js');

const D1 = 'doc-005';
let server, base, pool, A, B, rxA, rxB, PH1, PH2;
const users = [], pharmacies = [], tok = {};
const call = async (who, method, url, body) => {
  const res = await fetch(`${base}${url}`, { method, headers: { Authorization: `Bearer ${tok[who]}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  return { status: res.status, text, json: (() => { try { return JSON.parse(text); } catch { return null; } })() };
};
async function addPharmacist(pharmacyId) {
  const id = randomUUID(); users.push(id);
  await pool.execute("INSERT INTO nova_users (id, phone, code_hash, role, pharmacy_id, name, must_change_password, created_at) VALUES (?, ?, 'x', 'pharmacist', ?, 'Pharmacien fictif', 0, ?)",
    [id, `02${String(Date.now() + users.length).slice(-8)}`, pharmacyId, new Date().toISOString()]);
  return signAccessToken({ id, role: 'pharmacist', pharmacyId, sessionVersion: 0 });
}

beforeAll(async () => {
  pool = db.pool;
  const app = express();
  app.use(express.json());
  app.use('/api/patient/me', (await import('../routes/patient.routes.js')).default);
  app.use('/api/pharmacy/me', (await import('../routes/pharmacy.routes.js')).default);
  app.use('/api/doctor/me', (await import('../routes/doctor.routes.js')).default);
  app.use(errorHandler);
  await new Promise((r) => { server = app.listen(0, '127.0.0.1', r); });
  base = `http://127.0.0.1:${server.address().port}`;

  for (const name of ['Pharmacie fictive Une', 'Pharmacie fictive Deux']) {
    const id = randomUUID(); pharmacies.push(id);
    await pool.execute('INSERT INTO nova_pharmacies (id, name, address, city, phone, is_open) VALUES (?, ?, ?, ?, ?, 1)', [id, name, 'Rue fictive', 'Abidjan', '0700000000']);
  }
  [PH1, PH2] = pharmacies;
  tok.PH1 = await addPharmacist(PH1);
  tok.PH2 = await addPharmacist(PH2);

  await pool.execute('UPDATE nova_doctors SET is_available = 1 WHERE id = ?', [D1]);
  const [[docUser]] = await pool.execute('SELECT id FROM nova_users WHERE doctor_id = ? LIMIT 1', [D1]);
  if (!docUser) {
    const id = randomUUID(); users.push(id);
    await pool.execute("INSERT INTO nova_users (id, phone, code_hash, role, doctor_id, name, must_change_password, created_at) VALUES (?, ?, 'x', 'doctor', ?, 'Médecin fictif', 0, ?)",
      [id, `08${String(Date.now() + 99).slice(-8)}`, D1, new Date().toISOString()]);
  }
  const ca = await doctorSvc.createPatientByDoctor(D1, { firstName: 'Patiente', lastName: 'Officine', phone: `01${String(Date.now()).slice(-8)}` });
  const cb = await doctorSvc.createPatientByDoctor(D1, { firstName: 'Patient', lastName: 'Autre', phone: `09${String(Date.now() + 7).slice(-8)}` });
  A = ca.patientId; B = cb.patientId; users.push(ca.userId, cb.userId);
  await pool.execute('UPDATE nova_users SET must_change_password = 0 WHERE id IN (?, ?)', [ca.userId, cb.userId]);
  tok.A = signAccessToken({ id: ca.userId, role: 'patient', patientId: A, sessionVersion: 0 });
  tok.B = signAccessToken({ id: cb.userId, role: 'patient', patientId: B, sessionVersion: 0 });
  await patientSvc.grantDoctorAccess(A, D1, ACK);
  await patientSvc.grantDoctorAccess(B, D1, ACK);
  rxA = (await doctorSvc.createDoctorPrescription(D1, { patientId: A, items: [{ name: 'Amoxicilline 500 mg', quantityPrescribed: 2 }], validDays: 30 })).id;
  rxB = (await doctorSvc.createDoctorPrescription(D1, { patientId: B, items: [{ name: 'Paracétamol 1 g', quantityPrescribed: 1 }], validDays: 30 })).id;
});

afterAll(async () => {
  await new Promise((r) => server.close(r));
  const pts = [A, B];
  await pool.query('DELETE i FROM nova_dispense_items i JOIN nova_dispenses d ON d.id = i.dispense_id WHERE d.patient_id IN (?, ?)', pts).catch(() => {});
  await pool.query('DELETE FROM nova_dispense_requests WHERE pharmacy_id IN (?, ?)', pharmacies).catch(() => {});
  await pool.query('DELETE i FROM nova_prescription_items i JOIN nova_prescriptions p ON p.id = i.prescription_id WHERE p.patient_id IN (?, ?)', pts).catch(() => {});
  for (const t of ['nova_dispenses', 'nova_pharmacy_orders', 'nova_prescriptions', 'nova_consents', 'nova_notifications', 'nova_medication_schedules', 'nova_medical_profile', 'nova_access_logs'])
    await pool.query(`DELETE FROM ${t} WHERE patient_id IN (?, ?)`, pts).catch(() => {});
  await pool.query(`DELETE FROM nova_notifications WHERE user_id IN (${users.map(() => '?').join(',')})`, users).catch(() => {});
  await pool.query(`DELETE FROM nova_users WHERE id IN (${users.map(() => '?').join(',')})`, users);
  await pool.query('DELETE FROM nova_patients WHERE id IN (?, ?)', pts);
  await pool.query('DELETE FROM nova_pharmacies WHERE id IN (?, ?)', pharmacies);
  await pool.end();
});

describe('Commandes d’ordonnance en pharmacie', () => {
  let orderId;

  it('le patient envoie son ordonnance active à une pharmacie', async () => {
    const r = await call('A', 'POST', '/api/patient/me/pharmacy-orders', { pharmacyId: PH1, prescriptionId: rxA, notes: 'Je passe après 17 h' });
    expect(r.status).toBe(201);
    expect(r.json).toMatchObject({ status: 'pending', pharmacyName: 'Pharmacie fictive Une', prescriptionId: rxA });
    orderId = r.json.id;
  });

  it('refuse l’ordonnance d’un autre patient, sans ordonnance, et un second envoi de la même', async () => {
    expect((await call('A', 'POST', '/api/patient/me/pharmacy-orders', { pharmacyId: PH1, prescriptionId: rxB })).status).toBe(404);
    expect((await call('A', 'POST', '/api/patient/me/pharmacy-orders', { pharmacyId: PH1 })).status).toBe(422);
    const dup = await call('A', 'POST', '/api/patient/me/pharmacy-orders', { pharmacyId: PH2, prescriptionId: rxA });
    expect(dup.status).toBe(409);
    expect(dup.json.message).toContain('Pharmacie fictive Une');
  });

  it('seule la pharmacie choisie voit la commande et l’ordonnance', async () => {
    const mine = await call('PH1', 'GET', '/api/pharmacy/me/orders');
    const o = mine.json.find((x) => x.id === orderId);
    expect(o.prescription.items[0]).toMatchObject({ name: 'Amoxicilline 500 mg', remaining: 2 });
    expect(o.patientName).toBe('Patiente O.');
    const other = await call('PH2', 'GET', '/api/pharmacy/me/orders');
    expect(other.text).not.toContain(orderId);
    expect(other.text).not.toContain('Amoxicilline');
    expect((await call('PH2', 'PATCH', `/api/pharmacy/me/orders/${orderId}`, { status: 'ready' })).status).toBe(404);
  });

  it('« indisponible » exige un message ; « prête » prévient le patient', async () => {
    expect((await call('PH1', 'PATCH', `/api/pharmacy/me/orders/${orderId}`, { status: 'unavailable' })).status).toBe(422);
    expect((await call('PH1', 'PATCH', `/api/pharmacy/me/orders/${orderId}`, { status: 'ready', message: 'Générique disponible' })).status).toBe(200);
    const orders = await call('A', 'GET', '/api/patient/me/pharmacy-orders');
    expect(orders.json.find((x) => x.id === orderId)).toMatchObject({ status: 'ready', pharmacistMessage: 'Générique disponible' });
    const [[n]] = await pool.execute("SELECT title FROM nova_notifications WHERE patient_id = ? AND type = 'pharmacy' ORDER BY created_at DESC LIMIT 1", [A]);
    expect(n.title).toBe('Ordonnance prête à retirer');
  });

  it('la délivrance au comptoir (QR) clôt la commande et prévient le médecin', async () => {
    const qr = await call('A', 'GET', `/api/patient/me/prescriptions/${rxA}/qr`);
    const rx = await call('PH1', 'POST', '/api/pharmacy/me/verify-prescription', { qrToken: qr.json.token });
    expect(rx.status).toBe(200);
    const detail = await fetch(`${base}/api/pharmacy/me/prescription/${rxA}`, { headers: { Authorization: `Bearer ${tok.PH1}`, 'X-Prescription-QR': qr.json.token } }).then((r) => r.json());
    const d = await call('PH1', 'POST', '/api/pharmacy/me/dispense', { prescriptionId: rxA, qrToken: qr.json.token, requestKey: randomUUID(), status: 'full',
      items: detail.items.map((i) => ({ prescriptionItemId: i.id, quantityDispensed: i.remaining })) });
    expect(d.status).toBe(201);
    const orders = await call('A', 'GET', '/api/patient/me/pharmacy-orders');
    expect(orders.json.find((x) => x.id === orderId).status).toBe('dispensed');
    const after = await call('PH1', 'GET', '/api/pharmacy/me/orders');
    expect(after.json.find((x) => x.id === orderId).prescription).toBeNull();
    const [[doc]] = await pool.execute("SELECT n.body FROM nova_notifications n JOIN nova_users u ON u.id = n.user_id WHERE u.doctor_id = ? AND n.type = 'dispense' ORDER BY n.created_at DESC LIMIT 1", [D1]);
    expect(doc.body).toContain('Pharmacie fictive Une');
    expect(doc.body).toContain('Patiente');
  });

  it('une ordonnance délivrée ne peut plus être envoyée ; le patient peut annuler une demande en cours', async () => {
    expect((await call('A', 'POST', '/api/patient/me/pharmacy-orders', { pharmacyId: PH2, prescriptionId: rxA })).status).toBe(409);
    const o = await call('B', 'POST', '/api/patient/me/pharmacy-orders', { pharmacyId: PH2, prescriptionId: rxB });
    expect(o.status).toBe(201);
    expect((await call('A', 'POST', `/api/patient/me/pharmacy-orders/${o.json.id}/cancel`)).status).toBe(404);
    expect((await call('B', 'POST', `/api/patient/me/pharmacy-orders/${o.json.id}/cancel`)).status).toBe(200);
    expect((await call('PH2', 'PATCH', `/api/pharmacy/me/orders/${o.json.id}`, { status: 'ready' })).status).toBe(409);
  });

  it('une demande « indisponible » est close quand le patient envoie ailleurs : l’ancienne pharmacie ne lit plus l’ordonnance', async () => {
    const rx = (await doctorSvc.createDoctorPrescription(D1, { patientId: A, items: [{ name: 'Ibuprofène 400 mg', quantityPrescribed: 1 }], validDays: 30 })).id;
    const first = await call('A', 'POST', '/api/patient/me/pharmacy-orders', { pharmacyId: PH1, prescriptionId: rx });
    expect((await call('PH1', 'PATCH', `/api/pharmacy/me/orders/${first.json.id}`, { status: 'unavailable', message: 'Rupture' })).status).toBe(200);
    expect((await call('A', 'POST', '/api/patient/me/pharmacy-orders', { pharmacyId: PH2, prescriptionId: rx })).status).toBe(201);
    const ph1 = await call('PH1', 'GET', '/api/pharmacy/me/orders');
    const old = ph1.json.find((o) => o.id === first.json.id);
    expect(old.status).toBe('cancelled');
    expect(old.prescription).toBeNull();
  });
});
