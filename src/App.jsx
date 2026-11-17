import { clearPatientSearch } from './utils/search.js';
import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { AlertCircle, BarChart3, Bell, Bot, ChevronDown, HeartPulse, Lock, LogOut, Menu, Moon, Pill, Settings, Shield, Siren, Stethoscope, Sun, User, X } from 'lucide-react';
import { confirmDialog } from './components/dialogs.jsx';
import Login from './auth/Login.jsx';
import Sidebar from './layout/Sidebar.jsx';
import { CompactIdentity, CompactNavigation, CompactQrAction, CompactShortcuts } from './layout/CompactWorkspace.jsx';
import SpaceTabs from './layout/SpaceTabs.jsx';
import NotificationBell from './layout/NotificationBell.jsx';
import GlobalSearch from './layout/GlobalSearch.jsx';
import { authApi } from './api/authApi.js';
import { patientApi } from './api/patientApi.js';
import { doctorApi } from './api/doctorApi.js';
import { connectRealtime, disconnectRealtime, useRealtime } from './realtime/socket.js';
import { CreatePatientModal, QRModal, VideoModal } from './modals/index.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { broadcastAuth, onAuthBroadcast } from './api/authChannel.js';
import { startSessionActivity, useIdleLogout } from './api/useIdleLogout.js';
import {useHasUnsaved,clearUnsaved} from './unsaved.js';
import { useLocation, useNavigate,useBlocker } from 'react-router-dom';
import { ROLE_PAGES, spaceOf } from './navigation.js';
import { useDoctorPhoto, usePatientPhoto } from './utils/photo.js';

const PatientPages = lazy(() => import('./patient/PatientPages.jsx'));
const DoctorPages = lazy(() => import('./doctor/DoctorPages.jsx'));
const AdminPages = lazy(() => import('./admin/AdminPages.jsx'));
const PharmacyPages = lazy(() => import('./pharmacy/PharmacyPages.jsx'));
const GovernorPages = lazy(() => import('./governor/GovernorPages.jsx'));

const ROLE_META = {
  patient:    { label: 'Espace patient',    Icon: User,        color: 'text-red-700 bg-red-50 border-red-200' },
  doctor:     { label: 'Espace docteur',    Icon: Stethoscope, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  pharmacist: { label: 'Espace pharmacie',  Icon: Pill,        color: 'text-teal-700 bg-teal-50 border-teal-200' },
  admin:      { label: 'Espace admin',      Icon: Shield,      color: 'text-purple-700 bg-purple-50 border-purple-200' },
  governor:   { label: 'Santé publique', Icon: BarChart3,   color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
};

// Raccourcis du menu de compte par rôle (pages existantes).
const ACCOUNT_LINKS = {
  patient: [
    { page: 'profile', label: 'Identité et coordonnées', Icon: User },
    { page: 'privacy', label: 'Accès à mon dossier', Icon: Lock },
    { page: 'settings', label: 'Paramètres et export', Icon: Settings },
  ],
  doctor: [
    { page: 'profile', label: 'Profil et disponibilités', Icon: User },
    { page: 'settings', label: 'Paramètres', Icon: Settings },
  ],
  pharmacist: [{ page: 'settings', label: 'Paramètres', Icon: Settings }],
  admin: [{ page: 'settings', label: 'Paramètres', Icon: Settings }],
  governor: [],
};

/* Menu de compte (tous écrans) : identité, paramètres et déconnexion explicite. */
function AccountMenu({ user, roleLabel, photoSrc, links, onNavigate, onLogout, loggingOut, darkMode, sub, border }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') { setOpen(false); ref.current?.querySelector('button')?.focus(); } };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  const item = `w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left rounded-lg ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-red-50'}`;
  return (
    <div ref={ref} className={`relative pl-2 sm:pl-3 border-l ${border}`}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} aria-label="Menu du compte"
        className={`flex items-center gap-2 rounded-xl p-1 ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-red-50'}`}>
        <span className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center text-white text-sm font-bold overflow-hidden">
          {photoSrc ? <img src={photoSrc} alt="" className="w-full h-full object-cover" /> : (user?.avatar || 'U')}
        </span>
        <span className="hidden lg:block text-left">
          <span className="block text-xs font-semibold leading-tight">{user?.name || 'Utilisateur'}</span>
          <span className={`block text-[10px] ${sub}`}>{roleLabel}</span>
        </span>
        <ChevronDown className={`w-4 h-4 hidden sm:block ${sub}`} />
      </button>
      {open && (
        <div role="menu" className={`absolute right-0 top-full mt-2 z-[60] w-64 rounded-xl border shadow-xl p-1.5 ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className={`px-3 py-2.5 border-b mb-1 ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
            <p className="text-sm font-semibold truncate">{user?.name || 'Utilisateur'}</p>
            <p className={`text-xs ${sub}`}>{roleLabel}</p>
          </div>
          {links.map((l) => (
            <button key={l.page} type="button" role="menuitem" className={item} onClick={() => { setOpen(false); onNavigate(l.page); }}>
              <l.Icon className="w-4 h-4" /> {l.label}
            </button>
          ))}
          <button type="button" role="menuitem" disabled={loggingOut} className={`${item} text-red-600 disabled:opacity-60`} onClick={() => { setOpen(false); onLogout(); }}>
            <LogOut className="w-4 h-4" /> {loggingOut ? 'Déconnexion…' : 'Se déconnecter'}
          </button>
        </div>
      )}
    </div>
  );
}

function PageFallback({ darkMode }) {
  const block = darkMode ? 'bg-slate-700' : 'bg-slate-200';
  return (
    <div className="space-y-4 animate-pulse">
      <div className={`h-36 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-red-100'}`}></div>
      <div className="grid grid-cols-2 gap-4">
        <div className={`h-32 rounded-xl ${block}`}></div>
        <div className={`h-32 rounded-xl ${block}`}></div>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('nova_user');
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  });
  const [auth, setAuth] = useState('checking');
  const hasUnsaved=useHasUnsaved();
  const blocker=useBlocker(hasUnsaved && auth==='ok');
  useEffect(()=>{if(blocker.state!=='blocked')return;confirmDialog({title:'Quitter sans enregistrer ?',message:'Des modifications ne sont pas enregistrées. Elles seront perdues si vous quittez cette page.',confirmLabel:'Quitter la page',cancelLabel:'Rester',danger:true}).then((ok)=>{if(ok){clearUnsaved();blocker.proceed();}else blocker.reset();});},[blocker]);
  useEffect(()=>{const warn=e=>{if(hasUnsaved){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[hasUnsaved]);
  const location = useLocation();
  const navigate = useNavigate();
  const pageRole=user?.role || 'patient';
  const parts=location.pathname.split('/').filter(Boolean);
  const page=parts[0]===pageRole && ROLE_PAGES[pageRole]?.includes(parts[1]) ? parts[1] : 'dashboard';
  const setPage = (next, targetId) => navigate(`/${pageRole}/${ROLE_PAGES[pageRole]?.includes(next) ? next : 'dashboard'}`,
    { state: typeof targetId === 'string' ? { targetId } : null });
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('nova_darkMode') === 'true');
  const [showQR, setShowQR] = useState(false);
  const [showCP, setShowCP] = useState(false);
  const [showVid, setShowVid] = useState(false);
  const [patientCreatedTick, setPatientCreatedTick] = useState(0);
  const [badges, setBadges] = useState({});
  const [pills, setPills] = useState({});
  const [sbOpen, setSbOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [idleLocked, setIdleLocked] = useState(false);
  const logoutPending = useRef(false);
  const [logoutError, setLogoutError] = useState('');
  const role = user?.role || 'patient';
  const patientPhotoSrc = usePatientPhoto(auth === 'ok' && user?.role === 'patient' ? user.id : null);
  const doctorPhotoSrc = useDoctorPhoto(auth === 'ok' && user?.role === 'doctor' ? user.id : null);
  const photoSrc = role === 'doctor' ? doctorPhotoSrc : patientPhotoSrc;

  useEffect(() => {
    let cancelled = false;
    authApi.me().then((sessionUser) => {
      if (cancelled) return;
      const restored = sessionUser;
      localStorage.setItem('nova_user', JSON.stringify(restored));
      setUser(restored);
      setAuth('ok');
    }).catch(() => {
      if (cancelled) return;
      localStorage.removeItem('nova_user');
      setUser(null);
      setAuth('login');
    });
    return () => { cancelled = true; };
    // Session restoration must run once on application startup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Remise à zéro de tout l'état propre à l'utilisateur (aucune donnée d'un compte ne survit au suivant).
  useEffect(() => { clearPatientSearch(); }, []);

  const resetSession = () => {
    disconnectRealtime();
    setIdleLocked(false);
    clearPatientSearch();
    clearUnsaved();
    localStorage.removeItem('nova_user');
    setUser(null);
    setBadges({});
    setPills({});
    navigate('/', {replace:true});
    setShowQR(false); setShowCP(false); setShowVid(false);
    setLogoutError('');
    setAuth('login');
  };

  // Session expirée (refresh refusé) ou déconnexion/changement de compte dans un autre onglet.
  useEffect(() => {
    const handleLogout = () => resetSession();
    window.addEventListener('nova:logout', handleLogout);
    const stop = onAuthBroadcast((evt) => {
      if (evt?.type === 'logout') resetSession();
      if (evt?.type === 'login' && evt.userId !== user?.id) window.location.reload();
    });
    return () => { window.removeEventListener('nova:logout', handleLogout); stop(); };
    // resetSession ne lit que des setters stables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const onLogin = (u) => {
    authApi.sessionOpened();
    startSessionActivity(u.id);
    localStorage.setItem('nova_user', JSON.stringify(u));
    setUser(u);
    setBadges({});
    setPills({});
    navigate(`/${u.role}/dashboard`, {replace:true});
    setAuth('ok');
    broadcastAuth({ type: 'login', userId: u.id });
  };

  // Déconnexion annoncée seulement après confirmation du serveur (jetons révoqués).
  const onLogout = async () => {
    if (logoutPending.current) return;
    logoutPending.current = true;
    setLoggingOut(true);
    setLogoutError('');
    try {
      await authApi.logout();
      broadcastAuth({ type: 'logout' });
      resetSession();
    } catch (err) {
      setLogoutError(`La déconnexion n’a pas pu être confirmée (${err.message}). Vous êtes toujours connecté : vérifiez votre connexion puis réessayez.`);
    } finally {
      logoutPending.current = false;
      setLoggingOut(false);
    }
  };

  useIdleLogout(auth === 'ok' ? user?.id : null, () => {
    setIdleLocked(true);
    void onLogout();
  });

  // Compteurs (notifications, messages non lus) : chargés à la connexion puis à chaque signal temps réel.
  const badgeRequest = useRef(0);
  const refreshBadges = () => {
    if (auth !== 'ok' || !['patient', 'doctor'].includes(role)) return;
    const api = role === 'doctor' ? doctorApi : patientApi;
    const requestId = ++badgeRequest.current;
    Promise.allSettled([api.notifications(), api.conversations()])
      .then(([notificationsResult, conversationsResult]) => {
        if (requestId !== badgeRequest.current) return;
        const notifList = notificationsResult.status === 'fulfilled' ? (Array.isArray(notificationsResult.value) ? notificationsResult.value : notificationsResult.value?.data) : null;
        const notifications = Array.isArray(notifList) ? notifList.filter((n) => !n.isRead).length : 0;
        const messages = conversationsResult.status === 'fulfilled' && Array.isArray(conversationsResult.value)
          ? conversationsResult.value.reduce((sum, c) => sum + Number(c.unreadCount || 0), 0)
          : 0;
        setBadges({ notifications, messages });
      });
  };
  useEffect(() => {
    refreshBadges();
    return () => { badgeRequest.current += 1; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, role]);

  // Temps réel : une connexion par session ouverte, fermée à la déconnexion.
  useEffect(() => {
    if (auth !== 'ok' || !user?.id || !['patient', 'doctor'].includes(role)) return undefined;
    connectRealtime(user.id);
    const resync = () => refreshBadges();
    window.addEventListener('nova:realtime-reconnected', resync);
    return () => { window.removeEventListener('nova:realtime-reconnected', resync); disconnectRealtime(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, user?.id, role]);
  useRealtime('notification:new', () => refreshBadges());
  useRealtime('message:new', () => refreshBadges());
  useRealtime('conversation:read', () => refreshBadges());

  useEffect(()=>{
    if(auth==='ok' && (parts[0]!==pageRole || !ROLE_PAGES[pageRole]?.includes(parts[1])))navigate(`/${pageRole}/dashboard`,{replace:true});
  },[auth,location.pathname,pageRole]);

  if (auth === 'checking') return <PageFallback darkMode={darkMode} />;
  if (auth !== 'ok') return <Login auth={auth} setAuth={setAuth} onLogin={onLogin} />;
  if (idleLocked) return (
    <main className="grid min-h-screen place-items-center bg-red-50 p-4 text-slate-900">
      <div className="w-full max-w-sm rounded-2xl border border-red-100 bg-white p-6">
        <h1 className="text-lg font-bold">Session fermée pour inactivité</h1>
        {logoutError ? (
          <>
            <p className="mt-2 text-sm">Rétablissez votre connexion pour terminer la déconnexion.</p>
            <button type="button" onClick={onLogout} disabled={loggingOut} className="mt-4 min-h-11 rounded-lg bg-red-700 px-4 font-semibold text-white">Réessayer</button>
          </>
        ) : <p className="mt-2 text-sm" role="status">Déconnexion en cours…</p>}
      </div>
    </main>
  );

  const RoleIcon = ROLE_META[role]?.Icon || User;
  const roleLabel = ROLE_META[role]?.label || 'Espace utilisateur';
  const bg = darkMode ? 'bg-slate-950' : 'bg-white';
  const text = darkMode ? 'text-slate-100' : 'text-slate-900';
  const card = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const sub = darkMode ? 'text-slate-400' : 'text-slate-600';
  const border = darkMode ? 'border-slate-800' : 'border-slate-200';
  const hover = darkMode ? 'hover:bg-slate-800' : 'hover:bg-red-50';
  const props = { card, sub, border, darkMode };
  const currentSpace = spaceOf(role, page);
  const innerPage = page !== 'dashboard';
  const showSectionLabel = innerPage && currentSpace && currentSpace.pages.length > 1;

  return (
    <div className={`min-h-screen ${bg} ${text} flex flex-col`}>
      <header className={`sticky top-0 z-40 ${darkMode ? 'bg-slate-950/90' : 'bg-white/90 max-xl:bg-red-700 max-xl:text-white'} backdrop-blur-xl border-b ${border}`}>
        <div className="px-3 sm:px-6 py-2 xl:py-3 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setSbOpen(true)} className={`md:hidden p-2 rounded-lg ${hover}`} aria-label="Ouvrir le menu"><Menu className="w-5 h-5" /></button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center">
                <HeartPulse className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <div className="hidden sm:block">
                <h1 className="font-bold text-lg tracking-tight">NOVA</h1>
                <p className={`text-[10px] ${sub} -mt-1 hidden sm:block`}>Carnet Santé Ivoirien</p>
              </div>
            </div>
          </div>
          {role === 'patient' ? <GlobalSearch darkMode={darkMode} /> : (
            <div className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : ['doctor', 'admin', 'pharmacist'].includes(role) ? 'bg-red-50 border-red-100 text-red-800' : ROLE_META[role]?.color}`}>
              <RoleIcon className="w-4 h-4" />
              <span>{roleLabel}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            {role === 'patient' && (
              <button type="button" onClick={() => setPage('urgence')} aria-label="SOS urgence"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold ${page === 'urgence' ? 'bg-red-700 text-white' : 'bg-red-600 text-white hover:bg-red-700'}`}>
                <Siren className="w-4 h-4" /><span className="hidden sm:inline">SOS</span>
              </button>
            )}
            <button onClick={() => { const next = !darkMode; setDarkMode(next); localStorage.setItem('nova_darkMode', next); }} className={`p-2 rounded-lg ${hover}`} aria-label={darkMode ? 'Mode clair' : 'Mode sombre'}>
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {/* Patient : panneau de notifications sous la cloche ; médecin : page dédiée. */}
            {role === 'patient' && (
              <NotificationBell count={badges.notifications || 0} onCount={(notifications) => setBadges((b) => ({ ...b, notifications }))}
                setPage={setPage} darkMode={darkMode} sub={sub} />
            )}
            {role === 'doctor' && (
              <button onClick={() => setPage('notifications')} className={`relative p-2 rounded-lg ${hover}`} aria-label="Notifications">
                <Bell className="w-4 h-4" />
                {badges.notifications > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>}
              </button>
            )}
            <AccountMenu user={user} roleLabel={roleLabel} photoSrc={photoSrc} links={ACCOUNT_LINKS[role] || []} onNavigate={setPage}
              onLogout={onLogout} loggingOut={loggingOut} darkMode={darkMode} sub={sub} border={border} />
          </div>
        </div>
        {logoutError && (
          <div role="alert" className="border-t border-red-200 bg-red-50 text-red-800 px-4 py-2.5 text-sm flex items-center gap-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{logoutError}</span>
            <button type="button" onClick={onLogout} disabled={loggingOut} className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-semibold disabled:opacity-60">Réessayer</button>
            <button type="button" onClick={() => setLogoutError('')} aria-label="Fermer le message" className="p-1"><X className="w-4 h-4" /></button>
          </div>
        )}
      </header>

      <div className="flex-1 flex">
        {sbOpen && <button type="button" aria-label="Fermer le menu" className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSbOpen(false)} />}
        <Sidebar role={role} page={page} setPage={(p) => { setPage(p); setSbOpen(false); }} sbOpen={sbOpen}
          onCP={() => setShowCP(true)} badges={badges} onLogout={onLogout} loggingOut={loggingOut} user={user} photoSrc={photoSrc} {...props} />

        <main data-theme={darkMode ? 'dark' : 'light'} className={`flex-1 min-w-0 ${innerPage ? 'nova-workspace' : ''}`}>
          <div className="p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] md:p-5 xl:p-6 max-w-7xl mx-auto">
            {page === 'dashboard' && <CompactIdentity role={role} user={user} roleLabel={roleLabel} photoSrc={photoSrc} setPage={setPage} darkMode={darkMode} />}
            {page === 'dashboard' && <CompactShortcuts role={role} setPage={setPage} darkMode={darkMode} />}
            {showSectionLabel && (
              <div className="nova-section-label">
                <currentSpace.Icon size={16} aria-hidden="true" />
                <span>{currentSpace.label}</span>
              </div>
            )}
            {!(['doctor', 'admin', 'pharmacist'].includes(role) && page === 'dashboard') && <SpaceTabs role={role} page={page} setPage={setPage} badges={badges} darkMode={darkMode} />}
            <ErrorBoundary resetKey={page}>
              <Suspense fallback={<PageFallback darkMode={darkMode} />}>
                {role === 'patient' && <PatientPages key={user?.id} page={page} setPage={setPage} setShowQR={setShowQR} pills={pills} setPills={setPills} setShowVid={setShowVid}
                  onBadgesChange={(nextBadges) => setBadges((current) => ({ ...current, ...nextBadges }))}
                  onProfileSaved={(profile) => {
                    const updated = { ...user, name: `${profile.firstName} ${profile.lastName}`, avatar: `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase() };
                    setUser(updated);
                    localStorage.setItem('nova_user', JSON.stringify(updated));
                  }} {...props} />}
                {role === 'doctor' && <DoctorPages key={user?.id} page={page} setPage={setPage} onCP={() => setShowCP(true)} patientCreatedTick={patientCreatedTick} setShowVid={setShowVid} {...props} />}
                {role === 'pharmacist' && <PharmacyPages key={user?.id} page={page} setPage={setPage} {...props} />}
                {role === 'admin' && <AdminPages key={user?.id} page={page} setPage={setPage} {...props} />}
                {role === 'governor' && <GovernorPages key={user?.id} page={page} {...props} />}
              </Suspense>
            </ErrorBoundary>
            {page === 'dashboard' && <CompactQrAction role={role} setShowQR={setShowQR} setPage={setPage} darkMode={darkMode} />}
          </div>
        </main>
      </div>
      <CompactNavigation role={role} page={page} setPage={setPage} onMenu={() => setSbOpen(true)} menuOpen={sbOpen} darkMode={darkMode} />

      {/* Une modale qui plante se ferme au lieu de faire tomber l'application. */}
      {showQR && <ErrorBoundary fallback={null} onError={() => setShowQR(false)}><QRModal onClose={() => setShowQR(false)} /></ErrorBoundary>}
      {showCP && <ErrorBoundary fallback={null} onError={() => setShowCP(false)}><CreatePatientModal onClose={() => setShowCP(false)} onCreated={() => setPatientCreatedTick(t => t + 1)} role={role} {...props} /></ErrorBoundary>}
      {showVid && <ErrorBoundary fallback={null} onError={() => setShowVid(false)}><VideoModal onClose={() => setShowVid(false)} /></ErrorBoundary>}

      {role === 'patient' && page !== 'assistant' && (
        <button onClick={() => setPage('assistant')} aria-label="Aide NOVA" title="Aide NOVA" className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-6 right-4 md:right-6 w-12 h-12 md:w-14 md:h-14 rounded-full bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/30 flex items-center justify-center text-white hover:scale-110 z-30">
          <Bot className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
