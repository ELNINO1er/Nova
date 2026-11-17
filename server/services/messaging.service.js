import {randomUUID} from 'node:crypto';
import {pool} from '../db/database.js';
import {createNotification} from './notification.service.js';
import {assertDoctorPatientAccess} from './access.js';
import {emitToUser} from '../realtime.js';

export async function startConversation(doctorId,patientId){
 await assertDoctorPatientAccess(doctorId,patientId);
 const conn=await pool.getConnection();
 try{await conn.beginTransaction();await conn.execute('SELECT id FROM nova_patients WHERE id=? FOR UPDATE',[patientId]);
 const [[existing]]=await conn.execute('SELECT id FROM nova_conversations WHERE doctor_id=? AND patient_id=? LIMIT 1',[doctorId,patientId]);
 if(existing){await conn.commit();return existing;}
 const [[doctor]]=await conn.execute('SELECT first_name,last_name,specialty FROM nova_doctors WHERE id=?',[doctorId]);
 if(!doctor)throw Object.assign(new Error('Professionnel introuvable.'),{status:404});
 const id=randomUUID();await conn.execute('INSERT INTO nova_conversations(id,patient_id,doctor_id,doctor_name,doctor_specialty,unread_count,last_message,updated_at) VALUES (?,?,?,?,?,0,?,?)',[id,patientId,doctorId,`Dr. ${doctor.first_name} ${doctor.last_name}`,doctor.specialty,'',new Date().toISOString()]);
 await conn.commit();return {id};
 }catch(e){await conn.rollback();throw e;}finally{conn.release();}
}

/* ─── Pièces jointes : éléments du dossier du patient de la conversation ─── */
// Un message ne copie rien : il référence un élément du dossier, relu (et contrôlé) à chaque affichage.
export const ATTACHMENT_TYPES=['prescription','lab_result','document','medical_summary'];
const notFound=(m='Conversation introuvable.')=>Object.assign(new Error(m),{status:404});
const fmtDate=(v)=>{const d=new Date(v);return Number.isNaN(d.getTime())?'':d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Africa/Abidjan'});};

// Résumé affiché dans la bulle ; null si l'élément n'appartient pas au patient (ou n'existe plus).
export async function describeAttachment(patientId,type,id,conn=pool){
 if(type==='prescription'){
  const [[p]]=await conn.execute('SELECT id,doctor_name,issued_at,(SELECT COUNT(*) FROM nova_prescription_items i WHERE i.prescription_id=p.id) n FROM nova_prescriptions p WHERE id=? AND patient_id=? AND deleted_at IS NULL',[id,patientId]);
  return p&&{type,id,title:'Ordonnance',subtitle:`${p.doctor_name||''} · ${Number(p.n)} médicament${Number(p.n)>1?'s':''}`,date:p.issued_at};
 }
 if(type==='lab_result'){
  const [[r]]=await conn.execute('SELECT id,title,lab_name,performed_at FROM nova_lab_results WHERE id=? AND patient_id=?',[id,patientId]);
  return r&&{type,id,title:r.title,subtitle:r.lab_name||'Résultat d’analyse',date:r.performed_at};
 }
 if(type==='document'){
  const [[d]]=await conn.execute('SELECT id,title,category,created_at FROM nova_documents WHERE id=? AND patient_id=?',[id,patientId]);
  return d&&{type,id,title:d.title,subtitle:'Document',date:d.created_at};
 }
 if(type==='medical_summary'&&id===patientId)return {type,id,title:'Résumé médical',subtitle:'Allergies, maladies chroniques, antécédents, traitements',date:null};
 return null;
}

async function withAttachments(patientId,rows){
 return Promise.all(rows.map(async(r)=>{
  if(!r.attachment_type)return {r,attachment:null};
  const a=await describeAttachment(patientId,r.attachment_type,r.attachment_id);
  return {r,attachment:a||{type:r.attachment_type,id:r.attachment_id,title:'Élément retiré du dossier',subtitle:'',date:null,missing:true}};
 }));
}

const mapMessage=(r,attachment)=>({id:r.id,conversationId:r.conversation_id,senderRole:r.sender_role,body:r.body,attachment:attachment||null,isRead:!!r.is_read,createdAt:r.created_at});

// Messages d'une conversation déjà autorisée, avec le résumé de leurs pièces jointes.
export async function listMessages(conv){
 const [rows]=await pool.execute('SELECT * FROM nova_messages WHERE conversation_id=? ORDER BY created_at ASC',[conv.id]);
 return (await withAttachments(conv.patient_id,rows)).map(({r,attachment})=>mapMessage(r,attachment));
}

// Conversation vue par l'un de ses deux participants ; le médecin doit avoir un accès au dossier en cours.
async function conversationFor(role,actorId,conversationId){
 const [[conv]]=await pool.execute('SELECT * FROM nova_conversations WHERE id=?',[conversationId]);
 if(!conv||(role==='doctor'?conv.doctor_id:conv.patient_id)!==actorId)throw notFound();
 if(role==='doctor')await assertDoctorPatientAccess(conv.doctor_id,conv.patient_id);
 return conv;
}

// Éléments du dossier que l'on peut joindre (patient et médecin voient le même dossier).
export async function listAttachables(role,actorId,conversationId){
 const conv=await conversationFor(role,actorId,conversationId);
 const pid=conv.patient_id;
 const [pres]=await pool.execute('SELECT p.id,p.doctor_name,p.issued_at,(SELECT COUNT(*) FROM nova_prescription_items i WHERE i.prescription_id=p.id) n FROM nova_prescriptions p WHERE patient_id=? AND deleted_at IS NULL ORDER BY issued_at DESC LIMIT 50',[pid]);
 const [labs]=await pool.execute('SELECT id,title,lab_name,performed_at FROM nova_lab_results WHERE patient_id=? ORDER BY performed_at DESC LIMIT 50',[pid]);
 const [docs]=await pool.execute('SELECT id,title,created_at FROM nova_documents WHERE patient_id=? ORDER BY created_at DESC LIMIT 50',[pid]);
 return {
  prescription:pres.map(p=>({type:'prescription',id:p.id,title:'Ordonnance',subtitle:`${p.doctor_name||''} · ${Number(p.n)} médicament${Number(p.n)>1?'s':''}`,date:p.issued_at})),
  lab_result:labs.map(r=>({type:'lab_result',id:r.id,title:r.title,subtitle:r.lab_name||'Résultat d’analyse',date:r.performed_at})),
  document:docs.map(d=>({type:'document',id:d.id,title:d.title,subtitle:'Document',date:d.created_at})),
  medical_summary:[{type:'medical_summary',id:pid,title:'Résumé médical',subtitle:'Allergies, maladies chroniques, antécédents, traitements',date:null}],
 };
}

async function attachedMessage(role,actorId,conversationId,messageId){
 const conv=await conversationFor(role,actorId,conversationId);
 const [[m]]=await pool.execute('SELECT attachment_type,attachment_id FROM nova_messages WHERE id=? AND conversation_id=?',[messageId,conv.id]);
 if(!m?.attachment_type)throw notFound('Pièce jointe introuvable.');
 return {conv,type:m.attachment_type,id:m.attachment_id};
}

// Contenu complet d'une pièce jointe, relu dans le dossier du patient de la conversation.
export async function getAttachmentDetail(role,actorId,conversationId,messageId){
 const {conv,type,id}=await attachedMessage(role,actorId,conversationId,messageId);
 const pid=conv.patient_id;
 if(type==='prescription'){
  const [[p]]=await pool.execute('SELECT * FROM nova_prescriptions WHERE id=? AND patient_id=? AND deleted_at IS NULL',[id,pid]);
  if(!p)throw notFound('Élément retiré du dossier.');
  const [items]=await pool.execute('SELECT name,dosage,frequency,duration,instructions FROM nova_prescription_items WHERE prescription_id=?',[id]);
  return {type,id,doctorName:p.doctor_name,doctorSpecialty:p.doctor_specialty,issuedAt:p.issued_at,validUntil:p.valid_until,status:p.status,notes:p.notes,items};
 }
 if(type==='lab_result'){
  const [[r]]=await pool.execute('SELECT * FROM nova_lab_results WHERE id=? AND patient_id=?',[id,pid]);
  if(!r)throw notFound('Élément retiré du dossier.');
  const [items]=await pool.execute('SELECT name,value,unit,ref_min refMin,ref_max refMax,status FROM nova_lab_result_items WHERE lab_result_id=?',[id]);
  return {type,id,title:r.title,labName:r.lab_name,orderedBy:r.ordered_by,performedAt:r.performed_at,notes:r.notes,items};
 }
 if(type==='document'){
  const [[d]]=await pool.execute('SELECT id,title,category,mime_type,size_bytes,file_path,created_at FROM nova_documents WHERE id=? AND patient_id=?',[id,pid]);
  if(!d)throw notFound('Élément retiré du dossier.');
  return {type,id,title:d.title,category:d.category,mimeType:d.mime_type,sizeBytes:d.size_bytes,createdAt:d.created_at,downloadable:Boolean(d.file_path)};
 }
 if(type==='medical_summary'){
  const {getMedicalProfile}=await import('./patient.service.js');
  const profile=await getMedicalProfile(pid);
  const [treatments]=await pool.execute('SELECT t.id,t.diagnosis,t.status,t.doctor_name FROM nova_treatments t WHERE t.patient_id=? ORDER BY t.started_at DESC',[pid]);
  const [meds]=treatments.length?await pool.query('SELECT treatment_id,name,dosage,frequency FROM nova_medications WHERE treatment_id IN (?)',[treatments.map(t=>t.id)]):[[]];
  return {type,id,allergies:profile.allergies,chronicDiseases:profile.chronicDiseases,familyHistory:profile.familyHistory,surgicalHistory:profile.surgicalHistory,
   treatments:treatments.map(t=>({diagnosis:t.diagnosis,status:t.status,doctorName:t.doctor_name,medications:meds.filter(m=>m.treatment_id===t.id).map(({name,dosage,frequency})=>({name,dosage,frequency}))}))};
 }
 throw notFound('Pièce jointe introuvable.');
}

// Fichier d'un document joint (mêmes contrôles de chemin que le téléchargement patient).
export async function getAttachmentFile(role,actorId,conversationId,messageId){
 const {conv,type,id}=await attachedMessage(role,actorId,conversationId,messageId);
 if(type!=='document')throw notFound('Aucun fichier pour cette pièce jointe.');
 const {getDocumentFile}=await import('./patient.service.js');
 const file=await getDocumentFile(conv.patient_id,id);
 if(!file)throw notFound('Fichier introuvable.');
 return file;
}

const ATTACHMENT_LABEL={prescription:'Ordonnance',lab_result:'Résultat d’analyse',document:'Document',medical_summary:'Résumé médical'};

export async function persistMessage(role,actorId,conversationId,payload){
 const body=(payload.body||'').trim();
 const att=payload.attachment||null;
 if(!body&&!att)throw Object.assign(new Error('Message vide.'),{status:422});
 const conn=await pool.getConnection();
 let result,participants;
 try{
  await conn.beginTransaction();const [[conv]]=await conn.execute('SELECT * FROM nova_conversations WHERE id=? FOR UPDATE',[conversationId]);
  if(!conv || (role==='doctor'?conv.doctor_id:conv.patient_id)!==actorId)throw notFound('Conversation non autorisée.');
  // Sans accès au dossier, pas d'échange : message compréhensible pour chacun des deux.
  await assertDoctorPatientAccess(conv.doctor_id,conv.patient_id).catch((e)=>{
    if(e.status!==403)throw e;
    throw Object.assign(new Error(role==='patient'?'Ce médecin n’a plus accès à votre dossier : autorisez-le de nouveau dans « Accès au dossier » pour lui écrire.':'Ce patient ne vous a pas (ou plus) donné accès à son dossier.'),{status:403,code:'no_record_access'});
  });
  const attachment=att?await describeAttachment(conv.patient_id,att.type,att.id,conn):null;
  if(att&&!attachment)throw Object.assign(new Error('Cet élément ne fait pas partie du dossier du patient.'),{status:422,code:'invalid_attachment'});
  const key=payload.requestKey||randomUUID();
  const [[prior]]=await conn.execute('SELECT * FROM nova_messages WHERE request_key=?',[key]);
  if(prior){
   if(prior.conversation_id!==conversationId||prior.sender_role!==role||prior.body!==body||(prior.attachment_type||null)!==(att?.type||null)||(prior.attachment_id||null)!==(att?.id||null))throw Object.assign(new Error('Clé déjà utilisée pour un autre message.'),{status:409});
   await conn.commit();return mapMessage(prior,attachment);
  }
  const id=randomUUID(),now=new Date().toISOString();
  await conn.execute('INSERT INTO nova_messages(id,conversation_id,sender_role,body,is_read,created_at,request_key,attachment_type,attachment_id) VALUES (?,?,?,?,0,?,?,?,?)',[id,conversationId,role,body,now,key,att?.type||null,att?.id||null]);
  const preview=body?body.slice(0,120):`Pièce jointe : ${ATTACHMENT_LABEL[att.type]}`;
  await conn.execute('UPDATE nova_conversations SET last_message=?,updated_at=? WHERE id=?',[preview,now,conversationId]);
  const [[patientUser]]=await conn.execute('SELECT id FROM nova_users WHERE patient_id=? AND deleted_at IS NULL AND disabled_at IS NULL',[conv.patient_id]);
  const [[doctorUser]]=await conn.execute('SELECT id FROM nova_users WHERE doctor_id=? AND deleted_at IS NULL AND disabled_at IS NULL',[conv.doctor_id]);
  participants={patient:patientUser?.id,doctor:doctorUser?.id};
  const targetRole=role==='patient'?'doctor':'patient';
  const target=participants[targetRole];
  if(target)await createNotification({userId:target,patientId:targetRole==='patient'?conv.patient_id:null,targetRole,type:'message',title:'Nouveau message',body:'Un nouveau message vous attend dans NOVA.',linkPage:'messages',sourceRole:role},conn);
  await conn.commit();
  result={id,conversationId,senderRole:role,body,attachment,isRead:false,createdAt:now};
 }catch(e){await conn.rollback();if(e.code==='ER_DUP_ENTRY')throw Object.assign(new Error('Clé de message déjà utilisée.'),{status:409});throw e;}finally{conn.release();}
 // Après validation seulement : les deux participants (et les autres onglets de l'expéditeur) reçoivent le message.
 for(const userId of new Set([participants.patient,participants.doctor]))emitToUser(userId,'message:new',{conversationId,message:result});
 return result;
}

// Lecture : l'autre participant voit ses messages passer en « Lu ».
export async function emitConversationRead(conversationId,readerRole){
 const [[conv]]=await pool.execute('SELECT patient_id,doctor_id FROM nova_conversations WHERE id=?',[conversationId]);
 if(!conv)return;
 const [[other]]=await pool.execute(`SELECT id FROM nova_users WHERE ${readerRole==='patient'?'doctor_id':'patient_id'}=? AND deleted_at IS NULL`,[readerRole==='patient'?conv.doctor_id:conv.patient_id]);
 if(other)emitToUser(other.id,'conversation:read',{conversationId,readerRole});
}
