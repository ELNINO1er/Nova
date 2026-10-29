import LabResultDetails from './LabResultDetails.jsx';
import {useUnsaved} from '../../unsaved.js';
import React, { useState, useEffect } from 'react';
import { Microscope, Plus, Send, Save, X } from 'lucide-react';
import { doctorApi } from '../../api/doctorApi.js';
import { formatDate, initials } from '../../utils/format.js';

export default function DLabRequests({ data, loading, onReload, patientsData, loadPatients, notify, card, sub, border, darkMode }) {
  const [showForm, setShowForm] = useState(false);
  const [resultRequest,setResultRequest]=useState(null);
  const [form,     setForm]     = useState({ patientId: '', type: 'blood', title: '', notes: '' });
  const [saving,   setSaving]   = useState(false);

  const requests = Array.isArray(data) ? data : [];
  const patients = Array.isArray(patientsData) ? patientsData : [];

  const labTypes = [
    { id: 'blood',   label: 'Bilan sanguin',  icon: '🩸' },
    { id: 'urine',   label: 'Analyse urine',  icon: '🧪' },
    { id: 'imaging', label: 'Imagerie',        icon: '📷' },
    { id: 'cardio',  label: 'Cardio (ECG)',    icon: '❤️' },
    { id: 'micro',   label: 'Microbiologie',   icon: '🔬' },
    { id: 'other',   label: 'Autre',           icon: '📋' },
  ];

  const handleShowForm = () => { setShowForm(true); if (!patientsData) loadPatients(); };

  const handleSubmit = async () => {
    if (!form.patientId) return notify('Sélectionnez un patient', 'error');
    if (!form.title)     return notify('Intitulé requis', 'error');
    setSaving(true);
    try {
      await doctorApi.createLabRequest(form);
      notify('Demande envoyée');
      setShowForm(false);
      setForm({ patientId: '', type: 'blood', title: '', notes: '' });
      onReload();
    } catch (e) { notify(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const statusCfg = {
    pending:    { label: 'En attente', cls: 'bg-amber-100 text-amber-700' },
    processing: { label: 'En cours',   cls: 'bg-blue-100 text-blue-700' },
    available:  { label: 'Disponible', cls: 'bg-emerald-100 text-emerald-700' },
  };

  const inp = `mt-1 w-full px-3 py-2 rounded-xl border text-sm outline-none ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`;

  return (
    <div className="space-y-4">
      {resultRequest && <ResultForm request={resultRequest} onClose={()=>setResultRequest(null)} onDone={()=>{setResultRequest(null);onReload();}} notify={notify} />}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="text-2xl font-bold">Demandes d'analyses</h2><p className={`text-sm ${sub}`}>{requests.length} demandes</p></div>
        <button onClick={handleShowForm}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20">
          <Plus className="w-4 h-4" /> Nouvelle demande
        </button>
      </div>

      {showForm && (
        <div className={`${card} border rounded-2xl p-5 space-y-4`}>
          <div className="flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2"><Microscope className="w-4 h-4 text-blue-600" /> Demande d'analyse</h3>
            <button onClick={() => setShowForm(false)}><X className={`w-4 h-4 ${sub}`} /></button>
          </div>
          <div>
            <label className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Patient *</label>
            <select value={form.patientId} onChange={e => setForm(f => ({ ...f, patientId: e.target.value }))} className={inp}>
              <option value="">Sélectionner un patient...</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} — {p.cmuNumber}</option>)}
            </select>
          </div>
          <div>
            <label className={`text-xs font-bold uppercase tracking-wide ${sub} block mb-2`}>Type d'analyse *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {labTypes.map(t => (
                <button key={t.id} onClick={() => setForm(f => ({ ...f, type: t.id }))}
                  className={`p-2.5 rounded-xl border text-xs font-semibold text-left flex items-center gap-2 transition-all
                    ${form.type === t.id ? 'border-blue-500 bg-blue-50 text-blue-700' : (darkMode ? 'border-slate-700 hover:border-slate-500' : 'border-slate-200 hover:border-slate-400')}`}>
                  <span>{t.icon}</span>{t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Intitulé *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Ex: NFS, CRP, Glycémie à jeun, Échographie abdominale..." className={inp} />
          </div>
          <div>
            <label className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Notes / Indications</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
              placeholder="Contexte clinique, degré d'urgence..."
              className={`mt-1 w-full px-3 py-2 rounded-xl border text-sm outline-none resize-none ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`} />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowForm(false)} className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold ${darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'}`}>Annuler</button>
            <button onClick={handleSubmit} disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />...</> : <><Send className="w-4 h-4" />Envoyer</>}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[0,1,2].map(i => <div key={i} className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-20 rounded-2xl`} />)}</div>
      ) : requests.length === 0 ? (
        <div className={`${card} border rounded-2xl p-10 flex flex-col items-center gap-2`}>
          <Microscope className={`w-10 h-10 ${sub}`} />
          <p className={`text-sm ${sub}`}>Aucune demande d'analyse</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map(r => {
            const st       = statusCfg[r.status] || statusCfg.pending;
            const typeIcon = labTypes.find(t => t.id === r.type)?.icon || '📋';
            return (
              <div key={r.id} className={`${card} border rounded-2xl p-4 flex items-center gap-4`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl ${darkMode ? 'bg-slate-800' : 'bg-blue-50'}`}>
                  {typeIcon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{r.title}</p>
                  <p className={`text-xs ${sub}`}>{r.patientName} • {r.cmuNumber}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${st.cls}`}>{st.label}</span>
                    <p className={`text-xs ${sub}`}>{new Date(r.requestedAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' })}</p>
                  </div>
                  {r.notes && <p className={`text-xs ${sub} mt-1 truncate`}>{r.notes}</p>}
                  {r.resultId&&<LabResultDetails id={r.resultId}/>}
                  {r.status==='pending'&&<button type="button" onClick={()=>setResultRequest(r)} className="mt-2 border rounded-lg px-3 py-2 text-sm text-red-700">Transcrire le résultat reçu</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SUIVI CHRONIQUES
   ════════════════════════════════════════════════════════════════ */

function ResultForm({request,onClose,onDone,notify}) {
 const [lab,setLab]=useState(''),[date,setDate]=useState(new Date().toISOString().slice(0,10)),[text,setText]=useState(''),[busy,setBusy]=useState(false);
 useUnsaved(true,JSON.stringify({lab,date,text}));
 const save=async()=>{if(busy)return;setBusy(true);try{
 const items=text.split('\n').filter(x=>x.trim()).map(x=>{const [name,value,unit,status]=x.split('|').map(v=>v.trim());return {name,value,unit,status:status||'normal'};});
 await doctorApi.recordLabResult(request.id,{laboratoryName:lab,performedAt:new Date(date+'T00:00:00Z').toISOString(),items});notify('Résultat enregistré.');onDone();
 }catch(e){notify(e.message,'error');}finally{setBusy(false);}};
 return <section className="p-5 border rounded-xl space-y-3"><h3 className="font-bold">Résultat : {request.title}</h3><p className="text-sm">Transcription par le médecin prescripteur d’un document reçu. Indiquez le laboratoire d’origine.</p>
 <label className="block">Laboratoire<input className="block border rounded p-2 w-full" value={lab} onChange={e=>setLab(e.target.value)}/></label>
 <label className="block">Date de réalisation<input type="date" className="block border rounded p-2" value={date} max={new Date().toISOString().slice(0,10)} onChange={e=>setDate(e.target.value)}/></label>
 <label className="block">Résultats (une ligne par analyse : nom | valeur | unité | statut)<textarea className="block border rounded p-2 w-full" rows={5} value={text} onChange={e=>setText(e.target.value)} placeholder="Glycémie | 0.95 | g/L | normal"/></label><p className="text-xs">Statuts : normal, high, low, critical. La validation clinique reste à la charge du médecin.</p>
 <button type="button" disabled={busy||lab.trim().length<2||!text.trim()} onClick={save} className="bg-red-600 text-white rounded px-4 py-2 disabled:opacity-50">Enregistrer</button><button type="button" onClick={onClose} className="px-4 py-2">Annuler</button></section>;
}
