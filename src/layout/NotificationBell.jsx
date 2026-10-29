import React, { useEffect, useRef, useState } from 'react';
import { Bell, Calendar, Microscope, MessageCircle, Pill, Syringe } from 'lucide-react';
import { patientApi } from '../api/patientApi.js';
import { formatRelativeDate } from '../utils/format.js';

const TYPE_ICON = { appointment: Calendar, medication: Pill, vaccine: Syringe, message: MessageCircle, result: Microscope };

/* Cloche du header patient : les notifications s'ouvrent dans un panneau, sans quitter la page. */
export default function NotificationBell({ count = 0, onCount, setPage, darkMode, sub }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const ref = useRef(null);

  const apply = (list) => {
    const rows = Array.isArray(list) ? list : (list?.data || []);
    setItems(rows);
    onCount?.(rows.filter((n) => !n.isRead).length);
  };
  const load = () => patientApi.notifications().then(apply).catch((err) => setError(err.message || 'Notifications indisponibles.'));

  useEffect(() => {
    if (!open) return undefined;
    setError('');
    load();
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') { setOpen(false); ref.current?.querySelector('button')?.focus(); } };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
    // load ne dépend que de setters stables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const openItem = async (n) => {
    setOpen(false);
    if (n.linkPage) setPage(n.linkPage);
    if (!n.isRead) {
      try { await patientApi.markNotificationRead(n.id); apply(await patientApi.notifications()); } catch { /* reste non lue */ }
    }
  };
  const markAll = async () => {
    try { await patientApi.markAllNotificationsRead(); apply(await patientApi.notifications()); }
    catch (err) { setError(err.message || 'Action impossible.'); }
  };

  const unread = items ? items.filter((n) => !n.isRead).length : count;
  const panel = darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200';
  const rowHover = darkMode ? 'hover:bg-slate-800' : 'hover:bg-red-50/60';

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="dialog" aria-expanded={open}
        aria-label={count > 0 ? `Notifications, ${count} non lue${count > 1 ? 's' : ''}` : 'Notifications'}
        className={`relative p-2 rounded-lg ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-red-50'}`}>
        <Bell className="w-4 h-4" />
        {count > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">{count > 9 ? '9+' : count}</span>}
      </button>
      {open && (
        <div role="dialog" aria-label="Notifications" className={`absolute right-0 top-full mt-2 z-[60] w-[min(22rem,calc(100vw-2rem))] rounded-xl border shadow-xl ${panel}`}>
          <div className={`flex items-center justify-between gap-3 px-4 py-3 border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Notifications</p>
              <p className={`text-xs ${sub}`}>{unread} non lue{unread > 1 ? 's' : ''}</p>
            </div>
            {unread > 0 && <button type="button" onClick={markAll} className="shrink-0 whitespace-nowrap text-xs font-semibold text-red-600 hover:text-red-700">Tout marquer comme lu</button>}
          </div>
          <div className="max-h-96 overflow-y-auto p-1.5">
            {error && <p role="alert" className="px-3 py-4 text-sm text-red-600">{error}</p>}
            {!error && !items && [0, 1, 2].map((i) => <div key={i} className={`animate-pulse h-14 m-1.5 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-red-50'}`} />)}
            {!error && items?.length === 0 && <p className={`px-3 py-8 text-center text-sm ${sub}`}>Aucune notification.</p>}
            {items?.map((n) => {
              const Icon = TYPE_ICON[n.type] || Bell;
              return (
                <button key={n.id} type="button" onClick={() => openItem(n)} className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left ${rowHover}`}>
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${n.isRead ? (darkMode ? 'bg-slate-800 text-slate-400' : 'bg-white border border-red-100 text-red-400') : 'bg-red-50 text-red-600'}`}><Icon className="w-4 h-4" /></span>
                  <span className="flex-1 min-w-0">
                    <span className={`block text-sm ${n.isRead ? sub : 'font-semibold'}`}>{n.title}</span>
                    {n.body && <span className={`block text-xs ${sub} line-clamp-2`}>{n.body}</span>}
                    <span className={`block text-[10px] ${sub} mt-0.5`}>{formatRelativeDate(n.createdAt)}</span>
                  </span>
                  {!n.isRead && <span className="w-2 h-2 rounded-full bg-red-600 mt-1.5 shrink-0" aria-label="Non lue" />}
                </button>
              );
            })}
          </div>
          <div className={`border-t px-4 py-2.5 ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
            <button type="button" onClick={() => { setOpen(false); setPage('notifications'); }} className="text-xs font-semibold text-red-600 hover:text-red-700">Voir tout l’historique</button>
          </div>
        </div>
      )}
    </div>
  );
}
