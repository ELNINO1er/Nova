import React from 'react';
import { Shield, FileText, CheckCircle2, Stethoscope, Percent, CalendarClock } from 'lucide-react';
import { searchableDate, useSearch, useUrlQuery } from '../../utils/search.js';
import { Card, CardTitle, Chip, EmptyState, Field, Highlight, NoResults, PageHeader, SearchInput, StatTile } from '../../components/patient/ui.jsx';

/* Champs cherchables d'une couverture, du plus au moins important. */
const statusLabel = (ins) => (ins.status === 'active' ? 'Actif' : 'Expiré');
const INSURANCE_FIELDS = (ins) => [ins.provider, ins.policyNumber, ins.holderName, ins.coverageType, statusLabel(ins), searchableDate(ins.validTo)];

const fmtDate = (v, month = 'long') => (v ? new Date(v).toLocaleDateString('fr-FR', { day: '2-digit', month, year: 'numeric' }) : '—');

export default function PInsurance({ data, card, sub, border, darkMode }) {
  const [query, setQuery] = useUrlQuery();
  const results = useSearch(data, query, INSURANCE_FIELDS);

  if (!data) return (
    <div className="space-y-5">
      <PageHeader title="Mes assurances" sub={sub} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[0, 1].map(i => (
          <Card key={i} darkMode={darkMode}><div className={`animate-pulse h-40 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-red-50'}`} /></Card>
        ))}
      </div>
    </div>
  );

  const totalRate = data.length ? Math.round(data.reduce((s, i) => s + (Number(i.reimbursementRate) || 0), 0) / data.length) : 0;
  const activeCount = data.filter((i) => i.status === 'active').length;
  // Prochaine échéance parmi les couvertures actives.
  const nextEnd = data
    .filter((i) => i.status === 'active' && i.validTo)
    .map((i) => i.validTo)
    .sort((a, b) => new Date(a) - new Date(b))[0];
  const line = darkMode ? 'border-slate-800' : 'border-slate-100';
  const hl = (text) => <Highlight text={text} query={query} />;

  return (
    <div className="space-y-5">
      <PageHeader title="Mes assurances" subtitle="Couvertures santé et remboursements" sub={sub} />

      {data.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <StatTile label="Taux moyen de remboursement" value={totalRate} unit="%" Icon={Percent} highlight darkMode={darkMode} />
          <StatTile label="Couvertures actives" value={activeCount} unit={`sur ${data.length}`} Icon={Shield} darkMode={darkMode} />
          <StatTile label="Prochaine échéance" value={nextEnd ? new Date(nextEnd).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).replace('.', '') : '—'}
            hint={nextEnd ? new Date(nextEnd).getFullYear() : 'Aucune couverture active'} Icon={CalendarClock} darkMode={darkMode} />
        </div>
      )}

      {data.length === 0 ? (
        <EmptyState Icon={Shield} title="Aucune assurance enregistrée" darkMode={darkMode} />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <h3 className="font-semibold flex-1">Mes couvertures</h3>
            <SearchInput value={query} onChange={setQuery} count={results.length} darkMode={darkMode} className="w-full sm:w-80"
              placeholder="Assureur, n° de police, titulaire…" label="Rechercher une assurance" />
          </div>

          {results.length === 0 ? (
            <NoResults query={query} onClear={() => setQuery('')} darkMode={darkMode} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {results.map((ins) => {
                const isActive = ins.status === 'active';
                const rate = Math.max(0, Math.min(100, Number(ins.reimbursementRate) || 0));
                return (
                  <Card key={ins.id} darkMode={darkMode} className="!p-0 overflow-hidden">
                    <div className="p-5 flex items-start gap-4">
                      <span className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 ${isActive ? 'bg-red-600 text-white' : darkMode ? 'bg-red-950/40 text-red-300' : 'bg-red-50 text-red-700'}`}>
                        {(ins.provider || '').slice(0, 2).toUpperCase()}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-lg min-w-0 break-words">{hl(ins.provider)}</p>
                          <Chip tone={isActive ? 'watch' : 'neutral'}>{statusLabel(ins)}</Chip>
                        </div>
                        <p className={`text-xs font-mono mt-0.5 break-all ${sub}`}>N° {hl(ins.policyNumber)}</p>
                      </div>
                    </div>

                    <dl className={`grid grid-cols-2 gap-x-6 gap-y-4 px-5 py-4 border-t ${line}`}>
                      <Field label="Titulaire">{ins.holderName ? hl(ins.holderName) : null}</Field>
                      <Field label="Couverture">{ins.coverageType ? hl(ins.coverageType) : null}</Field>
                      <Field label="Début">{fmtDate(ins.validFrom, 'short')}</Field>
                      <Field label="Fin">{fmtDate(ins.validTo, 'short')}</Field>
                    </dl>

                    <div className={`px-5 py-4 border-t ${line}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-500">Taux de remboursement</span>
                        <span className="text-sm font-bold text-red-700 tabular-nums">{ins.reimbursementRate}%</span>
                      </div>
                      <div className={`w-full h-2 rounded-full ${darkMode ? 'bg-slate-800' : 'bg-red-50'}`} role="progressbar" aria-valuenow={rate} aria-valuemin={0} aria-valuemax={100} aria-label={`Taux de remboursement ${ins.provider || ''}`}>
                        <div className="h-2 rounded-full bg-red-600" style={{ width: `${rate}%` }} />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Infos remboursement */}
      <Card darkMode={darkMode}>
        <CardTitle Icon={CheckCircle2}>Processus de remboursement</CardTitle>
        <ol className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { step: '1', title: 'Consultation',  desc: 'Demandez une fiche de soins lors de votre visite', icon: Stethoscope },
            { step: '2', title: 'Soumission',    desc: 'Envoyez les justificatifs à votre assureur',      icon: FileText },
            { step: '3', title: 'Remboursement', desc: 'Sous 5 à 10 jours ouvrés selon votre contrat',    icon: CheckCircle2 },
          ].map(({ step, title, desc }) => (
            <li key={step} className={`flex gap-3 p-4 rounded-2xl border ${darkMode ? 'border-slate-800' : 'border-red-100 bg-white'}`}>
              <span className="w-8 h-8 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{step}</span>
              <div>
                <p className="font-semibold text-sm">{title}</p>
                <p className={`text-xs mt-0.5 ${sub}`}>{desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
