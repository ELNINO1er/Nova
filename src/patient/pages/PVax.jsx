import React, { useMemo, useState } from 'react';
import { Syringe, Clock, QrCode, ShieldCheck, Percent } from 'lucide-react';
import { formatDate } from '../../utils/format.js';
import { patientApi } from '../../api/patientApi.js';
import { PatientModal } from '../../components/PatientModal.jsx';
import { searchableDate, useSearch, useUrlQuery } from '../../utils/search.js';
import {
  Button, Card, CardTitle, Chip, EmptyState, Highlight, IconBadge, NoResults, PageHeader, Pills, SearchInput, StatTile,
} from '../../components/patient/ui.jsx';

// Champs cherchables, du plus au moins important.
const FIELDS = (v) => [v.n, v.s, searchableDate(v.at), searchableDate(v.nextAt), v.due ? 'rappel a venir' : 'a jour'];

export default function PVax({ data, card, sub, border, darkMode }) {
  const [showQR, setShowQR]   = useState(false);
  const [qrData, setQrData]   = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useUrlQuery();

  const vaccines = useMemo(() => (data || []).map((v, i) => ({
    key: v.id ?? i,
    n: v.name,
    d: v.injectedAt ? formatDate(v.injectedAt) : 'Non renseigné',
    s: v.status === 'due_soon' ? 'Rappel prévu' : 'À jour',
    due: v.status === 'due_soon',
    x: v.nextDueAt ? formatDate(v.nextDueAt) : 'Aucun rappel',
    at: v.injectedAt,
    nextAt: v.nextDueAt,
  })), [data]);
  const found = useSearch(vaccines, query, FIELDS);

  const openQR = async () => {
    setShowQR(true);
    if (qrData) return;
    setQrLoading(true);
    try {
      const res = await patientApi.emergencyCardQr();
      setQrData(res);
    } catch {
      setQrData(null);
    } finally {
      setQrLoading(false);
    }
  };

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
  const coverage = vs.length ? Math.round((upToDateCount / vs.length) * 100) : 0;
  const nextDue = vs.filter((v) => v.nextAt).sort((a, b) => new Date(a.nextAt) - new Date(b.nextAt))[0];

  // Filtre après recherche : les compteurs des pastilles reflètent la requête.
  const shown = filter === 'all' ? found : found.filter((v) => (filter === 'due' ? v.due : !v.due));
  const pillOptions = [
    ['all', 'Tous', found.length],
    ['ok', 'À jour', found.filter((v) => !v.due).length],
    ['due', 'Rappel prévu', found.filter((v) => v.due).length],
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Carnet vaccinal" sub={sub} subtitle="Historique de vos vaccinations et rappels à prévoir"
        actions={<Button Icon={QrCode} onClick={openQR}>Passeport vaccinal QR</Button>} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
        <StatTile label="Vaccins à jour" value={upToDateCount} Icon={ShieldCheck} darkMode={darkMode} hint={`sur ${vs.length} enregistré${vs.length > 1 ? 's' : ''}`} />
        <StatTile label="Rappels à venir" value={dueSoonCount} Icon={Clock} darkMode={darkMode} highlight={dueSoonCount > 0}
          hint={nextDue ? `Prochain : ${nextDue.n}, ${formatDate(nextDue.nextAt)}` : dueSoonCount > 0 ? 'À planifier avec votre médecin' : 'Aucun rappel en attente'}
          onClick={dueSoonCount > 0 ? () => setFilter('due') : undefined} />
        <StatTile label="Couverture" value={coverage} unit="%" Icon={Percent} darkMode={darkMode} hint="Part des vaccins à jour" />
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
                    <span className="md:hidden"><Chip tone={v.due ? 'watch' : 'neutral'}>{v.s}</Chip></span>
                  </div>
                  <dl className="col-span-2 md:contents grid grid-cols-2 gap-3 text-sm pl-[3.25rem] md:pl-0">
                    <div className="min-w-0">
                      <dt className="text-xs text-slate-500 md:hidden">Injection</dt>
                      <dd className="font-medium"><Highlight text={v.d} query={query} /></dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-xs text-slate-500 md:hidden">Prochain rappel</dt>
                      <dd className={`font-medium ${v.due ? 'text-red-700' : ''}`}><Highlight text={v.x} query={query} /></dd>
                    </div>
                  </dl>
                  <div className="hidden md:flex justify-end"><Chip tone={v.due ? 'watch' : 'neutral'}><Highlight text={v.s} query={query} /></Chip></div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      {showQR && (
        <PatientModal title="Passeport vaccinal" onClose={() => setShowQR(false)} card={card} darkMode={darkMode} maxWidth="max-w-sm">
          <div className="flex flex-col items-center gap-4">
            <p className={`text-xs ${sub} self-start`}>Scannez pour vérifier les vaccinations.</p>
            {qrLoading ? (
              <div className={`w-52 h-52 rounded-2xl border border-dashed ${darkMode ? 'border-slate-700' : 'border-red-200'} flex items-center justify-center animate-pulse`}>
                <QrCode className="w-10 h-10 text-red-300" />
              </div>
            ) : qrData?.qr ? (
              <img src={qrData.qr} alt="QR code du passeport vaccinal" className="w-52 h-52 rounded-2xl border-4 border-red-600 bg-white" />
            ) : (
              <div className={`w-52 h-52 rounded-2xl border border-dashed ${darkMode ? 'border-slate-700' : 'border-red-200'} flex flex-col items-center justify-center gap-2`}>
                <QrCode className="w-10 h-10 text-red-300" />
                <p className={`text-xs ${sub}`}>Génération impossible</p>
              </div>
            )}
            <div className="w-full">
              <p className={`text-xs font-semibold ${sub} mb-2`}>Vaccinations ({vs.length})</p>
              <ul className={`divide-y rounded-2xl border ${darkMode ? 'divide-slate-800 border-slate-800' : 'divide-slate-100 border-slate-200/70'}`}>
                {vs.map((v, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                    <span className="font-medium truncate">{v.n}</span>
                    <Chip tone={v.due ? 'watch' : 'neutral'}>{v.s}</Chip>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </PatientModal>
      )}
    </div>
  );
}
