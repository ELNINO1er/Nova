import { pool } from '../db/database.js';
import { assertDoctorPatientAccess } from './access.js';
import { createNotification } from './notification.service.js';
import { signalOrders } from './pharmacy-order.service.js';

export async function cancelDoctorPrescription(doctorId, prescriptionId, reason) {
  const cleanReason = String(reason || '').trim();
  if (cleanReason.length < 5 || cleanReason.length > 1000) {
    throw Object.assign(new Error('Indiquez un motif de 5 à 1 000 caractères.'), { status: 422 });
  }
  const [[target]] = await pool.execute(
    'SELECT patient_id FROM nova_prescriptions WHERE id = ? AND doctor_id = ? AND deleted_at IS NULL', [prescriptionId, doctorId]
  );
  if (!target) throw Object.assign(new Error('Ordonnance introuvable.'), { status: 404 });
  await assertDoctorPatientAccess(doctorId, target.patient_id);

  const conn = await pool.getConnection();
  let affectedOrders = [];
  try {
    await conn.beginTransaction();
    // Même ordre de verrouillage que l’envoi d’une ordonnance à une pharmacie.
    await conn.execute('SELECT id FROM nova_patients WHERE id = ? FOR UPDATE', [target.patient_id]);
    // Même verrou que la délivrance : une annulation et une remise ne se croisent pas.
    const [[rx]] = await conn.execute('SELECT status FROM nova_prescriptions WHERE id = ? AND doctor_id = ? AND deleted_at IS NULL FOR UPDATE', [prescriptionId, doctorId]);
    if (!rx || !['active', 'partial'].includes(rx.status)) {
      throw Object.assign(new Error('Cette ordonnance est déjà clôturée.'), { status: 409 });
    }
    await conn.execute('INSERT INTO nova_prescription_cancellations (prescription_id, doctor_id, reason) VALUES (?, ?, ?)', [prescriptionId, doctorId, cleanReason]);
    await conn.execute("UPDATE nova_prescriptions SET status = 'cancelled' WHERE id = ?", [prescriptionId]);
    [affectedOrders] = await conn.execute("SELECT id, patient_id, pharmacy_id FROM nova_pharmacy_orders WHERE prescription_id = ? AND status IN ('pending','ready','unavailable')", [prescriptionId]);
    await conn.execute("UPDATE nova_pharmacy_orders SET status = 'cancelled', updated_at = NOW(3) WHERE prescription_id = ? AND status IN ('pending','ready','unavailable')", [prescriptionId]);
    const [[user]] = await conn.execute('SELECT id FROM nova_users WHERE patient_id = ? AND deleted_at IS NULL', [target.patient_id]);
    await createNotification({ patientId: target.patient_id, userId: user?.id, targetRole: 'patient', type: 'prescription', title: 'Ordonnance annulée par votre médecin', body: 'Consultez votre ordonnance et contactez votre médecin pour connaître la conduite à tenir.', linkPage: 'prescriptions', linkTargetId: prescriptionId, sourceRole: 'doctor' }, conn);
    await conn.commit();
  } catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
  await signalOrders(affectedOrders).catch(() => {});
  return { id: prescriptionId, status: 'cancelled', reason: cleanReason };
}
