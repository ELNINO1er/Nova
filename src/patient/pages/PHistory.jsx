import React, { useEffect, useMemo, useState } from 'react';
import { patientApi } from '../../api/patientApi.js';
import { ClipboardList, FilePenLine } from 'lucide-react';
import { formatDate, historyTypeLabel } from '../../utils/format.js';
import { normalize, searchableDate, tokenize, useSearch, useUrlQuery } from '../../utils/search.js';
import {
  Avatar, EmptyState, Highlight, Label, NoResults, PageHeader, Panel, SearchInput, Segmented, StatusMark,
} from '../../components/patient/ui.jsx';

/*
 * Historique médical : chronologie (gauche) + compte rendu de l'événement sélectionné (droite).
 * Chaque compte rendu de consultation est rattaché à l'événement du même jour et du même médecin.
 */
const dayOf = (v) => (v ? new Date(v).toDateString() : '');
const sameDoctor = (a = '', b = '') => a.trim().toLowerCase() === b.trim().toLowerCase();
const AMENDMENT_LABELS = { motif: 'Motif', diagnosis_main: 'Conclusion', diagnosisMain: 'Conclusion', notes: 'Observations', recommendations: 'Suivi' };
const REPORT_FIELDS = [['Motif', 'motif'], ['Conclusion', 'diagnosis_main'], ['Observations', 'notes'], ['Suivi', 'recommendations']];
const reportText = (c) => (c ? REPORT_FIELDS.map(([, k]) => c[k]).filter(Boolean).join(' ') : '');
const FIELDS = (e) => [e.title, e.doctor, e.type, reportText(e.report), searchableDate(e.at)];
const short = (iso) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).replace('.', '') : '—');

function reportMatch(report, query) {
  const tokens = tokenize(query);
  if (!report || !tokens.length) return null;
  for (const [label, k] of REPORT_FIELDS) {
    const v = normalize(report[k]);
    if (v && tokens.some((t) => v.includes(t))) return { label, value: String(report[k]) };
  }
  return null;
}

function parseContent(content) {
  if (typeof content !== 'string') return content || {};
  try { return JSON.parse(content); } catch { return {}; }
}

/* Compte rendu : en-tête (événement, médecin, date) puis rubriques en tableau libellé / contenu. */
function ReportDocument({ e, query, darkMode }) {
  const line = darkMode ? 'border-slate-800' : 'border-slate-200';
  const c = e.report;
  return (
    <article className={`rounded-xl border ${line} ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
      <header className="px-5 py-4 border-b-2 border-red-600">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-red-600">{c ? 'Compte rendu de consultation' : e.type}</p>
        <h3 className="text-lg font-bold mt-0.5 break-words"><Highlight text={e.title || 'Sans titre'} query={query} /></h3>
      </header>
      <dl className={`grid grid-cols-2 gap-x-5 gap-y-3 px-5 py-4 border-b ${line}`}>
        <div className="min-w-0">
          <Label>Médecin</Label>
          <dd className="mt-1 flex items-center gap-2 min-w-0">{e.doctor && <Avatar name={e.doctor} size="sm" />}<span className="text-sm font-medium truncate"><Highlight text={e.doctor || '—'} query={query} /></span></dd>
        </div>
        <div className="min-w-0">
          <Label>Date</Label>
          <dd className="mt-1 text-sm font-mono tabular-nums">{e.at ? new Date(e.at).toLocaleDateString('fr-FR') : '—'}</dd>
        </div>
      </dl>
      {c ? (
        <>
          <dl className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
            {REPORT_FIELDS.map(([label, k]) => (
              <div key={label} className="grid grid-cols-1 sm:grid-cols-[8rem_minmax(0,1fr)] gap-1 sm:gap-4 px-5 py-3">
                <dt><Label>{label}</Label></dt>
                <dd className={`text-sm whitespace-pre-wrap break-words ${c[k] ? '' : 'text-slate-400 italic'}`}>{c[k] ? <Highlight text={c[k]} query={query} /> : 'Non renseigné'}</dd>
              </div>
            ))}
          </dl>
          {c.amendments?.length > 0 && (
            <div className={`px-5 py-4 border-t ${line} space-y-3`}>
              <Label>Avenants ({c.amendments.length})</Label>
              {c.amendments.map((a, i) => (
                <div key={i} className="border-l-2 border-red-600 pl-3 text-sm">
                  <p className="font-semibold flex items-center gap-1.5"><FilePenLine className="w-3.5 h-3.5 text-red-600" /> Correction tracée{a.created_at ? <span className="font-mono text-xs text-slate-400 font-normal"> · {new Date(a.created_at).toLocaleDateString('fr-FR')}</span> : null}</p>
                  <p className="text-slate-600 mt-0.5">Motif : {a.reason}</p>
                  <ul className="mt-1 space-y-0.5 text-slate-600">
                    {Object.entries(parseContent(a.content)).filter(([k]) => !['amendmentReason', 'status'].includes(k)).map(([k, v]) => <li key={k}><span className="text-slate-400">{AMENDMENT_LABELS[k] || k} :</span> {String(v)}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="px-5 py-6 text-sm text-slate-500">Aucun compte rendu n’est rattaché à cet événement.</p>
      )}
    </article>
  );
}

export default function PHistory({ data, sub, darkMode }) {
  const [consultations, setConsultations] = useState([]);
  const [error, setError] = useState('');
  const [selectedKey, setSelectedKey] = useState(null);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useUrlQuery();
  useEffect(() => { let alive = true; patientApi.consultations().then((r) => alive && setConsultations(r)).catch((e) => alive && setError(e.message)); return () => { alive = false; }; }, [data]);

  const entries = useMemo(() => {
    const rows = Array.isArray(data) ? data : (data?.data || []);
    const used = new Set();
    const list = rows.map((item, i) => {
      const report = (consultations || []).find((c) => !used.has(c.id) && dayOf(c.started_at) === dayOf(item.occurredAt) && sameDoctor(c.doctor_name, item.doctorName));
      if (report) used.add(report.id);
      return { key: `h-${item.id ?? i}`, at: item.occurredAt, doctor: item.doctorName, type: historyTypeLabel(item.type), title: item.title, report };
    });
    (consultations || []).filter((c) => !used.has(c.id)).forEach((c) => list.push({
      key: `c-${c.id}`, at: c.started_at, doctor: c.doctor_name, type: 'Compte rendu', title: c.motif || c.diagnosis_main || 'Consultation', report: c,
    }));
    list.sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
    return list;
  }, [data, consultations]);

  const found = useSearch(entries, query, FIELDS);

  if (!data) {
    return (
      <div className="space-y-5">
        <PageHeader title="Historique médical" sub={sub} />
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-5">{[0, 1].map((i) => <div key={i} className={`animate-pulse h-72 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-red-50'}`} />)}</div>
      </div>
    );
  }

  const reportCount = entries.filter((e) => e.report).length;
  const doctorCount = new Set(entries.map((e) => (e.doctor || '').trim().toLowerCase()).filter(Boolean)).size;
  const types = [...new Set(entries.map((e) => e.type).filter(Boolean))].filter((t) => t !== 'Compte rendu');
  const matchesFilter = (e) => filter === 'all' || (filter === 'report' ? !!e.report : e.type === filter);
  const shown = found.filter(matchesFilter);
  const selected = shown.find((e) => e.key === selectedKey) || shown[0] || null;
  const line = darkMode ? 'border-slate-800' : 'border-slate-100';

  // Chronologie groupée par année (ordre de pertinence conservé pendant une recherche).
  const groups = [];
  if (query) groups.push({ year: null, items: shown });
  else shown.forEach((e) => {
    const year = e.at ? String(new Date(e.at).getFullYear()) : 'Sans date';
    const last = groups[groups.length - 1];
    if (last && last.year === year) last.items.push(e); else groups.push({ year, items: [e] });
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Historique médical" sub={sub}
        subtitle={entries.length ? `${entries.length} événement${entries.length > 1 ? 's' : ''} · ${reportCount} compte${reportCount > 1 ? 's' : ''} rendu${reportCount > 1 ? 's' : ''} · ${doctorCount} médecin${doctorCount > 1 ? 's' : ''}${entries[0]?.at ? ` · dernier le ${formatDate(entries[0].at)}` : ''}` : undefined} />
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

      {entries.length > 0 && (
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <SearchInput value={query} onChange={setQuery} count={shown.length} darkMode={darkMode} className="flex-1 min-w-0"
            placeholder="Motif, diagnostic, médecin, date…" label="Rechercher dans mon historique" />
          <Segmented darkMode={darkMode} value={filter} onChange={setFilter} label="Filtrer par type"
            options={[['all', 'Tout', found.length], ['report', 'Comptes rendus', found.filter((e) => e.report).length], ...types.map((t) => [t, t.charAt(0).toUpperCase() + t.slice(1), found.filter((e) => e.type === t).length])]} />
        </div>
      )}

      {entries.length === 0 ? (
        <EmptyState Icon={ClipboardList} title="Aucun historique" darkMode={darkMode}>Votre historique médical apparaîtra ici après vos premières consultations.</EmptyState>
      ) : query && shown.length === 0 ? (
        <NoResults query={query} onClear={() => setQuery('')} darkMode={darkMode} />
      ) : shown.length === 0 ? (
        <EmptyState Icon={ClipboardList} title="Aucun événement dans ce filtre" darkMode={darkMode}
          action={<button type="button" onClick={() => setFilter('all')} className="text-sm font-semibold text-red-600 hover:text-red-700">Voir tout l’historique</button>} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-5 items-start">
          <Panel title="Chronologie" meta={`${shown.length}/${entries.length}`} darkMode={darkMode}>
            {groups.map((g, gi) => (
              <div key={g.year || gi}>
                {g.year && <p className={`px-4 py-1.5 text-[11px] font-mono font-semibold tabular-nums text-slate-400 border-b ${line} ${darkMode ? 'bg-slate-900' : 'bg-slate-50/60'}`}>{g.year}</p>}
                <ol role="listbox" aria-label={g.year || 'Résultats'}>
                  {g.items.map((e) => {
                    const isSel = selected?.key === e.key;
                    const hit = query ? reportMatch(e.report, query) : null;
                    return (
                      <li key={e.key} className={`border-b last:border-0 ${line}`}>
                        <button type="button" role="option" aria-selected={isSel} onClick={() => setSelectedKey(e.key)}
                          className={`w-full text-left px-4 py-3 grid grid-cols-[3.5rem_minmax(0,1fr)] gap-3 border-l-2 ${isSel ? `border-l-red-600 ${darkMode ? 'bg-slate-800/60' : 'bg-red-50/70'}` : `border-l-transparent ${darkMode ? 'hover:bg-slate-800/40' : 'hover:bg-red-50/40'}`}`}>
                          <span className="font-mono text-xs tabular-nums text-slate-500 pt-0.5">{short(e.at)}</span>
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold truncate"><Highlight text={e.title || 'Sans titre'} query={query} /></span>
                            <span className="block text-xs text-slate-500 truncate"><Highlight text={e.doctor || '—'} query={query} /></span>
                            <span className="mt-1 flex items-center gap-3">
                              <StatusMark tone={e.report ? 'watch' : 'neutral'}>{e.report ? 'Compte rendu' : e.type}</StatusMark>
                            </span>
                            {hit && <span className="block mt-1 text-xs text-slate-500 line-clamp-2"><span className="font-semibold text-red-700">{hit.label} :</span> <Highlight text={hit.value} query={query} /></span>}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </Panel>
          {selected && <div className="lg:sticky lg:top-20"><ReportDocument e={selected} query={query} darkMode={darkMode} /></div>}
        </div>
      )}
    </div>
  );
}
