import { randomBytes } from 'node:crypto';
import { pool } from '../db/database.js';
import { getEmergencyCard, getSettings } from './patient.service.js';
import { createNotification } from './notification.service.js';

/*
 * QR d'urgence : le QR contient un lien https://…/urgence/<jeton>. Scanné avec l'appareil photo de
 * n'importe quel téléphone, il ouvre la fiche vitale sans compte NOVA.
 * - jeton aléatoire de 256 bits (impossible à deviner), un par patient, révocable (« Changer de QR ») ;
 * - fiche limitée aux informations utiles aux secours ;
 * - désactivée si le patient a coupé le QR d'urgence dans ses paramètres ;
 * - chaque consultation est inscrite au journal d'accès du patient, qui est prévenu.
 */
export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const newToken = () => randomBytes(32).toString('base64url');
const NOTIFY_EVERY_MS = 10 * 60 * 1000;

export async function getOrCreateEmergencyToken(patientId) {
  const [[row]] = await pool.execute('SELECT token FROM nova_emergency_links WHERE patient_id = ?', [patientId]);
  if (row) return row.token;
  const token = newToken();
  await pool.execute('INSERT IGNORE INTO nova_emergency_links (patient_id, token) VALUES (?, ?)', [patientId, token]);
  const [[saved]] = await pool.execute('SELECT token FROM nova_emergency_links WHERE patient_id = ?', [patientId]);
  return saved.token;
}

/** Nouveau QR : l'ancien (carte perdue, photo partagée…) cesse immédiatement de fonctionner. */
export async function renewEmergencyToken(patientId) {
  const token = newToken();
  await pool.execute(
    'INSERT INTO nova_emergency_links (patient_id, token) VALUES (?, ?) ON DUPLICATE KEY UPDATE token = VALUES(token), created_at = CURRENT_TIMESTAMP(3)',
    [patientId, token]
  );
  return token;
}

export function emergencyUrl(token) {
  const base = (process.env.PUBLIC_APP_URL || (process.env.WEB_ORIGIN || 'http://localhost:5174').split(',')[0]).trim().replace(/\/+$/, '');
  return `${base}/urgence/${token}`;
}

const ageFrom = (birthDate) => {
  const d = new Date(birthDate);
  if (!birthDate || Number.isNaN(d.getTime()) || d.getFullYear() < 1900 || d > new Date()) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : null;
};

/** Fiche publique lue par un secouriste ; null si le lien est inconnu, révoqué ou désactivé. */
export async function getPublicEmergencyCard(token) {
  if (!TOKEN_PATTERN.test(String(token || ''))) return null;
  const [[link]] = await pool.execute('SELECT patient_id FROM nova_emergency_links WHERE token = ?', [token]);
  if (!link) return null;
  const settings = await getSettings(link.patient_id);
  if (settings?.privacy?.emergencyQr === false) return null;
  const card = await getEmergencyCard(link.patient_id);
  if (!card) return null;

  // Journal d'accès du patient, et notification (au plus une toutes les 10 minutes).
  const [[last]] = await pool.execute(
    "SELECT accessed_at FROM nova_access_logs WHERE patient_id = ? AND accessor_role = 'emergency' ORDER BY accessed_at DESC LIMIT 1",
    [link.patient_id]
  );
  await pool.execute(
    "INSERT INTO nova_access_logs (patient_id, accessor_id, accessor_role, data_accessed) VALUES (?, 'qr-urgence', 'emergency', 'Fiche d’urgence (QR)')",
    [link.patient_id]
  );
  if (!last || Date.now() - new Date(last.accessed_at).getTime() > NOTIFY_EVERY_MS) {
    const [[user]] = await pool.execute('SELECT id FROM nova_users WHERE patient_id = ? AND deleted_at IS NULL', [link.patient_id]);
    await createNotification({
      patientId: link.patient_id, userId: user?.id, targetRole: 'patient', type: 'emergency',
      title: 'Fiche d’urgence consultée',
      body: 'Votre QR d’urgence vient d’être scanné. Si ce n’est pas vous ou un secours, changez de QR dans SOS Urgence.',
      linkPage: 'urgence',
    }).catch(() => {});
  }

  return {
    firstName: card.firstName,
    lastName: card.lastName,
    age: ageFrom(card.birthDate),
    sex: card.sex === 'M' ? 'Homme' : card.sex === 'F' ? 'Femme' : null,
    bloodType: card.bloodType || null,
    allergies: card.allergies || [],
    chronicDiseases: card.chronicDiseases || [],
    currentMedications: (card.currentMedications || []).map((m) => [m.name, m.dosage].filter(Boolean).join(' ')),
    emergencyContact: card.emergencyContact?.phone
      ? { name: card.emergencyContact.name || null, relationship: card.emergencyContact.relationship || null, phone: card.emergencyContact.phone }
      : null,
  };
}
