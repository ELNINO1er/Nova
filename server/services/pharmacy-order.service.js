import { randomUUID } from 'node:crypto';
import { pool } from '../db/database.js';
import { createNotification } from './notification.service.js';
import { getPrescriptionForPharmacy, withPatient } from './pharmacy.service.js';
import { emitToUser } from '../realtime.js';
import { isPrescriptionExpired, prescriptionStatus } from './prescription-status.js';

/*
 * Commandes d'ordonnance : le patient envoie une ordonnance active à une pharmacie de son choix,
 * qui la prépare puis répond « prête » ou « indisponible ». La remise reste au comptoir, sur
 * présentation du QR de l'ordonnance (preuve de présence) : la délivrance clôt alors la commande.
 * La pharmacie ne lit l'ordonnance que parce que le patient la lui a envoyée, et seulement tant
 * que la commande est en cours.
 */
export const OPEN_STATUSES = ['pending', 'ready', 'unavailable'];
const err = (status, message, code) => Object.assign(new Error(message), { status, code });
const today = () => new Date().toISOString().slice(0, 10);

async function pharmacistUserIds(pharmacyId, conn = pool) {
  const [rows] = await conn.execute("SELECT id FROM nova_users WHERE pharmacy_id = ? AND role = 'pharmacist' AND deleted_at IS NULL AND disabled_at IS NULL", [pharmacyId]);
  return rows.map((r) => r.id);
}
async function patientUserId(patientId, conn = pool) {
  const [[u]] = await conn.execute('SELECT id FROM nova_users WHERE patient_id = ? AND deleted_at IS NULL', [patientId]);
  return u?.id || null;
}
// Signal temps réel (sans contenu) : les écrans concernés rechargent leurs commandes.
async function signal(order) {
  for (const id of await pharmacistUserIds(order.pharmacy_id)) emitToUser(id, 'pharmacy-order:changed', { id: order.id });
  emitToUser(await patientUserId(order.patient_id), 'pharmacy-order:changed', { id: order.id });
}

/* ─── Côté patient ─────────────────────────────────────────── */

export async function createPharmacyOrder(patientId, { pharmacyId, prescriptionId, notes }) {
  if (!prescriptionId) throw err(422, 'Choisissez l’ordonnance à envoyer.', 'prescription_required');
  const conn = await pool.getConnection();
  let order, closedStale = [];
  try {
    await conn.beginTransaction();
    await conn.execute('SELECT id FROM nova_patients WHERE id = ? FOR UPDATE', [patientId]);
    const [[ph]] = await conn.execute('SELECT id, name FROM nova_pharmacies WHERE id = ?', [pharmacyId]);
    if (!ph) throw err(404, 'Pharmacie introuvable.');
    const [[rx]] = await conn.execute('SELECT id, status, valid_until, issued_at FROM nova_prescriptions WHERE id = ? AND patient_id = ? AND deleted_at IS NULL', [prescriptionId, patientId]);
    if (!rx) throw err(404, 'Ordonnance introuvable.');
    if (!['active', 'partial'].includes(rx.status)) throw err(409, 'Cette ordonnance a déjà été délivrée ou n’est plus active.', 'prescription_closed');
    if (isPrescriptionExpired(rx)) throw err(409, 'Cette ordonnance a expiré : demandez-en une nouvelle à votre médecin.', 'prescription_expired');
    const [[open]] = await conn.execute(
      `SELECT o.id, ph.name FROM nova_pharmacy_orders o JOIN nova_pharmacies ph ON ph.id = o.pharmacy_id
       WHERE o.patient_id = ? AND o.prescription_id = ? AND o.status IN ('pending','ready') LIMIT 1`, [patientId, prescriptionId]);
    if (open) throw err(409, `Cette ordonnance est déjà envoyée à ${open.name}. Annulez cette demande pour en choisir une autre.`, 'order_exists');
    const id = randomUUID(), now = new Date();
    // Les demandes restées « indisponibles » pour cette ordonnance sont closes : une seule pharmacie la lit.
    const [stale] = await conn.execute("SELECT id, patient_id, pharmacy_id FROM nova_pharmacy_orders WHERE patient_id = ? AND prescription_id = ? AND status = 'unavailable'", [patientId, prescriptionId]);
    if (stale.length) await conn.execute("UPDATE nova_pharmacy_orders SET status = 'cancelled', updated_at = ? WHERE patient_id = ? AND prescription_id = ? AND status = 'unavailable'", [now, patientId, prescriptionId]);
    closedStale = stale;
    await conn.execute(
      'INSERT INTO nova_pharmacy_orders (id, patient_id, pharmacy_id, prescription_id, status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, patientId, pharmacyId, prescriptionId, 'pending', notes?.trim() || null, now.toISOString(), now]);
    await conn.commit();
    order = { id, patient_id: patientId, pharmacy_id: pharmacyId };
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  await signal(order);
  for (const o of closedStale) await signal(o);
  return (await getPharmacyOrders(patientId)).find((o) => o.id === order.id);
}

export async function cancelPharmacyOrder(patientId, orderId) {
  const [r] = await pool.execute(
    "UPDATE nova_pharmacy_orders SET status = 'cancelled', updated_at = ? WHERE id = ? AND patient_id = ? AND status IN ('pending','ready','unavailable')",
    [new Date(), orderId, patientId]);
  if (!r.affectedRows) throw err(404, 'Demande introuvable ou déjà terminée.');
  const [[o]] = await pool.execute('SELECT id, patient_id, pharmacy_id FROM nova_pharmacy_orders WHERE id = ?', [orderId]);
  await signal(o);
  return { ok: true };
}

export async function getPharmacyOrders(patientId) {
  const [rows] = await pool.execute(
    `SELECT po.*, ph.name AS pharmacy_name, ph.address AS pharmacy_address, ph.phone AS pharmacy_phone, ph.city AS pharmacy_city,
            rx.doctor_name, rx.issued_at,
            (SELECT COUNT(*) FROM nova_prescription_items i WHERE i.prescription_id = po.prescription_id) AS item_count
     FROM nova_pharmacy_orders po
     JOIN nova_pharmacies ph ON ph.id = po.pharmacy_id
     LEFT JOIN nova_prescriptions rx ON rx.id = po.prescription_id
     WHERE po.patient_id = ?
     ORDER BY po.created_at DESC LIMIT 100`, [patientId]);
  return rows.map((r) => ({
    id: r.id, status: r.status, notes: r.notes, pharmacistMessage: r.pharmacist_message || null,
    createdAt: r.created_at, updatedAt: r.updated_at,
    pharmacyId: r.pharmacy_id, pharmacyName: r.pharmacy_name, pharmacyAddress: r.pharmacy_address, pharmacyCity: r.pharmacy_city, pharmacyPhone: r.pharmacy_phone,
    prescriptionId: r.prescription_id, prescriptionDoctor: r.doctor_name, prescriptionIssuedAt: r.issued_at, itemCount: Number(r.item_count || 0),
  }));
}

/* ─── Côté pharmacie ───────────────────────────────────────── */

export async function getOrdersForPharmacy(pharmacyId) {
  const [rows] = await pool.execute(
    `SELECT po.*, p.first_name, p.last_name FROM nova_pharmacy_orders po
     JOIN nova_patients p ON p.id = po.patient_id
     WHERE po.pharmacy_id = ? AND (po.status IN ('pending','ready','unavailable') OR po.updated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY))
     ORDER BY FIELD(po.status,'pending','ready','unavailable','dispensed','cancelled'), po.created_at DESC LIMIT 200`, [pharmacyId]);
  return Promise.all(rows.map(async (r) => {
    const open = OPEN_STATUSES.includes(r.status);
    // L'ordonnance n'est lisible que pendant la commande en cours.
    const rx = open && r.prescription_id ? await getPrescriptionForPharmacy(r.prescription_id) : null;
    // Seules les commandes en cours (ordonnance lisible) comptent comme une lecture du dossier.
    return withPatient({
      id: r.id, status: r.status, notes: r.notes, pharmacistMessage: r.pharmacist_message || null,
      createdAt: r.created_at, updatedAt: r.updated_at,
      patientName: `${r.first_name || ''} ${(r.last_name || '').charAt(0)}.`.trim(),
      prescription: rx && { id: rx.id, doctorName: rx.doctorName, doctorSpecialty: rx.doctorSpecialty, issuedAt: rx.issuedAt, validUntil: rx.validUntil, status: prescriptionStatus({ status: rx.status, valid_until: rx.validUntil }),
        items: rx.items.map(({ id, name, dosage, frequency, duration, instructions, quantityPrescribed, quantityUnit, remaining }) => ({ id, name, dosage, frequency, duration, instructions, quantityPrescribed, quantityUnit, remaining })) },
    }, rx ? r.patient_id : null);
  }));
}

const NEXT = { ready: ['pending', 'unavailable', 'ready'], unavailable: ['pending', 'ready', 'unavailable'] };

export async function updateOrderStatus(pharmacyId, orderId, { status, message }) {
  if (!NEXT[status]) throw err(422, 'Statut invalide.');
  if (status === 'unavailable' && !message?.trim()) throw err(422, 'Expliquez au patient pourquoi la commande est indisponible.', 'message_required');
  const [[o]] = await pool.execute('SELECT * FROM nova_pharmacy_orders WHERE id = ? AND pharmacy_id = ?', [orderId, pharmacyId]);
  if (!o) throw err(404, 'Commande introuvable.');
  if (!NEXT[status].includes(o.status)) throw err(409, 'Cette commande est déjà terminée ou annulée par le patient.', 'order_closed');
  if (status === 'ready' && o.status === 'ready') throw err(409, 'Le patient a déjà été prévenu que l’ordonnance est prête.', 'already_ready');
  if (status === 'ready') {
    const [[rx]] = await pool.execute('SELECT status, valid_until, issued_at FROM nova_prescriptions WHERE id = ? AND deleted_at IS NULL', [o.prescription_id]);
    if (!rx || !['active', 'partial'].includes(rx.status) || isPrescriptionExpired(rx))
      throw err(409, 'Cette ordonnance est expirée ou déjà délivrée : elle ne peut pas être préparée. Indiquez-la indisponible.', 'prescription_closed');
  }
  await pool.execute('UPDATE nova_pharmacy_orders SET status = ?, pharmacist_message = ?, updated_at = ? WHERE id = ?', [status, message?.trim() || null, new Date(), orderId]);
  const [[ph]] = await pool.execute('SELECT name FROM nova_pharmacies WHERE id = ?', [pharmacyId]);
  await createNotification({
    patientId: o.patient_id, userId: await patientUserId(o.patient_id), targetRole: 'patient', type: 'pharmacy',
    title: status === 'ready' ? 'Ordonnance prête à retirer' : 'Ordonnance indisponible',
    body: status === 'ready'
      ? `${ph.name} a préparé votre ordonnance. Présentez son QR code au comptoir.${message?.trim() ? ` Message : ${message.trim()}` : ''}`
      : `${ph.name} ne peut pas préparer votre ordonnance : ${message.trim()}`,
    linkPage: 'pharmacy', linkTargetId: 'orders',
  });
  await signal(o);
  return { ok: true };
}

/** Appelé dans la transaction de délivrance : la commande en cours de cette pharmacie est close. */
export async function closeOrdersOnDispense(conn, { pharmacyId, prescriptionId, dispenseId, status, notes }) {
  if (status === 'refused') {
    // Refus au comptoir : la commande de cette pharmacie passe « indisponible » avec le motif (le patient peut en choisir une autre).
    const [rows] = await conn.execute("SELECT id, patient_id, pharmacy_id FROM nova_pharmacy_orders WHERE pharmacy_id = ? AND prescription_id = ? AND status IN ('pending','ready')", [pharmacyId, prescriptionId]);
    if (rows.length) await conn.execute("UPDATE nova_pharmacy_orders SET status = 'unavailable', pharmacist_message = ?, updated_at = ? WHERE pharmacy_id = ? AND prescription_id = ? AND status IN ('pending','ready')", [`Délivrance refusée : ${String(notes || '').slice(0, 450)}`, new Date(), pharmacyId, prescriptionId]);
    return rows;
  }
  if (status === 'partial') {
    // Délivrance partielle : la commande reste ouverte chez cette pharmacie pour le reste à fournir.
    const [rows] = await conn.execute("SELECT id, patient_id, pharmacy_id FROM nova_pharmacy_orders WHERE pharmacy_id = ? AND prescription_id = ? AND status IN ('pending','ready','unavailable')", [pharmacyId, prescriptionId]);
    if (rows.length) await conn.execute("UPDATE nova_pharmacy_orders SET status = 'pending', dispense_id = ?, pharmacist_message = 'Délivrance partielle : reste à fournir.', updated_at = ? WHERE pharmacy_id = ? AND prescription_id = ? AND status IN ('pending','ready','unavailable')", [dispenseId, new Date(), pharmacyId, prescriptionId]);
    return rows;
  }
  // Toutes les demandes ouvertes de l'ordonnance sont closes : « délivrée » chez la pharmacie qui délivre, annulée ailleurs.
  const [rows] = await conn.execute(
    "SELECT id, patient_id, pharmacy_id FROM nova_pharmacy_orders WHERE prescription_id = ? AND status IN ('pending','ready','unavailable')",
    [prescriptionId]);
  if (rows.length) {
    await conn.execute(
      "UPDATE nova_pharmacy_orders SET status = 'dispensed', dispense_id = ?, updated_at = ? WHERE pharmacy_id = ? AND prescription_id = ? AND status IN ('pending','ready','unavailable')",
      [dispenseId, new Date(), pharmacyId, prescriptionId]);
    await conn.execute(
      "UPDATE nova_pharmacy_orders SET status = 'cancelled', updated_at = ? WHERE pharmacy_id <> ? AND prescription_id = ? AND status IN ('pending','ready','unavailable')",
      [new Date(), pharmacyId, prescriptionId]);
  }
  return rows;
}
export const signalOrders = (rows) => Promise.all(rows.map(signal));
