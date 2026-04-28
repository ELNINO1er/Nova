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
import { PDocs, PMsg, SettingsPage } from '../patient/PatientPages.jsx';

/* ============== DOCTOR PAGES ============== */
export default function DoctorPages({ page, onRx, onCons, onCP, setShowVid, card, sub, border, darkMode }) {
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
