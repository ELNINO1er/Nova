import './isolated-db.js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { initDb, pool } from '../db/database.js';
import { createDoctorPrescription, getDoctorPrescription } from '../services/doctor.service.js';
import { cancelDoctorPrescription } from '../services/prescription-cancellation.service.js';
import { getPrescriptionQR, getMedicationToday, createMedicationIntake, getEmergencyCard } from '../services/patient.service.js';
import { createPharmacyOrder } from '../services/pharmacy-order.service.js';
import { verifyPrescriptionQR } from '../services/pharmacy.service.js';

const patientId = randomUUID();
const doctorId = 'doc-005';
const rxIds = [];
const pharmacyId = randomUUID();

beforeAll(async () => {
  await initDb();
  await pool.execute('INSERT INTO nova_patients (id, first_name, last_name, phone, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', [patientId, 'Patient', 'Annulation fictive', `03${String(Date.now()).slice(-8)}`, new Date().toISOString(), new Date().toISOString()]);
  await pool.execute("INSERT INTO nova_consents (id, patient_id, doctor_id, status, scope, responded_at, expires_at) VALUES (?, ?, ?, 'granted', '[]', NOW(), DATE_ADD(NOW(), INTERVAL 1 DAY))", [randomUUID(), patientId, doctorId]);
  await pool.execute("INSERT INTO nova_pharmacies (id, name) VALUES (?, 'Officine de test annulation')", [pharmacyId]);
});

afterAll(async () => {
  await pool.execute('DELETE FROM nova_medication_intakes WHERE patient_id = ?', [patientId]);
  await pool.execute('DELETE FROM nova_medication_schedules WHERE patient_id = ?', [patientId]);
  for (const id of rxIds) {
    await pool.execute('DELETE FROM nova_prescription_cancellations WHERE prescription_id = ?', [id]);
    await pool.execute('DELETE FROM nova_pharmacy_orders WHERE prescription_id = ?', [id]);
    await pool.execute('DELETE FROM nova_prescription_items WHERE prescription_id = ?', [id]);
    await pool.execute('DELETE FROM nova_prescriptions WHERE id = ?', [id]);
  }
  for (const table of ['nova_medications', 'nova_treatments', 'nova_notifications', 'nova_consents']) {
    // Les médicaments sont nettoyés via leurs traitements pour conserver les clés étrangères.
    if (table === 'nova_medications') await pool.execute('DELETE FROM nova_medications WHERE treatment_id IN (SELECT id FROM nova_treatments WHERE patient_id = ?)', [patientId]);
    else await pool.execute(`DELETE FROM ${table} WHERE patient_id = ?`, [patientId]);
  }
  await pool.execute('DELETE FROM nova_pharmacies WHERE id = ?', [pharmacyId]);
  await pool.execute('DELETE FROM nova_patients WHERE id = ?', [patientId]);
});

async function prescription(withSchedule = false) {
  const rx = await createDoctorPrescription(doctorId, { patientId, notes: 'Note originale', items: [{ name: 'Médicament fictif', quantityPrescribed: 10, quantityUnit: 'unité', ...(withSchedule ? { scheduleTimes: ['08:00'], durationDays: 2 } : {}) }] });
  rxIds.push(rx.id);
  return rx;
}

describe('Annulation tracée des ordonnances', () => {
  it('refuse un autre médecin et un motif vide', async () => {
    const rx = await prescription();
    const qr = await getPrescriptionQR(patientId, rx.id);
    await expect(cancelDoctorPrescription('doc-006', rx.id, 'Correction nécessaire')).rejects.toMatchObject({ status: 404 });
    await expect(cancelDoctorPrescription(doctorId, rx.id, ' ')).rejects.toMatchObject({ status: 422 });
    expect((await verifyPrescriptionQR(qr.token)).status).toBe('active');
  });

  it('conserve les lignes, ferme la commande et invalide la remise après annulation', async () => {
    const rx = await prescription();
    const qr = await getPrescriptionQR(patientId, rx.id);
    const [[item]] = await pool.execute('SELECT id FROM nova_prescription_items WHERE prescription_id = ?', [rx.id]);
    await pool.execute("INSERT INTO nova_pharmacy_orders (id,patient_id,pharmacy_id,prescription_id,status,created_at) VALUES (?,?,?,?,'ready',?)", [randomUUID(), patientId, pharmacyId, rx.id, new Date().toISOString()]);
    await cancelDoctorPrescription(doctorId, rx.id, 'Correction de la prescription après revue');
    const detail = await getDoctorPrescription(doctorId, rx.id);
    expect(detail.status).toBe('cancelled');
    expect(detail.notes).toBe('Note originale');
    expect(detail.items[0].id).toBe(item.id);
    expect(detail.cancellation.reason).toContain('Correction');
    const [[order]] = await pool.execute('SELECT status FROM nova_pharmacy_orders WHERE prescription_id = ?', [rx.id]);
    expect(order.status).toBe('cancelled');
    await expect(cancelDoctorPrescription(doctorId, rx.id, 'Autre motif valable')).rejects.toMatchObject({ status: 409 });
    // Un QR annulé est refusé à sa génération ; les anciens QR sont aussi contrôlés à la remise.
    await expect(getPrescriptionQR(patientId, rx.id)).rejects.toMatchObject({ status: 409 });
    expect((await verifyPrescriptionQR(qr.token)).status).toBe('cancelled');
  });

  it('conserve les prises historiques et distingue le plan annulé', async () => {
    const rx = await prescription(true);
    const [before] = await getMedicationToday(patientId);
    await createMedicationIntake(patientId, before.id, { status: 'taken' });
    await cancelDoctorPrescription(doctorId, rx.id, 'Correction de ce plan avec conservation de l’historique');
    const [after] = await getMedicationToday(patientId);
    expect(after.endsOn).toBe(before.endsOn);
    expect(after.cancelledAt).toBeTruthy();
    expect(after.intake.status).toBe('taken');
    await expect(createMedicationIntake(patientId, before.id, { status: 'missed' })).resolves.toMatchObject({ status: 'missed' });
  });

  it('un envoi concurrent ne rouvre pas une commande après annulation', async () => {
    const rx = await prescription();
    const results = await Promise.allSettled([
      createPharmacyOrder(patientId, { pharmacyId, prescriptionId: rx.id }),
      cancelDoctorPrescription(doctorId, rx.id, 'Annulation concurrente avec un envoi'),
    ]);
    expect(results[1].status).toBe('fulfilled');
    const [[row]] = await pool.execute("SELECT COUNT(*) AS n FROM nova_pharmacy_orders WHERE prescription_id = ? AND status IN ('pending','ready','unavailable')", [rx.id]);
    expect(Number(row.n)).toBe(0);
  });

  it('retire le médicament annulé de la fiche urgence sans modifier son planning', async () => {
    const rx = await prescription(true);
    const name = `Médicament urgence ${rx.id}`;
    await pool.execute('UPDATE nova_medication_schedules SET name = ? WHERE prescription_item_id IN (SELECT id FROM nova_prescription_items WHERE prescription_id = ?)', [name, rx.id]);
    const [before] = await pool.execute('SELECT id, starts_on, ends_on FROM nova_medication_schedules WHERE prescription_item_id IN (SELECT id FROM nova_prescription_items WHERE prescription_id = ?)', [rx.id]);
    expect((await getEmergencyCard(patientId)).currentMedications.some(m => m.name === name)).toBe(true);
    await cancelDoctorPrescription(doctorId, rx.id, 'Arrêt du médicament figurant sur la fiche urgence');
    expect((await getEmergencyCard(patientId)).currentMedications.some(m => m.name === name)).toBe(false);
    const [after] = await pool.execute('SELECT id, starts_on, ends_on FROM nova_medication_schedules WHERE prescription_item_id IN (SELECT id FROM nova_prescription_items WHERE prescription_id = ?)', [rx.id]);
    expect(after).toEqual(before);
  });
});
