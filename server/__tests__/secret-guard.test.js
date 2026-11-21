// Un secret de signature déjà publié dans l'historique public empêche le démarrage en production.
// La valeur est relue dans l'historique Git local au moment du test (jamais écrite dans le dépôt) ;
// le test est ignoré si cet historique n'est pas disponible (clone superficiel).
import { describe, it, expect } from 'vitest';
import { spawnSync, execFileSync } from 'node:child_process';

let published = '';
try {
  published = execFileSync('git', ['show', '78df644:.env'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    .split(/\r?\n/).find((l) => l.startsWith('JWT_SECRET='))?.slice('JWT_SECRET='.length).trim() || '';
} catch { published = ''; }

const start = (secret) => spawnSync(process.execPath, ['-e', "import('./server/middleware/auth.js').then(()=>console.log('DEMARRE')).catch(e=>{console.log('REFUSE');process.exit(3)})"], {
  env: { ...process.env, NODE_ENV: 'production', JWT_SECRET: secret, JWT_REFRESH_SECRET: 'secret-de-renouvellement-distinct-et-long-0001' }, encoding: 'utf8',
});

describe('Secrets publiés', () => {
  it.skipIf(!published)('refuse de démarrer en production avec l’ancien JWT_SECRET publié', () => {
    const r = start(published);
    expect(r.stdout).toContain('REFUSE');
    expect(r.stdout + r.stderr).not.toContain(published);
  });

  it('démarre avec un secret neuf', () => {
    expect(start('secret-neuf-tout-a-fait-different-0123456789-abcdef').stdout).toContain('DEMARRE');
  });
});
