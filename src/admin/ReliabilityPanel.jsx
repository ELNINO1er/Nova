import React, { useState } from 'react';
import { adminApi } from '../api/adminApi.js';

const labels = { backup: 'Sauvegarde base et documents', restore: 'Exercice de restauration isolée' };
const statuses = { missing: 'À vérifier', overdue: 'Contrôle à renouveler', current: 'Contrôle enregistré' };

export default function ReliabilityPanel({ initial, card, sub, darkMode }) {
  const [data, setData] = useState(initial);
  const [form, setForm] = useState({ kind: 'backup', date: '', reference: '' });
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const input = `w-full min-h-11 rounded-xl border px-3 ${darkMode ? 'bg-slate-950 border-slate-700' : 'bg-white border-slate-300'}`;

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setFeedback('');
    try {
      await adminApi.recordReliabilityCheck({ kind: form.kind, verifiedAt: new Date(form.date).toISOString(), reference: form.reference });
      setData((await adminApi.system()).reliability);
      setForm({ kind: 'backup', date: '', reference: '' });
      setFeedback('Vérification enregistrée dans le journal d’administration.');
    } catch (error) {
      setFeedback(error.message || 'Enregistrement impossible.');
    } finally { setBusy(false); }
  }

  return <section className={`${card} border rounded-2xl p-4 sm:p-6 space-y-4`}>
    <h3 className="font-bold">Disponibilité et récupération des données</h3>
    <p className={`text-sm ${sub}`}>Documents {data?.uploads === 'writable' ? 'accessibles en écriture' : 'à vérifier'} · Stockage {data?.uploadsStorage === 'external' ? 'hors du déploiement' : 'dans le déploiement, à déplacer vers un espace persistant'}.</p>
    <div className="grid gap-3 sm:grid-cols-2">
      {(data?.checks || []).map((check) => <div key={check.kind} className="rounded-xl border p-4">
        <h4 className="font-semibold text-sm">{labels[check.kind]}</h4>
        <p className={`text-sm mt-1 ${check.status === 'current' ? sub : 'text-red-600 font-semibold'}`}>{statuses[check.status]}</p>
        <p className={`text-xs mt-2 ${sub}`}>{check.last ? new Date(check.last.verifiedAt).toLocaleString('fr-FR') : 'Aucune vérification enregistrée'} · À renouveler sous {check.maxAgeDays} jours</p>
        {check.last && <p className="text-xs mt-1 break-words">{check.last.reference}</p>}
      </div>)}
    </div>
    <p className={`text-xs ${sub}`}>Enregistrez uniquement un contrôle effectivement réalisé dans Hostinger ou un environnement isolé. Vérifiez la base et les documents, puis conservez une référence sans donnée patient. Ces déclarations ne déclenchent aucune sauvegarde et ne remplacent pas une surveillance externe.</p>
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm space-y-1"><span>Contrôle effectué</span><select className={input} value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value })}>{Object.entries(labels).map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}</select></label>
      <label className="text-sm space-y-1 min-w-0"><span>Date du contrôle</span><input required type="datetime-local" className={`${input} min-w-0 max-w-full`} value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label>
      <label className="text-sm space-y-1 sm:col-span-2"><span>Référence du contrôle ou de l’archive</span><input required minLength={3} maxLength={200} className={input} value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} placeholder="Référence de sauvegarde ou compte rendu de restauration" /></label>
      <button disabled={busy} className="min-h-11 rounded-xl bg-red-600 text-white font-semibold px-4 sm:col-span-2">{busy ? 'Enregistrement…' : 'Enregistrer le contrôle effectué'}</button>
    </form>
    {feedback && <p role="status" className="text-sm">{feedback}</p>}
    <p className={`text-xs ${sub}`}>En cas d’incident, notez l’heure, préservez les journaux et avertissez le responsable. Validez la restauration dans un environnement isolé avant de remplacer les données en ligne.</p>
  </section>;
}
