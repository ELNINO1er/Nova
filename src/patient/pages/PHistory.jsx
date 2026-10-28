import React,{useEffect,useState} from 'react';
import {patientApi} from '../../api/patientApi.js';
import { Clock, ClipboardList } from 'lucide-react';
import { formatDate, historyTypeLabel } from '../../utils/format.js';

export default function PHistory({ data, card, sub, darkMode }) {
  const [consultations,setConsultations]=useState([]);const [error,setError]=useState('');
  useEffect(()=>{let alive=true;patientApi.consultations().then(r=>alive&&setConsultations(r)).catch(e=>alive&&setError(e.message));return()=>{alive=false;};},[data]);
  if (!data) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Historique médical</h2>
        <div className={`${card} border rounded-2xl p-6`}><div className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-48 rounded-lg`}></div></div>
      </div>
    );
  }
  const rows = Array.isArray(data) ? data : (data?.data || []);
  const cs = rows.map((item) => ({
    d: formatDate(item.occurredAt),
    dr: item.doctorName,
    sp: historyTypeLabel(item.type),
    di: item.title,
  }));
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Historique médical</h2>
      {error&&<p role="alert" className="text-red-700">{error}</p>}
      {consultations.map(c=><details key={c.id} className={`${card} border rounded-xl p-4`}><summary>Compte rendu du {formatDate(c.started_at)} — {c.doctor_name}</summary><dl className="space-y-2 mt-3">{[['Motif',c.motif],['Conclusion',c.diagnosis_main],['Observations',c.notes],['Suivi',c.recommendations]].map(([label,value])=><div key={label}><dt className="font-semibold">{label}</dt><dd className="whitespace-pre-wrap">{value||'Non renseigné'}</dd></div>)}</dl>{c.amendments?.map((a,i)=><div key={i} className="mt-3 border-t pt-2"><p>Correction tracée : {a.reason}</p>{Object.entries(typeof a.content==='string'?JSON.parse(a.content):a.content).filter(([k])=>!['amendmentReason','status'].includes(k)).map(([k,v])=><p key={k}>{k} : {String(v)}</p>)}</div>)}</details>)}

      {cs.length === 0 ? (
        <div className={`${card} border rounded-2xl p-12 flex flex-col items-center text-center`}>
          <ClipboardList className={`w-12 h-12 ${sub} mb-4`} />
          <p className="font-semibold">Aucun historique</p>
          <p className={`text-xs ${sub} mt-1`}>Votre historique médical apparaîtra ici après vos premières consultations.</p>
        </div>
      ) : (
      <div className={`${card} border rounded-2xl p-6 space-y-3`}>
        {cs.map((c, i) => (
          <div key={i} className={`flex flex-col md:flex-row md:items-center gap-3 p-4 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className={`md:w-32 text-xs ${sub} font-semibold`}>{c.d}</div>
            <div className="flex-1">
              <p className="font-semibold">{c.dr} <span className={`text-xs font-normal ${sub}`}>• {c.sp}</span></p>
              <p className={`text-sm ${sub} mt-0.5`}>{c.di}</p>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

/* ============ ORDONNANCES ============ */
