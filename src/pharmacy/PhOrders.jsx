import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Inbox, Pill, ScanLine, XCircle } from 'lucide-react';
import { pharmacyApi } from '../api/pharmacyApi.js';
import { promptDialog } from '../components/dialogs.jsx';
import { useRealtime } from '../realtime/socket.js';

// Ordonnances envoyées par les patients : préparer, répondre « prête » ou « indisponible ».
// La remise se fait au comptoir en scannant le QR présenté par le patient (la commande se clôt alors seule).
const STATUS = {
  pending: { label: 'À préparer', cls: 'bg-red-600 text-white' },
  ready: { label: 'Prête · en attente du patient', cls: 'bg-emerald-100 text-emerald-800' },
  unavailable: { label: 'Indisponible', cls: 'bg-amber-100 text-amber-800' },
  dispensed: { label: 'Délivrée', cls: 'bg-slate-100 text-slate-600' },
  cancelled: { label: 'Annulée par le patient', cls: 'bg-slate-100 text-slate-500' },
};
const GROUPS = [
  ['pending', 'À préparer'],
  ['ready', 'Prêtes'],
  ['unavailable', 'Indisponibles'],
  ['done', 'Terminées (30 derniers jours)'],
];
const when = (v) => { const d = new Date(v); return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); };

export default function PhOrders({ notify, setPage, onCountChange }) {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = () => pharmacyApi.orders()
    .then((rows) => { setOrders(rows); setError(''); onCountChange?.(rows.filter((o) => o.status === 'pending').length); })
    .catch((e) => setError(e.message || 'Commandes indisponibles.'));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useRealtime('pharmacy-order:changed', () => load());

  const answer = async (o, status) => {
    const message = status === 'ready'
      ? await promptDialog({ title: 'Ordonnance prête', message: 'Le patient est prévenu qu’il peut passer. Ajoutez une précision si besoin (prix, générique, horaires).', label: 'Message au patient (facultatif)', multiline: true, maxLength: 500, confirmLabel: 'Prévenir le patient' })
      : await promptDialog({ title: 'Ordonnance indisponible', message: 'Le patient est prévenu et pourra choisir une autre pharmacie.', label: 'Motif', placeholder: 'Ex. : rupture de stock sur l’Amoxicilline jusqu’à jeudi', multiline: true, maxLength: 500, required: true, confirmLabel: 'Prévenir le patient' });
    if (message == null) return;
    setBusy(o.id);
    try {
      await pharmacyApi.updateOrder(o.id, { status, ...(message && { message }) });
      notify(status === 'ready' ? 'Patient prévenu : ordonnance prête.' : 'Patient prévenu : ordonnance indisponible.');
      await load();
    } catch (e) { notify(e.message || 'Mise à jour impossible.', 'error'); }
    finally { setBusy(''); }
  };

  if (error && !orders) return <p role="alert" className="text-sm text-red-700">{error}</p>;
  if (!orders) return <div className="h-40 rounded-xl bg-red-50 animate-pulse" role="status" aria-label="Chargement" />;

  const groups = GROUPS.map(([key, title]) => [key, title, orders.filter((o) => (key === 'done' ? ['dispensed', 'cancelled'].includes(o.status) : o.status === key))]);
  if (!orders.length) return (
    <div className="rounded-xl border border-red-100 bg-white p-8 text-center group-data-[theme=dark]:border-slate-800 group-data-[theme=dark]:bg-slate-900">
      <Inbox className="w-8 h-8 mx-auto text-red-600" />
      <p className="mt-3 font-semibold">Aucune ordonnance reçue</p>
      <p className="mt-1 text-sm text-slate-500">Les patients peuvent vous envoyer une ordonnance depuis NOVA ; elle apparaîtra ici en direct.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600 group-data-[theme=dark]:text-slate-400">
        Préparez l’ordonnance puis prévenez le patient. À son passage, <button type="button" onClick={() => setPage('scan')} className="font-semibold text-red-700 underline underline-offset-2">scannez le QR</button> qu’il présente pour délivrer : la commande se clôt automatiquement.
      </p>
      {groups.map(([key, title, list]) => list.length > 0 && (
        <section key={key} className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600 group-data-[theme=dark]:text-slate-300">{title} <span className="font-normal">({list.length})</span></h2>
          {list.map((o) => (
            <article key={o.id} className={`rounded-xl border bg-white p-4 sm:p-5 group-data-[theme=dark]:bg-slate-900 ${o.status === 'pending' ? 'border-red-300' : 'border-red-100 group-data-[theme=dark]:border-slate-800'}`}>
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{o.patientName}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />Reçue le {when(o.createdAt)}{o.prescription ? ` · prescrite par ${o.prescription.doctorName}` : ''}</p>
                </div>
                <span className={`text-xs font-semibold rounded-full px-3 py-1 ${STATUS[o.status]?.cls || ''}`}>{STATUS[o.status]?.label || o.status}</span>
              </div>
              {o.notes && <p className="mt-3 text-sm rounded-lg bg-slate-50 px-3 py-2 group-data-[theme=dark]:bg-slate-800"><span className="font-semibold">Message du patient : </span>{o.notes}</p>}
              {o.prescription && (
                <ul className="mt-3 divide-y divide-red-50 group-data-[theme=dark]:divide-slate-800">
                  {o.prescription.items.map((i) => (
                    <li key={i.id} className="py-2 flex items-start gap-3">
                      <Pill className="w-4 h-4 mt-0.5 text-red-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{i.name}{i.dosage ? <span className="font-normal text-slate-500"> · {i.dosage}</span> : null}</p>
                        <p className="text-xs text-slate-500">{[i.frequency, i.duration, i.instructions].filter(Boolean).join(' · ')}</p>
                      </div>
                      <span className="text-xs font-semibold shrink-0">{i.remaining != null ? `${i.remaining} ${i.quantityUnit || ''} à délivrer` : 'Quantité non précisée'}</span>
                    </li>
                  ))}
                </ul>
              )}
              {o.pharmacistMessage && <p className="mt-2 text-xs text-slate-500">Votre message : « {o.pharmacistMessage} »</p>}
              {['pending', 'ready', 'unavailable'].includes(o.status) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {o.status !== 'ready' && (
                    <button type="button" disabled={busy === o.id} onClick={() => answer(o, 'ready')} className="h-10 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50">
                      <CheckCircle2 className="w-4 h-4" />Ordonnance prête
                    </button>
                  )}
                  {o.status !== 'unavailable' && (
                    <button type="button" disabled={busy === o.id} onClick={() => answer(o, 'unavailable')} className="h-10 px-4 rounded-lg border border-red-200 text-red-700 text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50 group-data-[theme=dark]:border-slate-700 group-data-[theme=dark]:text-red-300">
                      <XCircle className="w-4 h-4" />Indisponible
                    </button>
                  )}
                  {o.status === 'ready' && (
                    <button type="button" onClick={() => setPage('scan')} className="h-10 px-4 rounded-lg border border-slate-200 text-sm font-semibold inline-flex items-center gap-2 group-data-[theme=dark]:border-slate-700">
                      <ScanLine className="w-4 h-4" />Le patient est là : scanner le QR
                    </button>
                  )}
                </div>
              )}
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}
