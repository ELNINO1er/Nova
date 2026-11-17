import React from 'react';
import { Building2, ChevronRight, Ellipsis, QrCode, ScanLine, UserRound, Users, BarChart3 } from 'lucide-react';
import { ROLE_SPACES, spaceOf } from '../navigation.js';

const mobileLinks = {
  patient: [['dashboard', 'Accueil'], ['prescriptions', 'Traitements'], ['rdv', 'Rendez-vous']],
  doctor: [['dashboard', 'Accueil'], ['patients', 'Patients'], ['agenda', 'Agenda']],
  pharmacist: [['dashboard', 'Accueil'], ['orders', 'Reçues'], ['scan', 'Scanner'], ['history', 'Délivrances']],
  admin: [['dashboard', 'Accueil'], ['users', 'Comptes'], ['audit', 'Sécurité']],
  governor: [['dashboard', 'Indicateurs']],
};

const homeLinks = {
  patient: [['history', 'Dossier'], ['prescriptions', 'Traitements'], ['rdv', 'Rendez-vous'], ['wellness', 'Bien-être']],
  doctor: [['patients', 'Mes patients'], ['consultations', 'Consultations'], ['prescriptions', 'Ordonnances']],
  pharmacist: [['orders', 'Ordonnances reçues'], ['scan', 'Scanner'], ['history', 'Délivrances']],
  admin: [['users', 'Comptes'], ['audit', 'Sécurité'], ['system', 'Système']],
};

export function CompactShortcuts({ role, setPage, darkMode }) {
  const links = homeLinks[role];
  if (!links) return null;
  return (
    <nav aria-label="Raccourcis" className="mb-5 grid auto-cols-fr grid-flow-col gap-1.5 sm:gap-2 xl:hidden">
      {links.map(([id, label]) => {
        const Icon = spaceOf(role, id).pages.find(item => item.id === id).Icon;
        return (
          <button key={id} type="button" onClick={() => setPage(id)}
            className={`flex min-h-20 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 text-center text-[11px] font-semibold sm:text-xs ${darkMode ? 'border-slate-700 bg-slate-900 hover:border-red-500' : 'border-red-100 bg-white hover:border-red-300'}`}>
            <span className="grid size-8 place-items-center rounded-full bg-red-50 text-red-700"><Icon size={17} aria-hidden="true" /></span>
            {label}
          </button>
        );
      })}
    </nav>
  );
}

export function CompactNavigation({ role, page, setPage, onMenu, menuOpen, darkMode, badges = {} }) {
  const links = mobileLinks[role] || [];
  const current = spaceOf(role, page);
  // Compteurs (messages non lus, ordonnances reçues) : sur l'onglet de leur espace, sinon sur « Plus ».
  const spaceCount = (space) => (space?.pages || []).reduce((n, pg) => n + (pg.b ? Number(badges[pg.b]) || 0 : 0), 0);
  const shownSpaces = new Set(links.map(([id]) => spaceOf(role, id)?.id));
  const hiddenCount = (ROLE_SPACES[role] || []).filter((sp) => !shownSpaces.has(sp.id)).reduce((n, sp) => n + spaceCount(sp), 0);
  const itemClass = 'flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-xs font-semibold';
  return (
    <nav aria-label="Navigation mobile" className={`fixed inset-x-0 bottom-0 z-30 grid auto-cols-fr grid-flow-col gap-1 border-t px-2 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] md:hidden ${darkMode ? 'border-slate-700 bg-slate-950' : 'border-red-100 bg-white'}`}>
      {links.map(([id, label]) => {
        const space = spaceOf(role, id);
        const Icon = space.pages.find(item => item.id === id).Icon;
        const active = current?.id === space.id && (id !== 'dashboard' || page === id);
        return <button key={id} type="button" aria-current={active ? 'page' : undefined}
          onClick={() => setPage(id)} className={`${itemClass} ${active ? 'bg-red-50 text-red-700' : ''}`}>
          <span className="relative"><Icon size={19} aria-hidden="true" />{spaceCount(space) > 0 && <span className="absolute -top-1.5 -right-2 min-w-[1rem] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold leading-4 text-center">{spaceCount(space)}</span>}</span><span>{label}</span>
        </button>;
      })}
      <button type="button" aria-expanded={menuOpen} onClick={onMenu} className={itemClass}>
        <span className="relative"><Ellipsis size={19} aria-hidden="true" />{hiddenCount > 0 && <span className="absolute -top-1.5 -right-2 min-w-[1rem] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold leading-4 text-center" aria-label={`${hiddenCount} non lu${hiddenCount > 1 ? 's' : ''}`}>{hiddenCount}</span>}</span><span>Plus</span>
      </button>
    </nav>
  );
}

export function CompactIdentity({ role, user, roleLabel, photoSrc, setPage, darkMode }) {
  const personal = ['patient', 'doctor'].includes(role);
  const IdentityIcon = { pharmacist: Building2, admin: Users, governor: BarChart3 }[role] || UserRound;
  const identity = (
    <>
      <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-red-50 font-bold text-red-700">
        {photoSrc && personal ? <img src={photoSrc} alt="" className="h-full w-full object-cover" /> :
          personal && user?.avatar ? user.avatar : <IdentityIcon size={25} aria-hidden="true" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block break-words text-lg font-bold">{user?.name || roleLabel}</span>
        <span className={`block text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{roleLabel}</span>
      </span>
      {personal && <ChevronRight size={18} aria-hidden="true" />}
    </>
  );
  const className = `mb-4 flex w-full items-center gap-3 rounded-xl border p-3 text-left shadow-sm xl:hidden ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-red-100 bg-white'}`;
  return personal
    ? <button type="button" onClick={() => setPage('profile')} className={className}>{identity}</button>
    : <div className={className}>{identity}</div>;
}

export function CompactQrAction({ role, setShowQR, setPage, darkMode }) {
  if (role !== 'patient' && role !== 'pharmacist') return null;
  const patient = role === 'patient';
  const Icon = patient ? QrCode : ScanLine;
  return <button type="button" onClick={() => patient ? setShowQR(true) : setPage('scan')}
    className={`mt-5 flex min-h-16 w-full items-center gap-3 rounded-xl border px-4 py-3 text-left font-semibold xl:hidden ${darkMode ? 'border-red-900 bg-slate-900 text-red-200' : 'border-red-200 bg-red-50 text-red-800'}`}>
    <Icon size={24} aria-hidden="true" />
    <span className="flex-1">{patient ? 'Pass Santé d’urgence' : 'Scanner le QR de l’ordonnance'}</span>
    <ChevronRight size={18} aria-hidden="true" />
  </button>;
}
