// Journaux : exploitables en cas d'incident, sans identifiant, jeton ni donnée médicale.
import { describe, it, expect, vi, afterEach } from 'vitest';
import express from 'express';
import { accessLogger, maskPhone, safePath, securityEvent, describeError } from '../middleware/logging.js';

afterEach(() => vi.restoreAllMocks());

describe('journaux', () => {
  it('masque les numéros et retire les paramètres de recherche', () => {
    expect(maskPhone('07 49 15 77 21')).toBe('07••••••21');
    expect(safePath('/api/doctor/me/patients?search=Aya%20Kon%C3%A9&phone=0749157721')).toBe('/api/doctor/me/patients');
    expect(safePath('/api/patient/me/documents/a3e42812-a9fd-4365-9993-14db29f20bd7/download')).toBe('/api/patient/me/documents/a3e42812…/download');
  });

  it('le journal d’accès ne contient ni recherche, ni jeton, ni cookie', async () => {
    const lines = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => { lines.push(String(chunk)); return true; });
    const app = express();
    app.use(accessLogger);
    app.get('/api/doctor/me/patients', (req, res) => res.json({ ok: true }));
    const server = await new Promise((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
    await fetch(`http://127.0.0.1:${server.address().port}/api/doctor/me/patients?search=Aya%20Kone`, {
      headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.SECRET.SIG', Cookie: 'nova_access_token=JETON-SECRET' },
    });
    await new Promise((r) => setTimeout(r, 50));
    server.close();
    const log = lines.join('');
    expect(log).toContain('GET /api/doctor/me/patients 200');
    for (const leak of ['Aya', 'search', 'SECRET', 'Bearer', 'nova_access_token']) expect(log).not.toContain(leak);
  });

  it('un événement de sécurité écarte les champs sensibles', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    securityEvent('auth.login_failed', { reason: 'invalid_credentials', phone: maskPhone('0749157721'), password: 'x', token: 'y', otpCode: '123456', diagnosis: 'HTA' });
    const line = JSON.parse(spy.mock.calls[0][0]);
    expect(line).toMatchObject({ event: 'auth.login_failed', reason: 'invalid_credentials', phone: '07••••••21' });
    for (const k of ['password', 'token', 'otpCode', 'diagnosis']) expect(line).not.toHaveProperty(k);
  });

  it('une erreur SQL est décrite sans la requête ni ses valeurs', () => {
    const err = Object.assign(new Error("Duplicate entry '0749157721' for key 'phone' (Aya Koné)"), { code: 'ER_DUP_ENTRY', sql: "INSERT INTO nova_patients VALUES ('Aya Koné','0749157721')", sqlMessage: 'Aya Koné' });
    const d = JSON.stringify(describeError(err));
    expect(d).toContain('ER_DUP_ENTRY');
    expect(d).not.toContain('0749157721');
    expect(d).toContain('Duplicate entry');
    expect(d).not.toContain('0749157721');
  });
});
