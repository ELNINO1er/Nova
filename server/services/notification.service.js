import { randomUUID } from 'node:crypto';
import { pool } from '../db/database.js';
import { emitToUser } from '../realtime.js';

/**
 * Créer une notification pour un utilisateur (patient, médecin, pharmacien).
 * @param {Object} opts
 * @param {string} opts.patientId — ID patient (legacy, pour compat)
 * @param {string} opts.userId — ID user cible (nouveau, universel)
 * @param {string} opts.targetRole — rôle cible (patient/doctor/pharmacist)
 * @param {string} opts.type — type de notification
 * @param {string} opts.title
 * @param {string} opts.body
 * @param {string} opts.linkPage — page de navigation
 * @param {string} opts.sourceUserId — qui a déclenché
 * @param {string} opts.sourceRole — rôle source
 */
// Catégories que le patient peut couper dans ses paramètres ; les notifications médicales
// (consultation, ordonnance, résultat, délivrance, consentement) ne sont jamais filtrées.
const PATIENT_PREFERENCE = { appointment: 'appointments', medication: 'medications', message: 'messages' };

async function patientMutedCategory(patientId, type, conn=pool) {
  const key = PATIENT_PREFERENCE[type];
  if (!key || !patientId) return false;
  const [[row]] = await conn.execute('SELECT settings_json FROM nova_patient_settings WHERE patient_id = ?', [patientId]);
  if (!row) return false;
  try {
    const settings = typeof row.settings_json === 'string' ? JSON.parse(row.settings_json) : row.settings_json;
    return settings?.notifications?.[key] === false;
  } catch { return false; }
}

export async function createNotification(opts,conn=pool) {
  if (opts.targetRole === 'patient' && await patientMutedCategory(opts.patientId, opts.type,conn)) return null;
  const id = randomUUID();
  const now = new Date().toISOString();
  await conn.execute(
    `INSERT INTO nova_notifications (id, patient_id, user_id, target_role, type, title, body, link_page, link_target_id, source_user_id, source_role, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [id, opts.patientId || '', opts.userId || null, opts.targetRole || null,
     opts.type, opts.title, opts.body || null, opts.linkPage || null, opts.linkTargetId || null,
     opts.sourceUserId || null, opts.sourceRole || null, now]
  );
  // Temps réel : simple signal « actualisez vos notifications » (aucun contenu médical transmis).
  // Dans une transaction, le signal part après un court délai pour laisser la validation se faire ;
  // en cas d'annulation, le client relit simplement une liste inchangée.
  const ping = () => emitToUser(opts.userId, 'notification:new', { type: opts.type });
  if (conn === pool) ping(); else setTimeout(ping, 1000).unref?.();
  return id;
}

/**
 * Notification → patient quand médecin crée consultation
 */
export async function notifyPatientConsultation(patientId, doctorName, consultationId, conn=pool) {
  const [[user]] = await conn.execute('SELECT id FROM nova_users WHERE patient_id = ?', [patientId]);
  return createNotification({
    patientId,
    userId: user?.id,
    targetRole: 'patient',
    type: 'consultation',
    title: 'Nouvelle consultation',
    body: `${doctorName} a ajouté un compte-rendu de consultation à votre dossier.`,
    linkPage: 'history',
  },conn);
}

/**
 * Notification → patient quand ordonnance créée
 */
export async function notifyPatientPrescription(patientId, doctorName, conn=pool) {
  const [[user]] = await conn.execute('SELECT id FROM nova_users WHERE patient_id = ?', [patientId]);
  return createNotification({
    patientId,
    userId: user?.id,
    targetRole: 'patient',
    type: 'prescription',
    title: 'Nouvelle ordonnance',
    body: `${doctorName} vous a émis une ordonnance. Consultez-la dans vos ordonnances.`,
    linkPage: 'prescriptions',
  },conn);
}

/**
 * Notification → patient quand pharmacie délivre
 */
export async function notifyPatientDispense(patientId, pharmacyName, status, conn=pool) {
  const [[user]] = await conn.execute('SELECT id FROM nova_users WHERE patient_id = ?', [patientId]);
  const label = status==='refused'?'refusé la délivrance de votre ordonnance':status === 'full' ? 'délivré votre ordonnance' : 'partiellement délivré votre ordonnance';
  return createNotification({
    patientId,
    userId: user?.id,
    targetRole: 'patient',
    type: 'pharmacy',
    title: status==='refused'?'Délivrance refusée':status === 'full' ? 'Ordonnance délivrée' : 'Délivrance partielle',
    body: `${pharmacyName} a ${label}.`,
    linkPage: 'prescriptions',
  },conn);
}

/**
 * Notification → médecin quand pharmacie délivre son ordonnance
 */
export async function notifyDoctorDispense(doctorId, patientName, pharmacyName, status, conn=pool) {
  const [[user]] = await conn.execute('SELECT id FROM nova_users WHERE doctor_id = ?', [doctorId]);
  if (!user) return;
  const label = status==='refused'?'refusée à la délivrance':status === 'full' ? 'intégralement délivrée' : 'partiellement délivrée';
  return createNotification({
    userId: user.id,
    targetRole: 'doctor',
    type: 'dispense',
    title: 'Ordonnance délivrée',
    body: `L'ordonnance de ${patientName} a été ${label} par ${pharmacyName}.`,
    linkPage: 'prescriptions',
  },conn);
}

/**
 * Notification → médecin quand patient prend RDV
 */
export async function notifyDoctorAppointment(doctorId, patientName, date, conn=pool) {
  const [[user]] = await conn.execute('SELECT id FROM nova_users WHERE doctor_id = ?', [doctorId]);
  if (!user) return;
  return createNotification({
    userId: user.id,
    targetRole: 'doctor',
    type: 'appointment',
    title: 'Nouveau rendez-vous',
    body: `${patientName} a pris rendez-vous pour le ${date}.`,
    linkPage: 'agenda',
  },conn);
}

/** Notification → patient : rendez-vous confirmé ou annulé par le médecin. */
// Date lisible d'un rendez-vous (« lundi 17 novembre à 10:30 ») ; un texte déjà formaté est gardé tel quel.
function appointmentDate(value) {
  const d = new Date(value);
  if (!value || Number.isNaN(d.getTime()) || !/^\d{4}-\d{2}-\d{2}/.test(String(value instanceof Date ? d.toISOString() : value))) return String(value || '');
  return d.toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Abidjan' });
}

export async function notifyPatientAppointmentStatus(patientId, doctorName, status, dateStr, appointmentId, conn=pool) {
  const [[user]] = await conn.execute('SELECT id FROM nova_users WHERE patient_id = ? AND deleted_at IS NULL', [patientId]);
  return createNotification({
    patientId,
    userId: user?.id,
    targetRole: 'patient',
    type: 'appointment',
    title: status === 'confirmed' ? 'Rendez-vous confirmé' : status === 'moved' ? 'Rendez-vous déplacé' : 'Rendez-vous annulé',
    body: status === 'moved'
      ? `${doctorName} a déplacé votre rendez-vous au ${appointmentDate(dateStr)}.`
      : `${doctorName} a ${status === 'confirmed' ? 'confirmé' : 'annulé'} votre rendez-vous du ${appointmentDate(dateStr)}.`,
    linkPage: 'rdv',
    linkTargetId: appointmentId,
  },conn);
}

/** Notification → médecin : rendez-vous annulé ou déplacé par le patient. */
export async function notifyDoctorAppointmentChange(doctorId, patientName, change, dateStr, conn=pool) {
  const [[user]] = await conn.execute('SELECT id FROM nova_users WHERE doctor_id = ? AND deleted_at IS NULL', [doctorId]);
  if (!user) return;
  return createNotification({
    userId: user.id,
    targetRole: 'doctor',
    type: 'appointment',
    title: change === 'cancelled' ? 'Rendez-vous annulé' : 'Rendez-vous à reconfirmer',
    body: change === 'cancelled'
      ? `${patientName} a annulé son rendez-vous du ${dateStr}.`
      : `${patientName} a déplacé son rendez-vous au ${dateStr} : il est à reconfirmer.`,
    linkPage: 'agenda',
  },conn);
}

/**
 * Notification → médecin quand patient accorde/révoque consentement
 */
export async function notifyDoctorConsent(doctorId, patientName, granted,conn=pool) {
  const [[user]] = await conn.execute('SELECT id FROM nova_users WHERE doctor_id = ?', [doctorId]);
  if (!user) return;
  return createNotification({
    userId: user.id,
    targetRole: 'doctor',
    type: 'consent',
    title: granted ? 'Accès accordé' : 'Accès révoqué',
    body: `${patientName} a ${granted ? 'accordé' : 'révoqué'} l'accès à son dossier médical.`,
    linkPage: 'patients',
  },conn);
}

/**
 * Notification → médecin quand transfert accepté/refusé
 */
export async function notifyDoctorReferral(doctorId, toDoctorName, patientName, accepted) {
  const [[user]] = await pool.execute('SELECT id FROM nova_users WHERE doctor_id = ?', [doctorId]);
  if (!user) return;
  return createNotification({
    userId: user.id,
    targetRole: 'doctor',
    type: 'referral',
    title: accepted ? 'Transfert accepté' : 'Transfert refusé',
    body: `Dr. ${toDoctorName} a ${accepted ? 'accepté' : 'refusé'} le transfert de ${patientName}.`,
    linkPage: 'patients',
  });
}

/**
 * Notification → patient quand résultat labo disponible
 */
export async function notifyPatientLabResult(patientId, labTitle, conn=pool) {
  const [[user]] = await conn.execute('SELECT id FROM nova_users WHERE patient_id = ?', [patientId]);
  return createNotification({
    patientId,
    userId: user?.id,
    targetRole: 'patient',
    type: 'lab_result',
    title: 'Résultat disponible',
    body: `Votre résultat "${labTitle}" est disponible.`,
    linkPage: 'labresults',
  },conn);
}

/**
 * Notification → patient rappel médicament
 */
export async function notifyPatientMedicationReminder(patientId, medName, time) {
  const [[user]] = await pool.execute('SELECT id FROM nova_users WHERE patient_id = ?', [patientId]);
  return createNotification({
    patientId,
    userId: user?.id,
    targetRole: 'patient',
    type: 'medication',
    title: 'Rappel médicament',
    body: `Il est l'heure de prendre ${medName} (${time}).`,
    linkPage: 'pilulier',
  });
}

/**
 * Récupérer notifications pour un user (par user_id OU patient_id legacy)
 */
export async function getNotificationsForUser(userId, role) {
  if (role === 'patient') {
    // Compat: chercher par patient_id ou user_id
    const [[user]] = await pool.execute('SELECT patient_id FROM nova_users WHERE id = ?', [userId]);
    const [rows] = await pool.execute(
      `SELECT * FROM nova_notifications
       WHERE (user_id = ? OR patient_id = ?)
         AND (target_role IS NULL OR target_role = 'patient')
       ORDER BY created_at DESC LIMIT 50`,
      [userId, user?.patient_id || '']
    );
    return rows;
  }

  const [rows] = await pool.execute(
    'SELECT * FROM nova_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [userId]
  );
  return rows;
}

/**
 * Marquer notification lue
 */
export async function markNotificationReadById(userId, notificationId) {
  await pool.execute(
    'UPDATE nova_notifications SET is_read = 1 WHERE id = ? AND (user_id = ? OR patient_id IN (SELECT patient_id FROM nova_users WHERE id = ?))',
    [notificationId, userId, userId]
  );
}

/**
 * Marquer toutes les notifications lues
 */
export async function markAllNotificationsReadForUser(userId) {
  await pool.execute(
    'UPDATE nova_notifications SET is_read = 1 WHERE (user_id = ? OR patient_id IN (SELECT patient_id FROM nova_users WHERE id = ?)) AND is_read = 0',
    [userId, userId]
  );
}
