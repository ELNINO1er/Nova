import React, { useEffect, useState } from 'react';
import { Activity, BarChart3, Building2, ClipboardList, FlaskConical, Pill, RefreshCw, Stethoscope, Users } from 'lucide-react';
import { governorApi } from '../api/governorApi.js';
import PageError from '../components/PageError.jsx';
import { ColumnChart, DashHeader, Empty, GhostButton, KpiCard, LineChart, MONTHS, Panel } from '../components/dashboard/kit.jsx';

// Espace gouverneur (autorité sanitaire) : statistiques agrégées en lecture seule.
export default function GovernorPages({ card, sub, darkMode }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [filters,setFilters]=useState({from:new Date(Date.now()-29*86400000).toISOString().slice(0,10),to:new Date().toISOString().slice(0,10),city:''});
  const exportReport=async()=>{try{const r=await governorApi.report(filters);const url=URL.createObjectURL(new Blob([r.content],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=r.filename;a.click();URL.revokeObjectURL(url);}catch(e){setError(e.message);}};

  const load = () => {
    setError('');
    governorApi.dashboard(filters).then(setData).catch((err) => setError(err.message || 'Chargement impossible.'));
  };
  useEffect(load, []);

  if (error && !data) return <PageError message={error} onRetry={load} card={card} sub={sub} />;
  if (!data) {
    return <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">{[0, 1, 2, 3].map((i) => <div key={i} className={`h-32 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />)}</div>;
  }

  const k = data.kpis;
  const n = (v) => v == null ? 'Masqué' : Number(v).toLocaleString('fr-FR');
  const monthly = (data.monthlyConsultations || []).filter(m=>m.consultations!==null).map((m) => {
    const [y, mo] = m.month.split('-').map(Number);
    return { label: MONTHS[mo - 1].slice(0, 4), full: `${MONTHS[mo - 1]} ${y}`, value: m.consultations };
  });
  const sexLabel = { M: 'Hommes', F: 'Femmes' };
  const sexes = data.sexes || [];
  const totalSex = sexes.some(r=>r.patients===null)?null:sexes.reduce((s, r) => s + r.patients, 0);

  return (
    <div className="space-y-5">
      <DashHeader
        title="Statistiques de santé"
        subtitle={`Données NOVA agrégées, petits effectifs masqués · mises à jour le ${new Date(data.generatedAt).toLocaleString('fr-FR')}`}
        actions={<GhostButton Icon={RefreshCw} onClick={load} darkMode={darkMode}>Actualiser</GhostButton>}
      />

      {error && <p role="alert" className="text-red-700">{error}</p>}
      <form onSubmit={e=>{e.preventDefault();load();}} className={`${card} p-4 rounded-xl flex flex-wrap gap-3 items-end`}>
       <label>Du <input type="date" required value={filters.from} onChange={e=>setFilters({...filters,from:e.target.value})} /></label>
       <label>Au <input type="date" required max={new Date().toISOString().slice(0,10)} value={filters.to} onChange={e=>setFilters({...filters,to:e.target.value})} /></label>
       <label>Ville <select value={filters.city} onChange={e=>setFilters({...filters,city:e.target.value})}><option value="">Toutes les villes</option>{data.availableCities?.map(c=><option key={c}>{c}</option>)}</select></label>
       <button className="bg-red-600 text-white px-4 py-2 rounded-lg">Appliquer</button><button type="button" onClick={exportReport}>Exporter le rapport agrégé</button>
      </form>
      <details className={`${card} p-4 rounded-xl`}><summary>Méthodologie et qualité des données</summary><p>{data.methodology?.coverage}</p><p>{data.methodology?.scope}</p><p>{data.methodology?.suppression}</p><p>Ces tendances ne constituent pas des alertes sanitaires validées.</p>{Object.entries(data.methodology?.definitions||{}).map(([key,value])=><p key={key}>{value}</p>)}</details>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Patients inscrits" Icon={Users} value={n(k.patients)} hint="Dossiers enregistrés" card={card} sub={sub} />
        <KpiCard label="Médecins" Icon={Stethoscope} value={n(k.doctors)} hint="Professionnels inscrits" card={card} sub={sub} />
        <KpiCard label="Pharmacies" Icon={Building2} value={n(k.pharmacies)} hint="Officines partenaires" card={card} sub={sub} />
        <KpiCard label="Consultations" Icon={Activity} value={n(k.consultations30)} hint="Période sélectionnée" card={card} sub={sub} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        <div className="xl:col-span-2 space-y-5">
          <Panel title="Consultations par mois" subtitle="Période sélectionnée ; valeurs masquées exclues" card={card} sub={sub}>
            {monthly.length >= 2 ? <LineChart data={monthly} valueLabel="consultation(s)" min={0} darkMode={darkMode} />
              : monthly.length === 1 ? <ColumnChart data={monthly} valueLabel="consultation(s)" darkMode={darkMode} />
                : <Empty sub={sub}>Pas encore de consultations.</Empty>}
          </Panel>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Panel title="Patients par ville" card={card} sub={sub}>
              {data.cities.length ? <ColumnChart data={data.cities.filter(c=>c.patients!==null).map((c) => ({ label: c.city, value: c.patients }))} valueLabel="patient(s)" darkMode={darkMode} /> : <Empty sub={sub}>Aucune donnée.</Empty>}
            </Panel>
            <Panel title="Patients par tranche d’âge" card={card} sub={sub}>
              {data.ageBands.length ? <ColumnChart data={data.ageBands.filter(a=>a.patients!==null).map((a) => ({ label: a.band.replace(' ans', ''), full: a.band, value: a.patients }))} valueLabel="patient(s)" darkMode={darkMode} /> : <Empty sub={sub}>Aucune donnée.</Empty>}
            </Panel>
          </div>
        </div>

        <div className="space-y-5">
          <Panel title="Activité sur la période" card={card} sub={sub}>
            {[
              [ClipboardList, 'Ordonnances émises', k.prescriptions30],
              [Pill, 'Délivrances en pharmacie', k.dispenses30],
              [BarChart3, 'Rendez-vous', k.appointments30],
              [FlaskConical, 'Examens demandés', k.labRequests30],
            ].map(([Icon, label, value]) => (
              <div key={label} className={`flex items-center gap-3 py-3 border-b last:border-0 ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <span className="w-9 h-9 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0"><Icon className="w-4 h-4" /></span>
                <span className="text-sm flex-1">{label}</span>
                <span className="text-lg font-bold">{n(value)}</span>
              </div>
            ))}
          </Panel>
          <Panel title="Répartition par sexe" card={card} sub={sub}>
            {sexes.length === 0 ? <Empty sub={sub}>Aucune donnée.</Empty> : (
              <>
                <div className={`flex h-3 rounded-full overflow-hidden gap-0.5 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  {sexes.map((r, i) => <div key={r.sex} className={['bg-red-600', 'bg-red-300', 'bg-slate-300'][i] || 'bg-slate-300'} style={{ width: `${totalSex ? (r.patients / totalSex) * 100 : 0}%` }} />)}
                </div>
                <ul className="mt-3 space-y-1.5">
                  {sexes.map((r, i) => (
                    <li key={r.sex} className="flex items-center gap-2 text-sm">
                      <span className={`w-2.5 h-2.5 rounded-full ${['bg-red-600', 'bg-red-300', 'bg-slate-300'][i] || 'bg-slate-300'}`} />
                      <span className="flex-1">{sexLabel[r.sex] || 'Non renseigné'}</span>
                      <span className="font-semibold">{n(r.patients)}</span>
                      <span className={`text-xs w-10 text-right ${sub}`}>{totalSex ? `${Math.round((r.patients / totalSex) * 100)} %` : '—'}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Panel>
          <Panel title="Médecins par spécialité" card={card} sub={sub}>
            {data.specialties.length === 0 ? <Empty sub={sub}>Aucune donnée.</Empty> : (
              <ul className="space-y-2">
                {data.specialties.map((s) => (
                  <li key={s.specialty} className="flex items-center justify-between text-sm">
                    <span className="truncate">{s.specialty}</span><span className="font-semibold">{n(s.doctors)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
