// Traitement des comptes patients en attente d'activation (créés par un médecin, mot de passe jamais choisi).
// Les patients déjà activés (mot de passe choisi) ne sont JAMAIS modifiés. Simulation par défaut, --apply pour écrire.
// Sortie : identifiants internes et compteurs seulement (ni nom, ni numéro, ni code).
//
//   node server/scripts/patient-activations.js legacy [--days 7] [--apply]
//     Après le déploiement. Comptes créés AVANT cette version (mot de passe provisoire sans échéance) :
//     échéance fixée à maintenant + N jours (7 par défaut), canal « fiche », médecin créateur retrouvé
//     d'après la demande d'accès enregistrée à la création. Le médecin peut ensuite générer un nouveau code.
//     Un compte dont le médecin créateur n'est pas identifiable est seulement listé (aucune échéance posée).
//
//   node server/scripts/patient-activations.js pre-rollback [--expired-only] [--apply]
//     AVANT un retour à une version qui ignore l'échéance des codes. Rend inutilisables les codes en attente
//     qui ont une échéance (expirés, et par défaut aussi ceux encore valables, qui deviendraient sans limite) :
//     mot de passe provisoire retiré, échéance ramenée à maintenant, sessions révoquées. Le compte reste en
//     attente : après le retour à cette version, le médecin le voit dans « Activations en attente » et clique
//     « Nouveau code ». Un code déjà remplacé est inutilisable de toute façon (empreinte remplacée).
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../db/database.js';

const PENDING = `u.role = 'patient' AND u.must_change_password = 1 AND u.password_changed_at IS NULL
  AND u.deleted_at IS NULL AND u.disabled_at IS NULL`;

/** Comptes anciens en attente, sans échéance, avec le médecin créateur retrouvé si possible. */
export async function planLegacy() {
  const [rows] = await pool.query(
    `SELECT u.id, u.patient_id,
       (SELECT c.doctor_id FROM nova_consents c
        WHERE c.patient_id = u.patient_id
          AND ABS(TIMESTAMPDIFF(SECOND, c.requested_at, STR_TO_DATE(LEFT(u.created_at, 19), '%Y-%m-%dT%H:%i:%s'))) <= 10
        ORDER BY c.requested_at LIMIT 1) AS creator
     FROM nova_users u
     WHERE ${PENDING} AND u.password_hash IS NOT NULL AND u.activation_expires_at IS NULL`
  );
  return {
    withCreator: rows.filter((r) => r.creator).map((r) => ({ id: r.id, creator: r.creator })),
    withoutCreator: rows.filter((r) => !r.creator).map((r) => ({ id: r.id })),
  };
}

export async function applyLegacy(plan, days = 7) {
  let updated = 0;
  for (const r of plan.withCreator) {
    const [res] = await pool.execute(
      `UPDATE nova_users u SET u.activation_expires_at = DATE_ADD(UTC_TIMESTAMP(3), INTERVAL ? DAY),
         u.activation_channel = 'sheet', u.activation_doctor_id = COALESCE(u.activation_doctor_id, ?)
       WHERE u.id = ? AND ${PENDING} AND u.activation_expires_at IS NULL`,
      [days, r.creator, r.id]
    );
    updated += res.affectedRows;
  }
  return { updated };
}

/** Codes en attente qui redeviendraient utilisables sans limite avec une version qui ignore l'échéance. */
export async function planPreRollback({ expiredOnly = false } = {}) {
  const [rows] = await pool.query(
    `SELECT u.id, u.activation_expires_at <= UTC_TIMESTAMP(3) AS expired
     FROM nova_users u
     WHERE ${PENDING} AND u.password_hash IS NOT NULL AND u.activation_expires_at IS NOT NULL
       ${expiredOnly ? 'AND u.activation_expires_at <= UTC_TIMESTAMP(3)' : ''}`
  );
  return rows.map((r) => ({ id: r.id, expired: Boolean(Number(r.expired)) }));
}

export async function applyPreRollback(plan) {
  let neutralized = 0;
  for (const r of plan) {
    const [res] = await pool.execute(
      `UPDATE nova_users u SET u.password_hash = NULL, u.session_version = u.session_version + 1,
         u.activation_expires_at = LEAST(u.activation_expires_at, UTC_TIMESTAMP(3))
       WHERE u.id = ? AND ${PENDING}`,
      [r.id]
    );
    neutralized += res.affectedRows;
  }
  if (plan.length) {
    await pool.query(
      `UPDATE nova_auth_challenges SET used_at = NOW() WHERE used_at IS NULL AND user_id IN (${plan.map(() => '?').join(',')})`,
      plan.map((r) => r.id)
    );
  }
  return { neutralized };
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = new Set(rest);
  const apply = args.has('--apply');
  console.log(apply ? '== APPLICATION ==' : '== SIMULATION (ajoutez --apply pour écrire) ==');
  if (command === 'legacy') {
    const i = rest.indexOf('--days');
    const days = i >= 0 ? Number(rest[i + 1]) : 7;
    if (!Number.isInteger(days) || days < 1 || days > 60) throw new Error('--days : entier entre 1 et 60.');
    const plan = await planLegacy();
    for (const r of plan.withCreator) console.log(`échéance +${days} j  ${r.id}  (médecin créateur identifié)`);
    for (const r of plan.withoutCreator) console.log(`à traiter  ${r.id}  (médecin créateur introuvable : aucune échéance posée)`);
    console.log(`Total : ${plan.withCreator.length} compte(s) à encadrer, ${plan.withoutCreator.length} sans médecin identifié.`);
    if (apply) console.log(`Terminé : ${(await applyLegacy(plan, days)).updated} compte(s) mis à jour.`);
  } else if (command === 'pre-rollback') {
    const plan = await planPreRollback({ expiredOnly: args.has('--expired-only') });
    for (const r of plan) console.log(`code rendu inutilisable  ${r.id}  (${r.expired ? 'expiré' : 'encore valable'})`);
    console.log(`Total : ${plan.length} code(s) en attente concerné(s). Patients activés : non modifiés.`);
    if (apply) console.log(`Terminé : ${(await applyPreRollback(plan)).neutralized} code(s) neutralisé(s).`);
  } else {
    throw new Error('Commande attendue : legacy | pre-rollback');
  }
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
