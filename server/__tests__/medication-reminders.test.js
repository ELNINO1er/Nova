import './isolated-db.js';
// Rappels de prise : un seul rappel par prise et par jour, rien si la prise est déjà renseignée.
import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';

const db = await import('../db/database.js');
await db.initDb();
const doctorSvc = await import('../services/doctor.service.js');
const { ensureReminderTable, sendDueReminders } = await import('../jobs/medication-reminders.js');

let pool, A, userA;
const S1 = randomUUID(), S2 = randomUUID();
const now = new Date();
const hhmm = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;

beforeAll(async () => {
  pool = db.pool;
  await ensureReminderTable();
  const c = await doctorSvc.createPatientByDoctor('doc-005', { firstName: 'Patiente', lastName: 'Rappel', phone: `04${String(Date.now()).slice(-8)}` });
  A = c.patientId; userA = c.userId;
  for (const [id, name] of [[S1, 'Metformine'], [S2, 'Amlodipine']])
    await pool.execute('INSERT INTO nova_medication_schedules (id, patient_id, medication_id, name, dosage, take_time) VALUES (?, ?, ?, ?, ?, ?)', [id, A, randomUUID(), name, '1 cp', hhmm]);
  await pool.execute("INSERT INTO nova_medication_intakes (id, patient_id, schedule_id, status, taken_at, created_at) VALUES (?, ?, ?, 'taken', ?, ?)", [randomUUID(), A, S2, now.toISOString(), now.toISOString()]);
});

afterAll(async () => {
  await pool.query('DELETE FROM nova_medication_reminders WHERE schedule_id IN (?, ?)', [S1, S2]);
  for (const t of ['nova_medication_intakes', 'nova_medication_schedules', 'nova_notifications', 'nova_medical_profile'])
    await pool.query(`DELETE FROM ${t} WHERE patient_id = ?`, [A]).catch(() => {});
  await pool.query('DELETE FROM nova_users WHERE id = ?', [userA]);
  await pool.query('DELETE FROM nova_patients WHERE id = ?', [A]);
  await pool.end();
});

describe('Rappels de prise', () => {
  it('rappelle une seule fois la prise non renseignée, pas celle déjà prise', async () => {
    await sendDueReminders(now);
    await sendDueReminders(now);
    const [rows] = await pool.execute("SELECT body FROM nova_notifications WHERE patient_id = ? AND type = 'medication'", [A]);
    expect(rows).toHaveLength(1);
    expect(rows[0].body).toContain('Metformine');
  });
});
