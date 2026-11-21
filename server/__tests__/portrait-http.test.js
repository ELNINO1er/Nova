// Routes photo : wrap transmet next, une photo absente ou illisible donne une réponse maîtrisée
// et le processus continue de répondre (régression audit 15/11, priorité 10).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { wrap, sendPortrait } from '../middleware/helpers.js';
import { errorHandler } from '../middleware/errors.js';

let server;
let base;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-portrait-'));
const image = path.join(tmp, 'photo.png');
fs.writeFileSync(image, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

beforeAll(async () => {
  const app = express();
  app.get('/photo/none', wrap(async (req, res, next) => sendPortrait(res, null, next)));
  app.get('/photo/missing', wrap(async (req, res, next) => sendPortrait(res, path.join(tmp, 'absente.png'), next)));
  app.get('/photo/directory', wrap(async (req, res, next) => sendPortrait(res, tmp, next)));
  app.get('/photo/ok', wrap(async (req, res, next) => sendPortrait(res, image, next)));
  app.get('/sync-throw', wrap((req) => { throw Object.assign(new Error('boom'), { status: 409 }); }));
  app.get('/health', (req, res) => res.json({ ok: true }));
  app.use(errorHandler);
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('envoi des portraits', () => {
  it('répond 204 sans photo enregistrée', async () => {
    const res = await fetch(`${base}/photo/none`);
    expect(res.status).toBe(204);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
  });

  it('répond 204 quand le fichier a disparu du disque', async () => {
    expect((await fetch(`${base}/photo/missing`)).status).toBe(204);
  });

  it('transmet une erreur de lecture au gestionnaire d’erreurs sans faire tomber le processus', async () => {
    const res = await fetch(`${base}/photo/directory`);
    expect([204, 403, 404, 500]).toContain(res.status);
    if (res.status >= 400) expect((await res.json()).error).toBeTruthy();
    const health = await fetch(`${base}/health`);
    expect(health.status).toBe(200);
  });

  it('sert la photo existante', async () => {
    const res = await fetch(`${base}/photo/ok`);
    expect(res.status).toBe(200);
    expect(Buffer.from(await res.arrayBuffer()).length).toBe(8);
  });

  it('route aussi une exception synchrone vers le gestionnaire d’erreurs', async () => {
    const res = await fetch(`${base}/sync-throw`);
    expect(res.status).toBe(409);
    expect((await fetch(`${base}/health`)).status).toBe(200);
  });
});
