import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { pool } from '../db/database.js';

/*
 * Fermeture du compte patient.
 * - Le patient la demande lui-même (mot de passe exigé) ; un administrateur peut aussi fermer ou rouvrir.
 * - Le compte est désactivé et toutes ses sessions sont fermées immédiatement.
 * - Les accès des médecins sont retirés, le QR d'urgence est supprimé, les rendez-vous à venir
 *   et les ordonnances envoyées en pharmacie sont annulés.
 * - Le dossier médical n'est pas effacé : les actes de soins doivent être conservés (obligation légale) ;
 *   il n'est plus accessible à personne via NOVA tant que le compte reste fermé.
 */
async function closeWithin(conn, patientId) {
  const now = new Date();
  await conn.execute('UPDATE nova_users SET disabled_at = ?, session_version = session_version + 1 WHERE patient_id = ? AND deleted_at IS NULL', [now, patientId]);
  // Retrait de tout accès médecin : une révocation postérieure prime sur les accords et les partages.
  const [doctors] = await conn.execute(
    `SELECT DISTINCT doctor_id FROM (
       SELECT doctor_id FROM nova_consents WHERE patient_id = ? AND status = 'granted'
       UNION SELECT doctor_id FROM nova_appointments WHERE patient_id = ? AND record_shared_at IS NOT NULL AND doctor_id IS NOT NULL
     ) d`, [patientId, patientId]);
  for (const { doctor_id: doctorId } of doctors) {
    await conn.execute(
      "INSERT INTO nova_consents (id, patient_id, doctor_id, status, scope, requested_at, responded_at) VALUES (?, ?, ?, 'revoked', ?, ?, ?)",
      [randomUUID(), patientId, doctorId, JSON.stringify(['clinical_record']), now, now]);
  }
  await conn.execute("UPDATE nova_consents SET status = 'revoked', responded_at = ? WHERE patient_id = ? AND status = 'pending'", [now, patientId]);
  await conn.execute('DELETE FROM nova_emergency_links WHERE patient_id = ?', [patientId]);
  await conn.execute("UPDATE nova_appointments SET status = 'cancelled', updated_at = ? WHERE patient_id = ? AND status IN ('requested','confirmed') AND starts_at > ?", [now.toISOString(), patientId, now.toISOString()]);
  await conn.execute("UPDATE nova_doctor_slots SET status = 'available', patient_id = NULL WHERE patient_id = ? AND status = 'booked' AND CONCAT(slot_date, ' ', slot_time) > ?", [patientId, now.toISOString().slice(0, 16).replace('T', ' ')]);
  await conn.execute("UPDATE nova_pharmacy_orders SET status = 'cancelled', updated_at = ? WHERE patient_id = ? AND status IN ('pending','ready','unavailable')", [now, patientId]);
  return { closedAt: now.toISOString() };
}

async function inTransaction(fn) {
  const conn = await pool.getConnection();
  try { await conn.beginTransaction(); const r = await fn(conn); await conn.commit(); return r; }
  catch (e) { await conn.rollback(); throw e; }
  finally { conn.release(); }
}

/** Fermeture demandée par le patient : son mot de passe actuel est exigé. */
export async function closeOwnPatientAccount(userId, patientId, password) {
  const [[user]] = await pool.execute('SELECT id, password_hash FROM nova_users WHERE id = ? AND patient_id = ? AND deleted_at IS NULL AND disabled_at IS NULL', [userId, patientId]);
  if (!user) throw Object.assign(new Error('Compte introuvable.'), { status: 404 });
  const valid = user.password_hash && await bcrypt.compare(String(password || ''), user.password_hash);
  if (!valid) throw Object.assign(new Error('Mot de passe incorrect.'), { status: 400, code: 'wrong_password' });
  return inTransaction((conn) => closeWithin(conn, patientId));
}

/** Fermeture ou réouverture par un administrateur. La réouverture ne rétablit aucun accès médecin. */
export async function setPatientAccountActive(patientId, active) {
  const [[p]] = await pool.execute('SELECT id FROM nova_patients WHERE id = ? AND deleted_at IS NULL', [patientId]);
  if (!p) return null;
  if (active) {
    await pool.execute('UPDATE nova_users SET disabled_at = NULL, session_version = session_version + 1 WHERE patient_id = ? AND deleted_at IS NULL', [patientId]);
    return { active: true };
  }
  await inTransaction((conn) => closeWithin(conn, patientId));
  return { active: false };
}
