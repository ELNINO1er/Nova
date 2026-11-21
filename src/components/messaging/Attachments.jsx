import HeartLoader from '../HeartLoader.jsx';
import React, { useEffect, useState } from 'react';
import { ClipboardList, Download, FileText, FlaskConical, HeartPulse, Pill, X } from 'lucide-react';

// Pièces jointes de la messagerie : éléments du dossier du patient (ordonnance, analyse, document, résumé médical).
export const ATTACHMENT_META = {
  prescription: { label: 'Ordonnances', Icon: Pill },
  lab_result: { label: 'Analyses', Icon: FlaskConical },
  document: { label: 'Documents', Icon: FileText },
  medical_summary: { label: 'Résumé médical', Icon: HeartPulse },
};
const ORDER = ['prescription', 'lab_result', 'document', 'medical_summary'];
const MIME_LABELS = { 'application/pdf': 'PDF', 'image/jpeg': 'Image (JPEG)', 'image/png': 'Image (PNG)', 'image/webp': 'Image (WebP)' };
const fmtDate = (v) => { if (!v) return ''; const d = new Date(v); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR'); };

function Modal({ title, onClose, darkMode, children, footer }) {
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/60" role="presentation" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        className={`w-full sm:max-w-lg max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl shadow-2xl ${darkMode ? 'bg-slate-900 text-slate-100 border border-slate-800' : 'bg-white text-slate-900'}`}>
        <div className={`flex items-center gap-3 px-5 py-4 border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
          <h2 className="flex-1 font-bold text-base truncate">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className={`px-5 py-3 border-t ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>{footer}</div>}
      </div>
    </div>
  );
}

/** Choix d'un élément du dossier à joindre au message. */
export function AttachmentPicker({ load, onPick, onClose, darkMode }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('prescription');
  useEffect(() => { load().then(setData).catch((e) => setError(e.message || 'Dossier indisponible.')); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const items = data?.[tab] || [];
  return (
    <Modal title="Joindre un élément du dossier" onClose={onClose} darkMode={darkMode}>
      <div className="flex flex-wrap gap-2 mb-4" role="tablist">
        {ORDER.map((t) => {
          const { label, Icon } = ATTACHMENT_META[t];
          const active = t === tab;
          return (
            <button key={t} type="button" role="tab" aria-selected={active} onClick={() => setTab(t)}
              className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-semibold border ${active ? 'bg-red-600 text-white border-red-600' : darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <Icon className="w-4 h-4" />{label}{data && t !== 'medical_summary' ? ` (${data[t]?.length || 0})` : ''}
            </button>
          );
        })}
      </div>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p>
        : !data ? <HeartLoader darkMode={darkMode} compact />
        : items.length === 0 ? <p className="text-sm text-slate-500 py-6 text-center">Aucun élément dans cette rubrique.</p>
        : (
          <ul className="space-y-2">
            {items.map((it) => (
              <li key={`${it.type}-${it.id}`}>
                <button type="button" onClick={() => onPick(it)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left ${darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-red-50'}`}>
                  <AttachmentIcon type={it.type} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold truncate">{it.title}</span>
                    <span className="block text-xs text-slate-500 truncate">{[it.subtitle, fmtDate(it.date)].filter(Boolean).join(' · ')}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      <p className="text-xs text-slate-500 mt-4">L’élément reste dans le dossier : seul un lien est envoyé, visible par les deux participants de la conversation.</p>
    </Modal>
  );
}

export function AttachmentIcon({ type, inverted = false }) {
  const Icon = ATTACHMENT_META[type]?.Icon || ClipboardList;
  return <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${inverted ? 'bg-white/20 text-white' : 'bg-red-50 text-red-600'}`}><Icon className="w-4 h-4" /></span>;
}

/** Carte affichée dans la bulle du message. */
export function AttachmentCard({ attachment, mine, onOpen }) {
  const { title, subtitle, date, missing, type } = attachment;
  return (
    <button type="button" onClick={missing ? undefined : onOpen} disabled={missing}
      className={`mt-1 w-full min-w-[14rem] flex items-center gap-3 p-2.5 rounded-2xl text-left ${mine ? 'bg-red-700/60 hover:bg-red-700' : 'bg-red-50/70 hover:bg-red-50 text-slate-800'} disabled:opacity-60`}>
      <AttachmentIcon type={type} inverted={mine} />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold truncate">{title}</span>
        <span className={`block text-xs truncate ${mine ? 'text-red-100' : 'text-slate-500'}`}>{missing ? 'Cet élément n’est plus disponible.' : [subtitle, fmtDate(date)].filter(Boolean).join(' · ')}</span>
      </span>
      {!missing && <span className={`text-xs font-semibold shrink-0 ${mine ? 'text-white' : 'text-red-700'}`}>Ouvrir</span>}
    </button>
  );
}

const Row = ({ label, value }) => value ? <p className="text-sm"><span className="text-slate-500">{label} : </span>{value}</p> : null;
const List = ({ title, items }) => (
  <div className="mt-3">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
    {items?.length ? <ul className="mt-1 list-disc pl-5 text-sm space-y-0.5">{items.map((x, i) => <li key={i}>{typeof x === 'string' ? x : JSON.stringify(x)}</li>)}</ul>
      : <p className="text-sm text-slate-500 mt-1">Rien de renseigné.</p>}
  </div>
);
const LAB_TONE = { normal: 'text-emerald-700', high: 'text-red-700', low: 'text-amber-700', critical: 'text-red-700 font-bold' };

/** Contenu d'une pièce jointe, relu dans le dossier à l'ouverture. */
export function AttachmentViewer({ load, loadFile, onClose, darkMode }) {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  useEffect(() => { load().then(setD).catch((e) => setError(e.message || 'Pièce jointe indisponible.')); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const download = async () => {
    setDownloading(true);
    try {
      const blob = await loadFile();
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), { href: url, download: d.title || 'document' });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) { setError(e.message || 'Téléchargement impossible.'); }
    finally { setDownloading(false); }
  };
  const title = !d ? 'Pièce jointe' : d.type === 'prescription' ? 'Ordonnance' : d.type === 'medical_summary' ? 'Résumé médical' : d.title;
  return (
    <Modal title={title} onClose={onClose} darkMode={darkMode}
      footer={d?.type === 'document' && d.downloadable && (
        <button type="button" onClick={download} disabled={downloading} className="w-full h-11 rounded-xl bg-red-600 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50">
          <Download className="w-4 h-4" />{downloading ? 'Téléchargement…' : 'Télécharger le document'}
        </button>
      )}>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {!d && !error && <HeartLoader darkMode={darkMode} compact />}
      {d?.type === 'prescription' && (
        <div className="space-y-1">
          <Row label="Prescripteur" value={[d.doctorName, d.doctorSpecialty].filter(Boolean).join(' · ')} />
          <Row label="Émise le" value={fmtDate(d.issuedAt)} />
          <Row label="Valable jusqu’au" value={fmtDate(d.validUntil)} />
          <ul className="mt-3 space-y-2">
            {d.items.map((it, i) => (
              <li key={i} className={`p-3 rounded-xl border ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <p className="text-sm font-semibold">{it.name} {it.dosage && <span className="font-normal text-slate-500">· {it.dosage}</span>}</p>
                <p className="text-xs text-slate-500">{[it.frequency, it.duration].filter(Boolean).join(' · ')}</p>
                {it.instructions && <p className="text-xs mt-1">{it.instructions}</p>}
              </li>
            ))}
          </ul>
          {d.notes && <p className="text-sm mt-3">{d.notes}</p>}
        </div>
      )}
      {d?.type === 'lab_result' && (
        <div className="space-y-1">
          <Row label="Laboratoire" value={d.labName} />
          <Row label="Prescrit par" value={d.orderedBy} />
          <Row label="Réalisé le" value={fmtDate(d.performedAt)} />
          <table className="w-full mt-3 text-sm">
            <thead><tr className="text-left text-xs text-slate-500"><th className="py-1">Analyse</th><th>Valeur</th><th>Référence</th></tr></thead>
            <tbody>
              {d.items.map((it, i) => (
                <tr key={i} className={`border-t ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                  <td className="py-1.5 pr-2">{it.name}</td>
                  <td className={`pr-2 ${LAB_TONE[it.status] || ''}`}>{it.value} {it.unit}</td>
                  <td className="text-xs text-slate-500">{[it.refMin, it.refMax].filter((x) => x !== null && x !== undefined && x !== '').join(' – ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {d.notes && <p className="text-sm mt-3">{d.notes}</p>}
        </div>
      )}
      {d?.type === 'document' && (
        <div className="space-y-1">
          <Row label="Ajouté le" value={fmtDate(d.createdAt)} />
          <Row label="Format" value={MIME_LABELS[d.mimeType] || (d.mimeType ? 'Fichier' : null)} />
          {!d.downloadable && <p className="text-sm text-slate-500 mt-2">Aucun fichier n’est associé à ce document.</p>}
        </div>
      )}
      {d?.type === 'medical_summary' && (
        <div>
          <List title="Allergies" items={d.allergies} />
          <List title="Maladies chroniques" items={d.chronicDiseases} />
          <List title="Antécédents chirurgicaux" items={d.surgicalHistory} />
          <List title="Antécédents familiaux" items={d.familyHistory} />
          <List title="Traitements" items={d.treatments.map((t) => `${t.diagnosis}${t.medications.length ? ` — ${t.medications.map((m) => [m.name, m.dosage].filter(Boolean).join(' ')).join(', ')}` : ''}`)} />
        </div>
      )}
    </Modal>
  );
}
