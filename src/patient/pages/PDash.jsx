import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, Calendar, Droplet, FileText, Heart, MapPin, MessageCircle, Pill, QrCode, RefreshCw,
  Stethoscope, Syringe, Thermometer, Video, CheckCircle2, Clock,
} from 'lucide-react';
import { patientApi } from '../../api/patientApi.js';
import { formatRelativeDate } from '../../utils/format.js';
import { DashSkeleton } from '../../components/PatientModal.jsx';
import {
  Avatar, ColumnChart, DashHeader, Empty, GhostButton, KpiCard, LinkButton, Panel, PrimaryButton,
  RingGauge, WeekStrip, dayKey, fmtDay, fmtTime,
} from '../../components/dashboard/kit.jsx';

const VITALS = {
  blood_pressure: { label: 'Tension', Icon: Heart },
  blood_glucose: { label: 'Glycémie', Icon: Droplet },
  heart_rate: { label: 'Pouls', Icon: Activity },
  temperature: { label: 'Température', Icon: Thermometer },
};
const STATUS = { normal: ['Normal', 'good'], watch: ['À surveiller', 'warn'], critical: ['Critique', 'bad'] };
const HISTORY_ICONS = { consultation: Stethoscope, lab: FileText, vaccine: Syringe, prescription: Pill };

export default function PDash({ data, loading, onRefresh, setPage, setShowQR, setShowVid, card, sub, darkMode }) {
  const [appointments, setAppointments] = useState([]);
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(dayKey(new Date()));

  useEffect(() => {
    let alive = true;
    patientApi.appointments().then((r) => alive && setAppointments(Array.isArray(r) ? r : r?.data || [])).catch(() => {});
    patientApi.history().then((r) => alive && setHistory(Array.isArray(r) ? r : r?.data || [])).catch(() => {});
    return () => { alive = false; };
  }, []);

  const upcoming = useMemo(() => appointments
    .filter((a) => a.status !== 'cancelled' && new Date(a.startsAt) >= new Date(new Date().setHours(0, 0, 0, 0)))
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)), [appointments]);
  const marked = useMemo(() => new Set(upcoming.map((a) => dayKey(a.startsAt))), [upcoming]);
  const dayAppointments = upcoming.filter((a) => dayKey(a.startsAt) === selected);
  const shownAppointments = dayAppointments.length ? dayAppointments : upcoming.slice(0, 2);

  if (!data && loading !== false) return <DashSkeleton card={card} sub={sub} darkMode={darkMode} />;

  const profile = data?.profile;
  const firstName = profile?.firstName || '';
  const vitals = data?.latestVitals || [];
  const heart = vitals.find((v) => v.type === 'heart_rate');
  const heartValues = (heart?.history || []).map((p) => Number(p.value)).filter(Number.isFinite);
  const heartStats = heartValues.length
    ? { avg: Math.round(heartValues.reduce((s, v) => s + v, 0) / heartValues.length), min: Math.min(...heartValues), max: Math.max(...heartValues) }
    : null;
  const heartSeries = (heart?.history || []).slice(-8).map((p) => ({
    label: new Date(p.measuredAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
    full: fmtDay(p.measuredAt),
    value: Number(p.value),
  }));
  const score = data?.healthScore ?? 0;
  const scoreLabel = score >= 80 ? 'Excellent' : score >= 60 ? 'À surveiller' : 'Critique';
  const meds = data?.todayMedications || [];
  const medsLeft = meds.filter((m) => m.intake?.status !== 'taken').length;
  const stripStart = new Date(); stripStart.setDate(stripStart.getDate() - 2);

  return (
    <div className="space-y-5">
      <DashHeader
        title={`Bonjour${firstName ? `, ${firstName}` : ''}`}
        subtitle={profile ? `Voici le résumé de votre santé · CMU ${profile.cmuNumber}` : 'Voici le résumé de votre santé'}
        actions={<>
          <GhostButton Icon={RefreshCw} onClick={onRefresh} darkMode={darkMode} title="Actualiser">Actualiser</GhostButton>
          <PrimaryButton Icon={QrCode} onClick={() => setShowQR(true)}>Pass Santé d’urgence</PrimaryButton>
        </>}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        {/* Colonne principale */}
        <div className="xl:col-span-2 space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(VITALS).map(([type, meta]) => {
              const v = vitals.find((x) => x.type === type);
              const [chip, tone] = STATUS[v?.status] || [null, 'neutral'];
              return (
                <KpiCard key={type} label={meta.label} Icon={meta.Icon} value={v ? String(v.value) : '—'} unit={v?.unit}
                  chip={chip} chipTone={tone} hint={v?.measuredAt ? `Mesuré ${formatRelativeDate(v.measuredAt)}` : 'Aucune mesure'}
                  onClick={() => setPage('vitals')} card={card} sub={sub} />
              );
            })}
          </div>

          <Panel title="Mes rendez-vous" subtitle={`${upcoming.length} à venir`} action={<LinkButton onClick={() => setPage('rdv')}>Tout voir</LinkButton>} card={card} sub={sub}>
            <div className="overflow-x-auto pb-1">
              <WeekStrip start={stripStart} selected={selected} onSelect={setSelected} marked={marked} darkMode={darkMode} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              {shownAppointments.length === 0 && <div className="md:col-span-2"><Empty sub={sub}>Aucun rendez-vous prévu. <button type="button" onClick={() => setPage('doctors')} className="text-red-600 font-semibold">Trouver un médecin</button></Empty></div>}
              {shownAppointments.map((a) => (
                <div key={a.id} className={`rounded-xl border p-4 flex gap-3 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                  <Avatar name={a.doctorName} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{a.doctorName}</p>
                    <p className={`text-xs truncate ${sub}`}>{a.specialty || 'Consultation'}</p>
                    <p className={`text-xs mt-2 flex items-center gap-1.5 ${sub}`}><Clock className="w-3.5 h-3.5" /> {fmtDay(a.startsAt)} · {fmtTime(a.startsAt)}</p>
                    <p className={`text-xs mt-1 flex items-center gap-1.5 truncate ${sub}`}>{a.mode === 'video' ? <Video className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />} {a.mode === 'video' ? 'Téléconsultation' : a.location || 'Au cabinet'}</p>
                  </div>
                  {a.mode === 'video' && <button type="button" onClick={() => setShowVid(true)} className="self-start px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold">Rejoindre</button>}
                </div>
              ))}
            </div>
            {!dayAppointments.length && shownAppointments.length > 0 && <p className={`text-[11px] mt-2 ${sub}`}>Rien ce jour-là : voici vos prochains rendez-vous.</p>}
          </Panel>

          <Panel title="Historique médical" subtitle="Vos derniers événements de santé" action={<LinkButton onClick={() => setPage('history')}>Tout voir</LinkButton>} card={card} sub={sub}>
            {history.length === 0 ? <Empty sub={sub}>Aucun événement enregistré.</Empty> : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`text-xs ${sub} ${darkMode ? 'bg-slate-800/60' : 'bg-red-50/60'}`}>
                      <th className="text-left font-semibold px-3 py-2.5 rounded-l-lg">Événement</th>
                      <th className="text-left font-semibold px-3 py-2.5">Date</th>
                      <th className="text-left font-semibold px-3 py-2.5 rounded-r-lg">Professionnel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice(0, 5).map((h) => {
                      const Icon = HISTORY_ICONS[h.type] || FileText;
                      return (
                        <tr key={h.id} className={`border-b last:border-0 ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                          <td className="px-3 py-3"><span className="flex items-center gap-2.5"><span className="w-7 h-7 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0"><Icon className="w-3.5 h-3.5" /></span><span className="font-medium">{h.title}</span></span></td>
                          <td className={`px-3 py-3 whitespace-nowrap ${sub}`}>{fmtDay(h.occurredAt)}</td>
                          <td className={`px-3 py-3 ${sub}`}>{h.doctorName || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>

        {/* Colonne de droite */}
        <div className="space-y-5">
          <Panel title="Mon cœur & ma santé" card={card} sub={sub}>
            <div className="py-3"><RingGauge value={score} label="Score santé / 100" caption={scoreLabel} darkMode={darkMode} /></div>
            <div className="grid grid-cols-3 gap-2 mt-5">
              {[['Moyenne', heartStats?.avg], ['Minimum', heartStats?.min], ['Maximum', heartStats?.max]].map(([l, v]) => (
                <div key={l} className={`rounded-xl p-3 ${darkMode ? 'bg-slate-800/60' : 'bg-red-50/60'}`}>
                  <p className={`text-[11px] flex items-center gap-1 ${sub}`}><Heart className="w-3 h-3 text-red-600" /> {l}</p>
                  <p className="text-xl font-bold mt-1">{v ?? '—'}<span className={`text-[10px] font-medium ml-0.5 ${sub}`}>bpm</span></p>
                </div>
              ))}
            </div>
            <h4 className="font-semibold text-sm mt-5">Fréquence cardiaque</h4>
            {heartSeries.length ? <ColumnChart data={heartSeries} valueLabel="bpm" height="9.5rem" darkMode={darkMode} showValues={false} /> : <Empty sub={sub}>Aucune mesure.</Empty>}
          </Panel>

          <Panel title="Médicaments du jour" subtitle={meds.length ? `${medsLeft} prise(s) restante(s)` : undefined} action={<LinkButton onClick={() => setPage('pilulier')}>Pilulier</LinkButton>} card={card} sub={sub}>
            {meds.length === 0 ? <Empty sub={sub}>Aucun traitement aujourd’hui.</Empty> : (
              <ul className="space-y-2">
                {meds.slice(0, 5).map((m) => {
                  const taken = m.intake?.status === 'taken';
                  return (
                    <li key={m.id} className={`flex items-center gap-3 rounded-xl p-2.5 ${darkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                      <span className="w-9 h-9 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0"><Pill className="w-4 h-4" /></span>
                      <div className="min-w-0 flex-1"><p className="text-sm font-semibold truncate">{m.name} <span className={`font-normal ${sub}`}>{m.dosage}</span></p><p className={`text-xs ${sub}`}>{m.time} · {m.period}</p></div>
                      {taken ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" aria-label="Pris" /> : <span className="text-[11px] font-bold text-red-600 shrink-0">À prendre</span>}
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <div className="grid grid-cols-3 gap-3">
            {[
              { I: MessageCircle, l: 'Messages', n: data?.unreadMessages ?? 0, p: 'messages' },
              { I: FileText, l: 'Documents', n: data?.documentsCount ?? 0, p: 'documents' },
              { I: Calendar, l: 'Rendez-vous', n: upcoming.length, p: 'rdv' },
            ].map((q) => (
              <button key={q.l} type="button" onClick={() => setPage(q.p)} className={`${card} border rounded-2xl p-3 text-center hover:shadow-md transition-shadow`}>
                <span className="mx-auto w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center"><q.I className="w-4 h-4" /></span>
                <p className="text-lg font-bold mt-2 leading-none">{q.n}</p>
                <p className={`text-[11px] mt-1 ${sub}`}>{q.l}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
