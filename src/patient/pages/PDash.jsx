import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowUpRight, Calendar, ChevronLeft, ChevronRight, Droplet, Heart, MapPin, Phone, QrCode,
  RefreshCw, Thermometer, Video,
} from 'lucide-react';
import { patientApi } from '../../api/patientApi.js';
import { usePatientPhoto } from '../../utils/photo.js';
import { DashSkeleton } from '../../components/PatientModal.jsx';
import { Avatar, Empty, dayKey, fmtDay, fmtTime, initialsOf } from '../../components/dashboard/kit.jsx';
import { Card, Chip, Pills } from '../../components/patient/ui.jsx';

/*
 * Accueil patient (« Aujourd'hui ») : disposition Nexus en rouge et blanc.
 * Rangée 1 : indicateur de suivi · constantes (graphique à onglets) · profil + rendez-vous (colonne droite)
 * Rangée 2 : tableau à onglets (analyses, ordonnances, prises du jour, historique).
 */
const VITALS = [
  { type: 'blood_pressure', label: 'Tension', Icon: Heart },
  { type: 'blood_glucose', label: 'Glycémie', Icon: Droplet },
  { type: 'heart_rate', label: 'Pouls', Icon: Activity },
  { type: 'temperature', label: 'Température', Icon: Thermometer },
];
const TABLES = [['labs', 'Analyses'], ['rx', 'Ordonnances'], ['meds', 'Prises du jour'], ['history', 'Historique']];
const list = (r) => (Array.isArray(r) ? r : r?.data || []);

const VITAL_STATUS = { normal: ['Normal', 'neutral'], watch: ['À surveiller', 'watch'], critical: ['Critique', 'alert'] };



/* Demi-jauge de l'indicateur de suivi (0–100). */
function SemiGauge({ value, darkMode }) {
  const r = 80; const len = Math.PI * r;
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value)) / 100;
  return (
    <svg viewBox="0 0 200 108" className="w-full max-w-[15rem] mx-auto" aria-hidden="true">
      <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke={darkMode ? '#1e293b' : '#fee2e2'} strokeWidth="14" strokeLinecap="round" />
      <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#dc2626" strokeWidth="14" strokeLinecap="round"
        strokeDasharray={len} strokeDashoffset={len * (1 - pct)} style={{ transition: 'stroke-dashoffset .8s ease' }} />
    </svg>
  );
}

/* Colonnes des dernières mesures : la plus récente en rouge plein, repère pointillé à sa hauteur. */
function VitalBars({ points, unit, darkMode, sub }) {
  if (!points.length) return <Empty sub={sub}>Aucune mesure enregistrée pour cette constante.</Empty>;
  const max = Math.max(...points.map((p) => p.value));
  const top = max * 1.2 || 1;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => top * t);
  const fmt = (v) => (top < 10 ? v.toFixed(1) : Math.round(v));
  const last = points[points.length - 1];
  const lastPct = (last.value / top) * 100;
  return (
    <div className="flex gap-3 h-56">
      <div className={`flex flex-col-reverse justify-between text-[11px] tabular-nums pb-6 ${sub}`}>
        {ticks.map((t) => <span key={t}>{fmt(t)}</span>)}
      </div>
      <div className="relative flex-1">
        <div className="absolute inset-x-0 top-0 bottom-6">
          <div className="absolute inset-x-0 border-t border-dashed border-red-300" style={{ bottom: `${lastPct}%` }} />
        </div>
        <div className="absolute inset-0 flex items-end gap-2 sm:gap-3">
          {points.map((p, i) => {
            const isLast = i === points.length - 1;
            const h = (p.value / top) * 100;
            return (
              <div key={p.at} className="flex-1 h-full flex flex-col items-center justify-end group">
                <div className="relative w-full flex-1 flex items-end">
                  {isLast && (
                    <span className="absolute left-1/2 -translate-x-1/2 -translate-y-full -mt-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-[11px] font-semibold whitespace-nowrap" style={{ bottom: `${h}%` }}>
                      {p.label} {unit}
                    </span>
                  )}
                  <div title={`${p.label} ${unit} · ${fmtDay(p.at)}`}
                    className={`w-full rounded-t-xl transition-all duration-500 ${isLast ? 'bg-red-600' : darkMode ? 'bg-red-950/60 border-t-2 border-red-800 group-hover:bg-red-900/70' : 'bg-red-50 border-t-2 border-red-200 group-hover:bg-red-100'}`}
                    style={{ height: `${Math.max(h, 2)}%` }} />
                </div>
                <span className={`h-6 pt-1.5 text-[11px] whitespace-nowrap ${isLast ? 'font-semibold text-red-600' : sub}`}>
                  {new Date(p.at).toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ageOf(birthDate) {
  if (!birthDate) return null;
  const b = new Date(birthDate); const t = new Date();
  return t.getFullYear() - b.getFullYear() - (t < new Date(t.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0);
}

export default function PDash({ data, loading, onRefresh, setPage, setShowQR, setShowVid, card, sub, darkMode }) {
  const [appointments, setAppointments] = useState([]);
  const [history, setHistory] = useState([]);
  const [labs, setLabs] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [error, setError] = useState('');
  const [vital, setVital] = useState('blood_pressure');
  const [table, setTable] = useState('labs');
  const [dayOffset, setDayOffset] = useState(0);
  const [selected, setSelected] = useState(dayKey(new Date()));
  const photoSrc = usePatientPhoto(true);

  useEffect(() => {
    let alive = true;
    setError('');
    const load = (call, set) => call().then((r) => alive && set(list(r))).catch((e) => alive && setError(e.message));
    load(patientApi.appointments, setAppointments);
    load(patientApi.history, setHistory);
    load(patientApi.labResults, setLabs);
    load(patientApi.prescriptions, setPrescriptions);
    return () => { alive = false; };
  }, [data]);

  const upcoming = useMemo(() => appointments
    .filter((a) => a.status !== 'cancelled' && new Date(a.startsAt) >= new Date(new Date().setHours(0, 0, 0, 0)))
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)), [appointments]);
  const marked = useMemo(() => new Set(upcoming.map((a) => dayKey(a.startsAt))), [upcoming]);

  if (!data && loading !== false) return <DashSkeleton card={card} sub={sub} darkMode={darkMode} />;

  const profile = data?.profile;
  const vitals = data?.latestVitals || [];
  const score = data?.healthScore ?? null;
  const scoreLabel = score == null ? 'Données insuffisantes' : score >= 80 ? 'Bon suivi' : score >= 60 ? 'À surveiller' : 'Points d’attention';
  const current = vitals.find((v) => v.type === vital);
  const points = (current?.history || []).slice(-7)
    .map((p) => ({ at: p.measuredAt, value: Number.parseFloat(p.value), label: String(p.value) }))
    .filter((p) => Number.isFinite(p.value));
  if (points.length && current) points[points.length - 1].label = String(current.value);
  const meds = data?.todayMedications || [];
  const medsLeft = meds.filter((m) => m.intake?.status !== 'taken').length;
  const age = ageOf(profile?.birthDate);
  const lastVisit = history.find((h) => h.type === 'consultation');

  const days = Array.from({ length: 5 }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + dayOffset + i); return d; });
  const dayAppointments = upcoming.filter((a) => dayKey(a.startsAt) === selected);
  const shownAppointments = dayAppointments.length ? dayAppointments : upcoming.slice(0, 3);

  const head = `text-left text-xs font-semibold px-4 py-3 ${sub}`;
  const cell = 'px-4 py-3.5';
  const row = `border-t ${darkMode ? 'border-slate-800' : 'border-slate-100'}`;
  const tables = {
    labs: {
      cols: ['Examen', 'Prescrit par', 'Date', 'Laboratoire', 'Résultat'],
      rows: labs.slice(0, 5).map((l) => {
        const abnormal = (l.items || []).some((i) => i.status && i.status !== 'normal');
        return [l.title, l.doctorName || '—', fmtDay(l.performedAt), l.laboratoryName || '—',
          l.status === 'pending' ? <Chip>En attente</Chip> : abnormal ? <Chip tone="watch">À revoir</Chip> : <Chip>Normal</Chip>];
      }),
      page: 'labresults', empty: 'Aucun résultat d’analyse.',
    },
    rx: {
      cols: ['Médicaments', 'Prescrit par', 'Date', 'Validité', 'Statut'],
      rows: prescriptions.slice(0, 5).map((p) => [
        (p.items || []).map((i) => `${i.name} ${i.dosage || ''}`.trim()).join(', ') || 'Ordonnance', p.doctorName || '—', fmtDay(p.issuedAt),
        p.validUntil ? fmtDay(p.validUntil) : '—', p.status === 'active' ? <Chip tone="watch">Active</Chip> : <Chip>{p.status === 'dispensed' ? 'Délivrée' : p.status === 'expired' ? 'Expirée' : 'Terminée'}</Chip>]),
      page: 'prescriptions', empty: 'Aucune ordonnance.',
    },
    meds: {
      cols: ['Médicament', 'Dosage', 'Heure', 'Moment', 'Statut'],
      rows: meds.slice(0, 5).map((m) => [m.name, m.dosage || '—', m.time || '—', m.period || '—',
        m.intake?.status === 'taken' ? <Chip>Pris</Chip> : <Chip tone="alert">À prendre</Chip>]),
      page: 'pilulier', empty: 'Aucune prise prévue aujourd’hui.',
    },
    history: {
      cols: ['Événement', 'Professionnel', 'Date', 'Type', ''],
      rows: history.slice(0, 5).map((h) => [h.title, h.doctorName || '—', fmtDay(h.occurredAt),
        { consultation: 'Consultation', lab: 'Analyse', vaccine: 'Vaccin', prescription: 'Ordonnance' }[h.type] || 'Événement', '']),
      page: 'history', empty: 'Aucun événement enregistré.',
    },
  };
  const t = tables[table];

  return (
    <div className="space-y-5">
      {error && <p role="alert" className="text-sm text-red-700">Certaines données ne sont pas disponibles : {error}</p>}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Bonjour{profile?.firstName ? `, ${profile.firstName}` : ''}</h2>
          <p className={`text-sm mt-1 ${sub}`}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}{medsLeft ? ` · ${medsLeft} prise${medsLeft > 1 ? 's' : ''} à faire aujourd’hui` : ''}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onRefresh} aria-label="Actualiser" className={`w-11 h-11 rounded-full border flex items-center justify-center ${darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 bg-white hover:bg-red-50'}`}><RefreshCw className="w-4 h-4" /></button>
          <button type="button" onClick={() => setShowQR(true)} className="h-11 px-5 rounded-full bg-red-600 hover:bg-red-700 text-white text-sm font-semibold flex items-center gap-2"><QrCode className="w-4 h-4" /> Pass Santé d’urgence</button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        <div className="xl:col-span-8 2xl:col-span-9 space-y-5 min-w-0">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)] gap-5">
            {/* Indicateur de suivi */}
            <Card darkMode={darkMode} className="flex flex-col">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold leading-snug">Suivi de<br />ma santé</h3>
                <button type="button" onClick={() => setPage('vitals')} aria-label="Voir mes constantes" className="flex items-center gap-1 text-sm font-semibold text-red-600"><ArrowUpRight className="w-4 h-4" />{score ?? '—'}</button>
              </div>
              <div className="relative mt-4">
                <SemiGauge value={score} darkMode={darkMode} />
                <div className="absolute inset-x-0 bottom-0 text-center">
                  <p className={`text-[11px] ${sub}`}>Indicateur / 100</p>
                  <p className="text-4xl font-bold tabular-nums leading-tight">{score ?? '—'}</p>
                </div>
              </div>
              <p className="text-center mt-2"><Chip tone={score != null && score < 60 ? 'alert' : score != null && score < 80 ? 'watch' : 'neutral'}>{scoreLabel}</Chip></p>
              <p className={`text-xs text-center mt-4 ${sub}`}>
                {score == null ? 'Mesurez au moins deux constantes pour obtenir votre indicateur.' : 'Calculé à partir de vos constantes, prises et vaccins. Ce n’est pas un avis médical.'}
              </p>
              <button type="button" onClick={() => setPage('vitals')} className="mt-auto pt-5">
                <span className="block w-full py-3 rounded-full bg-red-600 hover:bg-red-700 text-white text-sm font-semibold">Voir mes constantes</span>
              </button>
            </Card>

            {/* Constantes */}
            <Card darkMode={darkMode} className="min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h3 className="font-semibold">Mes constantes</h3>
                <span className={`text-xs ${sub}`}>{points.length ? `${points.length} dernières mesures` : ''}</span>
              </div>
              <Pills options={VITALS.map((v) => [v.type, v.label])} value={vital} onChange={setVital} darkMode={darkMode} />
              <div className="flex items-baseline gap-2 mt-4 mb-3">
                <span className="text-2xl font-bold tabular-nums">{current ? current.value : '—'}</span>
                <span className={`text-sm ${sub}`}>{current?.unit}</span>
                {current && VITAL_STATUS[current.status] && <Chip tone={VITAL_STATUS[current.status][1]}>{VITAL_STATUS[current.status][0]}</Chip>}
              </div>
              <VitalBars points={points} unit={current?.unit || ''} darkMode={darkMode} sub={sub} />
            </Card>
          </div>

          {/* Tableau à onglets */}
          <Card darkMode={darkMode} className="!p-0 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-4">
              <Pills options={TABLES} value={table} onChange={setTable} darkMode={darkMode} />
              <button type="button" onClick={() => setPage(t.page)} className="text-sm font-semibold text-red-600 hover:text-red-700">Tout voir</button>
            </div>
            {t.rows.length === 0 ? <Empty sub={sub}>{t.empty}</Empty> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className={darkMode ? 'bg-slate-800/40' : 'bg-red-50/50'}>{t.cols.map((c, i) => <th key={i} className={head}>{c}</th>)}</tr></thead>
                  <tbody>
                    {t.rows.map((r, i) => (
                      <tr key={i} className={row}>
                        {r.map((v, j) => <td key={j} className={`${cell} ${j === 0 ? 'font-medium' : sub} ${j === 0 ? 'min-w-[10rem]' : 'whitespace-nowrap'}`}>{v}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Colonne droite : profil puis rendez-vous */}
        <div className="xl:col-span-4 2xl:col-span-3 space-y-5">
          <Card darkMode={darkMode}>
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-red-50">
              {photoSrc
                ? <img src={photoSrc} alt={`Photo de ${profile?.firstName || 'profil'}`} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><span className="w-24 h-24 rounded-full bg-red-600 text-white text-3xl font-bold flex items-center justify-center">{initialsOf(`${profile?.firstName || ''} ${profile?.lastName || ''}`)}</span></div>}
              <div className={`absolute left-3 right-3 bottom-3 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 shadow-sm ${darkMode ? 'bg-slate-900/95' : 'bg-white/95'}`}>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{profile ? `${profile.firstName} ${profile.lastName}` : '—'}</p>
                  <p className={`text-xs ${sub}`}>{[age != null && `${age} ans`, profile?.sex === 'F' ? 'Femme' : profile?.sex === 'M' ? 'Homme' : null, profile?.bloodType].filter(Boolean).join(' · ')}</p>
                </div>
                <button type="button" onClick={() => setPage('profile')} aria-label="Mon profil" className="w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0"><ArrowUpRight className="w-4 h-4" /></button>
              </div>
            </div>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex items-start gap-2.5"><MapPin className={`w-4 h-4 mt-0.5 shrink-0 ${sub}`} /><dd className={sub}>{[profile?.address, profile?.city].filter(Boolean).join(', ') || 'Adresse non renseignée'}</dd></div>
              <div className="flex items-start gap-2.5"><Phone className={`w-4 h-4 mt-0.5 shrink-0 ${sub}`} /><dd className={sub}>{profile?.phone || '—'}</dd></div>
              <div className={`pt-2.5 border-t text-xs ${darkMode ? 'border-slate-800' : 'border-slate-100'} ${sub}`}>
                CMU <span className="font-mono">{profile?.cmuNumber || '—'}</span>{lastVisit ? ` · Dernière consultation : ${fmtDay(lastVisit.occurredAt)}` : ''}
              </div>
            </dl>
          </Card>

          <Card darkMode={darkMode}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Rendez-vous</h3>
              <div className="flex gap-1">
                <button type="button" aria-label="Jours précédents" disabled={dayOffset <= 0} onClick={() => setDayOffset((o) => Math.max(0, o - 5))} className={`w-8 h-8 rounded-full border flex items-center justify-center disabled:opacity-40 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}><ChevronLeft className="w-4 h-4" /></button>
                <button type="button" aria-label="Jours suivants" onClick={() => setDayOffset((o) => o + 5)} className={`w-8 h-8 rounded-full border flex items-center justify-center ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {days.map((d) => {
                const key = dayKey(d); const active = key === selected;
                return (
                  <button key={key} type="button" onClick={() => setSelected(key)} aria-pressed={active}
                    className={`rounded-2xl py-2 flex flex-col items-center gap-0.5 ${active ? 'bg-red-600 text-white' : darkMode ? 'hover:bg-slate-800' : 'hover:bg-red-50'}`}>
                    <span className="text-base font-bold leading-none">{d.getDate()}</span>
                    <span className={`text-[11px] capitalize ${active ? 'text-red-100' : sub}`}>{d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}</span>
                    <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${marked.has(key) ? (active ? 'bg-white' : 'bg-red-600') : 'bg-transparent'}`} />
                  </button>
                );
              })}
            </div>
            <div className="mt-4 space-y-2.5">
              {shownAppointments.length === 0 && <Empty sub={sub}>Aucun rendez-vous prévu. <button type="button" onClick={() => setPage('doctors')} className="text-red-600 font-semibold">Trouver un médecin</button></Empty>}
              {shownAppointments.map((a) => (
                <div key={a.id} className={`flex items-center gap-3 pl-3 border-l-4 ${a.status === 'confirmed' ? 'border-red-600' : 'border-red-200'}`}>
                  <Avatar name={a.doctorName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{a.doctorName}</p>
                    <p className={`text-xs truncate ${sub}`}>{a.specialty || 'Consultation'} · {a.status === 'confirmed' ? 'Confirmé' : 'En attente'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold tabular-nums">{fmtTime(a.startsAt)}</p>
                    <p className={`text-[11px] ${sub}`}>{new Date(a.startsAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                  </div>
                  {a.mode === 'video' && <button type="button" onClick={() => setShowVid(true)} aria-label="Rejoindre la téléconsultation" className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center"><Video className="w-4 h-4" /></button>}
                </div>
              ))}
              {!dayAppointments.length && shownAppointments.length > 0 && <p className={`text-[11px] ${sub}`}>Rien ce jour-là : voici vos prochains rendez-vous.</p>}
            </div>
            <button type="button" onClick={() => setPage('rdv')} className={`mt-4 w-full py-2.5 rounded-full border text-sm font-semibold flex items-center justify-center gap-2 ${darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:border-red-300 hover:text-red-700'}`}><Calendar className="w-4 h-4" /> Tous mes rendez-vous</button>
          </Card>
        </div>
      </div>
    </div>
  );
}
