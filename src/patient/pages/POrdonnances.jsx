import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, FileText, Printer, QrCode, ShieldCheck } from 'lucide-react';
import { patientApi } from '../../api/patientApi.js';
import {
  Button, EmptyState, Highlight, Label, NoResults, PageHeader, Panel, SearchInput, Segmented, StatusMark,
} from '../../components/patient/ui.jsx';
import { searchableDate, useSearch, useUrlQuery } from '../../utils/search.js';

/*
 * Ordonnances : registre (liste à gauche) + document de l'ordonnance sélectionnée (à droite).
 * Le même document sert à l'impression. Recherche liée à l'URL (?q=) pour la recherche globale.
 */
const STATUS = {
  active: ['Active', 'watch'],
  partial: ['Délivrance partielle', 'watch'],
  dispensed: ['Délivrée', 'neutral'],
  expired: ['Expirée', 'neutral'],
  cancelled: ['Annulée', 'neutral'],
};

const FIELDS = (p) => [
  (p.items || []).map((it) => it.name).join(' '),
  p.doctorName,
  p.doctorSpecialty,
  (p.items || []).map((it) => [it.dosage, it.frequency, it.duration, it.instructions].filter(Boolean).join(' ')).join(' '),
  (STATUS[p.status] || [p.status])[0],
  p.notes,
  searchableDate(p.issuedAt),
  searchableDate(p.validUntil),
  refOf(p),
];

function refOf(p) { return `ORD-${String(p.id || '').replace(/-/g, '').slice(0, 6).toUpperCase()}`; }
const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString('fr-FR') : '—');
const daysLeft = (validUntil) => (validUntil ? Math.ceil((new Date(validUntil) - Date.now()) / 86400000) : null);
const patientName = () => { try { return JSON.parse(localStorage.getItem('nova_user') || 'null')?.name || ''; } catch { return ''; } };

/* Validité : part écoulée entre l'émission et la date limite. */
function Validity({ p }) {
  const left = daysLeft(p.validUntil);
  if (left == null) return <span className="text-xs text-slate-500">Sans date limite</span>;
  const total = Math.max(1, Math.ceil((new Date(p.validUntil) - new Date(p.issuedAt)) / 86400000));
  const used = Math.min(100, Math.max(0, ((total - Math.max(left, 0)) / total) * 100));
  const soon = left > 0 && left <= 14;
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className={left <= 0 ? 'text-slate-500' : soon ? 'font-semibold text-red-700' : 'text-slate-600'}>
          {left <= 0 ? 'Validité dépassée' : `${left} jour${left > 1 ? 's' : ''} restant${left > 1 ? 's' : ''}`}
        </span>
        <span className="font-mono tabular-nums text-slate-400">{fmt(p.validUntil)}</span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-red-50 overflow-hidden"><div className={`h-full ${soon || left <= 0 ? 'bg-red-600' : 'bg-red-400'}`} style={{ width: `${used}%` }} /></div>
    </div>
  );
}

/* Document d'ordonnance (écran et impression). */
function PrescriptionDocument({ p, query = '', darkMode, print = false }) {
  const [label, tone] = STATUS[p.status] || [p.status, 'neutral'];
  const line = darkMode && !print ? 'border-slate-800' : 'border-slate-200';
  return (
    <article className={`${print ? '' : 'rounded-xl border'} ${line} ${darkMode && !print ? 'bg-slate-900' : 'bg-white'}`}>
      <header className={`flex flex-wrap items-start justify-between gap-3 px-5 py-4 border-b-2 border-red-600`}>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-red-600">NOVA · Carnet santé ivoirien</p>
          <h3 className="text-lg font-bold mt-0.5">Ordonnance médicale</h3>
        </div>
        <div className="text-right">
          <Label>Référence</Label>
          <p className="font-mono text-sm font-semibold">{refOf(p)}</p>
        </div>
      </header>

      <dl className={`grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-3 px-5 py-4 border-b ${line}`}>
        <div className="col-span-2 sm:col-span-1 min-w-0"><Label>Prescripteur</Label><dd className="text-sm font-semibold break-words"><Highlight text={p.doctorName} query={query} /></dd><dd className="text-xs text-slate-500 break-words"><Highlight text={p.doctorSpecialty} query={query} /></dd></div>
        <div className="min-w-0"><Label>Patient</Label><dd className="text-sm break-words">{patientName() || '—'}</dd></div>
        <div className="min-w-0"><Label>Statut</Label><dd className="mt-0.5"><StatusMark tone={tone}>{label}</StatusMark></dd></div>
        <div className="min-w-0"><Label>Émise le</Label><dd className="font-mono text-sm tabular-nums">{fmt(p.issuedAt)}</dd></div>
        <div className="col-span-2 min-w-0"><Label>Validité</Label><div className="mt-1"><Validity p={p} /></div></div>
      </dl>

      <div className="px-5 py-4">
        <Label>Prescription · {p.items.length} ligne{p.items.length > 1 ? 's' : ''}</Label>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`text-left text-[11px] uppercase tracking-wide text-slate-400 border-b ${line}`}>
                <th className="py-2 pr-3 font-semibold w-8">N°</th>
                <th className="py-2 pr-3 font-semibold">Médicament</th>
                <th className="py-2 pr-3 font-semibold">Posologie</th>
                <th className="py-2 pr-3 font-semibold">Durée</th>
                <th className="py-2 font-semibold text-right">Quantité</th>
              </tr>
            </thead>
            <tbody>
              {p.items.map((it, i) => (
                <React.Fragment key={it.id}>
                  <tr className={`align-top ${it.instructions ? '' : `border-b ${line}`}`}>
                    <td className="py-2.5 pr-3 font-mono text-xs text-slate-400 tabular-nums">{String(i + 1).padStart(2, '0')}</td>
                    <td className="py-2.5 pr-3 min-w-[9rem]"><span className="font-semibold"><Highlight text={it.name} query={query} /></span>{it.dosage && <span className="text-slate-500"> · <Highlight text={it.dosage} query={query} /></span>}</td>
                    <td className="py-2.5 pr-3 min-w-[8rem] text-slate-600"><Highlight text={it.frequency || '—'} query={query} /></td>
                    <td className="py-2.5 pr-3 whitespace-nowrap text-slate-600">{it.duration || '—'}</td>
                    <td className="py-2.5 text-right whitespace-nowrap font-mono tabular-nums text-slate-600">{it.quantityPrescribed ?? '—'} {it.quantityPrescribed != null ? it.quantityUnit : ''}</td>
                  </tr>
                  {it.instructions && (
                    <tr className={`border-b ${line}`}><td /><td colSpan={4} className="pb-2.5 text-xs text-red-700"><span className="inline-flex gap-1.5"><AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" /><Highlight text={it.instructions} query={query} /></span></td></tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {p.notes && (
          <div className={`mt-4 border-l-2 border-red-600 pl-3`}>
            <Label>Recommandations</Label>
            <p className="text-sm mt-0.5"><Highlight text={p.notes} query={query} /></p>
          </div>
        )}
      </div>

      <footer className={`flex items-center gap-2 px-5 py-3 border-t text-[11px] text-slate-500 ${line}`}>
        <ShieldCheck className="w-3.5 h-3.5 text-red-600 shrink-0" />
        Ordonnance numérique signée · authenticité vérifiable en pharmacie par QR code
      </footer>
    </article>
  );
}

export default function POrdonnances({ data, sub, darkMode }) {
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [printing, setPrinting] = useState(null);
  const [qrModal, setQrModal] = useState(null);
  const [qrLoading, setQrLoading] = useState('');
  const [qrError, setQrError] = useState('');

  const [query, setQuery] = useUrlQuery();
  const prescriptions = useMemo(() => data ?? [], [data]);
  const results = useSearch(prescriptions, query, FIELDS);
  const filtered = filter === 'all' ? results : results.filter((p) => p.status === filter);
  const count = (s) => results.filter((p) => p.status === s).length;
  const activeCount = prescriptions.filter((p) => p.status === 'active').length;
  const selected = filtered.find((p) => p.id === selectedId) || filtered[0] || null;

  // La sélection suit le premier résultat quand la recherche ou le filtre l'écarte.
  useEffect(() => { if (selectedId && !filtered.some((p) => p.id === selectedId)) setSelectedId(null); }, [filtered, selectedId]);

  const handlePrint = (p) => { setPrinting(p); window.setTimeout(() => { window.print(); setPrinting(null); }, 300); };
  const showQr = async (p) => {
    setQrLoading(p.id); setQrError('');
    try { setQrModal(await patientApi.prescriptionQR(p.id)); }
    catch (e) { setQrError(e.message || 'QR indisponible.'); }
    finally { setQrLoading(''); }
  };

  if (!data) return (
    <div className="space-y-5">
      <PageHeader title="Ordonnances" sub={sub} />
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-5">
        {[0, 1].map((i) => <div key={i} className={`animate-pulse h-72 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-red-50/60'}`} />)}
      </div>
    </div>
  );

  const line = darkMode ? 'border-slate-800' : 'border-slate-100';

  return (
    <div className="space-y-5">
      {printing && <div className="hidden print:block fixed inset-0 bg-white p-8 z-[999]"><div className="max-w-2xl mx-auto"><PrescriptionDocument p={printing} print /></div></div>}

      {qrModal && (
        <>
          <button className="fixed inset-0 z-40 bg-slate-950/50 print:hidden" onClick={() => setQrModal(null)} aria-label="Fermer" />
          <div role="dialog" aria-modal="true" aria-label="QR de l'ordonnance" className={`fixed z-50 left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border p-6 shadow-xl text-center print:hidden ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <Label>À présenter à la pharmacie</Label>
            <p className="font-semibold mt-1 mb-4">QR de l'ordonnance</p>
            <div className="inline-block p-3 rounded-lg border border-red-100 bg-white"><img src={qrModal.qr} alt="QR ordonnance" className="w-48 h-48" /></div>
            <p className="text-xs text-slate-500 mt-3">Jeton signé, sans données médicales lisibles.</p>
            <textarea readOnly value={qrModal.token || ''} aria-label="Jeton de l'ordonnance"
              className={`mt-3 h-16 w-full resize-none rounded-lg border p-2.5 font-mono text-[10px] ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-600'}`} />
            <Button onClick={() => setQrModal(null)} className="mt-4 w-full">Fermer</Button>
          </div>
        </>
      )}

      <div className="print:hidden space-y-4">
        <PageHeader title="Ordonnances" sub={sub}
          subtitle={`Registre des prescriptions · ${prescriptions.length} ordonnance${prescriptions.length > 1 ? 's' : ''}, ${activeCount} active${activeCount > 1 ? 's' : ''}`} />
        {prescriptions.length > 0 && (
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <SearchInput value={query} onChange={setQuery} darkMode={darkMode} count={filtered.length} className="flex-1 min-w-0"
              placeholder="Médicament, médecin, posologie, référence, date…" label="Rechercher dans mes ordonnances" />
            <Segmented darkMode={darkMode} value={filter} onChange={setFilter} label="Filtrer par statut"
              options={[['all', 'Toutes', results.length], ['active', 'Actives', count('active')], ['dispensed', 'Délivrées', count('dispensed')], ['expired', 'Expirées', count('expired')]]} />
          </div>
        )}
        {qrError && <p role="alert" className="text-sm text-red-700">{qrError}</p>}
      </div>

      {filtered.length === 0 ? (
        <div className="print:hidden">
          {query && results.length === 0 ? <NoResults query={query} onClear={() => setQuery('')} darkMode={darkMode} />
            : prescriptions.length === 0 ? <EmptyState Icon={FileText} title="Aucune ordonnance" darkMode={darkMode}>Vos ordonnances apparaîtront ici après vos consultations.</EmptyState>
              : <EmptyState Icon={FileText} title="Aucune ordonnance dans ce filtre" darkMode={darkMode} action={<Button variant="secondary" darkMode={darkMode} onClick={() => setFilter('all')}>Voir toutes</Button>}>Changez de filtre pour retrouver vos autres ordonnances.</EmptyState>}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-5 items-start print:hidden">
          <Panel title="Registre" meta={`${filtered.length}/${prescriptions.length}`} darkMode={darkMode}>
            <ul role="listbox" aria-label="Ordonnances">
              {filtered.map((p) => {
                const isSel = selected?.id === p.id;
                const [label, tone] = STATUS[p.status] || [p.status, 'neutral'];
                const left = daysLeft(p.validUntil);
                return (
                  <li key={p.id} className={`border-b last:border-0 ${line}`}>
                    <button type="button" role="option" aria-selected={isSel} onClick={() => setSelectedId(p.id)}
                      className={`w-full text-left px-4 py-3 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 border-l-2 ${isSel ? `border-l-red-600 ${darkMode ? 'bg-slate-800/60' : 'bg-red-50/70'}` : `border-l-transparent ${darkMode ? 'hover:bg-slate-800/40' : 'hover:bg-red-50/40'}`}`}>
                      <span className="font-semibold text-sm truncate"><Highlight text={(p.items || []).map((i) => i.name).join(', ') || 'Ordonnance'} query={query} /></span>
                      <span className="font-mono text-[11px] text-slate-400 tabular-nums text-right">{refOf(p)}</span>
                      <span className="text-xs text-slate-500 truncate"><Highlight text={p.doctorName} query={query} /> · <span className="font-mono tabular-nums">{fmt(p.issuedAt)}</span></span>
                      <span className="text-right flex flex-col items-end gap-0.5">
                        <StatusMark tone={tone}>{label}</StatusMark>
                        {p.status === 'active' && left != null && left > 0 && left <= 14 && <span className="text-[11px] font-semibold text-red-700">J−{left}</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Panel>

          {selected && (
            <div className="space-y-3 lg:sticky lg:top-20">
              <PrescriptionDocument p={selected} query={query} darkMode={darkMode} />
              <div className="flex flex-wrap gap-2 justify-end">
                <Button variant="secondary" darkMode={darkMode} Icon={Printer} onClick={() => handlePrint(selected)}>Imprimer</Button>
                <Button Icon={QrCode} onClick={() => showQr(selected)} disabled={qrLoading === selected.id}>{qrLoading === selected.id ? 'Génération…' : 'QR pour la pharmacie'}</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
