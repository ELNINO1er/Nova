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
