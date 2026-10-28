import { pool } from '../db/database.js';

/*
 * Règles de transition des objets métier (validées côté serveur).
 * Chaque table : état courant → { acteur: [états cibles autorisés] }.
 * Voir docs/ARCHITECTURE_ROLES.md §2.
 */
export const APPOINTMENT_TRANSITIONS = {
  requested: { patient: ['cancelled'], doctor: ['confirmed', 'cancelled'] },
  confirmed: { patient: ['cancelled'], doctor: ['cancelled'] },
  cancelled: { patient: [], doctor: [] },
};

export function assertTransition(table, from, to, actor, label = 'statut') {
  if (from === to) return;
  const allowed = table[from]?.[actor] || [];
  if (!allowed.includes(to)) {
    throw Object.assign(new Error(`Changement de ${label} « ${from} » → « ${to} » non autorisé.`), { status: 409, code: 'invalid_transition' });
  }
}

/** Libère le créneau réservé correspondant à un rendez-vous (annulation ou déplacement). */
export async function releaseSlotFor(appointment, conn = pool) {
  if (!appointment?.doctor_id || !appointment?.starts_at) return;
  const date = String(appointment.starts_at).slice(0, 10);
  const time = String(appointment.starts_at).slice(11, 16);
  await conn.execute(
    `UPDATE nova_doctor_slots SET status = 'available', patient_id = NULL
     WHERE doctor_id = ? AND slot_date = ? AND LEFT(slot_time,5) = ? AND patient_id = ? AND status = 'booked'`,
    [appointment.doctor_id, date, time, appointment.patient_id]
  );
}

/** Un médecin ne peut pas avoir deux rendez-vous actifs au même horaire. */
export async function assertDoctorSlotFree(doctorId, startsAt, exceptId = null, conn = pool) {
  const [[clash]] = await conn.execute(
    `SELECT id FROM nova_appointments
     WHERE doctor_id = ? AND starts_at = ? AND status <> 'cancelled' AND (? IS NULL OR id <> ?) LIMIT 1`,
    [doctorId, startsAt, exceptId, exceptId]
  );
  if (clash) throw Object.assign(new Error('Ce créneau est déjà pris. Choisissez un autre horaire.'), { status: 409, code: 'slot_taken' });
}

export function assertFuture(startsAt) {
  if (!Number.isFinite(new Date(startsAt).getTime()) || new Date(startsAt).getTime() < Date.now() - 60000) {
    throw Object.assign(new Error('La date du rendez-vous doit être dans le futur.'), { status: 422, code: 'past_date' });
  }
}

// Tous les points d'entrée prennent ce même verrou avant de modifier l'agenda.
export async function withDoctorSchedule(doctorId, operation) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[doctor]] = await conn.execute('SELECT * FROM nova_doctors WHERE id=? FOR UPDATE', [doctorId]);
    if (!doctor) throw Object.assign(new Error('Médecin introuvable.'), {status:404});
    const result = await operation(conn, doctor);
    await conn.commit();
    return result;
  } catch (err) { await conn.rollback(); throw err; } finally {conn.release();}
}

export async function reserveMatchingSlot(conn, doctorId, startsAt, patientId) {
  const [rows] = await conn.execute('SELECT * FROM nova_doctor_slots WHERE doctor_id=? AND slot_date=? AND LEFT(slot_time,5)=? FOR UPDATE', [doctorId,startsAt.slice(0,10),startsAt.slice(11,16)]);
  if (rows.some(r=>r.status!=='available')) throw Object.assign(new Error('Créneau indisponible.'),{status:409});
  if(rows.length) await conn.execute("UPDATE nova_doctor_slots SET status='booked',patient_id=? WHERE id=?",[patientId,rows[0].id]);
}
