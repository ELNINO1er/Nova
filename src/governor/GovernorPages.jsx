import React, { useEffect, useState } from 'react';
import { Activity, BarChart3, Building2, ClipboardList, FlaskConical, Pill, Stethoscope, Users } from 'lucide-react';
import { governorApi } from '../api/governorApi.js';
import PageError from '../components/PageError.jsx';

// Espace gouverneur (autorité sanitaire) : statistiques agrégées en lecture seule.
export default function GovernorPages({ card, sub, darkMode }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    governorApi.dashboard().then(setData).catch((err) => setError(err.message || 'Chargement impossible.'));
  };
  useEffect(load, []);

  if (error && !data) return <PageError message={error} onRetry={load} card={card} sub={sub} />;
  if (!data) {
    return <div className="space-y-4 animate-pulse">{[0, 1, 2].map((i) => <div key={i} className={`h-28 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />)}</div>;
  }

  const k = data.kpis;
  const kpis = [
    { l: 'Patients inscrits', v: k.patients, I: Users, c: 'text-blue-600' },
    { l: 'Médecins', v: k.doctors, I: Stethoscope, c: 'text-emerald-600' },
    { l: 'Pharmacies', v: k.pharmacies, I: Building2, c: 'text-teal-600' },
    { l: 'Consultations (30 j)', v: k.consultations30, I: Activity, c: 'text-red-600' },
    { l: 'Ordonnances (30 j)', v: k.prescriptions30, I: ClipboardList, c: 'text-amber-600' },
    { l: 'Délivrances (30 j)', v: k.dispenses30, I: Pill, c: 'text-purple-600' },
    { l: 'Rendez-vous (30 j)', v: k.appointments30, I: BarChart3, c: 'text-indigo-600' },
    { l: 'Examens demandés (30 j)', v: k.labRequests30, I: FlaskConical, c: 'text-cyan-600' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Statistiques de santé</h2>
        <p className={`text-sm ${sub}`}>Données agrégées et anonymes · mises à jour le {new Date(data.generatedAt).toLocaleString('fr-FR')}</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(({ l, v, I, c }) => (
          <div key={l} className={`${card} border rounded-2xl p-4`}>
            <I className={`w-5 h-5 ${c}`} />
            <p className="text-2xl font-bold mt-2">{Number(v || 0).toLocaleString('fr-FR')}</p>
            <p className={`text-xs ${sub}`}>{l}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Bars title="Patients par ville" rows={data.cities} label="city" value="patients" card={card} sub={sub} darkMode={darkMode} />
        <Bars title="Patients par tranche d’âge" rows={data.ageBands} label="band" value="patients" card={card} sub={sub} darkMode={darkMode} />
        <Bars title="Patients par sexe" rows={data.sexes.map((r) => ({ ...r, sex: r.sex === 'M' ? 'Hommes' : r.sex === 'F' ? 'Femmes' : 'Non renseigné' }))} label="sex" value="patients" card={card} sub={sub} darkMode={darkMode} />
        <Bars title="Médecins par spécialité" rows={data.specialties} label="specialty" value="doctors" card={card} sub={sub} darkMode={darkMode} />
        <Bars title="Consultations par mois (6 mois)" rows={data.monthlyConsultations} label="month" value="consultations" card={card} sub={sub} darkMode={darkMode} />
      </div>
    </div>
  );
}

function Bars({ title, rows, label, value, card, sub, darkMode }) {
  const max = Math.max(1, ...rows.map((r) => r[value]));
  return (
    <div className={`${card} border rounded-2xl p-5`}>
      <h3 className="font-bold text-sm mb-3">{title}</h3>
      {rows.length === 0 ? <p className={`text-xs ${sub}`}>Pas encore de données.</p> : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r[label]} className="flex items-center gap-3 text-xs">
              <span className="w-32 truncate">{r[label]}</span>
              <div className={`flex-1 h-2.5 rounded-full ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <div className="h-full rounded-full bg-red-600" style={{ width: `${(r[value] / max) * 100}%` }} />
              </div>
              <span className="w-10 text-right font-semibold">{r[value]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
