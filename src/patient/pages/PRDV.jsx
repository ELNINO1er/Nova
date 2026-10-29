import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, MapPin, Video, Plus, X, Check, Trash2, Edit3, ClipboardCheck, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { patientApi } from '../../api/patientApi.js';
import { ConfirmDialog } from '../../components/PatientModal.jsx';
import { PageHeader, Card, CardTitle, Chip, Button, IconButton, EmptyState, DateBlock, Avatar, Pills, SearchInput, Highlight, NoResults, inputClass } from '../../components/patient/ui.jsx';
import { useSearch, useUrlQuery, searchableDate } from '../../utils/search.js';

// Un champ datetime-local attend l'heure LOCALE (AAAA-MM-JJTHH:MM) ; l'API stocke de l'UTC.
const toLocalInput = (iso) => {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const defaultAppointmentDate = () => {
  const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  date.setHours(9, 0, 0, 0);
  return toLocalInput(date);
};

/* Statut → [libellé, intensité de rouge, icône]. */
const STATUS_STYLE = {
  requested: ['En attente de confirmation', 'neutral', Clock],
  confirmed: ['Confirmé', 'watch', Check],
  cancelled: ['Annulé', 'neutral', X],
};

/* Champs cherchables : médecin, spécialité, lieu, statut, date, mode. */
const FIELDS = (r) => [r.dr, r.sp, r.l, (STATUS_STYLE[r.status] || [r.status])[0], searchableDate(r.startsAt), r.t, r.v ? 'téléconsultation vidéo' : 'présentiel cabinet'];

const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const dayKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

/* Mini-calendrier du mois : jours avec rendez-vous marqués d'un point rouge, clic = filtre sur ce jour. */
function MonthCalendar({ marked, selected, onSelect, darkMode, initial }) {
  const [cursor, setCursor] = useState(() => { const d = initial ? new Date(initial) : new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const today = dayKey(new Date());
  const cells = useMemo(() => {
    const offset = (cursor.getDay() + 6) % 7; // semaine du lundi
    return Array.from({ length: 42 }, (_, i) => new Date(cursor.getFullYear(), cursor.getMonth(), 1 - offset + i));
  }, [cursor]);
  const move = (n) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1));
  const navBtn = `w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'hover:bg-red-950/40' : 'hover:bg-red-50'}`;
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={() => move(-1)} aria-label="Mois précédent" className={navBtn}><ChevronLeft className="w-4 h-4" /></button>
        <p className="text-sm font-semibold capitalize">{MONTHS_FR[cursor.getMonth()]} {cursor.getFullYear()}</p>
        <button type="button" onClick={() => move(1)} aria-label="Mois suivant" className={navBtn}><ChevronRight className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] text-slate-400 mb-1">{['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'].map((d) => <span key={d}>{d}</span>)}</div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {cells.map((d) => {
          const k = dayKey(d);
          const outside = d.getMonth() !== cursor.getMonth();
          const has = marked.has(k);
          const isSel = k === selected;
          const isToday = k === today;
          return (
            <button key={k} type="button" onClick={() => onSelect(isSel ? null : k)} aria-pressed={isSel}
              aria-label={`${d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}${has ? ', rendez-vous' : ''}`}
              className={`relative mx-auto w-full max-w-9 aspect-square rounded-full text-xs flex items-center justify-center transition-colors ${outside ? 'text-slate-300' : ''} ${isSel
                ? 'bg-red-600 text-white font-bold'
                : isToday ? 'ring-1 ring-red-400 text-red-700 font-bold'
                  : has ? 'text-red-700 font-semibold' : ''} ${!isSel ? (darkMode ? 'hover:bg-red-950/40' : 'hover:bg-red-50') : ''}`}>
              {d.getDate()}
              {has && !isSel && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-red-600" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const PREP_TIPS = [
  'Notez vos symptômes et depuis quand ils durent',
  'Apportez vos ordonnances et résultats récents',
  'Listez vos questions pour le médecin',
  'Mesurez votre tension si vous êtes suivi pour l’hypertension',
];

export default function PRDV({ data, onReload, notify, card, sub, darkMode, setShowVid }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState({
    startsAt: defaultAppointmentDate(),
    doctorId: '',
    mode: 'onsite',
    shareRecord: false,
  });
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useUrlQuery();
  const [statusFilter, setStatusFilter] = useState('all');
  const [day, setDay] = useState(null);

  useEffect(() => {
    let active = true;
    patientApi.doctors()
      .then((res) => {
        if (!active) return;
        setDoctors(Array.isArray(res) ? res : (res?.data || []));
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);
  const rs = useMemo(() => (data?.length ? data.map((r) => {
    const date = new Date(r.startsAt);
    const daysLeft = Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86400000));
    return {
      t: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      day: date.toLocaleDateString('fr-FR', { weekday: 'long' }),
      dr: r.doctorName,
      sp: r.specialty,
      l: r.location,
      dl: daysLeft,
      v: r.mode === 'video',
      id: r.id,
      doctorId: r.doctorId,
      startsAt: r.startsAt,
      status: r.status,
      mode: r.mode,
    };
  }) : []), [data]);
  const results = useSearch(rs, query, FIELDS);
  const isUpcoming = (r) => r.status !== 'cancelled' && new Date(r.startsAt).getTime() >= Date.now();
  const byStatus = (r, f) => (f === 'all' ? true : f === 'upcoming' ? isUpcoming(r) : r.status === f);
  const inDay = day ? results.filter((r) => dayKey(r.startsAt) === day) : results;
  const visible = inDay.filter((r) => byStatus(r, statusFilter));
  const marked = useMemo(() => new Set(results.map((r) => dayKey(r.startsAt))), [results]);
  const countOf = (f) => inDay.filter((r) => byStatus(r, f)).length;
  /* Prochain rendez-vous : le plus proche à venir, non annulé. */
  const nextRdv = rs
    .filter((r) => r.status !== 'cancelled' && new Date(r.startsAt).getTime() >= Date.now())
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))[0];

  const resetRdvForm = () => {
    setEditingId(null);
    setForm({ startsAt: defaultAppointmentDate(), doctorId: '', mode: 'onsite', shareRecord: false });
  };
  const openEditRdv = (rdv) => {
    setEditingId(rdv.id);
    setForm({
      startsAt: rdv.startsAt ? toLocalInput(rdv.startsAt) : defaultAppointmentDate(),
      doctorId: rdv.doctorId || '',
      mode: rdv.mode || (rdv.v ? 'video' : 'onsite'),
      shareRecord: true,
    });
    setShowForm(true);
  };
  const saveRdv = async () => {
    if (!editingId && !form.doctorId) {
      notify?.('Veuillez sélectionner un médecin', 'error');
      return;
    }
    if (!editingId && !form.shareRecord) {
      notify?.('Acceptez le partage de votre dossier avec ce médecin pour envoyer la demande.', 'error');
      return;
    }
    if (saving) return;
    const startsAt = new Date(form.startsAt).toISOString();
    const original = editingId ? (data || []).find((r) => r.id === editingId)?.startsAt : null;
    // Heure inchangée : ne pas l'envoyer (sinon le rendez-vous confirmé repasserait « en attente »).
    const unchanged = original && toLocalInput(original) === form.startsAt;
    const payload = {
      ...(unchanged ? {} : { startsAt }),
      doctorId: form.doctorId,
      mode: form.mode,
      ...(editingId ? {} : { shareRecord: true }),
    };
    setSaving(true);
    try {
      if (editingId) await patientApi.updateAppointment(editingId, payload);
      else await patientApi.createAppointment(payload);
      onReload?.(await patientApi.appointments());
      notify?.(editingId ? 'Rendez-vous déplacé : il est à reconfirmer par le médecin.' : 'Demande envoyée : le médecin doit la confirmer.');
      setShowForm(false);
      resetRdvForm();
    } catch (error) {
      notify?.(error.message || 'Erreur rendez-vous', 'error');
    } finally {
      setSaving(false);
    }
  };
  const deleteRdv = async (id) => {
    if (!id) return;
    try {
      await patientApi.deleteAppointment(id);
      onReload?.(await patientApi.appointments());
      notify?.('Rendez-vous annulé. Le médecin a été prévenu.');
      setPendingDelete(null);
    } catch (error) {
      notify?.(error.message || 'Erreur suppression', 'error');
    }
  };

  const openNew = () => { resetRdvForm(); setShowForm(true); };
  const closeForm = () => { setShowForm(false); resetRdvForm(); };
  const smallBtn = '!h-9 !px-3 text-xs';
  const label = `block text-xs font-medium mb-1.5 ${sub}`;

  if (!data) {
    return (
      <div className="space-y-5">
        <PageHeader title="Mes rendez-vous" sub={sub} />
        {[0, 1, 2].map((i) => <Card key={i} darkMode={darkMode}><div className={`animate-pulse h-16 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-red-50/60'}`} /></Card>)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Mes rendez-vous" sub={sub}
        subtitle={nextRdv ? `Prochain : ${nextRdv.dr} — ${nextRdv.dl === 0 ? "aujourd'hui" : `dans ${nextRdv.dl} jour${nextRdv.dl > 1 ? 's' : ''}`}` : 'Aucun rendez-vous à venir'}
        actions={<Button Icon={Plus} onClick={openNew}>Nouveau rendez-vous</Button>} />

      {showForm && (
        <>
          <button className="fixed inset-0 z-40 bg-slate-950/45" onClick={closeForm} aria-label="Fermer"></button>
          <div role="dialog" aria-modal="true" aria-labelledby="rdv-form-title"
            className={`fixed z-50 left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto -translate-x-1/2 -translate-y-1/2 rounded-3xl border p-5 sm:p-6 shadow-xl ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/70'}`}>
            <div className="flex items-center justify-between gap-3 mb-5">
              <h3 id="rdv-form-title" className="font-semibold text-lg">{editingId ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}</h3>
              <IconButton Icon={X} label="Fermer" onClick={closeForm} darkMode={darkMode} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="rdv-doctor" className={label}>Médecin</label>
                <select id="rdv-doctor" value={form.doctorId} disabled={!!editingId} onChange={(e) => setForm({...form, doctorId: e.target.value})} className={`${inputClass(darkMode)} disabled:opacity-60`}>
                  <option value="">{editingId ? 'Médecin (non modifiable)' : 'Sélectionner un médecin'}</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>{d.fullName} — {d.specialty}{d.city ? ` (${d.city})` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="rdv-date" className={label}>Date et heure</label>
                <input id="rdv-date" type="datetime-local" value={form.startsAt} onChange={(e) => setForm({...form, startsAt: e.target.value})} className={inputClass(darkMode)} />
              </div>
              <div>
                <label htmlFor="rdv-mode" className={label}>Type de consultation</label>
                <select id="rdv-mode" value={form.mode} onChange={(e) => setForm({...form, mode: e.target.value})} className={inputClass(darkMode)}>
                  <option value="onsite">Présentiel</option>
                  <option value="video" disabled>Téléconsultation indisponible</option>
                </select>
              </div>
              {!editingId && (
                <label className={`sm:col-span-2 flex items-start gap-3 p-4 rounded-2xl border text-sm cursor-pointer ${form.shareRecord ? (darkMode ? 'border-red-900' : 'border-red-200 bg-red-50/50') : darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                  <input type="checkbox" className="mt-0.5 w-4 h-4 accent-red-600 shrink-0" checked={form.shareRecord} onChange={(e) => setForm({...form, shareRecord: e.target.checked})} />
                  <span>J’accepte que ce médecin consulte mon dossier <strong>une fois le rendez-vous confirmé</strong>. <span className={sub}>Je peux retirer cet accès à tout moment dans « Accès au dossier ».</span></span>
                </label>
              )}
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6">
              <Button variant="secondary" darkMode={darkMode} onClick={closeForm}>Annuler</Button>
              <Button onClick={saveRdv} disabled={saving}>{saving ? 'Envoi…' : editingId ? 'Modifier' : 'Envoyer la demande'}</Button>
            </div>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-3 min-w-0">
          {rs.length > 0 && (
            <div className="space-y-3">
              <SearchInput value={query} onChange={setQuery} darkMode={darkMode} count={visible.length}
                placeholder="Médecin, spécialité, lieu, date…" label="Rechercher un rendez-vous" />
              <div className="flex flex-wrap items-center gap-2">
                <Pills darkMode={darkMode} value={statusFilter} onChange={setStatusFilter}
                  options={[['all', 'Tous', countOf('all')], ['upcoming', 'À venir', countOf('upcoming')], ['requested', 'En attente', countOf('requested')], ['confirmed', 'Confirmés', countOf('confirmed')], ['cancelled', 'Annulés', countOf('cancelled')]]} />
                {day && (
                  <button type="button" onClick={() => setDay(null)} aria-label="Retirer le filtre de date"
                    className={`h-8 px-3 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 border ${darkMode ? 'border-red-900 text-red-300' : 'border-red-200 bg-red-50 text-red-700'}`}>
                    {new Date(`${day}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}
          {rs.length > 0 && visible.length === 0 && (query && results.length === 0
            ? <NoResults query={query} onClear={() => setQuery('')} darkMode={darkMode} />
            : <EmptyState Icon={Calendar} title="Aucun rendez-vous pour ce filtre" darkMode={darkMode}
                action={<Button variant="secondary" darkMode={darkMode} onClick={() => { setDay(null); setStatusFilter('all'); }}>Tout afficher</Button>}>
                Changez de jour ou de statut pour retrouver vos autres rendez-vous.
              </EmptyState>)}
          {rs.length === 0 && (
            <EmptyState Icon={Calendar} title="Aucun rendez-vous" darkMode={darkMode}
              action={<Button Icon={Plus} onClick={openNew}>Demander un rendez-vous</Button>}>
              Vos demandes et rendez-vous confirmés apparaîtront ici.
            </EmptyState>
          )}
          {visible.map((r) => {
            const isNext = nextRdv && r === nextRdv;
            const cancelled = r.status === 'cancelled';
            const [statusLabel, tone, StatusIcon] = STATUS_STYLE[r.status] || [r.status, 'neutral', null];
            return (
              <Card key={r.id || r.startsAt} darkMode={darkMode} className={`${isNext ? '!border-red-300' : ''} ${cancelled ? 'opacity-70' : ''}`}>
                <div className="flex items-start gap-3 sm:gap-4">
                  <DateBlock date={r.startsAt} highlight={isNext} darkMode={darkMode} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="hidden sm:inline-flex"><Avatar name={r.dr || '?'} size="sm" /></span>
                        <div className="min-w-0">
                          <h4 className={`font-semibold break-words ${cancelled ? 'line-through' : ''}`}><Highlight text={r.dr} query={query} /></h4>
                          {r.sp && <p className={`text-xs ${sub}`}><Highlight text={r.sp} query={query} /></p>}
                        </div>
                      </div>
                      <Chip tone={isNext && !cancelled ? 'alert' : tone}>{StatusIcon && <StatusIcon className="w-3 h-3" />}{statusLabel}</Chip>
                    </div>
                    <div className={`flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs ${sub}`}>
                      <span className="flex items-center gap-1 capitalize"><Clock className="w-3 h-3" /> {r.day} · {r.t}</span>
                      {(r.l || r.v) && <span className="flex items-center gap-1 min-w-0">{r.v ? <Video className="w-3 h-3 shrink-0" /> : <MapPin className="w-3 h-3 shrink-0" />} <span className="truncate"><Highlight text={r.l} query={query} /></span></span>}
                    </div>
                    {!cancelled && (
                      <div className="flex gap-2 mt-4 flex-wrap">
                        {r.v ? (
                          <p className={`text-xs px-3 py-2 rounded-2xl border ${darkMode ? 'border-slate-700' : 'border-red-100'} ${sub}`}>
                            Téléconsultation : le médecin vous indiquera comment le joindre
                          </p>
                        ) : (
                          <Button variant="secondary" darkMode={darkMode} Icon={MapPin} className={smallBtn}
                            onClick={() => { if (r.l) window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.l)}`, '_blank'); }}>
                            Itinéraire
                          </Button>
                        )}
                        {r.id && (
                          <>
                            <Button variant="secondary" darkMode={darkMode} Icon={Edit3} className={smallBtn} onClick={() => openEditRdv(r)}>Modifier</Button>
                            <Button variant="danger" darkMode={darkMode} Icon={Trash2} className={smallBtn} onClick={() => setPendingDelete(r.id)}>Annuler</Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
        <div className="space-y-5 self-start min-w-0">
        <Card darkMode={darkMode}>
          <CardTitle Icon={Calendar} action={day ? <button type="button" onClick={() => setDay(null)} className="text-xs font-semibold text-red-700 hover:underline">Tous les jours</button> : null}>Calendrier</CardTitle>
          <MonthCalendar marked={marked} selected={day} onSelect={setDay} darkMode={darkMode} initial={nextRdv?.startsAt} />
          <p className={`text-xs mt-3 ${sub}`}>Touchez un jour marqué pour n’afficher que ses rendez-vous.</p>
        </Card>
        <Card darkMode={darkMode}>
          <CardTitle Icon={ClipboardCheck}>Préparer mon rendez-vous</CardTitle>
          <ul className="space-y-3">
            {PREP_TIPS.map((s) => (
              <li key={s} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0 mt-px" />
                <p className="text-sm">{s}</p>
              </li>
            ))}
          </ul>
        </Card>
        </div>
      </div>
      {pendingDelete && (
        <ConfirmDialog
          title="Annuler le rendez-vous"
          message="Le rendez-vous sera annulé et le médecin prévenu. Il restera visible dans votre historique."
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => deleteRdv(pendingDelete)}
          card={card}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}
