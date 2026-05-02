import React, { useState } from 'react';
import { Bell, Bot, HeartPulse, Menu, Moon, Shield, Stethoscope, Sun, User } from 'lucide-react';
import Login from './auth/Login.jsx';
import Sidebar from './layout/Sidebar.jsx';
import PatientPages from './patient/PatientPages.jsx';
import DoctorPages from './doctor/DoctorPages.jsx';
import AdminPages from './admin/AdminPages.jsx';
import { AyaChat, ConsModal, CreateDoctorModal, CreatePatientModal, QRModal, RxModal, VideoModal } from './modals/index.jsx';

const ROLE_META = {
  patient: { label: 'Espace patient', Icon: User, color: 'text-blue-700 bg-blue-50 border-blue-200' },
  doctor: { label: 'Espace docteur', Icon: Stethoscope, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  admin: { label: 'Espace admin', Icon: Shield, color: 'text-purple-700 bg-purple-50 border-purple-200' },
};

export default function App() {
  const [auth, setAuth] = useState('login');
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showAya, setShowAya] = useState(false);
  const [showRx, setShowRx] = useState(false);
  const [showCons, setShowCons] = useState(false);
  const [showCP, setShowCP] = useState(false);
  const [showCD, setShowCD] = useState(false);
  const [showVid, setShowVid] = useState(false);
  const [pills, setPills] = useState({});
  const [sbOpen, setSbOpen] = useState(false);

  const onLogin = (u) => { setUser(u); setPage('dashboard'); setAuth('ok'); };

  if (auth !== 'ok') return <Login auth={auth} setAuth={setAuth} onLogin={onLogin} />;

  const role = user?.role || 'patient';
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
    <div className={`min-h-screen ${bg} ${text} flex flex-col`} style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <header className={`sticky top-0 z-40 ${darkMode ? 'bg-slate-950/90' : 'bg-white/90'} backdrop-blur-xl border-b ${border}`}>
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setSbOpen(true)} className={`lg:hidden p-2 rounded-lg ${hover}`}><Menu className="w-5 h-5" /></button>
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
            <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-lg ${hover}`}>
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button className={`relative p-2 rounded-lg ${hover}`}>
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
            </button>
            <button onClick={() => setAuth('login')} className={`hidden sm:flex items-center gap-2 pl-3 border-l ${border}`}>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-sm font-bold">{user?.avatar || 'U'}</div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-semibold leading-tight">{user?.name || 'Utilisateur'}</p>
                <p className={`text-[10px] ${sub}`}>Se déconnecter</p>
              </div>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {sbOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSbOpen(false)}></div>}
        <Sidebar role={role} page={page} setPage={(p) => { setPage(p); setSbOpen(false); }} sbOpen={sbOpen}
          onCP={() => setShowCP(true)} onCD={() => setShowCD(true)} {...props} />

        <main className="flex-1 min-w-0">
          <div className="p-4 sm:p-6 max-w-7xl mx-auto">
            {role === 'patient' && <PatientPages page={page} setPage={setPage} setShowQR={setShowQR} pills={pills} setPills={setPills} setShowVid={setShowVid}
              onProfileSaved={(profile) => setUser((current) => ({
                ...current,
                name: `${profile.firstName} ${profile.lastName}`,
                avatar: `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase(),
              }))} {...props} />}
            {role === 'doctor' && <DoctorPages page={page} onRx={() => setShowRx(true)} onCons={() => setShowCons(true)} onCP={() => setShowCP(true)} setShowVid={setShowVid} {...props} />}
            {role === 'admin' && <AdminPages page={page} onCP={() => setShowCP(true)} onCD={() => setShowCD(true)} {...props} />}
          </div>
        </main>
      </div>

      {showQR && <QRModal onClose={() => setShowQR(false)} />}
      {showAya && <AyaChat onClose={() => setShowAya(false)} />}
      {showRx && <RxModal onClose={() => setShowRx(false)} {...props} />}
      {showCons && <ConsModal onClose={() => setShowCons(false)} {...props} />}
      {showCP && <CreatePatientModal onClose={() => setShowCP(false)} {...props} />}
      {showCD && <CreateDoctorModal onClose={() => setShowCD(false)} {...props} />}
      {showVid && <VideoModal onClose={() => setShowVid(false)} />}

      {role === 'patient' && !showAya && (
        <button onClick={() => setShowAya(true)} className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-red-600 to-red-700 shadow-2xl shadow-red-600/40 flex items-center justify-center text-white hover:scale-110 z-30">
          <Bot className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></span>
        </button>
      )}
    </div>
  );
}
