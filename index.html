import React, { useState, useRef } from 'react';
import {
  Heart, Activity, Pill, Calendar, FileText, User, Stethoscope,
  Shield, Search, AlertTriangle, Plus, Check, Clock, Download, X,
  TrendingUp, Bell, MessageCircle, Video, Brain, Mic, Phone,
  Star, Users, BarChart3, Lock, Eye, AlertCircle, CheckCircle2,
  Settings, ChevronRight, MapPin, Droplet, Zap, Sparkles, Send,
  Bot, Award, Target, Sun, Moon, Menu, Home, Edit3, Trash2, Save,
  FileDown, ShieldAlert, ShieldCheck, ServerCog, Database, Siren,
  ClipboardList, Microscope, Syringe, ChevronLeft, CalendarClock,
  HeartPulse, Thermometer, StickyNote, Palette, KeyRound, Smartphone,
  Mail, UserPlus, PhoneCall, Paperclip, MoreVertical, ArrowRight,
  HelpCircle, BookOpen, Pencil, HardDrive, Wifi
} from 'lucide-react';

const ACCOUNTS = {
  '0789452311': { role: 'patient', name: 'Kouamé Bamba', avatar: 'KB' },
  '0102030405': { role: 'doctor', name: 'Dr. Adjoua Koné', avatar: 'AK' },
  '0700000001': { role: 'admin', name: 'Admin Système', avatar: 'AS' }
};

export default function App() {
  const [auth, setAuth] = useState('login');
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('patient');
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

  const switchRole = (r) => { setRole(r); setPage('dashboard'); };
  const onLogin = (u) => { setUser(u); setRole(u.role); setPage('dashboard'); setAuth('ok'); };

  if (auth !== 'ok') return <Login auth={auth} setAuth={setAuth} onLogin={onLogin} />;

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
          <div className={`hidden md:flex items-center gap-1 p-1 rounded-xl ${darkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
            {[{id:'patient',l:'Patient',I:User},{id:'doctor',l:'Docteur',I:Stethoscope},{id:'admin',l:'Admin',I:Shield}].map(r => (
              <button key={r.id} onClick={() => switchRole(r.id)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${role === r.id ? 'bg-white text-slate-900 shadow-md' : sub}`}>
                <r.I className="w-3.5 h-3.5" /> {r.l}
              </button>
            ))}
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
            {role === 'patient' && <PatientPages page={page} setShowQR={setShowQR} pills={pills} setPills={setPills} setShowVid={setShowVid} {...props} />}
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

/* ============== LOGIN ============== */
function Login({ auth, setAuth, onLogin }) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['','','','']);
  const [err, setErr] = useState('');
  const [load, setLoad] = useState(false);
  const refs = [useRef(),useRef(),useRef(),useRef()];
  const cleaned = phone.replace(/\s/g, '');
  const fmt = (v) => v.replace(/\D/g,'').slice(0,10).replace(/(\d{2})(?=\d)/g,'$1 ').trim();

  const submit = () => {
    setErr('');
    if (cleaned.length !== 10) return setErr('Numéro invalide.');
    if (!ACCOUNTS[cleaned]) return setErr('Numéro non reconnu.');
    setLoad(true);
    setTimeout(() => { setLoad(false); setAuth('otp'); }, 500);
  };

  const onOtp = (i, v) => {
    if (!/^\d?$/.test(v)) return;
    const n = [...otp]; n[i] = v; setOtp(n);
    if (v && i < 3) refs[i+1].current?.focus();
    if (n.every(d => d !== '')) setTimeout(() => verify(n.join('')), 200);
  };

  const verify = (code) => {
    setLoad(true);
    setTimeout(() => {
      if (code === '0000') onLogin(ACCOUNTS[cleaned]);
      else { setErr('Code incorrect. Indice : 0000'); setLoad(false); }
    }, 400);
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-red-600 via-red-700 to-red-900 text-white">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400/20 rounded-full -translate-y-48 translate-x-48 blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-pink-500/20 rounded-full translate-y-48 -translate-x-48 blur-3xl"></div>
        <div className="absolute inset-0 pointer-events-none">
          {[{I:Heart,x:'15%',y:'20%',d:'0s'},{I:Pill,x:'75%',y:'15%',d:'1s'},{I:Stethoscope,x:'20%',y:'75%',d:'2s'},{I:Activity,x:'80%',y:'70%',d:'0.5s'}].map((f,i)=>(
            <div key={i} className="absolute text-white/15 animate-float" style={{left:f.x,top:f.y,animationDelay:f.d}}>
              <f.I className="w-8 h-8" strokeWidth={1.5} />
            </div>
          ))}
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-xl">
              <HeartPulse className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
            <div><h1 className="text-2xl font-bold tracking-tight">NOVA</h1><p className="text-xs text-red-100">Carnet Santé Ivoirien</p></div>
          </div>
          <div className="space-y-6">
            <div>
              <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur text-xs font-bold inline-block mb-4">✨ Plateforme Santé du Futur</span>
              <h2 className="text-4xl xl:text-5xl font-bold tracking-tight leading-tight">Votre santé,<br /><span className="text-amber-300">en toute sérénité.</span></h2>
              <p className="text-red-100 mt-4 text-lg max-w-md">Le carnet électronique unifié pour la Côte d'Ivoire.</p>
            </div>
            <div className="grid grid-cols-3 gap-3 max-w-md">
              {[{n:'124k+',l:'Patients'},{n:'3,2k+',l:'Médecins'},{n:'99.9%',l:'Sécurisé'}].map((s,i)=>(
                <div key={i} className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold">{s.n}</p>
                  <p className="text-[10px] text-red-100 uppercase tracking-wider">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-red-100">
            <ShieldCheck className="w-4 h-4" /> Conforme RGPD • Loi ivoirienne
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-lg">
              <HeartPulse className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
            <div><h1 className="text-2xl font-bold text-slate-900">NOVA</h1><p className="text-xs text-slate-500">Carnet Santé Ivoirien</p></div>
          </div>

          {auth === 'login' ? (
            <div className="space-y-6">
              <div><h3 className="text-3xl font-bold text-slate-900">Bienvenue</h3><p className="text-slate-500 mt-2">Connectez-vous avec votre numéro</p></div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Numéro de téléphone</label>
                  <div className={`mt-2 flex items-center gap-2 p-3 rounded-xl border-2 ${err ? 'border-red-300' : 'border-slate-200'} focus-within:border-red-500 bg-white`}>
                    <div className="flex items-center gap-2 pr-3 border-r border-slate-200">
                      <span className="text-2xl">🇨🇮</span><span className="text-sm font-semibold text-slate-900">+225</span>
                    </div>
                    <input type="tel" value={phone} onChange={(e) => { setPhone(fmt(e.target.value)); setErr(''); }}
                      onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="07 89 45 23 11"
                      className="flex-1 outline-none text-slate-900 text-base font-mono tracking-wide" autoFocus />
                    <Smartphone className="w-5 h-5 text-slate-400" />
                  </div>
                  {err && <p className="text-xs text-red-600 mt-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {err}</p>}
                </div>
                <button onClick={submit} disabled={load || cleaned.length !== 10}
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-xl hover:shadow-red-600/30 hover:scale-[1.01] transition-all disabled:opacity-50">
                  {load ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Envoi...</> : <>Recevoir le code <ArrowRight className="w-4 h-4" /></>}
                </button>
                <p className="text-[11px] text-slate-500 text-center">Un code à 4 chiffres sera envoyé par SMS</p>
              </div>
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                <div className="relative flex justify-center text-xs"><span className="px-2 bg-white text-slate-500 uppercase font-semibold tracking-wider">Comptes démo</span></div>
              </div>
              <div className="space-y-2">
                {Object.entries(ACCOUNTS).map(([num, acc]) => (
                  <button key={num} onClick={() => setPhone(fmt(num))}
                    className="w-full p-3 rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50/30 flex items-center gap-3 text-left">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${acc.role === 'patient' ? 'bg-blue-500' : acc.role === 'doctor' ? 'bg-emerald-500' : 'bg-purple-500'}`}>
                      {acc.role === 'patient' && <User className="w-5 h-5" />}
                      {acc.role === 'doctor' && <Stethoscope className="w-5 h-5" />}
                      {acc.role === 'admin' && <Shield className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{acc.name}</p>
                      <p className="text-xs text-slate-500 font-mono">+225 {fmt(num)}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${acc.role === 'patient' ? 'bg-blue-100 text-blue-700' : acc.role === 'doctor' ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'}`}>{acc.role}</span>
                  </button>
                ))}
              </div>
              <p className="text-center text-xs text-slate-500">Pas de compte ? <span className="text-red-600 font-semibold">Contactez votre médecin</span></p>
            </div>
          ) : (
            <div className="space-y-6">
              <button onClick={() => { setAuth('login'); setOtp(['','','','']); }} className="flex items-center gap-1 text-sm text-slate-600 hover:text-red-600">
                <ChevronLeft className="w-4 h-4" /> Retour
              </button>
              <div>
                <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mb-4"><KeyRound className="w-7 h-7 text-red-600" /></div>
                <h3 className="text-3xl font-bold text-slate-900">Vérification</h3>
                <p className="text-slate-500 mt-2">Code envoyé au <span className="font-semibold text-slate-900">+225 {phone}</span></p>
              </div>
              <div className="flex gap-3 justify-center">
                {otp.map((d, i) => (
                  <input key={i} ref={refs[i]} type="text" inputMode="numeric" maxLength={1} value={d}
                    onChange={(e) => onOtp(i, e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Backspace' && !d && i > 0) refs[i-1].current?.focus(); }}
                    autoFocus={i === 0}
                    className={`w-16 h-16 text-center text-2xl font-bold rounded-xl border-2 ${err ? 'border-red-300' : 'border-slate-200'} focus:border-red-500 outline-none text-slate-900`} />
                ))}
              </div>
              {err && <p className="text-sm text-red-600 text-center flex items-center justify-center gap-1"><AlertCircle className="w-4 h-4" /> {err}</p>}
              {load && <div className="flex items-center justify-center gap-2 text-slate-600"><div className="w-4 h-4 border-2 border-slate-300 border-t-red-600 rounded-full animate-spin"></div><span className="text-sm">Vérification...</span></div>}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900"><strong>Mode démo :</strong> code <strong className="font-mono">0000</strong></p>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes float{0%,100%{transform:translateY(0px) rotate(0deg);}50%{transform:translateY(-20px) rotate(5deg);}}.animate-float{animation:float 6s ease-in-out infinite;}`}</style>
    </div>
  );
}

/* ============== SIDEBAR ============== */
function Sidebar({ role, page, setPage, sbOpen, onCP, onCD, darkMode, sub, border }) {
  const sec = role === 'patient' ? [
    { t: 'PRINCIPAL', i: [{id:'dashboard',l:'Accueil',I:Home},{id:'profile',l:'Mon profil',I:User}]},
    { t: 'SUIVI MÉDICAL', i: [
      {id:'pilulier',l:'Pilulier',I:Pill},{id:'treatments',l:'Traitements',I:HeartPulse},
      {id:'rdv',l:'Rendez-vous',I:Calendar},{id:'vaccinations',l:'Vaccinations',I:Syringe},
      {id:'dna',l:'ADN Médical',I:Droplet},{id:'history',l:'Historique',I:ClipboardList}
    ]},
    { t: 'COMMUNICATION', i: [
      {id:'messages',l:'Messages',I:MessageCircle,b:3},
      {id:'documents',l:'Documents',I:FileText},
      {id:'notes',l:'Bloc-notes',I:StickyNote}
    ]},
    { t: 'BIEN-ÊTRE', i: [{id:'wellness',l:'Bien-être',I:Target}]},
    { t: 'COMPTE', i: [{id:'settings',l:'Paramètres',I:Settings}]}
  ] : role === 'doctor' ? [
    { t: 'PRINCIPAL', i: [{id:'dashboard',l:'Tableau de bord',I:BarChart3},{id:'patients',l:'Mes patients',I:Users}],
      a: { l: 'Nouveau patient', I: UserPlus, on: onCP }},
    { t: 'ACTIVITÉ', i: [{id:'consultations',l:'Consultations',I:ClipboardList},{id:'stats',l:'Statistiques',I:TrendingUp}]},
    { t: 'COMMUNICATION', i: [{id:'messages',l:'Messages',I:MessageCircle,b:5},{id:'documents',l:'Documents',I:FileText}]},
    { t: 'COMPTE', i: [{id:'profile',l:'Mon profil',I:User},{id:'settings',l:'Paramètres',I:Settings}]}
  ] : [
    { t: 'GOUVERNANCE', i: [{id:'dashboard',l:'Tour de Contrôle',I:BarChart3},{id:'audit',l:"Journal d'audit",I:Lock}]},
    { t: 'GESTION', i: [{id:'users',l:'Utilisateurs',I:Users}],
      as: [{l:'Nouveau médecin',I:Stethoscope,on:onCD},{l:'Nouveau patient',I:UserPlus,on:onCP}]},
    { t: 'INFRASTRUCTURE', i: [{id:'system',l:'Système',I:ServerCog},{id:'settings',l:'Paramètres',I:Settings}]}
  ];

  const sbBg = darkMode ? 'bg-slate-950' : 'bg-white';
  const act = 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md shadow-red-600/20';
  const ina = darkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100';

  return (
    <aside className={`${sbBg} border-r ${border} fixed lg:sticky lg:top-[57px] top-0 left-0 z-50 lg:z-30 w-64 h-screen lg:h-[calc(100vh-57px)] transition-transform duration-300 ${sbOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 flex flex-col`}>
      <nav className="flex-1 p-3 overflow-y-auto">
        {sec.map((s, si) => (
          <div key={si} className="mb-5">
            <p className={`text-[10px] font-bold ${sub} px-3 mb-2 tracking-wider`}>{s.t}</p>
            <div className="space-y-0.5">
              {s.i.map(it => {
                const isAct = page === it.id;
                return (
                  <button key={it.id} onClick={() => setPage(it.id)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${isAct ? act : ina}`}>
                    <it.I className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 text-left truncate">{it.l}</span>
                    {it.b && <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isAct ? 'bg-white text-red-600' : 'bg-red-600 text-white'}`}>{it.b}</span>}
                  </button>
                );
              })}
              {s.a && (
                <button onClick={s.a.on} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold border-2 border-dashed mt-1 ${darkMode ? 'border-slate-700 text-slate-400 hover:border-red-600' : 'border-slate-300 text-slate-600 hover:border-red-600 hover:text-red-600'}`}>
                  <s.a.I className="w-4 h-4" />
                  <span className="flex-1 text-left">{s.a.l}</span>
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
              {s.as && s.as.map((a, ai) => (
                <button key={ai} onClick={a.on} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold border-2 border-dashed mt-1 ${darkMode ? 'border-slate-700 text-slate-400 hover:border-red-600' : 'border-slate-300 text-slate-600 hover:border-red-600 hover:text-red-600'}`}>
                  <a.I className="w-4 h-4" />
                  <span className="flex-1 text-left">{a.l}</span>
                  <Plus className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className={`p-3 border-t ${border}`}>
        <div className="p-3 rounded-xl bg-gradient-to-br from-red-600 to-red-800 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-400/30 rounded-full -translate-y-10 translate-x-10 blur-2xl"></div>
          <div className="relative">
            <Sparkles className="w-4 h-4 mb-1" />
            <p className="text-xs font-bold">Aide & Support</p>
            <p className="text-[10px] text-red-100 mt-1">24h/24 • 7j/7</p>
            <button className="mt-2 w-full bg-white/20 backdrop-blur text-white text-[10px] font-bold py-1.5 rounded-lg">Contacter</button>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ============== PATIENT PAGES ============== */
function PatientPages({ page, setShowQR, pills, setPills, setShowVid, card, sub, border, darkMode }) {
  const p = { card, sub, border, darkMode };
  const map = {
    dashboard: <PDash setShowQR={setShowQR} {...p} />,
    profile: <PProfile {...p} />,
    pilulier: <PPilulier pills={pills} setPills={setPills} {...p} />,
    treatments: <PTreatments {...p} />,
    rdv: <PRDV setShowVid={setShowVid} {...p} />,
    vaccinations: <PVax {...p} />,
    dna: <PDNA {...p} />,
    history: <PHistory {...p} />,
    messages: <PMsg setShowVid={setShowVid} {...p} />,
    documents: <PDocs {...p} />,
    notes: <PNotes {...p} />,
    wellness: <PWell {...p} />,
    settings: <SettingsPage {...p} />
  };
  return map[page] || map.dashboard;
}

function PDash({ setShowQR, card, sub, darkMode }) {
  const consts = [
    { l: 'Tension', v: '12/8', u: 'mmHg', I: Heart, c: 'red', d: [120,125,122,118,121,119,120] },
    { l: 'Glycémie', v: '0.95', u: 'g/L', I: Droplet, c: 'blue', d: [1.1,1.05,1.0,0.98,0.97,0.96,0.95] },
    { l: 'Fréquence', v: '72', u: 'bpm', I: Activity, c: 'pink', d: [70,72,71,73,72,71,72] },
    { l: 'Température', v: '36.8', u: '°C', I: Thermometer, c: 'orange', d: [36.7,36.8,36.9,36.8,36.7,36.8,36.8] }
  ];
  const cm = { red: '#dc2626', blue: '#2563eb', pink: '#db2777', orange: '#ea580c' };

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-br from-red-600 via-red-700 to-red-800 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/20 rounded-full -translate-y-32 translate-x-32 blur-3xl"></div>
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-red-100 text-sm">Bonjour 👋</p>
            <h2 className="text-2xl md:text-3xl font-bold">Kouamé Bamba</h2>
            <p className="text-red-100 text-sm mt-1">CMU: CI-2024-0847-3692 • Cocody, Abidjan</p>
          </div>
          <button onClick={() => setShowQR(true)} className="bg-white text-red-700 px-5 py-3 rounded-xl font-semibold flex items-center gap-2 hover:scale-105 transition-transform shadow-xl">
            <Siren className="w-5 h-5" /> Pass Santé d'Urgence
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`lg:col-span-1 ${card} border rounded-2xl p-6`}>
          <div className="flex items-center justify-between mb-4">
            <div><p className={`text-xs ${sub}`}>Score de Santé</p><p className="text-xs text-emerald-600 font-semibold mt-1">↑ +3 cette semaine</p></div>
            <Sparkles className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex items-center justify-center py-4">
            <div className="relative w-44 h-44">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke={darkMode ? '#1e293b' : '#e2e8f0'} strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="url(#hg)" strokeWidth="8" strokeDasharray="216 264" strokeLinecap="round" />
                <defs><linearGradient id="hg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#dc2626" /><stop offset="100%" stopColor="#f97316" /></linearGradient></defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold">82</span>
                <span className={`text-xs ${sub}`}>/ 100</span>
                <span className="text-xs text-emerald-600 font-semibold mt-1">Excellent</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {consts.map((c, i) => {
            const mx = Math.max(...c.d), mn = Math.min(...c.d), r = mx - mn || 1;
            const pts = c.d.map((v, idx) => `${(idx/(c.d.length-1))*100},${100 - ((v-mn)/r)*80 - 10}`).join(' ');
            return (
              <div key={i} className={`${card} border rounded-2xl p-5`}>
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg bg-${c.c}-100 flex items-center justify-center`}>
                    <c.I className={`w-5 h-5 text-${c.c}-600`} />
                  </div>
                </div>
                <p className={`text-xs ${sub} mb-1`}>{c.l}</p>
                <p className="text-2xl font-bold">{c.v} <span className={`text-sm font-normal ${sub}`}>{c.u}</span></p>
                <div className="mt-3 h-12">
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                    <polyline points={pts} fill="none" stroke={cm[c.c]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[{I:Video,l:'Téléconsult.',c:'from-blue-500 to-blue-600'},{I:Bell,l:'3 Rappels',c:'from-orange-500 to-orange-600'},{I:MessageCircle,l:'Messages',c:'from-purple-500 to-purple-600'},{I:FileText,l:'Ordonnances',c:'from-emerald-500 to-emerald-600'}].map((a, i) => (
          <button key={i} className={`${card} border rounded-xl p-4 flex flex-col items-start gap-3 hover:scale-105 transition-transform`}>
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${a.c} flex items-center justify-center text-white shadow-md`}>
              <a.I className="w-5 h-5" />
            </div>
            <span className="text-sm font-semibold">{a.l}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PProfile({ card, sub, border, darkMode }) {
  const [edit, setEdit] = useState(false);
  const [d, setD] = useState({
    firstName: 'Kouamé', lastName: 'Bamba', birthDate: '1974-03-15', sex: 'M',
    cmu: 'CI-2024-0847-3692', phone: '0789452311', email: 'k.bamba@example.ci',
    address: 'Cocody, Rue des Jardins', city: 'Abidjan',
    bloodType: 'O+', weight: '78', height: '175',
    eName: 'Aya Bamba', eRel: 'Épouse', ePhone: '0700112233', profession: 'Ingénieur'
  });

  const F = ({ l, n, t = 'text', I, full = false }) => (
    <div className={full ? 'md:col-span-2' : ''}>
      <label className={`text-[11px] font-bold uppercase tracking-wider ${sub} flex items-center gap-1`}>
        {I && <I className="w-3 h-3" />} {l}
      </label>
      {edit ? (
        <input type={t} value={d[n]} onChange={(e) => setD({...d, [n]: e.target.value})}
          className={`mt-1.5 w-full px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'} focus:outline-none focus:ring-2 focus:ring-red-500`} />
      ) : (
        <p className="mt-1.5 text-sm font-semibold py-2">{d[n] || '—'}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-2xl p-6 text-white flex flex-col md:flex-row md:items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-400/20 rounded-full -translate-y-24 translate-x-24 blur-2xl"></div>
        <div className="relative w-24 h-24 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl font-bold border-2 border-white/30">KB</div>
        <div className="relative flex-1">
          <h2 className="text-2xl font-bold">{d.firstName} {d.lastName}</h2>
          <p className="text-red-100 text-sm font-mono">{d.cmu}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="px-2 py-1 rounded-full bg-white/20 text-xs font-semibold">{d.bloodType}</span>
            <span className="px-2 py-1 rounded-full bg-white/20 text-xs font-semibold">52 ans</span>
            <span className="px-2 py-1 rounded-full bg-white/20 text-xs font-semibold">{d.city}</span>
          </div>
        </div>
        <button onClick={() => setEdit(!edit)} className="relative bg-white text-red-700 px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 hover:scale-105 shadow-lg">
          {edit ? <><Save className="w-4 h-4" /> Enregistrer</> : <><Edit3 className="w-4 h-4" /> Modifier</>}
        </button>
      </div>

      <div className={`${card} border rounded-2xl p-6`}>
        <h3 className="font-bold mb-4 flex items-center gap-2"><User className="w-4 h-4 text-red-600" /> Informations personnelles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <F l="Prénom" n="firstName" /><F l="Nom" n="lastName" />
          <F l="Date de naissance" n="birthDate" t="date" I={Calendar} /><F l="Sexe" n="sex" />
          <F l="Profession" n="profession" /><F l="N° CMU" n="cmu" />
        </div>
      </div>

      <div className={`${card} border rounded-2xl p-6`}>
        <h3 className="font-bold mb-4 flex items-center gap-2"><Phone className="w-4 h-4 text-red-600" /> Coordonnées</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <F l="Téléphone" n="phone" I={Smartphone} /><F l="Email" n="email" I={Mail} />
          <F l="Adresse" n="address" full I={MapPin} /><F l="Ville" n="city" />
        </div>
      </div>

      <div className={`${card} border rounded-2xl p-6`}>
        <h3 className="font-bold mb-4 flex items-center gap-2"><Heart className="w-4 h-4 text-red-600" /> Données médicales</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <F l="Groupe sanguin" n="bloodType" /><F l="Poids (kg)" n="weight" /><F l="Taille (cm)" n="height" />
        </div>
      </div>

      <div className={`${card} border rounded-2xl p-6`}>
        <h3 className="font-bold mb-4 flex items-center gap-2"><Siren className="w-4 h-4 text-red-600" /> Contact d'urgence</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <F l="Nom" n="eName" /><F l="Lien" n="eRel" /><F l="Téléphone" n="ePhone" />
        </div>
      </div>
    </div>
  );
}

function PPilulier({ pills, setPills, card, sub, darkMode }) {
  const meds = [
    { id: 1, n: 'Amlodipine', d: '5mg', t: '08:00', p: 'Matin', c: 'bg-blue-500' },
    { id: 2, n: 'Metformine', d: '500mg', t: '08:00', p: 'Matin', c: 'bg-emerald-500' },
    { id: 3, n: 'Aspirine', d: '100mg', t: '12:30', p: 'Midi', c: 'bg-red-500', i: true },
    { id: 4, n: 'Metformine', d: '500mg', t: '20:00', p: 'Soir', c: 'bg-emerald-500' },
    { id: 5, n: 'Vitamine D', d: '1000UI', t: '20:00', p: 'Soir', c: 'bg-amber-500' }
  ];
  const cnt = Object.values(pills).filter(Boolean).length;
  const obs = Math.round((cnt / meds.length) * 100);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Pilulier Numérique</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`lg:col-span-2 ${card} border rounded-2xl p-6`}>
          <div className="flex items-center justify-between mb-6">
            <div><h3 className="font-bold text-lg">Aujourd'hui</h3><p className={`text-xs ${sub}`}>{cnt} / {meds.length} pris</p></div>
            <span className="text-xs font-semibold text-red-600 flex items-center gap-1"><Bell className="w-3 h-3" /> Prochain à 12:30</span>
          </div>
          <div className={`h-2 rounded-full ${darkMode ? 'bg-slate-800' : 'bg-slate-200'} mb-6 overflow-hidden`}>
            <div className="h-full bg-gradient-to-r from-red-600 to-red-500" style={{ width: `${obs}%` }}></div>
          </div>
          <div className="space-y-4">
            {['Matin','Midi','Soir'].map(per => {
              const pm = meds.filter(m => m.p === per);
              if (!pm.length) return null;
              return (
                <div key={per}>
                  <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
                    {per === 'Soir' ? <Moon className="w-4 h-4 text-indigo-500" /> : <Sun className="w-4 h-4 text-amber-500" />}
                    {per} • {pm[0].t}
                  </h4>
                  <div className="space-y-2">
                    {pm.map(m => (
                      <div key={m.id} className={`flex items-center gap-3 p-3 rounded-xl border ${pills[m.id] ? 'opacity-70 bg-emerald-50 border-emerald-200' : darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <div className={`w-2 h-12 rounded-full ${m.c}`}></div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`font-semibold ${pills[m.id] ? 'line-through' : ''}`}>{m.n}</p>
                            {m.i && <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Interaction</span>}
                          </div>
                          <p className={`text-xs ${sub}`}>{m.d} • {m.t}</p>
                        </div>
                        <button onClick={() => setPills({...pills, [m.id]: !pills[m.id]})} className={`w-10 h-10 rounded-full flex items-center justify-center ${pills[m.id] ? 'bg-emerald-600 text-white' : darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                          <Check className="w-5 h-5" strokeWidth={3} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="space-y-4">
          <div className={`${card} border rounded-2xl p-6 text-center`}>
            <Award className="w-5 h-5 text-amber-500 mx-auto mb-2" />
            <p className="text-5xl font-bold text-emerald-600">94<span className="text-2xl">%</span></p>
            <p className={`text-xs ${sub} mt-2`}>Observance hebdo</p>
            <span className="inline-block mt-3 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">Excellent 🏆</span>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div><h4 className="font-bold text-sm text-red-900">Interaction détectée</h4><p className="text-xs mt-1 text-red-800">Aspirine + Anticoagulant</p></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PTreatments({ card, sub, darkMode }) {
  const ts = [
    { n: 'Hypertension artérielle', s: 'Stade 1', pr: 75, du: 'Depuis Janvier 2024', dr: 'Dr. Aïcha Touré',
      m: ['Amlodipine 5mg', 'Aspirine 100mg'], nc: '02 Mai 2026',
      o: [{l:'Tension < 14/9',d:true},{l:'Réduction sel',d:true},{l:'Activité physique',d:false},{l:'Perte 5kg',d:false}], c: 'red' },
    { n: 'Diabète Type 2', s: 'Contrôlé', pr: 90, du: 'Depuis Mars 2023', dr: 'Dr. Mariam Bamba',
      m: ['Metformine 500mg x2'], nc: '15 Mai 2026',
      o: [{l:'HbA1c < 7%',d:true},{l:'Glycémie < 1.2 g/L',d:true},{l:'Suivi ophtalmo',d:true},{l:'Régime',d:true}], c: 'blue' }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className="text-2xl font-bold">Mes Traitements</h2><p className={`text-sm ${sub}`}>Suivi de pathologies en cours</p></div>
        <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">{ts.length} actifs</span>
      </div>
      {ts.map((t, i) => (
        <div key={i} className={`${card} border rounded-2xl p-6 relative overflow-hidden`}>
          <div className={`absolute top-0 left-0 w-1 h-full bg-${t.c}-500`}></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold">{t.n}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold bg-${t.c}-100 text-${t.c}-700`}>{t.s}</span>
                </div>
                <p className={`text-xs ${sub}`}>{t.du} • {t.dr}</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5"><span className="text-xs font-semibold">Progression</span><span className="text-xs font-bold">{t.pr}%</span></div>
                <div className={`h-2 rounded-full ${darkMode ? 'bg-slate-800' : 'bg-slate-200'} overflow-hidden`}>
                  <div className={`h-full bg-gradient-to-r from-${t.c}-500 to-${t.c}-600`} style={{ width: `${t.pr}%` }}></div>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase mb-2">Médicaments</h4>
                <div className="flex flex-wrap gap-2">
                  {t.m.map((m, mi) => (
                    <span key={mi} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${darkMode ? 'bg-slate-800' : 'bg-slate-100'} flex items-center gap-1.5`}>
                      <Pill className="w-3 h-3 text-red-600" /> {m}
                    </span>
                  ))}
                </div>
              </div>
              <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'} flex items-center gap-3`}>
                <CalendarClock className="w-5 h-5 text-red-600" />
                <div className="flex-1"><p className="text-xs font-bold">Prochain contrôle</p><p className={`text-xs ${sub}`}>{t.nc}</p></div>
              </div>
            </div>
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <h4 className="text-xs font-bold uppercase mb-3 flex items-center gap-1"><Target className="w-3 h-3" /> Objectifs</h4>
              <div className="space-y-2">
                {t.o.map((o, oi) => (
                  <div key={oi} className="flex items-start gap-2">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${o.d ? 'bg-emerald-600' : darkMode ? 'bg-slate-700' : 'bg-slate-300'}`}>
                      {o.d && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                    </div>
                    <span className={`text-xs ${o.d ? 'line-through opacity-60' : ''}`}>{o.l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PRDV({ card, sub, darkMode, setShowVid }) {
  const rs = [
    { d: '02 Mai', t: '14:30', dr: 'Dr. Aïcha Touré', sp: 'Cardiologie', l: 'CHU Treichville', dl: 4, v: false },
    { d: '15 Mai', t: '09:00', dr: 'Dr. Yao Konan', sp: 'Médecine générale', l: 'Téléconsultation', dl: 17, v: true },
    { d: '28 Mai', t: '11:00', dr: 'Dr. Mariam Bamba', sp: 'Endocrinologie', l: 'PISAM Cocody', dl: 30, v: false }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold">Mes Rendez-vous</h2>
        <button className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-red-700">
          <Plus className="w-4 h-4" /> Nouveau RDV
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          {rs.map((r, i) => (
            <div key={i} className={`${card} border rounded-2xl p-5`}>
              <div className="flex items-start gap-4">
                <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl ${i === 0 ? 'bg-red-600 text-white' : darkMode ? 'bg-slate-800' : 'bg-white'} border ${i === 0 ? 'border-red-600' : darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                  <span className="text-xs font-medium">{r.d.split(' ')[1]}</span>
                  <span className="text-2xl font-bold">{r.d.split(' ')[0]}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div><h4 className="font-bold">{r.dr}</h4><p className={`text-xs ${sub}`}>{r.sp}</p></div>
                    {i === 0 && <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">J-{r.dl}</span>}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                    <span className={`flex items-center gap-1 ${sub}`}><Clock className="w-3 h-3" /> {r.t}</span>
                    <span className={`flex items-center gap-1 ${sub}`}>{r.v ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />} {r.l}</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {r.v ? (
                      <button onClick={() => setShowVid(true)} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold flex items-center gap-1 hover:bg-red-700">
                        <Video className="w-3 h-3" /> Rejoindre
                      </button>
                    ) : (
                      <button className={`px-3 py-1.5 rounded-lg ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'} border text-xs font-semibold`}>Itinéraire</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className={`${card} border rounded-2xl p-5`}>
          <div className="flex items-center gap-2 mb-3"><Brain className="w-5 h-5 text-purple-600" /><h3 className="font-bold text-sm">Préparation IA</h3></div>
          <div className="space-y-2">
            {['Palpitations matinales','Tension élevée 18/04','Effets Amlodipine ?'].map((s, i) => (
              <div key={i} className={`flex items-start gap-2 p-2 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-white'} border ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs">{s}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PVax({ card, sub, border, darkMode }) {
  const vs = [
    { n: 'Tétanos', d: '02/04/2026', s: 'À jour', c: 'emerald', x: '02/04/2036' },
    { n: 'Hépatite B', d: '15/01/2024', s: 'À jour', c: 'emerald', x: 'Aucun rappel' },
    { n: 'Fièvre jaune', d: '20/06/2020', s: 'À jour', c: 'emerald', x: 'À vie' },
    { n: 'Méningite', d: '10/02/2023', s: 'Rappel 2026', c: 'amber', x: '10/02/2026' },
    { n: 'Grippe', d: '15/10/2025', s: 'À jour', c: 'emerald', x: '15/10/2026' },
    { n: 'COVID-19', d: '20/09/2025', s: 'À jour', c: 'emerald', x: 'Sur recommandation' }
  ];
  return (
    <div className="space-y-4">
      <div><h2 className="text-2xl font-bold">Carnet Vaccinal</h2><p className={`text-sm ${sub}`}>Historique et rappels</p></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-2xl p-5">
          <ShieldCheck className="w-6 h-6 mb-2" /><p className="text-3xl font-bold">5</p><p className="text-xs">Vaccins à jour</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl p-5">
          <Clock className="w-6 h-6 mb-2" /><p className="text-3xl font-bold">1</p><p className="text-xs">Rappel à venir</p>
        </div>
        <div className="bg-gradient-to-br from-red-600 to-red-800 text-white rounded-2xl p-5">
          <Syringe className="w-6 h-6 mb-2" /><p className="text-3xl font-bold">100%</p><p className="text-xs">Couverture</p>
        </div>
      </div>
      <div className={`${card} border rounded-2xl p-6`}>
        <h3 className="font-bold mb-4">Historique complet</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {vs.map((v, i) => (
            <div key={i} className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg bg-${v.c}-100 flex items-center justify-center`}><Syringe className={`w-5 h-5 text-${v.c}-600`} /></div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold bg-${v.c}-100 text-${v.c}-700`}>{v.s}</span>
              </div>
              <p className="font-bold">{v.n}</p>
              <p className={`text-xs ${sub} mt-1`}>{v.d}</p>
              <p className={`text-xs ${sub} mt-2`}>Prochain : <strong>{v.x}</strong></p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PDNA({ card, sub, darkMode }) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">ADN Médical</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-red-600 to-red-800 text-white rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-400/20 rounded-full -translate-y-24 translate-x-24 blur-2xl"></div>
          <Droplet className="w-8 h-8 mb-3" />
          <p className="text-xs text-red-100">Groupe Sanguin</p>
          <p className="text-6xl font-bold">O+</p>
          <p className="text-xs text-red-100 mt-2">Donneur universel</p>
        </div>
        <div className={`${card} border rounded-2xl p-6`}>
          <div className="flex items-center gap-2 mb-4"><AlertTriangle className="w-5 h-5 text-red-600" /><h3 className="font-bold">Allergies</h3></div>
          <div className="space-y-2">
            {[{n:'Pénicilline',s:'Sévère',c:'bg-red-600'},{n:'Arachides',s:'Modérée',c:'bg-amber-500'},{n:'Pollen',s:'Légère',c:'bg-yellow-500'}].map((a, i) => (
              <div key={i} className={`flex items-center justify-between p-3 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-white'} border ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <div className="flex items-center gap-3"><div className={`w-2 h-8 rounded-full ${a.c}`}></div><span className="font-semibold">{a.n}</span></div>
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${a.c} text-white`}>{a.s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PHistory({ card, sub, darkMode }) {
  const cs = [
    { d: '15 Avril 2026', dr: 'Dr. Yao Konan', sp: 'Médecine générale', di: 'Hypertension stade 1' },
    { d: '02 Avril 2026', dr: 'Dr. Aïcha Touré', sp: 'Cardiologie', di: 'Suivi tensionnel' },
    { d: '15 Mars 2026', dr: 'Dr. Mariam Bamba', sp: 'Endocrinologie', di: 'Diabète T2 contrôlé' },
    { d: '20 Février 2026', dr: 'Dr. Yao Konan', sp: 'Médecine générale', di: 'Paludisme simple' }
  ];
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Historique médical</h2>
      <div className={`${card} border rounded-2xl p-6 space-y-3`}>
        {cs.map((c, i) => (
          <div key={i} className={`flex flex-col md:flex-row md:items-center gap-3 p-4 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className={`md:w-32 text-xs ${sub} font-semibold`}>{c.d}</div>
            <div className="flex-1">
              <p className="font-semibold">{c.dr} <span className={`text-xs font-normal ${sub}`}>• {c.sp}</span></p>
              <p className={`text-sm ${sub} mt-0.5`}>{c.di}</p>
            </div>
            <button className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold flex items-center gap-1 hover:bg-red-700">
              <Download className="w-3 h-3" /> PDF
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PWell({ card, sub, darkMode }) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Bien-être & Prévention</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[{l:'Pas',cur:7842,t:10000,u:'pas',I:Activity,c:'blue'},{l:'Hydratation',cur:1.4,t:2.5,u:'L',I:Droplet,c:'cyan'},{l:'Sommeil',cur:7.2,t:8,u:'h',I:Moon,c:'purple'}].map((g, i) => {
          const pct = Math.min(100, (g.cur / g.t) * 100);
          return (
            <div key={i} className={`${card} border rounded-2xl p-6`}>
              <div className={`w-10 h-10 rounded-lg bg-${g.c}-100 flex items-center justify-center mb-3`}><g.I className={`w-5 h-5 text-${g.c}-600`} /></div>
              <p className={`text-xs ${sub}`}>{g.l}</p>
              <p className="text-3xl font-bold mt-1">{g.cur} <span className={`text-sm font-normal ${sub}`}>/ {g.t} {g.u}</span></p>
              <div className={`h-2 rounded-full ${darkMode ? 'bg-slate-800' : 'bg-slate-200'} mt-3 overflow-hidden`}>
                <div className={`h-full bg-${g.c}-500`} style={{ width: `${pct}%` }}></div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl p-6">
        <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur text-xs font-bold inline-block">Conseil saison sèche 🌞</span>
        <h3 className="text-2xl font-bold mt-3">Hydratez-vous régulièrement</h3>
        <p className="text-amber-100 text-sm mt-2">Buvez 2,5L d'eau par jour, surtout entre 10h et 16h.</p>
      </div>
    </div>
  );
}

function PMsg({ card, sub, border, darkMode, setShowVid }) {
  const [sel, setSel] = useState(0);
  const [msg, setMsg] = useState('');
  const cv = [
    { id: 0, n: 'Dr. Aïcha Touré', sp: 'Cardiologie', l: 'Vos résultats sont arrivés', t: '14:32', u: 2, on: true, a: 'AT' },
    { id: 1, n: 'Dr. Yao Konan', sp: 'Médecine générale', l: 'RDV confirmé pour le 15', t: 'Hier', u: 0, on: false, a: 'YK' },
    { id: 2, n: 'Dr. Mariam Bamba', sp: 'Endocrinologie', l: 'Pensez à votre HbA1c', t: 'Lundi', u: 1, on: true, a: 'MB' }
  ];
  const ms = [
    { f: 'd', t: 'Bonjour Kouamé.', tm: '14:25' },
    { f: 'd', t: 'Vos résultats sont arrivés. Tout est positif.', tm: '14:25' },
    { f: 'm', t: 'Merci Docteur.', tm: '14:28' },
    { f: 'd', t: 'Continuez l\'Amlodipine et réduisez le sel.', tm: '14:30' },
    { f: 'd', t: 'Compte-rendu en pièce jointe.', tm: '14:32', at: 'cardio.pdf' }
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Messages</h2>
      <div className={`${card} border rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-3 h-[600px]`}>
        <div className={`border-r ${border} overflow-y-auto`}>
          <div className={`p-3 border-b ${border}`}>
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${sub}`} />
              <input type="text" placeholder="Rechercher..." className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
            </div>
          </div>
          {cv.map(c => (
            <button key={c.id} onClick={() => setSel(c.id)} className={`w-full p-3 border-b ${border} flex items-start gap-3 ${sel === c.id ? darkMode ? 'bg-slate-800' : 'bg-red-50' : darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center font-bold text-sm">{c.a}</div>
                {c.on && <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white"></span>}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between gap-2"><p className="font-semibold text-sm truncate">{c.n}</p><p className={`text-[10px] ${sub}`}>{c.t}</p></div>
                <p className={`text-[10px] ${sub} mb-0.5`}>{c.sp}</p>
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-xs ${sub} truncate`}>{c.l}</p>
                  {c.u > 0 && <span className="px-1.5 rounded-full bg-red-600 text-white text-[10px] font-bold">{c.u}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
        <div className="md:col-span-2 flex flex-col">
          <div className={`p-3 border-b ${border} flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center font-bold text-sm">AT</div>
              <div><p className="font-bold text-sm">Dr. Aïcha Touré</p><p className="text-[10px] text-emerald-600 font-semibold">En ligne</p></div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowVid && setShowVid(true)} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                <Video className="w-4 h-4 text-emerald-600" />
              </button>
              <button className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                <PhoneCall className="w-4 h-4 text-blue-600" />
              </button>
            </div>
          </div>
          <div className={`flex-1 p-4 space-y-3 overflow-y-auto ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
            {ms.map((m, i) => (
              <div key={i} className={`flex ${m.f === 'm' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] ${m.f === 'm' ? 'bg-red-600 text-white rounded-br-sm' : darkMode ? 'bg-slate-800' : 'bg-white'} rounded-2xl px-4 py-2 shadow-sm border ${m.f === 'm' ? 'border-red-600' : darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                  <p className="text-sm">{m.t}</p>
                  {m.at && (
                    <div className={`mt-2 p-2 rounded-lg ${m.f === 'm' ? 'bg-white/20' : darkMode ? 'bg-slate-700' : 'bg-slate-100'} flex items-center gap-2`}>
                      <FileText className="w-4 h-4" /><span className="text-xs flex-1">{m.at}</span><Download className="w-3 h-3" />
                    </div>
                  )}
                  <p className={`text-[10px] mt-1 ${m.f === 'm' ? 'text-red-100' : sub}`}>{m.tm}</p>
                </div>
              </div>
            ))}
          </div>
          <div className={`p-3 border-t ${border} flex items-center gap-2`}>
            <button className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}><Paperclip className="w-4 h-4" /></button>
            <input type="text" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Écrire..."
              className={`flex-1 px-3 py-2 rounded-xl border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} focus:outline-none focus:ring-2 focus:ring-red-500`} />
            <button onClick={() => setMsg('')} className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center hover:bg-red-700">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PDocs({ card, sub, border, darkMode }) {
  const [f, setF] = useState('all');
  const ds = [
    { n: 'Ordonnance Avril 2026', t: 'PDF', cat: 'ordonnance', d: '15/04/2026', s: '124 KB', I: FileText, c: 'red', dr: 'Dr. Yao Konan' },
    { n: 'Bilan sanguin Mars', t: 'PDF', cat: 'analyse', d: '20/03/2026', s: '342 KB', I: Microscope, c: 'purple', dr: 'Lab. Pasteur' },
    { n: 'Radio thorax', t: 'IMG', cat: 'imagerie', d: '01/03/2026', s: '1.2 MB', I: Eye, c: 'blue', dr: 'CHU Treichville' },
    { n: 'Échographie', t: 'IMG', cat: 'imagerie', d: '15/02/2026', s: '892 KB', I: Eye, c: 'blue', dr: 'PISAM' },
    { n: 'Compte-rendu Cardio', t: 'PDF', cat: 'consultation', d: '02/04/2026', s: '210 KB', I: FileText, c: 'red', dr: 'Dr. Aïcha Touré' },
    { n: 'Certificat médical', t: 'PDF', cat: 'certificat', d: '10/01/2026', s: '78 KB', I: ClipboardList, c: 'emerald', dr: 'Dr. Yao Konan' },
    { n: 'Ordonnance Mars 2026', t: 'PDF', cat: 'ordonnance', d: '15/03/2026', s: '118 KB', I: FileText, c: 'red', dr: 'Dr. Mariam Bamba' },
    { n: 'Bilan endocrinien', t: 'PDF', cat: 'analyse', d: '15/03/2026', s: '256 KB', I: Microscope, c: 'purple', dr: 'Lab. Pasteur' }
  ];
  const filt = f === 'all' ? ds : ds.filter(d => d.cat === f);
  const cats = [
    { id: 'all', l: 'Tous' }, { id: 'ordonnance', l: 'Ordonnances' },
    { id: 'analyse', l: 'Analyses' }, { id: 'imagerie', l: 'Imagerie' },
    { id: 'consultation', l: 'Consultations' }, { id: 'certificat', l: 'Certificats' }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className="text-2xl font-bold">Mes Documents</h2><p className={`text-sm ${sub}`}>{ds.length} documents • Stockage chiffré</p></div>
        <button className="px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold flex items-center gap-1">
          <FileDown className="w-3 h-3" /> Tout télécharger
        </button>
      </div>
      <div className={`flex gap-1 p-1 rounded-xl ${darkMode ? 'bg-slate-900' : 'bg-slate-100'} overflow-x-auto`}>
        {cats.map(c => {
          const cnt = c.id === 'all' ? ds.length : ds.filter(d => d.cat === c.id).length;
          return (
            <button key={c.id} onClick={() => setF(c.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${f === c.id ? 'bg-white text-slate-900 shadow-md' : sub}`}>
              {c.l}
              <span className={`px-1.5 rounded-full text-[10px] ${f === c.id ? 'bg-red-100 text-red-700' : darkMode ? 'bg-slate-800' : 'bg-white'}`}>{cnt}</span>
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filt.map((d, i) => (
          <div key={i} className={`${card} border rounded-2xl p-4 hover:shadow-lg hover:scale-[1.02] transition-all`}>
            <div className="flex items-start justify-between mb-3">
              <div className={`w-12 h-12 rounded-xl bg-${d.c}-100 flex items-center justify-center`}><d.I className={`w-6 h-6 text-${d.c}-600`} /></div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>{d.t}</span>
            </div>
            <p className="font-semibold text-sm truncate">{d.n}</p>
            <p className={`text-[10px] ${sub} truncate mt-0.5`}>{d.dr}</p>
            <div className={`flex items-center justify-between mt-3 pt-3 border-t border-dashed ${border}`}>
              <span className={`text-[10px] ${sub}`}>{d.d}</span><span className={`text-[10px] ${sub}`}>{d.s}</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 mt-3">
              <button className={`px-2 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}><Eye className="w-3 h-3" /> Voir</button>
              <button className="px-2 py-1.5 rounded-lg text-[10px] font-bold bg-red-600 text-white flex items-center justify-center gap-1 hover:bg-red-700"><Download className="w-3 h-3" /> PDF</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PNotes({ card, sub, border, darkMode }) {
  const [ns, setNs] = useState([
    { id: 1, t: 'Symptômes à surveiller', c: 'Maux de tête au réveil depuis 3 jours, palpitations occasionnelles le soir.', col: 'amber', u: 'Il y a 2h', p: true },
    { id: 2, t: 'Questions pour le RDV', c: '1. Effets Amlodipine ?\n2. Posologie réductible ?\n3. Activité sportive ?', col: 'blue', u: 'Hier', p: true },
    { id: 3, t: 'Régime alimentaire', c: 'Réduire sel, augmenter légumes. 2L d\'eau/jour.', col: 'emerald', u: '2 jours', p: false },
    { id: 4, t: 'Tension matin', c: '15/04 : 13/8\n16/04 : 12/8\n17/04 : 14/9\n18/04 : 15/9 ⚠️', col: 'red', u: '3 jours', p: false }
  ]);
  const [sel, setSel] = useState(ns[0]);
  const [edit, setEdit] = useState(false);
  const cm = {
    amber: { bg: 'bg-amber-100', t: 'text-amber-900', b: 'border-amber-300', tab: 'bg-amber-400' },
    blue: { bg: 'bg-blue-100', t: 'text-blue-900', b: 'border-blue-300', tab: 'bg-blue-400' },
    emerald: { bg: 'bg-emerald-100', t: 'text-emerald-900', b: 'border-emerald-300', tab: 'bg-emerald-400' },
    red: { bg: 'bg-red-100', t: 'text-red-900', b: 'border-red-300', tab: 'bg-red-400' },
    purple: { bg: 'bg-purple-100', t: 'text-purple-900', b: 'border-purple-300', tab: 'bg-purple-400' }
  };

  const add = () => {
    const n = { id: Date.now(), t: 'Nouvelle note', c: '', col: 'amber', u: 'À l\'instant', p: false };
    setNs([n, ...ns]); setSel(n); setEdit(true);
  };
  const upd = (ch) => {
    const u = { ...sel, ...ch, u: 'À l\'instant' };
    setSel(u); setNs(ns.map(n => n.id === u.id ? u : n));
  };
  const del = (id) => {
    const f = ns.filter(n => n.id !== id);
    setNs(f); if (sel?.id === id) setSel(f[0] || null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className="text-2xl font-bold">Bloc-notes</h2><p className={`text-sm ${sub}`}>{ns.length} notes</p></div>
        <button onClick={add} className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-red-700">
          <Plus className="w-4 h-4" /> Nouvelle note
        </button>
      </div>
      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-4 ${card} border rounded-2xl p-4 min-h-[600px]`}>
        <div className={`lg:col-span-1 lg:border-r ${border} lg:pr-4 space-y-2 max-h-[500px] overflow-y-auto`}>
          {ns.sort((a, b) => (b.p ? 1 : 0) - (a.p ? 1 : 0)).map(n => {
            const c = cm[n.col];
            return (
              <button key={n.id} onClick={() => { setSel(n); setEdit(false); }} className={`w-full p-3 rounded-xl border-l-4 ${c.b} ${sel?.id === n.id ? c.bg : darkMode ? 'bg-slate-800' : 'bg-slate-50'} text-left`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className={`font-bold text-sm truncate ${sel?.id === n.id ? c.t : ''}`}>{n.t}</h4>
                  {n.p && <Star className="w-3 h-3 text-amber-500 flex-shrink-0 fill-amber-500" />}
                </div>
                <p className={`text-xs ${sel?.id === n.id ? c.t + ' opacity-80' : sub} line-clamp-2 whitespace-pre-line`}>{n.c || 'Vide...'}</p>
                <p className={`text-[10px] mt-1 ${sel?.id === n.id ? c.t + ' opacity-60' : sub}`}>{n.u}</p>
              </button>
            );
          })}
        </div>
        <div className="lg:col-span-2">
          {sel ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                {edit ? (
                  <input type="text" value={sel.t} onChange={(e) => upd({ t: e.target.value })}
                    className={`flex-1 text-xl font-bold bg-transparent outline-none border-b-2 ${border} pb-1`} />
                ) : (
                  <h3 className="text-xl font-bold flex-1">{sel.t}</h3>
                )}
                <div className="flex items-center gap-1">
                  <button onClick={() => upd({ p: !sel.p })} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                    <Star className={`w-4 h-4 ${sel.p ? 'text-amber-500 fill-amber-500' : sub}`} />
                  </button>
                  <button onClick={() => setEdit(!edit)} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                    {edit ? <Save className="w-4 h-4 text-emerald-600" /> : <Pencil className="w-4 h-4" />}
                  </button>
                  <button onClick={() => del(sel.id)} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
              {edit && (
                <div className="flex gap-2">
                  {Object.keys(cm).map(c => (
                    <button key={c} onClick={() => upd({ col: c })} className={`w-6 h-6 rounded-full ${cm[c].tab} ${sel.col === c ? 'ring-2 ring-offset-2 ring-slate-900' : ''}`}></button>
                  ))}
                </div>
              )}
              <p className={`text-xs ${sub}`}>Mis à jour : {sel.u}</p>
              {edit ? (
                <textarea value={sel.c} onChange={(e) => upd({ c: e.target.value })} placeholder="Écrivez..."
                  className={`w-full min-h-[400px] p-4 rounded-xl border text-sm leading-relaxed ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} focus:outline-none focus:ring-2 focus:ring-red-500 resize-none`} />
              ) : (
                <div className={`p-4 rounded-xl ${cm[sel.col].bg} ${cm[sel.col].t} min-h-[400px] whitespace-pre-line text-sm leading-relaxed`}>
                  {sel.c || <span className="opacity-50">Note vide.</span>}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <StickyNote className={`w-16 h-16 ${sub} mb-4`} />
              <p className={`text-sm ${sub}`}>Sélectionnez ou créez une note</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsPage({ card, sub, border, darkMode }) {
  const [as, setAs] = useState('notif');
  const [s, setS] = useState({
    notif: { pill: true, rdv: true, msg: true, eme: true, news: true, promo: false },
    priv: { dr: true, fam: false, res: true, loc: false },
    sec: { bio: true, ds: true, lock: '5min' },
    app: { fs: 'normal', lg: 'FR', anim: false, hc: false },
    h: { w: 'kg', t: 'C', bp: 'mmHg', g: 'g/L' }
  });
  const secs = [
    { id: 'notif', l: 'Notifications', I: Bell, c: 'red' },
    { id: 'priv', l: 'Confidentialité', I: Lock, c: 'blue' },
    { id: 'sec', l: 'Sécurité', I: Shield, c: 'emerald' },
    { id: 'app', l: 'Apparence', I: Palette, c: 'purple' },
    { id: 'h', l: 'Santé', I: HeartPulse, c: 'pink' },
    { id: 'data', l: 'Données', I: Database, c: 'amber' },
    { id: 'help', l: 'Aide', I: HelpCircle, c: 'cyan' }
  ];
  const T = ({ ch, on }) => (
    <button onClick={on} className={`relative w-11 h-6 rounded-full ${ch ? 'bg-red-600' : darkMode ? 'bg-slate-700' : 'bg-slate-300'}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${ch ? 'translate-x-5' : ''}`}></span>
    </button>
  );
  const R = ({ l, d, children }) => (
    <div className={`flex items-center justify-between gap-4 p-4 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
      <div className="flex-1 min-w-0"><p className="font-semibold text-sm">{l}</p>{d && <p className={`text-xs ${sub} mt-0.5`}>{d}</p>}</div>
      {children}
    </div>
  );
  const upd = (cat, k, v) => setS({ ...s, [cat]: { ...s[cat], [k]: v !== undefined ? v : !s[cat][k] } });

  return (
    <div className="space-y-4">
      <div><h2 className="text-2xl font-bold">Paramètres</h2><p className={`text-sm ${sub}`}>Personnalisez NOVA</p></div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className={`${card} border rounded-2xl p-2`}>
          {secs.map(sc => (
            <button key={sc.id} onClick={() => setAs(sc.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${as === sc.id ? `bg-${sc.c}-100 text-${sc.c}-700` : darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
              <sc.I className="w-4 h-4" /><span className="flex-1 text-left">{sc.l}</span>
              {as === sc.id && <ChevronRight className="w-4 h-4" />}
            </button>
          ))}
        </div>
        <div className={`lg:col-span-3 ${card} border rounded-2xl p-6`}>
          {as === 'notif' && (
            <div className="space-y-3">
              <h3 className="font-bold text-lg flex items-center gap-2"><Bell className="w-5 h-5 text-red-600" /> Notifications</h3>
              <R l="Rappels médicaments" d="Horaires de prise"><T ch={s.notif.pill} on={() => upd('notif', 'pill')} /></R>
              <R l="Rappels rendez-vous" d="24h et 1h avant"><T ch={s.notif.rdv} on={() => upd('notif', 'rdv')} /></R>
              <R l="Messages" d="Nouveaux messages médecins"><T ch={s.notif.msg} on={() => upd('notif', 'msg')} /></R>
              <R l="Alertes urgence" d="Recommandé"><T ch={s.notif.eme} on={() => upd('notif', 'eme')} /></R>
              <R l="Newsletter" d="Conseils hebdomadaires"><T ch={s.notif.news} on={() => upd('notif', 'news')} /></R>
              <R l="Promotions" d="Offres pharmacies"><T ch={s.notif.promo} on={() => upd('notif', 'promo')} /></R>
            </div>
          )}
          {as === 'priv' && (
            <div className="space-y-3">
              <h3 className="font-bold text-lg flex items-center gap-2"><Lock className="w-5 h-5 text-blue-600" /> Confidentialité</h3>
              <R l="Partage avec mes médecins" d="Médecins liés à votre dossier"><T ch={s.priv.dr} on={() => upd('priv', 'dr')} /></R>
              <R l="Partage familial" d="Membres autorisés"><T ch={s.priv.fam} on={() => upd('priv', 'fam')} /></R>
              <R l="Recherche anonyme" d="Améliorer santé publique"><T ch={s.priv.res} on={() => upd('priv', 'res')} /></R>
              <R l="Géolocalisation" d="Services d'urgence"><T ch={s.priv.loc} on={() => upd('priv', 'loc')} /></R>
              <button className={`w-full mt-3 p-3 rounded-xl text-sm font-semibold ${darkMode ? 'bg-slate-800' : 'bg-slate-100'} flex items-center justify-center gap-2`}>
                <Eye className="w-4 h-4" /> Qui a consulté mon dossier ?
              </button>
            </div>
          )}
          {as === 'sec' && (
            <div className="space-y-3">
              <h3 className="font-bold text-lg flex items-center gap-2"><Shield className="w-5 h-5 text-emerald-600" /> Sécurité</h3>
              <R l="Authentification biométrique" d="Empreinte ou face ID"><T ch={s.sec.bio} on={() => upd('sec', 'bio')} /></R>
              <R l="Double authentification" d="Code SMS supplémentaire"><T ch={s.sec.ds} on={() => upd('sec', 'ds')} /></R>
              <R l="Verrouillage automatique" d="Délai déconnexion">
                <select value={s.sec.lock} onChange={(e) => upd('sec', 'lock', e.target.value)} className={`px-3 py-1.5 rounded-lg border text-sm ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-300'}`}>
                  <option>Jamais</option><option>1min</option><option>5min</option><option>15min</option>
                </select>
              </R>
              <button className={`w-full p-3 rounded-xl text-sm font-semibold ${darkMode ? 'bg-slate-800' : 'bg-slate-100'} flex items-center justify-center gap-2`}>
                <KeyRound className="w-4 h-4" /> Changer mot de passe
              </button>
            </div>
          )}
          {as === 'app' && (
            <div className="space-y-3">
              <h3 className="font-bold text-lg flex items-center gap-2"><Palette className="w-5 h-5 text-purple-600" /> Apparence</h3>
              <R l="Taille du texte">
                <select value={s.app.fs} onChange={(e) => upd('app', 'fs', e.target.value)} className={`px-3 py-1.5 rounded-lg border text-sm ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-300'}`}>
                  <option value="small">Petit</option><option value="normal">Normal</option><option value="large">Grand</option>
                </select>
              </R>
              <R l="Langue">
                <select value={s.app.lg} onChange={(e) => upd('app', 'lg', e.target.value)} className={`px-3 py-1.5 rounded-lg border text-sm ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-300'}`}>
                  <option>FR</option><option>EN</option><option>Dioula</option><option>Baoulé</option>
                </select>
              </R>
              <R l="Réduire animations"><T ch={s.app.anim} on={() => upd('app', 'anim')} /></R>
              <R l="Contraste élevé"><T ch={s.app.hc} on={() => upd('app', 'hc')} /></R>
            </div>
          )}
          {as === 'h' && (
            <div className="space-y-3">
              <h3 className="font-bold text-lg flex items-center gap-2"><HeartPulse className="w-5 h-5 text-pink-600" /> Préférences santé</h3>
              {[{k:'w',l:'Poids',o:['kg','lbs']},{k:'t',l:'Température',o:['C','F']},{k:'bp',l:'Tension',o:['mmHg','kPa']},{k:'g',l:'Glycémie',o:['g/L','mmol/L']}].map((u, i) => (
                <R key={i} l={u.l}>
                  <div className="flex gap-1 p-1 rounded-lg bg-slate-200">
                    {u.o.map(o => (
                      <button key={o} onClick={() => upd('h', u.k, o)} className={`px-3 py-1 rounded-md text-xs font-bold ${s.h[u.k] === o ? 'bg-white shadow' : ''}`}>{o}</button>
                    ))}
                  </div>
                </R>
              ))}
            </div>
          )}
          {as === 'data' && (
            <div className="space-y-3">
              <h3 className="font-bold text-lg flex items-center gap-2"><Database className="w-5 h-5 text-amber-600" /> Données</h3>
              {[
                { I: FileDown, l: 'Exporter mes données', d: 'PDF + JSON', c: 'blue' },
                { I: HardDrive, l: 'Espace utilisé', d: '2,3 Mo • 124 docs', c: 'purple' },
                { I: Wifi, l: 'Synchronisation', d: 'Il y a 2 min', c: 'emerald' }
              ].map((b, i) => (
                <button key={i} className={`w-full p-4 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'} flex items-center gap-3 text-left`}>
                  <b.I className={`w-5 h-5 text-${b.c}-600`} />
                  <div className="flex-1"><p className="font-semibold text-sm">{b.l}</p><p className={`text-xs ${sub}`}>{b.d}</p></div>
                </button>
              ))}
              <div className="p-4 rounded-xl border-2 border-red-200 bg-red-50">
                <p className="font-bold text-sm text-red-900">Zone dangereuse</p>
                <div className="flex gap-2 mt-3">
                  <button className="flex-1 px-3 py-2 rounded-lg bg-white border-2 border-red-300 text-red-700 text-xs font-bold">Réinitialiser</button>
                  <button className="flex-1 px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-bold">Supprimer compte</button>
                </div>
              </div>
            </div>
          )}
          {as === 'help' && (
            <div className="space-y-3">
              <h3 className="font-bold text-lg flex items-center gap-2"><HelpCircle className="w-5 h-5 text-cyan-600" /> Aide & Support</h3>
              {[
                { I: BookOpen, l: 'Guide d\'utilisation', d: 'Découvrez NOVA' },
                { I: MessageCircle, l: 'Chat support', d: '24h/24, 7j/7' },
                { I: Phone, l: 'Hotline urgence', d: '+225 27 21 25 25 25' },
                { I: Mail, l: 'Nous écrire', d: 'support@nova-sante.ci' }
              ].map((h, i) => (
                <button key={i} className={`w-full p-4 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'} flex items-center gap-3 text-left`}>
                  <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center"><h.I className="w-5 h-5 text-cyan-600" /></div>
                  <div className="flex-1"><p className="font-semibold text-sm">{h.l}</p><p className={`text-xs ${sub}`}>{h.d}</p></div>
                </button>
              ))}
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'} text-center`}>
                <p className="text-xs font-bold">NOVA v2.4.0</p>
                <p className={`text-[10px] ${sub} mt-1`}>© 2026 NOVA Health • Côte d'Ivoire 🇨🇮</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============== DOCTOR PAGES ============== */
function DoctorPages({ page, onRx, onCons, onCP, setShowVid, card, sub, border, darkMode }) {
  const p = { card, sub, border, darkMode };
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><h2 className="text-2xl font-bold">Cockpit Clinique</h2><p className={`text-sm ${sub}`}>Dr. Adjoua Koné • Cardiologie • CHU Treichville</p></div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={onCP} className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'} border px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2`}>
            <UserPlus className="w-4 h-4" /> Nouveau patient
          </button>
          <button onClick={onCons} className="bg-red-600 text-white px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 hover:bg-red-700 shadow-lg">
            <Plus className="w-4 h-4" /> Nouvelle consultation
          </button>
        </div>
      </div>
      {page === 'dashboard' && <DDash {...p} />}
      {page === 'patients' && <DPatients onRx={onRx} onCons={onCons} {...p} />}
      {page === 'consultations' && <DCons {...p} />}
      {page === 'stats' && <DStats {...p} />}
      {page === 'messages' && <PMsg setShowVid={setShowVid} {...p} />}
      {page === 'documents' && <PDocs {...p} />}
      {page === 'profile' && <DProfile {...p} />}
      {page === 'settings' && <SettingsPage {...p} />}
    </div>
  );
}

function DDash({ card, sub, darkMode }) {
  const q = [
    { n: 'Kouamé Bamba', cmu: 'CI-2024-0847', t: '09:00', s: 'En consultation', a: 52, al: true },
    { n: 'Aminata Diallo', cmu: 'CI-2024-1245', t: '09:30', s: 'En attente', a: 34, al: false },
    { n: 'Yao Brou', cmu: 'CI-2024-3389', t: '10:00', s: 'En attente', a: 67, al: true },
    { n: 'Fatou Coulibaly', cmu: 'CI-2024-5621', t: '10:30', s: 'En attente', a: 28, al: false }
  ];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {[
        { l: 'Patients aujourd\'hui', v: '12', s: '+3 vs hier', c: 'red', I: Users },
        { l: 'Temps moyen', v: '24min', s: 'Stable', c: 'blue', I: Clock },
        { l: 'Patients suivis', v: '348', s: '+12 ce mois', c: 'emerald', I: Heart },
        { l: 'Notifications', v: '5', s: '2 urgentes', c: 'amber', I: Bell }
      ].map((k, i) => (
        <div key={i} className={`${card} border rounded-2xl p-5`}>
          <div className={`w-10 h-10 rounded-lg bg-${k.c}-100 flex items-center justify-center mb-3`}><k.I className={`w-5 h-5 text-${k.c}-600`} /></div>
          <p className={`text-xs ${sub}`}>{k.l}</p>
          <p className="text-3xl font-bold mt-1">{k.v}</p>
          <p className={`text-xs mt-1 text-${k.c}-600 font-semibold`}>{k.s}</p>
        </div>
      ))}
      <div className={`lg:col-span-3 ${card} border rounded-2xl p-6`}>
        <div className="flex items-center justify-between mb-4">
          <div><h3 className="font-bold text-lg">File d'attente</h3><p className={`text-xs ${sub}`}>{q.length} patients</p></div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div><span className="text-xs font-semibold text-emerald-600">Live</span></div>
        </div>
        <div className="space-y-2">
          {q.map((p, i) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center font-bold text-sm">
                {p.n.split(' ').map(x => x[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2"><p className="font-semibold truncate">{p.n}</p>{p.al && <AlertTriangle className="w-4 h-4 text-red-600" />}</div>
                <p className={`text-xs ${sub}`}>{p.cmu} • {p.a} ans</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{p.t}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${p.s === 'En consultation' ? 'bg-red-100 text-red-700' : darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>{p.s}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3"><Brain className="w-5 h-5" /><h3 className="font-bold">IA Diagnostic</h3></div>
        <div className="space-y-2">
          {['Risque CV : K. Bamba', 'Suspicion diabète : F. Coulibaly', 'Interaction Rx : Y. Brou'].map((a, i) => (
            <div key={i} className="bg-white/10 backdrop-blur rounded-lg p-2 text-xs flex items-center gap-2">
              <AlertCircle className="w-3 h-3" /><span>{a}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DPatients({ onRx, onCons, card, sub, border, darkMode }) {
  const ps = [
    { n: 'Kouamé Bamba', cmu: 'CI-2024-0847', a: 52, al: true },
    { n: 'Aminata Diallo', cmu: 'CI-2024-1245', a: 34, al: false },
    { n: 'Yao Brou', cmu: 'CI-2024-3389', a: 67, al: true },
    { n: 'Fatou Coulibaly', cmu: 'CI-2024-5621', a: 28, al: false }
  ];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div className="lg:col-span-1">
        <div className={`${card} border rounded-2xl p-4`}>
          <div className="relative mb-3">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${sub}`} />
            <input type="text" placeholder="Rechercher..." className={`w-full pl-9 pr-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} />
          </div>
          <div className="space-y-1">
            {ps.map((p, i) => (
              <button key={i} className={`w-full text-left p-2 rounded-lg ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center font-bold text-xs">
                    {p.n.split(' ').map(x => x[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1"><p className="font-semibold text-sm truncate">{p.n}</p>{p.al && <AlertTriangle className="w-3 h-3 text-red-600" />}</div>
                    <p className={`text-[10px] ${sub}`}>{p.cmu}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="lg:col-span-3 space-y-4">
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-2xl p-4 flex items-center gap-3 shadow-xl">
          <ShieldAlert className="w-8 h-8 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-bold">⚠️ ALLERGIES SÉVÈRES</p>
            <p className="text-xs text-red-100">Pénicilline (anaphylaxie) • Arachides (modérée)</p>
          </div>
        </div>
        <div className={`${card} border rounded-2xl p-6`}>
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center text-2xl font-bold">KB</div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold">Kouamé Bamba</h3>
              <p className={`text-sm ${sub}`}>CI-2024-0847-3692</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                <span><strong>52 ans</strong> • M</span><span>Groupe: <strong className="text-red-600">O+</strong></span><span>78kg • 175cm</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={onCons} className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-1 hover:bg-red-700">
                <Plus className="w-4 h-4" /> Consulter
              </button>
              <button onClick={onRx} className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'} border px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-1`}>
                <Pill className="w-4 h-4" /> Prescrire
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Chart t="Tension" d={[120,125,130,128,122,119,121,125,132,128,124,120]} u="mmHg" col="#dc2626" {...{card, sub, darkMode}} />
          <Chart t="Glycémie" d={[1.1,1.05,1.08,1.0,0.98,1.02,0.97,0.95,0.99,0.96,0.95,0.93]} u="g/L" col="#2563eb" {...{card, sub, darkMode}} />
        </div>
      </div>
    </div>
  );
}

function Chart({ t, d, u, col, card, sub, darkMode }) {
  const mx = Math.max(...d), mn = Math.min(...d), r = mx - mn || 1;
  const pts = d.map((v, i) => `${(i/(d.length-1))*100},${100-((v-mn)/r)*70-15}`).join(' ');
  return (
    <div className={`${card} border rounded-2xl p-5`}>
      <div className="flex items-center justify-between mb-3"><h4 className="font-bold text-sm">{t}</h4><span className={`text-xs ${sub}`}>12 mesures</span></div>
      <p className="text-2xl font-bold mb-2" style={{ color: col }}>{d[d.length-1]} <span className={`text-xs font-normal ${sub}`}>{u}</span></p>
      <div className="h-32">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
          <polyline points={pts} fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

function DCons({ card, sub, darkMode }) {
  return (
    <div className={`${card} border rounded-2xl p-6`}>
      <h3 className="font-bold text-lg mb-4">Consultations récentes</h3>
      <div className="space-y-3">
        {[
          { d: 'Aujourd\'hui 09:15', p: 'Kouamé Bamba', di: 'HTA stade 1', s: 'En cours' },
          { d: 'Hier 14:30', p: 'Aminata Diallo', di: 'Bilan annuel', s: 'Terminée' },
          { d: 'Hier 10:00', p: 'Yao Brou', di: 'Suivi diabète', s: 'Terminée' }
        ].map((c, i) => (
          <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className={`w-2 h-12 rounded-full ${c.s === 'En cours' ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
            <div className="flex-1"><p className="font-semibold">{c.p}</p><p className={`text-xs ${sub}`}>{c.di}</p></div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${c.s === 'En cours' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{c.s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DStats({ card, sub, darkMode }) {
  const ps = [{n:'Hypertension',c:87,col:'bg-red-500'},{n:'Diabète T2',c:64,col:'bg-blue-500'},{n:'Paludisme',c:42,col:'bg-amber-500'},{n:'Asthme',c:28,col:'bg-purple-500'}];
  const mx = Math.max(...ps.map(p => p.c));
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className={`${card} border rounded-2xl p-6`}>
        <h3 className="font-bold mb-4">Pathologies traitées</h3>
        <div className="space-y-3">
          {ps.map((p, i) => (
            <div key={i}>
              <div className="flex justify-between text-xs mb-1"><span className="font-semibold">{p.n}</span><span className={sub}>{p.c}</span></div>
              <div className={`h-3 rounded-full ${darkMode ? 'bg-slate-800' : 'bg-slate-200'} overflow-hidden`}>
                <div className={`h-full ${p.col}`} style={{ width: `${(p.c / mx) * 100}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className={`${card} border rounded-2xl p-6`}>
        <h3 className="font-bold mb-4">Performance</h3>
        <div className="grid grid-cols-2 gap-4">
          {[{l:'Consultations',v:'256',c:'emerald'},{l:'Patients suivis',v:'348',c:'blue'},{l:'Taux suivi',v:'92%',c:'amber'},{l:'Satisfaction',v:'4.8/5',c:'red'}].map((s, i) => (
            <div key={i} className={`p-4 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-white'} border ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <p className={`text-xs ${sub}`}>{s.l}</p>
              <p className={`text-2xl font-bold mt-1 text-${s.c}-600`}>{s.v}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DProfile({ card, sub, border, darkMode }) {
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-6 text-white flex items-center gap-4">
        <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl font-bold border-2 border-white/30">AK</div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">Dr. Adjoua Koné</h2>
          <p className="text-emerald-100 text-sm">Cardiologue • CHU Treichville</p>
          <span className="px-2 py-1 rounded-full bg-white/20 text-xs font-semibold mt-3 inline-block">N° Ordre: CI-CARD-2018-0247</span>
        </div>
      </div>
      <div className={`${card} border rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4`}>
        {[
          { l: 'Spécialité', v: 'Cardiologie' },
          { l: 'Établissement', v: 'CHU Treichville' },
          { l: 'Téléphone', v: '+225 01 02 03 04 05' },
          { l: 'Email', v: 'a.kone@chu-treichville.ci' },
          { l: 'Diplôme', v: 'Université FHB' },
          { l: 'Expérience', v: '15 ans' }
        ].map((f, i) => (
          <div key={i}>
            <label className={`text-[11px] font-bold uppercase tracking-wider ${sub}`}>{f.l}</label>
            <p className="mt-1.5 text-sm font-semibold">{f.v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============== ADMIN PAGES ============== */
function AdminPages({ page, onCP, onCD, card, sub, border, darkMode }) {
  const p = { card, sub, border, darkMode };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className="text-2xl font-bold">Tour de Contrôle</h2><p className={`text-sm ${sub}`}>Gouvernance & Audit • NOVA Côte d'Ivoire</p></div>
        <div className="flex gap-2">
          <button onClick={onCD} className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'} border px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2`}>
            <Stethoscope className="w-4 h-4" /> Nouveau médecin
          </button>
          <button onClick={onCP} className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-red-700">
            <UserPlus className="w-4 h-4" /> Nouveau patient
          </button>
        </div>
      </div>
      {page === 'dashboard' && <ADash {...p} />}
      {page === 'audit' && <AAudit {...p} />}
      {page === 'users' && <AUsers onCP={onCP} onCD={onCD} {...p} />}
      {page === 'system' && <ASystem {...p} />}
      {page === 'settings' && <SettingsPage {...p} />}
    </div>
  );
}

function ADash({ card, sub, darkMode }) {
  const rs = [
    { n: 'Abidjan', u: 48720, x: 35, y: 75, s: 24 },
    { n: 'Bouaké', u: 12340, x: 45, y: 50, s: 16 },
    { n: 'Yamoussoukro', u: 8920, x: 40, y: 60, s: 14 },
    { n: 'San-Pédro', u: 6230, x: 25, y: 85, s: 12 },
    { n: 'Korhogo', u: 4870, x: 42, y: 25, s: 10 }
  ];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {[
        { l: 'Patients', v: '124,532', s: '+2,341 ce mois', c: 'red', I: Users },
        { l: 'Médecins', v: '3,247', s: '+89 ce mois', c: 'blue', I: Stethoscope },
        { l: 'Consult. aujourd\'hui', v: '8,924', s: 'Pic à 14h', c: 'emerald', I: Activity },
        { l: 'Alertes', v: '7', s: '2 critiques', c: 'amber', I: AlertTriangle }
      ].map((k, i) => (
        <div key={i} className={`${card} border rounded-2xl p-5`}>
          <div className={`w-10 h-10 rounded-lg bg-${k.c}-100 flex items-center justify-center mb-3`}><k.I className={`w-5 h-5 text-${k.c}-600`} /></div>
          <p className={`text-xs ${sub}`}>{k.l}</p>
          <p className="text-3xl font-bold mt-1">{k.v}</p>
          <p className={`text-xs mt-1 text-${k.c}-600 font-semibold`}>{k.s}</p>
        </div>
      ))}
      <div className={`lg:col-span-2 ${card} border rounded-2xl p-6`}>
        <h3 className="font-bold mb-2">Densité utilisateurs • CI</h3>
        <div className={`relative aspect-[4/3] ${darkMode ? 'bg-slate-800' : 'bg-slate-100'} rounded-xl overflow-hidden`}>
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <path d="M 15 30 L 25 25 L 35 22 L 45 20 L 55 25 L 60 35 L 58 50 L 55 65 L 50 78 L 40 85 L 28 88 L 18 80 L 12 65 L 10 50 L 12 38 Z"
              fill={darkMode ? '#1e293b' : '#e2e8f0'} stroke={darkMode ? '#334155' : '#cbd5e1'} strokeWidth="0.5" />
            {rs.map((r, i) => (
              <g key={i}>
                <circle cx={r.x} cy={r.y} r={r.s / 2} fill="#dc2626" opacity="0.3" className="animate-pulse" />
                <circle cx={r.x} cy={r.y} r={r.s / 4} fill="#dc2626" />
                <text x={r.x} y={r.y - r.s / 2 - 1} textAnchor="middle" fill={darkMode ? '#f1f5f9' : '#0f172a'} fontSize="2.5" fontWeight="bold">{r.n}</text>
                <text x={r.x} y={r.y + 1} textAnchor="middle" fill="white" fontSize="2" fontWeight="bold">{(r.u / 1000).toFixed(0)}k</text>
              </g>
            ))}
          </svg>
        </div>
      </div>
      <div className={`lg:col-span-2 ${card} border rounded-2xl p-6`}>
        <h3 className="font-bold mb-2">Activité 24h</h3>
        <div className="h-64 flex items-end gap-1">
          {Array.from({ length: 24 }, (_, i) => {
            const p = i === 14 ? 1 : Math.abs(Math.sin(i / 3.8)) * 0.7 + 0.2;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className={`w-full rounded-t ${i === 14 ? 'bg-red-600' : i >= 8 && i <= 18 ? 'bg-red-400' : darkMode ? 'bg-slate-700' : 'bg-slate-300'}`}
                  style={{ height: `${p * 100}%`, minHeight: '4px' }}></div>
                {i % 4 === 0 && <span className={`text-[9px] ${sub}`}>{i}h</span>}
              </div>
            );
          })}
        </div>
      </div>
      <div className="lg:col-span-4 bg-gradient-to-r from-amber-500 to-red-600 text-white rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="w-8 h-8 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-bold text-lg">2 alertes critiques actives</h3>
            <div className="mt-2 space-y-1 text-sm">
              <p>• Tentative d'accès non autorisé • IP: 41.207.xxx.xxx • Il y a 12 min</p>
              <p>• Pic de charge serveur Abidjan • Latence +340ms • Il y a 25 min</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AAudit({ card, sub, darkMode }) {
  const ls = [
    { t: '28/04/2026 10:42:18', a: 'Dr. Adjoua Koné', ac: 'Accès dossier', tg: '#CI-2024-0847', cr: 'info' },
    { t: '28/04/2026 10:38:02', a: 'Dr. Yao Konan', ac: 'Prescription', tg: 'Amlodipine 5mg', cr: 'info' },
    { t: '28/04/2026 10:30:45', a: 'Admin', ac: 'Modif permissions', tg: 'user_id: 4521', cr: 'warning' },
    { t: '28/04/2026 10:25:11', a: 'IP: 41.207.xxx', ac: 'Tentative auth échouée', tg: 'admin@nova.ci', cr: 'critical' },
    { t: '28/04/2026 09:58:14', a: 'IP: 41.207.xxx', ac: 'Multiples tentatives', tg: '5 comptes', cr: 'critical' }
  ];
  const cs = {
    info: { bg: 'bg-blue-100', t: 'text-blue-700', d: 'bg-blue-500' },
    warning: { bg: 'bg-amber-100', t: 'text-amber-700', d: 'bg-amber-500' },
    critical: { bg: 'bg-red-100', t: 'text-red-700', d: 'bg-red-500' }
  };
  return (
    <div className={`${card} border rounded-2xl p-6`}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div><h3 className="font-bold text-lg">Journal d'Audit</h3><p className={`text-xs ${sub}`}>Conforme RGPD</p></div>
        <button className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold flex items-center gap-1">
          <FileDown className="w-3 h-3" /> Export
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={`text-xs ${sub} border-b ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <th className="text-left p-2">Niveau</th><th className="text-left p-2">Horodatage</th>
              <th className="text-left p-2">Acteur</th><th className="text-left p-2">Action</th><th className="text-left p-2">Cible</th>
            </tr>
          </thead>
          <tbody>
            {ls.map((l, i) => {
              const c = cs[l.cr];
              return (
                <tr key={i} className={`border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                  <td className="p-2">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${c.bg} ${c.t}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${c.d}`}></span>
                      {l.cr.toUpperCase()}
                    </span>
                  </td>
                  <td className={`p-2 text-xs font-mono ${sub}`}>{l.t}</td>
                  <td className="p-2 font-semibold text-xs">{l.a}</td>
                  <td className="p-2 text-xs">{l.ac}</td>
                  <td className={`p-2 text-xs font-mono ${sub}`}>{l.tg}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AUsers({ onCP, onCD, card, sub, darkMode }) {
  const [tab, setTab] = useState('doctors');
  const ds = [
    { n: 'Dr. Adjoua Koné', sp: 'Cardiologie', p: '+225 01 02 03 04 05', s: 'Actif' },
    { n: 'Dr. Yao Konan', sp: 'Médecine générale', p: '+225 01 23 45 67 89', s: 'Actif' },
    { n: 'Dr. Mariam Bamba', sp: 'Endocrinologie', p: '+225 01 11 22 33 44', s: 'Actif' },
    { n: 'Dr. Koffi N\'Guessan', sp: 'ORL', p: '+225 01 55 66 77 88', s: 'Suspendu' }
  ];
  const ps = [
    { n: 'Kouamé Bamba', cmu: 'CI-2024-0847', p: '+225 07 89 45 23 11', a: 52 },
    { n: 'Aminata Diallo', cmu: 'CI-2024-1245', p: '+225 05 12 34 56 78', a: 34 },
    { n: 'Yao Brou', cmu: 'CI-2024-3389', p: '+225 07 23 45 67 89', a: 67 }
  ];
  const list = tab === 'doctors' ? ds : ps;
  return (
    <div className={`${card} border rounded-2xl p-6`}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className={`flex gap-1 p-1 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
          <button onClick={() => setTab('doctors')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${tab === 'doctors' ? 'bg-white text-slate-900 shadow' : sub}`}>
            <Stethoscope className="w-4 h-4" /> Médecins ({ds.length})
          </button>
          <button onClick={() => setTab('patients')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${tab === 'patients' ? 'bg-white text-slate-900 shadow' : sub}`}>
            <User className="w-4 h-4" /> Patients ({ps.length})
          </button>
        </div>
        <button onClick={tab === 'doctors' ? onCD : onCP} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold flex items-center gap-1">
          <Plus className="w-3 h-3" /> Nouveau {tab === 'doctors' ? 'médecin' : 'patient'}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={`text-xs ${sub} border-b ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <th className="text-left p-3">{tab === 'doctors' ? 'Médecin' : 'Patient'}</th>
              <th className="text-left p-3">{tab === 'doctors' ? 'Spécialité' : 'CMU'}</th>
              <th className="text-left p-3">Téléphone</th>
              <th className="text-left p-3">Statut</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((u, i) => (
              <tr key={i} className={`border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center font-bold text-xs">
                      {u.n.split(' ').slice(-2).map(x => x[0]).join('')}
                    </div>
                    <p className="font-semibold text-xs">{u.n}</p>
                  </div>
                </td>
                <td className={`p-3 text-xs ${sub}`}>{tab === 'doctors' ? u.sp : u.cmu}</td>
                <td className={`p-3 text-xs font-mono ${sub}`}>{u.p}</td>
                <td className="p-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${tab === 'doctors' ? (u.s === 'Actif' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700') : 'bg-blue-100 text-blue-700'}`}>
                    {tab === 'doctors' ? u.s : `${u.a} ans`}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <button className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                    <MoreVertical className="w-4 h-4" />
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

function ASystem({ card, sub, darkMode }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {[
        { l: 'Uptime', v: '99.97%', s: '30 jours', I: ServerCog, c: 'emerald' },
        { l: 'Latence API', v: '142ms', s: 'Moyenne', I: Zap, c: 'blue' },
        { l: 'Stockage', v: '67%', s: '4.2 / 6.3 TB', I: Database, c: 'amber' }
      ].map((s, i) => (
        <div key={i} className={`${card} border rounded-2xl p-6`}>
          <div className={`w-10 h-10 rounded-lg bg-${s.c}-100 flex items-center justify-center mb-3`}><s.I className={`w-5 h-5 text-${s.c}-600`} /></div>
          <p className={`text-xs ${sub}`}>{s.l}</p>
          <p className="text-3xl font-bold mt-1">{s.v}</p>
          <p className={`text-xs ${sub} mt-1`}>{s.s}</p>
        </div>
      ))}
      <div className={`lg:col-span-3 ${card} border rounded-2xl p-6`}>
        <h3 className="font-bold mb-4">Conformité & Sécurité</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { l: 'Chiffrement AES-256', s: true }, { l: 'Sauvegardes quotidiennes', s: true },
            { l: 'Conformité RGPD', s: true }, { l: 'Loi ivoirienne', s: true },
            { l: 'Audit ISO 27001', s: true }, { l: 'Plan de continuité', s: false }
          ].map((c, i) => (
            <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <span className="text-sm">{c.l}</span>
              {c.s ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-amber-500" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============== MODALS ============== */
function QRModal({ onClose }) {
  const cells = [];
  for (let i = 0; i < 25; i++) for (let j = 0; j < 25; j++) {
    const isC = (i < 7 && j < 7) || (i < 7 && j > 17) || (i > 17 && j < 7);
    const cI = (i >= 1 && i <= 5 && j >= 1 && j <= 5) || (i >= 1 && i <= 5 && j >= 19 && j <= 23) || (i >= 19 && i <= 23 && j >= 1 && j <= 5);
    const cC = (i >= 2 && i <= 4 && j >= 2 && j <= 4) || (i >= 2 && i <= 4 && j >= 20 && j <= 22) || (i >= 20 && i <= 22 && j >= 2 && j <= 4);
    if ((isC && !cI) || cC || (!isC && Math.random() > 0.55)) cells.push(<rect key={`${i}-${j}`} x={i*4} y={j*4} width="4" height="4" fill="#000" />);
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><Siren className="w-5 h-5 text-red-600" /><h3 className="font-bold text-slate-900">Pass Santé d'Urgence</h3></div>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-2xl p-6 text-white">
          <p className="text-xs text-red-100">URGENCE MÉDICALE</p>
          <h4 className="text-2xl font-bold mt-1">Kouamé Bamba</h4>
          <p className="text-xs text-red-100">CI-2024-0847-3692</p>
          <div className="bg-white rounded-xl p-4 my-4 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-40 h-40">{cells}</svg>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-white/10 backdrop-blur rounded-lg p-3"><p className="text-[10px] text-red-100">GROUPE</p><p className="text-xl font-bold">O+</p></div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-3"><p className="text-[10px] text-red-100">ÂGE</p><p className="text-xl font-bold">52 ans</p></div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-3 mt-3">
            <p className="text-[10px] text-red-100 mb-1">⚠️ ALLERGIES</p>
            <p className="text-sm font-semibold">Pénicilline, Arachides</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AyaChat({ onClose }) {
  const [ms, setMs] = useState([{ f: 'a', t: "Bonjour ! Je suis Aya. Comment vous sentez-vous ?" }]);
  const [inp, setInp] = useState('');
  const send = () => {
    if (!inp.trim()) return;
    setMs([...ms, { f: 'u', t: inp }]);
    setInp('');
    setTimeout(() => {
      const r = ["Pouvez-vous décrire l'intensité sur 10 ?", "Symptômes notés. Consultez sous 24-48h.", "Avez-vous pris vos médicaments ?"];
      setMs(p => [...p, { f: 'a', t: r[Math.floor(Math.random() * r.length)] }]);
    }, 500);
  };
  return (
    <div className="fixed bottom-6 right-6 w-full max-w-sm h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-50">
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4 rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center"><Bot className="w-5 h-5" /></div>
          <div><h4 className="font-bold">Aya</h4><p className="text-[10px] text-red-100">Assistante IA Santé</p></div>
        </div>
        <button onClick={onClose}><X className="w-5 h-5" /></button>
      </div>
      <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-slate-50">
        {ms.map((m, i) => (
          <div key={i} className={`flex ${m.f === 'u' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${m.f === 'u' ? 'bg-red-600 text-white' : 'bg-white text-slate-900 shadow-sm border border-slate-100'}`}>
              {m.t}
            </div>
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-slate-200 flex gap-2">
        <input type="text" value={inp} onChange={(e) => setInp(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Décrivez vos symptômes..." className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-900" />
        <button onClick={send} className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center hover:bg-red-700"><Send className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

function VideoModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
      <div className="flex-1 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center">
          <div className="text-center">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center text-4xl font-bold mx-auto mb-4 shadow-2xl">AT</div>
            <p className="text-white text-2xl font-bold">Dr. Aïcha Touré</p>
            <p className="text-slate-400 text-sm mt-2">Cardiologie • CHU Treichville</p>
            <div className="flex items-center gap-2 justify-center mt-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-emerald-400 text-xs font-bold">EN APPEL • 03:24</span>
            </div>
          </div>
        </div>
        <div className="absolute top-4 right-4 w-32 h-44 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl border-2 border-white/20 flex items-center justify-center shadow-2xl">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center font-bold text-sm mx-auto mb-2">KB</div>
            <p className="text-white text-xs font-semibold">Vous</p>
          </div>
        </div>
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur text-white text-xs font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> HD • Sécurisé
          </span>
        </div>
      </div>
      <div className="bg-slate-900 p-6 flex items-center justify-center gap-4">
        <button className="w-14 h-14 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center"><Mic className="w-6 h-6" /></button>
        <button className="w-14 h-14 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center"><Video className="w-6 h-6" /></button>
        <button onClick={onClose} className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg shadow-red-600/40">
          <Phone className="w-7 h-7 rotate-[135deg]" />
        </button>
        <button className="w-14 h-14 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center"><MessageCircle className="w-6 h-6" /></button>
      </div>
    </div>
  );
}

function RxModal({ onClose, darkMode, sub, border }) {
  const [ms, setMs] = useState([{ id: 1, n: 'Amlodipine', d: '5mg', f: '1x/j', du: '30j' }]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className={`${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className={`p-6 border-b ${border} flex items-center justify-between`}>
          <div className="flex items-center gap-2"><Pill className="w-5 h-5 text-red-600" /><h3 className="font-bold">Nouvelle prescription</h3></div>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="p-3 rounded-lg bg-red-50 border-red-200 border flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <p className="text-xs text-red-700 font-semibold">Patient allergique à la pénicilline ⚠️</p>
          </div>
          <div className="space-y-2">
            {ms.map((m, i) => (
              <div key={i} className={`p-3 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} grid grid-cols-1 md:grid-cols-4 gap-2`}>
                <input type="text" defaultValue={m.n} placeholder="Nom" className={`px-2 py-1.5 rounded border text-sm ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`} />
                <input type="text" defaultValue={m.d} placeholder="Dose" className={`px-2 py-1.5 rounded border text-sm ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`} />
                <input type="text" defaultValue={m.f} placeholder="Fréq" className={`px-2 py-1.5 rounded border text-sm ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`} />
                <input type="text" defaultValue={m.du} placeholder="Durée" className={`px-2 py-1.5 rounded border text-sm ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`} />
              </div>
            ))}
          </div>
          <button onClick={() => setMs([...ms, { id: Date.now(), n: '', d: '', f: '', du: '' }])} className={`w-full py-2 rounded-lg border-2 border-dashed text-sm font-semibold ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>
            <Plus className="w-4 h-4 inline mr-1" /> Ajouter
          </button>
        </div>
        <div className={`p-6 border-t ${border} flex gap-2`}>
          <button onClick={onClose} className={`flex-1 px-4 py-2 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-white border'} font-semibold text-sm`}>Annuler</button>
          <button className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-semibold text-sm flex items-center justify-center gap-1 hover:bg-red-700">
            <FileDown className="w-4 h-4" /> Émettre
          </button>
        </div>
      </div>
    </div>
  );
}

function ConsModal({ onClose, darkMode, sub, border }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className={`${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className={`p-6 border-b ${border} flex items-center justify-between`}>
          <div className="flex items-center gap-2"><ClipboardList className="w-5 h-5 text-red-600" /><h3 className="font-bold">Module de consultation</h3></div>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className={`text-xs font-semibold ${sub}`}>Motif</label>
            <input type="text" placeholder="Suivi tensionnel" className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} />
          </div>
          <div>
            <label className={`text-xs font-semibold ${sub}`}>Observations</label>
            <textarea rows={3} placeholder="Symptômes..." className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} />
          </div>
        </div>
        <div className={`p-6 border-t ${border} flex gap-2`}>
          <button onClick={onClose} className={`flex-1 px-4 py-2 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-white border'} font-semibold text-sm`}>Annuler</button>
          <button className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-semibold text-sm flex items-center justify-center gap-1 hover:bg-red-700">
            <Save className="w-4 h-4" /> Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

function CreatePatientModal({ onClose, darkMode, sub, border }) {
  const [step, setStep] = useState(1);
  const [d, setD] = useState({ fn: '', ln: '', p: '', cmu: '', sex: 'M', bd: '', bt: 'O+', addr: '', city: 'Abidjan' });
  const next = () => step < 3 ? setStep(step + 1) : onClose();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className={`${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className={`p-6 border-b ${border} flex items-center justify-between`}>
          <div>
            <div className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-red-600" /><h3 className="font-bold">Nouveau patient</h3></div>
            <p className={`text-xs ${sub} mt-1`}>Étape {step}/3</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 pt-4">
          <div className={`h-1 rounded-full ${darkMode ? 'bg-slate-800' : 'bg-slate-200'} overflow-hidden`}>
            <div className="h-full bg-gradient-to-r from-red-600 to-red-700" style={{ width: `${(step / 3) * 100}%` }}></div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {step === 1 && (
            <>
              <h4 className="font-bold">Identité</h4>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={`text-xs ${sub}`}>Prénom *</label><input type="text" value={d.fn} onChange={(e) => setD({...d, fn: e.target.value})} className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} /></div>
                <div><label className={`text-xs ${sub}`}>Nom *</label><input type="text" value={d.ln} onChange={(e) => setD({...d, ln: e.target.value})} className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} /></div>
                <div><label className={`text-xs ${sub}`}>Date naissance *</label><input type="date" value={d.bd} onChange={(e) => setD({...d, bd: e.target.value})} className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} /></div>
                <div><label className={`text-xs ${sub}`}>Sexe *</label><select value={d.sex} onChange={(e) => setD({...d, sex: e.target.value})} className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}><option value="M">Masculin</option><option value="F">Féminin</option></select></div>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <h4 className="font-bold">Contact</h4>
              <div>
                <label className={`text-xs ${sub}`}>Téléphone *</label>
                <div className={`mt-1 flex items-center gap-2 p-2 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}>
                  <span className="text-xs font-bold pr-2 border-r">🇨🇮 +225</span>
                  <input type="tel" value={d.p} onChange={(e) => setD({...d, p: e.target.value})} placeholder="07 89 45 23 11" className="flex-1 outline-none bg-transparent text-sm" />
                </div>
              </div>
              <div><label className={`text-xs ${sub}`}>Adresse</label><input type="text" value={d.addr} onChange={(e) => setD({...d, addr: e.target.value})} className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} /></div>
              <div><label className={`text-xs ${sub}`}>Ville</label><input type="text" value={d.city} onChange={(e) => setD({...d, city: e.target.value})} className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} /></div>
            </>
          )}
          {step === 3 && (
            <>
              <h4 className="font-bold">Données médicales</h4>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={`text-xs ${sub}`}>N° CMU</label><input type="text" value={d.cmu} onChange={(e) => setD({...d, cmu: e.target.value})} placeholder="CI-2026-XXXX" className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} /></div>
                <div><label className={`text-xs ${sub}`}>Groupe sanguin</label><select value={d.bt} onChange={(e) => setD({...d, bt: e.target.value})} className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}>{['O+','O-','A+','A-','B+','B-','AB+','AB-'].map(g => <option key={g}>{g}</option>)}</select></div>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-900">Le patient recevra un SMS pour activer son compte avec le numéro fourni.</p>
              </div>
            </>
          )}
        </div>
        <div className={`p-6 border-t ${border} flex gap-2`}>
          {step > 1 && <button onClick={() => setStep(step - 1)} className={`flex-1 px-4 py-2 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-white border'} font-semibold text-sm`}>Précédent</button>}
          <button onClick={next} className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-semibold text-sm flex items-center justify-center gap-1 hover:bg-red-700">
            {step === 3 ? <><Save className="w-4 h-4" /> Créer</> : <>Suivant <ArrowRight className="w-4 h-4" /></>}
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateDoctorModal({ onClose, darkMode, sub, border }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className={`${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className={`p-6 border-b ${border} flex items-center justify-between`}>
          <div className="flex items-center gap-2"><Stethoscope className="w-5 h-5 text-emerald-600" /><h3 className="font-bold">Nouveau médecin</h3></div>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={`text-xs ${sub}`}>Prénom *</label><input type="text" className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} /></div>
            <div><label className={`text-xs ${sub}`}>Nom *</label><input type="text" className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} /></div>
            <div><label className={`text-xs ${sub}`}>N° Ordre *</label><input type="text" placeholder="CI-XXX-2024-0000" className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} /></div>
            <div><label className={`text-xs ${sub}`}>Spécialité *</label>
              <select className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}>
                <option>Médecine générale</option><option>Cardiologie</option><option>Endocrinologie</option><option>Pédiatrie</option><option>Gynécologie</option><option>ORL</option>
              </select>
            </div>
            <div className="col-span-2"><label className={`text-xs ${sub}`}>Établissement *</label><input type="text" placeholder="CHU Treichville" className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} /></div>
            <div className="col-span-2">
              <label className={`text-xs ${sub}`}>Téléphone *</label>
              <div className={`mt-1 flex items-center gap-2 p-2 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}>
                <span className="text-xs font-bold pr-2 border-r">🇨🇮 +225</span>
                <input type="tel" placeholder="01 02 03 04 05" className="flex-1 outline-none bg-transparent text-sm" />
              </div>
            </div>
            <div className="col-span-2"><label className={`text-xs ${sub}`}>Email *</label><input type="email" placeholder="medecin@chu.ci" className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} /></div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-900">Le N° d'Ordre sera vérifié auprès de l'Ordre des Médecins de Côte d'Ivoire.</p>
          </div>
        </div>
        <div className={`p-6 border-t ${border} flex gap-2`}>
          <button onClick={onClose} className={`flex-1 px-4 py-2 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-white border'} font-semibold text-sm`}>Annuler</button>
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold text-sm flex items-center justify-center gap-1 hover:bg-emerald-700">
            <Save className="w-4 h-4" /> Créer le compte
          </button>
        </div>
      </div>
    </div>
  );
}