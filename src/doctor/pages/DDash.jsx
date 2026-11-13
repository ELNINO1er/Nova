import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, CalendarDays, ChevronRight, ClipboardList, Clock3, Mail, Search, Stethoscope, UserRound, Users } from 'lucide-react';
import { doctorApi } from '../../api/doctorApi.js';
import { Empty, MiniCalendar, dayKey, fmtDay, fmtTime, initialsOf } from '../../components/dashboard/kit.jsx';
import { usePrivatePhoto } from '../../utils/photo.js';
import { normalize } from '../../utils/search.js';

const list = value => Array.isArray(value) ? value : value?.data || [];
const dateLabel = value => value ? fmtDay(value) : '—';
const statusLabels = { requested: 'En attente', confirmed: 'Confirmé', completed: 'Terminé' };
const numberFormat = new Intl.NumberFormat('fr-FR');

function Portrait({ appointment, large = false }) {
  const id = appointment.recordShared && appointment.hasPhoto ? appointment.patientId : null;
  const load = useCallback(() => doctorApi.patientPhoto(id), [id]);
  const src = usePrivatePhoto(load, id);
  return (
    <span className={`shrink-0 rounded-full grid place-items-center overflow-hidden bg-red-100 text-red-800 font-bold ${large ? 'size-12 text-sm' : 'size-9 text-[11px]'}`}>
      {src ? <img src={src} alt="" className="h-full w-full object-cover" decoding="async" /> : initialsOf(appointment.patientName)}
    </span>
  );
}

function Panel({ title, action, children, surface, className = '' }) {
  return (
    <section className={`min-w-0 rounded-xl p-4 ${surface} ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-red-700 group-data-[theme=dark]:text-red-300">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function More({ onClick, children = 'Tout voir' }) {
  return <button type="button" onClick={onClick} className="inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-red-700 hover:underline group-data-[theme=dark]:text-red-300">
    {children}<ChevronRight size={13} aria-hidden="true" />
  </button>;
}

function Metric({ icon: Icon, label, value, hint, onClick, surface }) {
  return (
    <button type="button" onClick={onClick} className={`flex min-w-0 items-center gap-3 rounded-xl p-4 text-left ring-1 ring-transparent transition hover:ring-red-200 ${surface}`}>
      <span className="grid size-12 shrink-0 place-items-center rounded-full border-2 border-red-600 text-red-700 group-data-[theme=dark]:text-red-300 xl:size-14">
        <Icon size={23} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-medium">{label}</span>
        <strong className="block text-2xl font-bold tabular-nums">{value == null ? '—' : numberFormat.format(value)}</strong>
        <span className="block text-[11px] opacity-70">{hint}</span>
      </span>
    </button>
  );
}

function ActivityRing({ consultations, sub }) {
  const month = dayKey(new Date()).slice(0, 7);
  const rows = consultations.filter(c => c.startedAt?.startsWith(month));
  const completed = rows.filter(c => c.status === 'completed').length;
  const drafts = rows.filter(c => c.status === 'draft').length;
  const other = rows.length - completed - drafts;
  const values = [
    { label: 'Validées', value: completed, color: '#b91c1c' },
    { label: 'Brouillons', value: drafts, color: '#f87171' },
    { label: 'Autres', value: other, color: '#fecaca' },
  ];
  let offset = 0;
  return <>
    <div className="relative mx-auto my-4 grid aspect-square w-full max-w-40 place-items-center">
      <svg viewBox="0 0 120 120" className="absolute inset-0 w-full" aria-hidden="true">
        <circle cx="60" cy="60" r="46" fill="none" stroke="#fee2e2" strokeWidth="22" />
        {values.filter(v => v.value > 0).map(v => {
          const length = v.value / rows.length * 100;
          const segment = <circle key={v.label} cx="60" cy="60" r="46" fill="none" stroke={v.color} strokeWidth="22"
            pathLength="100" strokeDasharray={`${length} 100`} strokeDashoffset={-offset} transform="rotate(-90 60 60)" />;
          offset += length;
          return segment;
        })}
      </svg>
      <div className="relative text-center"><strong className="block text-2xl tabular-nums">{rows.length}</strong><span className={`text-[10px] ${sub}`}>ce mois-ci</span></div>
    </div>
    <ul className="space-y-1.5 text-xs">
      {values.map(v => <li key={v.label} className="flex items-center gap-2"><span className="size-2.5 rounded-sm" style={{ backgroundColor: v.color }} /><span className="flex-1">{v.label}</span><strong>{v.value}</strong></li>)}
    </ul>
  </>;
}

function UpcomingPatient({ appointment, dataKey, setPage, sub }) {
  const id = appointment?.recordShared ? appointment.patientId : null;
  const [record, setRecord] = useState(null);
  useEffect(() => {
    if (!id) return undefined;
    let active = true;
    doctorApi.patient(id)
      .then(value => { if (active) setRecord({ id, dataKey, value }); })
      .catch(() => { if (active) setRecord({ id, dataKey, error: true }); });
    return () => { active = false; };
  }, [id, dataKey]);
  if (!appointment) return <Empty sub={sub}>Aucun rendez-vous sélectionné.</Empty>;
  const current = id && record?.id === id && record.dataKey === dataKey ? record : null;
  const info = current?.value;
  const fields = info ? [
    ['Naissance', dateLabel(info.birthDate)], ['Sexe', info.sex === 'F' ? 'Féminin' : info.sex === 'M' ? 'Masculin' : '—'],
    ['Poids', info.weightKg != null ? `${info.weightKg} kg` : '—'], ['Taille', info.heightCm != null ? `${info.heightCm} cm` : '—'],
    ['Dernière consultation', dateLabel(info.consultations?.find(c => c.status === 'completed')?.startedAt)], ['Groupe sanguin', info.bloodType || '—'],
  ] : [];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <Portrait appointment={appointment} large />
        <div className="min-w-0">
          <p className="break-words text-sm font-bold">{appointment.patientName}</p>
          <p className={`text-xs ${sub}`}>{dateLabel(appointment.startsAt)} · {fmtTime(appointment.startsAt)}</p>
        </div>
      </div>
      {!id && <p className={`text-xs ${sub}`}>Dossier non partagé.</p>}
      {id && !current && <p role="status" className={`text-xs ${sub}`}>Chargement du dossier…</p>}
      {current?.error && <p className="text-xs text-red-700 group-data-[theme=dark]:text-red-300">Dossier indisponible.</p>}
      {info && <>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-red-200/60 pt-3 text-xs">
          {fields.map(([label, value]) => <div key={label}><dt className={sub}>{label}</dt><dd className="font-semibold">{value}</dd></div>)}
        </dl>
        <div className="flex flex-wrap gap-2">
          {appointment.status === 'confirmed' && <button type="button" onClick={() => setPage('consultations', id)}
            className="rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white hover:bg-red-800">Consulter</button>}
          <More onClick={() => setPage('prescriptions')}>Ordonnances</More>
        </div>
      </>}
    </div>
  );
}

export default function DDash({ data, loading, setPage, onCP, sub, darkMode }) {
  const [sources, setSources] = useState(null);
  const [selectedDay, setSelectedDay] = useState(dayKey(new Date()));
  const [selection, setSelection] = useState(null);
  const [query, setQuery] = useState('');
  const [updating, setUpdating] = useState(null);
  const [actionError, setActionError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!data) return undefined;
    let active = true;
    Promise.allSettled([doctorApi.appointments(), doctorApi.consultations(), doctorApi.alerts()]).then(results => {
      if (!active) return;
      const [appointments, consultations, alerts] = results.map(result => result.status === 'fulfilled' ? list(result.value) : []);
      setSources({ data, revision, appointments, consultations, alerts, partial: results.some(result => result.status === 'rejected') });
    });
    return () => { active = false; };
  }, [data, revision]);

  const current = sources?.data === data && sources?.revision === revision ? sources : null;
  const appointments = current?.appointments || data?.todayAppointments || [];
  const todayKey = dayKey(new Date());
  const valid = useMemo(() => appointments.filter(a => a.status !== 'cancelled').sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)), [appointments]);
  const today = valid.filter(a => dayKey(a.startsAt) === todayKey);
  const pending = valid.filter(a => a.status === 'requested' && Date.parse(a.startsAt) >= Date.now());
  const needle = normalize(query.trim());
  const dayList = valid.filter(a => dayKey(a.startsAt) === selectedDay && (!needle || normalize(a.patientName || '').includes(needle)));
  const chosen = dayList.find(a => a.id === selection) || (needle ? dayList[0] : valid.find(a => a.status === 'confirmed' && Date.parse(a.startsAt) >= Date.now()) || dayList[0]);
  const marked = new Set(valid.map(a => dayKey(a.startsAt)));
  const openAlerts = (current?.alerts || []).filter(a => !a.resolvedAt && a.status !== 'resolved');
  const surface = darkMode ? 'bg-slate-900 border border-slate-800' : 'bg-red-50/80 border border-red-100';
  const neutral = darkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-red-100';

  async function respond(id, status) {
    if (updating) return;
    setUpdating(id);
    setActionError('');
    try {
      await doctorApi.updateAppointment(id, { status });
      setRevision(value => value + 1);
    } catch (error) {
      setActionError(error.message || 'Mise à jour impossible.');
    } finally {
      setUpdating(null);
    }
  }

  if (!data && loading !== false) return (
    <div role="status" aria-label="Chargement du tableau de bord" className="grid gap-3 sm:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map(i => <div key={i} className={`h-28 animate-pulse rounded-xl ${surface}`} />)}
    </div>
  );

  return (
    <div data-theme={darkMode ? 'dark' : 'light'} className="group space-y-4">
      <header className={`flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 ${neutral}`}>
        <h1 className="text-xl font-bold tracking-tight">Tableau de bord</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="grid size-10 place-items-center rounded-lg text-red-700 hover:bg-red-100 group-data-[theme=dark]:text-red-300" onClick={() => setPage('messages')} aria-label="Messages"><Mail size={17} /></button>
          <button type="button" className="grid size-10 place-items-center rounded-lg text-red-700 hover:bg-red-100 group-data-[theme=dark]:text-red-300" onClick={() => setPage('notifications')} aria-label="Ouvrir les notifications"><Bell size={17} /></button>
          <label className="flex min-h-10 items-center gap-2 rounded-lg border border-red-200 px-3 text-red-700 group-data-[theme=dark]:text-red-300">
            <Search size={15} aria-hidden="true" />
            <input type="search" value={query} onChange={e => setQuery(e.target.value)} aria-label="Rechercher dans les rendez-vous du jour affiché"
              placeholder="Chercher un rendez-vous" className="w-40 min-w-0 bg-transparent text-xs text-current placeholder:text-slate-500" />
          </label>
        </div>
      </header>
      {(current?.partial || actionError) && <p role="alert" className="rounded-lg bg-red-100 p-3 text-sm text-red-800">{actionError || 'Certaines données sont indisponibles. Réessayez depuis la page concernée.'}</p>}

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric icon={Users} label="Patients suivis" value={data?.totalPatients} hint="Dossiers accessibles" onClick={() => setPage('patients')} surface={surface} />
        <Metric icon={UserRound} label="Patients attendus" value={new Set(today.filter(a => a.status === 'confirmed').map(a => a.patientId)).size} hint="Aujourd’hui" onClick={() => setPage('agenda')} surface={surface} />
        <Metric icon={CalendarDays} label="Rendez-vous du jour" value={today.length} hint={dateLabel(todayKey)} onClick={() => setPage('agenda')} surface={surface} />
      </div>

      <div className={`grid gap-3 rounded-xl p-3 md:grid-cols-2 xl:grid-cols-3 ${neutral}`}>
        <Panel title="Activité des consultations" surface={neutral}>
          {current ? <ActivityRing consultations={current.consultations} sub={sub} /> : <p role="status" className={`text-xs ${sub}`}>Chargement de l’activité…</p>}
        </Panel>
        <Panel title={selectedDay === todayKey ? 'Rendez-vous du jour' : `Rendez-vous · ${dateLabel(selectedDay)}`} surface={surface}
          action={<More onClick={() => setPage('agenda')}>Agenda</More>}>
          {!dayList.length ? <Empty sub={sub}>{needle ? 'Aucun résultat.' : 'Aucun rendez-vous ce jour.'}</Empty> : (
            <ul className="divide-y divide-red-200/60">
              {dayList.slice(0, 5).map(a => <li key={a.id}>
                <button type="button" onClick={() => setSelection(a.id)} aria-pressed={a.id === chosen?.id}
                  className="flex min-h-12 w-full items-center gap-2 rounded-lg px-1 py-2 text-left hover:bg-red-100/70 group-data-[theme=dark]:hover:bg-slate-800">
                  <Portrait appointment={a} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold">{a.patientName}</span>
                    <span className={`block text-[11px] ${sub}`}>{statusLabels[a.status] || 'Rendez-vous'}</span>
                  </span>
                  <span className="shrink-0 rounded-md bg-red-100 px-1.5 py-1 text-[10px] font-bold tabular-nums text-red-800">{fmtTime(a.startsAt)}</span>
                </button>
              </li>)}
            </ul>
          )}
        </Panel>
        <Panel title={selection && chosen?.id === selection ? 'Patient sélectionné' : 'Prochain patient'} surface={surface} className="md:col-span-2 xl:col-span-1">
          <UpcomingPatient appointment={chosen} dataKey={data} setPage={setPage} sub={sub} />
        </Panel>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Panel title="Alertes de suivi" surface={neutral} action={<More onClick={() => setPage('urgences')} />}>
          {!openAlerts.length ? <Empty sub={sub}>{current ? 'Aucune alerte ouverte.' : 'Chargement des alertes…'}</Empty> :
            <ul className="space-y-2">
              {openAlerts.slice(0, 4).map(alert => <li key={alert.id} className="flex items-start gap-2 rounded-lg border border-red-100 p-2 text-xs group-data-[theme=dark]:border-slate-800">
                <ClipboardList size={15} className="shrink-0 text-red-600" aria-hidden="true" />
                <span><strong>{alert.title || alert.message || 'Alerte'}</strong>{alert.patientName && <span className={`block ${sub}`}>{alert.patientName}</span>}</span>
              </li>)}
            </ul>}
        </Panel>
        <Panel title="Demandes de rendez-vous" surface={surface} action={<More onClick={() => setPage('agenda')} />}>
          {!pending.length ? <Empty sub={sub}>Aucune demande à traiter.</Empty> :
            <ul className="divide-y divide-red-200/60">
              {pending.slice(0, 3).map(a => <li key={a.id} className="flex flex-wrap items-center gap-2 py-2">
                <Portrait appointment={a} />
                <div className="min-w-24 flex-1">
                  <p className="truncate text-xs font-bold">{a.patientName}</p>
                  <p className={`flex items-center gap-1 text-[11px] ${sub}`}><Clock3 size={11} />{dateLabel(a.startsAt)} · {fmtTime(a.startsAt)}</p>
                </div>
                <button type="button" disabled={Boolean(updating)} onClick={() => respond(a.id, 'confirmed')}
                  className="min-h-8 rounded-md bg-red-700 px-2 text-[11px] font-semibold text-white disabled:opacity-50">Confirmer</button>
                <More onClick={() => setPage('agenda')}>Détails</More>
              </li>)}
            </ul>}
        </Panel>
        <Panel title="Calendrier" surface={neutral} className="md:col-span-2 xl:col-span-1">
          <MiniCalendar marked={marked} selected={selectedDay} onSelect={date => { setSelectedDay(date); setSelection(null); }} darkMode={darkMode} />
        </Panel>
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={onCP} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-red-700 px-4 text-xs font-semibold text-white hover:bg-red-800"><UserRound size={16} /> Nouveau patient</button>
        <button type="button" onClick={() => setPage('consultations')} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-200 px-4 text-xs font-semibold text-red-700 group-data-[theme=dark]:text-red-300"><Stethoscope size={16} /> Consultations</button>
      </div>
    </div>
  );
}
