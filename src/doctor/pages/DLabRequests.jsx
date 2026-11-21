import HeartLoader from '../../components/HeartLoader.jsx';
import NovaSelect from '../../components/NovaSelect.jsx';
import LabResultDetails from './LabResultDetails.jsx';
import {useUnsaved} from '../../unsaved.js';
import React, { useState, useEffect } from 'react';
import { Microscope, Plus, Send, Save, X } from 'lucide-react';
import { doctorApi } from '../../api/doctorApi.js';
import { formatDate, initials, patientLabel } from '../../utils/format.js';

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

  // Statuts réels d'une demande : en attente du résultat, puis résultat transcrit.
  const statusCfg = {
    pending:    { label: 'En attente du résultat', cls: 'bg-amber-100 text-amber-800' },
    processing: { label: 'En cours',               cls: 'bg-amber-100 text-amber-800' },
    completed:  { label: 'Résultat reçu',          cls: 'bg-emerald-100 text-emerald-800' },
    available:  { label: 'Résultat reçu',          cls: 'bg-emerald-100 text-emerald-800' },
  };

  const inp = `mt-1 w-full px-3 py-2 rounded-xl border text-sm outline-none ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`;

  return (
    <div className="space-y-4">
      {resultRequest && <ResultForm request={resultRequest} onClose={()=>setResultRequest(null)} onDone={()=>{setResultRequest(null);onReload();}} notify={notify} darkMode={darkMode} sub={sub} />}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="text-2xl font-bold">Demandes d'analyses</h2><p className={`text-sm ${sub}`}>{requests.length} demandes</p></div>
        <button onClick={handleShowForm}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 shadow-lg shadow-blue-600/20">
          <Plus className="w-4 h-4" /> Nouvelle demande
        </button>
      </div>

      {showForm && (
        <div className={`${card} border rounded-2xl p-5 space-y-4`}>
          <div className="flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2"><Microscope className="w-4 h-4 text-red-600" /> Demande d'analyse</h3>
            <button onClick={() => setShowForm(false)}><X className={`w-4 h-4 ${sub}`} /></button>
          </div>
          <div>
            <label className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Patient *</label>
            <NovaSelect darkMode={darkMode} value={form.patientId} onChange={e => setForm(f => ({ ...f, patientId: e.target.value }))} className={inp}>
              <option value="">Sélectionner un patient...</option>
              {patients.map(p => <option key={p.id} value={p.id}>{patientLabel(p)}</option>)}
            </NovaSelect>
          </div>
          <div>
            <label className={`text-xs font-bold uppercase tracking-wide ${sub} block mb-2`}>Type d'analyse *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {labTypes.map(t => (
                <button key={t.id} onClick={() => setForm(f => ({ ...f, type: t.id }))}
                  className={`p-2.5 rounded-xl border text-xs font-semibold text-left flex items-center gap-2 transition-all
                    ${form.type === t.id ? 'border-red-500 bg-red-50 text-red-700' : (darkMode ? 'border-slate-700 hover:border-slate-500' : 'border-slate-200 hover:border-slate-400')}`}>
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
              className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />...</> : <><Send className="w-4 h-4" />Envoyer</>}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3"><HeartLoader darkMode={darkMode} compact /></div>
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
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl ${darkMode ? 'bg-slate-800' : 'bg-red-50'}`}>
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

/* Transcription d'un résultat reçu : une ligne par analyse, champs guidés, interprétation proposée
   automatiquement d'après les valeurs de référence (modifiable). */
const LAB_STATUS = [
  { id: 'normal', label: 'Normal' },
  { id: 'high', label: 'Élevé' },
  { id: 'low', label: 'Bas' },
  { id: 'critical', label: 'Critique' },
];
const toNumber = (v) => { const n = Number(String(v ?? '').replace(',', '.').trim()); return String(v ?? '').trim() !== '' && Number.isFinite(n) ? n : null; };
// Interprétation suggérée : bas / élevé si la valeur sort de l'intervalle de référence.
function suggestStatus(row) {
  const v = toNumber(row.value), min = toNumber(row.refMin), max = toNumber(row.refMax);
  if (v === null || (min === null && max === null)) return null;
  if (min !== null && v < min) return 'low';
  if (max !== null && v > max) return 'high';
  return 'normal';
}
const emptyRow = (name = '') => ({ key: Math.random().toString(36).slice(2), name, value: '', unit: '', refMin: '', refMax: '', status: 'normal', statusTouched: false });

function ResultForm({ request, onClose, onDone, notify, darkMode, sub }) {
  const today = new Date().toISOString().slice(0, 10);
  const [lab, setLab] = useState('');
  const [date, setDate] = useState(today);
  const [rows, setRows] = useState(() => [emptyRow(request.title || '')]);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  useUnsaved(true, JSON.stringify({ lab, date, notes, rows: rows.map(({ key, statusTouched, ...r }) => r) }));

  const update = (key, patch) => setRows((list) => list.map((r) => {
    if (r.key !== key) return r;
    const next = { ...r, ...patch };
    if ('status' in patch) next.statusTouched = true;
    else if (!next.statusTouched) next.status = suggestStatus(next) || next.status;
    return next;
  }));
  const addRow = () => setRows((list) => [...list, emptyRow()]);
  const removeRow = (key) => setRows((list) => (list.length > 1 ? list.filter((r) => r.key !== key) : list));

  // Lignes entièrement vides ignorées ; une ligne commencée doit avoir un nom et une valeur.
  const filled = rows.filter((r) => [r.name, r.value, r.unit, r.refMin, r.refMax].some((v) => v.trim()));
  const rowError = (r) => {
    if (!filled.includes(r)) return null;
    if (!r.name.trim()) return 'Indiquez le nom de l’analyse.';
    if (!r.value.trim()) return `Indiquez la valeur${r.name.trim() ? ` de « ${r.name.trim()} »` : ''}.`;
    return null;
  };
  const errors = {
    lab: lab.trim().length < 2 ? 'Indiquez le laboratoire (2 caractères au moins).' : null,
    rows: filled.length === 0 ? 'Ajoutez au moins une analyse avec sa valeur.' : null,
  };
  const invalid = errors.lab || errors.rows || filled.some(rowError);

  const save = async () => {
    setTried(true);
    if (busy || invalid) return;
    setBusy(true);
    try {
      const items = filled.map((r) => ({
        name: r.name.trim(), value: r.value.trim(), status: r.status,
        ...(r.unit.trim() && { unit: r.unit.trim() }),
        ...(r.refMin.trim() && { refMin: r.refMin.trim() }),
        ...(r.refMax.trim() && { refMax: r.refMax.trim() }),
      }));
      await doctorApi.recordLabResult(request.id, { laboratoryName: lab.trim(), performedAt: new Date(`${date}T00:00:00Z`).toISOString(), items, ...(notes.trim() && { notes: notes.trim() }) });
      notify('Résultat enregistré.');
      onDone();
    } catch (e) { notify(e.message, 'error'); }
    finally { setBusy(false); }
  };

  const field = `mt-1 w-full h-11 px-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-400 ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200'}`;
  const bad = '!border-red-400';
  const label = `block text-xs font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-600'}`;
  const hint = sub || 'text-slate-500';
  const STATUS_TONE = { normal: 'text-emerald-700', high: 'text-amber-700', low: 'text-amber-700', critical: 'text-red-700' };

  return (
    <section className={`p-5 sm:p-6 rounded-2xl border space-y-5 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-red-100'}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold">Saisir le résultat : {request.title}</h3>
          <p className={`text-sm mt-0.5 ${hint}`}>Recopiez les valeurs du compte rendu reçu du laboratoire.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Fermer" className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}><X className="w-5 h-5" /></button>
      </div>

      <div className="grid sm:grid-cols-[1fr_12rem] gap-4">
        <label className={label}>Laboratoire
          <input className={`${field} ${tried && errors.lab ? bad : ''}`} value={lab} onChange={(e) => setLab(e.target.value)} placeholder="Ex. : Laboratoire Pasteur, Cocody" />
          {tried && errors.lab && <span className="block mt-1 text-xs font-normal text-red-600">{errors.lab}</span>}
        </label>
        <label className={label}>Date de réalisation
          <input type="date" className={field} value={date} max={today} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold">Analyses</p>
        {rows.map((r, i) => {
          const err = tried ? rowError(r) : null;
          const suggested = suggestStatus(r);
          return (
            <div key={r.key} className={`rounded-xl border p-3 sm:p-4 ${err ? 'border-red-300' : darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <div className="grid grid-cols-2 sm:grid-cols-12 gap-3">
                <label className={`${label} col-span-2 sm:col-span-4`}>Analyse
                  <input className={`${field} ${err && !r.name.trim() ? bad : ''}`} value={r.name} onChange={(e) => update(r.key, { name: e.target.value })} placeholder="Ex. : Glycémie à jeun" />
                </label>
                <label className={`${label} sm:col-span-2`}>Valeur
                  <input className={`${field} ${err && r.name.trim() && !r.value.trim() ? bad : ''}`} value={r.value} onChange={(e) => update(r.key, { value: e.target.value })} inputMode="decimal" placeholder="0,95" />
                </label>
                <label className={`${label} sm:col-span-2`}>Unité
                  <input className={field} value={r.unit} onChange={(e) => update(r.key, { unit: e.target.value })} placeholder="g/L" />
                </label>
                <div className={`${label} col-span-2 sm:col-span-4`}>Valeurs de référence <span className="font-normal">(facultatif)</span>
                  <div className="flex items-center gap-2">
                    <input aria-label={`Référence minimale, analyse ${i + 1}`} className={field} value={r.refMin} onChange={(e) => update(r.key, { refMin: e.target.value })} inputMode="decimal" placeholder="min" />
                    <span className="mt-1">–</span>
                    <input aria-label={`Référence maximale, analyse ${i + 1}`} className={field} value={r.refMax} onChange={(e) => update(r.key, { refMax: e.target.value })} inputMode="decimal" placeholder="max" />
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`text-xs font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Interprétation :</span>
                <div role="radiogroup" aria-label={`Interprétation, analyse ${i + 1}`} className="flex flex-wrap gap-1.5">
                  {LAB_STATUS.map((s) => (
                    <button key={s.id} type="button" role="radio" aria-checked={r.status === s.id} onClick={() => update(r.key, { status: s.id })}
                      className={`h-8 px-3 rounded-full text-xs font-semibold border ${r.status === s.id
                        ? (s.id === 'normal' ? 'bg-emerald-600 border-emerald-600 text-white' : s.id === 'critical' ? 'bg-red-600 border-red-600 text-white' : 'bg-amber-500 border-amber-500 text-white')
                        : darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-600'}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
                {suggested && !r.statusTouched && <span className={`text-xs ${STATUS_TONE[suggested]}`}>proposé d’après les références</span>}
                {rows.length > 1 && (
                  <button type="button" onClick={() => removeRow(r.key)} className={`ml-auto text-xs font-semibold ${darkMode ? 'text-slate-400 hover:text-red-400' : 'text-slate-500 hover:text-red-700'}`}>Retirer</button>
                )}
              </div>
              {err && <p role="alert" className="mt-2 text-xs text-red-600">{err}</p>}
            </div>
          );
        })}
        <button type="button" onClick={addRow} className={`inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-dashed text-sm font-semibold ${darkMode ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : 'border-red-200 text-red-700 hover:bg-red-50'}`}>
          <Plus className="w-4 h-4" /> Ajouter une analyse
        </button>
        {tried && errors.rows && <p role="alert" className="text-xs text-red-600">{errors.rows}</p>}
      </div>

      <label className={label}>Commentaire <span className="font-normal">(facultatif)</span>
        <textarea rows={2} maxLength={2000} className={`${field} h-auto py-2`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Conclusion du laboratoire, conditions du prélèvement…" />
      </label>

      <p className={`text-xs ${hint}`}>L’interprétation est proposée d’après les valeurs de référence ; la validation clinique reste à la charge du médecin.</p>
      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
        <button type="button" onClick={onClose} className={`h-11 px-5 rounded-xl border text-sm font-semibold ${darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-50'}`}>Annuler</button>
        <button type="button" disabled={busy} onClick={save} className="h-11 px-5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50">
          <Save className="w-4 h-4" />{busy ? 'Enregistrement…' : 'Enregistrer le résultat'}
        </button>
      </div>
    </section>
  );
}
