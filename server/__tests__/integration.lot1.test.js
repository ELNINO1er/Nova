/*
 * Tests d'intégration (base MySQL réelle) : accès aux dossiers, rendez-vous, QR pharmacie.
 * S'appuient sur les données de démonstration (SEED_DEMO) et nettoient ce qu'ils créent.
 * Une base indisponible fait échouer la vérification.
 */
import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';

const db=await import('../db/database.js');
await db.initDb();
const runIf=describe;

runIf('Intégration lot 1', () => {
  let pool; let access; let patient; let doctorSvc; let pharmacy;
  const PATIENT = 'patient-demo';
  const DOCTOR = 'doc-001';
  const OTHER_DOCTOR = 'doc-003';
  const createdAppointments = [];
  const startedAt = new Date(Date.now() - 1000);

  beforeAll(async () => {
    pool = db.pool;
    access = await import('../services/access.js');
    patient = await import('../services/patient.service.js');
    doctorSvc = await import('../services/doctor.service.js');
    pharmacy = await import('../services/pharmacy.service.js');
    // Point de départ connu : le médecin de démo a un accès explicite.
    await patient.grantDoctorAccess(PATIENT, DOCTOR);
  });

  afterAll(async () => {
    if (createdAppointments.length) {
      await pool.query(`DELETE FROM nova_appointments WHERE id IN (${createdAppointments.map(() => '?').join(',')})`, createdAppointments);
    }
    await pool.execute('DELETE FROM nova_consents WHERE patient_id = ? AND doctor_id = ? AND requested_at >= ?', [PATIENT, DOCTOR, startedAt]);
    await pool.end();
  });

  it('une révocation coupe l’accès du médecin, y compris dans sa liste de patients', async () => {
    expect(await access.hasDoctorPatientAccess(DOCTOR, PATIENT)).toBe(true);
    await patient.revokeDoctorAccess(PATIENT, DOCTOR);
    expect(await access.hasDoctorPatientAccess(DOCTOR, PATIENT)).toBe(false);
    expect(await doctorSvc.getDoctorPatient(DOCTOR, PATIENT)).toBeNull();
    const list = await doctorSvc.getDoctorPatients(DOCTOR);
    expect(list.some((p) => p.id === PATIENT)).toBe(false);
    await expect(doctorSvc.createConsultation(DOCTOR, { patientId: PATIENT, motif: 'Test' })).rejects.toMatchObject({ status: 403 });
  });

  it('un nouvel accord rétablit l’accès', async () => {
    await patient.grantDoctorAccess(PATIENT, DOCTOR);
    expect(await access.hasDoctorPatientAccess(DOCTOR, PATIENT)).toBe(true);
  });

  it('une demande de rendez-vous est créée « requested » et le patient ne peut pas la confirmer', async () => {
    const startsAt = new Date(Date.now() + 40 * 86400000).toISOString().slice(0, 13) + ':00:00.000Z';
    const appt = await patient.createAppointment(PATIENT, { startsAt, doctorId: OTHER_DOCTOR, mode: 'onsite' });
    createdAppointments.push(appt.id);
    expect(appt.status).toBe('requested');
    await expect(patient.updateAppointment(PATIENT, appt.id, { status: 'confirmed' })).rejects.toMatchObject({ status: 409 });
  });

  it('refuse un deuxième rendez-vous sur le même horaire du même médecin', async () => {
    const startsAt = new Date(Date.now() + 41 * 86400000).toISOString().slice(0, 13) + ':00:00.000Z';
    const first = await patient.createAppointment(PATIENT, { startsAt, doctorId: OTHER_DOCTOR });
    createdAppointments.push(first.id);
    await expect(patient.createAppointment(PATIENT, { startsAt, doctorId: OTHER_DOCTOR })).rejects.toMatchObject({ status: 409 });
  });

  it('refuse une date passée', async () => {
    await expect(patient.createAppointment(PATIENT, { startsAt: '2020-01-01T10:00:00.000Z', doctorId: OTHER_DOCTOR })).rejects.toMatchObject({ status: 422 });
  });

  it('annule sans supprimer, et une nouvelle tentative est sans effet', async () => {
    const startsAt = new Date(Date.now() + 42 * 86400000).toISOString().slice(0, 13) + ':00:00.000Z';
    const appt = await patient.createAppointment(PATIENT, { startsAt, doctorId: OTHER_DOCTOR });
    createdAppointments.push(appt.id);
    const cancelled = await patient.cancelAppointment(PATIENT, appt.id);
    expect(cancelled.status).toBe('cancelled');
    const again = await patient.cancelAppointment(PATIENT, appt.id);
    expect(again.status).toBe('cancelled');
    const [[row]] = await pool.execute('SELECT id FROM nova_appointments WHERE id = ?', [appt.id]);
    expect(row).toBeTruthy();
    // Le médecin ne peut pas rouvrir un rendez-vous annulé.
    await expect(doctorSvc.updateDoctorAppointment(OTHER_DOCTOR, appt.id, { status: 'confirmed' })).rejects.toMatchObject({ status: 409 });
  });

  it('un patient ne peut pas agir sur le rendez-vous d’un autre patient', async () => {
    const startsAt = new Date(Date.now() + 43 * 86400000).toISOString().slice(0, 13) + ':00:00.000Z';
    const appt = await patient.createAppointment(PATIENT, { startsAt, doctorId: OTHER_DOCTOR });
    createdAppointments.push(appt.id);
    expect(await patient.cancelAppointment('patient-inexistant', appt.id)).toBeNull();
  });

  it('exige le QR de l’ordonnance côté pharmacie', () => {
    const qr = jwt.sign({ type: 'prescription', prescriptionId: 'presc-1' }, process.env.JWT_SECRET);
    expect(() => pharmacy.assertQrMatches(qr, 'presc-1')).not.toThrow();
    expect(() => pharmacy.assertQrMatches(qr, 'presc-2')).toThrow(/ne correspond pas/);
    expect(() => pharmacy.assertQrMatches('', 'presc-1')).toThrow(/invalide/);
  });
  it('sérialise deux réservations simultanées du même créneau', async()=>{
    const startsAt=new Date(Date.now()+145*86400000).toISOString();
    const results=await Promise.allSettled([1,2].map(()=>patient.createAppointment(PATIENT,{startsAt,doctorId:OTHER_DOCTOR})));
    for(const r of results) if(r.status==='fulfilled') createdAppointments.push(r.value.id);
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    expect(results.find(r=>r.status==='rejected').reason.status).toBe(409);
  });

  it('préserve un acte validé et conserve une correction motivée',async()=>{
    const cons=await doctorSvc.createConsultation(DOCTOR,{patientId:PATIENT,motif:'Test intégrité',diagnosisMain:'Original',status:'draft'});
    try{
      await doctorSvc.updateConsultation(DOCTOR,cons.id,{status:'completed'});
      await expect(doctorSvc.updateConsultation(DOCTOR,cons.id,{diagnosisMain:'Modifié'})).rejects.toMatchObject({status:409});
      await doctorSvc.updateConsultation(DOCTOR,cons.id,{diagnosisMain:'Correction',amendmentReason:'Précision documentée'});
      const [[row]]=await pool.execute('SELECT diagnosis_main FROM nova_consultations WHERE id=?',[cons.id]);
      const [[count]]=await pool.execute('SELECT COUNT(*) n FROM nova_consultation_amendments WHERE consultation_id=?',[cons.id]);
      expect(row.diagnosis_main).toBe('Original');expect(Number(count.n)).toBe(1);
    }finally{
      await pool.execute('DELETE FROM nova_consultation_amendments WHERE consultation_id=?',[cons.id]);
      await pool.execute('DELETE FROM nova_consultations WHERE id=?',[cons.id]);
    }
  });

  it('délivre partiellement, rejoue sans doubler et protège le reliquat concurrent',async()=>{
    const [[actor]]=await pool.execute("SELECT id,pharmacy_id FROM nova_users WHERE role='pharmacist' AND disabled_at IS NULL AND deleted_at IS NULL LIMIT 1");
    expect(actor).toBeTruthy();
    const rx=await doctorSvc.createDoctorPrescription(DOCTOR,{patientId:PATIENT,validDays:10,items:[{name:'Produit fictif de test',quantityPrescribed:10,quantityUnit:'unité'}]});
    const [[line]]=await pool.execute('SELECT id FROM nova_prescription_items WHERE prescription_id=?',[rx.id]);
    const qrToken=jwt.sign({type:'prescription',prescriptionId:rx.id},process.env.JWT_SECRET);
    const make=(key,qty,id=line.id)=>({prescriptionId:rx.id,qrToken,requestKey:key,status:'partial',items:[{prescriptionItemId:id,quantityDispensed:qty}]});
    try{
      const first=await pharmacy.dispensePrescription(actor.pharmacy_id,actor.id,make('initial-'+rx.id,4));
      const again=await pharmacy.dispensePrescription(actor.pharmacy_id,actor.id,make('initial-'+rx.id,4));
      expect(again.id).toBe(first.id);expect(first.status).toBe('partial');
      await expect(pharmacy.dispensePrescription(actor.pharmacy_id,actor.id,make('foreign-'+rx.id,1,'foreign-line'))).rejects.toMatchObject({status:422});
      await expect(pharmacy.dispensePrescription(actor.pharmacy_id,actor.id,make('excess-'+rx.id,7))).rejects.toMatchObject({status:409});
      const results=await Promise.allSettled([1,2].map(n=>pharmacy.dispensePrescription(actor.pharmacy_id,actor.id,make('last-'+n+rx.id,6))));
      expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
      const [[total]]=await pool.execute('SELECT SUM(i.quantity_dispensed) n FROM nova_dispense_items i JOIN nova_dispenses d ON d.id=i.dispense_id WHERE d.prescription_id=?',[rx.id]);
      expect(Number(total.n)).toBe(10);
    }finally{
      await pool.execute('DELETE i FROM nova_dispense_items i JOIN nova_dispenses d ON d.id=i.dispense_id WHERE d.prescription_id=?',[rx.id]);
      await pool.execute('DELETE FROM nova_dispenses WHERE prescription_id=?',[rx.id]);
      await pool.execute('DELETE FROM nova_dispense_requests WHERE prescription_id=?',[rx.id]);
      await pool.execute('DELETE FROM nova_prescription_items WHERE prescription_id=?',[rx.id]);
      await pool.execute('DELETE FROM nova_prescriptions WHERE id=?',[rx.id]);
    }
  });

  it('révoque les jetons quand le compte est suspendu ou sa version change',async()=>{
    const {randomUUID}=await import('node:crypto');const id=randomUUID();
    const {signAccessToken,requirePatient}=await import('../middleware/auth.js');
    await pool.execute("INSERT INTO nova_users(id,phone,code_hash,role,patient_id,name,created_at) VALUES (?,?,'unused','patient',?,'Test session',NOW())",[id,'069'+String(Date.now()).slice(-7),PATIENT]);
    const token=signAccessToken({id,role:'patient',patientId:PATIENT,sessionVersion:0});
    const check=async()=>{let code=200,accepted=false;const res={status:n=>{code=n;return res;},json:()=>{}};await requirePatient({headers:{authorization:'Bearer '+token}},res,()=>{accepted=true;});return {code,accepted};};
    try{expect((await check()).accepted).toBe(true);await pool.execute('UPDATE nova_users SET session_version=1 WHERE id=?',[id]);expect((await check()).code).toBe(401);await pool.execute('UPDATE nova_users SET session_version=0,disabled_at=NOW() WHERE id=?',[id]);expect((await check()).code).toBe(401);}finally{await pool.execute('DELETE FROM nova_users WHERE id=?',[id]);}
  });

  it('ne publie pas de petits effectifs ni de données individuelles',async()=>{
    const {suppress,getGovernorStats}=await import('../services/governor.service.js');
    expect(suppress([{n:1},{n:12},{n:0}],'n').map(r=>r.n)).toEqual([null,null,0]);
    const stats=await getGovernorStats();expect(stats.methodology.minimumCount).toBe(5);
    for(const v of Object.values(stats.kpis))expect(v===null||v===0||v>=5).toBe(true);
    expect(JSON.stringify(stats)).not.toContain('first_name');expect(JSON.stringify(stats)).not.toContain('phone');
    await expect(getGovernorStats({from:'2026-12-31',to:'2026-01-01'})).rejects.toMatchObject({status:422});
  });

  it('relie une prescription au pilulier sans doubler une prise concurrente',async()=>{
    const rx=await doctorSvc.createDoctorPrescription(DOCTOR,{patientId:PATIENT,items:[{name:'Produit fictif planifié',quantityPrescribed:6,quantityUnit:'unité',dosage:'Saisie du test',scheduleTimes:['08:00','20:00'],durationDays:3}]});
    let schedules=[],medications=[];
    try{
      [schedules]=await pool.execute('SELECT s.* FROM nova_medication_schedules s JOIN nova_prescription_items i ON i.id=s.prescription_item_id WHERE i.prescription_id=?',[rx.id]);
      expect(schedules).toHaveLength(2);
      [medications]=await pool.execute('SELECT DISTINCT m.id,m.treatment_id FROM nova_medications m JOIN nova_medication_schedules s ON s.medication_id=m.id JOIN nova_prescription_items i ON i.id=s.prescription_item_id WHERE i.prescription_id=?',[rx.id]);
      const results=await Promise.all([1,2].map(()=>patient.createMedicationIntake(PATIENT,schedules[0].id,{status:'taken'})));
      expect(results[0].id).toBe(results[1].id);
      await expect(patient.createMedicationIntake('other-patient',schedules[0].id,{status:'taken'})).rejects.toMatchObject({status:403});
    }finally{
      for(const row of schedules){await pool.execute('DELETE FROM nova_medication_intakes WHERE schedule_id=?',[row.id]);await pool.execute('DELETE FROM nova_medication_schedules WHERE id=?',[row.id]);}
      for(const row of medications){await pool.execute('DELETE FROM nova_medications WHERE id=?',[row.id]);await pool.execute('DELETE FROM nova_treatments WHERE id=?',[row.treatment_id]);}
      await pool.execute('DELETE FROM nova_prescription_items WHERE prescription_id=?',[rx.id]);await pool.execute('DELETE FROM nova_prescriptions WHERE id=?',[rx.id]);
    }
  });

  it('enregistre un résultat provenant du laboratoire nommé et refuse son écrasement',async()=>{
    const {recordLabResult}=await import('../services/clinical.service.js');
    const request=await doctorSvc.createDoctorLabRequest(DOCTOR,{patientId:PATIENT,type:'blood',title:'Analyse fictive intégrité'});
    const payload={laboratoryName:'Laboratoire fictif de test',performedAt:new Date(Date.now()-86400000).toISOString(),items:[{name:'Mesure fictive',value:'10',unit:'unité',status:'normal'}]};
    let result;
    try{
      await expect(recordLabResult(OTHER_DOCTOR,request.id,payload)).rejects.toMatchObject({status:404});
      result=await recordLabResult(DOCTOR,request.id,payload);
      expect((await recordLabResult(DOCTOR,request.id,payload)).id).toBe(result.id);
      await expect(recordLabResult(DOCTOR,request.id,{...payload,notes:'Remplacement'})).rejects.toMatchObject({status:409});
      const detail=await patient.getLabResult(PATIENT,result.id);expect(detail.laboratoryName).toBe(payload.laboratoryName);expect(detail.items).toHaveLength(1);
    }finally{
      if(result){await pool.execute('DELETE FROM nova_lab_result_items WHERE lab_result_id=?',[result.id]);await pool.execute('DELETE FROM nova_lab_results WHERE id=?',[result.id]);}
      await pool.execute('DELETE FROM nova_lab_requests WHERE id=?',[request.id]);
    }
  });

  it('rejoue un message sans doublon et calcule les non-lus par destinataire',async()=>{
    const {randomUUID}=await import('node:crypto');const {persistMessage}=await import('../services/messaging.service.js');const id=randomUUID();
    await pool.execute("INSERT INTO nova_conversations(id,patient_id,doctor_id,doctor_name,updated_at) VALUES (?,?,?,'Test messagerie',?)",[id,PATIENT,DOCTOR,new Date().toISOString()]);
    try{
      const payload={body:'Message fictif de test',requestKey:randomUUID()};
      const [first,second]=await Promise.all([1,2].map(()=>persistMessage('doctor',DOCTOR,id,payload)));
      expect(first.id).toBe(second.id);
      expect((await patient.getConversations(PATIENT)).find(c=>c.id===id).unreadCount).toBe(1);
      expect((await doctorSvc.getDoctorConversations(DOCTOR)).find(c=>c.id===id).unreadCount).toBe(0);
      await persistMessage('patient',PATIENT,id,{body:'Réponse fictive',requestKey:randomUUID()});
      expect((await doctorSvc.getDoctorConversations(DOCTOR)).find(c=>c.id===id).unreadCount).toBe(1);
      await patient.markConversationRead(PATIENT,id);
      expect((await patient.getConversations(PATIENT)).find(c=>c.id===id).unreadCount).toBe(0);
      await expect(persistMessage('patient','other-patient',id,payload)).rejects.toMatchObject({status:404});
    }finally{await pool.execute('DELETE FROM nova_messages WHERE conversation_id=?',[id]);await pool.execute('DELETE FROM nova_conversations WHERE id=?',[id]);}
  });

});
