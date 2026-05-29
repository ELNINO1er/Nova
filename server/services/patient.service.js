import { randomUUID } from 'node:crypto';
import { pool } from '../db/database.js';

/* ─── Dashboard ─────────────────────────────────────────────── */

export async function getDashboard(patientId) {
  const [profile, latestVitals, todayMedications] = await Promise.all([
    getProfile(patientId),
    getDashboardVitals(patientId),
    getMedicationToday(patientId),
  ]);

  const [[nextRow]] = await pool.execute(
    `SELECT * FROM nova_appointments
     WHERE patient_id = ? AND starts_at >= ?
     ORDER BY starts_at ASC LIMIT 1`,
    [patientId, new Date().toISOString()]
  );
  const nextAppointment = nextRow ? mapAppointment(nextRow) : null;

  const [[{ total: unreadMessages }]] = await pool.execute(
    'SELECT COALESCE(SUM(unread_count), 0) AS total FROM nova_conversations WHERE patient_id = ?',
    [patientId]
  );
  const [[{ total: documentsCount }]] = await pool.execute(
    'SELECT COUNT(*) AS total FROM nova_documents WHERE patient_id = ?',
    [patientId]
  );

  return {
    profile,
    healthScore: await calculateHealthScore(patientId, { latestVitals, todayMedications, nextAppointment }),
    latestVitals,
    nextAppointment,
    todayMedications,
    unreadMessages: Number(unreadMessages),
    documentsCount: Number(documentsCount),
  };
}

/* ─── Profil ─────────────────────────────────────────────────── */

export async function getProfile(patientId) {
  const [[row]] = await pool.execute(
    'SELECT * FROM nova_patients WHERE id = ?', [patientId]
  );
  return row ? mapPatient(row) : null;
}

export async function updateProfile(patientId, changes) {
  const current = await getProfile(patientId);
  if (!current) return null;

  const next = {
    first_name:               changes.firstName             ?? current.firstName,
    last_name:                changes.lastName              ?? current.lastName,
    birth_date:               changes.birthDate             ?? current.birthDate,
    sex:                      changes.sex                   ?? current.sex,
    blood_type:               changes.bloodType             ?? current.bloodType,
    phone:                    changes.phone                 ?? current.phone,
    email:                    changes.email                 ?? current.email,
    address:                  changes.address               ?? current.address,
    city:                     changes.city                  ?? current.city,
    weight_kg:                changes.weightKg              ?? current.weightKg,
    height_cm:                changes.heightCm              ?? current.heightCm,
    emergency_name:           changes.emergencyName         ?? current.emergencyContact?.name,
    emergency_relationship:   changes.emergencyRelationship ?? current.emergencyContact?.relationship,
    emergency_phone:          changes.emergencyPhone        ?? current.emergencyContact?.phone,
    updated_at:               new Date().toISOString(),
  };

  await pool.execute(`
    UPDATE nova_patients
    SET first_name = ?, last_name = ?, birth_date = ?, sex = ?, blood_type = ?,
        phone = ?, email = ?, address = ?, city = ?,
        weight_kg = ?, height_cm = ?,
        emergency_name = ?, emergency_relationship = ?, emergency_phone = ?,
        updated_at = ?
    WHERE id = ?
  `, [
    next.first_name, next.last_name, next.birth_date, next.sex, next.blood_type,
    next.phone, next.email, next.address, next.city,
    next.weight_kg, next.height_cm,
    next.emergency_name, next.emergency_relationship, next.emergency_phone,
    next.updated_at, patientId,
  ]);

  return getProfile(patientId);
}

/* ─── Vitaux ─────────────────────────────────────────────────── */

export async function getVitals(patientId, query) {
  const [rows] = query.type
    ? await pool.execute(
        'SELECT * FROM nova_vitals WHERE patient_id = ? AND type = ? ORDER BY measured_at DESC',
        [patientId, query.type]
      )
    : await pool.execute(
        'SELECT * FROM nova_vitals WHERE patient_id = ? ORDER BY measured_at DESC',
        [patientId]
      );
  return rows.map(mapVital);
}

/* ─── Traitements ────────────────────────────────────────────── */

export async function getTreatments(patientId) {
  const [treatments] = await pool.execute(
    'SELECT * FROM nova_treatments WHERE patient_id = ? ORDER BY started_at DESC',
    [patientId]
  );
  return Promise.all(treatments.map(async (t) => {
    const [meds] = await pool.execute(
      'SELECT * FROM nova_medications WHERE treatment_id = ?', [t.id]
    );
    return {
      id: t.id,
      diagnosis: t.diagnosis,
      status: t.status,
      stage: t.stage,
      progress: t.progress,
      startedAt: t.started_at,
      doctorName: t.doctor_name,
      nextCheckupAt: t.next_checkup_at,
      medications: meds.map(mapMedication),
    };
  }));
}

/* ─── Médicaments ────────────────────────────────────────────── */

export async function getMedicationToday(patientId) {
  const [schedules] = await pool.execute(
    'SELECT * FROM nova_medication_schedules WHERE patient_id = ? ORDER BY take_time ASC',
    [patientId]
  );
  const today = new Date().toISOString().slice(0, 10);
  const [intakes] = await pool.execute(
    `SELECT schedule_id, status, taken_at FROM nova_medication_intakes
     WHERE patient_id = ? AND LEFT(taken_at, 10) = ?`,
    [patientId, today]
  );
  const intakeBySchedule = new Map(intakes.map((i) => [i.schedule_id, i]));

  return schedules.map((row) => ({
    id: row.id,
    medicationId: row.medication_id,
    name: row.name,
    dosage: row.dosage,
    time: row.take_time,
    period: row.period,
    color: row.color,
    interaction: Boolean(row.has_interaction),
    intake: intakeBySchedule.get(row.id) || null,
  }));
}

export async function createMedicationIntake(patientId, scheduleId, payload) {
  const now = new Date().toISOString();
  const takenAt = payload.takenAt || now;

  const [[existing]] = await pool.execute(
    `SELECT id FROM nova_medication_intakes
     WHERE patient_id = ? AND schedule_id = ? AND LEFT(taken_at, 10) = LEFT(?, 10)`,
    [patientId, scheduleId, takenAt]
  );

  if (existing) {
    await pool.execute(
      'UPDATE nova_medication_intakes SET status = ?, taken_at = ? WHERE id = ?',
      [payload.status, takenAt, existing.id]
    );
    return { id: existing.id, patientId, scheduleId, status: payload.status, takenAt };
  }

  const id = randomUUID();
  await pool.execute(
    `INSERT INTO nova_medication_intakes (id, patient_id, schedule_id, status, taken_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, patientId, scheduleId, payload.status, takenAt, now]
  );
  return { id, patientId, scheduleId, status: payload.status, takenAt };
}

/* ─── Rendez-vous ────────────────────────────────────────────── */

export async function getAppointments(patientId) {
  const [rows] = await pool.execute(
    'SELECT * FROM nova_appointments WHERE patient_id = ? ORDER BY starts_at ASC',
    [patientId]
  );
  return rows.map(mapAppointment);
}

export async function createAppointment(patientId, payload) {
  const id = randomUUID();
  await pool.execute(
    `INSERT INTO nova_appointments (id, patient_id, starts_at, doctor_name, specialty, location, mode, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, patientId, payload.startsAt, payload.doctorName,
     payload.specialty || '', payload.location || '', payload.mode || 'onsite', payload.status || 'requested']
  );
  return getAppointment(patientId, id);
}

export async function updateAppointment(patientId, id, changes) {
  const current = await getAppointment(patientId, id);
  if (!current) return null;
  await pool.execute(
    `UPDATE nova_appointments
     SET starts_at = ?, doctor_name = ?, specialty = ?, location = ?, mode = ?, status = ?
     WHERE patient_id = ? AND id = ?`,
    [
      changes.startsAt   ?? current.startsAt,
      changes.doctorName ?? current.doctorName,
      changes.specialty  ?? current.specialty,
      changes.location   ?? current.location,
      changes.mode       ?? current.mode,
      changes.status     ?? current.status,
      patientId, id,
    ]
  );
  return getAppointment(patientId, id);
}

export async function deleteAppointment(patientId, id) {
  await pool.execute(
    'DELETE FROM nova_appointments WHERE patient_id = ? AND id = ?', [patientId, id]
  );
}

/* ─── Vaccinations ───────────────────────────────────────────── */

export async function getVaccinations(patientId) {
  const [rows] = await pool.execute(
    'SELECT * FROM nova_vaccinations WHERE patient_id = ? ORDER BY injected_at DESC',
    [patientId]
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    injectedAt: row.injected_at,
    status: row.status,
    nextDueAt: row.next_due_at,
  }));
}

/* ─── Historique médical ─────────────────────────────────────── */

export async function getHistory(patientId) {
  const [rows] = await pool.execute(
    'SELECT * FROM nova_medical_history WHERE patient_id = ? ORDER BY occurred_at DESC',
    [patientId]
  );
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    occurredAt: row.occurred_at,
    doctorName: row.doctor_name,
  }));
}

/* ─── Documents ──────────────────────────────────────────────── */

export async function getDocuments(patientId, query) {
  const [rows] = query.category
    ? await pool.execute(
        'SELECT * FROM nova_documents WHERE patient_id = ? AND category = ? ORDER BY created_at DESC',
        [patientId, query.category]
      )
    : await pool.execute(
        'SELECT * FROM nova_documents WHERE patient_id = ? ORDER BY created_at DESC',
        [patientId]
      );
  return rows.map(mapDocument);
}

export async function createDocument(patientId, payload) {
  const id = randomUUID();
  await pool.execute(
    `INSERT INTO nova_documents (id, patient_id, title, category, mime_type, size_bytes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, patientId, payload.title, payload.category,
     payload.mimeType || 'application/pdf', payload.sizeBytes || 0, new Date().toISOString()]
  );
  const [[row]] = await pool.execute('SELECT * FROM nova_documents WHERE id = ?', [id]);
  return mapDocument(row);
}

export async function deleteDocument(patientId, id) {
  await pool.execute(
    'DELETE FROM nova_documents WHERE patient_id = ? AND id = ?', [patientId, id]
  );
}

/* ─── Conversations ──────────────────────────────────────────── */

export async function getConversations(patientId) {
  const [rows] = await pool.execute(
    'SELECT * FROM nova_conversations WHERE patient_id = ? ORDER BY updated_at DESC',
    [patientId]
  );
  return rows.map((row) => ({
    id: row.id,
    doctorName: row.doctor_name,
    unreadCount: row.unread_count,
    lastMessage: row.last_message,
    updatedAt: row.updated_at,
  }));
}

/* ─── Notes ──────────────────────────────────────────────────── */

export async function getNotes(patientId) {
  const [rows] = await pool.execute(
    'SELECT * FROM nova_notes WHERE patient_id = ? ORDER BY pinned DESC, updated_at DESC',
    [patientId]
  );
  return rows.map(mapNote);
}

export async function createNote(patientId, payload) {
  const id = randomUUID();
  await pool.execute(
    `INSERT INTO nova_notes (id, patient_id, title, content, color, pinned, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, patientId, payload.title, payload.content || '',
     payload.color || 'amber', payload.pinned ? 1 : 0, new Date().toISOString()]
  );
  const [[row]] = await pool.execute('SELECT * FROM nova_notes WHERE id = ?', [id]);
  return mapNote(row);
}

export async function updateNote(patientId, id, changes) {
  const [[current]] = await pool.execute(
    'SELECT * FROM nova_notes WHERE patient_id = ? AND id = ?', [patientId, id]
  );
  if (!current) return null;
  await pool.execute(
    `UPDATE nova_notes SET title = ?, content = ?, color = ?, pinned = ?, updated_at = ?
     WHERE patient_id = ? AND id = ?`,
    [
      changes.title   ?? current.title,
      changes.content ?? current.content,
      changes.color   ?? current.color,
      changes.pinned === undefined ? current.pinned : (changes.pinned ? 1 : 0),
      new Date().toISOString(),
      patientId, id,
    ]
  );
  const [[row]] = await pool.execute('SELECT * FROM nova_notes WHERE id = ?', [id]);
  return mapNote(row);
}

export async function deleteNote(patientId, id) {
  await pool.execute(
    'DELETE FROM nova_notes WHERE patient_id = ? AND id = ?', [patientId, id]
  );
}

/* ─── Paramètres ─────────────────────────────────────────────── */

export async function getSettings(patientId) {
  const [[row]] = await pool.execute(
    'SELECT settings_json FROM nova_patient_settings WHERE patient_id = ?', [patientId]
  );
  return row ? JSON.parse(row.settings_json) : {};
}

export async function updateSettings(patientId, changes) {
  const next = deepMerge(await getSettings(patientId), changes);
  await pool.execute(
    `INSERT INTO nova_patient_settings (patient_id, settings_json, updated_at) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE settings_json = VALUES(settings_json), updated_at = VALUES(updated_at)`,
    [patientId, JSON.stringify(next), new Date().toISOString()]
  );
  return next;
}

/* ─── Privées ────────────────────────────────────────────────── */

async function getAppointment(patientId, id) {
  const [[row]] = await pool.execute(
    'SELECT * FROM nova_appointments WHERE patient_id = ? AND id = ?', [patientId, id]
  );
  return row ? mapAppointment(row) : null;
}

async function getDashboardVitals(patientId) {
  const [rows] = await pool.execute(
    'SELECT * FROM nova_vitals WHERE patient_id = ? ORDER BY measured_at ASC',
    [patientId]
  );
  const byType = new Map();

  for (const row of rows) {
    const vital = mapVital(row);
    const historyValue = vitalToHistoryValue(vital);
    const items = byType.get(vital.type) || [];
    items.push({ ...vital, historyValue });
    byType.set(vital.type, items);
  }

  return ['blood_pressure', 'blood_glucose', 'heart_rate', 'temperature']
    .map((type) => {
      const history = byType.get(type) || [];
      const latest = history.at(-1);
      if (!latest) return null;
      return {
        id: latest.id,
        type: latest.type,
        label: latest.label,
        value: latest.value,
        unit: latest.unit,
        measuredAt: latest.measuredAt,
        status: getVitalStatus(latest),
        history: history
          .slice(-7)
          .map((p) => ({ value: p.historyValue, measuredAt: p.measuredAt }))
          .filter((p) => Number.isFinite(p.value)),
      };
    })
    .filter(Boolean);
}

async function calculateHealthScore(patientId, { latestVitals, todayMedications, nextAppointment }) {
  const vitalPenalty = latestVitals.reduce((total, v) => {
    if (v.status === 'critical') return total + 12;
    if (v.status === 'watch')    return total + 5;
    return total;
  }, 0);

  const missedMeds   = todayMedications.filter((m) => m.intake?.status === 'missed').length;
  const waitingMeds  = todayMedications.filter((m) => !m.intake).length;

  const [[{ total: dueVaccines }]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM nova_vaccinations WHERE patient_id = ? AND status = 'due_soon'`,
    [patientId]
  );

  const score = 100
    - vitalPenalty
    - missedMeds * 4
    - waitingMeds * 2
    - Number(dueVaccines) * 3
    - (nextAppointment ? 0 : 4);

  return Math.max(0, Math.min(100, score));
}

/* ─── Mappers ────────────────────────────────────────────────── */

function mapPatient(row) {
  return {
    id: row.id,
    cmuNumber: row.cmu_number,
    firstName: row.first_name,
    lastName: row.last_name,
    birthDate: row.birth_date,
    sex: row.sex,
    bloodType: row.blood_type,
    phone: row.phone,
    email: row.email,
    address: row.address,
    city: row.city,
    weightKg: row.weight_kg,
    heightCm: row.height_cm,
    emergencyContact: {
      name: row.emergency_name,
      relationship: row.emergency_relationship,
      phone: row.emergency_phone,
    },
  };
}

function mapVital(row) {
  const numeric = Number(row.value);
  return {
    id: row.id,
    type: row.type,
    label: row.label,
    value: Number.isNaN(numeric) ? row.value : numeric,
    unit: row.unit,
    measuredAt: row.measured_at,
  };
}

function mapMedication(row) {
  return { id: row.id, name: row.name, dosage: row.dosage, frequency: row.frequency };
}

function mapAppointment(row) {
  return {
    id: row.id,
    startsAt: row.starts_at,
    doctorName: row.doctor_name,
    specialty: row.specialty,
    location: row.location,
    mode: row.mode,
    status: row.status,
  };
}

function mapDocument(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
  };
}

function mapNote(row) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    color: row.color,
    pinned: Boolean(row.pinned),
    updatedAt: row.updated_at,
  };
}

/* ─── Helpers ────────────────────────────────────────────────── */

function vitalToHistoryValue(vital) {
  if (vital.type === 'blood_pressure') return Number(String(vital.value).split('/')[0]);
  return Number(vital.value);
}

function getVitalStatus(vital) {
  const value = vitalToHistoryValue(vital);
  if (!Number.isFinite(value)) return 'normal';
  if (vital.type === 'blood_pressure') {
    if (value >= 160 || value <= 90)  return 'critical';
    if (value >= 140 || value <= 100) return 'watch';
  }
  if (vital.type === 'blood_glucose') {
    if (value >= 1.26 || value < 0.7)  return 'critical';
    if (value >= 1.1  || value < 0.8)  return 'watch';
  }
  if (vital.type === 'heart_rate') {
    if (value >= 120 || value <= 45)  return 'critical';
    if (value >= 100 || value <= 55)  return 'watch';
  }
  if (vital.type === 'temperature') {
    if (value >= 39   || value <= 35) return 'critical';
    if (value >= 37.8 || value <= 36) return 'watch';
  }
  return 'normal';
}

function deepMerge(target, source) {
  const next = { ...target };
  for (const [key, value] of Object.entries(source)) {
    next[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? deepMerge(next[key] || {}, value)
      : value;
  }
  return next;
}
