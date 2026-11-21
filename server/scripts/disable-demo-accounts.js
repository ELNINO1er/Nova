// Désactive les comptes de démonstration et révoque leurs sessions, sans toucher aux comptes légitimes.
//
//   node server/scripts/disable-demo-accounts.js                     simulation (aucune écriture)
//   node server/scripts/disable-demo-accounts.js --scan-passwords    + repère tout compte au mot de passe publié
//   node server/scripts/disable-demo-accounts.js --apply             applique sur les comptes de démo
//   ... --apply --scan-passwords --include-compromised               retire aussi le mot de passe publié des autres comptes
//
// Comptes de démo ciblés : identifiant ET numéro créés par le seed SEED_DEMO (un identifiant réattribué
// à un autre numéro n'est pas touché). Action : disabled_at = maintenant, mot de passe retiré,
// session_version + 1 (jetons d'accès et de renouvellement refusés immédiatement).
// Comptes non démo au mot de passe publié : seulement listés, sauf --include-compromised
// (mot de passe retiré + sessions révoquées, compte non désactivé : nouvel accès via l'admin ou le médecin).
// La sortie ne contient que l'identifiant interne et le rôle : ni numéro, ni nom, ni secret.
// N'exécute aucune migration (pas d'initDb) : lecture et UPDATE ciblés uniquement.
// PUBLISHED_PASSWORDS="valeur1|valeur2" : anciennes valeurs publiées, fournies par l'environnement.
import 'dotenv/config';
import bcrypt from 'bcrypt';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../db/database.js';

// Identifiant -> numéro attribué par le seed de démonstration (server/db/database.js).
export const DEMO_ACCOUNTS = Object.freeze({
  'user-001': '0789452311',
  'user-002': '0102030405',
  'user-doc-001': '0601234567',
  'user-ph-001': '0700000002',
  'user-admin-001': '0700000001',
  'user-gov-001': '0700000003',
});

const placeholders = (list) => list.map(() => '?').join(',');

/** Lecture seule : comptes de démo ciblés, identifiants réattribués ignorés, autres comptes au mot de passe publié. */
export async function planDemoDisable({ published = [], scan = false } = {}) {
  const ids = Object.keys(DEMO_ACCOUNTS);
  const [rows] = await pool.query(
    `SELECT id, phone, role, disabled_at FROM nova_users WHERE id IN (${placeholders(ids)}) AND deleted_at IS NULL`, ids
  );
  const demo = rows.filter((r) => DEMO_ACCOUNTS[r.id] === r.phone);
  const skipped = rows.filter((r) => DEMO_ACCOUNTS[r.id] !== r.phone);
  const compromised = [];
  if (scan) {
    if (!published.length) throw new Error('--scan-passwords exige PUBLISHED_PASSWORDS dans l’environnement.');
    const [candidates] = await pool.query(
      `SELECT id, role, password_hash FROM nova_users
       WHERE password_hash IS NOT NULL AND deleted_at IS NULL AND disabled_at IS NULL AND id NOT IN (${placeholders(ids)})`, ids
    );
    for (const user of candidates) {
      for (const value of published) {
        if (await bcrypt.compare(value, user.password_hash)) { compromised.push({ id: user.id, role: user.role }); break; }
      }
    }
  }
  return {
    demo: demo.map(({ id, phone, role, disabled_at }) => ({ id, phone, role, alreadyDisabled: Boolean(disabled_at) })),
    skipped: skipped.map(({ id, role }) => ({ id, role })),
    compromised,
  };
}

export async function applyDemoDisable(plan, { includeCompromised = false } = {}) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    let disabled = 0; let cleared = 0;
    for (const r of plan.demo) {
      const [res] = await conn.execute(
        `UPDATE nova_users SET disabled_at = COALESCE(disabled_at, NOW(3)), password_hash = NULL,
           must_change_password = 1, session_version = session_version + 1, updated_at = ?
         WHERE id = ? AND phone = ?`,
        [new Date().toISOString(), r.id, r.phone]
      );
      disabled += res.affectedRows;
    }
    if (includeCompromised) {
      for (const r of plan.compromised) {
        const [res] = await conn.execute(
          'UPDATE nova_users SET password_hash = NULL, must_change_password = 1, session_version = session_version + 1, updated_at = ? WHERE id = ?',
          [new Date().toISOString(), r.id]
        );
        cleared += res.affectedRows;
      }
    }
    await conn.commit();
    return { disabled, cleared };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const apply = args.has('--apply');
  const scan = args.has('--scan-passwords');
  const includeCompromised = args.has('--include-compromised');
  if (includeCompromised && !scan) throw new Error('--include-compromised exige --scan-passwords.');
  const published = String(process.env.PUBLISHED_PASSWORDS || '').split('|').map((v) => v.trim()).filter(Boolean);

  const plan = await planDemoDisable({ published, scan });
  console.log(apply ? '== APPLICATION ==' : '== SIMULATION (ajoutez --apply pour écrire) ==');
  for (const r of plan.demo) console.log(`démo   ${r.id.padEnd(16)} ${r.role.padEnd(10)} ${r.alreadyDisabled ? 'déjà désactivé → sessions révoquées à nouveau' : 'à désactiver'}`);
  for (const r of plan.skipped) console.log(`ignoré ${r.id.padEnd(16)} ${r.role.padEnd(10)} numéro différent du seed (compte réattribué)`);
  for (const r of plan.compromised) console.log(`publié ${r.id.padEnd(36)} ${r.role.padEnd(10)} ${includeCompromised ? 'mot de passe à retirer' : 'à traiter (ajoutez --include-compromised)'}`);
  console.log(`Total : ${plan.demo.length} démo, ${plan.skipped.length} ignoré(s), ${plan.compromised.length} au mot de passe publié${scan ? '' : ' (non recherché)'}.`);
  if (!apply) return;
  const done = await applyDemoDisable(plan, { includeCompromised });
  console.log(`Terminé : ${done.disabled} compte(s) démo désactivé(s)${includeCompromised ? `, ${done.cleared} mot(s) de passe publié(s) retiré(s)` : ''}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
