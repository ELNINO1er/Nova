import HeartLoader from '../../components/HeartLoader.jsx';
import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Video, Phone, Check, X, ChevronLeft, ChevronRight, Search, Users } from 'lucide-react';
import { doctorApi } from '../../api/doctorApi.js';
import { formatDateFull, initials } from '../../utils/format.js';
import { appointmentStatus } from '../../utils/statusLabels.js';
import { confirmDialog } from '../../components/dialogs.jsx';

export default function DAgenda({ data, loading, onReload, notify, setPage, setShowVid, card, sub, border, darkMode }) {
  const [filter, setFilter] = useState('all'); // today | upcoming | all
  const [updating, setUpdating] = useState(null);

  const appts = Array.isArray(data) ? data : [];
  const today = new Date().toISOString().slice(0, 10);

  const now = Date.now();
  const isPast = (a) => !a.startsAt || new Date(a.startsAt).getTime() < now;
  // « À venir » : du plus proche au plus lointain, annulés exclus ; « Tous » : du plus récent au plus ancien.
  const filtered = appts.filter(a => {
    if (!a.startsAt) return filter === 'all';
    if (filter === 'today')    return a.startsAt.startsWith(today);
    if (filter === 'upcoming') return !isPast(a) && a.status !== 'cancelled';
    return true;
  }).sort((x, y) => (filter === 'all' ? -1 : 1) * String(x.startsAt).localeCompare(String(y.startsAt)));

  const handleAction = async (id, status) => {
    if (status === 'cancelled') {
      const a = appts.find((x) => x.id === id);
      const ok = await confirmDialog({ title: 'Annuler ce rendez-vous ?', message: `${a?.patientName || 'Le patient'} sera prévenu de l’annulation. Le créneau redeviendra disponible.`, confirmLabel: 'Annuler le rendez-vous', cancelLabel: 'Garder', danger: true });
      if (!ok) return;
    }
    setUpdating(id);
    try {
      await doctorApi.updateAppointment(id, { status });
      notify(status === 'confirmed' ? 'Rendez-vous confirmé : le patient est prévenu' : 'Rendez-vous annulé : le patient est prévenu');
      onReload();
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setUpdating(null);
    }
  };


  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="text-2xl font-bold">Agenda</h2><p className={`text-sm ${sub}`}>{filtered.length} rendez-vous</p></div>
        <div className={`flex gap-1 p-1 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
          {[{id:'today',l:"Aujourd'hui"},{id:'upcoming',l:'À venir'},{id:'all',l:'Tous'}].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === f.id ? `bg-white shadow text-red-600 ${darkMode ? '!bg-slate-700' : ''}` : sub}`}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3"><HeartLoader darkMode={darkMode} compact /></div>
      ) : filtered.length === 0 ? (
        <div className={`${card} border rounded-2xl p-10 flex flex-col items-center gap-2`}>
          <Calendar className={`w-10 h-10 ${sub}`} />
          <p className={`text-sm ${sub}`}>Aucun rendez-vous dans cette période</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(a => {
            const st = appointmentStatus(a.status);
            const past = isPast(a);
            const dt = a.startsAt ? new Date(a.startsAt) : null;
            const hasValidDate = dt && !Number.isNaN(dt.getTime());
            return (
              <div key={a.id} className={`${card} border rounded-2xl p-4 flex items-center gap-4`}>
                {/* Date bloc */}
                <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <p className="text-[10px] font-bold uppercase text-red-600">{hasValidDate ? dt.toLocaleDateString('fr-FR',{month:'short'}) : 'Date'}</p>
                  <p className="text-xl font-black leading-none">{hasValidDate ? dt.getDate() : '--'}</p>
                  <p className={`text-[10px] ${sub}`}>{hasValidDate ? dt.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) : '--:--'}</p>
                </div>
                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="font-bold">{a.patientName}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${st.cls}`}>{past && a.status !== 'cancelled' ? (a.status === 'requested' ? 'Demande expirée' : 'Passé') : st.label}</span>
                    {a.mode === 'video' && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-700 flex items-center gap-1"><Video className="w-2.5 h-2.5" />Vidéo</span>}
                  </div>
                  <p className={`text-xs ${sub}`}>{a.recordShared === false ? 'Dossier non partagé' : [a.cmuNumber && `CMU ${a.cmuNumber}`, Number.isInteger(a.age) && `${a.age} ans`].filter(Boolean).join(' • ') || 'Informations non renseignées'}</p>
                  <p className={`text-xs ${sub}`}>{a.specialty} • {a.location}</p>
                </div>
                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
                  {a.status === 'confirmed' && a.recordShared && (
                    <button type="button" onClick={() => setPage('consultations', a.patientId)}
                      className="px-3 py-1.5 rounded-lg bg-red-700 text-white text-xs font-bold">
                      Nouvelle consultation
                    </button>
                  )}
                  {a.mode === 'video' && a.status === 'confirmed' && setShowVid && (
                    <button onClick={() => setShowVid(true)}
                      className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 flex items-center gap-1">
                      <Video className="w-3 h-3" /> Démarrer
                    </button>
                  )}
                  {a.status === 'requested' && !past && (
                    <button disabled={updating === a.id} onClick={() => handleAction(a.id, 'confirmed')}
                      className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-50 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Confirmer
                    </button>
                  )}
                  {a.status !== 'cancelled' && !past && (
                    <button disabled={updating === a.id} onClick={() => handleAction(a.id, 'cancelled')}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold disabled:opacity-50 flex items-center gap-1
                        ${darkMode ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-100'}`}>
                      <X className="w-3 h-3" /> Annuler
                    </button>
                  )}
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
   CONSULTATIONS
   ════════════════════════════════════════════════════════════════ */
