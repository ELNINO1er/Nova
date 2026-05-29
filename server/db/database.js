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
      file_path VARCHAR(500),
      created_at VARCHAR(30) NOT NULL,
      INDEX idx_nd_patient (patient_id)
    )
  `);
  // migration : ajouter file_path si table existait déjà sans cette colonne
  await conn.query(`ALTER TABLE nova_documents ADD COLUMN file_path VARCHAR(500)`).catch(() => {});

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_lab_results (
      id VARCHAR(36) PRIMARY KEY,
      patient_id VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      lab_name VARCHAR(150),
      ordered_by VARCHAR(150),
      performed_at VARCHAR(30) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'available',
      notes TEXT,
      INDEX idx_nlr_patient (patient_id),
      INDEX idx_nlr_performed (performed_at)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_lab_result_items (
      id VARCHAR(36) PRIMARY KEY,
      lab_result_id VARCHAR(36) NOT NULL,
      name VARCHAR(150) NOT NULL,
      value VARCHAR(50) NOT NULL,
      unit VARCHAR(30),
      ref_min VARCHAR(30),
      ref_max VARCHAR(30),
      status VARCHAR(20) NOT NULL DEFAULT 'normal',
      INDEX idx_nlri_result (lab_result_id)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_medical_profile (
      patient_id VARCHAR(36) PRIMARY KEY,
      allergies JSON NOT NULL,
      chronic_diseases JSON NOT NULL,
      family_history JSON NOT NULL,
      surgical_history JSON NOT NULL,
      updated_at VARCHAR(30) NOT NULL
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_conversations (
      id VARCHAR(36) PRIMARY KEY,
      patient_id VARCHAR(36) NOT NULL,
      doctor_name VARCHAR(150) NOT NULL,
      doctor_specialty VARCHAR(100),
      unread_count INT NOT NULL DEFAULT 0,
      last_message TEXT,
      updated_at VARCHAR(30) NOT NULL,
      INDEX idx_nc_patient (patient_id)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_messages (
      id VARCHAR(36) PRIMARY KEY,
      conversation_id VARCHAR(36) NOT NULL,
      sender_role VARCHAR(20) NOT NULL,
      body TEXT NOT NULL,
      attachment_name VARCHAR(255),
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      created_at VARCHAR(30) NOT NULL,
      INDEX idx_nmsg_conv (conversation_id),
      INDEX idx_nmsg_created (created_at)
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
    CREATE TABLE IF NOT EXISTS nova_prescriptions (
      id VARCHAR(36) PRIMARY KEY,
      patient_id VARCHAR(36) NOT NULL,
      doctor_name VARCHAR(150) NOT NULL,
      doctor_specialty VARCHAR(100),
      issued_at VARCHAR(30) NOT NULL,
      valid_until VARCHAR(30),
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      notes TEXT,
      INDEX idx_np_patient (patient_id),
      INDEX idx_np_issued (issued_at)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS nova_prescription_items (
      id VARCHAR(36) PRIMARY KEY,
      prescription_id VARCHAR(36) NOT NULL,
      name VARCHAR(150) NOT NULL,
      dosage VARCHAR(100),
      frequency VARCHAR(150),
      duration VARCHAR(100),
      instructions TEXT,
      INDEX idx_npi_prescription (prescription_id)
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
    INSERT INTO nova_conversations (id, patient_id, doctor_name, doctor_specialty, unread_count, last_message, updated_at) VALUES
    ('conv-1','patient-demo','Dr. Aïcha Touré','Cardiologie',2,'Merci de surveiller votre tension.','2026-04-28T09:00:00.000Z'),
    ('conv-2','patient-demo','Dr. Yao Konan','Médecine générale',1,'Votre rendez-vous est confirmé pour le 15 mai.','2026-04-27T15:10:00.000Z'),
    ('conv-3','patient-demo','Dr. Mariam Bamba','Endocrinologie',0,'À bientôt pour le suivi.','2026-04-20T11:00:00.000Z')
  `);

  await conn.query(`
    INSERT INTO nova_messages (id, conversation_id, sender_role, body, is_read, created_at) VALUES
    ('msg-1','conv-1','patient','Bonjour Docteur, j'ai mesuré ma tension ce matin : 14/9. Est-ce que c'est inquiétant ?',1,'2026-04-28T07:45:00.000Z'),
    ('msg-2','conv-1','doctor','Bonjour Kouamé. Cette valeur est légèrement élevée. Avez-vous bien pris votre Amlodipine ce matin ?',1,'2026-04-28T08:15:00.000Z'),
    ('msg-3','conv-1','patient','Oui, je l'ai prise à 8h comme d'habitude.',1,'2026-04-28T08:30:00.000Z'),
    ('msg-4','conv-1','doctor','Très bien. Surveillez votre tension ce soir. Si elle dépasse 16/10, contactez-moi immédiatement.',0,'2026-04-28T08:45:00.000Z'),
    ('msg-5','conv-1','doctor','Merci de surveiller votre tension.',0,'2026-04-28T09:00:00.000Z'),
    ('msg-6','conv-2','doctor','Bonjour, je confirme votre rendez-vous du 15 mai à 9h00 pour votre bilan de santé.',1,'2026-04-27T14:00:00.000Z'),
    ('msg-7','conv-2','patient','Merci Docteur, je serai présent.',1,'2026-04-27T14:30:00.000Z'),
    ('msg-8','conv-2','doctor','Votre rendez-vous est confirmé pour le 15 mai. Pensez à venir à jeun pour les analyses.',0,'2026-04-27T15:10:00.000Z'),
    ('msg-9','conv-3','patient','Docteur, est-ce que je dois modifier ma dose de Metformine ? Ma glycémie était à 1.10 hier.',1,'2026-04-20T10:30:00.000Z'),
    ('msg-10','conv-3','doctor','Non, ne modifiez pas la dose sans consultation. Continuez à 500mg et notez vos mesures. À bientôt pour le suivi.',1,'2026-04-20T11:00:00.000Z')
  `);

  await conn.query(`
    INSERT INTO nova_medical_history (id, patient_id, type, title, occurred_at, doctor_name) VALUES
    ('history-1','patient-demo','consultation','Consultation cardiologie','2026-04-20T09:30:00.000Z','Dr. Aïcha Touré'),
    ('history-2','patient-demo','lab','Bilan sanguin','2026-04-18T07:45:00.000Z','Laboratoire PISAM')
  `);

  await conn.query(`
    INSERT INTO nova_lab_results (id, patient_id, title, lab_name, ordered_by, performed_at, status, notes) VALUES
    ('lr-1','patient-demo','Bilan métabolique complet','Laboratoire PISAM','Dr. Mariam Bamba','2026-04-18T07:45:00.000Z','available','Prélèvement à jeun depuis 12h.'),
    ('lr-2','patient-demo','Numération formule sanguine (NFS)','Laboratoire PISAM','Dr. Aïcha Touré','2026-03-10T08:00:00.000Z','reviewed','Résultats normaux dans l''ensemble.'),
    ('lr-3','patient-demo','Bilan lipidique','Laboratoire CHU Treichville','Dr. Yao Konan','2026-01-22T07:30:00.000Z','reviewed',NULL)
  `);

  await conn.query(`
    INSERT INTO nova_lab_result_items (id, lab_result_id, name, value, unit, ref_min, ref_max, status) VALUES
    ('lri-1','lr-1','Glycémie à jeun','1.10','g/L','0.70','1.10','high'),
    ('lri-2','lr-1','Créatinine','9.2','mg/L','6.0','11.0','normal'),
    ('lri-3','lr-1','Acide urique','65','mg/L','35','70','normal'),
    ('lri-4','lr-1','ALAT (TGP)','42','UI/L','0','40','high'),
    ('lri-5','lr-1','ASAT (TGO)','35','UI/L','0','40','normal'),
    ('lri-6','lr-2','Hémoglobine','13.8','g/dL','13.0','17.0','normal'),
    ('lri-7','lr-2','Globules blancs','7.2','10³/µL','4.0','10.0','normal'),
    ('lri-8','lr-2','Plaquettes','285','10³/µL','150','400','normal'),
    ('lri-9','lr-2','Hématocrite','41','%','40','52','normal'),
    ('lri-10','lr-3','Cholestérol total','2.10','g/L','0','2.00','high'),
    ('lri-11','lr-3','LDL Cholestérol','1.35','g/L','0','1.30','high'),
    ('lri-12','lr-3','HDL Cholestérol','0.48','g/L','0.45','0','normal'),
    ('lri-13','lr-3','Triglycérides','1.85','g/L','0','1.50','high')
  `);

  await conn.query(`
    INSERT INTO nova_medical_profile (patient_id, allergies, chronic_diseases, family_history, surgical_history, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `, ['patient-demo',
    JSON.stringify([
      { id: 'al-1', name: 'Pénicilline', severity: 'severe', reaction: 'Choc anaphylactique' },
      { id: 'al-2', name: 'Aspirine', severity: 'moderate', reaction: 'Urticaire, difficultés respiratoires' },
      { id: 'al-3', name: 'Arachides', severity: 'mild', reaction: 'Éruption cutanée' },
    ]),
    JSON.stringify([
      { id: 'cd-1', name: 'Hypertension artérielle', diagnosedAt: '2024-01-08', status: 'active', doctor: 'Dr. Aïcha Touré' },
      { id: 'cd-2', name: 'Diabète de type 2', diagnosedAt: '2023-03-14', status: 'controlled', doctor: 'Dr. Mariam Bamba' },
    ]),
    JSON.stringify([
      { id: 'fh-1', relation: 'Père', condition: 'Hypertension artérielle, AVC à 68 ans' },
      { id: 'fh-2', relation: 'Mère', condition: 'Diabète de type 2' },
      { id: 'fh-3', relation: 'Frère aîné', condition: 'Hypercholestérolémie' },
    ]),
    JSON.stringify([
      { id: 'sh-1', procedure: 'Appendicectomie', date: '2005-07-12', hospital: 'CHU de Treichville', notes: 'Sans complication' },
    ]),
    new Date().toISOString()
  ]);

  await conn.query(`
    INSERT INTO nova_prescriptions (id, patient_id, doctor_name, doctor_specialty, issued_at, valid_until, status, notes) VALUES
    ('presc-1','patient-demo','Dr. Aïcha Touré','Cardiologie','2026-04-20T09:30:00.000Z','2026-07-20T00:00:00.000Z','active','Renouvellement possible après bilan de contrôle.'),
    ('presc-2','patient-demo','Dr. Mariam Bamba','Endocrinologie','2026-03-14T10:00:00.000Z','2026-06-14T00:00:00.000Z','active','Contrôle glycémie mensuel obligatoire.'),
    ('presc-3','patient-demo','Dr. Yao Konan','Médecine générale','2026-01-10T08:00:00.000Z','2026-02-10T00:00:00.000Z','expired','Traitement terminé, symptômes résolus.')
  `);

  await conn.query(`
    INSERT INTO nova_prescription_items (id, prescription_id, name, dosage, frequency, duration, instructions) VALUES
    ('pi-1','presc-1','Amlodipine','5 mg','1 comprimé le matin','3 mois','Prendre avec un verre d''eau, éviter le jus de pamplemousse.'),
    ('pi-2','presc-1','Aspirine','100 mg','1 comprimé le soir','3 mois','À prendre après le repas du soir.'),
    ('pi-3','presc-2','Metformine','500 mg','2 comprimés par jour (matin et soir)','3 mois','Prendre pendant le repas pour éviter les troubles digestifs.'),
    ('pi-4','presc-2','Vitamine D3','1000 UI','1 capsule le matin','3 mois','Avec un repas contenant des graisses.'),
    ('pi-5','presc-3','Amoxicilline','500 mg','3 comprimés par jour','7 jours','Finir le traitement complet même si amélioration avant la fin.'),
    ('pi-6','presc-3','Ibuprofène','400 mg','1 comprimé toutes les 8h si douleur','7 jours','Ne pas dépasser 3 comprimés par jour. Prendre après repas.')
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
