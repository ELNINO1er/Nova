import { pool } from '../db/database.js';
import { notifyPatientMedicationReminder } from '../services/notification.service.js';

/*
 * Rappels de prise : toutes les 5 minutes, chaque prise programmée dont l'heure est arrivée (dans l'heure)
 * et qui n'a pas encore été renseignée aujourd'hui déclenche un seul rappel. Heure d'Abidjan = UTC.
 * Le réglage patient « Rappels de prise » est respecté par createNotification (catégorie medications).
 */
const EVERY_MS = 5 * 60 * 1000;
const WINDOW_MIN = 60;

export async function ensureReminderTable(conn = pool) {
  await conn.query(`CREATE TABLE IF NOT EXISTS nova_medication_reminders (
    schedule_id VARCHAR(36) NOT NULL, day CHAR(10) NOT NULL,
    sent_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (schedule_id, day))`);
}

export async function sendDueReminders(now = new Date()) {
  const day = now.toISOString().slice(0, 10);
  const minutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const [rows] = await pool.execute(
    `SELECT s.id, s.patient_id, s.name, s.dosage, s.take_time FROM nova_medication_schedules s
     JOIN nova_users u ON u.patient_id = s.patient_id AND u.deleted_at IS NULL AND u.disabled_at IS NULL
     WHERE (s.starts_on IS NULL OR s.starts_on <= ?) AND (s.ends_on IS NULL OR s.ends_on >= ?)
       AND NOT EXISTS (SELECT 1 FROM nova_medication_intakes i WHERE i.schedule_id = s.id AND i.taken_at LIKE ?)
       AND NOT EXISTS (SELECT 1 FROM nova_medication_reminders r WHERE r.schedule_id = s.id AND r.day = ?)`,
    [day, day, `${day}%`, day]);
  let sent = 0;
  for (const r of rows) {
    const [h, m] = String(r.take_time || '').split(':').map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) continue;
    const due = h * 60 + m;
    if (minutes < due || minutes > due + WINDOW_MIN) continue;
    // Réservation du rappel d'abord : jamais deux rappels pour la même prise, même avec plusieurs processus.
    const [ins] = await pool.execute('INSERT IGNORE INTO nova_medication_reminders (schedule_id, day) VALUES (?, ?)', [r.id, day]);
    if (!ins.affectedRows) continue;
    await notifyPatientMedicationReminder(r.patient_id, [r.name, r.dosage].filter(Boolean).join(' '), String(r.take_time).slice(0, 5));
    sent += 1;
  }
  return sent;
}

export function startMedicationReminders() {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try { await sendDueReminders(); } catch (e) { console.error('[rappels de prise]', e.message); } finally { running = false; }
  };
  ensureReminderTable().then(tick).catch((e) => console.error('[rappels de prise]', e.message));
  const timer = setInterval(tick, EVERY_MS);
  timer.unref?.();
  return () => clearInterval(timer);
}
