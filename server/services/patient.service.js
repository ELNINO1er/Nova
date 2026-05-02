import { randomUUID } from 'node:crypto';
import { db } from '../db/database.js';

export function getDashboard(patientId) {
  const profile = getProfile(patientId);
  const latestVitals = getDashboardVitals(patientId);
  const nextAppointment = db.prepare(`
    select * from appointments
    where patient_id = ? and starts_at >= ?
    order by starts_at asc
    limit 1
  `).get(patientId, new Date().toISOString());
  const todayMedications = getMedicationToday(patientId);
  const unreadMessages = db.prepare('select coalesce(sum(unread_count), 0) as total from conversations where patient_id = ?').get(patientId).total;
  const documentsCount = db.prepare('select count(*) as total from documents where patient_id = ?').get(patientId).total;

  return {
    profile,
    healthScore: calculateHealthScore(patientId, { latestVitals, todayMedications, nextAppointment }),
    latestVitals,
    nextAppointment: nextAppointment ? mapAppointment(nextAppointment) : null,
    todayMedications,
    unreadMessages,
    documentsCount,
  };
}

export function getProfile(patientId) {
  const row = db.prepare('select * from patients where id = ?').get(patientId);
  if (!row) return null;
  return mapPatient(row);
}

export function updateProfile(patientId, changes) {
  const current = getProfile(patientId);
  if (!current) return null;

  const next = {
    first_name: changes.firstName ?? current.firstName,
    last_name: changes.lastName ?? current.lastName,
    phone: changes.phone ?? current.phone,
    email: changes.email ?? current.email,
    address: changes.address ?? current.address,
    city: changes.city ?? current.city,
    weight_kg: changes.weightKg ?? current.weightKg,
    height_cm: changes.heightCm ?? current.heightCm,
    updated_at: new Date().toISOString(),
  };

  db.prepare(`
    update patients
    set first_name = ?, last_name = ?, phone = ?, email = ?, address = ?, city = ?,
        weight_kg = ?, height_cm = ?, updated_at = ?
    where id = ?
  `).run(next.first_name, next.last_name, next.phone, next.email, next.address, next.city, next.weight_kg, next.height_cm, next.updated_at, patientId);

  return getProfile(patientId);
}

export function getVitals(patientId, query) {
  const rows = query.type
    ? db.prepare('select * from vitals where patient_id = ? and type = ? order by measured_at desc').all(patientId, query.type)
    : db.prepare('select * from vitals where patient_id = ? order by measured_at desc').all(patientId);
  return rows.map(mapVital);
}

export function getTreatments(patientId) {
  const treatments = db.prepare('select * from treatments where patient_id = ? order by started_at desc').all(patientId);
  return treatments.map((treatment) => ({
    id: treatment.id,
    diagnosis: treatment.diagnosis,
    status: treatment.status,
    stage: treatment.stage,
    progress: treatment.progress,
    startedAt: treatment.started_at,
    doctorName: treatment.doctor_name,
    nextCheckupAt: treatment.next_checkup_at,
    medications: db.prepare('select * from medications where treatment_id = ?').all(treatment.id).map(mapMedication),
  }));
}

export function getMedicationToday(patientId) {
  const rows = db.prepare('select * from medication_schedules where patient_id = ? order by take_time asc').all(patientId);
  const today = new Date().toISOString().slice(0, 10);
  const intakes = db.prepare(`
    select schedule_id, status, taken_at from medication_intakes
    where patient_id = ? and substr(taken_at, 1, 10) = ?
  `).all(patientId, today);
  const intakeBySchedule = new Map(intakes.map((intake) => [intake.schedule_id, intake]));

  return rows.map((row) => ({
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

export function createMedicationIntake(patientId, scheduleId, payload) {
  const now = new Date().toISOString();
  const takenAt = payload.takenAt || now;
  const existing = db.prepare(`
    select id from medication_intakes
    where patient_id = ? and schedule_id = ? and substr(taken_at, 1, 10) = substr(?, 1, 10)
  `).get(patientId, scheduleId, takenAt);

  if (existing) {
    db.prepare('update medication_intakes set status = ?, taken_at = ? where id = ?').run(payload.status, takenAt, existing.id);
    return { id: existing.id, patientId, scheduleId, status: payload.status, takenAt };
  }

  const id = randomUUID();
  db.prepare(`
    insert into medication_intakes (id, patient_id, schedule_id, status, taken_at, created_at)
    values (?, ?, ?, ?, ?, ?)
  `).run(id, patientId, scheduleId, payload.status, takenAt, now);
  return { id, patientId, scheduleId, status: payload.status, takenAt };
}

export function getAppointments(patientId) {
  return db.prepare('select * from appointments where patient_id = ? order by starts_at asc').all(patientId).map(mapAppointment);
}

export function createAppointment(patientId, payload) {
  const id = randomUUID();
  db.prepare(`
    insert into appointments (id, patient_id, starts_at, doctor_name, specialty, location, mode, status)
    values (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, patientId, payload.startsAt, payload.doctorName, payload.specialty || '', payload.location || '', payload.mode || 'onsite', payload.status || 'requested');
  return getAppointment(patientId, id);
}

export function updateAppointment(patientId, id, changes) {
  const current = getAppointment(patientId, id);
  if (!current) return null;
  db.prepare(`
    update appointments
    set starts_at = ?, doctor_name = ?, specialty = ?, location = ?, mode = ?, status = ?
    where patient_id = ? and id = ?
  `).run(
    changes.startsAt ?? current.startsAt,
    changes.doctorName ?? current.doctorName,
    changes.specialty ?? current.specialty,
    changes.location ?? current.location,
    changes.mode ?? current.mode,
    changes.status ?? current.status,
    patientId,
    id,
  );
  return getAppointment(patientId, id);
}

export function deleteAppointment(patientId, id) {
  db.prepare('delete from appointments where patient_id = ? and id = ?').run(patientId, id);
}

export function getVaccinations(patientId) {
  return db.prepare('select * from vaccinations where patient_id = ? order by injected_at desc').all(patientId).map((row) => ({
    id: row.id,
    name: row.name,
    injectedAt: row.injected_at,
    status: row.status,
    nextDueAt: row.next_due_at,
  }));
}

export function getHistory(patientId) {
  return db.prepare('select * from medical_history where patient_id = ? order by occurred_at desc').all(patientId).map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    occurredAt: row.occurred_at,
    doctorName: row.doctor_name,
  }));
}

export function getDocuments(patientId, query) {
  const rows = query.category
    ? db.prepare('select * from documents where patient_id = ? and category = ? order by created_at desc').all(patientId, query.category)
    : db.prepare('select * from documents where patient_id = ? order by created_at desc').all(patientId);
  return rows.map(mapDocument);
}

export function createDocument(patientId, payload) {
  const id = randomUUID();
  db.prepare(`
    insert into documents (id, patient_id, title, category, mime_type, size_bytes, created_at)
    values (?, ?, ?, ?, ?, ?, ?)
  `).run(id, patientId, payload.title, payload.category, payload.mimeType || 'application/pdf', payload.sizeBytes || 0, new Date().toISOString());
  return mapDocument(db.prepare('select * from documents where id = ?').get(id));
}

export function deleteDocument(patientId, id) {
  db.prepare('delete from documents where patient_id = ? and id = ?').run(patientId, id);
}

export function getConversations(patientId) {
  return db.prepare('select * from conversations where patient_id = ? order by updated_at desc').all(patientId).map((row) => ({
    id: row.id,
    doctorName: row.doctor_name,
    unreadCount: row.unread_count,
    lastMessage: row.last_message,
    updatedAt: row.updated_at,
  }));
}

export function getNotes(patientId) {
  return db.prepare('select * from notes where patient_id = ? order by pinned desc, updated_at desc').all(patientId).map(mapNote);
}

export function createNote(patientId, payload) {
  const id = randomUUID();
  db.prepare(`
    insert into notes (id, patient_id, title, content, color, pinned, updated_at)
    values (?, ?, ?, ?, ?, ?, ?)
  `).run(id, patientId, payload.title, payload.content || '', payload.color || 'amber', payload.pinned ? 1 : 0, new Date().toISOString());
  return mapNote(db.prepare('select * from notes where id = ?').get(id));
}

export function updateNote(patientId, id, changes) {
  const current = db.prepare('select * from notes where patient_id = ? and id = ?').get(patientId, id);
  if (!current) return null;
  db.prepare(`
    update notes set title = ?, content = ?, color = ?, pinned = ?, updated_at = ?
    where patient_id = ? and id = ?
  `).run(
    changes.title ?? current.title,
    changes.content ?? current.content,
    changes.color ?? current.color,
    changes.pinned === undefined ? current.pinned : (changes.pinned ? 1 : 0),
    new Date().toISOString(),
    patientId,
    id,
  );
  return mapNote(db.prepare('select * from notes where id = ?').get(id));
}

export function deleteNote(patientId, id) {
  db.prepare('delete from notes where patient_id = ? and id = ?').run(patientId, id);
}

export function getSettings(patientId) {
  const row = db.prepare('select settings_json from patient_settings where patient_id = ?').get(patientId);
  return row ? JSON.parse(row.settings_json) : {};
}

export function updateSettings(patientId, changes) {
  const next = deepMerge(getSettings(patientId), changes);
  db.prepare(`
    insert into patient_settings (patient_id, settings_json, updated_at)
    values (?, ?, ?)
    on conflict(patient_id) do update set settings_json = excluded.settings_json, updated_at = excluded.updated_at
  `).run(patientId, JSON.stringify(next), new Date().toISOString());
  return next;
}

function getAppointment(patientId, id) {
  const row = db.prepare('select * from appointments where patient_id = ? and id = ?').get(patientId, id);
  return row ? mapAppointment(row) : null;
}

function getDashboardVitals(patientId) {
  const rows = db.prepare('select * from vitals where patient_id = ? order by measured_at asc').all(patientId);
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
          .map((point) => ({
            value: point.historyValue,
            measuredAt: point.measuredAt,
          }))
          .filter((point) => Number.isFinite(point.value)),
      };
    })
    .filter(Boolean);
}

function vitalToHistoryValue(vital) {
  if (vital.type === 'blood_pressure') {
    return Number(String(vital.value).split('/')[0]);
  }
  return Number(vital.value);
}

function getVitalStatus(vital) {
  const value = vitalToHistoryValue(vital);
  if (!Number.isFinite(value)) return 'normal';

  if (vital.type === 'blood_pressure') {
    if (value >= 15 || value <= 9) return 'critical';
    if (value >= 14 || value <= 10) return 'watch';
  }
  if (vital.type === 'blood_glucose') {
    if (value >= 1.26 || value < 0.7) return 'critical';
    if (value >= 1.1 || value < 0.8) return 'watch';
  }
  if (vital.type === 'heart_rate') {
    if (value >= 120 || value <= 45) return 'critical';
    if (value >= 100 || value <= 55) return 'watch';
  }
  if (vital.type === 'temperature') {
    if (value >= 39 || value <= 35) return 'critical';
    if (value >= 37.8 || value <= 36) return 'watch';
  }

  return 'normal';
}

function calculateHealthScore(patientId, { latestVitals, todayMedications, nextAppointment }) {
  const vitalPenalty = latestVitals.reduce((total, vital) => {
    if (vital.status === 'critical') return total + 12;
    if (vital.status === 'watch') return total + 5;
    return total;
  }, 0);

  const missedMedications = todayMedications.filter((medication) => medication.intake?.status === 'missed').length;
  const waitingMedications = todayMedications.filter((medication) => !medication.intake).length;
  const dueVaccines = db.prepare(`
    select count(*) as total from vaccinations
    where patient_id = ? and status = 'due_soon'
  `).get(patientId).total;

  const score = 100
    - vitalPenalty
    - missedMedications * 4
    - waitingMedications * 2
    - dueVaccines * 3
    - (nextAppointment ? 0 : 4);

  return Math.max(0, Math.min(100, score));
}

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
  return {
    id: row.id,
    name: row.name,
    dosage: row.dosage,
    frequency: row.frequency,
  };
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

function deepMerge(target, source) {
  const next = { ...target };
  for (const [key, value] of Object.entries(source)) {
    next[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? deepMerge(next[key] || {}, value)
      : value;
  }
  return next;
}
