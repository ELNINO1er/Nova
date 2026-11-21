// Contrôles EN LECTURE SEULE de NOVA sur un hébergement Node.js géré (Hostinger), sans Docker.
//   node verif-lecture-seule.mjs /chemin/du/dossier/de/l-application
// Utilise le mysql2 de l'application et ses variables (environnement du processus, sinon <app>/.env).
// N'écrit rien (SELECT, stat, access) ; n'affiche ni secret ni donnée patient (identifiants techniques, rôles, compteurs).
import { createRequire } from 'node:module';
import { existsSync, readFileSync, statSync, readdirSync, accessSync, constants } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const appDir = path.resolve(process.argv[2] || process.cwd());
const require = createRequire(path.join(appDir, 'package.json'));
let n = 0;
const section = (t) => console.log(`\n[${String(++n).padStart(2, '0')}] ${t}`);

const fileEnv = {};
const envFile = path.join(appDir, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) fileEnv[m[1]] = m[2];
  }
}
const env = (k) => process.env[k] ?? fileEnv[k] ?? '';

console.log(`NOVA — contrôles en lecture seule (hébergement géré) — ${new Date().toISOString().slice(0, 16)}Z`);

section('Application');
console.log(`dossier : ${appDir}`);
console.log(`node ${process.version} / utilisateur ${os.userInfo().username} (uid ${process.getuid?.() ?? '?'})`);
try {
  const pkg = JSON.parse(readFileSync(path.join(appDir, 'package.json'), 'utf8'));
  console.log(`package : ${pkg.name} ${pkg.version}`);
} catch { console.log('package.json illisible'); }
const marks = {
  'server/services/patient-activation.js': 'présent seulement à partir de f92ccba',
  'server/scripts/patient-activations.js': 'présent seulement à partir de f92ccba',
  'server/services/access.js': 'présent dans 09f873e et f92ccba',
};
for (const [f, note] of Object.entries(marks)) console.log(`${existsSync(path.join(appDir, f)) ? 'présent' : 'absent '}  ${f}  (${note})`);
console.log(`variables lues depuis : ${Object.keys(fileEnv).length ? '.env de l’application + environnement' : 'environnement du processus uniquement'}`);

section('Configuration (valeurs non secrètes uniquement)');
for (const k of ['NODE_ENV', 'SEED_DEMO', 'ALLOW_INSECURE_DEMO', 'ALLOW_FICTIF_SEED', 'OTP_LOGIN_ENABLED', 'ENABLE_API_DOCS', 'COOKIE_SECURE', 'SMS_PROVIDER', 'PATIENT_ACTIVATION_HOURS']) {
  const v = env(k);
  const shown = !v ? '(non défini)' : /^(true|false|\d+|twilio|webhook|demo|production|development)$/.test(v) ? v : '<valeur inattendue>';
  console.log(`  ${k.padEnd(26)} ${shown}`);
}
console.log(`  ${'WEB_ORIGIN en https'.padEnd(26)} ${env('WEB_ORIGIN').startsWith('https://') ? 'oui' : 'NON'}`);
console.log(`  ${'DEMO_* avec une valeur'.padEnd(26)} ${['DEMO_PASSWORD', 'DEMO_DOCTOR_PASSWORD'].filter((k) => env(k)).length}`);
for (const k of ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'MFA_ENCRYPTION_KEY']) {
  console.log(`  ${(k + ' défini').padEnd(26)} ${env(k) ? 'oui' : 'NON'}${k.includes('SECRET') || k.includes('KEY') ? (env(k).length >= 32 ? ' (≥ 32 caractères)' : env(k) ? ' (TROP COURT)' : '') : ''}`);
}

section('Dossier des documents');
const uploads = env('UPLOAD_DIR') ? path.resolve(env('UPLOAD_DIR')) : path.join(appDir, 'data', 'uploads');
console.log(`chemin : ${env('UPLOAD_DIR') ? 'UPLOAD_DIR (hors du code)' : '<application>/data/uploads (dans le code)'}`);
if (!existsSync(uploads)) {
  console.log(`absent : ${uploads}`);
} else {
  const st = statSync(uploads);
  let files = 0; let bytes = 0; const owners = new Set();
  const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else { const s = statSync(p); files++; bytes += s.size; owners.add(s.uid); } } };
  walk(uploads);
  let writable = 'oui';
  try { accessSync(uploads, constants.W_OK); } catch { writable = 'NON'; }
  console.log(`propriétaire uid ${st.uid} ; inscriptible par ce compte : ${writable}`);
  console.log(`fichiers : ${files} ; taille : ${(bytes / 1048576).toFixed(1)} Mo ; propriétaires distincts : ${[...owners].join(', ') || '-'}`);
}

section('Base de données');
if (!env('DB_HOST') || !env('DB_USER')) {
  console.log('Variables DB_* indisponibles dans cette session : lancer depuis le contexte de l’application ou fournir son .env.');
} else {
  const mysql = require('mysql2/promise');
  const conn = await mysql.createConnection({
    host: env('DB_HOST'), port: Number(env('DB_PORT') || 3306), user: env('DB_USER'), password: env('DB_PASSWORD'), database: env('DB_NAME') || 'nova',
  });
  try {
    await conn.query('SET SESSION TRANSACTION READ ONLY');
    const q = async (sql) => (await conn.query(sql))[0];
    console.log(`MySQL ${(await q('SELECT VERSION() v'))[0].v}`);
    const mig = await q('SELECT version FROM nova_schema_migrations ORDER BY version DESC LIMIT 2');
    console.log(`dernières migrations : ${mig.map((r) => r.version).join(', ')}`);
    console.log('(09f873e : 20261113_13_admin_email ; f92ccba : 20261116_14_patient_activation)');
    const demo = await q(`SELECT id, role, password_hash IS NOT NULL mdp, must_change_password chg, disabled_at IS NOT NULL desact
      FROM nova_users WHERE id IN ('user-001','user-002','user-doc-001','user-ph-001','user-admin-001','user-gov-001') AND deleted_at IS NULL`);
    console.log(`comptes de démo : ${demo.length}`);
    for (const r of demo) console.log(`  ${r.id.padEnd(15)} ${r.role.padEnd(10)} mdp=${r.mdp} changement_imposé=${r.chg} désactivé=${r.desact}${r.mdp && !r.desact ? '  ← UTILISABLE' : ''}`);
    const [admins] = await q(`SELECT COUNT(*) c FROM nova_users WHERE role='admin' AND deleted_at IS NULL AND disabled_at IS NULL AND id<>'user-admin-001'`);
    console.log(`administrateurs réels actifs : ${admins.c}`);
    const [pending] = await q(`SELECT COUNT(*) c FROM nova_users WHERE role='patient' AND must_change_password=1 AND password_hash IS NOT NULL AND deleted_at IS NULL`);
    console.log(`patients en attente d'activation : ${pending.c}`);
    const roles = await q(`SELECT role, COUNT(*) c FROM nova_users WHERE deleted_at IS NULL GROUP BY role ORDER BY role`);
    console.log(`comptes par rôle : ${roles.map((r) => `${r.role}=${r.c}`).join(', ')}`);
    const [docs] = await q('SELECT COUNT(*) c, SUM(file_path IS NOT NULL) f FROM nova_documents');
    console.log(`documents en base : ${docs.c} (dont avec fichier : ${docs.f ?? 0})`);
    const grants = await q('SHOW GRANTS');
    console.log(`droits du compte applicatif : ${grants.length} ligne(s)${grants.some((g) => /ALL PRIVILEGES ON \*\.\*/.test(Object.values(g)[0])) ? ' ← droits globaux (trop larges)' : ''}`);
  } finally {
    await conn.end();
  }
}
console.log('\nFin des contrôles (aucune modification effectuée).');
