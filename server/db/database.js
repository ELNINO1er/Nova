import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '..', '..', 'data', 'nova.sqlite');

mkdirSync(dirname(dbPath), { recursive: true });

export const db = new DatabaseSync(dbPath);

db.exec(`
  create table if not exists patients (
    id text primary key,
    cmu_number text unique,
    first_name text not null,
    last_name text not null,
    birth_date text,
    sex text,
    blood_type text,
    phone text,
    email text,
    address text,
    city text,
    weight_kg real,
    height_cm real,
    emergency_name text,
    emergency_relationship text,
    emergency_phone text,
    updated_at text not null
  );

  create table if not exists vitals (
    id text primary key,
    patient_id text not null,
    type text not null,
    label text not null,
    value text not null,
    unit text,
    measured_at text not null
  );

  create table if not exists treatments (
    id text primary key,
    patient_id text not null,
    diagnosis text not null,
    status text not null,
    stage text,
    progress integer,
    started_at text,
    doctor_name text,
    next_checkup_at text
  );

  create table if not exists medications (
    id text primary key,
    treatment_id text not null,
    name text not null,
    dosage text,
    frequency text
  );

  create table if not exists medication_schedules (
    id text primary key,
    patient_id text not null,
    medication_id text not null,
    name text not null,
    dosage text,
    take_time text not null,
    period text,
    color text,
    has_interaction integer not null default 0
  );

  create table if not exists medication_intakes (
    id text primary key,
    patient_id text not null,
    schedule_id text not null,
    status text not null,
    taken_at text not null,
    created_at text not null
  );

  create table if not exists appointments (
    id text primary key,
    patient_id text not null,
    starts_at text not null,
    doctor_name text not null,
    specialty text,
    location text,
    mode text not null,
    status text not null
  );

  create table if not exists vaccinations (
    id text primary key,
    patient_id text not null,
    name text not null,
    injected_at text,
    status text,
    next_due_at text
  );

  create table if not exists documents (
    id text primary key,
    patient_id text not null,
    title text not null,
    category text not null,
    mime_type text,
    size_bytes integer,
    created_at text not null
  );

  create table if not exists conversations (
    id text primary key,
    patient_id text not null,
    doctor_name text not null,
    unread_count integer not null default 0,
    last_message text,
    updated_at text not null
  );

  create table if not exists medical_history (
    id text primary key,
    patient_id text not null,
    type text not null,
    title text not null,
    occurred_at text not null,
    doctor_name text
  );

  create table if not exists notes (
    id text primary key,
    patient_id text not null,
    title text not null,
    content text not null default '',
    color text not null default 'amber',
    pinned integer not null default 0,
    updated_at text not null
  );

  create table if not exists patient_settings (
    patient_id text primary key,
    settings_json text not null,
    updated_at text not null
  );
`);

seed();
normalizeReferenceData();
seedVitalHistory();

function seed() {
  const exists = db.prepare('select id from patients where id = ?').get('patient-demo');
  if (exists) return;

  const now = new Date().toISOString();
  db.prepare(`
    insert into patients values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('patient-demo', 'CI-2024-0847-3692', 'Kouamé', 'Bamba', '1974-03-15', 'M', 'O+', '0789452311', 'k.bamba@example.ci', 'Cocody, Rue des Jardins', 'Abidjan', 78, 175, 'Aya Bamba', 'Épouse', '0700112233', now);

  insertMany('vitals', ['id', 'patient_id', 'type', 'label', 'value', 'unit', 'measured_at'], [
    ['vital-1', 'patient-demo', 'blood_pressure', 'Tension', '12/8', 'mmHg', '2026-04-28T07:30:00.000Z'],
    ['vital-2', 'patient-demo', 'blood_glucose', 'Glycémie', '0.95', 'g/L', '2026-04-28T07:35:00.000Z'],
    ['vital-3', 'patient-demo', 'heart_rate', 'Fréquence', '72', 'bpm', '2026-04-28T07:40:00.000Z'],
    ['vital-4', 'patient-demo', 'temperature', 'Température', '36.8', '°C', '2026-04-28T07:45:00.000Z'],
  ]);

  insertMany('treatments', ['id', 'patient_id', 'diagnosis', 'status', 'stage', 'progress', 'started_at', 'doctor_name', 'next_checkup_at'], [
    ['treatment-1', 'patient-demo', 'Hypertension artérielle', 'active', 'Stade 1', 75, '2024-01-08', 'Dr. Aïcha Touré', '2026-05-02T14:30:00.000Z'],
    ['treatment-2', 'patient-demo', 'Diabète Type 2', 'controlled', 'Contrôlé', 90, '2023-03-14', 'Dr. Mariam Bamba', '2026-05-15T09:00:00.000Z'],
  ]);

  insertMany('medications', ['id', 'treatment_id', 'name', 'dosage', 'frequency'], [
    ['med-1', 'treatment-1', 'Amlodipine', '5mg', '1x/j'],
    ['med-2', 'treatment-1', 'Aspirine', '100mg', '1x/j'],
    ['med-3', 'treatment-2', 'Metformine', '500mg', '2x/j'],
  ]);

  insertMany('medication_schedules', ['id', 'patient_id', 'medication_id', 'name', 'dosage', 'take_time', 'period', 'color', 'has_interaction'], [
    ['schedule-1', 'patient-demo', 'med-1', 'Amlodipine', '5mg', '08:00', 'Matin', 'blue', 0],
    ['schedule-2', 'patient-demo', 'med-3', 'Metformine', '500mg', '08:00', 'Matin', 'emerald', 0],
    ['schedule-3', 'patient-demo', 'med-2', 'Aspirine', '100mg', '12:30', 'Midi', 'red', 1],
    ['schedule-4', 'patient-demo', 'med-3', 'Metformine', '500mg', '20:00', 'Soir', 'emerald', 0],
  ]);

  insertMany('appointments', ['id', 'patient_id', 'starts_at', 'doctor_name', 'specialty', 'location', 'mode', 'status'], [
    ['apt-1', 'patient-demo', '2026-05-02T14:30:00.000Z', 'Dr. Aïcha Touré', 'Cardiologie', 'CHU Treichville', 'onsite', 'confirmed'],
    ['apt-2', 'patient-demo', '2026-05-15T09:00:00.000Z', 'Dr. Yao Konan', 'Médecine générale', 'Téléconsultation', 'video', 'confirmed'],
    ['apt-3', 'patient-demo', '2026-05-28T11:00:00.000Z', 'Dr. Mariam Bamba', 'Endocrinologie', 'PISAM Cocody', 'onsite', 'confirmed'],
  ]);

  insertMany('vaccinations', ['id', 'patient_id', 'name', 'injected_at', 'status', 'next_due_at'], [
    ['vax-1', 'patient-demo', 'Tétanos', '2026-04-02', 'up_to_date', '2036-04-02'],
    ['vax-2', 'patient-demo', 'Hépatite B', '2024-01-15', 'up_to_date', null],
    ['vax-3', 'patient-demo', 'Fièvre jaune', '2020-06-20', 'up_to_date', null],
    ['vax-4', 'patient-demo', 'Méningite', '2023-02-10', 'due_soon', '2026-02-10'],
  ]);

  insertMany('documents', ['id', 'patient_id', 'title', 'category', 'mime_type', 'size_bytes', 'created_at'], [
    ['doc-1', 'patient-demo', 'Ordonnance cardiologie', 'prescription', 'application/pdf', 245760, '2026-04-20T10:00:00.000Z'],
    ['doc-2', 'patient-demo', 'Analyse glycémie', 'lab', 'application/pdf', 180224, '2026-04-18T08:00:00.000Z'],
    ['doc-3', 'patient-demo', 'Carnet vaccination', 'vaccine', 'application/pdf', 98221, '2026-04-02T12:00:00.000Z'],
  ]);

  insertMany('conversations', ['id', 'patient_id', 'doctor_name', 'unread_count', 'last_message', 'updated_at'], [
    ['conv-1', 'patient-demo', 'Dr. Aïcha Touré', 2, 'Merci de surveiller votre tension.', '2026-04-28T09:00:00.000Z'],
    ['conv-2', 'patient-demo', 'Dr. Yao Konan', 1, 'Votre rendez-vous est confirmé.', '2026-04-27T15:10:00.000Z'],
  ]);

  insertMany('medical_history', ['id', 'patient_id', 'type', 'title', 'occurred_at', 'doctor_name'], [
    ['history-1', 'patient-demo', 'consultation', 'Consultation cardiologie', '2026-04-20T09:30:00.000Z', 'Dr. Aïcha Touré'],
    ['history-2', 'patient-demo', 'lab', 'Bilan sanguin', '2026-04-18T07:45:00.000Z', 'Laboratoire PISAM'],
  ]);

  insertMany('notes', ['id', 'patient_id', 'title', 'content', 'color', 'pinned', 'updated_at'], [
    ['note-1', 'patient-demo', 'Questions cardiologue', 'Parler des palpitations matinales.', 'amber', 1, '2026-04-28T08:00:00.000Z'],
    ['note-2', 'patient-demo', 'Alimentation', 'Réduire le sel cette semaine.', 'emerald', 0, '2026-04-27T16:00:00.000Z'],
  ]);

  db.prepare('insert into patient_settings values (?, ?, ?)').run('patient-demo', JSON.stringify({
    notifications: { appointments: true, medications: true, messages: true },
    privacy: { emergencyQr: true, shareWithDoctors: true },
    display: { language: 'fr', density: 'comfortable' },
  }), now);
}

function insertMany(table, columns, rows) {
  const placeholders = columns.map(() => '?').join(', ');
  const stmt = db.prepare(`insert into ${table} (${columns.join(', ')}) values (${placeholders})`);
  for (const row of rows) stmt.run(...row);
}

function normalizeReferenceData() {
  db.prepare("update vitals set label = 'Glycémie' where type = 'blood_glucose'").run();
  db.prepare("update vitals set label = 'Fréquence' where type = 'heart_rate'").run();
  db.prepare("update vitals set label = 'Température', unit = '°C' where type = 'temperature'").run();
}

function seedVitalHistory() {
  insertOrIgnoreMany('vitals', ['id', 'patient_id', 'type', 'label', 'value', 'unit', 'measured_at'], [
    ['vital-bp-20260422', 'patient-demo', 'blood_pressure', 'Tension', '12/8', 'mmHg', '2026-04-22T07:30:00.000Z'],
    ['vital-bp-20260423', 'patient-demo', 'blood_pressure', 'Tension', '13/8', 'mmHg', '2026-04-23T07:30:00.000Z'],
    ['vital-bp-20260424', 'patient-demo', 'blood_pressure', 'Tension', '12/8', 'mmHg', '2026-04-24T07:30:00.000Z'],
    ['vital-bp-20260425', 'patient-demo', 'blood_pressure', 'Tension', '12/7', 'mmHg', '2026-04-25T07:30:00.000Z'],
    ['vital-bp-20260426', 'patient-demo', 'blood_pressure', 'Tension', '13/8', 'mmHg', '2026-04-26T07:30:00.000Z'],
    ['vital-bp-20260427', 'patient-demo', 'blood_pressure', 'Tension', '12/8', 'mmHg', '2026-04-27T07:30:00.000Z'],

    ['vital-glucose-20260422', 'patient-demo', 'blood_glucose', 'Glycémie', '1.10', 'g/L', '2026-04-22T07:35:00.000Z'],
    ['vital-glucose-20260423', 'patient-demo', 'blood_glucose', 'Glycémie', '1.05', 'g/L', '2026-04-23T07:35:00.000Z'],
    ['vital-glucose-20260424', 'patient-demo', 'blood_glucose', 'Glycémie', '1.00', 'g/L', '2026-04-24T07:35:00.000Z'],
    ['vital-glucose-20260425', 'patient-demo', 'blood_glucose', 'Glycémie', '0.98', 'g/L', '2026-04-25T07:35:00.000Z'],
    ['vital-glucose-20260426', 'patient-demo', 'blood_glucose', 'Glycémie', '0.97', 'g/L', '2026-04-26T07:35:00.000Z'],
    ['vital-glucose-20260427', 'patient-demo', 'blood_glucose', 'Glycémie', '0.96', 'g/L', '2026-04-27T07:35:00.000Z'],

    ['vital-heart-20260422', 'patient-demo', 'heart_rate', 'Fréquence', '70', 'bpm', '2026-04-22T07:40:00.000Z'],
    ['vital-heart-20260423', 'patient-demo', 'heart_rate', 'Fréquence', '72', 'bpm', '2026-04-23T07:40:00.000Z'],
    ['vital-heart-20260424', 'patient-demo', 'heart_rate', 'Fréquence', '71', 'bpm', '2026-04-24T07:40:00.000Z'],
    ['vital-heart-20260425', 'patient-demo', 'heart_rate', 'Fréquence', '73', 'bpm', '2026-04-25T07:40:00.000Z'],
    ['vital-heart-20260426', 'patient-demo', 'heart_rate', 'Fréquence', '72', 'bpm', '2026-04-26T07:40:00.000Z'],
    ['vital-heart-20260427', 'patient-demo', 'heart_rate', 'Fréquence', '71', 'bpm', '2026-04-27T07:40:00.000Z'],

    ['vital-temp-20260422', 'patient-demo', 'temperature', 'Température', '36.7', '°C', '2026-04-22T07:45:00.000Z'],
    ['vital-temp-20260423', 'patient-demo', 'temperature', 'Température', '36.8', '°C', '2026-04-23T07:45:00.000Z'],
    ['vital-temp-20260424', 'patient-demo', 'temperature', 'Température', '36.9', '°C', '2026-04-24T07:45:00.000Z'],
    ['vital-temp-20260425', 'patient-demo', 'temperature', 'Température', '36.8', '°C', '2026-04-25T07:45:00.000Z'],
    ['vital-temp-20260426', 'patient-demo', 'temperature', 'Température', '36.7', '°C', '2026-04-26T07:45:00.000Z'],
    ['vital-temp-20260427', 'patient-demo', 'temperature', 'Température', '36.8', '°C', '2026-04-27T07:45:00.000Z'],
  ]);
}

function insertOrIgnoreMany(table, columns, rows) {
  const placeholders = columns.map(() => '?').join(', ');
  const stmt = db.prepare(`insert or ignore into ${table} (${columns.join(', ')}) values (${placeholders})`);
  for (const row of rows) stmt.run(...row);
}
