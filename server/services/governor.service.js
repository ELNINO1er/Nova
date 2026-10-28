import { pool } from '../db/database.js';

export const MIN_PUBLIC_COUNT=5;
export function suppress(rows,key) {
  const hidden=new Set(rows.map((r,i)=>Number(r[key])>0&&Number(r[key])<MIN_PUBLIC_COUNT?i:-1).filter(i=>i>=0));
  // Suppression complementaire : un total ne doit pas permettre de retrouver une cellule cachee.
  if(hidden.size===1){const other=rows.map((r,i)=>({i,n:Number(r[key])})).filter(x=>!hidden.has(x.i)&&x.n>0).sort((a,b)=>a.n-b.n)[0];if(other) hidden.add(other.i);}
  return rows.map((r,i)=>({...r,[key]:hidden.has(i)?null:Number(r[key]),suppressed:hidden.has(i)}));
}
const protect=n=>Number(n)>0&&Number(n)<MIN_PUBLIC_COUNT?null:Number(n);
export async function getGovernorStats(query={}) {
  const today=new Date().toISOString().slice(0,10);
  const to=query.to||today,from=query.from||new Date(Date.now()-29*86400000).toISOString().slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to)||from>to||to>today||!Number.isFinite(Date.parse(from))||!Number.isFinite(Date.parse(to))||new Date(from).toISOString().slice(0,10)!==from||new Date(to).toISOString().slice(0,10)!==to||Date.parse(to)-Date.parse(from)>366*86400000) throw Object.assign(new Error('Periode invalide (maximum 366 jours, sans date future).'),{status:422});
  const city=typeof query.city==='string'?query.city.trim():'';
  const [areas]=await pool.execute("SELECT city,COUNT(*) n FROM nova_patients WHERE deleted_at IS NULL AND city IS NOT NULL AND city<>'' GROUP BY city HAVING COUNT(*)>=?",[MIN_PUBLIC_COUNT]);
  if(city&&!areas.some(x=>x.city===city)) throw Object.assign(new Error('Zone non publiable : couverture insuffisante.'),{status:422});
  const scope=city?' AND p.city=?':'';const area=city?[city]:[];
  const scalar=async(sql,args=[])=>{const [[r]]=await pool.execute(sql,args);return Number(r.n);};
  const patients=await scalar('SELECT COUNT(*) n FROM nova_patients p WHERE p.deleted_at IS NULL'+scope,area);
  const count=async(table,date,status='')=>scalar(`SELECT COUNT(*) n FROM ${table} e JOIN nova_patients p ON p.id=e.patient_id WHERE p.deleted_at IS NULL AND LEFT(e.${date},10) BETWEEN ? AND ? ${status}${scope}`,[from,to,...area]);
  const raw={patients,doctors:await scalar('SELECT COUNT(*) n FROM nova_doctors'),pharmacies:await scalar('SELECT COUNT(*) n FROM nova_pharmacies'),
    consultations30:await count('nova_consultations','started_at',"AND e.status='completed' AND e.deleted_at IS NULL"),
    prescriptions30:await count('nova_prescriptions','issued_at',"AND e.status<>'cancelled' AND e.deleted_at IS NULL"),
    dispenses30:await count('nova_dispenses','dispensed_at',"AND e.status<>'refused'"),
    appointments30:await count('nova_appointments','starts_at',"AND e.status<>'cancelled' AND e.deleted_at IS NULL"),labRequests30:await count('nova_lab_requests','requested_at',"AND e.status<>'cancelled'")};
  const [cities]=await pool.execute('SELECT p.city,COUNT(*) patients FROM nova_patients p WHERE p.deleted_at IS NULL'+scope+' GROUP BY p.city ORDER BY patients DESC',area);
  const [sexes]=await pool.execute("SELECT COALESCE(NULLIF(p.sex,''),'NC') sex,COUNT(*) patients FROM nova_patients p WHERE p.deleted_at IS NULL"+scope+' GROUP BY 1',area);
  const [ages]=await pool.execute("SELECT CASE WHEN p.birth_date IS NULL OR p.birth_date='' THEN 'Non renseigne' WHEN TIMESTAMPDIFF(YEAR,STR_TO_DATE(LEFT(p.birth_date,10),'%Y-%m-%d'),CURDATE())<18 THEN '0-17 ans' WHEN TIMESTAMPDIFF(YEAR,STR_TO_DATE(LEFT(p.birth_date,10),'%Y-%m-%d'),CURDATE())<40 THEN '18-39 ans' WHEN TIMESTAMPDIFF(YEAR,STR_TO_DATE(LEFT(p.birth_date,10),'%Y-%m-%d'),CURDATE())<60 THEN '40-59 ans' ELSE '60 ans et +' END band,COUNT(*) patients FROM nova_patients p WHERE p.deleted_at IS NULL"+scope+' GROUP BY 1',area);
  const [monthly]=await pool.execute("SELECT LEFT(e.started_at,7) month,COUNT(*) consultations FROM nova_consultations e JOIN nova_patients p ON p.id=e.patient_id WHERE e.status='completed' AND e.deleted_at IS NULL AND p.deleted_at IS NULL AND LEFT(e.started_at,10) BETWEEN ? AND ?"+scope+' GROUP BY 1 ORDER BY 1',[from,to,...area]);
  const months=[];for(let d=new Date(from.slice(0,7)+'-01T00:00:00Z');d.toISOString().slice(0,7)<=to.slice(0,7);d.setUTCMonth(d.getUTCMonth()+1)){const month=d.toISOString().slice(0,7);months.push({month,consultations:Number(monthly.find(x=>x.month===month)?.consultations||0)});}
  const [specialties]=await pool.execute('SELECT specialty,COUNT(*) doctors FROM nova_doctors GROUP BY specialty');
  return {kpis:Object.fromEntries(Object.entries(raw).map(([k,n])=>[k,protect(n)])),cities:suppress(cities,'patients'),sexes:suppress(sexes,'patients'),ageBands:suppress(ages,'patients'),specialties:suppress(specialties,'doctors'),monthlyConsultations:suppress(months,'consultations'),generatedAt:new Date().toISOString(),
    filters:{from,to,city},availableCities:areas.map(x=>x.city),methodology:{minimumCount:MIN_PUBLIC_COUNT,scope:'Plateforme NOVA ; filtre par ville de residence. Professionnels : annuaire global.',coverage:'Utilisateurs de NOVA uniquement : ne represente pas la population ivoirienne.',suppression:'null = effectif masque (1 a 4 ou suppression complementaire). 0 = aucun evenement.',definitions:{patients:'Dossiers non supprimes, toutes dates.',consultations30:'Consultations validees dans la periode.',appointments30:'Rendez-vous non annules dont la date est dans la periode.',prescriptions30:'Ordonnances non annulees emises dans la periode.',dispenses30:'Delivrances non refusees dans la periode.',labRequests30:'Examens non annules demandes dans la periode.'}}};
}
