import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Calendar, ClipboardList, Plus, Star, UserPlus, Users, Video, MapPin, Bell } from 'lucide-react';
import { doctorApi } from '../../api/doctorApi.js';
import {
  Avatar, ColumnChart, DashHeader, Empty, GhostButton, KpiCard, LinkButton, MiniCalendar, Panel, PERIODS, PERIOD_TEXT,
  PrimaryButton, Segmented, StatusChip, bucketize, dayKey, fmtDay, fmtTime,
} from '../../components/dashboard/kit.jsx';

export default function DDash({ data, loading, setPage, onCP, setShowVid, card, sub, darkMode }) {
  const [appointments, setAppointments] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [error,setError]=useState('');
  const [selected, setSelected] = useState(dayKey(new Date()));
  const [period, setPeriod] = useState('half');

  useEffect(() => {
    let alive = true;
    setError('');
    const list = (r) => (Array.isArray(r) ? r : r?.data || []);
    doctorApi.appointments().then((r) => alive && setAppointments(list(r))).catch(e=>alive&&setError(e.message));
    doctorApi.consultations().then((r) => alive && setConsultations(list(r))).catch(e=>alive&&setError(e.message));
    doctorApi.alerts().then((r) => alive && setAlerts(list(r))).catch(e=>alive&&setError(e.message));
    return () => { alive = false; };
  }, [data]);

  // Consultations regroupées selon la période choisie.
  const series = useMemo(() => bucketize(consultations.filter((c) => c.startedAt).map((c) => c.startedAt), period), [consultations, period]);
  const marked = useMemo(() => new Set(appointments.filter((a) => a.status !== 'cancelled').map((a) => dayKey(a.startsAt))), [appointments]);
  const dayList = appointments.filter((a) => dayKey(a.startsAt) === selected).sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
  const openAlerts = alerts.filter((a) => !a.resolvedAt && a.status !== 'resolved');
  const pending = appointments.filter((a) => a.status === 'requested' && new Date(a.startsAt) >= new Date()).length;

  if (!data && loading !== false) {
    return <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">{[0, 1, 2, 3].map((i) => <div key={i} className={`h-32 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />)}</div>;
  }
  const doctor = data?.doctor;
  const today = data?.todayAppointments || [];
  const selectedLabel = selected === dayKey(new Date()) ? 'aujourd’hui' : `le ${fmtDay(selected)}`;

  return (
    <div className="space-y-5">
      {error&&<p role="alert" className="text-red-700">Certaines données ne sont pas disponibles : {error}</p>}
      <DashHeader
        title={`Bonjour, Dr. ${doctor?.lastName || ''}`.trim()}
        subtitle={`${doctor?.specialty || 'Médecin'} · voici ce qui se passe aujourd’hui`}
        actions={<>
          <GhostButton Icon={UserPlus} onClick={onCP} darkMode={darkMode}>Nouveau patient</GhostButton>
          <PrimaryButton Icon={Plus} onClick={() => setPage('consultations')}>Nouvelle consultation</PrimaryButton>
        </>}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        <div className="xl:col-span-2 space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Patients suivis" Icon={Users} value={data?.totalPatients ?? 0} hint="Depuis l’ouverture du compte" onClick={() => setPage('patients')} card={card} sub={sub} />
            <KpiCard label="RDV aujourd’hui" Icon={Calendar} value={today.length} chip={pending ? `${pending} en attente` : null} chipTone="warn" hint="Voir l’agenda" onClick={() => setPage('agenda')} card={card} sub={sub} />
            <KpiCard label="Consultations" Icon={ClipboardList} value={data?.monthConsultations ?? 0} hint="Ce mois-ci" onClick={() => setPage('consultations')} card={card} sub={sub} />
            <KpiCard label="Note moyenne" Icon={Star} value={data?.avgRating ?? '—'} unit={data?.avgRating && data.avgRating !== '—' ? '/ 5' : undefined} hint="Avis patients" onClick={() => setPage('reputation')} card={card} sub={sub} />
          </div>

          <Panel title="Activité des consultations" subtitle={`${series.reduce((s, d) => s + d.value, 0)} consultation(s) ${PERIOD_TEXT[period]}`} action={<Segmented options={PERIODS} value={period} onChange={setPeriod} darkMode={darkMode} />} card={card} sub={sub}>
            <ColumnChart key={period} data={series} valueLabel="consultation(s)" height="13rem" darkMode={darkMode} />
          </Panel>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Panel title="Rendez-vous" subtitle={`${dayList.length} ${selectedLabel}`} action={<LinkButton onClick={() => setPage('agenda')}>Agenda</LinkButton>} card={card} sub={sub}>
              {dayList.length === 0 ? <Empty sub={sub}>Aucun rendez-vous {selectedLabel}.</Empty> : (
                <ul className="space-y-1">
                  {dayList.slice(0, 6).map((a) => (
                    <li key={a.id} className={`flex items-center gap-3 py-2 border-b last:border-0 ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                      <Avatar name={a.patientName} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{a.patientName}</p>
                        <p className={`text-xs flex items-center gap-1 ${sub}`}>{a.mode === 'video' ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />} {fmtTime(a.startsAt)}{a.age != null ? ` · ${a.age} ans` : ''}</p>
                      </div>
                      <StatusChip status={a.status} />
                      {a.mode === 'video' && a.status === 'confirmed' && <button type="button" onClick={() => setShowVid?.(true)} aria-label="Lancer la téléconsultation" className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center"><Video className="w-4 h-4" /></button>}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Alertes & notifications" subtitle={`${openAlerts.length} alerte(s) ouverte(s)`} action={<LinkButton onClick={() => setPage('urgences')}>Tout voir</LinkButton>} card={card} sub={sub}>
              {openAlerts.length === 0 && pending === 0 ? <Empty sub={sub}>Rien à signaler.</Empty> : (
                <ul className="space-y-2">
                  {pending > 0 && (
                    <li className={`flex items-start gap-3 rounded-xl p-3 ${darkMode ? 'bg-amber-950/30' : 'bg-amber-50'}`}>
                      <Bell className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      <button type="button" onClick={() => setPage('agenda')} className="text-sm text-left">{pending} rendez-vous en attente de confirmation</button>
                    </li>
                  )}
                  {openAlerts.slice(0, 4).map((al) => (
                    <li key={al.id} className={`flex items-start gap-3 rounded-xl p-3 ${darkMode ? 'bg-red-950/30' : 'bg-red-50'}`}>
                      <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                      <div className="min-w-0"><p className="text-sm font-semibold truncate">{al.title || al.message || 'Alerte'}</p>{al.patientName && <p className={`text-xs ${sub}`}>{al.patientName}</p>}</div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>

        <div className="space-y-5">
          <Panel title="Calendrier" subtitle="Les points indiquent vos rendez-vous" card={card} sub={sub}>
            <MiniCalendar marked={marked} selected={selected} onSelect={setSelected} darkMode={darkMode} />
          </Panel>
          <Panel title="Consultations récentes" action={<LinkButton onClick={() => setPage('consultations')}>Tout voir</LinkButton>} card={card} sub={sub}>
            {(data?.recentConsultations || []).length === 0 ? <Empty sub={sub}>Aucune consultation.</Empty> : (
              <ol className="relative ml-2 border-l-2 border-red-100 space-y-4">
                {data.recentConsultations.map((c) => (
                  <li key={c.id} className="ml-4">
                    <span className="absolute -left-[7px] mt-1.5 w-3 h-3 rounded-full bg-red-600 ring-4 ring-red-50" />
                    <p className="text-sm font-semibold">{c.patientName}</p>
                    <p className={`text-xs ${sub}`}>{c.diagnosisMain || 'Consultation'}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{fmtDay(c.startedAt)} · {fmtTime(c.startedAt)}</p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
