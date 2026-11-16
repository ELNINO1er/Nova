import './isolated-db.js';
/*
 * /api/auth/refresh ne doit jamais garder une connexion MySQL en attendant une seconde (audit 15/11, priorité 4).
 * Pool volontairement réduit à 2 connexions : avec l'ancien code, 8 renouvellements simultanés figeaient l'API.
 * Vérifie aussi la rotation (un jeton ne sert qu'une fois, même en parallèle), la révocation et la libération
 * des connexions après une erreur.
 */
import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import express from 'express';
import { randomUUID } from 'node:crypto';

process.env.DB_POOL_SIZE = '2';
const db = await import('../db/database.js');
await db.initDb();
const { signRefreshToken } = await import('../middleware/auth.js');
const { default: authRoutes } = await import('../routes/auth.routes.js');

const USERS = Array.from({ length: 8 }, () => randomUUID());
let server; let base;

const refresh = (token) => fetch(`${base}/api/auth/refresh`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: token }),
});
const within = (promise, ms, label) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} : pas de réponse en ${ms} ms (pool bloqué)`)), ms)),
]);
const tokenFor = (id, sessionVersion = 0) => signRefreshToken({ id, role: 'patient', patientId: null, doctorId: null, pharmacyId: null, sessionVersion });

describe('POST /api/auth/refresh sous charge', () => {
  beforeAll(async () => {
    const now = new Date().toISOString();
    for (const [i, id] of USERS.entries()) {
      await db.pool.execute(
        "INSERT INTO nova_users (id, phone, code_hash, role, name, created_at) VALUES (?, ?, 'x', 'patient', 'Session fictive', ?)",
        [id, `06${String(Date.now() + i).slice(-8)}`, now]
      );
    }
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
    base = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
    await db.pool.query(`DELETE FROM nova_users WHERE id IN (${USERS.map(() => '?').join(',')})`, USERS);
    await db.pool.end();
  });

  it('8 renouvellements simultanés avec 2 connexions : tous répondent', async () => {
    const responses = await within(Promise.all(USERS.map((id) => refresh(tokenFor(id)))), 8000, 'renouvellements');
    expect(responses.map((r) => r.status)).toEqual(USERS.map(() => 200));
    for (const r of responses) expect(r.headers.get('set-cookie')).toContain('nova_refresh_token=');
  });

  it('un même jeton rejoué en parallèle ne renouvelle qu’une seule session', async () => {
    const token = tokenFor(USERS[0]);
    const statuses = (await within(Promise.all([refresh(token), refresh(token), refresh(token)]), 8000, 'rejeu')).map((r) => r.status).sort();
    expect(statuses).toEqual([200, 401, 401]);
  });

  it('une session révoquée ou un jeton invalide sont refusés et libèrent la connexion', async () => {
    await db.pool.execute('UPDATE nova_users SET session_version = session_version + 1 WHERE id = ?', [USERS[1]]);
    const revoked = await refresh(tokenFor(USERS[1], 0));
    expect(revoked.status).toBe(401);
    const invalid = await Promise.all(Array.from({ length: 6 }, () => refresh('jeton-invalide')));
    expect(invalid.map((r) => r.status)).toEqual(Array(6).fill(401));
    // Toutes les connexions sont rendues : le pool sert encore des requêtes.
    const again = await within(Promise.all(USERS.slice(2).map((id) => refresh(tokenFor(id)))), 8000, 'après erreurs');
    expect(again.every((r) => r.status === 200)).toBe(true);
    const [[row]] = await within(db.pool.query('SELECT 1 AS ok'), 3000, 'requête finale');
    expect(row.ok).toBe(1);
  });
});
