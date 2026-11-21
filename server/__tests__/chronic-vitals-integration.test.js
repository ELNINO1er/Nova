import './isolated-db.js';
import express from 'express';
import { errorHandler } from '../middleware/errors.js';
vi.mock('../middleware/auth.js', async importOriginal => ({ ...await importOriginal(), requirePatient: (req, res, next) => next(), requireDoctor: (req, res, next) => next(), requirePermission: () => (req, res, next) => next() }));
import patientRoutes from '../routes/patient.routes.js';
import doctorRoutes from '../routes/doctor.routes.js';
import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { pool, initDb } from '../db/database.js';
import { migrate } from '../db/migrations.js';
import { setChronicFollowup, getChronicPatients, addVitalByDoctor } from '../services/doctor.service.js';
import { addVital, getVitals } from '../services/patient.service.js';
let server, base;
const patient = randomUUID(), doctorA = randomUUID(), doctorB = randomUUID();
beforeAll(async () => {
  await initDb();
  await pool.execute('INSERT INTO nova_patients (id, first_name, last_name, updated_at) VALUES (?, ?, ?, ?)', [patient, 'Fictif', 'Suivi-test', new Date().toISOString()]);
  await pool.execute('INSERT INTO nova_medical_profile (patient_id, allergies, chronic_diseases, family_history, surgical_history, updated_at) VALUES (?, ?, ?, ?, ?, ?)', [patient, '[]', '["HTA"]', '[]', '[]', new Date().toISOString()]);
  for (const doctor of [doctorA, doctorB]) await pool.execute("INSERT INTO nova_consents (id, patient_id, doctor_id, status, scope) VALUES (?, ?, ?, 'granted', ?)", [randomUUID(), patient, doctor, '["clinical_record"]']);
  const app = express(); app.use(express.json());
  app.use('/patient', (req, res, next) => { req.user = { id: patient, patientId: patient, role: 'patient' }; next(); }, patientRoutes);
  app.use('/doctor', (req, res, next) => { req.user = { id: doctorA, doctorId: doctorA, role: 'doctor' }; next(); }, doctorRoutes);
  app.use(errorHandler);
  await new Promise(resolve => { server = app.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  for (const table of ['nova_chronic_followups', 'nova_vitals', 'nova_consents', 'nova_medical_profile']) await pool.execute(`DELETE FROM ${table} WHERE patient_id = ?`, [patient]);
  await pool.execute('DELETE FROM nova_patients WHERE id = ?', [patient]);
});
describe('persistance réelle isolée', () => {
  it('rejoue les migrations et crée les tables additionnelles attendues', async () => {
    const conn = await pool.getConnection();
    try { await migrate(conn); await migrate(conn); } finally { conn.release(); }
    const [rows] = await pool.query('SHOW COLUMNS FROM nova_reliability_checks');
    expect(rows.map(r => r.Field)).toEqual(['id', 'kind', 'verified_at', 'reference', 'verified_by', 'created_at']);
    const [cancel] = await pool.query('SHOW COLUMNS FROM nova_prescription_cancellations');
    expect(cancel.map(r => r.Field)).toEqual(['prescription_id', 'doctor_id', 'reason', 'created_at']);
  });
  it('persiste chaque échéance sans changer le risque historique ni partager entre médecins', async () => {
    await setChronicFollowup(doctorA, patient, '2027-01-12');
    await setChronicFollowup(doctorB, patient, '2027-02-01');
    const a = (await getChronicPatients(doctorA)).find(p => p.id === patient);
    const b = (await getChronicPatients(doctorB)).find(p => p.id === patient);
    expect(a).toMatchObject({ nextFollowupDate: '2027-01-12', risk: 'high', followupStatus: 'scheduled' });
    expect(b.nextFollowupDate).toBe('2027-02-01');
    await setChronicFollowup(doctorA, patient, null);
    expect((await getChronicPatients(doctorA)).find(p => p.id === patient).followupStatus).toBe('unscheduled');
    expect((await getChronicPatients(doctorB)).find(p => p.id === patient).nextFollowupDate).toBe('2027-02-01');
  });
  it('refuse la modification sans accès au dossier', async () => {
    await expect(setChronicFollowup(randomUUID(), patient, '2027-01-01')).rejects.toMatchObject({ status: 403 });
  });
  it('conserve le contexte des mesures patient et médecin avec les libellés existants', async () => {
    const p = await addVital(patient, { type: 'blood_glucose', value: '1,26', context: { glucoseTiming: 'fasting' } });
    expect(p).toMatchObject({ label: 'Glycémie', unit: 'g/L', value: 1.26, context: { glucoseTiming: 'fasting' }, assessment: { level: 'watch' } });
    const d = await addVitalByDoctor(doctorA, patient, { type: 'blood_glucose', value: '0,95', context: { glucoseTiming: 'fasting' } });
    const list = await getVitals(patient, {});
    expect(list.find(v => v.id === d.id)).toMatchObject({ context: { glucoseTiming: 'fasting' }, sourceRole: 'doctor', assessment: { level: 'normal' } });
    const legacy = await addVital(patient, { type: 'blood_glucose', value: '1.10' });
    expect(legacy.assessment.level).toBe('unknown');
    expect(legacy.assessment.message).toContain('contexte');
  });
});

describe('contrats HTTP existants et additifs', () => {
  const post = (path, body, method = 'POST') => fetch(base + path, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  it('POST patient accepte et restitue le contexte glycémique', async () => {
    const response = await post('/patient/vitals', { type: 'blood_glucose', value: '1,26', context: { glucoseTiming: 'fasting' } });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ context: { glucoseTiming: 'fasting' }, assessment: { level: 'watch' } });
  });
  it('POST médecin conserve la saisie historique sans contexte', async () => {
    const response = await post(`/doctor/patients/${patient}/vitals`, { type: 'blood_pressure', value: '12/8' });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ value: '120/80', unit: 'mmHg', context: {} });
  });
  it('refuse un contexte inconnu dans les deux routes', async () => {
    for (const path of ['/patient/vitals', `/doctor/patients/${patient}/vitals`]) expect((await post(path, { type: 'blood_glucose', value: '1', context: { glucoseTiming: 'invalid' } })).status).toBe(422);
  });
  it('PATCH exige une date civile valide ou null explicite', async () => {
    for (const body of [{}, { nextFollowupDate: '2026-02-29' }]) expect((await post(`/doctor/patients/${patient}/chronic-followup`, body, 'PATCH')).status).toBe(422);
    expect((await post(`/doctor/patients/${patient}/chronic-followup`, { nextFollowupDate: null }, 'PATCH')).status).toBe(200);
  });
});
