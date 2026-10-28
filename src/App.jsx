import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { AlertCircle, BarChart3, Bell, Bot, ChevronDown, HeartPulse, LogOut, Menu, Moon, Pill, Settings, Shield, Stethoscope, Sun, User, X } from 'lucide-react';
import Login from './auth/Login.jsx';
import Sidebar from './layout/Sidebar.jsx';
import { authApi } from './api/authApi.js';
import { patientApi } from './api/patientApi.js';
import { CreatePatientModal, QRModal, VideoModal } from './modals/index.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { broadcastAuth, onAuthBroadcast } from './api/authChannel.js';

const PatientPages = lazy(() => import('./patient/PatientPages.jsx'));
const DoctorPages = lazy(() => import('./doctor/DoctorPages.jsx'));
const AdminPages = lazy(() => import('./admin/AdminPages.jsx'));
const PharmacyPages = lazy(() => import('./pharmacy/PharmacyPages.jsx'));
const GovernorPages = lazy(() => import('./governor/GovernorPages.jsx'));

const ROLE_META = {
  patient:    { label: 'Espace patient',    Icon: User,        color: 'text-blue-700 bg-blue-50 border-blue-200' },
  doctor:     { label: 'Espace docteur',    Icon: Stethoscope, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  pharmacist: { label: 'Espace pharmacie',  Icon: Pill,        color: 'text-teal-700 bg-teal-50 border-teal-200' },
  admin:      { label: 'Espace admin',      Icon: Shield,      color: 'text-purple-700 bg-purple-50 border-purple-200' },
  governor:   { label: 'Espace gouverneur', Icon: BarChart3,   color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
};

/* Menu de compte (tous écrans) : identité, paramètres et déconnexion explicite. */
function AccountMenu({ user, roleLabel, hasSettings, onSettings, onLogout, loggingOut, darkMode, sub, border }) {
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
  const item = `w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left rounded-lg ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`;
  return (
    <div ref={ref} className={`relative pl-2 sm:pl-3 border-l ${border}`}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} aria-label="Menu du compte"
        className={`flex items-center gap-2 rounded-xl p-1 ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
        <span className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-sm font-bold">{user?.avatar || 'U'}</span>
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
          {hasSettings && (
            <button type="button" role="menuitem" className={item} onClick={() => { setOpen(false); onSettings(); }}>
              <Settings className="w-4 h-4" /> Paramètres du compte
            </button>
          )}
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
  const [page, setPage] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('nova_darkMode') === 'true');
  const [showQR, setShowQR] = useState(false);
  const [showCP, setShowCP] = useState(false);
  const [showVid, setShowVid] = useState(false);
  const [patientCreatedTick, setPatientCreatedTick] = useState(0);
  const [badges, setBadges] = useState({});
  const [pills, setPills] = useState({});
  const [sbOpen, setSbOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const role = user?.role || 'patient';

  useEffect(() => {
    let cancelled = false;
    authApi.me().then((sessionUser) => {
      if (cancelled) return;
      const restored = { ...user, ...sessionUser };
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
  const resetSession = () => {
    localStorage.removeItem('nova_user');
    setUser(null);
    setBadges({});
    setPills({});
    setPage('dashboard');
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
    localStorage.setItem('nova_user', JSON.stringify(u));
    setUser(u);
    setBadges({});
    setPills({});
    setPage('dashboard');
    setAuth('ok');
    broadcastAuth({ type: 'login', userId: u.id });
  };

  // Déconnexion annoncée seulement après confirmation du serveur (jetons révoqués).
  const onLogout = async () => {
    setLoggingOut(true);
    setLogoutError('');
    try {
      await authApi.logout();
      broadcastAuth({ type: 'logout' });
      resetSession();
    } catch (err) {
      setLogoutError(`La déconnexion n’a pas pu être confirmée (${err.message}). Vous êtes toujours connecté : vérifiez votre connexion puis réessayez.`);
    } finally {
      setLoggingOut(false);
    }
  };

  useEffect(() => {
    if (auth !== 'ok' || role !== 'patient') return;
    let cancelled = false;
    Promise.allSettled([patientApi.notifications(), patientApi.conversations()])
      .then(([notificationsResult, conversationsResult]) => {
        if (cancelled) return;
        const notifications = notificationsResult.status === 'fulfilled' && Array.isArray(notificationsResult.value)
          ? notificationsResult.value.filter((n) => !n.isRead).length
          : 0;
        const messages = conversationsResult.status === 'fulfilled' && Array.isArray(conversationsResult.value)
          ? conversationsResult.value.reduce((sum, c) => sum + Number(c.unreadCount || 0), 0)
          : 0;
        setBadges({ notifications, messages });
      });
    return () => { cancelled = true; };
  }, [auth, role]);

  if (auth === 'checking') return <PageFallback darkMode={darkMode} />;
  if (auth !== 'ok') return <Login auth={auth} setAuth={setAuth} onLogin={onLogin} />;

  const RoleIcon = ROLE_META[role]?.Icon || User;
  const roleLabel = ROLE_META[role]?.label || 'Espace utilisateur';
  const bg = darkMode ? 'bg-slate-950' : 'bg-white';
  const text = darkMode ? 'text-slate-100' : 'text-slate-900';
  const card = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200';
  const sub = darkMode ? 'text-slate-400' : 'text-slate-600';
  const border = darkMode ? 'border-slate-800' : 'border-slate-200';
  const hover = darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100';
  const props = { card, sub, border, darkMode };

  return (
    <div className={`min-h-screen ${bg} ${text} flex flex-col`}>
      <header className={`sticky top-0 z-40 ${darkMode ? 'bg-slate-950/90' : 'bg-white/90'} backdrop-blur-xl border-b ${border}`}>
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setSbOpen(true)} className={`lg:hidden p-2 rounded-lg ${hover}`} aria-label="Ouvrir le menu"><Menu className="w-5 h-5" /></button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-lg shadow-red-600/20">
                <HeartPulse className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="font-bold text-lg tracking-tight">NOVA</h1>
                <p className={`text-[10px] ${sub} -mt-1 hidden sm:block`}>Carnet Santé Ivoirien</p>
              </div>
            </div>
          </div>
          <div className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : ROLE_META[role]?.color}`}>
            <RoleIcon className="w-4 h-4" />
            <span>{roleLabel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => { const next = !darkMode; setDarkMode(next); localStorage.setItem('nova_darkMode', next); }} className={`p-2 rounded-lg ${hover}`} aria-label={darkMode ? 'Mode clair' : 'Mode sombre'}>
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {/* Seul l'espace patient a une page de notifications. */}
            {role === 'patient' && (
              <button onClick={() => setPage('notifications')} className={`relative p-2 rounded-lg ${hover}`} aria-label="Notifications">
                <Bell className="w-4 h-4" />
                {badges.notifications > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>}
              </button>
            )}
            <AccountMenu user={user} roleLabel={roleLabel} hasSettings={role !== 'governor'} onSettings={() => setPage('settings')}
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
        {sbOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSbOpen(false)}></div>}
        <Sidebar role={role} page={page} setPage={(p) => { setPage(p); setSbOpen(false); }} sbOpen={sbOpen}
          onCP={() => setShowCP(true)} badges={badges} {...props} />

        <main className="flex-1 min-w-0">
          <div className="p-4 sm:p-6 max-w-7xl mx-auto">
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
                {role === 'admin' && <AdminPages key={user?.id} page={page} {...props} />}
                {role === 'governor' && <GovernorPages key={user?.id} page={page} {...props} />}
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {/* Une modale qui plante se ferme au lieu de faire tomber l'application. */}
      {showQR && <ErrorBoundary fallback={null} onError={() => setShowQR(false)}><QRModal onClose={() => setShowQR(false)} /></ErrorBoundary>}
      {showCP && <ErrorBoundary fallback={null} onError={() => setShowCP(false)}><CreatePatientModal onClose={() => setShowCP(false)} onCreated={() => setPatientCreatedTick(t => t + 1)} role={role} {...props} /></ErrorBoundary>}
      {showVid && <ErrorBoundary fallback={null} onError={() => setShowVid(false)}><VideoModal onClose={() => setShowVid(false)} /></ErrorBoundary>}

      {role === 'patient' && page !== 'assistant' && (
        <button onClick={() => setPage('assistant')} className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-red-600 to-red-700 shadow-2xl shadow-red-600/40 flex items-center justify-center text-white hover:scale-110 z-30">
          <Bot className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></span>
        </button>
      )}
    </div>
  );
}
