import {persistMessage} from './messaging.service.js';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { pool } from '../db/database.js';
import { getMedicalProfile,getLabResult } from './patient.service.js';
import { medicalList } from './medical-profile.js';
import { assertDoctorPatientAccess, doctorAccessClause, hasDoctorPatientAccess } from './access.js';
import { APPOINTMENT_TRANSITIONS, assertDoctorSlotFree, assertFuture, assertTransition, releaseSlotFor, withDoctorSchedule, reserveMatchingSlot } from './workflow.js';
import { generateProvisionalPassword, passwordPolicyError } from './auth.service.js';
import { notifyPatientConsultation, notifyPatientPrescription, notifyDoctorReferral, notifyPatientAppointmentStatus } from './notification.service.js';

/* ─── Dashboard ──────────────────────────────────────────────── */

export async function getDoctorDashboard(doctorId) {
  const currentAccess = doctorAccessClause(doctorId, 'p.id');
  const todayStr = new Date().toISOString().slice(0, 10);
  const monthStr = new Date().toISOString().slice(0, 7);

  const [[doctor]]         = await pool.execute(`SELECT * FROM nova_doctors WHERE id = ?`, [doctorId]);
  const [todayAppts]       = await pool.execute(
    `SELECT a.*, p.first_name, p.last_name, p.cmu_number, p.birth_date, p.blood_type
     FROM nova_appointments a JOIN nova_patients p ON p.id = a.patient_id
     WHERE a.doctor_id = ? AND ${currentAccess.sql} AND a.starts_at LIKE ? ORDER BY a.starts_at ASC`,
    [doctorId, ...currentAccess.params, `${todayStr}%`]
  );
  const dashAccess = doctorAccessClause(doctorId, 'p.id');
  const [[{ totalPatients }]] = await pool.execute(
    `SELECT COUNT(*) AS totalPatients FROM nova_patients p WHERE p.deleted_at IS NULL AND ${dashAccess.sql}`, dashAccess.params
  );
  const [[{ monthCons }]] = await pool.execute(
    `SELECT COUNT(*) AS monthCons FROM nova_consultations WHERE doctor_id = ? AND started_at LIKE ?`,
    [doctorId, `${monthStr}%`]
  );
  const [[{ avgRating }]] = await pool.execute(
    `SELECT AVG(rating) AS avgRating FROM nova_doctor_reputation WHERE doctor_id = ?`, [doctorId]
  );
  // Recent consultations (5 dernières)
  const [recentCons] = await pool.execute(
    `SELECT c.*, p.first_name, p.last_name FROM nova_consultations c
     JOIN nova_patients p ON p.id = c.patient_id
     WHERE c.doctor_id = ? AND ${currentAccess.sql} ORDER BY c.started_at DESC LIMIT 5`,
    [doctorId, ...currentAccess.params]
  );

  return {
    doctor:             doctor ? mapDoctorProfile(doctor) : null,
    todayAppointments:  todayAppts.map(mapApptWithPatient),
    totalPatients,
    monthConsultations: monthCons,
    avgRating:          avgRating ? Number(avgRating).toFixed(1) : '—',
    recentConsultations: recentCons.map(r => ({
      id: r.id,
      patientName: `${r.first_name} ${r.last_name}`,
      diagnosisMain: r.diagnosis_main,
      status: r.status,
      startedAt: r.started_at,
    })),
  };
}

/* ─── Patients ───────────────────────────────────────────────── */

export async function getDoctorPatients(doctorId, query = {}) {
  const access = doctorAccessClause(doctorId, 'p.id');
  let sql = `
    SELECT p.*
    FROM nova_patients p
    WHERE p.deleted_at IS NULL AND ${access.sql}`;
  const args = [...access.params];
  if (query.search) {
    sql += ` AND (p.first_name LIKE ? OR p.last_name LIKE ? OR p.cmu_number LIKE ? OR p.phone LIKE ?)`;
    const s = `%${query.search}%`;
    args.push(s, s, s, s);
  }
  sql += ' ORDER BY p.last_name, p.first_name';
  const [rows] = await pool.execute(sql, args);
  return rows.map(mapPatientSummary);
}

export async function getDoctorPatient(doctorId, patientId) {
  const access = await hasDoctorPatientAccess(doctorId, patientId);
  if (!access) return null;

  const [[patient]] = await pool.execute(`SELECT * FROM nova_patients WHERE id = ?`, [patientId]);
  if (!patient) return null;

  const [[mp]] = await pool.execute(`SELECT * FROM nova_medical_profile WHERE patient_id = ?`, [patientId]);
  const [vitals] = await pool.execute(
    `SELECT * FROM nova_vitals WHERE patient_id = ? ORDER BY measured_at DESC LIMIT 40`, [patientId]
  );
  const [consultations] = await pool.execute(
    `SELECT * FROM nova_consultations WHERE patient_id = ? AND doctor_id = ? ORDER BY started_at DESC LIMIT 10`,
    [patientId, doctorId]
  );
  const [prescriptions] = await pool.execute(
    `SELECT * FROM nova_prescriptions WHERE patient_id = ? ORDER BY issued_at DESC LIMIT 5`, [patientId]
  );
  const [labResults] = await pool.execute(
    `SELECT * FROM nova_lab_results WHERE patient_id = ? ORDER BY performed_at DESC LIMIT 5`, [patientId]
  );

  const mpData = await getMedicalProfile(patientId);

  return {
    ...mapPatientFull(patient),
    medicalProfile: mpData,
    vitals: vitals.map(v => ({ id: v.id, type: v.type, label: v.label, value: v.value, unit: v.unit, measuredAt: v.measured_at,sourceRole:v.source_role||'legacy',authorId:v.author_id })),
    consultations: consultations.map(c => ({
      id: c.id, motif: c.motif, diagnosisMain: c.diagnosis_main, notes: c.notes,
      recommendations: c.recommendations, status: c.status, startedAt: c.started_at,
    })),
    prescriptions: prescriptions.map(r => ({ id: r.id, issuedAt: r.issued_at, status: r.status })),
    labResults: labResults.map(r => ({ id: r.id, title: r.title, performedAt: r.performed_at, status: r.status })),
  };
}

/* ─── Rendez-vous ────────────────────────────────────────────── */

export async function getDoctorAppointments(doctorId, query = {}) {
  const access = doctorAccessClause(doctorId, 'p.id');
  let sql = `
    SELECT a.*, p.first_name, p.last_name, p.cmu_number, p.birth_date, p.blood_type, p.phone
    FROM nova_appointments a JOIN nova_patients p ON p.id = a.patient_id
    WHERE a.doctor_id = ? AND ${access.sql}`;
  const args = [doctorId, ...access.params];
  if (query.date)   { sql += ' AND a.starts_at LIKE ?'; args.push(`${query.date}%`); }
  if (query.status) { sql += ' AND a.status = ?'; args.push(query.status); }
  sql += ' ORDER BY a.starts_at DESC';
  const [rows] = await pool.execute(sql, args);
  return rows.map(mapApptWithPatient);
}

export async function updateDoctorAppointment(doctorId,id,changes){
  const result=await withDoctorSchedule(doctorId,async(conn)=>{
    const [[row]]=await conn.execute('SELECT * FROM nova_appointments WHERE id=? AND doctor_id=? FOR UPDATE',[id,doctorId]);
    if(!row) return null;
    await assertDoctorPatientAccess(doctorId,row.patient_id);
    if(changes.status) assertTransition(APPOINTMENT_TRANSITIONS,row.status,changes.status,'doctor');
    let startsAt=row.starts_at;
    if(changes.startsAt&&new Date(changes.startsAt).toISOString()!==row.starts_at){
      startsAt=new Date(changes.startsAt).toISOString();assertFuture(startsAt);await assertDoctorSlotFree(doctorId,startsAt,id,conn);
      await releaseSlotFor(row,conn);await reserveMatchingSlot(conn,doctorId,startsAt,row.patient_id);
    }
    if(changes.status==='cancelled') await releaseSlotFor(row,conn);
    await conn.execute('UPDATE nova_appointments SET starts_at=?,status=?,location=?,updated_at=? WHERE id=?',[startsAt,changes.status||row.status,changes.location||row.location,new Date().toISOString(),id]);
    const [[updated]]=await conn.execute('SELECT a.*,p.first_name,p.last_name FROM nova_appointments a JOIN nova_patients p ON p.id=a.patient_id WHERE a.id=?',[id]);return updated;
  });
  if(!result) return null;
  notifyPatientAppointmentStatus(result.patient_id,'Votre medecin',result.status,result.starts_at).catch(()=>{});
  return mapApptWithPatient(result);
}

/* ─── Consultations ──────────────────────────────────────────── */

export async function getDoctorConsultations(doctorId) {
  const access = doctorAccessClause(doctorId, 'p.id');
  const [rows] = await pool.execute(
    `SELECT c.*, p.first_name, p.last_name, p.cmu_number
     FROM nova_consultations c JOIN nova_patients p ON p.id = c.patient_id
     WHERE c.doctor_id = ? AND ${access.sql} ORDER BY c.started_at DESC`,
    [doctorId, ...access.params]
  );
  const amendments=await Promise.all(rows.map(async r=>{const [list]=await pool.execute('SELECT reason,content,created_at FROM nova_consultation_amendments WHERE consultation_id=? ORDER BY created_at',[r.id]);return list;}));
  return rows.map((r,index) => ({
    id:                 r.id,
    patientId:          r.patient_id,
    patientName:        `${r.first_name} ${r.last_name}`,
    cmuNumber:          r.cmu_number,
    motif:              r.motif,
    diagnosisMain:      r.diagnosis_main,
    diagnosisSecondary: r.diagnosis_secondary,
    notes:              r.notes,
    recommendations:    r.recommendations,
    status:             r.status,
    startedAt:          r.started_at,
    completedAt:        r.completed_at,
    amendments:amendments[index],
  }));
}

/* ─── Créer un patient depuis l'espace médecin ───────────────── */

export async function createPatientByDoctor(doctorId, payload) {
  // Mot de passe choisi par le médecin, ou généré ; le patient le change à sa première connexion.
  const provisionalPassword = payload.password || generateProvisionalPassword();
  const policyError = passwordPolicyError('patient', provisionalPassword);
  if (policyError) throw Object.assign(new Error(`Mot de passe : ${policyError}`), { status: 422, code: 'weak_password' });
  const passwordHash = await bcrypt.hash(provisionalPassword, 12);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Vérifier que le téléphone n'existe pas déjà
    const phone = payload.phone.replace(/\s/g, '');
    const [[existingUser]] = await conn.execute('SELECT id FROM nova_users WHERE phone = ?', [phone]);
    if (existingUser) {
      const err = new Error('Un compte avec ce numéro existe déjà.');
      err.status = 409;
      throw err;
    }

    // 2. Créer le patient
    const patientId = randomUUID();
    const now = new Date().toISOString();
    const cmuNumber = payload.cmuNumber?.trim() || null;

    await conn.execute(
      `INSERT INTO nova_patients (id, cmu_number, first_name, last_name, birth_date, sex, blood_type, phone, email, address, city, weight_kg, height_cm, emergency_name, emergency_relationship, emergency_phone, updated_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [patientId, cmuNumber, payload.firstName, payload.lastName,
       payload.birthDate || null, payload.sex || null, payload.bloodType || null,
       phone, payload.email || null, payload.address || null, payload.city || 'Abidjan',
       payload.weightKg || null, payload.heightCm || null,
       payload.emergencyName || null, payload.emergencyRelationship || null, payload.emergencyPhone || null,
       now, now]
    );

    // 3. Créer le profil médical initial
    await conn.execute(
      `INSERT INTO nova_medical_profile (patient_id, allergies, chronic_diseases, family_history, surgical_history, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [patientId,
       JSON.stringify(payload.allergies || []),
       JSON.stringify(payload.chronicDiseases || []),
       JSON.stringify([]),
       JSON.stringify([]),
       now]
    );

    // 4. Créer le compte de connexion (téléphone + mot de passe provisoire)
    const userId = randomUUID();
    const unusableLegacyHash = await bcrypt.hash(randomUUID(), 10);
    const avatar = `${(payload.firstName?.[0] || '').toUpperCase()}${(payload.lastName?.[0] || '').toUpperCase()}`;

    await conn.execute(
      `INSERT INTO nova_users (id, phone, code_hash, password_hash, must_change_password, role, patient_id, name, avatar, created_at)
       VALUES (?, ?, ?, ?, 1, 'patient', ?, ?, ?, ?)`,
      [userId, phone, unusableLegacyHash, passwordHash, patientId, `${payload.firstName} ${payload.lastName}`, avatar, now]
    );

    // 5. L'inscription ne vaut pas consentement : le patient doit accepter la demande.
    await conn.execute(
      `INSERT INTO nova_consents (id, patient_id, doctor_id, status, scope, requested_at, responded_at, expires_at)
       VALUES (?, ?, ?, 'pending', ?, NOW(3), NULL, NULL)`,
      [randomUUID(), patientId, doctorId, JSON.stringify(['profile', 'vitals', 'consultations', 'prescriptions'])]
    );

    await conn.commit();

    return {
      patientId,
      userId,
      cmuNumber,
      name: `${payload.firstName} ${payload.lastName}`,
      phone,
      // Affiché une seule fois au médecin, qui le remet au patient.
      provisionalPassword,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Règle d'accès centralisée (services/access.js) : la révocation par le patient prime.
const verifyDoctorPatientRelation = assertDoctorPatientAccess;

export async function createConsultation(doctorId, payload) {
  await verifyDoctorPatientRelation(doctorId, payload.patientId);
  const conn=await pool.getConnection();
  try{
  await conn.beginTransaction();
  const id  = randomUUID();
  const now = new Date().toISOString();
  await conn.execute(
    `INSERT INTO nova_consultations
      (id,patient_id,doctor_id,motif,diagnosis_main,diagnosis_secondary,notes,recommendations,status,started_at,completed_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [id, payload.patientId, doctorId,
     payload.motif || null, payload.diagnosisMain || null, payload.diagnosisSecondary || null,
     payload.notes || null, payload.recommendations || null,
     payload.status || 'completed', now, payload.status === 'draft' ? null : now]
  );
  const [[row]] = await conn.execute(
    `SELECT c.*, p.first_name, p.last_name FROM nova_consultations c
     JOIN nova_patients p ON p.id = c.patient_id WHERE c.id = ?`, [id]
  );
  const result = {
    id: row.id, patientId: row.patient_id,
    patientName: `${row.first_name} ${row.last_name}`,
    motif: row.motif, diagnosisMain: row.diagnosis_main,
    status: row.status, startedAt: row.started_at,
  };

  // Notifier le patient et alimenter son historique médical
  const [[doc]] = await conn.execute('SELECT first_name, last_name FROM nova_doctors WHERE id = ?', [doctorId]);
  const doctorName = `Dr. ${doc?.first_name || ''} ${doc?.last_name || ''}`.trim();
  if (result.status !== 'draft') {
    await conn.execute(
      'INSERT INTO nova_medical_history (id, patient_id, type, title, occurred_at, doctor_name) VALUES (?, ?, ?, ?, ?, ?)',
      [randomUUID(), payload.patientId, 'consultation', payload.diagnosisMain || payload.motif || 'Consultation', now, doctorName]
    );
  }
  if(result.status!=='draft') await notifyPatientConsultation(payload.patientId, doctorName, id,conn);
  await conn.commit();

  return result;
  }catch(e){await conn.rollback();throw e;}finally{conn.release();}
}

export async function updateConsultation(doctorId, id, changes) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[current]] = await conn.execute('SELECT * FROM nova_consultations WHERE id=? AND doctor_id=? FOR UPDATE', [id, doctorId]);
    if (!current) { await conn.rollback(); return null; }
    await assertDoctorPatientAccess(doctorId, current.patient_id);
    if (current.status === 'completed') {
      if (!String(changes.amendmentReason || '').trim()) throw Object.assign(new Error('Acte valide : un motif de correction est obligatoire.'), {status:409});
      if (changes.status && changes.status !== 'completed') throw Object.assign(new Error('Un acte valide ne peut pas redevenir un brouillon.'),{status:409});
      await conn.execute('INSERT INTO nova_consultation_amendments(id,consultation_id,doctor_id,reason,content) VALUES (?,?,?,?,?)', [randomUUID(),id,doctorId,changes.amendmentReason,JSON.stringify(changes)]);
    } else {
      const next = {...current};
      for (const [key,col] of Object.entries({motif:'motif', diagnosisMain:'diagnosis_main',diagnosisSecondary:'diagnosis_secondary',notes:'notes',recommendations:'recommendations'})) if (changes[key] !== undefined) next[col]=changes[key];
      const status=changes.status || current.status;
      if (!['draft','completed'].includes(status)) throw Object.assign(new Error('Statut invalide.'),{status:422});
      await conn.execute('UPDATE nova_consultations SET motif=?,diagnosis_main=?,diagnosis_secondary=?,notes=?,recommendations=?,status=?,completed_at=? WHERE id=?',[next.motif,next.diagnosis_main,next.diagnosis_secondary,next.notes,next.recommendations,status,status==='completed'?new Date().toISOString():null,id]);
      if(status==='completed') await conn.execute('INSERT INTO nova_medical_history(id,patient_id,type,title,occurred_at,doctor_name) VALUES (?,?,?,?,?,?)',[randomUUID(),current.patient_id,'consultation',next.diagnosis_main||next.motif||'Consultation',new Date().toISOString(),'Medecin prescripteur']);
    }
    if(current.status==='completed'||changes.status==='completed'){const {createNotification}=await import('./notification.service.js');await createNotification({patientId:current.patient_id,targetRole:'patient',type:'consultation',title:current.status==='completed'?'Correction du compte rendu':'Compte rendu validé',linkPage:'history'},conn);}
    await conn.commit();
    return {id, ...changes, amendment:current.status==='completed'};
  } catch(err) { await conn.rollback(); throw err; } finally {conn.release();}
}

/* ─── Statistiques ───────────────────────────────────────────── */

export async function getDoctorStats(doctorId) {
  const dashAccess = doctorAccessClause(doctorId, 'p.id');
  const [[{ totalPatients }]] = await pool.execute(
    `SELECT COUNT(*) AS totalPatients FROM nova_patients p WHERE p.deleted_at IS NULL AND ${dashAccess.sql}`, dashAccess.params
  );
  const [[{ totalConsultations }]] = await pool.execute(
    `SELECT COUNT(*) AS totalConsultations FROM nova_consultations WHERE doctor_id = ?`, [doctorId]
  );
  const [[{ avgRating, ratingCount }]] = await pool.execute(
    `SELECT AVG(rating) AS avgRating, COUNT(*) AS ratingCount FROM nova_doctor_reputation WHERE doctor_id = ?`, [doctorId]
  );
  const [diagnoses] = await pool.execute(
    `SELECT diagnosis_main AS name, COUNT(*) AS count
     FROM nova_consultations WHERE doctor_id = ? AND diagnosis_main IS NOT NULL
     GROUP BY diagnosis_main ORDER BY count DESC LIMIT 6`,
    [doctorId]
  );
  const [monthlyData] = await pool.execute(
    `SELECT SUBSTR(started_at,1,7) AS month, COUNT(*) AS count
     FROM nova_consultations WHERE doctor_id = ? GROUP BY month ORDER BY month DESC LIMIT 6`,
    [doctorId]
  );
  const [ratings] = await pool.execute(
    `SELECT rating, comment, created_at FROM nova_doctor_reputation WHERE doctor_id = ? ORDER BY created_at DESC LIMIT 5`,
    [doctorId]
  );
  return {
    totalPatients,
    totalConsultations,
    avgRating:   avgRating ? Number(avgRating).toFixed(1) : '—',
    ratingCount: ratingCount || 0,
    diagnoses,
    monthlyData: monthlyData.reverse(),
    ratings: ratings.map(r => ({ rating: r.rating, comment: r.comment, createdAt: r.created_at })),
  };
}

/* ─── Profil médecin ─────────────────────────────────────────── */

export async function getDoctorProfile(doctorId) {
  const [[doc]] = await pool.execute(`SELECT * FROM nova_doctors WHERE id = ?`, [doctorId]);
  return doc ? mapDoctorProfile(doc) : null;
}

/* ─── Mappers ────────────────────────────────────────────────── */

function mapDoctorProfile(r) {
  return {
    id:               r.id,
    firstName:        r.first_name,
    lastName:         r.last_name,
    specialty:        r.specialty,
    subSpecialty:     r.sub_specialty,
    city:             r.city,
    address:          r.address,
    phone:            r.phone,
    email:            r.email,
    rating:           r.rating,
    reviewsCount:     r.reviews_count,
    experienceYears:  r.experience_years,
    languages:        r.languages,
    bio:              r.bio,
    avatarInitials:   r.avatar_initials,
    avatarColor:      r.avatar_color,
    consultationFee:  r.consultation_fee,
    acceptsCmu:       Boolean(r.accepts_cmu),
  };
}

function mapApptWithPatient(r) {
  const birth = r.birth_date ? new Date(r.birth_date) : null;
  const today = new Date();
  const age   = birth ? today.getFullYear() - birth.getFullYear() - (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0) : null;
  return {
    id:          r.id,
    startsAt:    r.starts_at,
    patientId:   r.patient_id,
    patientName: `${r.first_name} ${r.last_name}`,
    cmuNumber:   r.cmu_number,
    bloodType:   r.blood_type,
    age,
    phone:       r.phone || null,
    specialty:   r.specialty,
    location:    r.location,
    mode:        r.mode,
    status:      r.status,
  };
}

function mapPatientSummary(r) {
  const birth = r.birth_date ? new Date(r.birth_date) : null;
  const today = new Date();
  const age   = birth ? today.getFullYear() - birth.getFullYear() - (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0) : null;
  return {
    id:        r.id,
    firstName: r.first_name,
    lastName:  r.last_name,
    cmuNumber: r.cmu_number,
    phone:     r.phone,
    bloodType: r.blood_type,
    age,
  };
}

function mapPatientFull(r) {
  const birth = r.birth_date ? new Date(r.birth_date) : null;
  const today = new Date();
  const age   = birth ? today.getFullYear() - birth.getFullYear() - (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0) : null;
  return {
    id:          r.id,
    firstName:   r.first_name,
    lastName:    r.last_name,
    cmuNumber:   r.cmu_number,
    birthDate:   r.birth_date,
    sex:         r.sex,
    bloodType:   r.blood_type,
    phone:       r.phone,
    email:       r.email,
    address:     r.address,
    city:        r.city,
    weightKg:    r.weight_kg,
    heightCm:    r.height_cm,
    emergencyName:  r.emergency_name,
    emergencyPhone: r.emergency_phone,
    age,
  };
}


/* ─── Ordonnances (médecin) ──────────────────────────────────── */

export async function getDoctorPrescriptions(doctorId) {
  const access = doctorAccessClause(doctorId, 'pat.id');
  const [rows] = await pool.execute(
    `SELECT p.*, pat.first_name, pat.last_name, pat.cmu_number,
            (SELECT COUNT(*) FROM nova_prescription_items pi WHERE pi.prescription_id = p.id) AS items_count
     FROM nova_prescriptions p
     JOIN nova_patients pat ON pat.id = p.patient_id
     WHERE p.doctor_id = ? AND ${access.sql}
     ORDER BY p.issued_at DESC`,
    [doctorId, ...access.params]
  );
  return rows.map(r => ({
    id:          r.id,
    patientId:   r.patient_id,
    patientName: `${r.first_name} ${r.last_name}`,
    cmuNumber:   r.cmu_number,
    issuedAt:    r.issued_at,
    validUntil:  r.valid_until,
    status:      r.status,
    notes:       r.notes,
    itemsCount:  Number(r.items_count),
  }));
}

export async function getDoctorPrescription(doctorId, prescriptionId) {
  const [[row]] = await pool.execute(
    `SELECT p.*, pat.first_name, pat.last_name, pat.cmu_number
     FROM nova_prescriptions p JOIN nova_patients pat ON pat.id = p.patient_id
     WHERE p.id = ? AND p.doctor_id = ?`,
    [prescriptionId, doctorId]
  );
  if (!row) return null;
  await assertDoctorPatientAccess(doctorId, row.patient_id);
  const [items] = await pool.execute(
    `SELECT * FROM nova_prescription_items WHERE prescription_id = ?`, [prescriptionId]
  );
  return {
    id:              row.id,
    patientId:       row.patient_id,
    patientName:     `${row.first_name} ${row.last_name}`,
    cmuNumber:       row.cmu_number,
    doctorName:      row.doctor_name,
    doctorSpecialty: row.doctor_specialty,
    issuedAt:        row.issued_at,
    validUntil:      row.valid_until,
    status:          row.status,
    notes:           row.notes,
    items: items.map(i => ({ id: i.id, name: i.name, dosage: i.dosage, frequency: i.frequency, duration: i.duration, instructions: i.instructions, quantityPrescribed:i.quantity_prescribed, quantityUnit:i.quantity_unit })),
  };
}

export async function createDoctorPrescription(doctorId, payload) {
  await verifyDoctorPatientRelation(doctorId, payload.patientId);
  if (!payload.items?.length || payload.items.some(i=>!Number.isInteger(i.quantityPrescribed)||i.quantityPrescribed<=0)) throw Object.assign(new Error('Quantite prescrite obligatoire pour chaque ligne.'),{status:422});
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if(payload.consultationId) {
      const [[c]]=await conn.execute("SELECT id FROM nova_consultations WHERE id=? AND patient_id=? AND doctor_id=? AND status='completed'",[payload.consultationId,payload.patientId,doctorId]);
      if(!c) throw Object.assign(new Error('Consultation non validee ou non autorisee.'),{status:422});
    }
    const [[doc]] = await conn.execute(`SELECT first_name, last_name, specialty FROM nova_doctors WHERE id = ?`, [doctorId]);
    const doctorName = doc ? `Dr. ${doc.first_name} ${doc.last_name}` : 'Dr. —';
    const specialty  = doc?.specialty || '';
    const id  = randomUUID();
    const now = new Date().toISOString();
    const validUntil = payload.validDays
      ? new Date(Date.now() + Number(payload.validDays) * 86400000).toISOString().slice(0, 10)
      : null;
    await conn.execute(
      `INSERT INTO nova_prescriptions (id, patient_id, doctor_name, doctor_specialty, issued_at, valid_until, status, notes, doctor_id, consultation_id)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
      [id, payload.patientId, doctorName, specialty, now, validUntil, payload.notes || null, doctorId, payload.consultationId || null]
    );
    const itemIds=new Map(payload.items.map(item=>[item,randomUUID()]));
    if (payload.items?.length) {
      const values = payload.items.map(item =>
        [itemIds.get(item), id, item.name, item.dosage || null, item.frequency || null, item.duration || null, item.instructions || null, item.quantityPrescribed, item.quantityUnit || 'unité']
      );
      const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      await conn.execute(
        `INSERT INTO nova_prescription_items (id, prescription_id, name, dosage, frequency, duration, instructions, quantity_prescribed, quantity_unit) VALUES ${placeholders}`,
        values.flat()
      );
    }
    // Seules les heures et la durée explicitement saisies par le prescripteur alimentent le pilulier.
    const planned=payload.items.filter(i=>i.scheduleTimes?.length);
    if(planned.length){
      const treatmentId=randomUUID();
      await conn.execute("INSERT INTO nova_treatments(id,patient_id,diagnosis,status,started_at,doctor_name) VALUES (?,?,?,'active',?,?)",[treatmentId,payload.patientId,'Suivi de prescription',now,doctorName]);
      for(const item of planned){
        if(!Number.isInteger(item.durationDays)||item.durationDays<1||item.durationDays>365||item.scheduleTimes.some(t=>!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)))throw Object.assign(new Error('Horaires et durée du suivi invalides.'),{status:422});
        const medId=randomUUID();await conn.execute('INSERT INTO nova_medications(id,treatment_id,name,dosage,frequency) VALUES (?,?,?,?,?)',[medId,treatmentId,item.name,item.dosage||null,item.frequency||null]);

        const until=new Date(Date.now()+(item.durationDays-1)*86400000).toISOString().slice(0,10);
        for(const time of new Set(item.scheduleTimes))await conn.execute("INSERT INTO nova_medication_schedules(id,patient_id,medication_id,name,dosage,take_time,color,prescription_item_id,starts_on,ends_on) VALUES (?,?,?,?,?,?,'red',?,?,?)",[randomUUID(),payload.patientId,medId,item.name,item.dosage||null,time,itemIds.get(item),now.slice(0,10),until]);
      }
    }
    const [[row]] = await conn.execute(
      `SELECT p.*, pat.first_name, pat.last_name FROM nova_prescriptions p
       JOIN nova_patients pat ON pat.id = p.patient_id WHERE p.id = ?`, [id]
    );
    await notifyPatientPrescription(row.patient_id,doctorName,conn);
    await conn.commit();

    return { id, patientId: row.patient_id, patientName: `${row.first_name} ${row.last_name}`, issuedAt: row.issued_at, status: row.status };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/* ─── Demandes d'analyses ────────────────────────────────────── */

export async function getDoctorLabRequests(doctorId) {
  const access = doctorAccessClause(doctorId, 'pat.id');
  const [rows] = await pool.execute(
    `SELECT lr.*, pat.first_name, pat.last_name, pat.cmu_number
     FROM nova_lab_requests lr JOIN nova_patients pat ON pat.id = lr.patient_id
     WHERE lr.doctor_id = ? AND ${access.sql} ORDER BY lr.requested_at DESC`,
    [doctorId, ...access.params]
  );
  return rows.map(r => ({
    id:             r.id,
    patientId:      r.patient_id,
    patientName:    `${r.first_name} ${r.last_name}`,
    cmuNumber:      r.cmu_number,
    type:           r.type,
    title:          r.title,
    notes:          r.notes,
    status:         r.status,
    consultationId: r.consultation_id,resultId:r.result_id,
    requestedAt:    r.requested_at,
  }));
}

/* ─── Suivi chroniques ───────────────────────────────────────── */

export async function getChronicPatients(doctorId) {
  // Patients avec maladies chroniques, limités aux dossiers accessibles
  const chronicAccess = doctorAccessClause(doctorId, 'p.id');
  const [rows] = await pool.execute(
    `SELECT DISTINCT p.*, mp.chronic_diseases, mp.allergies,
            (SELECT c.started_at FROM nova_consultations c WHERE c.patient_id = p.id AND c.doctor_id = ? ORDER BY c.started_at DESC LIMIT 1) AS last_consult,
            (SELECT c.diagnosis_main FROM nova_consultations c WHERE c.patient_id = p.id AND c.doctor_id = ? ORDER BY c.started_at DESC LIMIT 1) AS last_diagnosis
     FROM nova_patients p
     LEFT JOIN nova_medical_profile mp ON mp.patient_id = p.id
     WHERE p.deleted_at IS NULL AND ${chronicAccess.sql}
       AND mp.chronic_diseases IS NOT NULL AND mp.chronic_diseases != '[]'
     ORDER BY last_consult ASC`,
    [doctorId, doctorId, ...chronicAccess.params]
  );
  return rows.map(r => {
    const birth = r.birth_date ? new Date(r.birth_date) : null;
    const today = new Date();
  const age   = birth ? today.getFullYear() - birth.getFullYear() - (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0) : null;
    const chronic = medicalList(r.chronic_diseases);
    const daysSince = r.last_consult
      ? Math.floor((Date.now() - new Date(r.last_consult).getTime()) / 86400000)
      : null;
    const risk = !r.last_consult ? 'high'
      : daysSince > 180 ? 'high'
      : daysSince > 90  ? 'medium'
      : 'low';
    return {
      id:           r.id,
      firstName:    r.first_name,
      lastName:     r.last_name,
      cmuNumber:    r.cmu_number,
      phone:        r.phone,
      age,
      bloodType:    r.blood_type,
      chronicDiseases: chronic,
      allergies:    medicalList(r.allergies),
      lastConsult:  r.last_consult || null,
      lastDiagnosis:r.last_diagnosis || null,
      daysSince,
      risk,
    };
  });
}

/* ─── Alertes docteur ────────────────────────────────────────── */

export async function getDoctorAlerts(doctorId) {
  const access = doctorAccessClause(doctorId, 'p.id');
  const [rows] = await pool.execute(
    `SELECT a.*, p.first_name, p.last_name, p.cmu_number
     FROM nova_doctor_alerts a
     JOIN nova_patients p ON p.id = a.patient_id
     WHERE a.doctor_id = ? AND ${access.sql} ORDER BY a.created_at DESC LIMIT 50`,
    [doctorId, ...access.params]
  );
  return rows.map(r => ({
    id:          r.id,
    patientId:   r.patient_id,
    patientName: `${r.first_name} ${r.last_name}`,
    cmuNumber:   r.cmu_number,
    type:        r.type,
    level:       r.level,
    title:       r.title,
    body:        r.body,
    status:      r.status,
    createdAt:   r.created_at,
    resolvedAt:  r.resolved_at,
  }));
}

export async function createDoctorAlert(doctorId, payload) {
  await verifyDoctorPatientRelation(doctorId, payload.patientId);
  const id  = randomUUID();
  const now = new Date().toISOString();
  await pool.execute(
    `INSERT INTO nova_doctor_alerts (id, doctor_id, patient_id, type, level, title, body, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?)`,
    [id, doctorId, payload.patientId, payload.type, payload.level || 'warning', payload.title, payload.body || null, now]
  );
  return { id, ...payload, status: 'open', createdAt: now };
}

export async function resolveDoctorAlert(doctorId, alertId) {
  const [[existing]] = await pool.execute(
    `SELECT id,patient_id FROM nova_doctor_alerts WHERE id = ? AND doctor_id = ?`, [alertId, doctorId]
  );
  if (!existing) return null;
  await assertDoctorPatientAccess(doctorId,existing.patient_id);
  const now = new Date().toISOString();
  await pool.execute(
    `UPDATE nova_doctor_alerts SET status = 'resolved', resolved_at = ? WHERE id = ?`, [now, alertId]
  );
  return { id: alertId, status: 'resolved', resolvedAt: now };
}

/* ─── Finances (estimations) ─────────────────────────────────── */

export async function getDoctorFinances(doctorId) {
  const [[doc]] = await pool.execute(
    `SELECT consultation_fee, accepts_cmu FROM nova_doctors WHERE id = ?`, [doctorId]
  );
  const fee = doc?.consultation_fee || 15000;

  const [monthly] = await pool.execute(
    `SELECT SUBSTR(started_at,1,7) AS month, COUNT(*) AS count
     FROM nova_consultations WHERE doctor_id = ? AND status = 'completed'
     GROUP BY month ORDER BY month DESC LIMIT 12`,
    [doctorId]
  );

  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM nova_consultations WHERE doctor_id = ? AND status = 'completed'`,
    [doctorId]
  );

  const month = new Date().toISOString().slice(0, 7);
  const [[{ monthCount }]] = await pool.execute(
    `SELECT COUNT(*) AS monthCount FROM nova_consultations
     WHERE doctor_id = ? AND started_at LIKE ? AND status = 'completed'`,
    [doctorId, `${month}%`]
  );

  const [[{ activePrescriptions }]] = await pool.execute(
    `SELECT COUNT(*) AS activePrescriptions FROM nova_prescriptions WHERE doctor_id = ? AND status = 'active'`,
    [doctorId]
  );

  return {
    consultationFee:       fee,
    totalConsultations:    total,
    monthConsultations:    monthCount,
    estimatedMonthRevenue: monthCount * fee,
    estimatedTotalRevenue: total * fee,
    activePrescriptions,
    monthlyData: monthly.reverse().map(r => ({
      month:   r.month,
      count:   r.count,
      revenue: r.count * fee,
    })),
  };
}

/* ─── Réputation complète ────────────────────────────────────── */

export async function getDoctorFullReputation(doctorId) {
  const [[agg]] = await pool.execute(
    `SELECT AVG(rating) AS avgRating, COUNT(*) AS total FROM nova_doctor_reputation WHERE doctor_id = ?`,
    [doctorId]
  );
  const [dist] = await pool.execute(
    `SELECT ROUND(rating) AS star, COUNT(*) AS count
     FROM nova_doctor_reputation WHERE doctor_id = ?
     GROUP BY star ORDER BY star DESC`,
    [doctorId]
  );
  const [ratings] = await pool.execute(
    `SELECT r.rating, r.comment, r.created_at, p.first_name, p.last_name
     FROM nova_doctor_reputation r
     JOIN nova_patients p ON p.id = r.patient_id
     WHERE r.doctor_id = ? ORDER BY r.created_at DESC`,
    [doctorId]
  );
  return {
    avgRating:    agg.avgRating ? Number(agg.avgRating).toFixed(1) : '—',
    total:        agg.total || 0,
    distribution: [5, 4, 3, 2, 1].map(s => ({
      star:  s,
      count: Number(dist.find(d => Number(d.star) === s)?.count || 0),
    })),
    ratings: ratings.map(r => ({
      rating:      r.rating,
      comment:     r.comment,
      createdAt:   r.created_at,
      patientName: `${r.first_name?.[0] || 'A'}. ${r.last_name || 'Patient'}`,
    })),
  };
}

/* ─── Signature électronique ─────────────────────────────────── */

export async function getDoctorSignatureData(doctorId) {
  const [[doc]] = await pool.execute(
    `SELECT signature_data FROM nova_doctors WHERE id = ?`, [doctorId]
  );
  return { signatureData: doc?.signature_data || null };
}

export async function saveDoctorSignatureData(doctorId, signatureData) {
  await pool.execute(
    `UPDATE nova_doctors SET signature_data = ? WHERE id = ?`, [signatureData, doctorId]
  );
  return { ok: true };
}

export async function createDoctorLabRequest(doctorId, payload) {
  await verifyDoctorPatientRelation(doctorId, payload.patientId);
  if (payload.consultationId) {
    const [[cons]] = await pool.execute(
      'SELECT id FROM nova_consultations WHERE id = ? AND doctor_id = ? AND patient_id = ?',
      [payload.consultationId, doctorId, payload.patientId]
    );
    if (!cons) throw Object.assign(new Error('Consultation introuvable pour ce patient.'), { status: 404 });
  }
  const id  = randomUUID();
  const now = new Date().toISOString();
  await pool.execute(
    `INSERT INTO nova_lab_requests (id, patient_id, doctor_id, consultation_id, type, title, notes, status, requested_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [id, payload.patientId, doctorId, payload.consultationId || null, payload.type, payload.title, payload.notes || null, now]
  );
  const [[row]] = await pool.execute(
    `SELECT lr.*, pat.first_name, pat.last_name FROM nova_lab_requests lr
     JOIN nova_patients pat ON pat.id = lr.patient_id WHERE lr.id = ?`, [id]
  );
  return { id, patientName: `${row.first_name} ${row.last_name}`, type: row.type, title: row.title, status: row.status };
}

/* ═══════════════════════════════════════════════════════════════
   TEMPLATES CONSULTATION
   ═══════════════════════════════════════════════════════════════ */

export async function getConsultationTemplates(doctorId) {
  const [rows] = await pool.execute(
    'SELECT * FROM nova_consultation_templates WHERE doctor_id = ? ORDER BY is_default DESC, name ASC',
    [doctorId]
  );
  return rows.map(r => ({
    id: r.id, name: r.name, specialty: r.specialty,
    motif: r.motif, diagnosisMain: r.diagnosis_main,
    notes: r.notes, recommendations: r.recommendations,
    isDefault: Boolean(r.is_default), createdAt: r.created_at,
  }));
}

export async function createConsultationTemplate(doctorId, payload) {
  const id = randomUUID();
  await pool.execute(
    `INSERT INTO nova_consultation_templates (id, doctor_id, name, specialty, motif, diagnosis_main, notes, recommendations, is_default)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, doctorId, payload.name, payload.specialty || null,
     payload.motif || null, payload.diagnosisMain || null,
     payload.notes || null, payload.recommendations || null,
     payload.isDefault ? 1 : 0]
  );
  return { id, ...payload };
}

export async function deleteConsultationTemplate(doctorId, templateId) {
  const [[t]] = await pool.execute(
    'SELECT id FROM nova_consultation_templates WHERE id = ? AND doctor_id = ?', [templateId, doctorId]
  );
  if (!t) { const e = new Error('Template introuvable.'); e.status = 404; throw e; }
  await pool.execute('DELETE FROM nova_consultation_templates WHERE id = ?', [templateId]);
}

/* ═══════════════════════════════════════════════════════════════
   TEMPLATES ORDONNANCE
   ═══════════════════════════════════════════════════════════════ */

export async function getPrescriptionTemplates(doctorId) {
  const [rows] = await pool.execute(
    'SELECT * FROM nova_prescription_templates WHERE doctor_id = ? ORDER BY name ASC',
    [doctorId]
  );
  return rows.map(r => ({
    id: r.id, name: r.name,
    items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items,
    notes: r.notes, createdAt: r.created_at,
  }));
}

export async function createPrescriptionTemplate(doctorId, payload) {
  const id = randomUUID();
  await pool.execute(
    `INSERT INTO nova_prescription_templates (id, doctor_id, name, items, notes) VALUES (?, ?, ?, ?, ?)`,
    [id, doctorId, payload.name, JSON.stringify(payload.items), payload.notes || null]
  );
  return { id, ...payload };
}

export async function deletePrescriptionTemplate(doctorId, templateId) {
  const [[t]] = await pool.execute(
    'SELECT id FROM nova_prescription_templates WHERE id = ? AND doctor_id = ?', [templateId, doctorId]
  );
  if (!t) { const e = new Error('Template introuvable.'); e.status = 404; throw e; }
  await pool.execute('DELETE FROM nova_prescription_templates WHERE id = ?', [templateId]);
}

/* ═══════════════════════════════════════════════════════════════
   TRANSFERT PATIENT VERS SPÉCIALISTE
   ═══════════════════════════════════════════════════════════════ */

export async function createReferral(doctorId, payload) {
  await verifyDoctorPatientRelation(doctorId, payload.patientId);
  if (payload.toDoctorId === doctorId) throw Object.assign(new Error('Impossible de s’adresser un patient à soi-même.'), { status: 422 });
  const [[target]] = await pool.execute('SELECT id FROM nova_doctors WHERE id = ? AND is_available = 1', [payload.toDoctorId]);
  if (!target) throw Object.assign(new Error('Médecin destinataire introuvable ou indisponible.'), { status: 404 });
  if(!await hasDoctorPatientAccess(payload.toDoctorId,payload.patientId))throw Object.assign(new Error('Le patient doit autoriser le spécialiste avant de transmettre des informations médicales.'),{status:409});

  const id = randomUUID();
  const sharedData = payload.sharedData || ['profile', 'vitals', 'consultations'];
  await pool.execute(
    `INSERT INTO nova_referrals (id, from_doctor_id, to_doctor_id, patient_id, reason, urgency, notes, shared_data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, doctorId, payload.toDoctorId, payload.patientId,
     payload.reason, payload.urgency || 'medium', payload.notes || null,
     JSON.stringify(sharedData)]
  );

  // Notification au médecin destinataire
  const [[fromDoc]] = await pool.execute('SELECT first_name, last_name FROM nova_doctors WHERE id = ?', [doctorId]);
  const [[toDocUser]] = await pool.execute('SELECT id FROM nova_users WHERE doctor_id = ?', [payload.toDoctorId]);
  if (toDocUser) {
    await pool.execute(
      `INSERT INTO nova_notifications (id, patient_id, user_id, target_role, type, title, body, link_page, created_at)
       VALUES (?, '', ?, 'doctor', 'referral', ?, ?, 'patients', NOW())`,
      [randomUUID(), toDocUser.id,
       'Transfert de patient',
       `Dr. ${fromDoc?.first_name || ''} ${fromDoc?.last_name || ''} vous transfère un patient. Motif : ${payload.reason}`]
    );
  }

  return { id, status: 'pending' };
}

export async function getReferrals(doctorId) {
  const access=doctorAccessClause(doctorId,'p.id');
  const [sent] = await pool.execute(
    `SELECT r.*, p.first_name AS p_fn, p.last_name AS p_ln,
            d.first_name AS d_fn, d.last_name AS d_ln, d.specialty AS d_spec
     FROM nova_referrals r
     JOIN nova_patients p ON p.id = r.patient_id
     JOIN nova_doctors d ON d.id = r.to_doctor_id
     WHERE r.from_doctor_id = ? AND ${access.sql} ORDER BY r.created_at DESC LIMIT 30`,
    [doctorId,...access.params]
  );
  const [received] = await pool.execute(
    `SELECT r.*, p.first_name AS p_fn, p.last_name AS p_ln,
            d.first_name AS d_fn, d.last_name AS d_ln, d.specialty AS d_spec
     FROM nova_referrals r
     JOIN nova_patients p ON p.id = r.patient_id
     JOIN nova_doctors d ON d.id = r.from_doctor_id
     WHERE r.to_doctor_id = ? AND ${access.sql} ORDER BY r.created_at DESC LIMIT 30`,
    [doctorId,...access.params]
  );

  const map = r => ({
    id: r.id, patientName: `${r.p_fn} ${r.p_ln}`, patientId: r.patient_id,
    doctorName: `Dr. ${r.d_fn} ${r.d_ln}`, doctorSpecialty: r.d_spec,
    reason: r.reason, urgency: r.urgency, notes: r.notes,
    sharedData: typeof r.shared_data === 'string' ? JSON.parse(r.shared_data) : r.shared_data,
    status: r.status, createdAt: r.created_at, respondedAt: r.responded_at,
  });

  return { sent: sent.map(map), received: received.map(map) };
}

export async function respondReferral(doctorId, referralId, accept) {
  const [[ref]] = await pool.execute(
    'SELECT * FROM nova_referrals WHERE id = ? AND to_doctor_id = ? AND status = ?',
    [referralId, doctorId, 'pending']
  );
  if (!ref) { const e = new Error('Transfert introuvable.'); e.status = 404; throw e; }
  await assertDoctorPatientAccess(doctorId,ref.patient_id);

  const status = accept ? 'accepted' : 'declined';
  await pool.execute(
    'UPDATE nova_referrals SET status = ?, responded_at = NOW() WHERE id = ?',
    [status, referralId]
  );

  // Notifier le médecin d'origine
  const [[toDoc]] = await pool.execute('SELECT first_name, last_name FROM nova_doctors WHERE id = ?', [doctorId]);
  const [[patRow]] = await pool.execute('SELECT first_name, last_name FROM nova_patients WHERE id = ?', [ref.patient_id]);
  notifyDoctorReferral(ref.from_doctor_id, `${toDoc?.first_name || ''} ${toDoc?.last_name || ''}`, `${patRow?.first_name || ''} ${patRow?.last_name || ''}`, accept).catch(() => {});

  return { id: referralId, status };
}

/* ═══════════════════════════════════════════════════════════════
   CONSTANTES VITALES — ajoutées par le médecin
   ═══════════════════════════════════════════════════════════════ */

export async function addVitalByDoctor(doctorId, patientId, payload) {
  await verifyDoctorPatientRelation(doctorId, patientId);

  const id = randomUUID();
  const now = payload.measuredAt || new Date().toISOString();
  await pool.execute(
    `INSERT INTO nova_vitals (id, patient_id, type, label, value, unit, measured_at, source_role, author_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, patientId, payload.type, payload.label || payload.type, String(payload.value), payload.unit || '', now, 'doctor', doctorId]
  );
  return { id, patientId, type: payload.type, value: payload.value, unit: payload.unit, measuredAt: now };
}

// ── Doctor Conversations ──────────────────────────
export async function getDoctorConversations(doctorId) {
  const access = doctorAccessClause(doctorId, 'p.id');
  const [rows] = await pool.execute(
    `SELECT c.*, p.first_name, p.last_name,(SELECT COUNT(*) FROM nova_messages m WHERE m.conversation_id=c.id AND m.sender_role='patient' AND m.is_read=0) unread_count
     FROM nova_conversations c
     JOIN nova_patients p ON p.id = c.patient_id
     WHERE c.doctor_id = ? AND ${access.sql}
     ORDER BY c.updated_at DESC`,
    [doctorId, ...access.params]
  );
  return rows.map(r => ({
    id: r.id, patientId: r.patient_id,
    doctorName: r.doctor_name, doctorSpecialty: r.doctor_specialty,
    patientName: `${r.first_name} ${r.last_name}`,
    unreadCount: r.unread_count, lastMessage: r.last_message,
    updatedAt: r.updated_at,
  }));
}

export async function getDoctorConversation(doctorId, convId) {
  const [[conv]] = await pool.execute(
    'SELECT * FROM nova_conversations WHERE id = ? AND doctor_id = ?', [convId, doctorId]
  );
  if (!conv) throw Object.assign(new Error('Conversation introuvable'), { status: 404 });
  await assertDoctorPatientAccess(doctorId, conv.patient_id);
  const [messages] = await pool.execute(
    'SELECT * FROM nova_messages WHERE conversation_id = ? ORDER BY created_at ASC', [convId]
  );
  return {
    id: conv.id, patientId: conv.patient_id,
    doctorName: conv.doctor_name, doctorSpecialty: conv.doctor_specialty,
    messages: messages.map(m => ({
      id: m.id, senderRole: m.sender_role, body: m.body,
      attachmentName: m.attachment_name, isRead: !!m.is_read, createdAt: m.created_at,
    })),
  };
}

export async function createDoctorMessage(doctorId,conversationId,payload){return persistMessage('doctor',doctorId,conversationId,payload);}

export async function markDoctorConversationRead(doctorId, convId) {
  const [[conv]] = await pool.execute(
    'SELECT id FROM nova_conversations WHERE id = ? AND doctor_id = ?', [convId, doctorId]
  );
  if (!conv) throw Object.assign(new Error('Conversation introuvable'), { status: 404 });
  await pool.execute('UPDATE nova_messages SET is_read = 1 WHERE conversation_id = ? AND sender_role = ?', [convId, 'patient']);
  await pool.execute('UPDATE nova_conversations SET unread_count = 0 WHERE id = ?', [convId]);
  return { ok: true };
}

// ── Doctor Documents ──────────────────────────────
export async function getDoctorDocuments(doctorId) {
  const [rows] = await pool.execute(
    'SELECT * FROM nova_doctor_documents WHERE doctor_id = ? ORDER BY created_at DESC',
    [doctorId]
  );
  return rows.map(r => ({
    id: r.id, title: r.title, category: r.category,
    mimeType: r.mime_type, sizeBytes: r.size_bytes,
    filePath: r.file_path, createdAt: r.created_at,
  }));
}

export async function createDoctorDocument(doctorId, body, file) {
  const id = randomUUID();
  const now = new Date().toISOString();
  await pool.execute(
    'INSERT INTO nova_doctor_documents (id, doctor_id, title, category, mime_type, size_bytes, file_path, created_at) VALUES (?,?,?,?,?,?,?,?)',
    [id, doctorId, body.title || file.originalname, body.category || 'other', file.mimetype, file.size, `shared/${file.filename}`, now]
  );
  return { id, title: body.title || file.originalname, category: body.category || 'other', createdAt: now };
}

export async function deleteDoctorDocument(doctorId, docId) {
  const [[doc]] = await pool.execute('SELECT file_path FROM nova_doctor_documents WHERE id = ? AND doctor_id = ?', [docId, doctorId]);
  if (!doc) throw Object.assign(new Error('Document introuvable'), { status: 404 });
  await pool.execute('DELETE FROM nova_doctor_documents WHERE id = ?', [docId]);
  if (doc.file_path) {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const fullPath = path.join(process.cwd(), 'data', 'uploads', doc.file_path.includes('/')?doc.file_path:`shared/${doc.file_path}`);
    await fs.unlink(fullPath).catch(() => {});
  }
  return { ok: true };
}

// ── Doctor Settings ───────────────────────────────
export async function getDoctorSettings(userId) {
  const [[row]] = await pool.execute(
    'SELECT settings_json FROM nova_doctor_settings WHERE user_id = ?', [userId]
  );
  if (!row) return {};
  try { return JSON.parse(row.settings_json); } catch { return {}; }
}

export async function updateDoctorSettings(userId, payload) {
  const json = JSON.stringify(payload);
  await pool.execute(
    `INSERT INTO nova_doctor_settings (user_id, settings_json, updated_at) VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE settings_json = VALUES(settings_json), updated_at = NOW()`,
    [userId, json]
  );
  return payload;
}

export async function getDoctorLabResult(doctorId,id){
 const [[row]]=await pool.execute('SELECT patient_id FROM nova_lab_results WHERE id=?',[id]);
 if(!row)return null;await assertDoctorPatientAccess(doctorId,row.patient_id);
 return {...await getLabResult(row.patient_id,id),patientId:row.patient_id};
}
