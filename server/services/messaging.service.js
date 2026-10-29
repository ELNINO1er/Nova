import {randomUUID} from 'node:crypto';
import {pool} from '../db/database.js';
import {createNotification} from './notification.service.js';
import {assertDoctorPatientAccess} from './access.js';
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

export async function persistMessage(role,actorId,conversationId,payload){
 const conn=await pool.getConnection();
 try{
  await conn.beginTransaction();const [[conv]]=await conn.execute('SELECT * FROM nova_conversations WHERE id=? FOR UPDATE',[conversationId]);
  if(!conv || (role==='doctor'?conv.doctor_id:conv.patient_id)!==actorId)throw Object.assign(new Error('Conversation non autorisée.'),{status:404});
  await assertDoctorPatientAccess(conv.doctor_id,conv.patient_id);
  const key=payload.requestKey||randomUUID();
  const [[prior]]=await conn.execute('SELECT * FROM nova_messages WHERE request_key=?',[key]);
  const map=r=>({id:r.id,conversationId,senderRole:r.sender_role,body:r.body,isRead:!!r.is_read,createdAt:r.created_at});
  if(prior){if(prior.conversation_id!==conversationId||prior.sender_role!==role||prior.body!==payload.body)throw Object.assign(new Error('Clé déjà utilisée pour un autre message.'),{status:409});await conn.commit();return map(prior);}
  const id=randomUUID(),now=new Date().toISOString();
  await conn.execute('INSERT INTO nova_messages(id,conversation_id,sender_role,body,is_read,created_at,request_key) VALUES (?,?,?,?,0,?,?)',[id,conversationId,role,payload.body,now,key]);
  await conn.execute('UPDATE nova_conversations SET last_message=?,updated_at=? WHERE id=?',[payload.body.slice(0,120),now,conversationId]);
  const targetRole=role==='patient'?'doctor':'patient';
  const [[target]]=await conn.execute(`SELECT id FROM nova_users WHERE ${targetRole==='patient'?'patient_id':'doctor_id'}=? AND deleted_at IS NULL AND disabled_at IS NULL`,[targetRole==='patient'?conv.patient_id:conv.doctor_id]);
  if(target)await createNotification({userId:target.id,patientId:targetRole==='patient'?conv.patient_id:null,targetRole,type:'message',title:'Nouveau message',body:'Un nouveau message vous attend dans NOVA.',linkPage:'messages',sourceRole:role},conn);
  await conn.commit();return {id,conversationId,senderRole:role,body:payload.body,isRead:false,createdAt:now};
 }catch(e){await conn.rollback();if(e.code==='ER_DUP_ENTRY')throw Object.assign(new Error('Clé de message déjà utilisée.'),{status:409});throw e;}finally{conn.release();}
}
