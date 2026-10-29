import React, { useMemo, useState } from 'react';
import { Bell, CheckCheck, Calendar, Pill, Microscope, MessageCircle, Syringe, FileText, Stethoscope, ShieldCheck, Share2, ChevronRight } from 'lucide-react';
import { patientApi } from '../../api/patientApi.js';
import { searchableDate, useSearch, useUrlQuery } from '../../utils/search.js';
import { PageHeader, Card, Button, IconBadge, EmptyState, Pills, Chip, SearchInput, Highlight, NoResults } from '../../components/patient/ui.jsx';

/* Type de notification → icône, libellé lisible et famille de filtre. */
const TYPES = {
  appointment:  { Icon: Calendar,      label: 'Rendez-vous',   group: 'appointment' },
  consultation: { Icon: Stethoscope,   label: 'Consultation',  group: 'appointment' },
  referral:     { Icon: Share2,        label: 'Orientation',   group: 'appointment' },
  prescription: { Icon: FileText,      label: 'Ordonnance',    group: 'medication' },
  medication:   { Icon: Pill,          label: 'Médicament',    group: 'medication' },
  pharmacy:     { Icon: Pill,          label: 'Pharmacie',     group: 'medication' },
  dispense:     { Icon: Pill,          label: 'Délivrance',    group: 'medication' },
  lab_result:   { Icon: Microscope,    label: 'Résultat',      group: 'result' },
  result:       { Icon: Microscope,    label: 'Résultat',      group: 'result' },
  vaccine:      { Icon: Syringe,       label: 'Vaccination',   group: 'other' },
  message:      { Icon: MessageCircle, label: 'Message',       group: 'message' },
  consent:      { Icon: ShieldCheck,   label: 'Accès dossier', group: 'other' },
  system:       { Icon: Bell,          label: 'Information',   group: 'other' },
};
const typeOf = (n) => TYPES[n.type] || TYPES.system;

const FILTERS = [
  ['all', 'Toutes'],
  ['unread', 'Non lues'],
  ['appointment', 'Rendez-vous'],
  ['medication', 'Ordonnances & médicaments'],
  ['result', 'Résultats'],
  ['message', 'Messages'],
  ['other', 'Autres'],
];
const matchesFilter = (n, f) => f === 'all' || (f === 'unread' ? !n.isRead : typeOf(n).group === f);

// Champs cherchables : titre, texte, type (libellé et code), date lisible, statut.
const FIELDS = (n) => [n.title, n.body, typeOf(n).label, searchableDate(n.createdAt), n.isRead ? 'lue' : 'non lue', n.type];

/* Regroupement par jour : Aujourd'hui, Hier, Cette semaine, Plus ancien. */
const BUCKETS = [['today', 'Aujourd’hui'], ['yesterday', 'Hier'], ['week', 'Cette semaine'], ['older', 'Plus ancien']];
function bucketOf(iso) {
  if (!iso) return 'older';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'older';
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const diff = Math.floor((start - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
  if (diff <= 0) return 'today';
  if (diff === 1) return 'yesterday';
  if (diff < 7) return 'week';
  return 'older';
}
function timeLabel(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const b = bucketOf(iso);
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (b === 'today' || b === 'yesterday') return time;
  return `${d.toLocaleDateString('fr-FR', { weekday: b === 'week' ? 'long' : undefined, day: 'numeric', month: 'short' })} · ${time}`;
}

export default function PNotifications({ data, onReload, notify, setPage, card, sub, border, darkMode, api = patientApi }) {
  const notifs = Array.isArray(data) ? data : (data?.data || []);
  const unread = notifs.filter(n => !n.isRead).length;
  const [query, setQuery] = useUrlQuery();
  const [filter, setFilter] = useState('all');
  const results = useSearch(notifs, query, FIELDS);

  const counts = useMemo(() => Object.fromEntries(FILTERS.map(([id]) => [id, results.filter(n => matchesFilter(n, id)).length])), [results]);
  const visible = results.filter(n => matchesFilter(n, filter));
  const grouped = BUCKETS.map(([id, label]) => [id, label, visible.filter(n => bucketOf(n.createdAt) === id)]).filter(([, , list]) => list.length);
  const filterOptions = FILTERS.filter(([id]) => id === 'all' || id === 'unread' || id === filter || notifs.some(n => matchesFilter(n, id)))
    .map(([id, label]) => [id, label, counts[id]]);

  const markRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      onReload?.(await api.notifications());
    } catch(e) {notify?.(e.message,'error');}
  };

  const markAll = async () => {
    try {
      await api.markAllNotificationsRead();
      onReload?.(await api.notifications());
      notify?.('Toutes les notifications sont lues');
    } catch(e) {notify?.(e.message,'error');}
  };

  if (!data) return (
    <div className="space-y-5">
      <PageHeader title="Notifications" sub={sub} />
      <Card darkMode={darkMode}>
        <div className="space-y-3">{[0,1,2].map(i => <div key={i} className={`animate-pulse h-16 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-red-50'}`} />)}</div>
      </Card>
    </div>
  );

  const line = darkMode ? 'divide-slate-800' : 'divide-slate-100';

  return (
    <div className="space-y-5">
      <PageHeader title="Notifications" sub={sub}
        subtitle={unread ? `${unread} non lue${unread > 1 ? 's' : ''} sur ${notifs.length}` : 'Vous êtes à jour'}
        actions={unread > 0 && (
          <Button variant="secondary" Icon={CheckCheck} onClick={markAll} darkMode={darkMode}>Tout marquer comme lu</Button>
        )} />

      {notifs.length === 0 ? (
        <EmptyState Icon={Bell} title="Aucune notification" darkMode={darkMode}>Vous êtes à jour.</EmptyState>
      ) : (
        <>
          <div className="space-y-3">
            <SearchInput value={query} onChange={setQuery} count={visible.length} darkMode={darkMode}
              placeholder="Rechercher une notification (titre, type, date…)" label="Rechercher dans les notifications" />
            <div className="overflow-x-auto -mx-1 px-1 pb-1"><Pills options={filterOptions} value={filter} onChange={setFilter} darkMode={darkMode} /></div>
          </div>

          {visible.length === 0 ? (
            query
              ? <NoResults query={query} onClear={() => setQuery('')} darkMode={darkMode} />
              : <EmptyState Icon={Bell} title="Rien dans cette catégorie" darkMode={darkMode}
                  action={<Button variant="secondary" onClick={() => setFilter('all')} darkMode={darkMode}>Voir toutes</Button>}>
                  Aucune notification ne correspond à ce filtre.
                </EmptyState>
          ) : (
            <div className="space-y-5">
              {grouped.map(([id, label, list]) => (
                <Card key={id} darkMode={darkMode} className="!p-0 overflow-hidden" aria-labelledby={`notif-${id}`}>
                  <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
                    <h3 id={`notif-${id}`} className="text-sm font-semibold">{label}</h3>
                    <span className={`text-xs ${sub}`}>{list.length}</span>
                  </div>
                  <ul className={`divide-y ${line}`}>
                    {list.map((n) => {
                      const { Icon, label: typeLabel } = typeOf(n);
                      const isUnread = !n.isRead;
                      return (
                        <li key={n.id}>
                          <div role="button" tabIndex={0}
                            aria-label={`${isUnread ? 'Non lue : ' : ''}${n.title}`}
                            onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.currentTarget.click();}}}
                            onClick={() => { markRead(n.id); if (n.linkPage) setPage?.(n.linkPage); }}
                            className={`px-5 py-4 flex items-start gap-3 sm:gap-4 cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500/50 ${isUnread ? (darkMode ? 'bg-red-950/20 hover:bg-red-950/30' : 'bg-red-50/60 hover:bg-red-50') : (darkMode ? 'hover:bg-slate-800/40' : 'hover:bg-red-50/40')}`}>
                            <IconBadge Icon={Icon} solid={isUnread} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3">
                                <p className={`text-sm break-words ${isUnread ? 'font-semibold' : `font-medium ${sub}`}`}><Highlight text={n.title} query={query} /></p>
                                <span className={`text-[11px] whitespace-nowrap shrink-0 mt-0.5 ${sub}`}>{timeLabel(n.createdAt)}</span>
                              </div>
                              {n.body && <p className={`text-sm mt-1 line-clamp-2 break-words ${sub}`}><Highlight text={n.body} query={query} /></p>}
                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                <Chip tone={isUnread ? 'watch' : 'neutral'}><Highlight text={typeLabel} query={query} /></Chip>
                                {isUnread && <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600"><span className="w-1.5 h-1.5 rounded-full bg-red-600" aria-hidden="true" />Non lue</span>}
                              </div>
                            </div>
                            {n.linkPage && <ChevronRight className={`w-4 h-4 shrink-0 mt-3 ${sub}`} aria-hidden="true" />}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
