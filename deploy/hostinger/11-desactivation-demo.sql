-- NOVA — désactivation des comptes de démonstration (équivalent de disable-demo-accounts.js --apply).
-- Cible : identifiant ET numéro d'origine du seed ; un identifiant réattribué n'est pas touché.
-- 1) Prévisualisation (lecture seule).
SELECT id, role, disabled_at IS NOT NULL AS deja_desactive FROM nova_users
WHERE (id, phone) IN (('user-001','0789452311'),('user-002','0102030405'),('user-doc-001','0601234567'),
                      ('user-ph-001','0700000002'),('user-admin-001','0700000001'),('user-gov-001','0700000003'))
  AND deleted_at IS NULL;
-- 2) Application (après feu vert) : désactivé, mot de passe retiré, sessions révoquées immédiatement.
START TRANSACTION;
UPDATE nova_users
SET disabled_at = COALESCE(disabled_at, NOW(3)), password_hash = NULL, must_change_password = 1,
    session_version = session_version + 1
WHERE (id, phone) IN (('user-001','0789452311'),('user-002','0102030405'),('user-doc-001','0601234567'),
                      ('user-ph-001','0700000002'),('user-admin-001','0700000001'),('user-gov-001','0700000003'))
  AND deleted_at IS NULL;
COMMIT;
