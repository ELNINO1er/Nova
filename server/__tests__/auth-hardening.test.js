import './isolated-db.js';
/*
 * Durcissement de la connexion (base isolée, comptes fictifs) : double authentification, codes de récupération,
 * blocages par compte, rejeu, rattachements lus en base, rejeu de jeton de renouvellement, inactivité.
 */
import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';

const db = await import('../db/database.js');
await db.initDb();
const mfa = await import('../services/mfa.service.js');
const auth = await import('../services/auth.service.js');
const mw = await import('../middleware/auth.js');
const { default: authRoutes } = await import('../routes/auth.routes.js');
const { errorHandler } = await import('../middleware/errors.js');

const users = [];
let pool; let server; let base;
const phone = () => `06${String(Date.now() + users.length * 7).slice(-8)}`;

async function makeUser(role, password = 'MotDePasseFictif2026!', extra = {}) {
  const id = randomUUID(); users.push(id);
  const p = phone();
  await pool.execute(
    "INSERT INTO nova_users (id, phone, code_hash, password_hash, must_change_password, role, pharmacy_id, doctor_id, name, created_at) VALUES (?, ?, 'x', ?, 0, ?, ?, ?, 'Compte fictif', ?)",
    [id, p, await bcrypt.hash(password, 10), role, extra.pharmacyId || null, extra.doctorId || null, new Date().toISOString()]
  );
  return { id, phone: p, password };
}

async function enrolledAdmin() {
  const u = await makeUser('admin');
  const [[row]] = await pool.execute('SELECT * FROM nova_users WHERE id = ?', [u.id]);
  const enr = await mfa.startTotpEnrollment(row);
  // Enrôlement validé avec le code de la fenêtre précédente, pour laisser le code courant utilisable.
  const prev = mfa.generateTotpCode(enr.secret, Date.now() - 30000);
  const done = await mfa.verifyTotpEnrollment(enr.challengeId, prev);
  return { ...u, secret: enr.secret, recovery: done.recoveryCodes };
}

beforeAll(async () => {
  pool = db.pool;
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.get('/whoami', mw.requirePermission('pharmacy.history'), (req, res) => res.json(req.user));
  app.use(errorHandler);
  await new Promise((r) => { server = app.listen(0, '127.0.0.1', r); });
  base = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise((r) => server.close(r));
  if (users.length) {
    const l = users.map(() => '?').join(',');
    await pool.query(`DELETE FROM nova_auth_challenges WHERE user_id IN (${l})`, users);
    await pool.query(`DELETE FROM nova_users WHERE id IN (${l})`, users);
  }
  await pool.end();
});

describe('Double authentification', () => {
  it('10 échecs du code, sur plusieurs connexions, bloquent le compte ; le bon code est alors refusé', async () => {
    const a = await enrolledAdmin();
    for (let i = 0; i < 10; i++) {
      const ch = await mfa.startTotpLogin(a.id);
      await expect(mfa.verifyTotpLogin(ch.challengeId, '000000')).rejects.toBeTruthy();
    }
    const [[u]] = await pool.execute('SELECT failed_mfa_attempts, locked_until FROM nova_users WHERE id = ?', [a.id]);
    expect(Number(u.failed_mfa_attempts)).toBe(10);
    expect(new Date(u.locked_until).getTime()).toBeGreaterThan(Date.now());
    const ch = await mfa.startTotpLogin(a.id);
    await expect(mfa.verifyTotpLogin(ch.challengeId, mfa.generateTotpCode(a.secret))).rejects.toMatchObject({ status: 423 });
    // Le mot de passe correct est lui aussi refusé pendant le blocage.
    expect((await auth.startPhonePasswordLogin(a.phone, a.password)).error).toBe('account_locked');
  });

  it('20 essais parallèles sur un challenge : au plus 5 sont évalués', async () => {
    const a = await enrolledAdmin();
    const ch = await mfa.startTotpLogin(a.id);
    const results = await Promise.allSettled(Array.from({ length: 20 }, () => mfa.verifyTotpLogin(ch.challengeId, '111111')));
    const [[c]] = await pool.execute('SELECT attempts, max_attempts FROM nova_auth_challenges WHERE id = ?', [ch.challengeId]);
    expect(Number(c.attempts)).toBeLessThanOrEqual(Number(c.max_attempts));
    expect(results.every((r) => r.status === 'rejected')).toBe(true);
  });

  it('un code Authenticator accepté ne peut pas être rejoué', async () => {
    const a = await enrolledAdmin();
    const code = mfa.generateTotpCode(a.secret);
    const first = await mfa.startTotpLogin(a.id);
    expect((await mfa.verifyTotpLogin(first.challengeId, code)).user.id).toBe(a.id);
    const again = await mfa.startTotpLogin(a.id);
    await expect(mfa.verifyTotpLogin(again.challengeId, code)).rejects.toMatchObject({ status: 401 });
  });

  it('un code de récupération ne sert qu’une fois, même utilisé deux fois en même temps', async () => {
    const a = await enrolledAdmin();
    const [c1, c2] = [await mfa.startTotpLogin(a.id), await mfa.startTotpLogin(a.id)];
    // La création d'un challenge clôt le précédent : on rouvre c1 pour simuler deux appareils.
    await pool.execute('UPDATE nova_auth_challenges SET used_at = NULL WHERE id = ?', [c1.challengeId]);
    const r = await Promise.allSettled([mfa.verifyTotpLogin(c1.challengeId, a.recovery[0]), mfa.verifyTotpLogin(c2.challengeId, a.recovery[0])]);
    expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    const [[u]] = await pool.execute('SELECT recovery_codes_json FROM nova_users WHERE id = ?', [a.id]);
    expect(JSON.parse(u.recovery_codes_json)).toHaveLength(7);
    const c3 = await mfa.startTotpLogin(a.id);
    await expect(mfa.verifyTotpLogin(c3.challengeId, a.recovery[0])).rejects.toBeTruthy();
  });

  it('MFA_REQUIRED_ROLES contient toujours médecin et administrateur', () => {
    expect(auth.MFA_REQUIRED_ROLES).toEqual(expect.arrayContaining(['doctor', 'admin']));
  });
});

describe('Mots de passe et sessions', () => {
  it('5 mauvais mots de passe bloquent le compte, même ensuite avec le bon', async () => {
    const p = await makeUser('patient');
    for (let i = 0; i < 5; i++) expect((await auth.startPhonePasswordLogin(p.phone, 'Mauvais0000')).error).toBe('invalid_credentials');
    expect((await auth.startPhonePasswordLogin(p.phone, p.password)).error).toBe('account_locked');
  });

  it('un numéro inconnu coûte une vérification de mot de passe (pas de réponse instantanée)', async () => {
    await auth.startPhonePasswordLogin('0500000001', 'Peu-importe-1');
    const t0 = performance.now();
    expect((await auth.startPhonePasswordLogin('0500000002', 'Peu-importe-1')).error).toBe('invalid_credentials');
    expect(performance.now() - t0).toBeGreaterThan(60);
  });

  it('le rattachement (pharmacie) est lu en base, pas dans le jeton', async () => {
    const ph = await makeUser('pharmacist', undefined, { pharmacyId: 'ph-001' });
    const token = mw.signAccessToken({ id: ph.id, role: 'pharmacist', pharmacyId: 'ph-001', sessionVersion: 0 });
    const who = async () => (await (await fetch(`${base}/whoami`, { headers: { Authorization: `Bearer ${token}` } })).json());
    expect((await who()).pharmacyId).toBe('ph-001');
    await pool.execute("UPDATE nova_users SET pharmacy_id = 'ph-002' WHERE id = ?", [ph.id]);
    expect((await who()).pharmacyId).toBe('ph-002');
  });

  it('jeton de renouvellement : expiration d’inactivité et révocation si rejoué après la rotation', async () => {
    const p = await makeUser('patient');
    const token = mw.signRefreshToken({ id: p.id, role: 'patient', sessionVersion: 0 });
    const life = jwt.decode(token).exp - jwt.decode(token).iat;
    expect(life).toBe(mw.REFRESH_IDLE_HOURS * 3600);
    const refresh = (t) => fetch(`${base}/api/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: t }) });
    expect((await refresh(token)).status).toBe(200);
    // Rejeu immédiat (course entre onglets) : refusé sans révoquer la session.
    expect((await refresh(token)).status).toBe(401);
    let [[u]] = await pool.execute('SELECT session_version FROM nova_users WHERE id = ?', [p.id]);
    expect(Number(u.session_version)).toBe(0);
    // Rejeu tardif (jeton volé) : toutes les sessions du compte sont révoquées.
    await pool.execute('UPDATE nova_revoked_tokens SET revoked_at = DATE_SUB(NOW(), INTERVAL 5 MINUTE) WHERE jti = ?', [jwt.decode(token).jti]);
    const late = await refresh(token);
    expect(late.status).toBe(401);
    expect((await late.json()).error).toBe('session_revoked');
    [[u]] = await pool.execute('SELECT session_version FROM nova_users WHERE id = ?', [p.id]);
    expect(Number(u.session_version)).toBe(1);
  });
});
