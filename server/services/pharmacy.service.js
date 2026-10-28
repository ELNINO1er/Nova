import { randomUUID, createHash } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { pool } from '../db/database.js';
import { notifyPatientDispense, notifyDoctorDispense } from './notification.service.js';

// Une ordonnance partiellement délivrée doit pouvoir être complétée.
const DISPENSABLE_STATUSES = ['active', 'partial'];

/* ─── Dashboard pharmacie ─────────────────────────────────────── */

export async function getPharmacyDashboard(pharmacyId) {
  const [[pharmacy]] = await pool.execute(
    'SELECT * FROM nova_pharmacies WHERE id = ?', [pharmacyId]
  );

  const [[{ todayCount }]] = await pool.execute(
    `SELECT COUNT(*) AS todayCount FROM nova_dispenses
     WHERE pharmacy_id = ? AND DATE(dispensed_at) = CURDATE()`,
    [pharmacyId]
  );

  const [[{ totalCount }]] = await pool.execute(
    `SELECT COUNT(*) AS totalCount FROM nova_dispenses WHERE pharmacy_id = ?`,
    [pharmacyId]
  );

  const [recentDispenses] = await pool.execute(
    `SELECT d.*, p.first_name, p.last_name
     FROM nova_dispenses d
     JOIN nova_patients p ON p.id = d.patient_id
     WHERE d.pharmacy_id = ?
     ORDER BY d.dispensed_at DESC LIMIT 10`,
    [pharmacyId]
  );

  return {
    pharmacy: pharmacy ? {
      id: pharmacy.id, name: pharmacy.name, city: pharmacy.city, phone: pharmacy.phone,
    } : null,
    todayDispenses: todayCount,
    totalDispenses: totalCount,
    recentDispenses: recentDispenses.map(r => ({
      id: r.id,
      patientName: displayName(r.first_name, r.last_name),
      status: r.status,
      dispensedAt: r.dispensed_at,
    })),
  };
}

/* ─── Vérifier ordonnance via QR / ID ─────────────────────────── */

/** Décode le QR d'une ordonnance et renvoie son identifiant (lève 422 si invalide ou expiré). */
export function decodePrescriptionQr(qrToken) {
  let decoded;
  try {
    decoded = jwt.verify(qrToken, process.env.JWT_SECRET);
  } catch {
    throw Object.assign(new Error('QR ordonnance invalide ou expiré.'), { status: 422, code: 'invalid_qr' });
  }
  if (decoded?.type !== 'prescription' || !decoded.prescriptionId) {
    throw Object.assign(new Error('QR ordonnance invalide.'), { status: 422, code: 'invalid_qr' });
  }
  return decoded.prescriptionId;
}

/** Le pharmacien n'agit sur une ordonnance que s'il présente son QR (remis par le patient). */
export function assertQrMatches(qrToken, prescriptionId) {
  if (decodePrescriptionQr(qrToken) !== prescriptionId) {
    throw Object.assign(new Error('Le QR présenté ne correspond pas à cette ordonnance.'), { status: 422, code: 'invalid_qr' });
  }
}

export async function verifyPrescriptionQR(qrToken) {
  let decoded;
  try {
    decoded = jwt.verify(qrToken, process.env.JWT_SECRET);
  } catch {
    const err = new Error('QR ordonnance invalide ou expiré.');
    // 422 et non 401 : le pharmacien est bien authentifié, c'est le QR qui est refusé.
    err.status = 422;
    err.code = 'invalid_qr';
    throw err;
  }
  if (decoded?.type !== 'prescription' || !decoded.prescriptionId) {
    const err = new Error('QR ordonnance invalide.');
    err.status = 422;
    throw err;
  }
  const prescriptionId = decoded.prescriptionId;

  const [[rx]] = await pool.execute(
    `SELECT p.id, p.patient_id, p.doctor_name, p.doctor_specialty, p.issued_at, p.valid_until, p.status,
            pat.first_name, pat.last_name, pat.cmu_number
     FROM nova_prescriptions p
     JOIN nova_patients pat ON pat.id = p.patient_id
     WHERE p.id = ?`,
    [prescriptionId]
  );
  if (!rx) return null;

  // Vérifier si déjà délivrée
  const [[dispense]] = await pool.execute(
    `SELECT id, status, dispensed_at FROM nova_dispenses WHERE prescription_id = ? ORDER BY dispensed_at DESC LIMIT 1`,
    [prescriptionId]
  );

  const isExpired = rx.valid_until && String(rx.valid_until).slice(0,10) < new Date().toISOString().slice(0,10);

  return {
    id: rx.id,
    patientName: displayName(rx.first_name, rx.last_name),
    cmuNumber: maskIdentifier(rx.cmu_number),
    doctorName: rx.doctor_name,
    doctorSpecialty: rx.doctor_specialty,
    issuedAt: rx.issued_at,
    validUntil: rx.valid_until,
    status: rx.status,
    isExpired,
    isAlreadyDispensed: dispense?.status === 'full',
    lastDispense: dispense ? {
      id: dispense.id,
      status: dispense.status,
      dispensedAt: dispense.dispensed_at,
    } : null,
    verification: {
      authentic: true,
      expired: isExpired,
      alreadyFull: dispense?.status === 'full',
      canDispense: !isExpired && dispense?.status !== 'full' && DISPENSABLE_STATUSES.includes(rx.status),
    },
  };
}

/* ─── Détail ordonnance (médicaments uniquement, PAS le dossier) ── */

export async function getPrescriptionForPharmacy(prescriptionId) {
  const [[rx]] = await pool.execute(
    `SELECT p.id, p.patient_id, p.doctor_name, p.doctor_specialty, p.issued_at, p.valid_until, p.status,
            pat.first_name, pat.last_name, pat.cmu_number
     FROM nova_prescriptions p
     JOIN nova_patients pat ON pat.id = p.patient_id
     WHERE p.id = ?`,
    [prescriptionId]
  );
  if (!rx) return null;

  const [items] = await pool.execute(
    'SELECT * FROM nova_prescription_items WHERE prescription_id = ?',
    [prescriptionId]
  );

  const [quantities] = await pool.execute("SELECT i.prescription_item_id,SUM(i.quantity_dispensed) n FROM nova_dispense_items i JOIN nova_dispenses d ON d.id=i.dispense_id WHERE d.prescription_id=? AND d.status<>'refused' GROUP BY i.prescription_item_id",[prescriptionId]);
  const delivered=new Map(quantities.map(q=>[q.prescription_item_id,Number(q.n)]));
  // Vérifier délivrances précédentes
  const [dispenses] = await pool.execute(
    `SELECT d.id, d.status, d.dispensed_at, d.notes, ph.name AS pharmacyName
     FROM nova_dispenses d
     JOIN nova_pharmacies ph ON ph.id = d.pharmacy_id
     WHERE d.prescription_id = ?
     ORDER BY d.dispensed_at DESC`,
    [prescriptionId]
  );

  return {
    id: rx.id,
    patientName: displayName(rx.first_name, rx.last_name),
    cmuNumber: maskIdentifier(rx.cmu_number),
    doctorName: rx.doctor_name,
    doctorSpecialty: rx.doctor_specialty,
    issuedAt: rx.issued_at,
    validUntil: rx.valid_until,
    status: rx.status,
    items: items.map(i => ({
      id: i.id,
      name: i.name,
      dosage: i.dosage,
      frequency: i.frequency,
      duration: i.duration,
      instructions: i.instructions,
      quantityPrescribed:i.quantity_prescribed, quantityUnit:i.quantity_unit,
      quantityDispensed:delivered.get(i.id)||0, remaining:i.quantity_prescribed==null?null:Math.max(0,Number(i.quantity_prescribed)-(delivered.get(i.id)||0)),
    })),
    dispenseHistory: dispenses.map(d => ({
      id: d.id,
      status: d.status,
      pharmacyName: d.pharmacyName,
      dispensedAt: d.dispensed_at,
    })),
  };
}

/* ─── Délivrer ordonnance ─────────────────────────────────────── */

export async function dispensePrescription(pharmacyId, pharmacistUserId, payload) {
  assertQrMatches(payload.qrToken, payload.prescriptionId);
  if (!payload.requestKey || payload.requestKey.length > 100) throw Object.assign(new Error('Cle de nouvelle tentative requise.'),{status:422});
  const items=(payload.items||[]).filter(i=>i.quantityDispensed>0).sort((a,b)=>a.prescriptionItemId.localeCompare(b.prescriptionItemId));
  if(new Set(items.map(i=>i.prescriptionItemId)).size!==items.length) throw Object.assign(new Error('Ligne dupliquee.'),{status:422});
  const hash=createHash('sha256').update(JSON.stringify({prescriptionId:payload.prescriptionId,status:payload.status,items,notes:payload.notes||null})).digest('hex');
  const conn=await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[rx]]=await conn.execute('SELECT * FROM nova_prescriptions WHERE id=? FOR UPDATE',[payload.prescriptionId]);
    if(!rx||rx.deleted_at) throw Object.assign(new Error('Ordonnance introuvable.'),{status:404});
    const [[prior]]=await conn.execute('SELECT * FROM nova_dispense_requests WHERE pharmacy_id=? AND request_key=?',[pharmacyId,payload.requestKey]);
    if(prior) {
      if(prior.payload_hash!==hash) throw Object.assign(new Error('Cette cle correspond a une autre operation.'),{status:409});
      await conn.commit(); return typeof prior.response_json==='string'?JSON.parse(prior.response_json):prior.response_json;
    }
    const [[actor]]=await conn.execute("SELECT id FROM nova_users WHERE id=? AND pharmacy_id=? AND role='pharmacist' AND disabled_at IS NULL AND deleted_at IS NULL",[pharmacistUserId,pharmacyId]);
    if(!actor) throw Object.assign(new Error('Officine non autorisee.'),{status:403});
    if(payload.status!=='refused' && (!DISPENSABLE_STATUSES.includes(rx.status)||(rx.valid_until&&String(rx.valid_until).slice(0,10)<new Date().toISOString().slice(0,10)))) throw Object.assign(new Error('Ordonnance expiree ou cloturee.'),{status:409});
    const [lines]=await conn.execute('SELECT * FROM nova_prescription_items WHERE prescription_id=? FOR UPDATE',[rx.id]);
    const [used]=await conn.execute("SELECT i.prescription_item_id,SUM(i.quantity_dispensed) n FROM nova_dispense_items i JOIN nova_dispenses d ON d.id=i.dispense_id WHERE d.prescription_id=? AND d.status<>'refused' GROUP BY i.prescription_item_id",[rx.id]);
    const totals=new Map(used.map(x=>[x.prescription_item_id,Number(x.n)]));
    const refused=payload.status==='refused';
    if(refused && !String(payload.notes||'').trim()) throw Object.assign(new Error('Motif du refus obligatoire.'),{status:422});
    if(!refused && (!items.length||lines.some(l=>l.quantity_prescribed==null))) throw Object.assign(new Error('Quantites prescrites manquantes : demander une ordonnance complete au prescripteur.'),{status:422});
    for(const i of items) {
      const line=lines.find(l=>l.id===i.prescriptionItemId);
      if(!line) throw Object.assign(new Error('Ligne etrangere a cette ordonnance.'),{status:422});
      if(!Number.isInteger(i.quantityDispensed)||i.quantityDispensed<1||i.quantityDispensed>Number(line.quantity_prescribed)-(totals.get(line.id)||0)) throw Object.assign(new Error('Quantite superieure au reliquat autorise.'),{status:409});
      if(i.substituted&&(!i.substitutionName?.trim()||!i.substitutionReason?.trim())) throw Object.assign(new Error('Substitution : nom et justification obligatoires.'),{status:422});
      if(!refused) totals.set(line.id,(totals.get(line.id)||0)+i.quantityDispensed);
    }
    const status=refused?'refused':lines.every(l=>(totals.get(l.id)||0)>=Number(l.quantity_prescribed))?'full':'partial';
    const id=randomUUID();
    await conn.execute('INSERT INTO nova_dispenses(id,prescription_id,pharmacy_id,pharmacist_user_id,patient_id,status,notes) VALUES (?,?,?,?,?,?,?)',[id,rx.id,pharmacyId,pharmacistUserId,rx.patient_id,status,payload.notes||null]);
    if(!refused) for(const i of items) await conn.execute('INSERT INTO nova_dispense_items(id,dispense_id,prescription_item_id,quantity_dispensed,substituted,substitution_name,substitution_reason) VALUES (?,?,?,?,?,?,?)',[randomUUID(),id,i.prescriptionItemId,i.quantityDispensed,i.substituted?1:0,i.substitutionName||null,i.substitutionReason||null]);
    if(!refused) await conn.execute('UPDATE nova_prescriptions SET status=? WHERE id=?',[status==='full'?'dispensed':'partial',rx.id]);
    const response={id,status,prescriptionId:rx.id};
    await conn.execute('INSERT INTO nova_dispense_requests(pharmacy_id,request_key,prescription_id,payload_hash,response_json) VALUES (?,?,?,?,?)',[pharmacyId,payload.requestKey,rx.id,hash,JSON.stringify(response)]);
    await notifyPatientDispense(rx.patient_id,'Votre pharmacie',status,conn);
    if(rx.doctor_id)await notifyDoctorDispense(rx.doctor_id,'Patient concerné','Officine',status,conn);
    await conn.commit();
    return response;
  } catch(err) { await conn.rollback(); if(err.code==='ER_DUP_ENTRY') throw Object.assign(new Error('Cle deja utilisee pour une autre operation.'),{status:409}); throw err; } finally {conn.release();}
}

/* ─── Historique délivrances ──────────────────────────────────── */

export async function getDispenseHistory(pharmacyId, query = {}) {
  let sql = `
    SELECT d.*, p.first_name, p.last_name, p.cmu_number,
           rx.doctor_name, rx.issued_at AS rx_issued_at
    FROM nova_dispenses d
    JOIN nova_patients p ON p.id = d.patient_id
    JOIN nova_prescriptions rx ON rx.id = d.prescription_id
    WHERE d.pharmacy_id = ?`;
  const args = [pharmacyId];

  if (query.status) {
    sql += ' AND d.status = ?';
    args.push(query.status);
  }
  if (query.date) {
    sql += ' AND DATE(d.dispensed_at) = ?';
    args.push(query.date);
  }

  sql += ' ORDER BY d.dispensed_at DESC';

  const [rows] = await pool.execute(sql, args);
  return rows.map(r => ({
    id: r.id,
    patientName: displayName(r.first_name, r.last_name),
    cmuNumber: maskIdentifier(r.cmu_number),
    doctorName: r.doctor_name,
    status: r.status,
    notes: r.notes,
    dispensedAt: r.dispensed_at,
    rxIssuedAt: r.rx_issued_at,
  }));
}

function displayName(firstName, lastName) {
  const first = String(firstName || '').trim();
  const last = String(lastName || '').trim();
  return `${first} ${last ? `${last[0]}.` : ''}`.trim() || 'Patient';
}

function maskIdentifier(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const visible = raw.slice(-4);
  return `${'*'.repeat(Math.max(4, raw.length - 4))}${visible}`;
}
