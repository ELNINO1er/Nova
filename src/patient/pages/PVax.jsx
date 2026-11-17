import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Syringe, Clock, Printer, ShieldCheck, AlertTriangle } from 'lucide-react';
import { formatDate } from '../../utils/format.js';
import { patientApi } from '../../api/patientApi.js';
import { searchableDate, useSearch, useUrlQuery } from '../../utils/search.js';
import {
  Button, Card, CardTitle, Chip, EmptyState, Highlight, IconBadge, NoResults, PageHeader, Pills, SearchInput, StatTile,
} from '../../components/patient/ui.jsx';

// Champs cherchables, du plus au moins important.
const FIELDS = (v) => [v.n, v.s, searchableDate(v.at), searchableDate(v.nextAt), v.due ? 'rappel a venir en retard' : 'a jour'];

// Statut calculé d'après la date du prochain rappel (la base ne le met pas à jour avec le temps).
const SOON_DAYS = 60;
function vaccineStatus(nextDueAt) {
  if (!nextDueAt) return { key: 'ok', label: 'À jour' };
  const days = (new Date(nextDueAt).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000;
  if (days < 0) return { key: 'late', label: 'Rappel en retard' };
  if (days <= SOON_DAYS) return { key: 'soon', label: 'Rappel à prévoir' };
  return { key: 'ok', label: 'À jour' };
}

export default function PVax({ data, card, sub, border, darkMode }) {
  // Impression du carnet : rendu hors de la page, retiré après l'impression.
  const [printing, setPrinting] = useState(null);
  useEffect(() => {
    if (!printing) return undefined;
    const done = () => setPrinting(null);
    window.addEventListener('afterprint', done);
    const t = setTimeout(() => window.print(), 250);
    return () => { clearTimeout(t); window.removeEventListener('afterprint', done); };
  }, [printing]);
  const printBook = async () => {
    let name = '';
    try { const p = await patientApi.profile(); name = `${p.firstName || ''} ${p.lastName || ''}`.trim(); } catch { /* impression sans nom */ }
    setPrinting({ name });
  };
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useUrlQuery();

  const vaccines = useMemo(() => (data || []).map((v, i) => {
    const st = vaccineStatus(v.nextDueAt);
    return {
    key: v.id ?? i,
    n: v.name,
    d: v.injectedAt ? formatDate(v.injectedAt) : 'Non renseigné',
    s: st.label,
    due: st.key !== 'ok',
    late: st.key === 'late',
    x: v.nextDueAt ? formatDate(v.nextDueAt) : 'Aucun rappel',
    at: v.injectedAt,
    nextAt: v.nextDueAt,
  };
  }), [data]);
  const found = useSearch(vaccines, query, FIELDS);

  if (!data) {
    return (
      <div className="space-y-5">
        <PageHeader title="Carnet vaccinal" sub={sub} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[0, 1, 2].map(i => <div key={i} className={`animate-pulse h-32 rounded-3xl ${darkMode ? 'bg-slate-800' : 'bg-red-50'}`} />)}
        </div>
        <Card darkMode={darkMode}><div className={`animate-pulse h-40 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-red-50'}`} /></Card>
      </div>
    );
  }
  const vs = vaccines;
  const upToDateCount = vs.filter((v) => !v.due).length;
  const dueSoonCount = vs.filter((v) => v.due).length;
  const lateCount = vs.filter((v) => v.late).length;
  const nextDue = vs.filter((v) => v.nextAt && !v.late).sort((a, b) => new Date(a.nextAt) - new Date(b.nextAt))[0];

  // Filtre après recherche : les compteurs des pastilles reflètent la requête.
  const shown = filter === 'all' ? found : found.filter((v) => (filter === 'due' ? v.due : !v.due));
  const pillOptions = [
    ['all', 'Tous', found.length],
    ['ok', 'À jour', found.filter((v) => !v.due).length],
    ['due', 'Rappels', found.filter((v) => v.due).length],
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Carnet vaccinal" sub={sub} subtitle="Historique de vos vaccinations et rappels à prévoir"
        actions={vs.length > 0 && <Button Icon={Printer} onClick={printBook}>Imprimer mon carnet</Button>} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
        <StatTile label="Vaccins à jour" value={upToDateCount} Icon={ShieldCheck} darkMode={darkMode} hint={`sur ${vs.length} enregistré${vs.length > 1 ? 's' : ''}`} />
        <StatTile label="Rappels à venir" value={dueSoonCount} Icon={Clock} darkMode={darkMode} highlight={dueSoonCount > 0}
          hint={nextDue ? `Prochain : ${nextDue.n}, ${formatDate(nextDue.nextAt)}` : dueSoonCount > 0 ? 'À planifier avec votre médecin' : 'Aucun rappel en attente'}
          onClick={dueSoonCount > 0 ? () => setFilter('due') : undefined} />
        <StatTile label="Rappels en retard" value={lateCount} Icon={AlertTriangle} darkMode={darkMode} highlight={lateCount > 0}
          hint={lateCount > 0 ? 'À faire avec votre médecin' : 'Aucun rappel dépassé'} onClick={lateCount > 0 ? () => setFilter('due') : undefined} />
      </div>

      {vs.length > 0 && (
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <SearchInput value={query} onChange={setQuery} count={shown.length} darkMode={darkMode} className="w-full lg:max-w-md"
            placeholder="Rechercher un vaccin, une date, un statut…" />
          <div className="lg:ml-auto"><Pills darkMode={darkMode} value={filter} onChange={setFilter} options={pillOptions} /></div>
        </div>
      )}

      <Card darkMode={darkMode} className="!p-0 overflow-hidden">
        <div className="px-5 pt-5"><CardTitle Icon={Syringe}>Historique complet</CardTitle></div>
        {vs.length === 0 ? (
          <div className="px-5 pb-5">
            <EmptyState Icon={Syringe} title="Aucun vaccin enregistré" darkMode={darkMode}>
              Vos vaccinations apparaîtront ici dès qu’un professionnel de santé les aura saisies.
            </EmptyState>
          </div>
        ) : query && shown.length === 0 ? (
          <div className="px-5 pb-5"><NoResults query={query} onClear={() => setQuery('')} darkMode={darkMode} /></div>
        ) : shown.length === 0 ? (
          <div className="px-5 pb-5">
            <EmptyState Icon={Syringe} title="Aucun vaccin dans ce filtre" darkMode={darkMode}
              action={<button type="button" onClick={() => setFilter('all')} className="text-sm font-semibold text-red-600 hover:text-red-700">Voir tous les vaccins</button>} />
          </div>
        ) : (
          <>
            <div className={`hidden md:grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_8rem] gap-4 px-5 py-3 text-xs font-semibold text-slate-500 ${darkMode ? 'bg-slate-800/40' : 'bg-red-50/50'}`}>
              <span>Vaccin</span><span>Injection</span><span>Prochain rappel</span><span className="text-right">Statut</span>
            </div>
            <ul className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
              {shown.map((v) => (
                <li key={v.key} className="px-5 py-4 grid grid-cols-[auto_minmax(0,1fr)] md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_8rem] gap-x-3 md:gap-4 gap-y-2 items-center">
                  <div className="flex items-center gap-3 min-w-0 col-span-2 md:col-span-1">
                    <IconBadge Icon={Syringe} solid={v.due} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold break-words"><Highlight text={v.n} query={query} /></p>
                      <p className={`text-xs ${sub} md:hidden`}><Highlight text={v.s} query={query} /></p>
                    </div>
                    <span className="md:hidden"><Chip tone={v.late ? 'alert' : v.due ? 'watch' : 'neutral'}>{v.s}</Chip></span>
                  </div>
                  <dl className="col-span-2 md:contents grid grid-cols-2 gap-3 text-sm pl-[3.25rem] md:pl-0">
                    <div className="min-w-0">
                      <dt className="text-xs text-slate-500 md:hidden">Injection</dt>
                      <dd className="font-medium"><Highlight text={v.d} query={query} /></dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-xs text-slate-500 md:hidden">Prochain rappel</dt>
                      <dd className={`font-medium ${v.late ? 'text-red-700' : ''}`}><Highlight text={v.x} query={query} /></dd>
                    </div>
                  </dl>
                  <div className="hidden md:flex justify-end"><Chip tone={v.late ? 'alert' : v.due ? 'watch' : 'neutral'}><Highlight text={v.s} query={query} /></Chip></div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      {printing && createPortal(
        <div className="print-root bg-white text-slate-900 p-8">
          <div className="max-w-2xl mx-auto">
            <p className="text-xs font-bold uppercase tracking-widest text-red-700">NOVA · Carnet de vaccination</p>
            <h1 className="text-2xl font-bold mt-1">{printing.name || 'Carnet de vaccination'}</h1>
            <p className="text-xs mt-1">Édité le {new Date().toLocaleDateString('fr-FR')} · informations saisies par les professionnels de santé dans NOVA</p>
            <table className="w-full mt-5 text-sm border-collapse">
              <thead><tr className="text-left border-b-2 border-slate-800"><th className="py-2">Vaccin</th><th>Injection</th><th>Prochain rappel</th><th>Statut</th></tr></thead>
              <tbody>{vs.map((v) => <tr key={v.key} className="border-b border-slate-300"><td className="py-2 font-semibold">{v.n}</td><td>{v.d}</td><td>{v.x}</td><td>{v.s}</td></tr>)}</tbody>
            </table>
          </div>
        </div>, document.body)}
    </div>
  );
}
