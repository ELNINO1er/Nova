import React, { useState } from 'react';
import { Microscope, ChevronDown, AlertTriangle, Clock, CalendarDays } from 'lucide-react';
import { formatDate } from '../../utils/format.js';
import { searchableDate, tokenize, normalize, useSearch, useUrlQuery } from '../../utils/search.js';
import {
  Avatar, Card, Chip, EmptyState, Highlight, IconBadge, NoResults, PageHeader, Pills, SearchInput, StatTile,
} from '../../components/patient/ui.jsx';

// Intensité du rouge = niveau d'attention : plein (critique), pâle (hors normes), blanc (normal).
const statusTone = { normal: 'neutral', high: 'watch', low: 'watch', critical: 'alert' };
const statusLabel = { normal: 'Normal', high: 'Élevé', low: 'Bas', critical: 'Critique' };
const reportStatusTone = { completed: 'neutral', pending: 'watch', cancelled: 'neutral' };
const reportStatusLabel = { completed: 'Terminé', pending: 'En attente', cancelled: 'Annulé' };

const isAbnormal = (r) => (r.items || []).some(i => i.status !== 'normal');
const EMPTY = [];

// Champs cherchables, du plus au moins important.
const FIELDS = (r) => [
  r.title,
  (r.items || []).map(i => `${i.name} ${i.value ?? ''}${i.unit ? ` ${i.unit}` : ''}`).join(' '),
  r.laboratoryName,
  r.doctorName,
  searchableDate(r.performedAt),
  [reportStatusLabel[r.status] || r.status, isAbnormal(r) ? 'hors normes anormal' : '', ...(r.items || []).map(i => statusLabel[i.status] || i.status)].join(' '),
];

// Paramètres du bilan dont le nom ou la valeur contient un mot de la requête.
const itemHits = (report, query) => {
  const tokens = tokenize(query);
  if (!tokens.length) return [];
  return (report.items || []).filter(i => {
    const f = normalize(`${i.name} ${i.value ?? ''}`);
    return tokens.some(t => f.includes(t));
  });
};

export default function PLabResults({ data, card, sub, border, darkMode }) {
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useUrlQuery();
  const found = useSearch(data || EMPTY, query, FIELDS);

  if (!data) return (
    <div className="space-y-5">
      <PageHeader title="Résultats de laboratoire" sub={sub} />
      <div className="space-y-3">{[0, 1, 2].map(i => <Card key={i} darkMode={darkMode}><div className={`animate-pulse h-12 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-red-50'}`} /></Card>)}</div>
    </div>
  );

  const totalAbnormal = data.filter(isAbnormal).length;
  const totalPending = data.filter(r => r.status === 'pending').length;
  const latest = [...data].filter(r => r.performedAt).sort((a, b) => new Date(b.performedAt) - new Date(a.performedAt))[0];

  // Les compteurs des pastilles reflètent la recherche en cours.
  const counts = {
    all: found.length,
    abnormal: found.filter(isAbnormal).length,
    pending: found.filter(r => r.status === 'pending').length,
    completed: found.filter(r => r.status === 'completed').length,
  };
  const shown = filter === 'all' ? found
    : filter === 'abnormal' ? found.filter(isAbnormal)
    : found.filter(r => r.status === filter);

  return (
    <div className="space-y-5">
      <PageHeader title="Résultats de laboratoire" sub={sub}
        subtitle={`${data.length} analyse${data.length > 1 ? 's' : ''}${totalAbnormal ? ` · ${totalAbnormal} avec valeurs hors normes` : ''}`} />

      {data.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
          <StatTile label="Analyses" value={data.length} Icon={Microscope} darkMode={darkMode}
            hint={latest ? `Dernière : ${formatDate(latest.performedAt)}` : undefined} />
          <StatTile label="Hors normes" value={totalAbnormal} Icon={AlertTriangle} darkMode={darkMode} highlight={totalAbnormal > 0}
            hint={totalAbnormal > 0 ? 'À commenter avec votre médecin' : 'Toutes les valeurs sont normales'}
            onClick={totalAbnormal > 0 ? () => setFilter('abnormal') : undefined} />
          <StatTile label="En attente" value={totalPending} Icon={Clock} darkMode={darkMode}
            hint={totalPending > 0 ? 'Résultats non encore transmis' : 'Aucune analyse en attente'} />
        </div>
      )}

      {data.length > 0 && (
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <SearchInput value={query} onChange={setQuery} count={shown.length} darkMode={darkMode} className="w-full lg:max-w-md"
            placeholder="Rechercher une analyse, un paramètre, un laboratoire…" />
          <div className="lg:ml-auto">
            <Pills darkMode={darkMode} value={filter} onChange={setFilter} options={[
              ['all', 'Toutes', counts.all], ['abnormal', 'Hors normes', counts.abnormal],
              ['pending', 'En attente', counts.pending], ['completed', 'Terminées', counts.completed],
            ]} />
          </div>
        </div>
      )}

      {data.length === 0 ? (
        <EmptyState Icon={Microscope} title="Aucun résultat disponible" darkMode={darkMode}>
          Vos analyses biologiques apparaîtront ici dès que le laboratoire les aura transmises.
        </EmptyState>
      ) : query && shown.length === 0 ? (
        <NoResults query={query} onClear={() => setQuery('')} darkMode={darkMode} />
      ) : shown.length === 0 ? (
        <EmptyState Icon={Microscope} title="Aucune analyse dans ce filtre" darkMode={darkMode}
          action={<button type="button" onClick={() => setFilter('all')} className="text-sm font-semibold text-red-600 hover:text-red-700">Voir toutes les analyses</button>} />
      ) : (
        <div className="space-y-3">
          {shown.map((report) => {
            const isOpen = expanded === report.id;
            const hasAbnormal = isAbnormal(report);
            const hasCritical = (report.items || []).some(i => i.status === 'critical');
            const hits = query ? itemHits(report, query) : [];
            const itemCount = (report.items || []).length;
            return (
              <Card key={report.id} darkMode={darkMode} className="!p-0 overflow-hidden">
                <button type="button" onClick={() => setExpanded(isOpen ? null : report.id)} aria-expanded={isOpen}
                  className={`w-full flex items-start sm:items-center gap-3 sm:gap-4 p-4 sm:p-5 text-left transition-colors ${darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-red-50/40'}`}>
                  <IconBadge Icon={hasAbnormal ? AlertTriangle : Microscope} solid={hasCritical} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold break-words"><Highlight text={report.title} query={query} /></p>
                    <p className={`text-xs ${sub} mt-0.5 truncate`}>
                      <Highlight text={[report.laboratoryName, report.doctorName].filter(Boolean).join(' · ') || 'Laboratoire non précisé'} query={query} />
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <Chip tone={reportStatusTone[report.status] || 'neutral'}>{reportStatusLabel[report.status] || report.status}</Chip>
                      {hasAbnormal && <Chip tone={hasCritical ? 'alert' : 'watch'}>Valeurs hors normes</Chip>}
                      <span className={`text-xs ${sub}`}>
                        {hits.length > 0
                          ? `${hits.length} paramètre${hits.length > 1 ? 's' : ''} sur ${itemCount} correspond${hits.length > 1 ? 'ent' : ''}`
                          : `${itemCount} paramètre${itemCount > 1 ? 's' : ''}`}
                      </span>
                    </div>
                  </div>
                  <div className="hidden sm:flex flex-col items-end shrink-0 text-right">
                    <span className={`text-xs inline-flex items-center gap-1 ${sub}`}><CalendarDays className="w-3 h-3" aria-hidden="true" />Réalisée le</span>
                    <span className="text-sm font-semibold mt-0.5">{report.performedAt ? formatDate(report.performedAt) : '—'}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 shrink-0 self-center ${sub} transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                  <div className={`border-t ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                      {report.doctorName ? (
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar name={report.doctorName} size="sm" />
                          <p className={`text-sm ${sub} truncate`}>Prescrit par <strong className={darkMode ? 'text-white' : 'text-slate-900'}>{report.doctorName}</strong></p>
                        </div>
                      ) : <span />}
                      <span className={`text-xs sm:hidden ${sub}`}>{report.performedAt ? formatDate(report.performedAt) : ''}</span>
                    </div>
                    <ul className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                      {(report.items || []).map((item, idx) => {
                        const hit = hits.includes(item);
                        return (
                          <li key={idx} className={`px-5 py-3.5 flex items-center gap-3 ${hit ? (darkMode ? 'bg-red-950/20' : 'bg-red-50/40') : ''}`}>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium break-words"><Highlight text={item.name} query={query} /></p>
                              <p className={`text-xs ${sub} mt-0.5`}>Référence : {item.referenceRange || '—'}</p>
                            </div>
                            <span className={`text-sm font-semibold tabular-nums text-right ${item.status === 'normal' ? (darkMode ? 'text-white' : 'text-slate-900') : 'text-red-700'}`}>
                              <Highlight text={String(item.value ?? '—')} query={query} />{item.unit && <span className="font-normal text-slate-500"> {item.unit}</span>}
                            </span>
                            <Chip tone={statusTone[item.status] || 'neutral'}>{statusLabel[item.status] || item.status}</Chip>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
