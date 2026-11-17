import {persistMessage,listMessages,emitConversationRead} from './messaging.service.js';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { pool } from '../db/database.js';
import { medicalList } from './medical-profile.js';
import { getDoctorAccessDetails } from './access.js';
import { notifyDoctorConsent, notifyDoctorAppointment, notifyDoctorAppointmentChange } from './notification.service.js';
import { APPOINTMENT_TRANSITIONS, assertDoctorSlotFree, assertFuture, assertTransition, releaseSlotFor, withDoctorSchedule, reserveMatchingSlot } from './workflow.js';
import { parsePagination, paginatedResponse } from '../middleware/paginate.js';
import { CONSENT_TERMS_VERSION, CONSENT_DURATION_DAYS } from './consent-terms.js';
import { vitalLevel } from './vital-norms.js';

/* ─── Dashboard ─────────────────────────────────────────────── */

export async function getDashboard(patientId) {
  const [profile, latestVitals, todayMedications] = await Promise.all([
    getProfile(patientId),
    getDashboardVitals(patientId),
    getMedicationToday(patientId),
  ]);

  const [[nextRow]] = await pool.execute(
    `SELECT * FROM nova_appointments
     WHERE patient_id = ? AND starts_at >= ? AND status <> 'cancelled'
     ORDER BY starts_at ASC LIMIT 1`,
    [patientId, new Date().toISOString()]
  );
  const nextAppointment = nextRow ? mapAppointment(nextRow) : null;

  const [[{ total: unreadMessages }]] = await pool.execute(
    "SELECT COUNT(*) AS total FROM nova_messages m JOIN nova_conversations c ON c.id = m.conversation_id WHERE c.patient_id = ? AND m.sender_role = 'doctor' AND m.is_read = 0",
    [patientId]
  );
  const [[{ total: documentsCount }]] = await pool.execute(
    'SELECT COUNT(*) AS total FROM nova_documents WHERE patient_id = ?',
    [patientId]
  );

  return {
    profile,
    latestVitals,
    nextAppointment,
    todayMedications,
    unreadMessages: Number(unreadMessages),
    documentsCount: Number(documentsCount),
  };
}

/* ─── Profil ─────────────────────────────────────────────────── */

export async function getProfile(patientId) {
  const [[row]] = await pool.execute(
    'SELECT * FROM nova_patients WHERE id = ?', [patientId]
  );
  return row ? mapPatient(row) : null;
}

export async function updateProfile(patientId, changes) {
  const current = await getProfile(patientId);
  if (!current) return null;

  // Un champ envoyé vide (« » ou null) est effacé ; un champ absent garde sa valeur.
  // Le téléphone n'est pas modifiable ici : c'est l'identifiant de connexion (changement par le médecin ou l'administrateur).
  const pick = (key, fallback) => (Object.prototype.hasOwnProperty.call(changes, key) ? (changes[key] === '' ? null : changes[key]) : fallback);
  const next = {
    first_name:               changes.firstName || current.firstName,
    last_name:                changes.lastName || current.lastName,
    birth_date:               pick('birthDate', current.birthDate),
    sex:                      pick('sex', current.sex),
    blood_type:               pick('bloodType', current.bloodType),
    phone:                    current.phone,
    email:                    pick('email', current.email),
    address:                  pick('address', current.address),
    city:                     pick('city', current.city),
    weight_kg:                pick('weightKg', current.weightKg),
    height_cm:                pick('heightCm', current.heightCm),
    emergency_name:           pick('emergencyName', current.emergencyContact?.name),
    emergency_relationship:   pick('emergencyRelationship', current.emergencyContact?.relationship),
    emergency_phone:          pick('emergencyPhone', current.emergencyContact?.phone),
    updated_at:               new Date().toISOString(),
  };

  await pool.execute(`
    UPDATE nova_patients
    SET first_name = ?, last_name = ?, birth_date = ?, sex = ?, blood_type = ?,
        phone = ?, email = ?, address = ?, city = ?,
        weight_kg = ?, height_cm = ?,
        emergency_name = ?, emergency_relationship = ?, emergency_phone = ?,
        updated_at = ?
    WHERE id = ?
  `, [
    next.first_name, next.last_name, next.birth_date, next.sex, next.blood_type,
    next.phone, next.email, next.address, next.city,
    next.weight_kg, next.height_cm,
    next.emergency_name, next.emergency_relationship, next.emergency_phone,
    next.updated_at, patientId,
  ]);

  return getProfile(patientId);
}

/* ─── Vitaux ─────────────────────────────────────────────────── */

export async function getVitals(patientId, query) {
  const [rows] = query.type
    ? await pool.execute(
        'SELECT * FROM nova_vitals WHERE patient_id = ? AND type = ? ORDER BY measured_at DESC',
        [patientId, query.type]
      )
    : await pool.execute(
        'SELECT * FROM nova_vitals WHERE patient_id = ? ORDER BY measured_at DESC',
        [patientId]
      );
  return rows.map(mapVital);
}

/* ─── Traitements ────────────────────────────────────────────── */

export async function getTreatments(patientId) {
  const [treatments] = await pool.execute(
    'SELECT * FROM nova_treatments WHERE patient_id = ? ORDER BY started_at DESC',
    [patientId]
  );
  if (!treatments.length) return [];
  const tIds = treatments.map(t => t.id);
  const [allMeds] = await pool.execute(
    `SELECT * FROM nova_medications WHERE treatment_id IN (${tIds.map(() => '?').join(',')})`,
    tIds
  );
  const medsByTreatment = new Map();
  for (const m of allMeds) {
    const list = medsByTreatment.get(m.treatment_id) || [];
    list.push(mapMedication(m));
    medsByTreatment.set(m.treatment_id, list);
  }
  return treatments.map(t => ({
    id: t.id,
    diagnosis: t.diagnosis,
    status: t.status,
    stage: t.stage,
    progress: t.progress,
    startedAt: t.started_at,
    doctorName: t.doctor_name,
    nextCheckupAt: t.next_checkup_at,
    medications: medsByTreatment.get(t.id) || [],
  }));
}

/* ─── Médicaments ────────────────────────────────────────────── */

export async function getMedicationToday(patientId) {
  const [schedules] = await pool.execute(
    "SELECT * FROM nova_medication_schedules WHERE patient_id = ? AND (starts_on IS NULL OR starts_on<=DATE_FORMAT(UTC_DATE(),'%Y-%m-%d')) AND (ends_on IS NULL OR ends_on>=DATE_FORMAT(UTC_DATE(),'%Y-%m-%d')) ORDER BY take_time ASC",
    [patientId]
  );
  const today = new Date().toISOString().slice(0, 10);
  const [intakes] = await pool.execute(
    `SELECT schedule_id, status, taken_at FROM nova_medication_intakes
     WHERE patient_id = ? AND LEFT(taken_at, 10) = ?`,
    [patientId, today]
  );
  const intakeBySchedule = new Map(intakes.map((i) => [i.schedule_id, i]));

  return schedules.map((row) => ({
    id: row.id,
    medicationId: row.medication_id,
    prescriptionItemId:row.prescription_item_id, startsOn:row.starts_on,endsOn:row.ends_on,
    name: row.name,
    dosage: row.dosage,
    time: row.take_time,
    period: row.period,
    color: row.color,
    interaction: Boolean(row.has_interaction),
    intake: intakeBySchedule.get(row.id) || null,
  }));
}

export async function createMedicationIntake(patientId,scheduleId,payload){
 const now=new Date().toISOString(),takenAt=payload.takenAt||now,day=takenAt.slice(0,10);
 if(!Number.isFinite(Date.parse(takenAt))||day>now.slice(0,10))throw Object.assign(new Error('Date de prise invalide ou future.'),{status:422});
 const conn=await pool.getConnection();
 try{
  await conn.beginTransaction();
  const [[schedule]]=await conn.execute('SELECT * FROM nova_medication_schedules WHERE id=? AND patient_id=? FOR UPDATE',[scheduleId,patientId]);
  if(!schedule)throw Object.assign(new Error('Médicament non autorisé.'),{status:403});
  if((schedule.starts_on&&day<schedule.starts_on)||(schedule.ends_on&&day>schedule.ends_on))throw Object.assign(new Error('Date hors de la période prescrite.'),{status:422});
  const [[existing]]=await conn.execute('SELECT id FROM nova_medication_intakes WHERE patient_id=? AND schedule_id=? AND LEFT(taken_at,10)=?',[patientId,scheduleId,day]);
  const id=existing?.id||randomUUID();
  if(existing)await conn.execute('UPDATE nova_medication_intakes SET status=?,taken_at=? WHERE id=?',[payload.status,takenAt,id]);
  else await conn.execute('INSERT INTO nova_medication_intakes(id,patient_id,schedule_id,status,taken_at,created_at) VALUES (?,?,?,?,?,?)',[id,patientId,scheduleId,payload.status,takenAt,now]);
  await conn.commit();return {id,patientId,scheduleId,status:payload.status,takenAt};
 }catch(e){await conn.rollback();throw e;}finally{conn.release();}
}

/* ─── Rendez-vous ────────────────────────────────────────────── */

export async function getAppointments(patientId) {
  const [rows] = await pool.execute(
    'SELECT * FROM nova_appointments WHERE patient_id = ? ORDER BY starts_at ASC',
    [patientId]
  );
  return rows.map(mapAppointment);
}

// Partager son dossier en réservant ouvre l'accès au médecin : les conditions doivent avoir été acceptées.
function assertShareAck(shareRecord, ack) {
  if (shareRecord && ack?.termsVersion !== CONSENT_TERMS_VERSION) {
    throw Object.assign(new Error('Lisez et acceptez les conditions de partage avant de partager votre dossier.'), { status: 422, code: 'consent_terms_required' });
  }
}

export async function createAppointment(patientId, payload) {
  assertShareAck(payload.shareRecord, payload.ack);
  if(payload.mode==='video')throw Object.assign(new Error('Téléconsultation indisponible : aucun service vidéo intégré.'),{status:503});
  const startsAt=new Date(payload.startsAt).toISOString(); assertFuture(startsAt);
  const id=randomUUID();
  await withDoctorSchedule(payload.doctorId, async(conn,doctor)=>{
    if(!doctor.is_available) throw Object.assign(new Error('Medecin indisponible.'),{status:409});
    await assertDoctorSlotFree(doctor.id,startsAt,null,conn);
    await reserveMatchingSlot(conn,doctor.id,startsAt,patientId);
    await conn.execute("INSERT INTO nova_appointments(id,patient_id,doctor_id,starts_at,doctor_name,specialty,location,mode,status,created_at,updated_at,record_shared_at,share_terms_version,share_acknowledged_at) VALUES (?,?,?,?,?,?,?,?,'requested',?,?,?,?,?)",[id,patientId,doctor.id,startsAt,`Dr. ${doctor.first_name} ${doctor.last_name}`,doctor.specialty||'',doctor.city||'',payload.mode||'onsite',new Date().toISOString(),new Date().toISOString(),payload.shareRecord?new Date():null,payload.shareRecord?CONSENT_TERMS_VERSION:null,payload.shareRecord?new Date():null]);
  });
  const [[who]]=await pool.execute('SELECT first_name,last_name FROM nova_patients WHERE id=?',[patientId]);
  notifyDoctorAppointment(payload.doctorId,`${who?.first_name||''} ${who?.last_name||''}`.trim()||'Un patient',frDate(startsAt)).catch(()=>{});
  return getAppointment(patientId,id);
}

const frDate = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' });

export async function updateAppointment(patientId,id,changes) {
  const [[initial]]=await pool.execute('SELECT doctor_id FROM nova_appointments WHERE id=? AND patient_id=?',[id,patientId]);
  if(!initial) return null;
  await withDoctorSchedule(initial.doctor_id,async(conn)=>{
    const [[row]]=await conn.execute('SELECT * FROM nova_appointments WHERE id=? AND patient_id=? FOR UPDATE',[id,patientId]);
    if(row.status==='cancelled') { if(changes.status==='cancelled') return; throw Object.assign(new Error('Rendez-vous annule.'),{status:409}); }
    if(changes.status) assertTransition(APPOINTMENT_TRANSITIONS,row.status,changes.status,'patient');
    let startsAt=row.starts_at,status=row.status;
    if(changes.status==='cancelled') {status='cancelled';await releaseSlotFor(row,conn);}
    else if(changes.startsAt && new Date(changes.startsAt).toISOString()!==row.starts_at){
      startsAt=new Date(changes.startsAt).toISOString();assertFuture(startsAt);
      await assertDoctorSlotFree(row.doctor_id,startsAt,id,conn);
      await releaseSlotFor(row,conn);await reserveMatchingSlot(conn,row.doctor_id,startsAt,patientId);status='requested';
    }
    await conn.execute('UPDATE nova_appointments SET starts_at=?,status=?,mode=?,updated_at=? WHERE id=?',[startsAt,status,changes.mode||row.mode,new Date().toISOString(),id]);
  });
  notifyDoctorAppointmentChange(initial.doctor_id,'Votre patient',changes.status==='cancelled'?'cancelled':'moved',changes.startsAt?frDate(changes.startsAt):'').catch(()=>{});
  return getAppointment(patientId,id);
}
export async function cancelAppointment(patientId,id) {return updateAppointment(patientId,id,{status:'cancelled'});}
export async function deleteAppointment(patientId,id) {return cancelAppointment(patientId,id);}

/* ─── Vaccinations ───────────────────────────────────────────── */

export async function getVaccinations(patientId) {
  const [rows] = await pool.execute(
    'SELECT * FROM nova_vaccinations WHERE patient_id = ? ORDER BY injected_at DESC',
    [patientId]
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    injectedAt: row.injected_at,
    status: row.status,
    nextDueAt: row.next_due_at,
  }));
}

/* ─── Historique médical ─────────────────────────────────────── */

export async function getHistory(patientId, query = {}) {
  const pg = parsePagination(query);
  const [[{ total }]] = await pool.execute(
    'SELECT COUNT(*) AS total FROM nova_medical_history WHERE patient_id = ?', [patientId]
  );
  const [rows] = await pool.execute(
    `SELECT * FROM nova_medical_history WHERE patient_id = ? ORDER BY occurred_at DESC LIMIT ${pg.limit} OFFSET ${pg.offset}`,
    [patientId]
  );
  return paginatedResponse(rows.map((row) => ({
    id: row.id, type: row.type, title: row.title,
    occurredAt: row.occurred_at, doctorName: row.doctor_name,
  })), total, pg);
}

/* ─── Documents ──────────────────────────────────────────────── */

export async function getDocuments(patientId, query = {}) {
  const pg = parsePagination(query);
  const catFilter = query.category ? ' AND category = ?' : '';
  const catArgs = query.category ? [query.category] : [];

  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM nova_documents WHERE patient_id = ?${catFilter}`,
    [patientId, ...catArgs]
  );
  const [rows] = await pool.execute(
    `SELECT * FROM nova_documents WHERE patient_id = ?${catFilter} ORDER BY created_at DESC LIMIT ${pg.limit} OFFSET ${pg.offset}`,
    [patientId, ...catArgs]
  );
  return paginatedResponse(rows.map(mapDocument), total, pg);
}

export async function createDocument(patientId, payload) {
  const id = randomUUID();
  await pool.execute(
    `INSERT INTO nova_documents (id, patient_id, title, category, mime_type, size_bytes, file_path, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, patientId, payload.title, payload.category,
     payload.mimeType || 'application/pdf', payload.sizeBytes || 0,
     payload.filePath ? payload.filePath.replace(/\\/g, '/').replace(/^.*\/data\/uploads\//, '') : null, new Date().toISOString()]
  );
  const [[row]] = await pool.execute('SELECT * FROM nova_documents WHERE id = ?', [id]);
  return mapDocument(row);
}

export async function deleteDocument(patientId, id) {
  const [[doc]] = await pool.execute(
    'SELECT file_path FROM nova_documents WHERE patient_id = ? AND id = ?', [patientId, id]
  );
  if (!doc) { const err = new Error('Document introuvable'); err.status = 404; throw err; }
  await pool.execute(
    'DELETE FROM nova_documents WHERE patient_id = ? AND id = ?', [patientId, id]
  );
  if (doc.file_path) {
    const { unlink } = await import('node:fs/promises');
    const { uploadDir: ud } = await import('../middleware/upload.js');
    const { join } = await import('node:path');
    await unlink(join(ud, doc.file_path)).catch(() => {});
  }
}

export async function getDocumentFile(patientId, id) {
  const [[doc]] = await pool.execute(
    'SELECT id, title, mime_type, file_path FROM nova_documents WHERE patient_id = ? AND id = ?',
    [patientId, id]
  );
  if (!doc || !doc.file_path) return null;

  const { uploadDir: ud } = await import('../middleware/upload.js');
  const { resolve, join, basename } = await import('node:path');
  const absolute = resolve(join(ud, doc.file_path));
  const root = resolve(ud);
  if (!absolute.startsWith(root + (await import('node:path')).sep)) {
    const err = new Error('Chemin document invalide.');
    err.status = 400;
    throw err;
  }

  return {
    path: absolute,
    mimeType: doc.mime_type || 'application/octet-stream',
    filename: basename(doc.file_path),
    title: doc.title,
  };
}

/* ─── Conversations & Messages ───────────────────────────────── */

export async function getConversations(patientId) {
  const [rows] = await pool.execute(
    "SELECT c.*,(SELECT COUNT(*) FROM nova_messages m WHERE m.conversation_id=c.id AND m.sender_role='doctor' AND m.is_read=0) unread_count FROM nova_conversations c WHERE patient_id = ? ORDER BY updated_at DESC",
    [patientId]
  );
  return rows.map(mapConversation);
}

export async function getConversation(patientId, conversationId) {
  const [[row]] = await pool.execute(
    'SELECT * FROM nova_conversations WHERE patient_id = ? AND id = ?',
    [patientId, conversationId]
  );
  if (!row) return null;

  return {
    ...mapConversation(row),
    messages: await listMessages(row),
  };
}

export async function createMessage(patientId,conversationId,payload){return persistMessage('patient',patientId,conversationId,payload);}

export async function markConversationRead(patientId, conversationId) {
  const [[conv]] = await pool.execute(
    'SELECT id FROM nova_conversations WHERE patient_id = ? AND id = ?',
    [patientId, conversationId]
  );
  if (!conv) return null;

  await pool.execute(
    `UPDATE nova_messages SET is_read = 1
     WHERE conversation_id = ? AND sender_role = 'doctor' AND is_read = 0`,
    [conversationId]
  );
  await pool.execute(
    'UPDATE nova_conversations SET unread_count = 0 WHERE id = ?',
    [conversationId]
  );
  await emitConversationRead(conversationId, 'patient');
  return { ok: true };
}

/* ─── Ordonnances ────────────────────────────────────────────── */

// Une ordonnance active ou partiellement délivrée dont la date de validité est passée est « expirée ».
function prescriptionStatus(row) {
  const today = new Date().toISOString().slice(0, 10);
  if (['active', 'partial'].includes(row.status) && row.valid_until && String(row.valid_until).slice(0, 10) < today) return 'expired';
  return row.status;
}

const prescriptionItemTotals = `SELECT i.*, COALESCE((
  SELECT SUM(di.quantity_dispensed)
  FROM nova_dispense_items di JOIN nova_dispenses d ON d.id = di.dispense_id
  WHERE di.prescription_item_id = i.id AND d.status <> 'refused'
), 0) AS dispensed_quantity FROM nova_prescription_items i`;

function patientPrescriptionItem(item) {
  const quantity = item.quantity_prescribed;
  const dispensed = Number(item.dispensed_quantity);
  return {
    id: item.id, name: item.name, dosage: item.dosage, frequency: item.frequency,
    duration: item.duration, instructions: item.instructions, quantityPrescribed: quantity,
    quantityUnit: item.quantity_unit, quantityDispensed: dispensed,
    remaining: quantity == null ? null : Math.max(0, Number(quantity) - dispensed),
  };
}

export async function getPrescriptions(patientId, query = {}) {
  const [rows] = query.status
    ? await pool.execute(
        'SELECT * FROM nova_prescriptions WHERE patient_id = ? AND deleted_at IS NULL AND status = ? ORDER BY issued_at DESC',
        [patientId, query.status]
      )
    : await pool.execute(
        'SELECT * FROM nova_prescriptions WHERE patient_id = ? AND deleted_at IS NULL ORDER BY issued_at DESC',
        [patientId]
      );

  if (!rows.length) return [];
  const pIds = rows.map(r => r.id);
  const [allItems] = await pool.execute(
    `${prescriptionItemTotals} WHERE i.prescription_id IN (${pIds.map(() => '?').join(',')})`,
    pIds
  );
  const itemsByPrescription = new Map();
  for (const i of allItems) {
    const list = itemsByPrescription.get(i.prescription_id) || [];
    list.push(patientPrescriptionItem(i));
    itemsByPrescription.set(i.prescription_id, list);
  }
  return rows.map(row => ({
    id: row.id,
    doctorName: row.doctor_name,
    doctorSpecialty: row.doctor_specialty,
    issuedAt: row.issued_at,
    validUntil: row.valid_until,
    status: prescriptionStatus(row),
    notes: row.notes,
    items: itemsByPrescription.get(row.id) || [],
  }));
}

export async function getPrescription(patientId, id) {
  const [[row]] = await pool.execute(
    'SELECT * FROM nova_prescriptions WHERE patient_id = ? AND id = ? AND deleted_at IS NULL',
    [patientId, id]
  );
  if (!row) return null;
  const [items] = await pool.execute(
    `${prescriptionItemTotals} WHERE i.prescription_id = ?`,
    [id]
  );
  return {
    id: row.id,
    doctorName: row.doctor_name,
    doctorSpecialty: row.doctor_specialty,
    issuedAt: row.issued_at,
    validUntil: row.valid_until,
    status: prescriptionStatus(row),
    notes: row.notes,
    items: items.map(patientPrescriptionItem),
  };
}

/* ─── Vitaux (ajout manuel) ──────────────────────────────────── */

export async function addVital(patientId, payload) {
  const id = randomUUID();
  const now = payload.measuredAt || new Date().toISOString();
  await pool.execute(
    `INSERT INTO nova_vitals (id, patient_id, type, label, value, unit, measured_at, source_role, author_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, patientId, payload.type, payload.label, String(payload.value), payload.unit || '', now, 'patient', patientId]
  );
  const [[row]] = await pool.execute('SELECT * FROM nova_vitals WHERE id = ?', [id]);
  return mapVital(row);
}

/* ─── Médecins ───────────────────────────────────────────────── */

export async function getDoctors(query = {}) {
  let sql = 'SELECT * FROM nova_doctors WHERE 1=1';
  const params = [];

  if (query.specialty) {
    sql += ' AND specialty = ?';
    params.push(query.specialty);
  }
  if (query.city) {
    sql += ' AND city LIKE ?';
    params.push(`%${query.city}%`);
  }
  if (query.q) {
    sql += ' AND (CONCAT(first_name," ",last_name) LIKE ? OR specialty LIKE ?)';
    params.push(`%${query.q}%`, `%${query.q}%`);
  }
  if (query.acceptsCmu === 'true') {
    sql += ' AND accepts_cmu = 1';
  }
  sql += ' ORDER BY rating DESC, reviews_count DESC';

  const [rows] = await pool.execute(sql, params);
  return rows.map(mapDoctor);
}

export async function getDoctor(id) {
  const [[row]] = await pool.execute('SELECT * FROM nova_doctors WHERE id = ?', [id]);
  if (!row) return null;
  return mapDoctor(row);
}

export async function getDoctorSlots(doctorId, query = {}) {
  let sql = 'SELECT * FROM nova_doctor_slots WHERE doctor_id = ? AND status = "available"';
  const params = [doctorId];

  if (query.date) {
    sql += ' AND slot_date = ?';
    params.push(query.date);
  } else {
    const today = new Date().toISOString().slice(0, 10);
    sql += ' AND slot_date >= ?';
    params.push(today);
  }
  sql += ' ORDER BY slot_date ASC, slot_time ASC';

  const [rows] = await pool.execute(sql, params);
  return rows.map((r) => ({
    id: r.id,
    doctorId: r.doctor_id,
    date: r.slot_date,
    time: r.slot_time,
    status: r.status,
  }));
}

export async function bookSlot(patientId, slotId, doctorId, shareRecord = false, ack = null) {
  assertShareAck(shareRecord, ack);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('SELECT id FROM nova_doctors WHERE id=? FOR UPDATE',[doctorId]);

    const [[slot]] = await conn.execute(
      'SELECT * FROM nova_doctor_slots WHERE id = ? AND doctor_id = ? AND status = "available" FOR UPDATE',
      [slotId, doctorId]
    );
    if (!slot) { await conn.rollback(); return null; }

    const startsCheck = new Date(`${slot.slot_date}T${String(slot.slot_time).slice(0,5)}:00.000Z`).toISOString();
    assertFuture(startsCheck); await assertDoctorSlotFree(doctorId,startsCheck,null,conn);
    await conn.execute(
      'UPDATE nova_doctor_slots SET status = "booked", patient_id = ? WHERE id = ?',
      [patientId, slotId]
    );

    const [[doctor]] = await conn.execute('SELECT * FROM nova_doctors WHERE id = ?', [slot.doctor_id]);
    if(!doctor?.is_available)throw Object.assign(new Error('Médecin indisponible.'),{status:409});
    const apptId = randomUUID();
    const startsAt = startsCheck;

    await conn.execute(
      `INSERT INTO nova_appointments (id, patient_id, starts_at, doctor_name, specialty, location, mode, status, doctor_id, record_shared_at, share_terms_version, share_acknowledged_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'onsite', 'confirmed', ?, ?, ?, ?, ?, ?)`,
      [apptId, patientId, startsAt,
       `Dr. ${doctor.first_name} ${doctor.last_name}`,
       doctor.specialty, doctor.city, doctorId, shareRecord ? new Date() : null,
       shareRecord ? CONSENT_TERMS_VERSION : null, shareRecord ? new Date() : null,
       new Date().toISOString(), new Date().toISOString()]
    );

    await conn.commit();

    // Notifier le médecin
    const [[pat]] = await pool.execute('SELECT first_name, last_name FROM nova_patients WHERE id = ?', [patientId]);
    const dateStr = new Date(startsAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' });
    notifyDoctorAppointment(slot.doctor_id, `${pat?.first_name || ''} ${pat?.last_name || ''}`, dateStr).catch(() => {});

    return { slotId, appointmentId: apptId, doctorName: `Dr. ${doctor.first_name} ${doctor.last_name}`, startsAt };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/* ─── Notifications ──────────────────────────────────────────── */

export async function getNotifications(patientId, query = {}) {
  const pg = parsePagination(query);
  const [[{ total }]] = await pool.execute(
    'SELECT COUNT(*) AS total FROM nova_notifications WHERE patient_id = ?', [patientId]
  );
  const [rows] = await pool.execute(
    `SELECT * FROM nova_notifications WHERE patient_id = ? ORDER BY created_at DESC LIMIT ${pg.limit} OFFSET ${pg.offset}`,
    [patientId]
  );
  const [[{ unread }]] = await pool.execute('SELECT COUNT(*) AS unread FROM nova_notifications WHERE patient_id = ? AND is_read = 0', [patientId]);
  return { ...paginatedResponse(rows.map((r) => ({
    id: r.id, type: r.type, title: r.title, body: r.body,
    linkPage: r.link_page, linkTargetId: r.link_target_id, isRead: Boolean(r.is_read), createdAt: r.created_at,
  })), total, pg), unreadCount: Number(unread) };
}

export async function markNotificationRead(patientId, id) {
  await pool.execute(
    'UPDATE nova_notifications SET is_read = 1 WHERE patient_id = ? AND id = ?',
    [patientId, id]
  );
}

export async function markAllNotificationsRead(patientId) {
  await pool.execute(
    'UPDATE nova_notifications SET is_read = 1 WHERE patient_id = ?',
    [patientId]
  );
}

/* ─── Résultats de laboratoire ───────────────────────────────── */

export async function getLabResults(patientId, query = {}) {
  const [rows] = query.status
    ? await pool.execute(
        'SELECT * FROM nova_lab_results WHERE patient_id = ? AND status = ? ORDER BY performed_at DESC',
        [patientId, query.status]
      )
    : await pool.execute(
        'SELECT * FROM nova_lab_results WHERE patient_id = ? ORDER BY performed_at DESC',
        [patientId]
      );

  if (!rows.length) return [];
  const lIds = rows.map(r => r.id);
  const [allItems] = await pool.execute(
    `SELECT * FROM nova_lab_result_items WHERE lab_result_id IN (${lIds.map(() => '?').join(',')}) ORDER BY id ASC`,
    lIds
  );
  const itemsByResult = new Map();
  for (const i of allItems) {
    const list = itemsByResult.get(i.lab_result_id) || [];
    list.push(mapLabResultItem(i));
    itemsByResult.set(i.lab_result_id, list);
  }
  return rows.map(row => ({
    id: row.id,
    title: row.title,
    laboratoryName: row.lab_name,
    performedAt: row.performed_at,
    status: row.status,
    doctorName: row.ordered_by,
    items: itemsByResult.get(row.id) || [],
  }));
}

export async function getLabResult(patientId, id) {
  const [[row]] = await pool.execute(
    'SELECT * FROM nova_lab_results WHERE patient_id = ? AND id = ?',
    [patientId, id]
  );
  if (!row) return null;
  const [items] = await pool.execute(
    'SELECT * FROM nova_lab_result_items WHERE lab_result_id = ? ORDER BY id ASC',
    [id]
  );
  return {
    id: row.id,
    title: row.title,
    laboratoryName: row.lab_name,
    performedAt: row.performed_at,
    status: row.status,
    doctorName: row.ordered_by,
    items: items.map(mapLabResultItem),
  };
}

/* ─── Profil médical ─────────────────────────────────────────── */


export async function getMedicalProfile(patientId){
 const [[row]]=await pool.execute('SELECT * FROM nova_medical_profile WHERE patient_id=?',[patientId]);
 const [declarations]=await pool.execute("SELECT id,content,created_at,author_role FROM nova_medical_declarations WHERE patient_id=? ORDER BY sequence_no DESC",[patientId]);
 const latest=declarations.find(d=>d.author_role==='patient');const personal=latest?(typeof latest.content==='string'?JSON.parse(latest.content):latest.content):{};
 const original={allergies:medicalList(row?.allergies),chronicDiseases:medicalList(row?.chronic_diseases),familyHistory:medicalList(row?.family_history),surgicalHistory:medicalList(row?.surgical_history)};
 const combined={};for(const key of Object.keys(original)) combined[key]=[...new Set([...original[key],...(personal[key]||[])])];
 return {...combined,professionalOrHistorical:original,patientDeclarations:personal,provenance:declarations.map(d=>({id:d.id,source:d.author_role,createdAt:d.created_at})),updatedAt:row?.updated_at};
}
export async function updateMedicalProfile(patientId,changes){
 const conn=await pool.getConnection();
 try{
  await conn.beginTransaction();await conn.execute('SELECT id FROM nova_patients WHERE id=? FOR UPDATE',[patientId]);
  const current=await getMedicalProfile(patientId);const next={...current.patientDeclarations,...changes};
  await conn.execute("INSERT INTO nova_medical_declarations(id,patient_id,author_role,author_id,content) VALUES (?,?,'patient',?,?)",[randomUUID(),patientId,patientId,JSON.stringify(next)]);
  await conn.commit();return getMedicalProfile(patientId);
 }catch(e){await conn.rollback();throw e;}finally{conn.release();}
}

/* ─── Notes ──────────────────────────────────────────────────── */

export async function getNotes(patientId) {
  const [rows] = await pool.execute(
    'SELECT * FROM nova_notes WHERE patient_id = ? ORDER BY pinned DESC, updated_at DESC',
    [patientId]
  );
  return rows.map(mapNote);
}

export async function createNote(patientId, payload) {
  const id = randomUUID();
  await pool.execute(
    `INSERT INTO nova_notes (id, patient_id, title, content, color, pinned, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, patientId, payload.title, payload.content || '',
     payload.color || 'amber', payload.pinned ? 1 : 0, new Date().toISOString()]
  );
  const [[row]] = await pool.execute('SELECT * FROM nova_notes WHERE id = ?', [id]);
  return mapNote(row);
}

export async function updateNote(patientId, id, changes) {
  const [[current]] = await pool.execute(
    'SELECT * FROM nova_notes WHERE patient_id = ? AND id = ?', [patientId, id]
  );
  if (!current) return null;
  await pool.execute(
    `UPDATE nova_notes SET title = ?, content = ?, color = ?, pinned = ?, updated_at = ?
     WHERE patient_id = ? AND id = ?`,
    [
      changes.title   ?? current.title,
      changes.content ?? current.content,
      changes.color   ?? current.color,
      changes.pinned === undefined ? current.pinned : (changes.pinned ? 1 : 0),
      new Date().toISOString(),
      patientId, id,
    ]
  );
  const [[row]] = await pool.execute('SELECT * FROM nova_notes WHERE id = ?', [id]);
  return mapNote(row);
}

export async function deleteNote(patientId, id) {
  await pool.execute(
    'DELETE FROM nova_notes WHERE patient_id = ? AND id = ?', [patientId, id]
  );
}

/* ─── Fiche Urgence ──────────────────────────────────────────── */

export async function getEmergencyCard(patientId) {
  const [[patient]] = await pool.execute('SELECT * FROM nova_patients WHERE id = ?', [patientId]);
  if (!patient) return null;

  const declaredProfile = await getMedicalProfile(patientId);

  // Traitements en cours : plannings de prise non terminés, et traitements suivis sans planning.
  const today = new Date().toISOString().slice(0, 10);
  const [scheduled] = await pool.execute(
    `SELECT s.name, s.dosage, t.diagnosis FROM nova_medication_schedules s
     LEFT JOIN nova_medications m ON m.id = s.medication_id
     LEFT JOIN nova_treatments t ON t.id = m.treatment_id
     WHERE s.patient_id = ? AND (s.ends_on IS NULL OR s.ends_on >= ?) AND (s.starts_on IS NULL OR s.starts_on <= ?)`,
    [patientId, today, today]
  );
  const [unscheduled] = await pool.execute(
    `SELECT t.diagnosis, m.name, m.dosage FROM nova_treatments t
     JOIN nova_medications m ON m.treatment_id = t.id
     WHERE t.patient_id = ? AND t.status IN ('active','controlled')
       AND NOT EXISTS (SELECT 1 FROM nova_medication_schedules s WHERE s.medication_id = m.id)`,
    [patientId]
  );
  const seenMeds = new Set();
  const activeTreatments = [...scheduled, ...unscheduled].filter((r) => {
    const key = `${r.name}|${r.dosage || ''}`.toLowerCase();
    if (seenMeds.has(key)) return false;
    seenMeds.add(key);
    return true;
  });

  return {
    id: patient.id,
    firstName: patient.first_name,
    lastName: patient.last_name,
    birthDate: patient.birth_date,
    sex: patient.sex,
    bloodType: patient.blood_type,
    phone: patient.phone,
    cmuNumber: patient.cmu_number,
    emergencyContact: {
      name: patient.emergency_name,
      relationship: patient.emergency_relationship,
      phone: patient.emergency_phone,
    },
    allergies:       declaredProfile.allergies,
    chronicDiseases: declaredProfile.chronicDiseases,
    surgicalHistory: declaredProfile.surgicalHistory,
    currentMedications: activeTreatments.map(r => ({ name: r.name, dosage: r.dosage, diagnosis: r.diagnosis })),
  };
}

/* ─── Wellness Goals ─────────────────────────────────────────── */

export async function getWellnessGoals(patientId) {
  const [rows] = await pool.execute(
    'SELECT * FROM nova_wellness_goals WHERE patient_id = ? ORDER BY completed ASC, created_at DESC',
    [patientId]
  );
  return rows.map(mapGoal);
}

export async function createWellnessGoal(patientId, payload) {
  const id = randomUUID();
  const now = new Date().toISOString();
  await pool.execute(
    `INSERT INTO nova_wellness_goals (id,patient_id,type,title,target,current_value,unit,icon,color,completed,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,0,?,?)`,
    [id, patientId, payload.type, payload.title, payload.target,
     payload.currentValue ?? 0, payload.unit ?? '', payload.icon ?? 'Target',
     payload.color ?? 'emerald', now, now]
  );
  const [[row]] = await pool.execute('SELECT * FROM nova_wellness_goals WHERE id = ?', [id]);
  return mapGoal(row);
}

export async function updateWellnessGoal(patientId, id, changes) {
  const [[current]] = await pool.execute(
    'SELECT * FROM nova_wellness_goals WHERE patient_id = ? AND id = ?', [patientId, id]
  );
  if (!current) return null;
  const now = new Date().toISOString();
  const next = {
    current_value: changes.currentValue ?? current.current_value,
    completed:     changes.completed !== undefined ? (changes.completed ? 1 : 0) : current.completed,
    title:         changes.title     ?? current.title,
    target:        changes.target    ?? current.target,
  };
  await pool.execute(
    `UPDATE nova_wellness_goals SET current_value=?,completed=?,title=?,target=?,updated_at=? WHERE id=?`,
    [next.current_value, next.completed, next.title, next.target, now, id]
  );
  const [[row]] = await pool.execute('SELECT * FROM nova_wellness_goals WHERE id = ?', [id]);
  return mapGoal(row);
}

export async function deleteWellnessGoal(patientId, id) {
  await pool.execute('DELETE FROM nova_wellness_goals WHERE patient_id = ? AND id = ?', [patientId, id]);
}

/* ─── Paramètres ─────────────────────────────────────────────── */

export async function getSettings(patientId) {
  const [[row]] = await pool.execute(
    'SELECT settings_json FROM nova_patient_settings WHERE patient_id = ?', [patientId]
  );
  return row ? JSON.parse(row.settings_json) : {};
}

export async function updateSettings(patientId, changes) {
  const next = deepMerge(await getSettings(patientId), changes);
  await pool.execute(
    `INSERT INTO nova_patient_settings (patient_id, settings_json, updated_at) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE settings_json = VALUES(settings_json), updated_at = VALUES(updated_at)`,
    [patientId, JSON.stringify(next), new Date().toISOString()]
  );
  return next;
}

/* ─── Privées ────────────────────────────────────────────────── */

async function getAppointment(patientId, id) {
  const [[row]] = await pool.execute(
    'SELECT * FROM nova_appointments WHERE patient_id = ? AND id = ?', [patientId, id]
  );
  return row ? mapAppointment(row) : null;
}

async function getDashboardVitals(patientId) {
  const [rows] = await pool.execute(
    'SELECT * FROM nova_vitals WHERE patient_id = ? ORDER BY measured_at DESC LIMIT 100',
    [patientId]
  );
  rows.reverse();
  const byType = new Map();

  for (const row of rows) {
    const vital = mapVital(row);
    const historyValue = vitalToHistoryValue(vital);
    const items = byType.get(vital.type) || [];
    items.push({ ...vital, historyValue });
    byType.set(vital.type, items);
  }

  return ['blood_pressure', 'blood_glucose', 'heart_rate', 'temperature']
    .map((type) => {
      const history = byType.get(type) || [];
      const latest = history.at(-1);
      if (!latest) return null;
      return {
        id: latest.id,
        type: latest.type,
        label: latest.label,
        value: latest.value,
        unit: latest.unit,
        measuredAt: latest.measuredAt,
        status: getVitalStatus(latest),
        history: history
          .slice(-7)
          .map((p) => ({ value: p.historyValue, measuredAt: p.measuredAt }))
          .filter((p) => Number.isFinite(p.value)),
      };
    })
    .filter(Boolean);
}

/*
 * Indicateur de suivi INTERNE, non clinique (docs/ARCHITECTURE_ROLES.md §4) :
 * 100 moins des pénalités (constantes hors normes, prises manquées, vaccins à renouveler).
 * Renvoie null (« Données insuffisantes ») si moins de 2 types de constantes mesurés en 90 jours,
 * pour ne jamais afficher une appréciation favorable sur un dossier presque vide.
 */
/* ─── Mappers ────────────────────────────────────────────────── */

function mapPatient(row) {
  return {
    id: row.id,
    hasPhoto: Boolean(row.photo_path),
    cmuNumber: row.cmu_number,
    firstName: row.first_name,
    lastName: row.last_name,
    birthDate: row.birth_date,
    sex: row.sex,
    bloodType: row.blood_type,
    phone: row.phone,
    email: row.email,
    address: row.address,
    city: row.city,
    weightKg: row.weight_kg,
    heightCm: row.height_cm,
    emergencyContact: {
      name: row.emergency_name,
      relationship: row.emergency_relationship,
      phone: row.emergency_phone,
    },
  };
}

function mapVital(row) {
  const numeric = Number(row.value);
  return {
    id: row.id,
    type: row.type,
    label: row.label,
    value: Number.isNaN(numeric) ? row.value : numeric,
    unit: row.unit,
    measuredAt: row.measured_at,
    sourceRole:row.source_role || 'legacy', authorId:row.author_id,
  };
}

function mapMedication(row) {
  return { id: row.id, name: row.name, dosage: row.dosage, frequency: row.frequency };
}

function mapAppointment(row) {
  return {
    id: row.id,
    startsAt: row.starts_at,
    doctorId: row.doctor_id,
    doctorName: row.doctor_name,
    specialty: row.specialty,
    location: row.location,
    mode: row.mode,
    status: row.status,
  };
}

function mapConversation(row) {
  return {
    id: row.id,
    doctorName: row.doctor_name,
    doctorSpecialty: row.doctor_specialty,
    unreadCount: row.unread_count,
    lastMessage: row.last_message,
    updatedAt: row.updated_at,
  };
}


function mapDocument(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    filePath: row.file_path || null,
    createdAt: row.created_at,
  };
}

function mapGoal(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    target: Number(row.target),
    currentValue: Number(row.current_value),
    unit: row.unit,
    icon: row.icon,
    color: row.color,
    completed: Boolean(row.completed),
    progress: row.target > 0 ? Math.min(100, Math.round((Number(row.current_value) / Number(row.target)) * 100)) : 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDoctor(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: `Dr. ${row.first_name} ${row.last_name}`,
    specialty: row.specialty,
    subSpecialty: row.sub_specialty,
    city: row.city,
    address: row.address,
    phone: row.phone,
    rating: row.rating,
    reviewsCount: row.reviews_count,
    experienceYears: row.experience_years,
    languages: row.languages,
    bio: row.bio,
    avatarInitials: row.avatar_initials,
    avatarColor: row.avatar_color,
    consultationFee: row.consultation_fee,
    acceptsCmu: Boolean(row.accepts_cmu),
    isAvailable: Boolean(row.is_available),
  };
}

function mapLabResultItem(row) {
  return {
    id: row.id,
    name: row.name,
    value: row.value,
    unit: row.unit,
    referenceRange: row.ref_min != null && row.ref_max != null ? `${row.ref_min}-${row.ref_max}` : null,
    status: row.status,
  };
}

function mapNote(row) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    color: row.color,
    pinned: Boolean(row.pinned),
    updatedAt: row.updated_at,
  };
}

/* ─── Helpers ────────────────────────────────────────────────── */

function vitalToHistoryValue(vital) {
  if (vital.type === 'blood_pressure') return Number(String(vital.value).split('/')[0]);
  return Number(vital.value);
}

function getVitalStatus(vital) {
  // Seuils partagés avec l'écran (vital-norms.js).
  return vitalLevel(vital.type, vital.value);
}

function deepMerge(target, source) {
  const next = { ...target };
  for (const [key, value] of Object.entries(source)) {
    next[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? deepMerge(next[key] || {}, value)
      : value;
  }
  return next;
}

/* ─── Assurance ──────────────────────────────────────────────── */

export async function getInsurance(patientId) {
  const [rows] = await pool.execute(
    'SELECT * FROM nova_insurance WHERE patient_id = ? ORDER BY status DESC',
    [patientId]
  );
  return rows.map(r => ({
    id: r.id,
    provider: r.provider,
    policyNumber: r.policy_number,
    holderName: r.holder_name,
    coverageType: r.coverage_type,
    validFrom: r.valid_from,
    validTo: r.valid_to,
    status: r.status,
    reimbursementRate: r.reimbursement_rate,
    logoColor: r.logo_color,
  }));
}

/* ─── Pharmacies ─────────────────────────────────────────────── */

export async function getPharmacies(query = {}) {
  let sql = 'SELECT * FROM nova_pharmacies';
  const args = [];
  if (query.search) {
    sql += ' WHERE name LIKE ? OR city LIKE ? OR address LIKE ?';
    const s = `%${query.search}%`;
    args.push(s, s, s);
  }
  sql += ' ORDER BY is_duty DESC, is_open DESC, distance_km ASC';
  const [rows] = await pool.execute(sql, args);
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    address: r.address,
    city: r.city,
    phone: r.phone,
    isOpen: Boolean(r.is_open),
    opensAt: r.opens_at,
    closesAt: r.closes_at,
    isDuty: Boolean(r.is_duty),
    distanceKm: r.distance_km,
  }));
}

export { getPharmacyOrders, createPharmacyOrder, cancelPharmacyOrder } from './pharmacy-order.service.js';

export async function getConsents(patientId) {
  const [rows] = await pool.execute(
    `SELECT c.*, d.first_name, d.last_name, d.specialty
     FROM nova_consents c
     JOIN nova_doctors d ON d.id = c.doctor_id
     WHERE c.patient_id = ? AND (c.status<>'pending' OR (c.responded_at IS NULL AND NOT EXISTS (
       SELECT 1 FROM nova_consents dcs WHERE dcs.patient_id = c.patient_id AND dcs.doctor_id = c.doctor_id
         AND dcs.status IN ('granted','revoked') AND COALESCE(dcs.responded_at, dcs.requested_at) >= c.requested_at)))
     ORDER BY c.requested_at DESC`,
    [patientId]
  );
  return rows.map(r => ({
    id: r.id,
    doctorId: r.doctor_id,
    doctorName: `Dr. ${r.first_name} ${r.last_name}`,
    specialty: r.specialty,
    status: r.status,
    scope: typeof r.scope === 'string' ? JSON.parse(r.scope) : r.scope,
    requestedAt: r.requested_at,
    respondedAt: r.responded_at,
    expiresAt: r.expires_at,
  }));
}

export async function grantConsent(patientId,consentId,ack){
 const [[c]]=await pool.execute('SELECT doctor_id,status FROM nova_consents WHERE id=? AND patient_id=?',[consentId,patientId]);
 if(!c)throw Object.assign(new Error('Demande introuvable.'),{status:404});
 if(c.status!=='pending')throw Object.assign(new Error('Utilisez les actions de votre équipe de soins pour une nouvelle décision.'),{status:409});
 return setDoctorDecision(patientId,c.doctor_id,'granted',consentId,ack);
}
export async function revokeConsent(patientId,consentId){
 const [[c]]=await pool.execute('SELECT doctor_id FROM nova_consents WHERE id=? AND patient_id=?',[consentId,patientId]);
 if(!c)throw Object.assign(new Error('Demande introuvable.'),{status:404});
 return setDoctorDecision(patientId,c.doctor_id,'revoked');
}

/* ═══════════════════════════════════════════════════════════════
   ÉQUIPE DE SOINS — médecins ayant accès au dossier (règle services/access.js)
   ═══════════════════════════════════════════════════════════════ */

export async function getCareTeam(patientId) {
  // Médecins ayant un lien quelconque avec le patient ; l'accès effectif est recalculé pour chacun.
  const [candidates] = await pool.execute(
    `SELECT d.id, d.first_name, d.last_name, d.specialty, d.city FROM nova_doctors d
     WHERE d.id IN (
       SELECT doctor_id FROM nova_consents WHERE patient_id = ?
       UNION SELECT doctor_id FROM nova_appointments WHERE patient_id = ? AND doctor_id IS NOT NULL
       UNION SELECT doctor_id FROM nova_consultations WHERE patient_id = ?
       UNION SELECT doctor_id FROM nova_prescriptions WHERE patient_id = ? AND doctor_id IS NOT NULL
       UNION SELECT doctor_id FROM nova_lab_requests WHERE patient_id = ?
     )
     ORDER BY d.last_name`,
    [patientId, patientId, patientId, patientId, patientId]
  );
  const team = [];
  for (const d of candidates) {
    const [[decision]] = await pool.execute(
      `SELECT status, responded_at, acknowledged_at FROM nova_consents
       WHERE patient_id = ? AND doctor_id = ? AND status IN ('granted', 'revoked')
       ORDER BY COALESCE(responded_at, requested_at) DESC LIMIT 1`,
      [patientId, d.id]
    );
    const access = await getDoctorAccessDetails(d.id, patientId);
    team.push({
      doctorId: d.id,
      doctorName: `Dr. ${d.first_name} ${d.last_name}`,
      specialty: d.specialty,
      city: d.city,
      hasAccess: Boolean(access),
      reason: access?.reason || (decision?.status === 'revoked' ? 'revoked' : 'none'),
      expiresAt: access?.expiresAt || null,
      decidedAt: decision?.responded_at || null,
      needsConfirmation: Boolean(access?.reason === 'consent' && decision?.status === 'granted' && !decision.acknowledged_at),
    });
  }
  return team;
}

async function setDoctorDecision(patientId,doctorId,status,requestId=null,ack=null){
 // Consentement éclairé : aucun accord sans acceptation des conditions en vigueur.
 if(status==='granted'&&ack?.termsVersion!==CONSENT_TERMS_VERSION)throw Object.assign(new Error('Lisez et acceptez les conditions de partage avant d’autoriser ce médecin.'),{status:422,code:'consent_terms_required'});
 const conn=await pool.getConnection();
 try{
  await conn.beginTransaction();await conn.execute('SELECT id FROM nova_patients WHERE id=? FOR UPDATE',[patientId]);
  const [[doctor]]=await conn.execute('SELECT id FROM nova_doctors WHERE id=?',[doctorId]);
  if(!doctor)throw Object.assign(new Error('Médecin introuvable.'),{status:404});
  const [[last]]=await conn.execute("SELECT id,status,expires_at,acknowledged_at,COALESCE(responded_at,requested_at) decided_at FROM nova_consents WHERE doctor_id=? AND patient_id=? AND status IN ('granted','revoked') ORDER BY COALESCE(responded_at,requested_at) DESC LIMIT 1",[doctorId,patientId]);
  if(requestId){const [[request]]=await conn.execute("SELECT responded_at FROM nova_consents WHERE id=? AND patient_id=? AND doctor_id=? AND status='pending' FOR UPDATE",[requestId,patientId,doctorId]);if(!request||request.responded_at&&last?.status!=='granted')throw Object.assign(new Error('Cette demande a déjà été traitée. Actualisez vos accès.'),{status:409});}
  const [[booking]] = await conn.execute(
    'SELECT MAX(record_shared_at) AS shared_at FROM nova_appointments WHERE patient_id = ? AND doctor_id = ?',
    [patientId, doctorId]
  );
  const instant = new Date(Math.max(Date.now(),
    last?.decided_at ? new Date(last.decided_at).getTime() + 1 : 0,
    booking?.shared_at ? new Date(booking.shared_at).getTime() : 0));
  // Une décision (accord ou retrait) répond à toutes les demandes encore ouvertes de ce médecin :
  // jamais de demande « En attente » à côté d'un accès déjà accordé ou retiré.
  await conn.execute("UPDATE nova_consents SET responded_at=? WHERE patient_id=? AND doctor_id=? AND status='pending' AND responded_at IS NULL",[instant,patientId,doctorId]);
  // Un retrait doit être daté à nouveau : un partage de rendez-vous a pu intervenir depuis le précédent.
  if(last?.status===status&&(status==='granted' && (requestId||!last.expires_at||new Date(last.expires_at)>new Date()))){
    // Accès déjà accordé : la confirmation enregistre l'acceptation des conditions sur l'accord en cours.
    if(!last.acknowledged_at)await conn.execute('UPDATE nova_consents SET terms_version=?, acknowledged_at=? WHERE id=?',[CONSENT_TERMS_VERSION,instant,last.id]);
    await conn.commit();return {id:last.id,doctorId,status};
  }
  const id=randomUUID(),expires=status==='granted'?new Date(instant.getTime()+CONSENT_DURATION_DAYS*86400000):null;
  await conn.execute('INSERT INTO nova_consents(id,patient_id,doctor_id,status,scope,requested_at,responded_at,expires_at,terms_version,acknowledged_at) VALUES (?,?,?,?,?,?,?,?,?,?)',[id,patientId,doctorId,status,JSON.stringify(['clinical_record']),instant,instant,expires,status==='granted'?CONSENT_TERMS_VERSION:null,status==='granted'?instant:null]);
  const [[patient]]=await conn.execute('SELECT first_name,last_name FROM nova_patients WHERE id=?',[patientId]);
  await notifyDoctorConsent(doctorId,`${patient.first_name} ${patient.last_name}`,status==='granted',conn);
  await conn.commit();return {id,doctorId,status};
 }catch(e){await conn.rollback();throw e;}finally{conn.release();}
}

export const revokeDoctorAccess = (patientId, doctorId) => setDoctorDecision(patientId, doctorId, 'revoked');
export const grantDoctorAccess = (patientId, doctorId, ack) => setDoctorDecision(patientId, doctorId, 'granted', null, ack);

/* ═══════════════════════════════════════════════════════════════
   ACCESS LOGS — qui a consulté mon dossier
   ═══════════════════════════════════════════════════════════════ */

export async function getAccessLogs(patientId) {
  const [rows] = await pool.execute(
    `SELECT al.*, u.name AS accessor_name
     FROM nova_access_logs al
     LEFT JOIN nova_users u ON u.id = al.accessor_id
     WHERE al.patient_id = ?
     ORDER BY al.accessed_at DESC
     LIMIT 50`,
    [patientId]
  );
  return rows.map(r => ({
    id: r.id,
    accessorName: r.accessor_role === 'emergency' ? 'Scan du QR d’urgence' : (r.accessor_name || 'Inconnu'),
    accessorRole: r.accessor_role,
    dataAccessed: r.data_accessed,
    accessedAt: r.accessed_at,
  }));
}

/* ═══════════════════════════════════════════════════════════════
   DOSSIER FAMILIAL
   ═══════════════════════════════════════════════════════════════ */

export async function getFamilyMembers(patientId) {
  const [rows] = await pool.execute(
    'SELECT * FROM nova_family_members WHERE owner_patient_id = ? ORDER BY created_at DESC',
    [patientId]
  );
  return rows.map(r => ({
    id: r.id,
    relationship: r.relationship,
    firstName: r.first_name,
    lastName: r.last_name,
    birthDate: r.birth_date,
    memberPatientId: r.member_patient_id,
    notes: r.notes,
    createdAt: r.created_at,
  }));
}

export async function createFamilyMember(patientId, payload) {
  const id = randomUUID();
  await pool.execute(
    `INSERT INTO nova_family_members (id, owner_patient_id, member_patient_id, relationship, first_name, last_name, birth_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, patientId, payload.memberPatientId || null, payload.relationship,
     payload.firstName, payload.lastName, payload.birthDate || null, payload.notes || null]
  );
  return { id, ...payload };
}

export async function updateFamilyMember(patientId, memberId, payload) {
  const [[existing]] = await pool.execute(
    'SELECT id FROM nova_family_members WHERE id = ? AND owner_patient_id = ?',
    [memberId, patientId]
  );
  if (!existing) { const e = new Error('Membre introuvable.'); e.status = 404; throw e; }

  const sets = []; const vals = [];
  const fields = { firstName: 'first_name', lastName: 'last_name', relationship: 'relationship', birthDate: 'birth_date', notes: 'notes' };
  for (const [k, col] of Object.entries(fields)) {
    if (payload[k] !== undefined) { sets.push(`${col} = ?`); vals.push(payload[k]); }
  }
  if (!sets.length) return { id: memberId };
  vals.push(memberId);
  await pool.execute(`UPDATE nova_family_members SET ${sets.join(', ')} WHERE id = ?`, vals);
  return { id: memberId, ...payload };
}

export async function deleteFamilyMember(patientId, memberId) {
  const [[existing]] = await pool.execute(
    'SELECT id FROM nova_family_members WHERE id = ? AND owner_patient_id = ?',
    [memberId, patientId]
  );
  if (!existing) { const e = new Error('Membre introuvable.'); e.status = 404; throw e; }
  await pool.execute('DELETE FROM nova_family_members WHERE id = ?', [memberId]);
}

/* ═══════════════════════════════════════════════════════════════
   QR ORDONNANCE SÉCURISÉ (JWT signé)
   ═══════════════════════════════════════════════════════════════ */

export async function getPrescriptionQR(patientId, prescriptionId) {
  const [[rx]] = await pool.execute(
    'SELECT * FROM nova_prescriptions WHERE id = ? AND patient_id = ? AND deleted_at IS NULL',
    [prescriptionId, patientId]
  );
  if (!rx) return null;

  const JWT_SECRET = process.env.JWT_SECRET;
  // Sign a minimal payload — NO medical data in QR
  const qrToken = jwt.sign(
    { type: 'prescription', prescriptionId: rx.id, patientId, issuedAt: rx.issued_at, validUntil: rx.valid_until },
    JWT_SECRET,
    { expiresIn: '90d' }
  );

  const QRCode = (await import('qrcode')).default;
  const qrDataUrl = await QRCode.toDataURL(qrToken, {
    errorCorrectionLevel: 'M', margin: 2, width: 300,
    color: { dark: '#0f172a', light: '#ffffff' },
  });

  return {
    prescriptionId: rx.id,
    qr: qrDataUrl,
    token: qrToken,
    doctorName: rx.doctor_name,
    issuedAt: rx.issued_at,
    validUntil: rx.valid_until,
    status: rx.status,
  };
}
