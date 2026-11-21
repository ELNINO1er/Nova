// Sauvegardes (deploy/backup.sh) : chiffrement obligatoire, aucune donnée en clair même en cas d'échec,
// sauvegardes précédentes conservées, rotation limitée aux sauvegardes quotidiennes.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, utimesSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { spawnSync } from 'node:child_process';

const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : '/bin/bash';
const script = readFileSync(new URL('../../deploy/backup.sh', import.meta.url), 'utf8');
const toPosix = (p) => p.split('\\').join('/').replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`);
const hasGpg = spawnSync(bash, ['-c', 'command -v gpg'], { encoding: 'utf8' }).status === 0;
const MARKER = 'DONNEE_PATIENT_FICTIVE_EN_CLAIR';

function cleanup(dir) {
  const target = resolve(dir);
  if (dirname(target) !== resolve(tmpdir()) || !/^nova-backup-test-/.test(basename(target))) throw new Error('Répertoire temporaire non autorisé');
  rmSync(target, { recursive: true, force: true });
}

function workspace({ uploads = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'nova-backup-test-'));
  mkdirSync(join(dir, 'backups'));
  if (uploads) { mkdirSync(join(dir, 'uploads')); writeFileSync(join(dir, 'uploads', 'doc-fictif.txt'), `${MARKER} document`); }
  return dir;
}

function run(dir, { dump, key, prefix }) {
  const env = [
    'export DB_HOST=localhost DB_NAME=fake BACKUP_RUN_ONCE=true',
    `export BACKUP_DIR='${toPosix(join(dir, 'backups'))}' UPLOADS_DIR='${toPosix(join(dir, 'uploads'))}'`,
    `export BACKUP_GPG_RECIPIENT_FILE='${toPosix(key || join(dir, 'absente.asc'))}'`,
    prefix ? `export BACKUP_NAME_PREFIX='${prefix}'` : '',
  ].join('\n');
  const result = spawnSync(bash, [], { input: `mysqldump() { ${dump}; }\n${env}\n${script.replace(/^#!.*\n/, '')}`, encoding: 'utf8' });
  return { result, files: readdirSync(join(dir, 'backups')).sort() };
}

// Aucun fichier du dossier de sauvegarde ne contient la donnée fictive en clair.
function noPlaintext(dir) {
  for (const name of readdirSync(join(dir, 'backups'))) {
    expect(readFileSync(join(dir, 'backups', name)).includes(Buffer.from(MARKER)), name).toBe(false);
  }
}

describe('Sauvegardes chiffrées', () => {
  let keyDir; let publicKey; let gnupg; let invalidKey;

  beforeAll(() => {
    keyDir = mkdtempSync(join(tmpdir(), 'nova-backup-test-'));
    invalidKey = join(keyDir, 'invalide.asc');
    writeFileSync(invalidKey, '-----BEGIN PGP PUBLIC KEY BLOCK-----\nceci n’est pas une clé\n-----END PGP PUBLIC KEY BLOCK-----\n');
    if (!hasGpg) return;
    gnupg = toPosix(join(keyDir, 'gnupg'));
    publicKey = join(keyDir, 'backup-public.asc');
    const gen = spawnSync(bash, ['-c', [
      `mkdir -p '${gnupg}' && chmod 700 '${gnupg}'`,
      `export GNUPGHOME='${gnupg}'`,
      "gpg --batch --quiet --passphrase '' --quick-gen-key 'NOVA sauvegarde test <test@example.invalid>' rsa3072 encr never",
      `gpg --batch --armor --export test@example.invalid > '${toPosix(publicKey)}'`,
    ].join(' && ')], { encoding: 'utf8' });
    if (gen.status !== 0) throw new Error(gen.stderr);
  }, 60000);

  afterAll(() => { if (keyDir) cleanup(keyDir); });

  it('échoue sans clé publique, avant tout dump, et conserve les sauvegardes précédentes', () => {
    const dir = workspace();
    writeFileSync(join(dir, 'backups', 'nova-db-ancienne.sql.gz.gpg'), 'ancienne sauvegarde');
    try {
      const { result, files } = run(dir, { dump: `printf '${MARKER}'` });
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('clé publique de chiffrement absente');
      expect(result.stderr).toContain('sauvegardes existantes sont conservées');
      expect(files).toEqual(['nova-db-ancienne.sql.gz.gpg']);
      noPlaintext(dir);
    } finally { cleanup(dir); }
  });

  it('échoue avec une clé invalide sans rien écrire', () => {
    const dir = workspace();
    try {
      const { result, files } = run(dir, { dump: `printf '${MARKER}'`, key: invalidKey });
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('clé publique invalide');
      expect(files).toEqual([]);
    } finally { cleanup(dir); }
  });

  it.skipIf(!hasGpg)('dump interrompu en cours de route : échec, aucun fichier, aucune donnée en clair', () => {
    const dir = workspace();
    writeFileSync(join(dir, 'backups', 'nova-db-precedente.sql.gz.gpg'), 'précédente');
    try {
      const { result, files } = run(dir, { dump: `printf 'CREATE TABLE t; -- ${MARKER}'; return 3`, key: publicKey });
      expect(result.status).not.toBe(0);
      expect(result.stdout).not.toContain('sauvegardée');
      expect(files).toEqual(['nova-db-precedente.sql.gz.gpg']);
      noPlaintext(dir);
    } finally { cleanup(dir); }
  }, 30000);

  it.skipIf(!hasGpg)('échec de l’archive des documents : la base déjà chiffrée n’est pas publiée seule', () => {
    const dir = workspace({ uploads: false });
    try {
      const { result, files } = run(dir, { dump: `printf '${MARKER}'`, key: publicKey });
      expect(result.status).not.toBe(0);
      expect(files).toEqual([]);
    } finally { cleanup(dir); }
  }, 30000);

  it.skipIf(!hasGpg)('chiffre base et documents ; seule la clé privée permet de les relire', () => {
    const dir = workspace();
    writeFileSync(join(dir, 'backups', 'nova-db-x.sql.gz.gpg.part'), 'reste chiffré d’un passage interrompu');
    try {
      const { result, files } = run(dir, { dump: `printf 'CREATE TABLE fictive(id INT); -- ${MARKER}'`, key: publicKey });
      expect(result.status, result.stderr).toBe(0);
      expect(files).toHaveLength(2);
      expect(files.every((n) => n.endsWith('.gpg'))).toBe(true);
      noPlaintext(dir);
      if (process.platform !== 'win32') {
        for (const n of files) expect(statSync(join(dir, 'backups', n)).mode & 0o777).toBe(0o600);
      }
      const dbFile = toPosix(join(dir, 'backups', files.find((n) => n.includes('-db-'))));
      const upFile = toPosix(join(dir, 'backups', files.find((n) => n.includes('-uploads-'))));
      const db = spawnSync(bash, ['-c', `GNUPGHOME='${gnupg}' gpg --batch --quiet --decrypt '${dbFile}' | gzip -dc`], { encoding: 'utf8' });
      expect(db.stdout).toContain('CREATE TABLE fictive');
      const up = spawnSync(bash, ['-c', `GNUPGHOME='${gnupg}' gpg --batch --quiet --decrypt '${upFile}' | tar -xzOf - ./doc-fictif.txt`], { encoding: 'utf8' });
      expect(up.stdout).toContain(MARKER);
    } finally { cleanup(dir); }
  }, 30000);

  it.skipIf(!hasGpg)('rotation : anciennes sauvegardes quotidiennes supprimées, sauvegarde d’avant déploiement conservée', () => {
    const dir = workspace();
    const old = new Date(Date.now() - 30 * 86400000);
    for (const n of ['nova-db-2026-01-01.sql.gz.gpg', 'predeploy-nova-db-2026-01-01.sql.gz.gpg']) {
      writeFileSync(join(dir, 'backups', n), 'ancien');
      utimesSync(join(dir, 'backups', n), old, old);
    }
    try {
      const daily = run(dir, { dump: "printf 'SQL fictif'", key: publicKey });
      expect(daily.result.status, daily.result.stderr).toBe(0);
      expect(daily.files).not.toContain('nova-db-2026-01-01.sql.gz.gpg');
      expect(daily.files).toContain('predeploy-nova-db-2026-01-01.sql.gz.gpg');
      const manual = run(dir, { dump: "printf 'SQL fictif'", key: publicKey, prefix: 'predeploy-nova' });
      expect(manual.result.status, manual.result.stderr).toBe(0);
      expect(manual.files.filter((n) => n.startsWith('predeploy-nova-db-')).length).toBe(2);
    } finally { cleanup(dir); }
  }, 30000);
});
