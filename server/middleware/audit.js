import { pool } from '../db/database.js';

/**
 * Audit log middleware — logs successful actions to nova_audit_logs.
 * Usage: router.post('/prescriptions', auditLog('prescription.create', 'prescription'), ...)
 */
export function auditLog(action, resourceType) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    let logged = false;

    // Journalise une seule fois, que la réponse parte en JSON ou en binaire (export PDF, fichiers).
    const record = (body) => {
      if (logged || res.statusCode >= 400 || !req.user) return;
      logged = true;
      {
        const resourceId = req.params?.id || body?.id || null;
        pool.execute(
          `INSERT INTO nova_audit_logs (user_id, user_role, action, resource_type, resource_id, details, ip_address, user_agent)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            req.user.id,
            req.user.role,
            action,
            resourceType || null,
            resourceId,
            JSON.stringify({ method: req.method, path: req.originalUrl }),
            req.ip || req.connection?.remoteAddress || null,
            (req.headers['user-agent'] || '').slice(0, 500),
          ]
        ).catch(() => {}); // Never block the response
      }
    };
    res.json = function (body) { record(body); return originalJson(body); };
    res.send = function (body) { record(Buffer.isBuffer(body) || typeof body !== 'object' ? null : body); return originalSend(body); };

    next();
  };
}

// Une même lecture répétée (liste rechargée, changement d'onglet) n'est inscrite qu'une fois par période.
const ACCESS_DEDUP_MINUTES = 10;

/**
 * Inscrit l'accès d'un professionnel aux données de patients, AVANT l'envoi de la réponse.
 * Échec d'écriture : erreur 503 (aucune donnée n'est servie sans trace).
 */
export async function recordAccess(req, patientIds, dataAccessed) {
  const ids = [...new Set((patientIds || []).filter(Boolean))];
  if (!ids.length || !req.user) return;
  try {
    const [recent] = await pool.query(
      `SELECT DISTINCT patient_id FROM nova_access_logs
       WHERE accessor_id = ? AND data_accessed = ? AND patient_id IN (?)
         AND accessed_at >= DATE_SUB(NOW(), INTERVAL ${ACCESS_DEDUP_MINUTES} MINUTE)`,
      [req.user.id, dataAccessed, ids]
    );
    const seen = new Set(recent.map((r) => r.patient_id));
    const values = ids.filter((id) => !seen.has(id)).map((id) => [id, req.user.id, req.user.role, dataAccessed]);
    if (values.length) await pool.query('INSERT INTO nova_access_logs(patient_id,accessor_id,accessor_role,data_accessed) VALUES ?', [values]);
  } catch {
    throw Object.assign(new Error('Historique des accès indisponible. Réessayez.'), { status: 503, code: 'audit_unavailable' });
  }
}

/**
 * Log when a doctor accesses a patient's data.
 * Usage: router.get('/patients/:id', accessLog('patient_record'), ...)
 * pickIds(body, req) : identifiants des patients dont des données sont renvoyées (réponses imbriquées).
 * Les lignes sans dossier partagé (simple demande de rendez-vous : recordShared false) ne sont pas inscrites.
 */
export function accessLog(dataAccessed, pickIds) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function (body) {
      if (res.statusCode >= 400 || !req.user) return originalJson(body);
      const rows = Array.isArray(body) ? body : [body];
      const ids = pickIds ? pickIds(body, req)
        : dataAccessed === 'patient_record' ? [req.params.id]
        : rows.filter((r) => r?.recordShared !== false).map((r) => r?.patientId || (dataAccessed === 'patient_directory' ? r?.id : null));
      // Un dossier n'est renvoyé qu'après l'enregistrement de sa consultation.
      recordAccess(req, ids, dataAccessed)
        .then(() => originalJson(body))
        .catch(() => { res.status(503); originalJson({ error: 'audit_unavailable', message: 'Historique des accès indisponible. Réessayez.' }); });
      return res;
    };
    next();
  };
}
