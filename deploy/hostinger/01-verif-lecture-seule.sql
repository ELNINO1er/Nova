-- NOVA — contrôles en LECTURE SEULE (phpMyAdmin de hPanel, onglet SQL, base de NOVA).
-- Aucune écriture. Résultats : identifiants techniques, rôles et compteurs uniquement (aucune donnée patient).
SET SESSION TRANSACTION READ ONLY;
SELECT VERSION() AS mysql_version;
SELECT version AS derniere_migration FROM nova_schema_migrations ORDER BY version DESC LIMIT 2;
-- attendu avant bascule : 20261113_13_admin_email ; après : 20261116_14_patient_activation
SELECT id, role, password_hash IS NOT NULL AS mdp, must_change_password AS changement_impose,
       disabled_at IS NOT NULL AS desactive
FROM nova_users
WHERE id IN ('user-001','user-002','user-doc-001','user-ph-001','user-admin-001','user-gov-001') AND deleted_at IS NULL;
-- toute ligne mdp=1 et desactive=0 = compte de démonstration utilisable
SELECT COUNT(*) AS admins_reels_actifs FROM nova_users
WHERE role='admin' AND deleted_at IS NULL AND disabled_at IS NULL AND id<>'user-admin-001';
SELECT COUNT(*) AS patients_en_attente_activation FROM nova_users
WHERE role='patient' AND must_change_password=1 AND password_hash IS NOT NULL AND deleted_at IS NULL;
SELECT role, COUNT(*) AS comptes FROM nova_users WHERE deleted_at IS NULL GROUP BY role ORDER BY role;
SELECT COUNT(*) AS documents, SUM(file_path IS NOT NULL) AS avec_fichier FROM nova_documents;
SELECT COUNT(*) AS photos_patients FROM nova_patients WHERE photo_path IS NOT NULL;
SELECT table_name, table_rows FROM information_schema.tables
WHERE table_schema = DATABASE() AND table_name IN ('nova_patients','nova_users','nova_appointments','nova_prescriptions','nova_documents','nova_messages')
ORDER BY table_name;
-- Comptes privilégiés sans double authentification active (doivent être 0 avant un pilote).
SELECT role, COUNT(*) AS sans_mfa FROM nova_users
WHERE role IN ('admin','doctor') AND deleted_at IS NULL AND disabled_at IS NULL AND (mfa_enabled = 0 OR mfa_secret_enc IS NULL)
GROUP BY role;
-- Comptes actuellement bloqués et comptes désactivés.
SELECT role, SUM(locked_until > NOW()) AS bloques, SUM(disabled_at IS NOT NULL) AS desactives FROM nova_users WHERE deleted_at IS NULL GROUP BY role;
-- Anciennes activations patients (mot de passe provisoire sans échéance) et activations expirées.
SELECT SUM(activation_expires_at IS NULL) AS sans_echeance, SUM(activation_expires_at <= UTC_TIMESTAMP(3)) AS expirees
FROM nova_users WHERE role='patient' AND must_change_password=1 AND password_changed_at IS NULL AND password_hash IS NOT NULL AND deleted_at IS NULL;
-- Dates de naissance aberrantes déjà enregistrées (ex. année 0008 → « 2018 ans »). Identifiants seulement.
SELECT id AS patient_id, LEFT(birth_date, 4) AS annee_saisie FROM nova_patients
WHERE deleted_at IS NULL AND birth_date IS NOT NULL AND birth_date <> ''
  AND (birth_date NOT REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}' OR LEFT(birth_date, 4) < '1900' OR LEFT(birth_date, 10) > DATE_FORMAT(CURDATE(), '%Y-%m-%d'));
