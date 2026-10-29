import React, { useMemo, useState } from 'react';
import { Heart, HeartPulse, Droplet, Thermometer, TrendingUp, TrendingDown, Plus, Activity } from 'lucide-react';
import { patientApi } from '../../api/patientApi.js';
import { formatDate, formatShortDate } from '../../utils/format.js';
import { PatientModal } from '../../components/PatientModal.jsx';
import { searchableDate, useSearch, useUrlQuery } from '../../utils/search.js';
import {
  Button, Card, CardTitle, EmptyState, Highlight, IconBadge, NoResults, PageHeader, Pills, SearchInput, StatTile, inputClass,
} from '../../components/patient/ui.jsx';

const byDate = (a, b) => new Date(a.measuredAt) - new Date(b.measuredAt);
const typeConfig = {
  blood_pressure: { label: 'Tension artérielle', unit: 'mmHg', icon: HeartPulse,  normal: '12/8', ref: '< 14/9' },
  blood_glucose:  { label: 'Glycémie',           unit: 'g/L',  icon: Droplet,     normal: '0.70–1.10', ref: '0,70–1,10' },
  heart_rate:     { label: 'Fréquence cardiaque',unit: 'bpm',  icon: Heart,       normal: '60–100', ref: '60–100' },
  temperature:    { label: 'Température',        unit: '°C',   icon: Thermometer, normal: '36.1–37.2', ref: '36,1–37,2' },
};
// Affichage : virgule décimale française (la tension reste « 12/8 »).
const show = (v) => (v == null || v === '' ? '—' : String(v).replace('.', ','));

// Champs cherchables de l'historique des mesures, du plus au moins important.
const FIELDS = (v) => {
  const c = typeConfig[v.type];
  return [c?.label || v.type, `${show(v.value)} ${v.value ?? ''} ${c?.unit || ''}`, searchableDate(v.measuredAt)];
};

const fr = (n, digits = 1) => (Number.isFinite(n) ? n.toLocaleString('fr-FR', { maximumFractionDigits: digits }) : '—');

export default function PVitals({ data, onAddVital, notify, card, sub, border, darkMode }) {
  const [activeType, setActiveType] = useState('blood_pressure');
  const [range, setRange]           = useState(30);
  const [showAdd, setShowAdd]       = useState(false);
  const [addForm, setAddForm]       = useState({ type: 'blood_pressure', value: '' });
  const [saving, setSaving]         = useState(false);
  const [query, setQuery]           = useUrlQuery();
  // Historique : constante choisie ou toutes (toutes d'emblée si on arrive avec une recherche globale).
  const [scope, setScope]           = useState(() => (query ? 'all' : 'current'));

  const allVitals = data ?? [];
  const typeVitals = allVitals
    .filter(v => v.type === activeType)
    .sort(byDate)
    .slice(-range);

  const cfg = typeConfig[activeType];

  // Historique complet (plus récent d'abord), recherché puis restreint à la constante choisie.
  const history = useMemo(() => [...(data ?? [])].sort((a, b) => byDate(b, a)), [data]);
  const found = useSearch(history, query, FIELDS);
  const historyRows = scope === 'current' ? found.filter(v => v.type === activeType) : found;

  const toNum = (v) => {
    if (activeType === 'blood_pressure') return Number(String(v).split('/')[0]);
    return Number(v);
  };

  const nums = typeVitals.map(v => toNum(v.value)).filter(n => Number.isFinite(n));
  const minV = nums.length ? Math.min(...nums) : 0;
  const maxV = nums.length ? Math.max(...nums) : 1;
  const pad  = Math.max((maxV - minV) * 0.2, 1);
  const yMin = minV - pad;
  const yMax = maxV + pad;

  const W = 600, H = 180;
  const points = typeVitals.map((v, i) => {
    const x = typeVitals.length < 2 ? W / 2 : (i / (typeVitals.length - 1)) * (W - 40) + 20;
    const n = toNum(v.value);
    const y = Number.isFinite(n) ? (H - 24) - ((n - yMin) / (yMax - yMin)) * (H - 44) : H / 2;
    return { x, y, v, raw: v };
  });

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
  const area = points.length > 1
    ? `M${points[0].x},${H - 24} ` + points.map(p => `L${p.x},${p.y}`).join(' ') + ` L${points[points.length-1].x},${H - 24} Z`
    : '';

  const latest = typeVitals.at(-1);
  const latestNum = latest ? toNum(latest.value) : null;
  const prev     = typeVitals.at(-2);
  const prevNum  = prev ? toNum(prev.value) : null;
  const trend    = latestNum && prevNum ? (latestNum > prevNum ? 'up' : latestNum < prevNum ? 'down' : 'flat') : 'flat';

  const saveVital = async () => {
    if (!addForm.value.trim()) return;
    setSaving(true);
    try {
      await patientApi.addVital({ type: addForm.type, value: addForm.value });
      const fresh = await patientApi.vitals();
      onAddVital?.(fresh);
      notify?.('Mesure enregistrée');
      setShowAdd(false);
      setAddForm({ type: 'blood_pressure', value: '' });
    } catch (e) {
      notify?.(e.message || 'Erreur', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!data) return (
    <div className="space-y-5">
      <PageHeader title="Mes constantes" sub={sub} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[0, 1, 2, 3].map(i => <div key={i} className={`animate-pulse h-32 rounded-3xl ${darkMode ? 'bg-slate-800' : 'bg-red-50'}`} />)}
      </div>
      <Card darkMode={darkMode}><div className={`animate-pulse h-48 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-red-50'}`} /></Card>
    </div>
  );

  const axis = darkMode ? '#94a3b8' : '#64748b';
  const grid = darkMode ? '#1e293b' : '#fee2e2';

  return (
    <div className="space-y-5">
      <PageHeader title="Mes constantes" sub={sub}
        subtitle={`${typeVitals.length} mesure${typeVitals.length > 1 ? 's' : ''} · ${cfg.label}`}
        actions={<Button Icon={Plus} onClick={() => setShowAdd(true)}>Ajouter une mesure</Button>} />

      {showAdd && (
        <PatientModal title="Nouvelle mesure" onClose={() => setShowAdd(false)} card={card} darkMode={darkMode} maxWidth="max-w-sm">
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-slate-500">Constante</span>
              <select value={addForm.type} onChange={e => setAddForm(f => ({ ...f, type: e.target.value, value: '' }))}
                className={`mt-1 ${inputClass(darkMode)}`}>
                {Object.entries(typeConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-500">Valeur ({typeConfig[addForm.type].unit})</span>
              <input value={addForm.value} onChange={e => setAddForm(f => ({ ...f, value: e.target.value }))}
                placeholder={typeConfig[addForm.type].normal} onKeyDown={e => e.key === 'Enter' && saveVital()}
                className={`mt-1 ${inputClass(darkMode)}`} />
              <span className={`block text-xs ${sub} mt-1.5`}>Format attendu : {typeConfig[addForm.type].normal} {typeConfig[addForm.type].unit}</span>
            </label>
            <div className="flex gap-2 pt-1">
              <Button variant="secondary" darkMode={darkMode} className="flex-1" onClick={() => setShowAdd(false)}>Annuler</Button>
              <Button className="flex-1" onClick={saveVital} disabled={saving || !addForm.value.trim()}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        </PatientModal>
      )}

      {/* Sélecteur de constante : la tuile choisie est en rouge plein. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {Object.entries(typeConfig).map(([type, c]) => {
          const typeLatest = allVitals.filter(v => v.type === type).sort(byDate).at(-1);
          return (
            <StatTile key={type} label={c.label} Icon={c.icon} darkMode={darkMode}
              highlight={activeType === type} onClick={() => setActiveType(type)}
              value={typeLatest ? show(typeLatest.value) : '—'} unit={typeLatest ? c.unit : undefined}
              hint={typeLatest ? formatShortDate(typeLatest.measuredAt) : 'Aucune mesure'} />
          );
        })}
      </div>

      <Card darkMode={darkMode}>
        <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
          <div>
            <p className={`text-sm font-medium ${sub}`}>{cfg.label} · dernière mesure</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-3xl font-bold tabular-nums">{show(latest?.value)}</span>
              {latest && <span className={`text-sm ${sub}`}>{cfg.unit}</span>}
              {trend === 'up'   && <TrendingUp className="w-4 h-4 text-red-600 self-center" aria-label="En hausse" />}
              {trend === 'down' && <TrendingDown className="w-4 h-4 text-slate-500 self-center" aria-label="En baisse" />}
            </div>
            {latest && <p className={`text-xs ${sub} mt-0.5`}>{formatDate(latest.measuredAt)}</p>}
          </div>
          <Pills darkMode={darkMode} value={range} onChange={setRange}
            options={[[7, '7 dernières'], [14, '14 dernières'], [30, '30 dernières']]} />
        </div>

        {typeVitals.length < 2 ? (
          <div className={`flex items-center justify-center h-32 rounded-2xl border border-dashed ${darkMode ? 'border-slate-700' : 'border-red-100'}`}>
            <p className={`text-sm ${sub}`}>Pas assez de données : ajoutez au moins deux mesures.</p>
          </div>
        ) : (
          <div className="w-full">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minHeight: '140px' }} role="img" aria-label={`Évolution : ${cfg.label}`}>
              {[0, 0.5, 1].map(t => {
                const y = 20 + t * (H - 44);
                return <line key={t} x1="20" x2={W - 20} y1={y} y2={y} stroke={grid} strokeDasharray="4 4" />;
              })}
              {area && <path d={area} fill="#dc2626" fillOpacity={darkMode ? 0.15 : 0.07} />}
              {points.length > 1 && <polyline points={polyline} fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
              {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 5 : 3.5} fill="#dc2626" stroke={darkMode ? '#0f172a' : 'white'} strokeWidth="2">
                  <title>{`${show(p.v.value)} ${cfg.unit} · ${formatDate(p.v.measuredAt)}`}</title>
                </circle>
              ))}
              <text x={points[0].x} y={H - 4} textAnchor="start" fontSize="11" fill={axis}>{formatShortDate(typeVitals[0].measuredAt)}</text>
              <text x={points[points.length-1].x} y={H - 4} textAnchor="end" fontSize="11" fill={axis}>{formatShortDate(typeVitals.at(-1).measuredAt)}</text>
            </svg>
          </div>
        )}

        <dl className={`mt-4 pt-4 border-t ${darkMode ? 'border-slate-800' : 'border-slate-100'} grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm`}>
          <div><dt className="text-xs text-slate-500">Valeurs normales</dt><dd className="font-semibold mt-0.5">{cfg.ref} {cfg.unit}</dd></div>
          <div><dt className="text-xs text-slate-500">Minimum</dt><dd className="font-semibold mt-0.5 tabular-nums">{nums.length ? fr(Math.min(...nums)) : '—'}</dd></div>
          <div><dt className="text-xs text-slate-500">Maximum</dt><dd className="font-semibold mt-0.5 tabular-nums">{nums.length ? fr(Math.max(...nums)) : '—'}</dd></div>
          <div><dt className="text-xs text-slate-500">Moyenne</dt><dd className="font-semibold mt-0.5 tabular-nums">{nums.length ? fr(nums.reduce((a, b) => a + b, 0) / nums.length) : '—'}</dd></div>
        </dl>
        {activeType === 'blood_pressure' && nums.length > 0 && <p className={`text-xs mt-2 ${sub}`}>Statistiques calculées sur la systolique.</p>}
      </Card>

      <Card darkMode={darkMode} className="!p-0 overflow-hidden">
        <div className="px-5 pt-5">
          <CardTitle Icon={Activity}>Historique des mesures</CardTitle>
          {history.length > 0 && (
            <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
              <SearchInput value={query} onChange={setQuery} count={historyRows.length} darkMode={darkMode} className="w-full lg:max-w-md"
                placeholder="Rechercher une valeur, une date, une constante…" />
              <div className="lg:ml-auto">
                <Pills darkMode={darkMode} value={scope} onChange={setScope} options={[
                  ['current', cfg.label, found.filter(v => v.type === activeType).length],
                  ['all', 'Toutes les constantes', found.length],
                ]} />
              </div>
            </div>
          )}
        </div>
        {history.length === 0 || (!query && historyRows.length === 0) ? (
          <div className="px-5 pb-5">
            <EmptyState title="Aucune mesure" darkMode={darkMode}
              action={<Button Icon={Plus} onClick={() => setShowAdd(true)}>Ajouter une mesure</Button>}>
              {history.length === 0 ? 'Enregistrez votre première mesure pour suivre son évolution.' : `Aucune mesure de ${cfg.label.toLowerCase()} pour le moment.`}
            </EmptyState>
          </div>
        ) : historyRows.length === 0 ? (
          <div className="px-5 pb-5"><NoResults query={query} onClear={() => setQuery('')} darkMode={darkMode} /></div>
        ) : (
          <>
            <div className={`hidden sm:grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_9rem] gap-4 px-5 py-3 text-xs font-semibold text-slate-500 ${darkMode ? 'bg-slate-800/40' : 'bg-red-50/50'}`}>
              <span>Constante</span><span>Date</span><span className="text-right">Valeur</span>
            </div>
            <ul className={`max-h-96 overflow-y-auto divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
              {historyRows.map((v, i) => {
                const c = typeConfig[v.type] || { label: v.type, unit: '', icon: Activity };
                return (
                  <li key={v.id ?? `${v.type}-${v.measuredAt}-${i}`} className="px-5 py-3 flex sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_9rem] items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <IconBadge Icon={c.icon} size="sm" solid={i === 0 && !query} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate"><Highlight text={c.label} query={query} /></p>
                        <p className={`text-xs sm:hidden ${sub}`}><Highlight text={formatDate(v.measuredAt)} query={query} /></p>
                      </div>
                    </div>
                    <span className={`hidden sm:block text-sm ${sub}`}><Highlight text={formatDate(v.measuredAt)} query={query} /></span>
                    <span className={`text-sm font-semibold tabular-nums text-right whitespace-nowrap ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      <Highlight text={show(v.value)} query={query} /> <span className="font-normal text-slate-500">{c.unit}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
