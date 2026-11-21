import HeartLoader from '../../components/HeartLoader.jsx';
import NovaSelect from '../../components/NovaSelect.jsx';
import {useDialogFocus} from '../../components/useDialogFocus.js';
import {useUnsaved} from '../../unsaved.js';
import React, { useState, useEffect, useRef } from 'react';
import { FileDown, Pill, Plus, Printer, Save, Trash2, X } from 'lucide-react';
import { doctorApi } from '../../api/doctorApi.js';
import { formatDate, initials, patientLabel } from '../../utils/format.js';
import { prescriptionIsOpen, prescriptionStatusLabel } from '../../utils/prescriptionStatus.js';
import { validatePrescriptionDraft } from '../../utils/prescriptionValidation.js';
import { confirmDialog, promptDialog } from '../../components/dialogs.jsx';

function parseScheduleTimes(value) {
  if (!value.trim()) return [];
  const times = value.trim().split(/\s*(?:[,;]|\bet\b)\s*/i).map(part => {
    const match = part.match(/^(\d{1,2})(?:\s*h\s*(\d{2})?|:(\d{2}))?$/i);
    if (!match) return null;
    const [, hour, hourMinutes, colonMinutes] = match;
    const minutes = hourMinutes ?? colonMinutes ?? '00';
    if (Number(hour) > 23 || Number(minutes) > 59) return null;
    return `${hour.padStart(2, '0')}:${minutes}`;
  });
  return times.includes(null) || times.length > 12 ? null : [...new Set(times)].sort();
}

export default function DPrescriptions({ data, loading, onReload, patientsData, loadPatients, notify, card, sub, border, darkMode }) {
  const [showForm,    setShowForm]    = useState(false);
  const [form,        setForm]        = useState({ patientId: '', consultationId:'',notes: '', validDays: 30 });
  const [items,       setItems]       = useState([{ name: '', dosage: '', frequency: '', duration: '', quantityPrescribed: '', quantityUnit: 'unité',scheduleTimes:'',durationDays:'' }]);
  const [saving,      setSaving]      = useState(false);
  const [consultations,setConsultations]=useState([]);
  useEffect(()=>{if(showForm)doctorApi.consultations().then(setConsultations).catch(e=>notify(e.message,'error'));},[showForm]);
  const [detail,      setDetail]      = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailBusy, setDetailBusy] = useState(false);

  useUnsaved(showForm,JSON.stringify({form,items}));
  const prescriptions = Array.isArray(data) ? data : [];
  const patients      = Array.isArray(patientsData) ? patientsData : [];

  const handleShowForm = () => { setShowForm(true); if (!patientsData) loadPatients(); };
  const addItem    = () => setItems(prev => [...prev, { name: '', dosage: '', frequency: '', duration: '', quantityPrescribed: '', quantityUnit: 'unité',scheduleTimes:'',durationDays:'' }]);
  const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i, field, val) => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it));

  const handleSubmit = async () => {
    if (saving) return;
    const validation = validatePrescriptionDraft(form, items);
    if (validation) return notify(validation, 'error');
    const prescriptionItems = [];
    for (const [index, item] of items.entries()) {
      if (!item.name) continue;
      const scheduleTimes = parseScheduleTimes(item.scheduleTimes);
      if (!scheduleTimes) {
        document.getElementById(`rx-${index}-scheduleTimes`)?.focus();
        return notify(`Médicament ${index + 1} : saisissez jusqu’à 12 heures valides, par exemple « 8h, 14 et 20h ».`, 'error');
      }
      const durationDays = item.durationDays ? Number(item.durationDays) : undefined;
      if ((scheduleTimes.length || durationDays !== undefined) && (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 365)) {
        document.getElementById(`rx-${index}-durationDays`)?.focus();
        return notify(`Médicament ${index + 1} : indiquez une durée de pilulier entre 1 et 365 jours.`, 'error');
      }
      prescriptionItems.push({ ...item, name: item.name.trim(), quantityUnit: item.quantityUnit.trim(), dosage: item.dosage?.trim() || undefined, frequency: item.frequency?.trim() || undefined, duration: item.duration?.trim() || undefined, instructions: item.instructions?.trim() || undefined, quantityPrescribed: Number(item.quantityPrescribed), scheduleTimes, durationDays });
    }
    setSaving(true);
    try {
      const patient = patients.find(p => p.id === form.patientId);
      if (!(await confirmDialog({
        title: 'Valider et émettre l’ordonnance ?',
        message: <span className="block whitespace-pre-line max-h-[50vh] overflow-y-auto">{`${patient ? patientLabel(patient) : form.patientId}\nValidité : ${Number(form.validDays)} jours.\n${prescriptionItems.map(i => `${i.name} — ${[i.dosage, i.frequency, i.duration].filter(Boolean).join(' · ') || 'Posologie non renseignée'} — ${i.quantityPrescribed} ${i.quantityUnit}${i.instructions?.trim() ? ` · ${i.instructions.trim()}` : ''}`).join('\n')}\nVérifiez le patient, les posologies et les quantités. Après émission, une correction nécessite une annulation motivée et une nouvelle ordonnance.`}</span>,
        confirmLabel: 'Valider et émettre', cancelLabel: 'Revenir à la saisie',
      }))) return;
      await doctorApi.createPrescription({ ...form, consultationId: form.consultationId || undefined, items: prescriptionItems, validDays: Number(form.validDays) });
      notify('Ordonnance émise');
      setShowForm(false);
      setForm({ patientId: '', consultationId: '', notes: '', validDays: 30 });
      setItems([{ name: '', dosage: '', frequency: '', duration: '', quantityPrescribed: '', quantityUnit: 'unité',scheduleTimes:'',durationDays:'' }]);
      onReload();
    } catch (e) { notify(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const openDetail = async (rx) => {
    setDetailLoading(true);
    try { setDetail(await doctorApi.prescription(rx.id)); }
    catch (e) { notify(e.message, 'error'); }
    finally { setDetailLoading(false); }
  };

  const cancelPrescription = async (rx) => {
    if (detailBusy || !prescriptionIsOpen(rx.status)) return;
    setDetailBusy(true);
    try {
      const reason = await promptDialog({ title: 'Motif d’annulation', label: 'Motif obligatoire', message: 'L’ordonnance et les délivrances déjà enregistrées seront conservées.', required: true, validate: value => value.trim().length < 5 ? 'Saisissez un motif d’au moins 5 caractères.' : undefined, multiline: true, maxLength: 1000, confirmLabel: 'Continuer' });
      if (reason == null) return;
      if (reason.trim().length < 5 || reason.trim().length > 1000) return notify('Le motif doit contenir entre 5 et 1 000 caractères.', 'error');
      if (!(await confirmDialog({ title: 'Annuler cette ordonnance ?', message: `Ordonnance ${rx.id} — ${rx.patientName}. Motif : ${reason.trim()}. Elle ne pourra plus être délivrée. Les quantités déjà délivrées restent enregistrées.`, danger: true, confirmLabel: 'Annuler l’ordonnance', cancelLabel: 'Conserver' }))) return;
      await doctorApi.cancelPrescription(rx.id, reason.trim());
      // Retain the issued document immediately, even if the detail refresh fails.
      setDetail({ ...rx, status: 'cancelled', cancellation: { reason: reason.trim(), createdAt: null } });
      notify('Ordonnance annulée. L’original est conservé.');
      onReload();
      try { setDetail(await doctorApi.prescription(rx.id)); }
      catch { notify('Annulation enregistrée ; rechargez le détail pour consulter son horodatage.', 'error'); }
    } catch (e) { notify(e.message || 'Annulation impossible.', 'error'); }
    finally { setDetailBusy(false); }
  };

  const copyAsDraft = async (rx) => {
    if (detailBusy || saving) return;
    setDetailBusy(true);
    try {
      if (showForm && !(await confirmDialog({ title: 'Remplacer le brouillon en cours ?', message: 'Le formulaire sera remplacé par une copie de cette ordonnance.', confirmLabel: 'Copier dans un nouveau brouillon' }))) return;
      setForm({ patientId: rx.patientId || '', consultationId: '', validDays: 30, notes: `Nouvelle prescription à partir de l’ordonnance ${rx.id} du ${formatDate(rx.issuedAt)}.${rx.notes ? `\n${rx.notes}` : ''}` });
      setItems((rx.items || []).map(item => ({ name: item.name || '', dosage: item.dosage || '', frequency: item.frequency || '', duration: item.duration || '', instructions: item.instructions || '', quantityPrescribed: item.quantityPrescribed ?? '', quantityUnit: item.quantityUnit || 'unité', scheduleTimes: '', durationDays: '' })));
      setShowForm(true);
      setDetail(null);
      if (!patientsData) loadPatients();
      notify('Nouveau brouillon créé. Vérifiez les quantités déjà délivrées, le patient et la posologie avant émission. Aucun pilulier n’a été recopié.');
    } finally { setDetailBusy(false); }
  };

  const inp = `mt-1 w-full px-3 py-2 rounded-xl border text-sm outline-none ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="text-2xl font-bold">Ordonnances</h2><p className={`text-sm ${sub}`}>{prescriptions.length} émises</p></div>
        <button onClick={handleShowForm}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 shadow-lg shadow-red-600/20">
          <Plus className="w-4 h-4" /> Nouvelle ordonnance
        </button>
      </div>

      {detail && <PrescriptionDetail rx={detail} onClose={() => { if (!detailBusy) setDetail(null); }} onCancel={cancelPrescription} onCopy={copyAsDraft} busy={detailBusy} card={card} sub={sub} border={border} darkMode={darkMode} />}
      {detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className={`${card} border rounded-2xl p-8`}>
            <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      )}

      {showForm && (
        <div className={`${card} border rounded-2xl p-5 space-y-4`}>
          <div className="flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2"><FileDown className="w-4 h-4 text-red-600" /> Nouvelle ordonnance</h3>
            <button onClick={() => setShowForm(false)}><X className={`w-4 h-4 ${sub}`} /></button>
          </div>
          <div>
            <label htmlFor="rx-patient" className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Patient *</label>
            <NovaSelect darkMode={darkMode} id="rx-patient" value={form.patientId} onChange={e => setForm(f => ({ ...f, patientId: e.target.value,consultationId:'' }))} className={inp}>
              <option value="">Sélectionner un patient...</option>
              {patients.map(p => <option key={p.id} value={p.id}>{patientLabel(p)}</option>)}
            </NovaSelect>
          </div>
          <label className="block text-sm">Consultation validée associée (facultatif)<NovaSelect darkMode={darkMode} className={inp} value={form.consultationId||''} onChange={e=>setForm({...form,consultationId:e.target.value})}><option value="">Prescription indépendante</option>{consultations.filter(c=>c.patientId===form.patientId&&c.status==='completed').map(c=><option key={c.id} value={c.id}>{formatDate(c.startedAt)} — {c.motif||'Consultation'}</option>)}</NovaSelect></label>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Médicaments *</label>
              <button onClick={addItem} className="flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700">
                <Plus className="w-3.5 h-3.5" /> Ajouter
              </button>
            </div>
            <div className="space-y-3">
              {items.map((item, i) => (
                <div key={i} className={`p-3 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-xs font-bold text-red-600">Médicament {i + 1}</p>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(i)} className="ml-auto text-slate-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[['Nom *', 'name', 'Ex: Paracétamol 500mg'], ['Posologie', 'dosage', 'Ex: 1 cp'], ['Fréquence', 'frequency', 'Ex: 3×/jour'], ['Durée', 'duration', 'Ex: 7 jours'], ['Instructions', 'instructions', 'Ex: pendant le repas'], ['Quantité à délivrer *', 'quantityPrescribed', 'Ex: 30'], ['Unité', 'quantityUnit', 'comprimé, flacon…'],['Heures de prise (facultatif)', 'scheduleTimes', '08:00, 20:00'],['Durée du pilulier en jours', 'durationDays', '7']].map(([lbl, fld, ph]) => (
                      <div key={fld}>
                        <label htmlFor={`rx-${i}-${fld}`} className={`text-[10px] font-bold uppercase ${sub}`}>{lbl}</label>
                        <input id={`rx-${i}-${fld}`} value={item[fld] ?? ''} onChange={e => updateItem(i, fld, e.target.value)}
                          placeholder={fld === 'scheduleTimes' ? '8h, 14 et 20h' : ph} className={inp}
                          aria-describedby={fld === 'scheduleTimes' ? `rx-${i}-schedule-help` : undefined}
                          inputMode={fld === 'durationDays' ? 'numeric' : undefined} />
                        {fld === 'scheduleTimes' && (
                          <p id={`rx-${i}-schedule-help`} className={`mt-1 text-xs ${sub}`}>
                            Exemples : 8h, 14 et 20h ou 08:30, 20:00.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Validité (jours)</label>
              <input type="number" value={form.validDays} onChange={e => setForm(f => ({ ...f, validDays: e.target.value }))} min="1" max="365" className={inp} />
            </div>
            <div>
              <label className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Notes</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Instructions..." className={inp} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowForm(false)} className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold ${darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'}`}>Annuler</button>
            <button onClick={handleSubmit} disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />...</> : <><Save className="w-4 h-4" />Émettre</>}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3"><HeartLoader darkMode={darkMode} compact /></div>
      ) : prescriptions.length === 0 ? (
        <div className={`${card} border rounded-2xl p-10 flex flex-col items-center gap-2`}>
          <FileDown className={`w-10 h-10 ${sub}`} />
          <p className={`text-sm ${sub}`}>Aucune ordonnance émise</p>
        </div>
      ) : prescriptions.map(rx => (
        <div key={rx.id} className={`${card} border rounded-2xl p-4 flex items-center gap-4`}>
          <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <FileDown className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold truncate">{rx.patientName}</p>
            <p className={`text-xs ${sub}`}>{rx.cmuNumber}</p>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${prescriptionIsOpen(rx.status) ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                {prescriptionStatusLabel(rx.status)}
              </span>
              <p className={`text-xs ${sub}`}>{new Date(rx.issuedAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' })}</p>
              <p className={`text-xs ${sub}`}>{rx.itemsCount} médicament{rx.itemsCount > 1 ? 's' : ''}</p>
            </div>
          </div>
          <button onClick={() => openDetail(rx)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 flex-shrink-0 ${darkMode ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-100'}`}>
            <Printer className="w-3 h-3" /> Voir / Imprimer
          </button>
        </div>
      ))}
    </div>
  );
}

function PrescriptionDetail({ rx, onClose, onCancel, onCopy, busy, card, sub, border, darkMode }) {
  const dialogRef=useRef(null);useDialogFocus(!busy,dialogRef,onClose);
  const rxItems = Array.isArray(rx.items) ? rx.items : [];

  const handlePrint = () => {
    const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const win = window.open('', '_blank');
    if(!win)return;
    win.document.write(`<!DOCTYPE html><html><head><title>Ordonnance — ${escape(rx.patientName)}</title>
<style>
  body{font-family:Arial,sans-serif;padding:40px;max-width:680px;margin:0 auto;color:#1e293b}
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #dc2626;padding-bottom:16px;margin-bottom:24px}
  .doc-name{font-weight:bold;font-size:17px}.doc-spec{color:#64748b;font-size:13px;margin-top:2px}
  .rx-title{font-size:22px;font-weight:800;color:#dc2626;letter-spacing:1px}
  .date{color:#64748b;font-size:12px;margin-top:4px;text-align:right}
  .patient{background:#f8fafc;border-radius:8px;padding:10px 14px;margin-bottom:20px}
  table{width:100%;border-collapse:collapse;margin-top:4px}
  th{text-align:left;font-size:10px;text-transform:uppercase;color:#94a3b8;padding:6px 8px;border-bottom:2px solid #e2e8f0;letter-spacing:.5px}
  td{padding:10px 8px;border-bottom:1px solid #f1f5f9;font-size:13px}
  tr:last-child td{border-bottom:none} tr{break-inside:avoid} td{overflow-wrap:anywhere} thead{display:table-header-group}
  .notes{margin-top:18px;padding:12px;background:#fefce8;border-radius:8px;font-size:12px;color:#713f12}
  .footer{margin-top:48px;display:flex;justify-content:space-between;font-size:11px;color:#94a3b8}
  .sig{text-align:right;width:160px;border-top:1px solid #334155;padding-top:4px;font-size:11px;color:#475569}
  @media print{button{display:none}}
</style></head><body>
<div class="hdr">
  <div><div class="doc-name">${escape(rx.doctorName)}</div><div class="doc-spec">${escape(rx.doctorSpecialty || '')}</div></div>
  <div><div class="rx-title">ORDONNANCE</div><div class="date">${new Date(rx.issuedAt).toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'})}</div></div>
</div>
<p style="font-size:12px">Référence : ${escape(rx.id)} · Statut : ${escape(prescriptionStatusLabel(rx.status))}</p>
${rx.status === 'cancelled' ? `<p style="border:2px solid #dc2626;padding:12px"><strong>Ordonnance annulée — ne plus délivrer</strong><br>Motif : ${escape(rx.cancellation?.reason || 'Non renseigné')}<br>Annulée le : ${escape(rx.cancellation?.createdAt ? new Date(rx.cancellation.createdAt).toLocaleString('fr-FR') : 'Horodatage à recharger')}</p>` : ''}
<div class="patient"><strong>${escape(rx.patientName)}</strong><span style="color:#64748b;margin-left:10px;font-size:12px">CMU: ${escape(rx.cmuNumber)}</span></div>
<table>
  <thead><tr><th>Médicament</th><th>Posologie</th><th>Fréquence</th><th>Durée</th><th>Prescrit / délivré / restant</th></tr></thead>
  <tbody>${rxItems.map(i => `<tr><td><strong>${escape(i.name)}</strong>${i.instructions ? `<br><span style="font-size:11px;color:#64748b">${escape(i.instructions)}</span>` : ''}</td><td>${escape(i.dosage || '—')}</td><td>${escape(i.frequency || '—')}</td><td>${escape(i.duration || '—')}</td><td>${escape(i.quantityPrescribed??'—')} / ${escape(i.quantityDispensed??'—')} / ${escape(i.remaining??'—')} ${escape(i.quantityUnit)}</td></tr>`).join('')}</tbody>
</table>
${rx.notes ? `<div class="notes">📝 ${escape(rx.notes)}</div>` : ''}
${rx.validUntil ? `<p style="margin-top:14px;font-size:11px;color:#64748b">Valable jusqu'au : <strong>${new Date(rx.validUntil).toLocaleDateString('fr-FR')}</strong></p>` : ''}
<div class="footer"><span>NOVA — Carnet Santé Numérique</span><span>Émise le ${escape(formatDate(rx.issuedAt))}</span></div>
<script>window.onload=()=>window.print()</script>
</body></html>`);
    win.document.close();
  };

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Ordonnance" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className={`${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col`}>
        <div className={`p-5 border-b ${border} flex items-center justify-between`}>
          <div>
            <h3 className="font-bold text-lg">Ordonnance</h3>
            <p className={`text-xs ${sub}`}>{rx.patientName} • {new Date(rx.issuedAt).toLocaleDateString('fr-FR')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button disabled={busy} onClick={handlePrint} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-50">
              <Printer className="w-3.5 h-3.5" /> Imprimer
            </button>
            <button disabled={busy} onClick={onClose} aria-label="Fermer l’ordonnance"><X className={`w-5 h-5 ${sub}`} /></button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {rx.status === 'cancelled' && <div className="rounded-xl border border-red-300 p-3 text-sm"><p className="font-bold">Ordonnance annulée — document conservé en lecture seule</p><p>Motif : {rx.cancellation?.reason || 'Non renseigné'}</p><p>Annulée le : {rx.cancellation?.createdAt ? new Date(rx.cancellation.createdAt).toLocaleString('fr-FR') : 'Horodatage à recharger'}</p></div>}
          <div className={`rounded-xl p-3 ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
            <p className={`text-[10px] font-bold uppercase ${sub}`}>Patient</p>
            <p className="font-bold">{rx.patientName}</p>
            <p className={`text-xs ${sub}`}>CMU: {rx.cmuNumber}</p><p className={`text-xs break-all ${sub}`}>Référence : {rx.id}</p><p className={`text-xs ${sub}`}>Statut : {prescriptionStatusLabel(rx.status)}</p>
          </div>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wide ${sub} mb-2`}>Médicaments ({rxItems.length})</p>
            <div className="space-y-2">
              {rxItems.map((item, i) => (
                <div key={i} className={`p-3 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <p className="font-bold text-sm">{item.name}</p><p className={`text-xs ${sub}`}>Prescrit / délivré / restant : {item.quantityPrescribed ?? "—"} / {item.quantityDispensed ?? "—"} / {item.remaining ?? "—"} {item.quantityUnit}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                    {item.dosage    && <p className={`text-xs ${sub}`}>Dose: <strong>{item.dosage}</strong></p>}
                    {item.frequency && <p className={`text-xs ${sub}`}>Fréq: <strong>{item.frequency}</strong></p>}
                    {item.duration  && <p className={`text-xs ${sub}`}>Durée: <strong>{item.duration}</strong></p>}
                  </div>
                  {item.instructions && <p className="text-xs text-red-600 mt-1">{item.instructions}</p>}
                </div>
              ))}
            </div>
          </div>
          {rx.notes && (
            <div>
              <p className={`text-xs font-bold uppercase tracking-wide ${sub} mb-1`}>Notes</p>
              <p className={`text-sm ${sub}`}>{rx.notes}</p>
            </div>
          )}
          <div className={`flex items-center justify-between text-xs ${sub}`}>
            <span>Émise le {new Date(rx.issuedAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' })}</span>
            {rx.validUntil && <span>Valide jusqu'au {new Date(rx.validUntil).toLocaleDateString('fr-FR')}</span>}
          </div>
          <div className={`border-t pt-3 space-y-2 ${border}`}>
            <p className={`text-xs ${sub}`}>Toute correction est émise comme une nouvelle ordonnance. Vérifiez les délivrances déjà effectuées ; copier ne clôt pas l’original.</p>
            <div className="flex flex-wrap gap-2">
              <button disabled={busy} onClick={() => onCopy(rx)} className="px-3 py-2 rounded-lg border text-sm font-semibold disabled:opacity-50">Copier en nouvelle ordonnance</button>
              {prescriptionIsOpen(rx.status) && <button disabled={busy} onClick={() => onCancel(rx)} className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-50">Annuler avec motif</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   DEMANDES D'ANALYSES
   ════════════════════════════════════════════════════════════════ */
