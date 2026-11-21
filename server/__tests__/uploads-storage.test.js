// Stockage persistant des documents : UPLOAD_DIR hors du dossier de l'application, copie vérifiée.
import { describe, it, expect, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { copyUploads, listFiles } from '../scripts/copy-uploads.js';

const root = mkdtempSync(path.join(tmpdir(), 'nova-uploads-test-'));
afterAll(() => rmSync(root, { recursive: true, force: true }));

describe('dossier des documents', () => {
  it('UPLOAD_DIR place les documents hors du code et le signale comme externe', () => {
    const external = path.join(root, 'persistant');
    const script = "import('./server/middleware/upload.js').then(m => console.log(JSON.stringify({ dir: m.uploadDir, ext: m.uploadDirIsExternal })))";
    const withEnv = spawnSync(process.execPath, ['-e', script], { env: { ...process.env, UPLOAD_DIR: external }, encoding: 'utf8' });
    expect(JSON.parse(withEnv.stdout)).toEqual({ dir: path.resolve(external), ext: true });
    const withoutEnv = spawnSync(process.execPath, ['-e', script], { env: { ...process.env, UPLOAD_DIR: '' }, encoding: 'utf8' });
    const parsed = JSON.parse(withoutEnv.stdout);
    expect(parsed.ext).toBe(false);
    expect(parsed.dir.split(path.sep).slice(-2)).toEqual(['data', 'uploads']);
  });

  it('copie vérifiée : simulation sans écriture, puis copie sans écraser ni supprimer la source', () => {
    const from = path.join(root, 'ancien'); const to = path.join(root, 'nouveau');
    mkdirSync(path.join(from, 'patient-a'), { recursive: true });
    writeFileSync(path.join(from, 'patient-a', 'doc-fictif.pdf'), '%PDF fictif A');
    writeFileSync(path.join(from, 'patient-a', 'photo-fictive.png'), 'png fictif');
    mkdirSync(path.join(to, 'patient-a'), { recursive: true });
    writeFileSync(path.join(to, 'patient-a', 'photo-fictive.png'), 'version différente');

    const dry = copyUploads(from, to);
    expect(dry).toMatchObject({ total: 2, toCopy: 1, copied: 0, conflicts: ['patient-a' + path.sep + 'photo-fictive.png'] });
    expect(listFiles(to)).toEqual(['patient-a' + path.sep + 'photo-fictive.png']);

    const done = copyUploads(from, to, { apply: true });
    expect(done.copied).toBe(1);
    expect(readFileSync(path.join(to, 'patient-a', 'doc-fictif.pdf'), 'utf8')).toBe('%PDF fictif A');
    expect(readFileSync(path.join(to, 'patient-a', 'photo-fictive.png'), 'utf8')).toBe('version différente');
    expect(listFiles(from)).toHaveLength(2);
    expect(copyUploads(from, to, { apply: true })).toMatchObject({ copied: 0, alreadyIdentical: 1 });
  });
});
