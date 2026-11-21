import './isolated-db.js';
// QR d'urgence : lien public secret, révocable, désactivable, journalisé (base isolée, données fictives).
import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import express from 'express';

const db = await import('../db/database.js');
await db.initDb();
const { signAccessToken } = await import('../middleware/auth.js');
const doctorSvc = await import('../services/doctor.service.js');
const patientSvc = await import('../services/patient.service.js');
const { errorHandler } = await import('../middleware/errors.js');

let server, base, pool, A, userA, tokA;
const call = async (method, url, { auth = true, body } = {}) => {
  const res = await fetch(`${base}${url}`, { method, headers: { ...(auth ? { Authorization: `Bearer ${tokA}` } : {}), 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  return { status: res.status, text, json: (() => { try { return JSON.parse(text); } catch { return null; } })() };
};
const tokenOf = (url) => url.split('/urgence/')[1];

beforeAll(async () => {
  pool = db.pool;
  const app = express();
  app.use(express.json());
  app.use('/api/patient/me', (await import('../routes/patient.routes.js')).default);
  app.use('/api/public', (await import('../routes/public.routes.js')).default);
  app.use(errorHandler);
  await new Promise((r) => { server = app.listen(0, '127.0.0.1', r); });
  base = `http://127.0.0.1:${server.address().port}`;
  const c = await doctorSvc.createPatientByDoctor('doc-005', { firstName: 'Patiente', lastName: 'Urgence', phone: `03${String(Date.now()).slice(-8)}` });
  A = c.patientId; userA = c.userId;
  await pool.execute('UPDATE nova_users SET must_change_password = 0 WHERE id = ?', [userA]);
  tokA = signAccessToken({ id: userA, role: 'patient', patientId: A, sessionVersion: 0 });
});

afterAll(async () => {
  await new Promise((r) => server.close(r));
  for (const t of ['nova_emergency_links', 'nova_access_logs', 'nova_notifications', 'nova_patient_settings', 'nova_medical_profile', 'nova_consents'])
    await pool.query(`DELETE FROM ${t} WHERE patient_id = ?`, [A]).catch(() => {});
  await pool.query('DELETE FROM nova_users WHERE id = ?', [userA]);
  await pool.query('DELETE FROM nova_patients WHERE id = ?', [A]);
  await pool.end();
});

describe('QR d’urgence', () => {
  it('le QR contient un lien vers la fiche publique (jeton secret, stable)', async () => {
    const first = await call('GET', '/api/patient/me/emergency-card/qr');
    expect(first.status).toBe(200);
    expect(first.json.url).toMatch(/\/urgence\/[A-Za-z0-9_-]{43}$/);
    expect(first.json.qr).toMatch(/^data:image\/png;base64,/);
    expect(tokenOf(first.json.url)).not.toContain(A);
    const again = await call('GET', '/api/patient/me/emergency-card/qr');
    expect(again.json.url).toBe(first.json.url);
  });

  it('la fiche publique s’ouvre sans compte, limitée aux informations vitales, et l’accès est journalisé', async () => {
    const { json } = await call('GET', '/api/patient/me/emergency-card/qr');
    const pub = await call('GET', `/api/public/emergency/${tokenOf(json.url)}`, { auth: false });
    expect(pub.status).toBe(200);
    expect(pub.json).toMatchObject({ firstName: 'Patiente', lastName: 'Urgence' });
    for (const hidden of ['id', 'phone', 'cmuNumber', 'birthDate', 'surgicalHistory']) expect(pub.json).not.toHaveProperty(hidden);
    const logs = await patientSvc.getAccessLogs(A);
    expect(logs.some((l) => l.accessorRole === 'emergency' && l.accessorName === 'Scan du QR d’urgence')).toBe(true);
  });

  it('un jeton invalide ou inconnu ne donne rien', async () => {
    expect((await call('GET', '/api/public/emergency/abc', { auth: false })).status).toBe(404);
    expect((await call('GET', `/api/public/emergency/${'x'.repeat(43)}`, { auth: false })).status).toBe(404);
  });

  it('changer de QR rend l’ancien lien inutilisable', async () => {
    const old = tokenOf((await call('GET', '/api/patient/me/emergency-card/qr')).json.url);
    expect((await call('POST', '/api/patient/me/emergency-card/qr/renew')).status).toBe(200);
    const fresh = tokenOf((await call('GET', '/api/patient/me/emergency-card/qr')).json.url);
    expect(fresh).not.toBe(old);
    expect((await call('GET', `/api/public/emergency/${old}`, { auth: false })).status).toBe(404);
    expect((await call('GET', `/api/public/emergency/${fresh}`, { auth: false })).status).toBe(200);
  });

  it('QR désactivé dans les paramètres : la fiche publique n’est plus accessible', async () => {
    const t = tokenOf((await call('GET', '/api/patient/me/emergency-card/qr')).json.url);
    await patientSvc.updateSettings(A, { privacy: { emergencyQr: false } });
    try {
      expect((await call('GET', `/api/public/emergency/${t}`, { auth: false })).status).toBe(404);
    } finally {
      await patientSvc.updateSettings(A, { privacy: { emergencyQr: true } });
    }
  });
});
