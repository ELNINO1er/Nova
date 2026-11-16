-- NOVA — APRÈS la bascule : échéance de 7 jours pour les anciens comptes patients en attente d'activation
-- (équivalent de patient-activations.js legacy --days 7 --apply). Patients activés jamais touchés.
-- 1) Prévisualisation : creator = médecin créateur retrouvé (NULL = laissé sans échéance, à traiter à part).
SELECT u.id,
  (SELECT c.doctor_id FROM nova_consents c WHERE c.patient_id = u.patient_id
     AND ABS(TIMESTAMPDIFF(SECOND, c.requested_at, STR_TO_DATE(LEFT(u.created_at, 19), '%Y-%m-%dT%H:%i:%s'))) <= 10
   ORDER BY c.requested_at LIMIT 1) AS creator
FROM nova_users u
WHERE u.role='patient' AND u.must_change_password=1 AND u.password_changed_at IS NULL
  AND u.deleted_at IS NULL AND u.disabled_at IS NULL AND u.password_hash IS NOT NULL AND u.activation_expires_at IS NULL;
-- 2) Application (après feu vert).
START TRANSACTION;
UPDATE nova_users u
JOIN (SELECT u2.id, (SELECT c.doctor_id FROM nova_consents c WHERE c.patient_id = u2.patient_id
        AND ABS(TIMESTAMPDIFF(SECOND, c.requested_at, STR_TO_DATE(LEFT(u2.created_at, 19), '%Y-%m-%dT%H:%i:%s'))) <= 10
        ORDER BY c.requested_at LIMIT 1) AS creator
      FROM nova_users u2
      WHERE u2.role='patient' AND u2.must_change_password=1 AND u2.password_changed_at IS NULL
        AND u2.deleted_at IS NULL AND u2.disabled_at IS NULL AND u2.password_hash IS NOT NULL
        AND u2.activation_expires_at IS NULL) m ON m.id = u.id AND m.creator IS NOT NULL
SET u.activation_expires_at = DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 7 DAY), u.activation_channel = 'sheet',
    u.activation_doctor_id = m.creator;
COMMIT;
