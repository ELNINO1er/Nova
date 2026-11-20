// Migrations versionnées, additives et rejouables après un arrêt entre deux DDL MySQL.
async function column(conn, table, name, definition) {
  const [rows] = await conn.execute('SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?', [table, name]);
  if (!rows.length) await conn.query(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
}

export async function migrate(conn) {
  await conn.query('CREATE TABLE IF NOT EXISTS nova_schema_migrations (version VARCHAR(80) PRIMARY KEY, applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3))');
  const [[lock]] = await conn.query("SELECT GET_LOCK(CONCAT(DATABASE(), ':migrations'), 60) AS acquired");
  if (Number(lock.acquired) !== 1) throw new Error('Migration déjà en cours.');
  try {
    const migrations = [
      ['20261028_01_integrity', async () => {
        await column(conn, 'nova_users', 'session_version', 'INT NOT NULL DEFAULT 0');
        await column(conn, 'nova_users', 'disabled_at', 'DATETIME(3) NULL');
        await column(conn, 'nova_prescription_items', 'quantity_prescribed', 'INT UNSIGNED NULL');
        await column(conn, 'nova_prescription_items', 'quantity_unit', "VARCHAR(40) NOT NULL DEFAULT 'unité'");
        await column(conn, 'nova_prescriptions', 'consultation_id', 'VARCHAR(36) NULL');
        await column(conn, 'nova_vitals', 'source_role', "VARCHAR(20) NOT NULL DEFAULT 'legacy'");
        await column(conn, 'nova_vitals', 'author_id', 'VARCHAR(36) NULL');
        await column(conn, 'nova_documents', 'source_role', "VARCHAR(20) NOT NULL DEFAULT 'patient'");
        await conn.query(`CREATE TABLE IF NOT EXISTS nova_dispense_requests (
          pharmacy_id VARCHAR(36) NOT NULL, request_key VARCHAR(100) NOT NULL,
          prescription_id VARCHAR(36) NOT NULL, payload_hash CHAR(64) NOT NULL, response_json JSON NOT NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY(pharmacy_id, request_key))`);
        await conn.query(`CREATE TABLE IF NOT EXISTS nova_consultation_amendments (
          id VARCHAR(36) PRIMARY KEY, consultation_id VARCHAR(36) NOT NULL, doctor_id VARCHAR(36) NOT NULL,
          reason VARCHAR(1000) NOT NULL, content JSON NOT NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), INDEX(consultation_id))`);
        await conn.query(`CREATE TABLE IF NOT EXISTS nova_medical_declarations (
          id VARCHAR(36) PRIMARY KEY, patient_id VARCHAR(36) NOT NULL, author_role VARCHAR(20) NOT NULL,
          author_id VARCHAR(36) NULL, content JSON NOT NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), INDEX(patient_id))`);
      }],
      ['20261028_02_provenance',async()=>{
        await column(conn,'nova_medical_declarations','sequence_no','BIGINT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE');
        await column(conn,'nova_lab_requests','result_id','VARCHAR(36) NULL');
        await column(conn,'nova_lab_requests','result_hash','CHAR(64) NULL');
      }],
      ['20261028_03_medication_plans',async()=>{
        await column(conn,'nova_medication_schedules','prescription_item_id','VARCHAR(36) NULL');
        await column(conn,'nova_medication_schedules','starts_on','VARCHAR(10) NULL');
        await column(conn,'nova_medication_schedules','ends_on','VARCHAR(10) NULL');
      }],
      ['20261028_04_messages',async()=>{
        await column(conn,'nova_messages','request_key','VARCHAR(100) NULL UNIQUE');
      }],
      ['20261028_05_consent_history',async()=>{
        await conn.query('ALTER TABLE nova_consents MODIFY requested_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3), MODIFY responded_at DATETIME(3) NULL');
      }],
      ['20261028_06_reset_approvals',async()=>{
        await conn.query(`CREATE TABLE IF NOT EXISTS nova_reset_requests (
          id VARCHAR(36) PRIMARY KEY, target_user_id VARCHAR(36) NOT NULL, requested_by VARCHAR(36) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'pending', decided_by VARCHAR(36) NULL,
          requested_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), decided_at DATETIME(3) NULL,
          expires_at DATETIME(3) NOT NULL, INDEX(status), INDEX(target_user_id))`);
      }],
      ['20261028_07_booking_consent',async()=>{
        // Accord de partage donné par le patient en réservant (prend effet à la confirmation).
        await column(conn,'nova_appointments','record_shared_at','DATETIME(3) NULL');
      }],
      ['20261028_08_patient_photo',async()=>{
        // Chemin relatif au dossier privé data/uploads (jamais servi statiquement).
        await column(conn,'nova_patients','photo_path','VARCHAR(255) NULL');
      }],
      ['20261112_09_admin_mfa', async () => {
        // Les sessions créées avant l'obligation MFA ne sont plus valides.
        await conn.query("UPDATE nova_users SET session_version = session_version + 1 WHERE role = 'admin'");
      }],
      ['20261112_10_notification_target', async () => {
        await column(conn, 'nova_notifications', 'link_target_id', 'VARCHAR(36) NULL');
      }],
      ['20261112_11_patient_recovery', async () => {
        await column(conn, 'nova_users', 'patient_recovery_hash', 'CHAR(64) NULL');
      }],
      ['20261112_12_doctor_photo', async () => {
        await column(conn, 'nova_doctors', 'photo_path', 'VARCHAR(255) NULL');
      }],
      ['20261113_13_admin_email', async () => {
        await column(conn, 'nova_users', 'login_email', 'VARCHAR(254) NULL UNIQUE');
        await conn.query('ALTER TABLE nova_users MODIFY phone VARCHAR(20) NULL');
      }],
      ['20261116_14_patient_activation', async () => {
        // Activation des patients créés par un médecin : code à usage unique et expirant, médecin créateur.
        // Les comptes existants gardent NULL : pas d'expiration rétroactive (accès préservé).
        await column(conn, 'nova_users', 'activation_expires_at', 'DATETIME(3) NULL');
        await column(conn, 'nova_users', 'activation_channel', 'VARCHAR(10) NULL');
        await column(conn, 'nova_users', 'activation_doctor_id', 'VARCHAR(36) NULL');
      }],
      ['20261116_15_mfa_hardening', async () => {
        // Échecs de double authentification comptés par compte (tous challenges confondus) et
        // dernier pas TOTP accepté (un code déjà utilisé ne peut pas être rejoué).
        await column(conn, 'nova_users', 'failed_mfa_attempts', 'INT NOT NULL DEFAULT 0');
        await column(conn, 'nova_users', 'mfa_last_counter', 'BIGINT NULL');
      }],
      ['20261117_16_consent_terms', async () => {
        // Consentement éclairé : version des conditions acceptées et date d'acceptation.
        // Les accords antérieurs gardent NULL : ils restent valides mais le patient est invité à les confirmer.
        await column(conn, 'nova_consents', 'terms_version', 'VARCHAR(20) NULL');
        await column(conn, 'nova_consents', 'acknowledged_at', 'DATETIME(3) NULL');
      }],
      ['20261117_17_message_attachments', async () => {
        // Pièce jointe d'un message : référence à un élément du dossier du patient (pas de copie).
        await column(conn, 'nova_messages', 'attachment_type', 'VARCHAR(20) NULL');
        await column(conn, 'nova_messages', 'attachment_id', 'VARCHAR(64) NULL');
      }],
      ['20261117_18_emergency_links', async () => {
        // QR d'urgence : lien secret par patient (révocable), à la place du texte brut illisible par l'appareil photo.
        await conn.query(`CREATE TABLE IF NOT EXISTS nova_emergency_links (
          patient_id VARCHAR(36) PRIMARY KEY,
          token VARCHAR(64) NOT NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          UNIQUE KEY uq_emergency_token (token)
        )`);
      }],
      ['20261117_19_pharmacy_orders', async () => {
        // Commandes d'ordonnance patient → pharmacie : réponse du pharmacien, suivi et lien avec la délivrance.
        await column(conn, 'nova_pharmacy_orders', 'pharmacist_message', 'VARCHAR(500) NULL');
        await column(conn, 'nova_pharmacy_orders', 'updated_at', 'DATETIME(3) NULL');
        await column(conn, 'nova_pharmacy_orders', 'dispense_id', 'VARCHAR(36) NULL');
        await conn.query('CREATE INDEX idx_npo_pharmacy_status ON nova_pharmacy_orders (pharmacy_id, status)').catch((e) => { if (e.code !== 'ER_DUP_KEYNAME') throw e; });
      }],
      ['20261117_20_share_terms', async () => {
        // Partage du dossier lors d'une réservation : version des conditions acceptées (consentement éclairé).
        await column(conn, 'nova_appointments', 'share_terms_version', 'VARCHAR(20) NULL');
        await column(conn, 'nova_appointments', 'share_acknowledged_at', 'DATETIME(3) NULL');
      }],
      ['20261117_21_insurance_cnam', async () => {
        // Donnée de démonstration : la CMU ivoirienne est gérée par la CNAM (la CNAMGS est gabonaise).
        await conn.query("UPDATE nova_insurance SET provider = 'CNAM (CMU)' WHERE provider = 'CNAMGS'");
        // Donnée de démonstration : 1,10 g/L est la borne haute normale, pas une valeur élevée.
        await conn.query("UPDATE nova_lab_result_items SET status = 'normal' WHERE id = 'lri-1' AND value = '1.10' AND ref_max = '1.10' AND status = 'high'");
      }],
      ['20261120_22_doctor_followup_vital_context', async () => {
        await column(conn, 'nova_vitals', 'measurement_context', 'JSON NULL');
        await conn.query(`CREATE TABLE IF NOT EXISTS nova_chronic_followups (
          doctor_id VARCHAR(36) NOT NULL, patient_id VARCHAR(36) NOT NULL,
          next_followup_date VARCHAR(10) NULL,
          updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          PRIMARY KEY(doctor_id, patient_id), INDEX(doctor_id, next_followup_date))`);
      }],
      ['20261120_23_operations_reliability_evidence', async () => {
        await conn.query(`CREATE TABLE IF NOT EXISTS nova_reliability_checks (
          id VARCHAR(36) PRIMARY KEY, kind VARCHAR(20) NOT NULL,
          verified_at DATETIME(3) NOT NULL, reference VARCHAR(200) NOT NULL,
          verified_by VARCHAR(36) NOT NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), INDEX(kind, verified_at))`);
      }],
      ['20261120_24_prescription_cancellation_reason', async () => {
        await conn.query(`CREATE TABLE IF NOT EXISTS nova_prescription_cancellations (
          prescription_id VARCHAR(36) PRIMARY KEY, doctor_id VARCHAR(36) NOT NULL,
          reason VARCHAR(1000) NOT NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3))`);
      }],
    ];
    for (const [version, run] of migrations) {
      const [[done]] = await conn.execute('SELECT version FROM nova_schema_migrations WHERE version=?', [version]);
      if (done) continue;
      await run();
      await conn.execute('INSERT INTO nova_schema_migrations(version) VALUES (?)', [version]);
    }
  } finally {
    await conn.query("SELECT RELEASE_LOCK(CONCAT(DATABASE(), ':migrations'))");
  }
}
