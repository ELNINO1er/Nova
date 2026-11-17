import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Clock, MapPin, Search, Send, Siren, X } from 'lucide-react';
import { patientApi } from '../../api/patientApi.js';
import { openNow } from '../../utils/pharmacyHours.js';

// Ordonnances que l'on peut encore faire préparer (non délivrées en totalité, non expirées).
export const isSendable = (p) => ['active', 'partial'].includes(p.status) && !(p.validUntil && String(p.validUntil).slice(0, 10) < new Date().toISOString().slice(0, 10));
const fmt = (v) => (v ? new Date(v).toLocaleDateString('fr-FR') : '');
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Envoi d'une ordonnance à une pharmacie choisie par le patient (préparation avant passage au comptoir). */
export default function SendPrescriptionDialog({ prescriptionId: initialRx, pharmacyId: initialPh, onClose, onSent, darkMode }) {
  const [pharmacies, setPharmacies] = useState(null);
  const [prescriptions, setPrescriptions] = useState(null);
  const [rxId, setRxId] = useState(initialRx || '');
  const [phId, setPhId] = useState(initialPh || '');
  const [query, setQuery] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  useEffect(() => { busyRef.current = busy; }, [busy]);
  const [error, setError] = useState('');

  useEffect(() => {
    patientApi.pharmacies().then((r) => setPharmacies(Array.isArray(r) ? r : r?.data || [])).catch(() => setPharmacies([]));
    patientApi.prescriptions().then((r) => {
      const list = (Array.isArray(r) ? r : r?.data || []).filter(isSendable);
      setPrescriptions(list);
      if (!initialRx && list.length === 1) setRxId(list[0].id);
    }).catch(() => setPrescriptions([]));
    const esc = (e) => { if (e.key === 'Escape' && !busyRef.current) onClose(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = useMemo(() => {
    const q = norm(query);
    return (pharmacies || []).filter((p) => !q || norm(`${p.name} ${p.city} ${p.address} ${p.isDuty ? 'de garde' : ''}`).includes(q)).slice(0, 30);
  }, [pharmacies, query]);
  const rx = prescriptions?.find((p) => p.id === rxId);
  const ph = pharmacies?.find((p) => p.id === phId);

  const send = async () => {
    if (!rxId) return setError('Choisissez l’ordonnance à envoyer.');
    if (!phId) return setError('Choisissez une pharmacie.');
    setBusy(true); setError('');
    try {
      const order = await patientApi.createPharmacyOrder({ pharmacyId: phId, prescriptionId: rxId, ...(notes.trim() && { notes: notes.trim() }) });
      onSent?.(order);
    } catch (e) { setError(e.message || 'Envoi impossible.'); }
    finally { setBusy(false); }
  };

  const panel = darkMode ? 'bg-slate-900 text-slate-100 border border-slate-800' : 'bg-white text-slate-900';
  const line = darkMode ? 'border-slate-700' : 'border-slate-200';
  const muted = darkMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/60" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="send-rx-title" className={`w-full sm:max-w-lg max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl shadow-2xl ${panel}`}>
        <div className={`flex items-start gap-3 px-5 py-4 border-b ${line}`}>
          <div className="flex-1 min-w-0">
            <h2 id="send-rx-title" className="text-lg font-bold">Envoyer l’ordonnance à une pharmacie</h2>
            <p className={`text-sm ${muted}`}>La pharmacie prépare vos médicaments ; vous les retirez en présentant le QR de l’ordonnance.</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Fermer" className="p-1 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div>
            <p className="text-sm font-semibold mb-2">1. Ordonnance</p>
            {!prescriptions ? <div className="h-12 rounded-xl bg-red-50 animate-pulse" />
              : prescriptions.length === 0 ? <p className={`text-sm ${muted}`}>Aucune ordonnance active à faire préparer.</p>
              : (
                <div className="space-y-2">
                  {prescriptions.map((p) => (
                    <label key={p.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer ${rxId === p.id ? 'border-red-400 bg-red-50/60 text-slate-900' : line}`}>
                      <input type="radio" name="rx" className="mt-1 accent-red-600" checked={rxId === p.id} onChange={() => setRxId(p.id)} />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{p.doctorName} · {fmt(p.issuedAt)}</span>
                        <span className={`block text-xs ${rxId === p.id ? 'text-slate-600' : muted}`}>{(p.items || []).map((i) => i.name).join(', ') || 'Ordonnance'}</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
          </div>

          <div>
            <p className="text-sm font-semibold mb-2">2. Pharmacie</p>
            <label className={`flex items-center gap-2 h-11 px-3 rounded-xl border ${line}`}>
              <Search className={`w-4 h-4 ${muted}`} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nom, quartier, ville, « de garde »…" aria-label="Rechercher une pharmacie" className="flex-1 min-w-0 bg-transparent text-sm outline-none" />
            </label>
            <div className="mt-2 max-h-56 overflow-y-auto space-y-2 pr-1">
              {!pharmacies ? <div className="h-12 rounded-xl bg-red-50 animate-pulse" />
                : shown.length === 0 ? <p className={`text-sm ${muted} py-3`}>Aucune pharmacie trouvée.</p>
                : shown.map((p) => (
                  <label key={p.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer ${phId === p.id ? 'border-red-400 bg-red-50/60 text-slate-900' : line}`}>
                    <input type="radio" name="ph" className="mt-1 accent-red-600" checked={phId === p.id} onChange={() => setPhId(p.id)} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold">{p.name}</span>
                      <span className={`flex items-center gap-1 text-xs ${phId === p.id ? 'text-slate-600' : muted}`}><MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{[p.address, p.city].filter(Boolean).join(', ')}</span></span>
                    </span>
                    <span className="flex flex-col items-end gap-1 shrink-0 text-[11px] font-semibold">
                      {p.isDuty && <span className="inline-flex items-center gap-1 text-red-700"><Siren className="w-3 h-3" />De garde</span>}
                      <span className={`inline-flex items-center gap-1 ${openNow(p) ? 'text-emerald-700' : muted}`}><Clock className="w-3 h-3" />{openNow(p) ? 'Ouverte' : 'Fermée'}</span>
                    </span>
                  </label>
                ))}
            </div>
          </div>

          <label className="block text-sm font-semibold">3. Message à la pharmacie <span className={`font-normal ${muted}`}>(facultatif)</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} rows={2} placeholder="Ex. : je passe vers 17 h ; générique accepté."
              className={`mt-1.5 block w-full rounded-xl border px-3 py-2 text-sm font-normal outline-none focus:ring-2 focus:ring-red-500/40 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`} />
          </label>

          <p className={`text-xs rounded-xl p-3 ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
            {ph ? <strong>{ph.name}</strong> : 'La pharmacie choisie'} verra cette ordonnance (médicaments, quantités, prescripteur), votre prénom et l’initiale de votre nom
            le temps de la préparer. Vous pouvez annuler tant que l’ordonnance n’est pas délivrée.
          </p>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        </div>

        <div className={`px-5 py-3 border-t ${line} flex flex-col-reverse sm:flex-row gap-2 sm:justify-end`}>
          <button type="button" onClick={onClose} disabled={busy} className={`h-11 px-5 rounded-xl border text-sm font-semibold ${line}`}>Annuler</button>
          <button type="button" onClick={send} disabled={busy || !prescriptions?.length} className="h-11 px-5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50">
            <Send className="w-4 h-4" />{busy ? 'Envoi…' : rx && ph ? `Envoyer à ${ph.name}` : 'Envoyer'}
          </button>
        </div>
      </div>
    </div>
  );
}
