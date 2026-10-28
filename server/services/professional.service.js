import {randomUUID} from 'node:crypto';
import {pool} from '../db/database.js';
import {withDoctorSchedule,assertDoctorSlotFree,assertFuture} from './workflow.js';
export async function updateProfessionalProfile(doctorId,payload){
 const columns={bio:'bio',city:'city',address:'address',email:'email',languages:'languages',consultationFee:'consultation_fee',acceptsCmu:'accepts_cmu'};
 const entries=Object.entries(payload).filter(([k])=>columns[k]);
 if(entries.length)await pool.execute(`UPDATE nova_doctors SET ${entries.map(([k])=>columns[k]+'=?').join(',')} WHERE id=?`,[...entries.map(([,v])=>typeof v==='boolean'?Number(v):v),doctorId]);
 return {ok:true};
}
export async function professionalSlots(doctorId){const [rows]=await pool.execute('SELECT id,slot_date date,slot_time time,status FROM nova_doctor_slots WHERE doctor_id=? AND slot_date>=? ORDER BY slot_date,slot_time',[doctorId,new Date().toISOString().slice(0,10)]);return rows;}
export async function addProfessionalSlot(doctorId,{date,time}){
 const startsAt=new Date(`${date}T${time}:00.000Z`).toISOString();assertFuture(startsAt);
 return withDoctorSchedule(doctorId,async conn=>{
  await assertDoctorSlotFree(doctorId,startsAt,null,conn);
  const [[existing]]=await conn.execute('SELECT id FROM nova_doctor_slots WHERE doctor_id=? AND slot_date=? AND LEFT(slot_time,5)=?',[doctorId,date,time]);
  if(existing)throw Object.assign(new Error('Créneau déjà publié.'),{status:409});
  const id=randomUUID();await conn.execute("INSERT INTO nova_doctor_slots(id,doctor_id,slot_date,slot_time,status) VALUES (?,?,?,?,'available')",[id,doctorId,date,time]);return {id};
 });
}
export async function removeProfessionalSlot(doctorId,id){return withDoctorSchedule(doctorId,async conn=>{const [r]=await conn.execute("DELETE FROM nova_doctor_slots WHERE id=? AND doctor_id=? AND status='available'",[id,doctorId]);if(!r.affectedRows)throw Object.assign(new Error('Créneau réservé ou introuvable.'),{status:409});return {ok:true};});}
