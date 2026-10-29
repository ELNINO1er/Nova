import React, { useMemo, useState } from 'react';
import { Pill, HeartPulse, CalendarClock, Stethoscope } from 'lucide-react';
import { formatDate, capitalize } from '../../utils/format.js';
import { PageHeader, Card, Chip, EmptyState, IconBadge, Pills, SearchInput, Highlight, NoResults } from '../../components/patient/ui.jsx';
import { useSearch, useUrlQuery, searchableDate } from '../../utils/search.js';

/* Champs cherchables : pathologie, médicaments, statut, médecin, dates. */
const FIELDS = (t) => [t.n, t.m.join(' '), t.s, t.dr, t.raw, searchableDate(t.startedAt), searchableDate(t.nextAt)];

export default function PTreatments({ data, card, sub, darkMode }) {
  const [query, setQuery] = useUrlQuery();
  const [filter, setFilter] = useState('all');
  const ts = useMemo(() => (data?.length ? data.map((t) => ({
    n: t.diagnosis,
    s: t.stage || capitalize(t.status),
    pr: t.progress || 0,
    du: t.startedAt ? `Depuis ${formatDate(t.startedAt)}` : 'En cours',
    dr: t.doctorName || 'Médecin référent',
    m: t.medications?.map((m) => `${m.name} ${m.dosage || ''}`.trim()) || [],
    nc: t.nextCheckupAt ? formatDate(t.nextCheckupAt) : 'À planifier',
    planned: !!t.nextCheckupAt,
    raw: t.status || '',
    startedAt: t.startedAt,
    nextAt: t.nextCheckupAt,
  })) : []), [data]);
  const results = useSearch(ts, query, FIELDS);
  const visible = filter === 'all' ? results : results.filter((t) => (filter === 'planned' ? t.planned : !t.planned));

  if (!data) {
    return (
      <div className="space-y-5">
        <PageHeader title="Mes traitements" sub={sub} />
        {[0, 1].map((i) => <Card key={i} darkMode={darkMode}><div className={`animate-pulse h-36 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-red-50/60'}`} /></Card>)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Mes traitements" subtitle="Suivi de pathologies en cours" sub={sub}
        actions={<Chip tone="watch">{ts.length} actif{ts.length > 1 ? 's' : ''}</Chip>} />
      {ts.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <SearchInput value={query} onChange={setQuery} darkMode={darkMode} count={visible.length} className="flex-1 min-w-0"
            placeholder="Pathologie, médicament, médecin…" label="Rechercher dans mes traitements" />
          <Pills darkMode={darkMode} value={filter} onChange={setFilter}
            options={[['all', 'Tous', results.length], ['planned', 'Contrôle planifié', results.filter((t) => t.planned).length], ['todo', 'À planifier', results.filter((t) => !t.planned).length]]} />
        </div>
      )}
      {ts.length > 0 && visible.length === 0 && (query && results.length === 0
        ? <NoResults query={query} onClear={() => setQuery('')} darkMode={darkMode} />
        : <EmptyState Icon={HeartPulse} title="Aucun traitement dans ce filtre" darkMode={darkMode}>Changez de filtre pour voir vos autres traitements.</EmptyState>)}
      {ts.length === 0 && (
        <EmptyState Icon={HeartPulse} title="Aucun traitement en cours" darkMode={darkMode}>
          Vos traitements apparaîtront ici une fois prescrits.
        </EmptyState>
      )}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {visible.map((t, i) => (
          <Card key={i} darkMode={darkMode}>
            <div className="flex items-start gap-3">
              <IconBadge Icon={HeartPulse} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-semibold break-words"><Highlight text={t.n} query={query} /></h3>
                  {t.s && <Chip tone="watch"><Highlight text={t.s} query={query} /></Chip>}
                </div>
                <p className={`text-xs mt-0.5 flex items-center gap-1.5 ${sub}`}><Stethoscope className="w-3.5 h-3.5 shrink-0" /><span className="min-w-0">{t.du} · <Highlight text={t.dr} query={query} /></span></p>
              </div>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-xs font-medium ${sub}`}>Progression</span>
                <span className="text-xs font-semibold tabular-nums">{t.pr}%</span>
              </div>
              <div className={`h-2 rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-red-50'}`}
                role="progressbar" aria-valuenow={t.pr} aria-valuemin={0} aria-valuemax={100} aria-label={`Progression ${t.n}`}>
                <div className="h-full bg-red-600 rounded-full" style={{ width: `${t.pr}%` }} />
              </div>
            </div>

            {t.m.length > 0 && (
              <div className="mt-5">
                <p className={`text-xs font-medium mb-2 ${sub}`}>Médicaments</p>
                <div className="flex flex-wrap gap-2">
                  {t.m.map((m, mi) => (
                    <span key={mi} className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 ${darkMode ? 'border-slate-700' : 'border-red-100'}`}>
                      <Pill className="w-3 h-3 text-red-600" /> <Highlight text={m} query={query} />
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className={`mt-5 pt-4 border-t flex items-center gap-3 ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
              <CalendarClock className="w-4 h-4 text-red-600 shrink-0" />
              <p className="text-xs flex-1 font-semibold">Prochain contrôle</p>
              <Chip tone={t.planned ? 'watch' : 'neutral'}>{t.nc}</Chip>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
