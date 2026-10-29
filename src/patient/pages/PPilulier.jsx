import React, { useEffect, useMemo, useState } from 'react';
import { Pill, Check, Clock, X, AlertTriangle, Bell, Moon, Sun, FileText } from 'lucide-react';
import { patientApi } from '../../api/patientApi.js';
import { PageHeader, Card, CardTitle, Chip, Button, EmptyState, StatTile, Pills, IconBadge, SearchInput, Highlight, NoResults } from '../../components/patient/ui.jsx';
import { useSearch, useUrlQuery } from '../../utils/search.js';

const PERIODS = ['Matin', 'Midi', 'Soir'];
const STATUS_LABEL = { taken: 'pris', missed: 'oublié', skipped: 'ignoré', pending: 'à prendre' };
/* Champs cherchables : médicament, dosage, heure, moment de la journée, statut, interaction. */
const FIELDS = (m) => [m.n, m.d, m.t, m.p, STATUS_LABEL[m.status] || '', m.i ? 'interaction' : ''];

export default function PPilulier({ data, onReload, notify, pills, setPills, card, sub, darkMode, setPage }) {
  const [query, setQuery] = useUrlQuery();
  const [period, setPeriod] = useState('all');
  const meds = useMemo(() => (data?.length ? data.map((item) => ({
    id: item.id,
    n: item.name,
    d: item.dosage,
    t: item.time,
    p: item.period,
    i: item.interaction,
    status: item.intake?.status || 'pending',
  })) : []), [data]);
  const results = useSearch(meds, query, FIELDS);
  const visible = period === 'all' ? results : results.filter((m) => m.p === period);
  const otherPeriods = results.filter((m) => !PERIODS.includes(m.p));
  useEffect(() => {
    if (!data?.length) return;
    const statuses = {};
    data.forEach((item) => { statuses[item.id] = item.intake?.status || 'pending'; });
    setPills(statuses);
  }, [data, setPills]);
  const cnt = Object.values(pills).filter((status) => status === 'taken' || status === true).length;
  const missed = Object.values(pills).filter((status) => status === 'missed').length;
  const obs = meds.length ? Math.round((cnt / meds.length) * 100) : 0;
  const obsLabel = obs >= 80 ? 'Excellent' : obs >= 50 ? 'À améliorer' : obs > 0 ? 'Insuffisant' : '—';
  const obsTone = obs >= 80 ? 'neutral' : obs >= 50 ? 'watch' : 'alert';
  const nextDue = meds.find((med) => !['taken', 'skipped', 'missed'].includes(pills[med.id] || med.status));
  const interactionMeds = meds.filter((m) => m.i);
  const markMedicationStatus = async (id, status) => {
    setPills({ ...pills, [id]: status });
    try {
      await patientApi.markMedication(id, { status });
      onReload?.(await patientApi.todayMedications());
      notify?.('Pilulier mis à jour');
    } catch (error) {
      notify?.(error.message || 'Erreur pilulier', 'error');
    }
  };

  const ring = darkMode ? 'border border-slate-700 hover:bg-slate-800' : 'border border-slate-200 bg-white hover:bg-red-50';

  if (!data) {
    return (
      <div className="space-y-5">
        <PageHeader title="Pilulier numérique" sub={sub} />
        <Card darkMode={darkMode}>
          <div className="animate-pulse space-y-3">
            {[0, 1, 2].map((i) => <div key={i} className={`h-16 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-red-50/60'}`} />)}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Pilulier numérique" sub={sub}
        subtitle={meds.length ? `${cnt} / ${meds.length} prise${meds.length > 1 ? 's' : ''} aujourd'hui` : 'Vos prises du jour'} />
      {meds.length === 0 ? (
        <EmptyState Icon={Pill} title="Aucun médicament programmé" darkMode={darkMode}
          action={setPage ? <Button variant="secondary" darkMode={darkMode} Icon={FileText} onClick={() => setPage('prescriptions')}>Voir mes ordonnances</Button> : null}>
          Vos prises apparaîtront ici une fois prescrites par votre médecin.
        </EmptyState>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <SearchInput value={query} onChange={setQuery} darkMode={darkMode} count={visible.length} className="flex-1 min-w-0"
            placeholder="Médicament, dosage, heure…" label="Rechercher dans le pilulier" />
          <Pills darkMode={darkMode} value={period} onChange={setPeriod}
            options={[['all', 'Tous', results.length], ...PERIODS.map((p) => [p, p, results.filter((m) => m.p === p).length])]} />
        </div>
        <Card darkMode={darkMode}>
          <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
            <div>
              <h3 className="font-semibold">Aujourd'hui</h3>
              <p className={`text-xs mt-0.5 ${sub}`}>{cnt} / {meds.length} pris{missed ? ` — ${missed} oublié${missed > 1 ? 's' : ''}` : ''}</p>
            </div>
            <Chip tone={nextDue ? 'watch' : 'neutral'}><Bell className="w-3 h-3" /> Prochain {nextDue?.t || 'terminé'}</Chip>
          </div>
          <div className={`h-2 rounded-full mb-6 overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-red-50'}`}
            role="progressbar" aria-valuenow={obs} aria-valuemin={0} aria-valuemax={100} aria-label="Prises effectuées">
            <div className="h-full bg-red-600 rounded-full transition-all" style={{ width: `${obs}%` }} />
          </div>
          {visible.length === 0 && (query
            ? <NoResults query={query} onClear={() => setQuery('')} darkMode={darkMode} />
            : <p className={`text-sm text-center py-6 ${sub}`}>Aucune prise sur ce moment de la journée.</p>)}
          <div className="space-y-6">
            {[...PERIODS, ...(period === 'all' && otherPeriods.length ? ['Autre'] : [])].map((per) => {
              if (period !== 'all' && per !== period) return null;
              const pm = per === 'Autre' ? otherPeriods : visible.filter((m) => m.p === per);
              if (!pm.length) return null;
              const pending = pm.filter((m) => !['taken', 'missed', 'skipped'].includes(pills[m.id] || m.status));
              return (
                <div key={per}>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    {per === 'Soir' ? <Moon className="w-4 h-4 text-red-600" /> : <Sun className="w-4 h-4 text-red-600" />}
                    <Highlight text={per} query={query} /> <span className={`font-normal ${sub}`}>· {pm[0].t}</span>
                    {pending.length === 0 && <Chip className="ml-auto"><Check className="w-3 h-3" /> Terminé</Chip>}
                  </h4>
                  <div className="space-y-2">
                    {pm.map((m) => {
                      const status = pills[m.id] || m.status || 'pending';
                      const isTaken = status === 'taken' || status === true;
                      const skipped = status === 'skipped';
                      const isMissed = status === 'missed';
                      const isDone = isTaken || skipped || isMissed;
                      return (
                        <div key={m.id} className={`flex items-center gap-3 p-3 rounded-2xl border transition-colors ${isMissed
                          ? (darkMode ? 'border-red-900 bg-red-950/30' : 'border-red-200 bg-red-50')
                          : darkMode ? 'border-slate-800' : 'border-red-100 bg-white'}`}>
                          <IconBadge Icon={Pill} solid={!isDone} size="sm" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`font-semibold text-sm ${isDone ? 'line-through text-slate-400' : ''}`}><Highlight text={m.n} query={query} /></p>
                              {m.i && !isDone && <Chip tone="alert"><AlertTriangle className="w-3 h-3" /> Interaction</Chip>}
                              {isMissed && <Chip tone="alert">Oublié</Chip>}
                              {skipped && <Chip>Ignoré</Chip>}
                            </div>
                            <p className={`text-xs ${sub}`}><Highlight text={m.d} query={query} /> · <Highlight text={m.t} query={query} /></p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button type="button" onClick={() => markMedicationStatus(m.id, 'taken')} aria-label={`Marquer ${m.n} comme pris`} aria-pressed={isTaken} title="Pris"
                              className={`w-9 h-9 rounded-full flex items-center justify-center ${isTaken ? 'bg-red-600 text-white' : ring}`}>
                              <Check className="w-4 h-4" strokeWidth={3} />
                            </button>
                            <button type="button" onClick={() => markMedicationStatus(m.id, 'missed')} aria-label={`Marquer ${m.n} comme oublié`} aria-pressed={isMissed} title="Oublié"
                              className={`w-9 h-9 rounded-full flex items-center justify-center ${isMissed ? 'bg-red-600 text-white' : ring}`}>
                              <X className="w-4 h-4" strokeWidth={3} />
                            </button>
                            <button type="button" onClick={() => markMedicationStatus(m.id, 'skipped')} aria-label={`Marquer ${m.n} comme ignoré`} aria-pressed={skipped} title="Ignoré"
                              className={`w-9 h-9 rounded-full flex items-center justify-center ${skipped ? 'bg-red-50 text-red-700 border border-red-200' : ring}`}>
                              <Clock className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        </div>
        <div className="space-y-5">
          <StatTile label="Observance du jour" value={obs} unit="%" Icon={Pill} darkMode={darkMode}
            hint={`${cnt} prise${cnt > 1 ? 's' : ''} sur ${meds.length}`} />
          <Card darkMode={darkMode}>
            <CardTitle>Appréciation</CardTitle>
            <Chip tone={obsTone}>{obsLabel}</Chip>
            <p className={`text-xs mt-3 ${sub}`}>Calculée sur les prises marquées comme prises aujourd'hui.</p>
          </Card>
          {interactionMeds.length > 0 && (
            <Card darkMode={darkMode} className="!border-red-200">
              <div className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0"><AlertTriangle className="w-4 h-4" /></span>
                <div className="min-w-0">
                  <h4 className="font-semibold text-sm">Interaction détectée</h4>
                  <p className={`text-xs mt-1 ${sub}`}>{interactionMeds.map((m) => m.n).join(', ')} — consultez votre médecin.</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
