import { pool } from '../db/database.js';

// Seuls un accord explicite valide ou un rendez-vous confirmé avec accord ouvrent le dossier.
const DAY = 86400000;
export const CARE_WINDOW_DAYS = 90;

function accessSources(doctorId, patientRef) {
  const sinceCare = new Date(Date.now() - CARE_WINDOW_DAYS * DAY).toISOString();
  const noLaterRevocation = (grantDate) => `NOT EXISTS (
    SELECT 1 FROM nova_consents r
    WHERE r.doctor_id = ? AND r.patient_id = ${patientRef} AND r.status = 'revoked'
      AND COALESCE(r.responded_at, r.requested_at) >= ${grantDate}
  )`;
  return {
    explicit: {
      where: `FROM nova_consents g
        WHERE g.doctor_id = ? AND g.patient_id = ${patientRef}
          AND ${noLaterRevocation('COALESCE(g.responded_at, g.requested_at)')}
          AND g.status = 'granted' AND (g.expires_at IS NULL OR g.expires_at > NOW())`,
      params: [doctorId, doctorId],
    },
    booking: {
      where: `FROM nova_appointments a
        WHERE a.doctor_id = ? AND a.patient_id = ${patientRef}
          AND a.status = 'confirmed' AND a.record_shared_at IS NOT NULL AND a.starts_at >= ?
          AND ${noLaterRevocation('a.record_shared_at')}`,
      params: [doctorId, sinceCare, doctorId],
    },
  };
}

export function doctorAccessClause(doctorId, patientRef = 'p.id') {
  const { explicit, booking } = accessSources(doctorId, patientRef);
  return {
    sql: `(EXISTS (SELECT 1 ${explicit.where}) OR EXISTS (SELECT 1 ${booking.where}))`,
    params: [...explicit.params, ...booking.params],
  };
}

export async function getDoctorAccessDetails(doctorId, patientId) {
  const { explicit, booking } = accessSources(doctorId, 'p.id');
  const [[row]] = await pool.execute(`
    SELECT
      (SELECT COUNT(*) ${explicit.where} AND g.expires_at IS NULL) AS permanent,
      (SELECT MAX(g.expires_at) ${explicit.where}) AS explicit_until,
      (SELECT MAX(a.starts_at) ${booking.where}) AS last_booking
    FROM nova_patients p WHERE p.id = ? AND p.deleted_at IS NULL
  `, [...explicit.params, ...explicit.params, ...booking.params, patientId]);
  if (!row) return null;
  const explicitUntil = row.explicit_until ? new Date(row.explicit_until).getTime() : 0;
  const bookingUntil = row.last_booking ? Date.parse(row.last_booking) + CARE_WINDOW_DAYS * DAY : 0;
  if (Number(row.permanent)) return { reason: 'consent', expiresAt: null };
  const until = Math.max(explicitUntil, bookingUntil);
  return until ? { reason: bookingUntil > explicitUntil ? 'care' : 'consent', expiresAt: new Date(until).toISOString() } : null;
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
