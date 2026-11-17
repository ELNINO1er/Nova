import NovaSelect from '../components/NovaSelect.jsx';
import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Activity, AlertCircle, ArrowUpRight, Building2, CalendarDays, CheckCircle2, Copy, Database, Download, KeyRound, Lock,
  MoreVertical, RefreshCw, Search, ServerCog, ShieldCheck, Stethoscope, User, UserPlus, Users, X,
} from 'lucide-react';
import { alertDialog, confirmDialog, promptDialog } from '../components/dialogs.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import { adminApi } from '../api/adminApi.js';
import PageError from '../components/PageError.jsx';
import { dayKey, Empty, KpiCard, MiniCalendar } from '../components/dashboard/kit.jsx';
import { ageFrom } from '../utils/age.js';

/* ============== ADMIN PAGES ============== */

const PAGE_TITLES = {
  dashboard: ['Tour de Contrôle', 'Vue d’ensemble de la plateforme NOVA'],
  audit: ['Journal d’audit', 'Actions sensibles tracées sur la plateforme'],
  users: ['Utilisateurs', 'Médecins, patients, pharmacies et comptes de connexion'],
  system: ['Système', 'État technique et mesures de sécurité'],
  settings: ['Paramètres', 'Votre compte administrateur'],
};

const ROLE_NAMES = { patient: 'Patient', doctor: 'Médecin', pharmacist: 'Pharmacien', admin: 'Admin', governor: 'Gouverneur', system: 'Système' };

// « 0710000001 » → « 07 10 00 00 01 » ; les autres formats sont affichés tels quels.
const fmtPhone = (value) => (/^\d{10}$/.test(String(value || '')) ? String(value).replace(/(\d{2})(?=\d)/g, '$1 ') : (value || '—'));

export default function AdminPages({ page, setPage, card, sub, border, darkMode }) {
  const p = { card, sub, border, darkMode };
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    const loaders = {
      dashboard: adminApi.dashboard,
      audit: () => adminApi.auditLogs({ limit: 100 }),
      system: adminApi.system,
    };
    const loader = loaders[page];
    setError('');
    setData(null);
    if (!loader) return () => { alive = false; };
    loader()
      .then((res) => { if (alive) setData(res); })
      .catch((err) => { if (alive) setError(err.message || 'Chargement impossible.'); });
    return () => { alive = false; };
  }, [page, reloadKey]);

  const [title, subtitle] = PAGE_TITLES[page] || PAGE_TITLES.dashboard;
  const retry = () => setReloadKey((k) => k + 1);
  const needsData = ['dashboard', 'audit', 'system'].includes(page);

  return (
    <div className="space-y-6">
      {page !== 'dashboard' && <div>
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className={`text-sm ${sub}`}>{subtitle}</p>
      </div>}
      {needsData && error && !data && <PageError message={error} onRetry={retry} card={card} sub={sub} />}
      {needsData && !error && !data && <Skeleton darkMode={darkMode} />}
      {page === 'dashboard' && data && <ADash data={data} setPage={setPage} onRefresh={retry} {...p} />}
      {page === 'audit' && data && <AAudit data={data} onRefresh={retry} {...p} />}
      {page === 'users' && <AUsers {...p} />}
      {page === 'system' && data && <ASystem data={data} {...p} />}
      {page === 'settings' && <ASettings {...p} />}
    </div>
  );
}

function Skeleton({ darkMode }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {[0, 1, 2, 3].map((i) => <div key={i} className={`h-28 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />)}
    </div>
  );
}

function StatCard({ label, value, hint, Icon, card, sub }) {
  return <KpiCard label={label} value={Number(value || 0).toLocaleString('fr-FR')} hint={hint} Icon={Icon} card={card} sub={sub} />;
}

const ADMIN_AREAS = [
  { title: 'Patients', target: 'patients', page: 'users', count: 'patients', Icon: Users },
  { title: 'Médecins', target: 'doctors', page: 'users', count: 'doctors', Icon: Stethoscope },
  { title: 'Pharmacies', target: 'pharmacies', page: 'users', count: 'pharmacies', Icon: Building2 },
  { title: 'Comptes', target: 'accounts', page: 'users', count: 'users', Icon: KeyRound },
  { title: 'Journal d’audit', page: 'audit', Icon: Lock },
  { title: 'Système', page: 'system', Icon: ServerCog },
];
const adminNumber = new Intl.NumberFormat('fr-FR');
const dateShort = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const weekDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });
const fold = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function AdminPanel({ title, action, children, className = '' }) {
  return (
    <section className={`min-w-0 rounded-xl border border-red-100 bg-white p-4 group-data-[theme=dark]:border-slate-800 group-data-[theme=dark]:bg-slate-900 ${className}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold">{title}</h2>{action}
      </div>
      {children}
    </section>
  );
}

function AdminLink({ children, onClick }) {
  return <button type="button" onClick={onClick} className="inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-red-700 hover:underline group-data-[theme=dark]:text-red-300">
    {children}<ArrowUpRight size={13} aria-hidden="true" />
  </button>;
}

function ADash({ data, setPage, onRefresh, sub, darkMode }) {
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const k = data.kpis || {};
  const recent = data.recentAudit || [];
  const cities = data.cities || [];
  const marked = new Set(recent.map(a => dayKey(a.createdAt)));
  const activity = selected ? recent.filter(a => dayKey(a.createdAt) === selected) : recent;
  const today = dayKey(new Date());
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i - 6);
    return date;
  });
  const needle = fold(query.trim());
  const shortcuts = ADMIN_AREAS.filter(area => fold(area.title).includes(needle));
  const openArea = area => setPage(area.page, area.target);
  const red = 'text-red-700 group-data-[theme=dark]:text-red-300';
  const tint = 'border-red-100 bg-red-50/70 group-data-[theme=dark]:border-slate-800 group-data-[theme=dark]:bg-slate-950/70';
  const stats = [
    { label: 'Consultations', value: k.consultationsToday, hint: 'Aujourd’hui', Icon: Activity },
    { label: 'Accès aux dossiers', value: k.access24h, hint: 'Dernières 24 h', Icon: ShieldCheck },
    { label: 'Actions auditées', value: k.audit24h, hint: 'Dernières 24 h', Icon: Lock },
  ];

  return (
    <div data-theme={darkMode ? 'dark' : 'light'} className="group grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(16rem,0.32fr)]">
      <div className="min-w-0 space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
          <button type="button" onClick={onRefresh} className={`flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs font-semibold ${tint} ${red}`}>
            <RefreshCw size={14} aria-hidden="true" /> Actualiser
          </button>
        </header>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {ADMIN_AREAS.filter(area => area.count).map(({ Icon, ...area }) => (
            <button key={area.count} type="button" onClick={() => openArea(area)}
              className="flex min-w-0 flex-wrap items-center gap-2 rounded-xl border border-red-100 bg-white p-3 text-left hover:border-red-300 group-data-[theme=dark]:border-slate-800 group-data-[theme=dark]:bg-slate-900">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-red-100 text-red-800"><Icon size={17} aria-hidden="true" /></span>
              <span className="min-w-0"><span className={`block text-xs ${sub}`}>{area.title}</span><strong className="text-lg tabular-nums">{adminNumber.format(k[area.count] ?? 0)}</strong></span>
            </button>
          ))}
        </div>

        <AdminPanel title="Activité récente" action={<AdminLink onClick={() => setPage('audit')}>Journal complet</AdminLink>}>
          <div className="mb-3 grid grid-cols-4 gap-1.5 sm:grid-cols-7">
            {week.map(date => {
              const key = dayKey(date);
              return <button type="button" key={key} aria-pressed={selected === key} aria-label={dateShort.format(date)}
                onClick={() => setSelected(key === selected ? null : key)}
                className={`min-h-12 rounded-lg border px-1 py-1.5 text-xs ${selected === key ? 'border-red-700 bg-red-700 text-white' : tint}`}>
                <span className="block capitalize">{weekDay.format(date)}</span>
                <strong className="tabular-nums">{date.getDate()}</strong>
                {(marked.has(key) || key === today) && <span aria-hidden="true" className={`mx-auto block size-1 rounded-full ${selected === key ? 'bg-white' : 'bg-red-600'}`} />}
              </button>;
            })}
          </div>
          {selected && <AdminLink onClick={() => setSelected(null)}>Retirer le filtre de date</AdminLink>}
          {activity.length ? <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {activity.slice(0, 3).map(a => <li key={a.id} className={`min-w-0 rounded-lg border p-3 ${tint}`}>
              <div className="flex items-start gap-2">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-red-100 text-red-800"><Activity size={15} aria-hidden="true" /></span>
                <div className="min-w-0"><p className="break-words text-xs font-semibold">{actionLabel(a.action)}</p><p className={`mt-1 text-[11px] ${sub}`}>{ROLE_NAMES[a.userRole] || 'Système'} · {formatDate(a.createdAt)}</p></div>
              </div>
            </li>)}
          </ul> : <Empty sub={sub}>{selected ? 'Aucune des actions récentes à cette date.' : 'Aucune action enregistrée.'}</Empty>}
        </AdminPanel>

        <AdminPanel title="Espaces de gestion">
          <label className={`mb-3 flex min-h-10 max-w-xs items-center gap-2 rounded-lg border px-3 ${tint}`}>
            <Search size={15} className={red} aria-hidden="true" />
            <input type="search" value={query} onChange={e => setQuery(e.target.value)} aria-label="Rechercher un espace de gestion" placeholder="Rechercher un espace"
              className="min-w-0 flex-1 bg-transparent text-sm" />
          </label>
          {shortcuts.length ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-6">
            {shortcuts.map(({ Icon, ...area }) => <button key={area.title} type="button" onClick={() => openArea(area)}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border p-2 text-center text-xs font-semibold hover:border-red-300 ${tint}`}>
              <Icon size={18} className={red} aria-hidden="true" />{area.title}
            </button>)}
          </div> : <Empty sub={sub}>Aucun espace trouvé.</Empty>}
        </AdminPanel>

        <AdminPanel title="Dossiers par ville">
          {cities.length ? <ul className="grid gap-2 sm:grid-cols-3">
            {cities.slice(0, 6).map(city => <li key={city.city} className={`flex items-center justify-between gap-2 rounded-lg border p-3 text-xs ${tint}`}>
              <span className="break-words">{city.city}</span><strong className={red}>{adminNumber.format(city.patients)}</strong>
            </li>)}
          </ul> : <Empty sub={sub}>Aucune ville renseignée.</Empty>}
        </AdminPanel>
      </div>

      <aside className="min-w-0 space-y-4">
        <AdminPanel title="Calendrier" action={<CalendarDays size={17} className={red} aria-hidden="true" />}>
          <MiniCalendar selected={selected} onSelect={date => setSelected(current => current === date ? null : date)} marked={marked} darkMode={darkMode} />
          <AdminLink onClick={() => setPage('audit')}>Consulter le journal</AdminLink>
        </AdminPanel>
        <AdminPanel title="Suivi de la plateforme">
          <dl className="space-y-2">
            {stats.map(({ Icon, label, hint, value }) => <div key={label} className={`flex items-center gap-2 rounded-lg border p-2.5 ${tint}`}>
              <Icon size={16} className={`shrink-0 ${red}`} aria-hidden="true" />
              <div className="min-w-0 flex-1"><dt className="text-xs font-semibold">{label}</dt><span className={`block text-[11px] ${sub}`}>{hint}</span></div>
              <dd className={`text-sm font-bold tabular-nums ${red}`}>{adminNumber.format(value ?? 0)}</dd>
            </div>)}
          </dl>
        </AdminPanel>
        <button type="button" onClick={() => setPage('system')} className="flex min-h-14 w-full items-center gap-3 rounded-xl bg-red-700 px-4 py-3 text-left text-sm font-semibold text-white hover:bg-red-800">
          <ServerCog size={20} aria-hidden="true" /> <span className="flex-1">État du système</span><ArrowUpRight size={16} aria-hidden="true" />
        </button>
      </aside>
    </div>
  );
}

const ACTION_LABELS = {
  'admin.doctor.create': 'Création d’un compte médecin',
  'admin.doctor.account_create': 'Création de l’accès d’un médecin',
  'admin.doctor.status_update': 'Changement de statut d’un médecin',
  'admin.pharmacy.status_update': 'Ouverture / fermeture d’une pharmacie',
  'admin.user.password_reset': 'Réinitialisation de mot de passe',
  'admin.account.create': 'Création d’un compte (pharmacien / gouverneur)',
  'patient.create': 'Création d’un patient par un médecin',
};
const actionLabel = (action) => ACTION_LABELS[action] || action || '—';
const actionLevel = (action = '') => (/password_reset|status_update|delete/.test(action) ? 'warning' : 'info');

function AAudit({ data, onRefresh, card, sub, darkMode }) {
  const rows = data?.data || [];
  const levels = {
    info: { label: 'Info', cls: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
    warning: { label: 'Sensible', cls: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  };
  const exportCsv = () => {
    const header = ['Horodatage', 'Rôle', 'Utilisateur', 'Action', 'Ressource', 'Identifiant', 'IP'];
    const lines = rows.map((r) => [r.createdAt, r.userRole, r.userId, r.action, r.resourceType, r.resourceId, r.ipAddress]
      .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';'));
    const blob = new Blob([`﻿${[header.join(';'), ...lines].join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = Object.assign(document.createElement('a'), { href: url, download: `nova-audit-${new Date().toISOString().slice(0, 10)}.csv` });
    link.click();
    URL.revokeObjectURL(url);
  };
  const head = `text-xs ${sub} border-b ${darkMode ? 'border-slate-800' : 'border-slate-200'}`;
  return (
    <div className={`${card} border rounded-2xl p-6`}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <p className={`text-sm ${sub}`}>{rows.length} action(s) affichée(s), les plus récentes en premier.</p>
        <div className="flex gap-2">
          <button type="button" onClick={onRefresh} className="min-h-10 px-3 rounded-xl border text-sm font-semibold flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Actualiser</button>
          <button type="button" onClick={exportCsv} disabled={!rows.length} className="min-h-10 px-3 rounded-xl bg-red-600 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50"><Download className="w-4 h-4" /> Exporter (CSV)</button>
        </div>
      </div>
      {rows.length === 0 ? <p className={`text-sm ${sub} py-6 text-center`}>Aucune action enregistrée pour le moment.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={head}>
                <th className="text-left font-semibold p-3">Niveau</th>
                <th className="text-left font-semibold p-3">Date</th>
                <th className="text-left font-semibold p-3">Acteur</th>
                <th className="text-left font-semibold p-3">Action</th>
                <th className="text-left font-semibold p-3">Cible</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const lvl = levels[actionLevel(r.action)];
                return (
                  <tr key={r.id} className={`border-b align-middle ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                    <td className="p-3"><span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${lvl.cls}`}><span className={`w-1.5 h-1.5 rounded-full ${lvl.dot}`} />{lvl.label}</span></td>
                    <td className={`p-3 text-xs whitespace-nowrap ${sub}`}>{formatDate(r.createdAt)}</td>
                    <td className="p-3 text-xs font-semibold">{ROLE_NAMES[r.userRole] || r.userRole || 'Système'}</td>
                    <td className="p-3 text-xs">{actionLabel(r.action)}</td>
                    <td className={`p-3 text-xs font-mono ${sub}`}>{r.resourceType || '—'}{r.resourceId ? ` · ${String(r.resourceId).slice(0, 8)}` : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* Menu d'actions « ⋮ » d'une ligne : se ferme au clic extérieur ou avec Échap. */
function RowMenu({ items, darkMode }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef(null);
  const menu = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const panel = menu.current;
    const button = trigger.current;
    panel.showPopover();
    const anchor = button.getBoundingClientRect();
    const gap = 4;
    const margin = 8;
    const below = window.innerHeight - anchor.bottom - gap - margin;
    const above = anchor.top - gap - margin;
    const opensAbove = panel.offsetHeight > below && above > below;
    panel.style.maxHeight = `${Math.max(0, opensAbove ? above : below)}px`;
    panel.style.left = `${Math.max(margin, anchor.right - panel.offsetWidth)}px`;
    panel.style.top = `${opensAbove ? anchor.top - gap - panel.offsetHeight : anchor.bottom + gap}px`;
    const close = (e) => {
      if (!button.contains(e.target) && !panel.contains(e.target)) setOpen(false);
    };
    const esc = (e) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      button.focus();
    };
    const onScroll = (e) => { if (!panel.contains(e.target)) setOpen(false); };
    const onResize = () => setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      panel.hidePopover();
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);
  const visible = items.filter(Boolean);
  return (
    <div className="inline-block text-left">
      <button ref={trigger} type="button" aria-label="Actions" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}
        className={`w-9 h-9 inline-flex items-center justify-center rounded-lg ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div ref={menu} popover="manual" role="menu" className={`fixed inset-auto m-0 w-max min-w-64 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-xl border shadow-xl py-1 ${darkMode ? 'bg-slate-900 text-slate-100 border-slate-700' : 'bg-white text-slate-900 border-slate-200'}`}>
          {visible.map((it) => (
            <button key={it.label} type="button" role="menuitem" disabled={it.disabled}
              onClick={() => { setOpen(false); it.onClick(); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left disabled:opacity-40 ${it.danger ? 'text-red-600' : ''} ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
              <it.Icon className="w-4 h-4 shrink-0" /> {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* Identifiants à transmettre (mot de passe affiché une seule fois). */
function IssuedCredentials({ issued, onClose }) {
  if (!issued) return null;
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-2 text-red-900">
      <p className="font-bold">{issued.title} : {issued.name}</p>
      <p className="text-sm">Transmettez ces identifiants par un canal sûr. Le mot de passe ne sera plus affiché et devra être changé à la prochaine connexion.</p>
      <div className="rounded-lg bg-slate-950 text-white p-3 font-mono text-sm">
        <div>Numéro : {fmtPhone(issued.phone)}</div>
        <div>Mot de passe : <span className="font-bold select-all">{issued.password}</span></div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => navigator.clipboard?.writeText(`Numéro : ${issued.phone}\nMot de passe : ${issued.password}`)} className="px-3 py-1.5 rounded-lg border border-red-300 text-xs font-semibold">Copier</button>
        <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg text-xs font-semibold">Masquer</button>
      </div>
    </div>
  );
}

const PENDING_RESET_NOTICE = 'Demande enregistrée : un second administrateur doit la valider avant l’émission du mot de passe.';

function currentUserId() {
  try { return JSON.parse(localStorage.getItem('nova_user') || 'null')?.id || null; } catch { return null; }
}

/* Réinitialisations de comptes sensibles : le demandeur ne peut pas valider sa propre demande. */
function ResetApprovals({ refreshKey, onIssued, sub, darkMode }) {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const me = currentUserId();
  const load = () => adminApi.resetRequests().then((r) => setRows(Array.isArray(r) ? r : [])).catch((err) => setError(err.message || 'Demandes indisponibles.'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [refreshKey]);
  const decide = async (r, approve) => {
    if (!approve && !(await confirmDialog({ title: 'Refuser la réinitialisation ?', message: `La demande de nouveau mot de passe pour ${r.user.name} sera refusée. Le mot de passe actuel reste inchangé.`, confirmLabel: 'Refuser la demande', danger: true }))) return;
    setBusy(r.id); setError('');
    try {
      const res = await adminApi.decideReset(r.id, approve);
      if (approve && res?.provisionalPassword) onIssued({ title: 'Mot de passe réinitialisé', name: res.user.name, phone: res.user.phone, password: res.provisionalPassword });
      await load();
    } catch (err) { setError(err.message || 'Décision impossible.'); }
    finally { setBusy(''); }
  };
  if (!rows.length && !error) return null;
  return (
    <div className={`rounded-xl border p-4 space-y-2 ${darkMode ? 'border-red-800 bg-red-950/30' : 'border-red-200 bg-red-50'}`}>
      <p className="font-bold text-sm flex items-center gap-2"><KeyRound className="w-4 h-4" /> Réinitialisations à valider</p>
      <p className={`text-xs ${sub}`}>Elles remplacent le mot de passe et l’Authenticator du compte : un second administrateur doit confirmer l’identité de la personne avant d’approuver.</p>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {rows.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center gap-2 text-sm">
          <span className="flex-1 min-w-[200px]"><strong>{r.user.name}</strong> ({ROLE_LABELS[r.user.role] || r.user.role}) — demandé par {r.requestedBy === me ? 'vous' : r.requestedByName || 'un administrateur'}</span>
          {r.requestedBy === me
            ? <span className={`text-xs ${sub}`}>En attente d’un second administrateur</span>
            : <>
              <button type="button" disabled={busy === r.id} onClick={() => decide(r, true)} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold disabled:opacity-50">Approuver</button>
              <button type="button" disabled={busy === r.id} onClick={() => decide(r, false)} className="px-3 py-1.5 rounded-lg border text-xs font-semibold disabled:opacity-50">Refuser</button>
            </>}
        </div>
      ))}
    </div>
  );
}

const TABS = [
  { id: 'doctors', label: 'Médecins', Icon: Stethoscope },
  { id: 'patients', label: 'Patients', Icon: User },
  { id: 'pharmacies', label: 'Pharmacies', Icon: Building2 },
  { id: 'accounts', label: 'Comptes & mots de passe', Icon: KeyRound },
];

function AUsers({ card, sub, darkMode }) {
  const { state } = useLocation();
  const [tab, setTab] = useState(() => TABS.some(tab => tab.id === state?.targetId) ? state.targetId : 'doctors');
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [issued, setIssued] = useState(null);
  const [resetTick, setResetTick] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [doctorForm, setDoctorForm] = useState({ firstName: '', lastName: '', email: '', phone: '', licenseNumber: '', specialty: '', city: 'Abidjan', address: '' });

  const loadCounts = () => Promise.all(['doctors', 'patients', 'pharmacies'].map((type) =>
    adminApi.users({ type, limit: 1 }).then((res) => [type, res?.pagination?.total ?? 0]).catch(() => [type, null])
  )).then((entries) => setCounts(Object.fromEntries(entries)));

  const load = (type = tab, term = search) => {
    if (type === 'accounts') return Promise.resolve();
    setLoading(true); setError('');
    return adminApi.users({ type, search: term, limit: 100 })
      .then((res) => setRows(res?.data || []))
      .catch((err) => setError(err.message || 'Chargement impossible.'))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadCounts(); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setRows([]); setSearch(''); setNotice(''); setIssued(null); setError(''); load(tab, ''); }, [tab]);

  const flash = (message) => { setNotice(message); setTimeout(() => setNotice(''), 3000); };
  const copy = (text, label) => { navigator.clipboard?.writeText(text); flash(`${label} copié.`); };

  const resetPassword = async (userId, name) => {
    if (!userId) return setError('Ce dossier n’a pas encore de compte de connexion.');
    if (!(await confirmDialog({ title: 'Réinitialiser le mot de passe ?', message: `Un nouveau mot de passe provisoire sera généré pour ${name}. L’ancien ne fonctionnera plus et ses sessions seront fermées.`, confirmLabel: 'Générer le mot de passe' }))) return;
    try {
      const res = await adminApi.resetPassword(userId);
      if (res.pending) { setNotice(PENDING_RESET_NOTICE); setResetTick((t) => t + 1); return; }
      setIssued({ title: 'Mot de passe réinitialisé', name: res.user.name, phone: res.user.phone, password: res.provisionalPassword });
    } catch (err) { setError(err.message || 'Réinitialisation impossible.'); }
  };

  const createLogin = async (d) => {
    const phone = await promptDialog({ title: 'Créer l’accès de connexion', message: `Dr. ${d.firstName} ${d.lastName} se connectera avec ce numéro et un mot de passe provisoire.`, label: 'Numéro de téléphone', placeholder: '07 00 00 00 00', inputMode: 'tel', required: true, requiredMessage: 'Saisissez le numéro de connexion.', validate: (v) => (/^\d{10}$/.test(v.replace(/\s/g, '')) ? null : 'Le numéro doit comporter 10 chiffres.'), confirmLabel: 'Créer l’accès' });
    if (phone == null) return;
    try {
      const res = await adminApi.createDoctorLogin(d.id, phone.replace(/\s/g, ''));
      setIssued({ title: 'Accès médecin créé', name: res.user.name, phone: res.user.phone, password: res.provisionalPassword });
      await load();
    } catch (err) { setError(err.message || 'Création impossible.'); }
  };

  const toggleDoctor = async (d) => {
    const next = !Number(d.isAvailable);
    if (!next && !(await confirmDialog({ title: `Suspendre Dr ${d.firstName} ${d.lastName} ?`, message: 'Ce médecin n’apparaîtra plus dans la recherche des patients et ne pourra plus recevoir de rendez-vous. Vous pourrez le réactiver à tout moment.', confirmLabel: 'Suspendre', danger: true }))) return;
    try { await adminApi.setDoctorStatus(d.id, next); flash(next ? 'Médecin réactivé.' : 'Médecin suspendu.'); await load(); }
    catch (err) { setError(err.message || 'Mise à jour impossible.'); }
  };

  const togglePharmacy = async (ph) => {
    const next = !Number(ph.isOpen);
    try { await adminApi.setPharmacyStatus(ph.id, next); flash(next ? 'Pharmacie marquée ouverte.' : 'Pharmacie marquée fermée.'); await load(); }
    catch (err) { setError(err.message || 'Mise à jour impossible.'); }
  };

  const createDoctor = async () => {
    setCreating(true); setError('');
    try {
      setCredentials(await adminApi.createDoctor(doctorForm));
      setDoctorForm({ firstName: '', lastName: '', email: '', phone: '', licenseNumber: '', specialty: '', city: 'Abidjan', address: '' });
      await Promise.all([load(), loadCounts()]);
    } catch (err) { setError(err.message || 'Création impossible.'); }
    finally { setCreating(false); }
  };

  const input = `w-full min-h-11 rounded-xl border px-3 text-sm ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`;
  const head = `text-xs ${sub} border-b ${darkMode ? 'border-slate-800' : 'border-slate-200'}`;
  const line = `border-b align-middle ${darkMode ? 'border-slate-800' : 'border-slate-100'}`;
  const badge = (ok, yes, no) => <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${ok ? 'bg-red-100 text-red-700' : 'bg-red-100 text-red-700'}`}>{ok ? yes : no}</span>;
  const avatar = (text) => <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center font-bold text-xs">{text}</div>;
  const initialsOf = (a, b) => `${(a || '?')[0]}${(b || '')[0] || ''}`.toUpperCase();
  const empty = (cols) => <tr><td colSpan={cols} className={`p-6 text-center text-sm ${sub}`}>{loading ? 'Chargement…' : 'Aucun résultat.'}</td></tr>;

  return (
    <div className={`${card} border rounded-2xl p-4 sm:p-6 space-y-4`}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className={`flex flex-wrap gap-1 p-1 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} type="button" onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium ${tab === id ? (darkMode ? 'bg-slate-950 text-white shadow' : 'bg-white text-slate-900 shadow') : sub}`}>
              <Icon className="w-4 h-4" /> {label}{counts[id] != null ? ` (${counts[id]})` : ''}
            </button>
          ))}
        </div>
        {tab === 'doctors' && (
          <button type="button" onClick={() => { setCredentials(null); setShowCreate(true); }} className="min-h-11 px-4 rounded-xl bg-red-600 text-white text-sm font-semibold flex items-center gap-2 hover:bg-red-700">
            <UserPlus className="w-4 h-4" /> Ajouter un médecin
          </button>
        )}
      </div>

      <ResetApprovals refreshKey={resetTick} onIssued={setIssued} sub={sub} darkMode={darkMode} />
      {tab === 'accounts' && <IssuedCredentials issued={issued} onClose={() => setIssued(null)} />}
      {tab === 'accounts' ? <AAccounts card={card} sub={sub} darkMode={darkMode} onPending={() => setResetTick((t) => t + 1)} /> : <>
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex gap-2 max-w-xl">
          <div className="relative flex-1">
            <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${sub}`} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tab === 'pharmacies' ? 'Nom, ville ou téléphone' : 'Nom, téléphone, spécialité ou CMU'} className={`${input} pl-9`} />
          </div>
          <button type="submit" className="min-h-11 px-4 rounded-xl border text-sm font-semibold">Rechercher</button>
        </form>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {notice && <p className="text-sm text-red-700">{notice}</p>}
        <IssuedCredentials issued={issued} onClose={() => setIssued(null)} />

        <div className="overflow-x-auto">
          {tab === 'doctors' && (
            <table className="w-full text-sm">
              <thead><tr className={head}>
                <th className="text-left font-semibold p-3">Médecin</th><th className="text-left font-semibold p-3">Spécialité</th>
                <th className="text-left font-semibold p-3">Connexion</th><th className="text-left font-semibold p-3">Statut</th><th className="text-right font-semibold p-3 w-16">Actions</th>
              </tr></thead>
              <tbody>
                {rows.length === 0 ? empty(5) : rows.map((d) => (
                  <tr key={d.id} className={line}>
                    <td className="p-3"><div className="flex items-center gap-3">{avatar(initialsOf(d.firstName, d.lastName))}<div className="min-w-0"><p className="font-semibold truncate">Dr. {d.firstName} {d.lastName}</p><p className={`text-xs truncate ${sub}`}>{d.city || '—'}</p></div></div></td>
                    <td className={`p-3 ${sub}`}>{d.specialty || '—'}</td>
                    <td className="p-3">{d.loginPhone ? <p className="font-mono text-xs">{fmtPhone(d.loginPhone)}</p> : <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">Aucun compte</span>}{d.phone && d.phone !== d.loginPhone && <p className={`text-[11px] ${sub}`}>Cabinet : {d.phone}</p>}</td>
                    <td className="p-3">{badge(Number(d.isAvailable), 'Actif', 'Suspendu')}</td>
                    <td className="p-3 text-right"><RowMenu darkMode={darkMode} items={[
                      d.userId
                        ? { label: 'Réinitialiser le mot de passe', Icon: KeyRound, onClick: () => resetPassword(d.userId, `Dr. ${d.firstName} ${d.lastName}`) }
                        : { label: 'Créer l’accès de connexion', Icon: KeyRound, onClick: () => createLogin(d) },
                      d.loginPhone && { label: 'Copier le numéro de connexion', Icon: Copy, onClick: () => copy(d.loginPhone, 'Numéro') },
                      d.email && { label: 'Copier l’email', Icon: Copy, onClick: () => copy(d.email, 'Email') },
                      Number(d.isAvailable)
                        ? { label: 'Suspendre le médecin', Icon: X, danger: true, onClick: () => toggleDoctor(d) }
                        : { label: 'Réactiver le médecin', Icon: CheckCircle2, onClick: () => toggleDoctor(d) },
                    ]} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'patients' && (
            <table className="w-full text-sm">
              <thead><tr className={head}>
                <th className="text-left font-semibold p-3">Patient</th><th className="text-left font-semibold p-3">N° CMU</th>
                <th className="text-left font-semibold p-3">Connexion</th><th className="text-left font-semibold p-3">Âge</th><th className="text-right font-semibold p-3 w-16">Actions</th>
              </tr></thead>
              <tbody>
                {rows.length === 0 ? empty(5) : rows.map((pt) => {
                  const age = ageFromBirthDate(pt.birthDate);
                  return (
                    <tr key={pt.id} className={line}>
                      <td className="p-3"><div className="flex items-center gap-3">{avatar(initialsOf(pt.firstName, pt.lastName))}<div className="min-w-0"><p className="font-semibold truncate">{pt.firstName} {pt.lastName}</p><p className={`text-xs truncate ${sub}`}>{pt.city || '—'}</p></div></div></td>
                      <td className={`p-3 font-mono text-xs ${sub}`}>{pt.cmuNumber || '—'}</td>
                      <td className="p-3 font-mono text-xs">{fmtPhone(pt.loginPhone || pt.phone)}</td>
                      <td className="p-3"><span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700">{age === '-' ? 'Non renseigné' : `${age} ans`}</span></td>
                      <td className="p-3 text-right"><RowMenu darkMode={darkMode} items={[
                        { label: 'Réinitialiser le mot de passe', Icon: KeyRound, onClick: () => resetPassword(pt.userId, `${pt.firstName} ${pt.lastName}`), disabled: !pt.userId },
                        (pt.loginPhone || pt.phone) && { label: 'Copier le numéro de connexion', Icon: Copy, onClick: () => copy(pt.loginPhone || pt.phone, 'Numéro') },
                        pt.cmuNumber && { label: 'Copier le n° CMU', Icon: Copy, onClick: () => copy(pt.cmuNumber, 'N° CMU') },
                      ]} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {tab === 'pharmacies' && (
            <table className="w-full text-sm">
              <thead><tr className={head}>
                <th className="text-left font-semibold p-3">Pharmacie</th><th className="text-left font-semibold p-3">Horaires</th>
                <th className="text-left font-semibold p-3">Téléphone</th><th className="text-left font-semibold p-3">Statut</th><th className="text-right font-semibold p-3 w-16">Actions</th>
              </tr></thead>
              <tbody>
                {rows.length === 0 ? empty(5) : rows.map((ph) => (
                  <tr key={ph.id} className={line}>
                    <td className="p-3"><div className="flex items-center gap-3"><div className="w-9 h-9 shrink-0 rounded-full bg-red-100 text-red-700 flex items-center justify-center"><Building2 className="w-4 h-4" /></div><div className="min-w-0"><p className="font-semibold truncate">{ph.name}</p><p className={`text-xs truncate ${sub}`}>{ph.city || '—'}{Number(ph.isDuty) ? ' · De garde' : ''}</p></div></div></td>
                    <td className={`p-3 text-xs ${sub}`}>{ph.opensAt && ph.closesAt ? `${ph.opensAt} – ${ph.closesAt}` : '—'}</td>
                    <td className="p-3 font-mono text-xs">{fmtPhone(ph.phone)}</td>
                    <td className="p-3">{badge(Number(ph.isOpen), 'Ouverte', 'Fermée')}</td>
                    <td className="p-3 text-right"><RowMenu darkMode={darkMode} items={[
                      Number(ph.isOpen)
                        ? { label: 'Marquer fermée', Icon: X, danger: true, onClick: () => togglePharmacy(ph) }
                        : { label: 'Marquer ouverte', Icon: CheckCircle2, onClick: () => togglePharmacy(ph) },
                      ph.phone && { label: 'Copier le téléphone', Icon: Copy, onClick: () => copy(ph.phone, 'Téléphone') },
                    ]} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </>}

      {showCreate && (
        <div className="fixed inset-0 z-[80] bg-slate-950/55 p-4 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="create-doctor-title">
          <div className={`${card} w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl p-6`}>
            <div className="flex items-center justify-between mb-5">
              <div><h3 id="create-doctor-title" className="text-xl font-bold">Nouveau médecin</h3><p className={`text-xs ${sub}`}>Vérifiez l’identité et le numéro d’ordre avant la création.</p></div>
              <button type="button" aria-label="Fermer" onClick={() => setShowCreate(false)} className="w-11 h-11 rounded-xl flex items-center justify-center hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            {credentials ? (
              <div className="space-y-4">
                <IssuedCredentials issued={{ title: 'Compte médecin créé', name: `Dr. ${credentials.doctor.firstName} ${credentials.doctor.lastName}`, phone: credentials.doctor.phone, password: credentials.provisionalPassword }} onClose={() => setShowCreate(false)} />
                <p className={`text-xs ${sub}`}>À sa première connexion, le médecin choisira son mot de passe puis activera une application Authenticator.</p>
                <button type="button" onClick={() => setShowCreate(false)} className="w-full min-h-11 rounded-xl bg-red-600 text-white font-semibold">Terminer</button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[['firstName', 'Prénom'], ['lastName', 'Nom'], ['phone', 'Téléphone (identifiant de connexion)'], ['email', 'Email professionnel'], ['licenseNumber', 'Numéro d’ordre'], ['specialty', 'Spécialité'], ['city', 'Ville'], ['address', 'Adresse du cabinet']].map(([key, label]) => (
                    <label key={key} className="text-xs font-semibold">{label}
                      <input type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'} value={doctorForm[key]}
                        onChange={(e) => setDoctorForm((cur) => ({ ...cur, [key]: e.target.value }))}
                        placeholder={key === 'phone' ? '0700000000' : ''} className={`mt-1 ${input}`} />
                    </label>
                  ))}
                </div>
                {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
                <button type="button" onClick={createDoctor}
                  disabled={creating || !doctorForm.firstName || !doctorForm.lastName || !doctorForm.email || doctorForm.phone.replace(/\D/g, '').length !== 10 || !doctorForm.licenseNumber || !doctorForm.specialty}
                  className="mt-6 w-full min-h-12 rounded-xl bg-red-600 text-white font-semibold disabled:opacity-50">{creating ? 'Création…' : 'Créer le compte'}</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const ROLE_LABELS = { patient: 'Patient', doctor: 'Médecin', pharmacist: 'Pharmacien', admin: 'Admin', governor: 'Gouverneur' };

/* Comptes de connexion : réinitialisation de mot de passe, création des pharmaciens et gouverneurs. */
function AAccounts({ sub, darkMode, onPending }) {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [issued, setIssued] = useState(null); // { title, name, phone, password }
  const [showPharmacist, setShowPharmacist] = useState(false);
  const [pharmacies, setPharmacies] = useState([]);
  const [form, setForm] = useState({ role: 'pharmacist', name: '', phone: '', pharmacyId: '' });
  const [busy, setBusy] = useState('');
  const input = `w-full min-h-11 rounded-xl border px-3 text-sm ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`;

  const load = () => {
    setLoading(true); setError('');
    return adminApi.users({ type: 'users', search, limit: 100 })
      .then((res) => setRows(res?.data || []))
      .catch((err) => setError(err.message || 'Chargement impossible.'))
      .finally(() => setLoading(false));
  };
  // Chargement initial uniquement ; la recherche relance load() à la demande.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const reset = async (u) => {
    if (!(await confirmDialog({ title: 'Réinitialiser le mot de passe ?', message: `Un nouveau mot de passe provisoire sera généré pour ${u.name}. L’ancien ne fonctionnera plus et ses sessions seront fermées.`, confirmLabel: 'Générer le mot de passe' }))) return;
    setBusy(u.id); setError('');
    try {
      const res = await adminApi.resetPassword(u.id);
      if (res.pending) { setError(''); onPending?.(); alertDialog({ title: 'Demande enregistrée', message: PENDING_RESET_NOTICE }); return; }
      setIssued({ title: 'Mot de passe réinitialisé', name: res.user.name, phone: res.user.phone, password: res.provisionalPassword });
      await load();
    } catch (err) { setError(err.message || 'Réinitialisation impossible.'); }
    finally { setBusy(''); }
  };

  const openPharmacist = async () => {
    setShowPharmacist(true); setError('');
    if (!pharmacies.length) {
      try { setPharmacies((await adminApi.users({ type: 'pharmacies', limit: 100 }))?.data || []); }
      catch (err) { setError(err.message || 'Pharmacies indisponibles.'); }
    }
  };

  const createAccount = async () => {
    setBusy('create'); setError('');
    try {
      const { pharmacyId, ...rest } = form;
      const res = await adminApi.createAccount(form.role === 'pharmacist' ? form : rest);
      setShowPharmacist(false);
      setForm({ role: 'pharmacist', name: '', phone: '', pharmacyId: '' });
      setIssued({ title: `Compte ${ROLE_LABELS[res.user.role].toLowerCase()} créé`, name: res.user.name, phone: res.user.phone, password: res.provisionalPassword });
      await load();
    } catch (err) { setError(err.message || 'Création impossible.'); }
    finally { setBusy(''); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2 flex-1 min-w-[220px]">
          <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} placeholder="Nom, téléphone ou rôle" className={input} />
          <button type="button" onClick={load} className="min-h-11 px-4 rounded-xl border text-sm font-semibold">Rechercher</button>
        </div>
        <button type="button" onClick={openPharmacist} className="min-h-11 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold flex items-center gap-2 hover:bg-red-700"><UserPlus className="w-4 h-4" /> Ajouter un compte</button>
      </div>
      <p className={`text-xs ${sub}`}>Ici : pharmaciens et gouverneurs. Les médecins se créent depuis l’onglet Médecins ; les patients sont créés par leur médecin. Un mot de passe réinitialisé doit être changé à la connexion suivante.</p>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {issued && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-2 text-red-900">
          <p className="font-bold">{issued.title} : {issued.name}</p>
          <p className="text-sm">Transmettez ces identifiants par un canal sûr. Le mot de passe ne sera plus affiché.</p>
          <div className="rounded-lg bg-slate-950 text-white p-3 font-mono text-sm">
            <div>Numéro : {issued.phone}</div>
            <div>Mot de passe : <span className="font-bold select-all">{issued.password}</span></div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => navigator.clipboard?.writeText(`Numéro : ${issued.phone}\nMot de passe : ${issued.password}`)} className="px-3 py-1.5 rounded-lg border border-red-300 text-xs font-semibold">Copier</button>
            <button type="button" onClick={() => setIssued(null)} className="px-3 py-1.5 rounded-lg text-xs font-semibold">Masquer</button>
          </div>
        </div>
      )}
      {showPharmacist && (
        <div className={`rounded-xl border p-4 space-y-3 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <p className="font-bold">Nouveau compte</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs font-semibold">Type de compte
              <NovaSelect darkMode={darkMode} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={`mt-1 ${input}`}>
                <option value="pharmacist">Pharmacien</option>
                <option value="governor">Gouverneur (statistiques seules)</option>
              </NovaSelect>
            </label>
            <label className="text-xs font-semibold">{form.role === 'governor' ? 'Nom ou institution' : 'Nom complet'}<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`mt-1 ${input}`} /></label>
            <label className="text-xs font-semibold">Téléphone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0700000000" className={`mt-1 ${input}`} /></label>
            {form.role === 'pharmacist' && <label className="text-xs font-semibold">Pharmacie
              <NovaSelect darkMode={darkMode} value={form.pharmacyId} onChange={(e) => setForm({ ...form, pharmacyId: e.target.value })} className={`mt-1 ${input}`}>
                <option value="">Choisir…</option>
                {pharmacies.map((ph) => <option key={ph.id} value={ph.id}>{ph.name} — {ph.city}</option>)}
              </NovaSelect>
            </label>}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={createAccount} disabled={busy === 'create' || form.name.trim().length < 2 || form.phone.replace(/\D/g, '').length !== 10 || (form.role === 'pharmacist' && !form.pharmacyId)} className="min-h-11 px-4 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-50">{busy === 'create' ? 'Création…' : 'Créer le compte'}</button>
            <button type="button" onClick={() => setShowPharmacist(false)} className="min-h-11 px-4 rounded-xl border text-sm font-semibold">Annuler</button>
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={`text-xs ${sub} border-b ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <th className="text-left p-3">Nom</th><th className="text-left p-3">Rôle</th><th className="text-left p-3">Téléphone</th><th className="text-left p-3">État</th><th className="text-right p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className={`p-4 text-center text-xs ${sub}`}>Chargement…</td></tr>}
            {!loading && rows.map((u) => (
              <tr key={u.id} className={`border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <td className="p-3 text-xs font-semibold">{u.name}</td>
                <td className={`p-3 text-xs ${sub}`}>{ROLE_LABELS[u.role] || u.role}</td>
                <td className={`p-3 text-xs font-mono ${sub}`}>{u.phone}</td>
                <td className="p-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    Number(u.isLocked) ? 'bg-red-100 text-red-700'
                    : !Number(u.hasPassword) ? 'bg-slate-100 text-slate-600'
                    : Number(u.mustChangePassword) ? 'bg-red-100 text-red-700'
                    : 'bg-red-100 text-red-700'}`}>
                    {Number(u.isLocked) ? 'Bloqué' : !Number(u.hasPassword) ? 'Sans mot de passe' : Number(u.mustChangePassword) ? 'Provisoire' : 'Actif'}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <button type="button" onClick={() => reset(u)} disabled={busy === u.id} className="px-3 py-1.5 rounded-lg border text-xs font-semibold disabled:opacity-50">
                    {busy === u.id ? '…' : Number(u.hasPassword) ? 'Réinitialiser' : 'Créer un mot de passe'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatUptime(seconds = 0) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return d ? `${d} j ${h} h` : h ? `${h} h ${m} min` : `${m} min`;
}

function ASystem({ data, card, sub, darkMode }) {
  const db = data.database || {};
  const sec = data.security || {};
  const line = `flex items-center justify-between py-2.5 border-b last:border-0 ${darkMode ? 'border-slate-800' : 'border-slate-100'}`;
  // Mesures réellement en place dans le code (pas de certification revendiquée).
  const measures = [
    'Mots de passe chiffrés (bcrypt), jamais stockés en clair',
    'Double authentification des médecins (application Authenticator)',
    'Blocage du compte 15 minutes après 5 essais',
    'Mot de passe provisoire à changer à la première connexion',
    'Journal d’audit des actions d’administration',
    'Sessions en cookies sécurisés (httpOnly), renouvelées automatiquement',
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="API en ligne depuis" value={formatUptime(data.api?.uptimeSeconds)} hint={`Mode : ${data.api?.nodeEnv}`} Icon={ServerCog} card={card} sub={sub} />
        <StatCard label="Permissions RBAC" value={sec.permissions} hint={`${(sec.roles || []).length} rôles`} Icon={ShieldCheck} color="blue" card={card} sub={sub} />
        <StatCard label="Journal d’audit" value={sec.auditLogs} hint="Actions enregistrées" Icon={Lock} color="amber" card={card} sub={sub} />
        <StatCard label="Accès aux dossiers" value={sec.accessLogs} hint="Consultations tracées" Icon={Database} color="purple" card={card} sub={sub} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={`${card} border rounded-2xl p-6`}>
          <h3 className="font-bold mb-3">Rôles et permissions</h3>
          {(sec.roles || []).map((r) => (
            <div key={r.name} className={line}>
              <span className="text-sm">{ROLE_NAMES[r.name] || r.name}</span>
              <span className={`text-sm font-semibold ${sub}`}>{r.permissions} permission(s)</span>
            </div>
          ))}
          <h3 className="font-bold mt-6 mb-3">Données</h3>
          {[['Patients', db.patients], ['Médecins', db.doctors], ['Pharmacies', db.pharmacies]].map(([label, value]) => (
            <div key={label} className={line}><span className="text-sm">{label}</span><span className="text-sm font-semibold">{Number(value || 0).toLocaleString('fr-FR')}</span></div>
          ))}
        </div>
        <div className={`${card} border rounded-2xl p-6`}>
          <h3 className="font-bold mb-3">Mesures de sécurité actives</h3>
          {measures.map((m) => (
            <div key={m} className={`flex items-center gap-3 py-2.5 border-b last:border-0 ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
              <CheckCircle2 className="w-5 h-5 shrink-0 text-red-600" /><span className="text-sm">{m}</span>
            </div>
          ))}
          <p className={`text-xs mt-4 flex items-start gap-2 ${sub}`}>
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            Sauvegardes et HTTPS dépendent du déploiement (services « backup » et « caddy » de docker-compose). Démarche ARTCI à engager avant toute donnée réelle.
          </p>
        </div>
      </div>
    </div>
  );
}

function ASettings({ card, sub, darkMode }) {
  const [me, setMe] = useState(null);
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [status, setStatus] = useState({ error: '', ok: '' });
  const [saving, setSaving] = useState(false);
  useEffect(() => { adminApi.me().then(setMe).catch(() => setMe({})); }, []);

  const strong = form.next.length >= 12 && /[a-z]/.test(form.next) && /[A-Z]/.test(form.next) && /\d/.test(form.next) && /[^A-Za-z0-9]/.test(form.next);
  const submit = async (e) => {
    e.preventDefault();
    setStatus({ error: '', ok: '' });
    if (!strong) return setStatus({ error: '12 caractères minimum, avec majuscule, minuscule, chiffre et caractère spécial.', ok: '' });
    if (form.next !== form.confirm) return setStatus({ error: 'Les deux nouveaux mots de passe ne correspondent pas.', ok: '' });
    setSaving(true);
    try {
      await adminApi.changeOwnPassword(form.current, form.next);
      setForm({ current: '', next: '', confirm: '' });
      setStatus({ error: '', ok: 'Mot de passe modifié.' });
    } catch (err) { setStatus({ error: err.message || 'Modification impossible.', ok: '' }); }
    finally { setSaving(false); }
  };
  const input = `mt-1 w-full min-h-11 rounded-xl border px-3 text-sm ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`;
  const line = `flex items-center justify-between py-2.5 border-b last:border-0 ${darkMode ? 'border-slate-800' : 'border-slate-100'}`;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      <div className={`${card} border rounded-2xl p-6`}>
        <h3 className="font-bold mb-3">Mon compte</h3>
        <div className={line}><span className={`text-sm ${sub}`}>Nom</span><span className="text-sm font-semibold">{me?.name || '—'}</span></div>
        <div className={line}><span className={`text-sm ${sub}`}>Numéro de connexion</span><span className="text-sm font-semibold font-mono">{fmtPhone(me?.phone)}</span></div>
        <div className={line}><span className={`text-sm ${sub}`}>Rôle</span><span className="text-sm font-semibold">{ROLE_NAMES[me?.role] || '—'}</span></div>
        <div className={line}><span className={`text-sm ${sub}`}>Permissions</span><span className="text-sm font-semibold">{me?.permissions?.length ?? '—'}</span></div>
      </div>
      <form onSubmit={submit} className={`${card} border rounded-2xl p-6 space-y-3`}>
        <h3 className="font-bold">Changer mon mot de passe</h3>
        <label className="block text-xs font-semibold">Mot de passe actuel<PasswordInput autoComplete="current-password" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} className={input} /></label>
        <label className="block text-xs font-semibold">Nouveau mot de passe<PasswordInput autoComplete="new-password" value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} className={input} /></label>
        <label className="block text-xs font-semibold">Confirmer le nouveau mot de passe<PasswordInput autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} className={input} /></label>
        <p className={`text-xs ${sub}`}>12 caractères minimum, avec majuscule, minuscule, chiffre et caractère spécial.</p>
        {status.error && <p role="alert" className="text-sm text-red-600">{status.error}</p>}
        {status.ok && <p className="text-sm text-red-700">{status.ok}</p>}
        <button type="submit" disabled={saving || !form.current || !form.next || !form.confirm} className="w-full min-h-11 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-50">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
      </form>
    </div>
  );
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

function ageFromBirthDate(value) {
  const age = ageFrom(value);
  return age == null ? '-' : age;
}
