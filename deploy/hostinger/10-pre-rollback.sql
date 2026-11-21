-- NOVA — AVANT un retour à 09f873e (version qui ignore l'échéance des codes d'activation).
-- Équivalent SQL de : node server/scripts/patient-activations.js pre-rollback --apply
-- 1) Prévisualisation (lecture seule) : codes en attente qui deviendraient utilisables sans limite.
SELECT id, activation_expires_at <= UTC_TIMESTAMP(3) AS expire
FROM nova_users
WHERE role='patient' AND must_change_password=1 AND password_changed_at IS NULL
  AND deleted_at IS NULL AND disabled_at IS NULL
  AND password_hash IS NOT NULL AND activation_expires_at IS NOT NULL;
-- 2) Neutralisation (à exécuter seulement après feu vert). Patients activés jamais touchés
--    (password_changed_at renseigné ou must_change_password = 0).
START TRANSACTION;
UPDATE nova_auth_challenges c JOIN nova_users u ON u.id = c.user_id
SET c.used_at = NOW()
WHERE c.used_at IS NULL AND u.role='patient' AND u.must_change_password=1 AND u.password_changed_at IS NULL
  AND u.deleted_at IS NULL AND u.disabled_at IS NULL
  AND u.password_hash IS NOT NULL AND u.activation_expires_at IS NOT NULL;
UPDATE nova_users
SET password_hash = NULL, session_version = session_version + 1,
    activation_expires_at = LEAST(activation_expires_at, UTC_TIMESTAMP(3))
WHERE role='patient' AND must_change_password=1 AND password_changed_at IS NULL
  AND deleted_at IS NULL AND disabled_at IS NULL
  AND password_hash IS NOT NULL AND activation_expires_at IS NOT NULL;
-- Vérifier le nombre de lignes modifiées (= nombre de lignes de la prévisualisation), puis :
COMMIT;
