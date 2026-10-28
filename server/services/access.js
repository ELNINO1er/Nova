import { pool } from '../db/database.js';

/*
 * Règle d'accès d'un médecin au dossier d'un patient (docs/ARCHITECTURE_ROLES.md §3).
 *
 * Accès si AUCUNE révocation explicite n'est en vigueur ET :
 *   - un consentement « granted » non expiré existe, OU
 *   - une relation de soins en cours existe : RDV non annulé à venir ou de moins de 90 jours,
 *     ou acte (consultation, ordonnance, analyse) de ce médecin de moins de 12 mois.
 * Une révocation est « en vigueur » si elle est plus récente que le dernier accord.
 * Les dates applicatives sont des chaînes ISO : comparaison par chaîne.
 */
const DAY = 86400000;
export const CARE_WINDOW_DAYS = 90;
export const ACT_WINDOW_DAYS = 365;

export function doctorAccessClause(doctorId, patientRef = 'p.id') {
  const sinceCare = new Date(Date.now() - CARE_WINDOW_DAYS * DAY).toISOString();
  const sinceAct = new Date(Date.now() - ACT_WINDOW_DAYS * DAY).toISOString();
  const sql = `(
    NOT EXISTS (
      SELECT 1 FROM nova_consents r
      WHERE r.doctor_id = ? AND r.patient_id = ${patientRef} AND r.status = 'revoked'
        AND COALESCE(r.responded_at, r.requested_at) >= COALESCE((
          SELECT MAX(g.responded_at) FROM nova_consents g
          WHERE g.doctor_id = r.doctor_id AND g.patient_id = r.patient_id AND g.status = 'granted'
        ), '1970-01-01')
    )
    AND (
      EXISTS (SELECT 1 FROM nova_consents g WHERE g.doctor_id = ? AND g.patient_id = ${patientRef}
              AND g.status = 'granted' AND (g.expires_at IS NULL OR g.expires_at > NOW()))
      OR EXISTS (SELECT 1 FROM nova_appointments a WHERE a.doctor_id = ? AND a.patient_id = ${patientRef}
              AND a.status <> 'cancelled' AND a.starts_at >= ?)
      OR EXISTS (SELECT 1 FROM nova_consultations c WHERE c.doctor_id = ? AND c.patient_id = ${patientRef} AND c.started_at >= ?)
      OR EXISTS (SELECT 1 FROM nova_prescriptions x WHERE x.doctor_id = ? AND x.patient_id = ${patientRef} AND x.issued_at >= ?)
      OR EXISTS (SELECT 1 FROM nova_lab_requests l WHERE l.doctor_id = ? AND l.patient_id = ${patientRef} AND l.requested_at >= ?)
    )
  )`;
  return {
    sql,
    params: [doctorId, doctorId, doctorId, sinceCare, doctorId, sinceAct, doctorId, sinceAct, doctorId, sinceAct],
  };
}

export async function hasDoctorPatientAccess(doctorId, patientId) {
  if (!doctorId || !patientId) return false;
  const clause = doctorAccessClause(doctorId, 'p.id');
  const [[row]] = await pool.execute(
    `SELECT p.id FROM nova_patients p WHERE p.id = ? AND p.deleted_at IS NULL AND ${clause.sql} LIMIT 1`,
    [patientId, ...clause.params]
  );
  return Boolean(row);
}

export async function assertDoctorPatientAccess(doctorId, patientId) {
  if (!(await hasDoctorPatientAccess(doctorId, patientId))) {
    throw Object.assign(new Error('Accès au dossier non autorisé (consentement absent ou révoqué).'), { status: 403, code: 'no_patient_access' });
  }
}
