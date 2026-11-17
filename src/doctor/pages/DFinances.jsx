import React from 'react';
import { AlertCircle, BarChart3, FileDown, TrendingUp, Wallet, Banknote } from 'lucide-react';

const monthLabel = (ym) => {
  const d = new Date(`${ym}-01T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? ym : d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric', timeZone: 'UTC' });
};

export default function DFinances({ data, loading, card, sub, darkMode, setPage }) {
  if (loading || !data) return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0,1,2,3].map(i => <div key={i} className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-28 rounded-2xl`} />)}
      </div>
      <div className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-64 rounded-2xl`} />
    </div>
  );

  const { consultationFee, totalConsultations, monthConsultations, estimatedMonthRevenue, estimatedTotalRevenue, activePrescriptions, paidTotal = 0, paidCount = 0, monthlyData = [] } = data;
  const hasFee = Number(consultationFee) > 0;
  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n || 0);
  const maxCount = Math.max(...monthlyData.map(m => m.count), 1);

  // Classes écrites en entier (Tailwind ne génère pas les classes construites dynamiquement).
  const kpis = [
    { l: 'Estimation ce mois', v: hasFee ? `${fmt(estimatedMonthRevenue)} FCFA` : '—', s: `${monthConsultations} compte${monthConsultations > 1 ? 's' : ''} rendu${monthConsultations > 1 ? 's' : ''} validé${monthConsultations > 1 ? 's' : ''}`, I: TrendingUp },
    { l: 'Estimation totale', v: hasFee ? `${fmt(estimatedTotalRevenue)} FCFA` : '—', s: `${totalConsultations} au total`, I: BarChart3 },
    { l: 'Paiements encaissés', v: `${fmt(paidTotal)} FCFA`, s: `${paidCount} paiement${paidCount > 1 ? 's' : ''} enregistré${paidCount > 1 ? 's' : ''}`, I: Banknote },
    { l: 'Ordonnances actives', v: activePrescriptions, s: 'Encore valables', I: FileDown },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Activité et revenus</h2>
        <p className={`text-sm ${sub}`}>Estimations : votre tarif multiplié par les comptes rendus validés. Les paiements encaissés sont comptés à part.</p>
      </div>

      {!hasFee && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 text-amber-900 p-4 flex items-start gap-3 text-sm">
          <Wallet className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p>Aucun tarif de consultation renseigné : les estimations ne peuvent pas être calculées.{' '}
            {setPage && <button type="button" onClick={() => setPage('profile')} className="font-semibold underline">Renseigner mon tarif</button>}</p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.l} className={`${card} border rounded-2xl p-4`}>
            <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center mb-2">
              <k.I className="w-4 h-4 text-red-600" aria-hidden="true" />
            </div>
            <p className={`text-xs ${sub}`}>{k.l}</p>
            <p className="text-lg font-black mt-0.5 leading-tight">{k.v}</p>
            <p className="text-xs mt-0.5 text-red-700 font-semibold">{k.s}</p>
          </div>
        ))}
      </div>

      <div className={`${card} border rounded-2xl p-5`}>
        <h3 className="font-bold mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-red-600" aria-hidden="true" /> Comptes rendus validés par mois</h3>
        {monthlyData.length === 0 ? (
          <p className={`text-sm ${sub} text-center py-8`}>Pas encore de données</p>
        ) : (
          <div className="space-y-2">
            {monthlyData.map((m) => (
              <div key={m.month} className="flex items-center gap-3">
                <p className={`text-xs font-semibold w-20 flex-shrink-0 capitalize ${sub}`}>{monthLabel(m.month)}</p>
                <div className={`flex-1 h-7 rounded-lg overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <div className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center px-2"
                    style={{ width: `${(m.count / maxCount) * 100}%`, minWidth: m.count > 0 ? '2.5rem' : '0' }}>
                    {m.count > 0 && <span className="text-[10px] font-bold text-white truncate">{m.count}</span>}
                  </div>
                </div>
                <p className={`text-xs font-bold w-28 text-right flex-shrink-0 ${hasFee ? 'text-red-700' : sub}`}>
                  {hasFee ? `≈ ${fmt(m.revenue)} FCFA` : '—'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={`${card} border rounded-2xl p-4 flex items-start gap-3`}>
        <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${sub}`} aria-hidden="true" />
        <p className={`text-xs ${sub}`}>
          Les estimations ne sont pas une comptabilité : elles supposent que chaque compte rendu validé a été réglé au tarif {hasFee ? `de ${fmt(consultationFee)} FCFA` : 'renseigné'}.
          Seuls les « paiements encaissés » correspondent à des règlements enregistrés dans NOVA.
        </p>
      </div>
    </div>
  );
}
