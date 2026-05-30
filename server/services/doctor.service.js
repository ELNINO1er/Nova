import { randomUUID } from 'node:crypto';
import { pool } from '../db/database.js';

/* ─── Dashboard ──────────────────────────────────────────────── */

export async function getDoctorDashboard(doctorId) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const monthStr = new Date().toISOString().slice(0, 7);

  const [[doctor]]         = await pool.execute(`SELECT * FROM nova_doctors WHERE id = ?`, [doctorId]);
  const [todayAppts]       = await pool.execute(
    `SELECT a.*, p.first_name, p.last_name, p.cmu_number, p.birth_date, p.blood_type
     FROM nova_appointments a JOIN nova_patients p ON p.id = a.patient_id
     WHERE a.doctor_id = ? AND a.starts_at LIKE ? ORDER BY a.starts_at ASC`,
    [doctorId, `${todayStr}%`]
  );
  const [[{ totalPatients }]] = await pool.execute(
    `SELECT COUNT(DISTINCT patient_id) AS totalPatients FROM nova_appointments WHERE doctor_id = ?`, [doctorId]
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
     WHERE c.doctor_id = ? ORDER BY c.started_at DESC LIMIT 5`,
    [doctorId]
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
  let sql = `
    SELECT DISTINCT p.*
    FROM nova_patients p
    JOIN nova_appointments a ON a.patient_id = p.id
    WHERE a.doctor_id = ?`;
  const args = [doctorId];
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
  const [[access]] = await pool.execute(
    `SELECT id FROM nova_appointments WHERE doctor_id = ? AND patient_id = ? LIMIT 1`,
    [doctorId, patientId]
  );
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
    `SELECT * FROM nova_prescriptions WHERE patient_id = ? ORDER BY prescribed_at DESC LIMIT 5`, [patientId]
  );
  const [labResults] = await pool.execute(
    `SELECT * FROM nova_lab_results WHERE patient_id = ? ORDER BY performed_at DESC LIMIT 5`, [patientId]
  );

  const mpData = mp ? {
    allergies:       safeJson(mp.allergies),
    chronicDiseases: safeJson(mp.chronic_diseases),
    familyHistory:   safeJson(mp.family_history),
    surgicalHistory: safeJson(mp.surgical_history),
  } : { allergies: [], chronicDiseases: [], familyHistory: [], surgicalHistory: [] };

  return {
    ...mapPatientFull(patient),
    medicalProfile: mpData,
    vitals: vitals.map(v => ({ id: v.id, type: v.type, label: v.label, value: v.value, unit: v.unit, measuredAt: v.measured_at })),
    consultations: consultations.map(c => ({
      id: c.id, motif: c.motif, diagnosisMain: c.diagnosis_main, notes: c.notes,
      recommendations: c.recommendations, status: c.status, startedAt: c.started_at,
    })),
    prescriptions: prescriptions.map(r => ({ id: r.id, prescribedAt: r.prescribed_at, status: r.status })),
    labResults: labResults.map(r => ({ id: r.id, title: r.title, performedAt: r.performed_at, status: r.status })),
  };
}

/* ─── Rendez-vous ────────────────────────────────────────────── */

export async function getDoctorAppointments(doctorId, query = {}) {
  let sql = `
    SELECT a.*, p.first_name, p.last_name, p.cmu_number, p.birth_date, p.blood_type, p.phone
    FROM nova_appointments a JOIN nova_patients p ON p.id = a.patient_id
    WHERE a.doctor_id = ?`;
  const args = [doctorId];
  if (query.date)   { sql += ' AND a.starts_at LIKE ?'; args.push(`${query.date}%`); }
  if (query.status) { sql += ' AND a.status = ?'; args.push(query.status); }
  sql += ' ORDER BY a.starts_at DESC';
  const [rows] = await pool.execute(sql, args);
  return rows.map(mapApptWithPatient);
}

export async function updateDoctorAppointment(doctorId, id, changes) {
  const [[existing]] = await pool.execute(
    `SELECT id FROM nova_appointments WHERE id = ? AND doctor_id = ?`, [id, doctorId]
  );
  if (!existing) return null;
  const sets = []; const vals = [];
  if (changes.status)   { sets.push('status = ?');    vals.push(changes.status); }
  if (changes.startsAt) { sets.push('starts_at = ?'); vals.push(changes.startsAt); }
  if (changes.location) { sets.push('location = ?');  vals.push(changes.location); }
  if (!sets.length) return null;
  vals.push(id);
  await pool.execute(`UPDATE nova_appointments SET ${sets.join(', ')} WHERE id = ?`, vals);
  const [[row]] = await pool.execute(
    `SELECT a.*, p.first_name, p.last_name FROM nova_appointments a JOIN nova_patients p ON p.id = a.patient_id WHERE a.id = ?`, [id]
  );
  return mapApptWithPatient(row);
}

/* ─── Consultations ──────────────────────────────────────────── */

export async function getDoctorConsultations(doctorId) {
  const [rows] = await pool.execute(
    `SELECT c.*, p.first_name, p.last_name, p.cmu_number
     FROM nova_consultations c JOIN nova_patients p ON p.id = c.patient_id
     WHERE c.doctor_id = ? ORDER BY c.started_at DESC LIMIT 50`,
    [doctorId]
  );
  return rows.map(r => ({
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
  }));
}

export async function createConsultation(doctorId, payload) {
  const id  = randomUUID();
  const now = new Date().toISOString();
  await pool.execute(
    `INSERT INTO nova_consultations
      (id,patient_id,doctor_id,motif,diagnosis_main,diagnosis_secondary,notes,recommendations,status,started_at,completed_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [id, payload.patientId, doctorId,
     payload.motif || null, payload.diagnosisMain || null, payload.diagnosisSecondary || null,
     payload.notes || null, payload.recommendations || null,
     'completed', now, now]
  );
  const [[row]] = await pool.execute(
    `SELECT c.*, p.first_name, p.last_name FROM nova_consultations c
     JOIN nova_patients p ON p.id = c.patient_id WHERE c.id = ?`, [id]
  );
  return {
    id: row.id, patientId: row.patient_id,
    patientName: `${row.first_name} ${row.last_name}`,
    motif: row.motif, diagnosisMain: row.diagnosis_main,
    status: row.status, startedAt: row.started_at,
  };
}

export async function updateConsultation(doctorId, id, changes) {
  const [[existing]] = await pool.execute(
    `SELECT id FROM nova_consultations WHERE id = ? AND doctor_id = ?`, [id, doctorId]
  );
  if (!existing) return null;
  const sets = []; const vals = [];
  const fields = ['motif','diagnosis_main','diagnosis_secondary','notes','recommendations','status'];
  const map    = { motif:'motif', diagnosisMain:'diagnosis_main', diagnosisSecondary:'diagnosis_secondary', notes:'notes', recommendations:'recommendations', status:'status' };
  for (const [k, col] of Object.entries(map)) {
    if (changes[k] !== undefined) { sets.push(`${col} = ?`); vals.push(changes[k]); }
  }
  if (!sets.length) return null;
  vals.push(id);
  await pool.execute(`UPDATE nova_consultations SET ${sets.join(', ')} WHERE id = ?`, vals);
  return { id, ...changes };
}

/* ─── Statistiques ───────────────────────────────────────────── */

export async function getDoctorStats(doctorId) {
  const [[{ totalPatients }]] = await pool.execute(
    `SELECT COUNT(DISTINCT patient_id) AS totalPatients FROM nova_appointments WHERE doctor_id = ?`, [doctorId]
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
  const age   = birth ? new Date().getFullYear() - birth.getFullYear() : null;
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
  const age   = birth ? new Date().getFullYear() - birth.getFullYear() : null;
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
  const age   = birth ? new Date().getFullYear() - birth.getFullYear() : null;
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

function safeJson(val) {
  if (!val) return [];
  try { return JSON.parse(val); } catch { return []; }
}

/* ─── Ordonnances (médecin) ──────────────────────────────────── */

export async function getDoctorPrescriptions(doctorId) {
  const [rows] = await pool.execute(
    `SELECT p.*, pat.first_name, pat.last_name, pat.cmu_number,
            (SELECT COUNT(*) FROM nova_prescription_items pi WHERE pi.prescription_id = p.id) AS items_count
     FROM nova_prescriptions p
     JOIN nova_patients pat ON pat.id = p.patient_id
     WHERE p.doctor_id = ?
     ORDER BY p.issued_at DESC LIMIT 50`,
    [doctorId]
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
  const [items] = await pool.execute(
    `SELECT * FROM nova_prescription_items WHERE prescription_id = ? ORDER BY rowid`, [prescriptionId]
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
    items: items.map(i => ({ id: i.id, name: i.name, dosage: i.dosage, frequency: i.frequency, duration: i.duration, instructions: i.instructions })),
  };
}

export async function createDoctorPrescription(doctorId, payload) {
  const [[doc]] = await pool.execute(`SELECT first_name, last_name, specialty FROM nova_doctors WHERE id = ?`, [doctorId]);
  const doctorName = doc ? `Dr. ${doc.first_name} ${doc.last_name}` : 'Dr. —';
  const specialty  = doc?.specialty || '';
  const id  = randomUUID();
  const now = new Date().toISOString();
  const validUntil = payload.validDays
    ? new Date(Date.now() + Number(payload.validDays) * 86400000).toISOString().slice(0, 10)
    : null;
  await pool.execute(
    `INSERT INTO nova_prescriptions (id, patient_id, doctor_name, doctor_specialty, issued_at, valid_until, status, notes, doctor_id)
     VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
    [id, payload.patientId, doctorName, specialty, now, validUntil, payload.notes || null, doctorId]
  );
  for (const item of (payload.items || [])) {
    await pool.execute(
      `INSERT INTO nova_prescription_items (id, prescription_id, name, dosage, frequency, duration, instructions)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [randomUUID(), id, item.name, item.dosage || null, item.frequency || null, item.duration || null, item.instructions || null]
    );
  }
  const [[row]] = await pool.execute(
    `SELECT p.*, pat.first_name, pat.last_name FROM nova_prescriptions p
     JOIN nova_patients pat ON pat.id = p.patient_id WHERE p.id = ?`, [id]
  );
  return { id, patientId: row.patient_id, patientName: `${row.first_name} ${row.last_name}`, issuedAt: row.issued_at, status: row.status };
}

/* ─── Demandes d'analyses ────────────────────────────────────── */

export async function getDoctorLabRequests(doctorId) {
  const [rows] = await pool.execute(
    `SELECT lr.*, pat.first_name, pat.last_name, pat.cmu_number
     FROM nova_lab_requests lr JOIN nova_patients pat ON pat.id = lr.patient_id
     WHERE lr.doctor_id = ? ORDER BY lr.requested_at DESC LIMIT 50`,
    [doctorId]
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
    consultationId: r.consultation_id,
    requestedAt:    r.requested_at,
  }));
}

export async function createDoctorLabRequest(doctorId, payload) {
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
