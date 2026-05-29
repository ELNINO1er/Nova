import 'dotenv/config';
import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sika_sante',
  waitForConnections: true,
  connectionLimit: 10,
  timezone: '+00:00',
});

export async function initDb() {
  const conn = await pool.getConnection();
  try {
    await createTables(conn);
    await seedDemo(conn);
    await seedVitalHistory(conn);
  } finally {
    conn.release();
  }
}

async function createTables(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_patients (
      id VARCHAR(36) PRIMARY KEY,
      cmu_number VARCHAR(30) UNIQUE,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      birth_date VARCHAR(30),
      sex VARCHAR(10),
      blood_type VARCHAR(10),
      phone VARCHAR(30),
      email VARCHAR(191),
      address VARCHAR(255),
      city VARCHAR(100),
      weight_kg FLOAT,
      height_cm FLOAT,
      emergency_name VARCHAR(150),
      emergency_relationship VARCHAR(100),
      emergency_phone VARCHAR(30),
      updated_at VARCHAR(30) NOT NULL
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_vitals (
      id VARCHAR(36) PRIMARY KEY,
      patient_id VARCHAR(36) NOT NULL,
      type VARCHAR(50) NOT NULL,
      label VARCHAR(100) NOT NULL,
      value VARCHAR(50) NOT NULL,
      unit VARCHAR(20),
      measured_at VARCHAR(30) NOT NULL,
      INDEX idx_nv_patient (patient_id),
      INDEX idx_nv_measured (measured_at)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_treatments (
      id VARCHAR(36) PRIMARY KEY,
      patient_id VARCHAR(36) NOT NULL,
      diagnosis VARCHAR(255) NOT NULL,
      status VARCHAR(50) NOT NULL,
      stage VARCHAR(100),
      progress INT,
      started_at VARCHAR(30),
      doctor_name VARCHAR(150),
      next_checkup_at VARCHAR(30),
      INDEX idx_nt_patient (patient_id)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_medications (
      id VARCHAR(36) PRIMARY KEY,
      treatment_id VARCHAR(36) NOT NULL,
      name VARCHAR(150) NOT NULL,
      dosage VARCHAR(100),
      frequency VARCHAR(100),
      INDEX idx_nm_treatment (treatment_id)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_medication_schedules (
      id VARCHAR(36) PRIMARY KEY,
      patient_id VARCHAR(36) NOT NULL,
      medication_id VARCHAR(36) NOT NULL,
      name VARCHAR(150) NOT NULL,
      dosage VARCHAR(100),
      take_time VARCHAR(10) NOT NULL,
      period VARCHAR(20),
      color VARCHAR(30),
      has_interaction TINYINT(1) NOT NULL DEFAULT 0,
      INDEX idx_nms_patient (patient_id)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_medication_intakes (
      id VARCHAR(36) PRIMARY KEY,
      patient_id VARCHAR(36) NOT NULL,
      schedule_id VARCHAR(36) NOT NULL,
      status VARCHAR(20) NOT NULL,
      taken_at VARCHAR(30) NOT NULL,
      created_at VARCHAR(30) NOT NULL,
      INDEX idx_nmi_patient (patient_id),
      INDEX idx_nmi_taken (taken_at)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_appointments (
      id VARCHAR(36) PRIMARY KEY,
      patient_id VARCHAR(36) NOT NULL,
      starts_at VARCHAR(30) NOT NULL,
      doctor_name VARCHAR(150) NOT NULL,
      specialty VARCHAR(100),
      location VARCHAR(255),
      mode VARCHAR(20) NOT NULL,
      status VARCHAR(50) NOT NULL,
      INDEX idx_na_patient (patient_id),
      INDEX idx_na_starts (starts_at)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_vaccinations (
      id VARCHAR(36) PRIMARY KEY,
      patient_id VARCHAR(36) NOT NULL,
      name VARCHAR(200) NOT NULL,
      injected_at VARCHAR(20),
      status VARCHAR(50),
      next_due_at VARCHAR(20),
      INDEX idx_nvax_patient (patient_id)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_documents (
      id VARCHAR(36) PRIMARY KEY,
      patient_id VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(50) NOT NULL,
      mime_type VARCHAR(100),
      size_bytes INT,
      created_at VARCHAR(30) NOT NULL,
      INDEX idx_nd_patient (patient_id)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_conversations (
      id VARCHAR(36) PRIMARY KEY,
      patient_id VARCHAR(36) NOT NULL,
      doctor_name VARCHAR(150) NOT NULL,
      unread_count INT NOT NULL DEFAULT 0,
      last_message TEXT,
      updated_at VARCHAR(30) NOT NULL,
      INDEX idx_nc_patient (patient_id)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_medical_history (
      id VARCHAR(36) PRIMARY KEY,
      patient_id VARCHAR(36) NOT NULL,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      occurred_at VARCHAR(30) NOT NULL,
      doctor_name VARCHAR(150),
      INDEX idx_nmh_patient (patient_id)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_notes (
      id VARCHAR(36) PRIMARY KEY,
      patient_id VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      color VARCHAR(30) NOT NULL DEFAULT 'amber',
      pinned TINYINT(1) NOT NULL DEFAULT 0,
      updated_at VARCHAR(30) NOT NULL,
      INDEX idx_nn_patient (patient_id)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_patient_settings (
      patient_id VARCHAR(36) PRIMARY KEY,
      settings_json TEXT NOT NULL,
      updated_at VARCHAR(30) NOT NULL
    )
  `);
}

async function seedDemo(conn) {
  const [[existing]] = await conn.query(
    'SELECT id FROM nova_patients WHERE id = ?', ['patient-demo']
  );
  if (existing) return;

  const now = new Date().toISOString();

  await conn.query(`
    INSERT INTO nova_patients
      (id, cmu_number, first_name, last_name, birth_date, sex, blood_type,
       phone, email, address, city, weight_kg, height_cm,
       emergency_name, emergency_relationship, emergency_phone, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, ['patient-demo', 'CI-2024-0847-3692', 'Kouamé', 'Bamba', '1974-03-15', 'M', 'O+',
      '0789452311', 'k.bamba@example.ci', 'Cocody, Rue des Jardins', 'Abidjan',
      78, 175, 'Aya Bamba', 'Épouse', '0700112233', now]);

  await conn.query(`
    INSERT INTO nova_vitals (id, patient_id, type, label, value, unit, measured_at) VALUES
    ('vital-1','patient-demo','blood_pressure','Tension','12/8','mmHg','2026-04-28T07:30:00.000Z'),
    ('vital-2','patient-demo','blood_glucose','Glycémie','0.95','g/L','2026-04-28T07:35:00.000Z'),
    ('vital-3','patient-demo','heart_rate','Fréquence','72','bpm','2026-04-28T07:40:00.000Z'),
    ('vital-4','patient-demo','temperature','Température','36.8','°C','2026-04-28T07:45:00.000Z')
  `);

  await conn.query(`
    INSERT INTO nova_treatments
      (id, patient_id, diagnosis, status, stage, progress, started_at, doctor_name, next_checkup_at) VALUES
    ('treatment-1','patient-demo','Hypertension artérielle','active','Stade 1',75,'2024-01-08','Dr. Aïcha Touré','2026-05-02T14:30:00.000Z'),
    ('treatment-2','patient-demo','Diabète Type 2','controlled','Contrôlé',90,'2023-03-14','Dr. Mariam Bamba','2026-05-15T09:00:00.000Z')
  `);

  await conn.query(`
    INSERT INTO nova_medications (id, treatment_id, name, dosage, frequency) VALUES
    ('med-1','treatment-1','Amlodipine','5mg','1x/j'),
    ('med-2','treatment-1','Aspirine','100mg','1x/j'),
    ('med-3','treatment-2','Metformine','500mg','2x/j')
  `);

  await conn.query(`
    INSERT INTO nova_medication_schedules
      (id, patient_id, medication_id, name, dosage, take_time, period, color, has_interaction) VALUES
    ('schedule-1','patient-demo','med-1','Amlodipine','5mg','08:00','Matin','blue',0),
    ('schedule-2','patient-demo','med-3','Metformine','500mg','08:00','Matin','emerald',0),
    ('schedule-3','patient-demo','med-2','Aspirine','100mg','12:30','Midi','red',1),
    ('schedule-4','patient-demo','med-3','Metformine','500mg','20:00','Soir','emerald',0)
  `);

  await conn.query(`
    INSERT INTO nova_appointments
      (id, patient_id, starts_at, doctor_name, specialty, location, mode, status) VALUES
    ('apt-1','patient-demo','2026-05-02T14:30:00.000Z','Dr. Aïcha Touré','Cardiologie','CHU Treichville','onsite','confirmed'),
    ('apt-2','patient-demo','2026-05-15T09:00:00.000Z','Dr. Yao Konan','Médecine générale','Téléconsultation','video','confirmed'),
    ('apt-3','patient-demo','2026-05-28T11:00:00.000Z','Dr. Mariam Bamba','Endocrinologie','PISAM Cocody','onsite','confirmed')
  `);

  await conn.query(`
    INSERT INTO nova_vaccinations (id, patient_id, name, injected_at, status, next_due_at) VALUES
    ('vax-1','patient-demo','Tétanos','2026-04-02','up_to_date','2036-04-02'),
    ('vax-2','patient-demo','Hépatite B','2024-01-15','up_to_date',NULL),
    ('vax-3','patient-demo','Fièvre jaune','2020-06-20','up_to_date',NULL),
    ('vax-4','patient-demo','Méningite','2023-02-10','due_soon','2026-02-10')
  `);

  await conn.query(`
    INSERT INTO nova_documents (id, patient_id, title, category, mime_type, size_bytes, created_at) VALUES
    ('doc-1','patient-demo','Ordonnance cardiologie','prescription','application/pdf',245760,'2026-04-20T10:00:00.000Z'),
    ('doc-2','patient-demo','Analyse glycémie','lab','application/pdf',180224,'2026-04-18T08:00:00.000Z'),
    ('doc-3','patient-demo','Carnet vaccination','vaccine','application/pdf',98221,'2026-04-02T12:00:00.000Z')
  `);

  await conn.query(`
    INSERT INTO nova_conversations (id, patient_id, doctor_name, unread_count, last_message, updated_at) VALUES
    ('conv-1','patient-demo','Dr. Aïcha Touré',2,'Merci de surveiller votre tension.','2026-04-28T09:00:00.000Z'),
    ('conv-2','patient-demo','Dr. Yao Konan',1,'Votre rendez-vous est confirmé.','2026-04-27T15:10:00.000Z')
  `);

  await conn.query(`
    INSERT INTO nova_medical_history (id, patient_id, type, title, occurred_at, doctor_name) VALUES
    ('history-1','patient-demo','consultation','Consultation cardiologie','2026-04-20T09:30:00.000Z','Dr. Aïcha Touré'),
    ('history-2','patient-demo','lab','Bilan sanguin','2026-04-18T07:45:00.000Z','Laboratoire PISAM')
  `);

  await conn.query(`
    INSERT INTO nova_notes (id, patient_id, title, content, color, pinned, updated_at) VALUES
    ('note-1','patient-demo','Questions cardiologue','Parler des palpitations matinales.','amber',1,'2026-04-28T08:00:00.000Z'),
    ('note-2','patient-demo','Alimentation','Réduire le sel cette semaine.','emerald',0,'2026-04-27T16:00:00.000Z')
  `);

  await conn.query(`
    INSERT INTO nova_patient_settings (patient_id, settings_json, updated_at) VALUES (?, ?, ?)
  `, ['patient-demo', JSON.stringify({
    notifications: { appointments: true, medications: true, messages: true },
    privacy: { emergencyQr: true, shareWithDoctors: true },
    display: { language: 'fr', density: 'comfortable' },
  }), now]);
}

async function seedVitalHistory(conn) {
  const vitals = [
    ['vital-bp-20260422','patient-demo','blood_pressure','Tension','12/8','mmHg','2026-04-22T07:30:00.000Z'],
    ['vital-bp-20260423','patient-demo','blood_pressure','Tension','13/8','mmHg','2026-04-23T07:30:00.000Z'],
    ['vital-bp-20260424','patient-demo','blood_pressure','Tension','12/8','mmHg','2026-04-24T07:30:00.000Z'],
    ['vital-bp-20260425','patient-demo','blood_pressure','Tension','12/7','mmHg','2026-04-25T07:30:00.000Z'],
    ['vital-bp-20260426','patient-demo','blood_pressure','Tension','13/8','mmHg','2026-04-26T07:30:00.000Z'],
    ['vital-bp-20260427','patient-demo','blood_pressure','Tension','12/8','mmHg','2026-04-27T07:30:00.000Z'],
    ['vital-glucose-20260422','patient-demo','blood_glucose','Glycémie','1.10','g/L','2026-04-22T07:35:00.000Z'],
    ['vital-glucose-20260423','patient-demo','blood_glucose','Glycémie','1.05','g/L','2026-04-23T07:35:00.000Z'],
    ['vital-glucose-20260424','patient-demo','blood_glucose','Glycémie','1.00','g/L','2026-04-24T07:35:00.000Z'],
    ['vital-glucose-20260425','patient-demo','blood_glucose','Glycémie','0.98','g/L','2026-04-25T07:35:00.000Z'],
    ['vital-glucose-20260426','patient-demo','blood_glucose','Glycémie','0.97','g/L','2026-04-26T07:35:00.000Z'],
    ['vital-glucose-20260427','patient-demo','blood_glucose','Glycémie','0.96','g/L','2026-04-27T07:35:00.000Z'],
    ['vital-heart-20260422','patient-demo','heart_rate','Fréquence','70','bpm','2026-04-22T07:40:00.000Z'],
    ['vital-heart-20260423','patient-demo','heart_rate','Fréquence','72','bpm','2026-04-23T07:40:00.000Z'],
    ['vital-heart-20260424','patient-demo','heart_rate','Fréquence','71','bpm','2026-04-24T07:40:00.000Z'],
    ['vital-heart-20260425','patient-demo','heart_rate','Fréquence','73','bpm','2026-04-25T07:40:00.000Z'],
    ['vital-heart-20260426','patient-demo','heart_rate','Fréquence','72','bpm','2026-04-26T07:40:00.000Z'],
    ['vital-heart-20260427','patient-demo','heart_rate','Fréquence','71','bpm','2026-04-27T07:40:00.000Z'],
    ['vital-temp-20260422','patient-demo','temperature','Température','36.7','°C','2026-04-22T07:45:00.000Z'],
    ['vital-temp-20260423','patient-demo','temperature','Température','36.8','°C','2026-04-23T07:45:00.000Z'],
    ['vital-temp-20260424','patient-demo','temperature','Température','36.9','°C','2026-04-24T07:45:00.000Z'],
    ['vital-temp-20260425','patient-demo','temperature','Température','36.8','°C','2026-04-25T07:45:00.000Z'],
    ['vital-temp-20260426','patient-demo','temperature','Température','36.7','°C','2026-04-26T07:45:00.000Z'],
    ['vital-temp-20260427','patient-demo','temperature','Température','36.8','°C','2026-04-27T07:45:00.000Z'],
  ];

  for (const row of vitals) {
    await conn.query(
      `INSERT IGNORE INTO nova_vitals (id, patient_id, type, label, value, unit, measured_at) VALUES (?,?,?,?,?,?,?)`,
      row
    );
  }
}
