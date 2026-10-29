import {useUnsaved} from '../../unsaved.js';
import React,{useEffect,useState} from 'react';
import {doctorApi} from '../../api/doctorApi.js';
import { User, Phone, MapPin, Star, Stethoscope, Award, Calendar } from 'lucide-react';
import { initials } from '../../utils/format.js';

export default function DProfile({ data, loading, card, sub, border, darkMode, notify }) {
  if (loading || !data) {
    return <div className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-64 rounded-2xl`} />;
  }
  const colorMap = { red: 'from-red-600 to-red-800', emerald: 'from-emerald-600 to-emerald-800', blue: 'from-blue-600 to-blue-800', indigo: 'from-indigo-600 to-indigo-800' };
  const grad = colorMap[data.avatarColor] || colorMap.red;

  const fields = [
    { l: 'Spécialité',     v: data.specialty + (data.subSpecialty ? ` — ${data.subSpecialty}` : '') },
    { l: 'Établissement',  v: data.address || '—' },
    { l: 'Ville',          v: data.city || '—' },
    { l: 'Téléphone',      v: data.phone || '—' },
    { l: 'Email',          v: data.email || '—' },
    { l: 'Expérience',     v: data.experienceYears?`${data.experienceYears} ans`:'Non renseignée' },
    { l: 'Langues',        v: data.languages || 'Français' },
    { l: 'Tarif consultation', v: data.consultationFee ? `${(data.consultationFee / 1000).toFixed(0)} 000 FCFA` : '—' },
    { l: 'CMU',            v: data.acceptsCmu ? 'Acceptée' : 'Non acceptée' },
  ];

  return (
    <div className="space-y-4">
      <div className={`bg-gradient-to-br ${grad} rounded-2xl p-6 text-white flex flex-col sm:flex-row items-start sm:items-center gap-4`}>
        <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl font-black border-2 border-white/30 flex-shrink-0">
          {data.avatarInitials}
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">Dr. {data.firstName} {data.lastName}</h2>
          <p className="text-white/80 text-sm mt-0.5">{data.specialty} • {data.city}</p>
          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map(s => <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(data.rating) ? 'fill-amber-400 text-amber-400' : 'text-white/30'}`} />)}
            </div>
            <span className="text-sm font-bold">{data.reviewsCount>0?`${data.rating} (${data.reviewsCount} avis)`:'Aucun avis'}</span>
          </div>
        </div>
      </div>

      <ProfessionalEditor key={JSON.stringify(data)} data={data} card={card} notify={notify} />
      {data.bio && (
        <div className={`${card} border rounded-2xl p-5`}>
          <h3 className="font-bold mb-2">Bio</h3>
          <p className={`text-sm ${sub}`}>{data.bio}</p>
        </div>
      )}

      <div className={`${card} border rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`}>
        {fields.map((f, i) => (
          <div key={i}>
            <p className={`text-[10px] font-bold uppercase tracking-wider ${sub}`}>{f.l}</p>
            <p className="text-sm font-semibold mt-1">{f.v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ORDONNANCES MÉDECIN
   ════════════════════════════════════════════════════════════════ */

function ProfessionalEditor({data,card,notify}){
 const [form,setForm]=useState({bio:data.bio||'',city:data.city||'',address:data.address||'',email:data.email||'',languages:data.languages||'',consultationFee:Number(data.consultationFee||0),acceptsCmu:!!data.acceptsCmu});
 useUnsaved(true,JSON.stringify(form));
 const [slots,setSlots]=useState([]),[slot,setSlot]=useState({date:'',time:''}),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{doctorApi.slots().then(setSlots).catch(e=>setError(e.message));},[]);
 const perform=async fn=>{if(busy)return;setBusy(true);setError('');try{await fn();setSlots(await doctorApi.slots());notify?.('Modification enregistrée');}catch(e){setError(e.message);}finally{setBusy(false);}};
 return <section className={`${card} border rounded-xl p-4 space-y-4`}><h3 className="font-bold">Profil et disponibilités</h3>{error&&<p role="alert" className="text-red-700">{error}</p>}
 <form onSubmit={e=>{e.preventDefault();perform(()=>doctorApi.updateProfile(form));}} className="grid sm:grid-cols-2 gap-3">
 {Object.entries({bio:'Présentation',city:'Ville',address:'Adresse',email:'Email',languages:'Langues',consultationFee:'Tarif FCFA'}).map(([key,label])=><label key={key} className="text-sm">{label}<input className="block border rounded p-2 w-full bg-transparent" type={key==='consultationFee'?'number':key==='email'?'email':'text'} min="0" value={form[key]} onChange={e=>setForm({...form,[key]:key==='consultationFee'?Number(e.target.value):e.target.value})}/></label>)}
 <label><input type="checkbox" checked={form.acceptsCmu} onChange={e=>setForm({...form,acceptsCmu:e.target.checked})}/> Accepte la CMU</label><button disabled={busy} className="bg-red-600 text-white rounded px-4 py-2">Enregistrer le profil</button></form>
 <form onSubmit={e=>{e.preventDefault();perform(()=>doctorApi.addSlot(slot));}} className="flex flex-wrap gap-3 items-end"><label>Date<input required type="date" min={new Date().toISOString().slice(0,10)} value={slot.date} onChange={e=>setSlot({...slot,date:e.target.value})}/></label><label>Heure (Côte d’Ivoire)<input required type="time" value={slot.time} onChange={e=>setSlot({...slot,time:e.target.value})}/></label><button disabled={busy} className="text-red-700 font-bold">Publier un créneau</button></form>
 <ul>{slots.map(s=><li key={s.id} className="flex gap-3 py-2"><span>{String(s.date).slice(0,10)} {s.time} — {s.status==='available'?'Disponible':'Réservé'}</span>{s.status==='available'&&<button disabled={busy} onClick={()=>perform(()=>doctorApi.deleteSlot(s.id))}>Retirer</button>}</li>)}</ul></section>;
}
