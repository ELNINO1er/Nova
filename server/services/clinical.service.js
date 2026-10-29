import { randomUUID,createHash } from 'node:crypto';
import { pool } from '../db/database.js';
import { assertDoctorPatientAccess } from './access.js';
import { notifyPatientLabResult } from './notification.service.js';

// Le médecin prescripteur transcrit un résultat fourni par le laboratoire nommé.
// NOVA ne prétend pas vérifier l'identité du laboratoire ni être son système d'information.
export async function recordLabResult(doctorId, requestId, payload) {
  if(!Number.isFinite(Date.parse(payload.performedAt)) || Date.parse(payload.performedAt)>Date.now()) throw Object.assign(new Error('Date du résultat invalide ou future.'),{status:422});
  const hash=createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  const conn=await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[request]]=await conn.execute('SELECT * FROM nova_lab_requests WHERE id=? AND doctor_id=? FOR UPDATE',[requestId,doctorId]);
    if(!request) throw Object.assign(new Error('Demande introuvable.'),{status:404});
    await assertDoctorPatientAccess(doctorId,request.patient_id);
    if(request.status==='completed') {if(request.result_hash!==hash)throw Object.assign(new Error('Un résultat existe déjà ; correction tracée nécessaire.'),{status:409});await conn.commit();return {id:request.result_id,requestId,status:'completed',alreadyRecorded:true};}
    if(request.status!=='pending') throw Object.assign(new Error('Demande non ouverte.'),{status:409});
    const [[doctor]]=await conn.execute('SELECT first_name,last_name FROM nova_doctors WHERE id=?',[doctorId]);const doctorName=`Dr. ${doctor.first_name} ${doctor.last_name}`;
    const id=randomUUID();
    await conn.execute('INSERT INTO nova_lab_results(id,patient_id,title,lab_name,ordered_by,performed_at,status,notes,doctor_id) VALUES (?,?,?,?,?,?,?,?,?)',[id,request.patient_id,request.title,payload.laboratoryName,doctorName,payload.performedAt,'available',`Transcrit par le prescripteur. ${payload.notes||''}`,doctorId]);
    for(const item of payload.items) await conn.execute('INSERT INTO nova_lab_result_items(id,lab_result_id,name,value,unit,ref_min,ref_max,status) VALUES (?,?,?,?,?,?,?,?)',[randomUUID(),id,item.name,item.value,item.unit||null,item.refMin||null,item.refMax||null,item.status||'normal']);
    await conn.execute("UPDATE nova_lab_requests SET status='completed',result_id=?,result_hash=? WHERE id=?",[id,hash,requestId]);
    await conn.execute('INSERT INTO nova_medical_history(id,patient_id,type,title,occurred_at,doctor_name) VALUES (?,?,?,?,?,?)',[randomUUID(),request.patient_id,'lab',request.title,new Date().toISOString(),doctorName]);
    await notifyPatientLabResult(request.patient_id,request.title,conn);
    await conn.commit();
    return {id,requestId,status:'completed'};
  } catch(err){await conn.rollback();throw err;} finally{conn.release();}
}

export async function patientConsultations(patientId){
  const [rows]=await pool.execute("SELECT c.*,CONCAT('Dr. ',d.first_name,' ',d.last_name) doctor_name FROM nova_consultations c JOIN nova_doctors d ON d.id=c.doctor_id WHERE c.patient_id=? AND c.status='completed' AND c.deleted_at IS NULL ORDER BY c.started_at DESC",[patientId]);
  for(const row of rows){const [amendments]=await pool.execute('SELECT reason,content,created_at FROM nova_consultation_amendments WHERE consultation_id=? ORDER BY created_at',[row.id]);row.amendments=amendments;}
  return rows;
}
