import React, { useState, useEffect, useRef } from 'react';
import {
  Activity, AlertCircle, AlertTriangle, ArrowRight, Award, BarChart3, Bell,
  Bot, Brain, Calendar, CalendarClock, Check, CheckCircle2, ChevronLeft,
  ChevronRight, ClipboardList, Clock, Droplet, Edit3, FileDown, FileText,
  Heart, HeartPulse, Home, HelpCircle, Microscope, MessageCircle,
  Moon, MoreVertical, Phone, Pill, Plus, Save, Search, Send, Settings,
  Shield, ShieldAlert, ShieldCheck, Star, Stethoscope, Sun, Syringe,
  Target, Thermometer, TrendingUp, Trash2, User, UserPlus, Users, Video,
  X, Zap, MapPin, Sparkles, Lock, Printer
} from 'lucide-react';
import { PDocs, PMsg, SettingsPage } from '../patient/PatientPages.jsx';
import { doctorApi } from '../api/doctorApi.js';

/* ════════════════════════════════════════════════════════════════
   DOCTOR PAGES — état + routage
   ════════════════════════════════════════════════════════════════ */
export default function DoctorPages({ page, setPage, onRx, onCP, setShowVid, card, sub, border, darkMode }) {
  const [apiData,    setApiData]    = useState({});
  const [apiLoading, setApiLoading] = useState({});
  const [notice,     setNotice]     = useState(null);

  const notify = (message, type = 'success') => {
    setNotice({ message, type });
    setTimeout(() => setNotice(null), 3500);
  };

  const loadPage = (pageKey, force = false) => {
    const loaders = {
      dashboard:      doctorApi.dashboard,
      patients:       doctorApi.patients,
      agenda:         doctorApi.appointments,
      consultations:  doctorApi.consultations,
      stats:          doctorApi.stats,
      profile:        doctorApi.profile,
      prescriptions:      doctorApi.prescriptions,
      'lab-requests':     doctorApi.labRequests,
      'chronic-patients': doctorApi.chronicPatients,
      alerts:             doctorApi.alerts,
      finances:           doctorApi.finances,
      reputation:         doctorApi.reputation,
      signature:          doctorApi.signature,
    };
    const load = loaders[pageKey];
    if (!load || (!force && apiData[pageKey])) return;
    setApiLoading(c => ({ ...c, [pageKey]: true }));
    load()
      .then(data => setApiData(c => ({ ...c, [pageKey]: data })))
      .catch(err  => notify(err.message, 'error'))
      .finally(() => setApiLoading(c => ({ ...c, [pageKey]: false })));
  };

  useEffect(() => { loadPage(page); }, [page]);

  const p = { card, sub, border, darkMode, notify, setPage, setShowVid };

  const doctorName = apiData.dashboard?.doctor
    ? `Dr. ${apiData.dashboard.doctor.firstName} ${apiData.dashboard.doctor.lastName}`
    : 'Dr. Aïcha Touré';
  const doctorSpec = apiData.dashboard?.doctor?.specialty || 'Cardiologie';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Cockpit Clinique</h2>
          <p className={`text-sm ${sub}`}>{doctorName} • {doctorSpec}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={onCP}
            className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'} border px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2`}>
            <UserPlus className="w-4 h-4" /> Nouveau patient
          </button>
          <button onClick={() => setPage('consultations')}
            className="bg-red-600 text-white px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 hover:bg-red-700 shadow-lg shadow-red-600/20">
            <Plus className="w-4 h-4" /> Nouvelle consultation
          </button>
        </div>
      </div>

      {/* Toast */}
      {notice && (
        <div className={`fixed right-5 top-20 z-[70] rounded-xl border px-4 py-3 text-xs font-bold shadow-xl transition-all
          ${notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
          {notice.message}
        </div>
      )}

      {page === 'dashboard'     && <DDash     data={apiData.dashboard}     loading={apiLoading.dashboard}     {...p} />}
      {page === 'patients'      && <DPatients data={apiData.patients}      loading={apiLoading.patients}      onReload={() => loadPage('patients', true)} {...p} />}
      {page === 'agenda'        && <DAgenda   data={apiData.agenda}        loading={apiLoading.agenda}        onReload={() => loadPage('agenda', true)}   {...p} />}
      {page === 'consultations' && <DCons     data={apiData.consultations} loading={apiLoading.consultations} onReload={() => loadPage('consultations', true)} patientsData={apiData.patients} loadPatients={() => loadPage('patients')} {...p} />}
      {page === 'stats'         && <DStats    data={apiData.stats}         loading={apiLoading.stats}         {...p} />}
      {page === 'messages'      && <PMsg setShowVid={setShowVid} {...p} />}
      {page === 'documents'     && <PDocs {...p} />}
      {page === 'profile'       && <DProfile      data={apiData.profile}           loading={apiLoading.profile}           {...p} />}
      {page === 'prescriptions' && <DPrescriptions data={apiData.prescriptions}    loading={apiLoading.prescriptions}    onReload={() => loadPage('prescriptions', true)} patientsData={apiData.patients} loadPatients={() => loadPage('patients')} {...p} />}
      {page === 'lab-requests'       && <DLabRequests     data={apiData['lab-requests']}       loading={apiLoading['lab-requests']}      onReload={() => loadPage('lab-requests', true)}      patientsData={apiData.patients} loadPatients={() => loadPage('patients')} {...p} />}
      {page === 'chronic-patients'   && <DSuiviChroniques data={apiData['chronic-patients']}    loading={apiLoading['chronic-patients']}  onReload={() => loadPage('chronic-patients', true)} {...p} />}
      {page === 'urgences'           && <DUrgences        data={apiData.alerts}                 loading={apiLoading.alerts}               onReload={() => loadPage('alerts', true)}           patientsData={apiData.patients} loadPatients={() => loadPage('patients')} {...p} />}
      {page === 'assistant-ia'       && <DAssistantIA     chronicData={apiData['chronic-patients']} consultData={apiData.consultations} statsData={apiData.stats} loadChronic={() => loadPage('chronic-patients')} loadConsult={() => loadPage('consultations')} loadStats={() => loadPage('stats')} {...p} />}
      {page === 'finances'    && <DFinances   data={apiData.finances}   loading={apiLoading.finances}   {...p} />}
      {page === 'reputation'  && <DReputation data={apiData.reputation} loading={apiLoading.reputation} {...p} />}
      {page === 'signature'   && <DSignature  data={apiData.signature}  loading={apiLoading.signature}  onSave={() => loadPage('signature', true)} {...p} />}
      {page === 'settings'    && <SettingsPage {...p} />}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   DASHBOARD
   ════════════════════════════════════════════════════════════════ */
function DDash({ data, loading, setPage, card, sub, border, darkMode }) {
  if (loading || !data) return <DashSkeleton card={darkMode} />;

  const { todayAppointments = [], totalPatients = 0, monthConsultations = 0, avgRating = '—', recentConsultations = [] } = data;
  const waiting = todayAppointments.filter(a => a.status === 'confirmed').length;

  const kpis = [
    { l: 'Patients aujourd\'hui', v: todayAppointments.length, s: `${waiting} en attente`, c: 'red',     I: Users },
    { l: 'Consultations ce mois', v: monthConsultations,       s: 'Ce mois',               c: 'blue',    I: ClipboardList },
    { l: 'Patients suivis',       v: totalPatients,             s: 'Total',                 c: 'emerald', I: Heart },
    { l: 'Satisfaction',          v: avgRating,                 s: '/ 5 étoiles',           c: 'amber',   I: Star },
  ];

  const iaAlerts = [
    ...(todayAppointments.some(a => a.bloodType === 'O-') ? [{ t: 'Groupe rare O−', p: todayAppointments.find(a => a.bloodType === 'O-')?.patientName }] : []),
    { t: 'Tension critique possible', p: 'Kouamé Bamba' },
    { t: 'Suivi diabète requis', p: 'Kouamé Bamba' },
  ].slice(0, 3);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k, i) => (
          <div key={i} className={`${card} border rounded-2xl p-4`}>
            <div className={`w-9 h-9 rounded-lg bg-${k.c}-100 flex items-center justify-center mb-2`}>
              <k.I className={`w-4 h-4 text-${k.c}-600`} />
            </div>
            <p className={`text-xs ${sub}`}>{k.l}</p>
            <p className="text-2xl font-bold mt-0.5">{k.v}</p>
            <p className={`text-xs mt-0.5 text-${k.c}-600 font-semibold`}>{k.s}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* File d'attente */}
        <div className={`lg:col-span-2 ${card} border rounded-2xl p-5`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold">File d'attente — Aujourd'hui</h3>
              <p className={`text-xs ${sub}`}>{todayAppointments.length} rendez-vous</p>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-600">Live</span>
              <button onClick={() => setPage('agenda')} className={`ml-2 text-xs font-semibold text-red-600 flex items-center gap-1`}>
                Voir tout <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
          {todayAppointments.length === 0 ? (
            <div className={`py-8 flex flex-col items-center gap-2 ${sub}`}>
              <Calendar className="w-8 h-8" />
              <p className="text-sm">Aucun rendez-vous aujourd'hui</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayAppointments.map((a, i) => (
                <div key={a.id} className={`flex items-center gap-3 p-3 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {a.patientName.split(' ').map(x => x[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{a.patientName}</p>
                    <p className={`text-xs ${sub}`}>{a.cmuNumber} • {a.age} ans{a.mode === 'video' ? ' • Vidéo' : ''}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold">{new Date(a.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold
                      ${a.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : a.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {a.status === 'confirmed' ? 'Confirmé' : a.status === 'cancelled' ? 'Annulé' : 'Demandé'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* IA + consultations récentes */}
        <div className="space-y-3">
          <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3"><Brain className="w-4 h-4" /><h3 className="font-bold text-sm">Alertes IA</h3></div>
            <div className="space-y-2">
              {iaAlerts.map((a, i) => (
                <div key={i} className="bg-white/10 backdrop-blur rounded-lg p-2 text-xs flex items-start gap-2">
                  <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  <div><p className="font-semibold">{a.t}</p>{a.p && <p className="text-purple-200">{a.p}</p>}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={`${card} border rounded-2xl p-4`}>
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-red-600" /> Consultations récentes
            </h3>
            <div className="space-y-2">
              {recentConsultations.slice(0, 4).map(c => (
                <div key={c.id} className={`flex items-center gap-2 p-2 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <div className="w-1.5 h-8 rounded-full bg-emerald-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{c.patientName}</p>
                    <p className={`text-[10px] ${sub} truncate`}>{c.diagnosisMain || 'Bilan'}</p>
                  </div>
                  <p className={`text-[10px] ${sub}`}>{new Date(c.startedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</p>
                </div>
              ))}
              {recentConsultations.length === 0 && <p className={`text-xs ${sub} text-center py-2`}>Aucune consultation</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashSkeleton({ card: isDark }) {
  const cls = `animate-pulse ${isDark ? 'bg-slate-700' : 'bg-slate-200'} rounded-2xl`;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[0,1,2,3].map(i => <div key={i} className={`${cls} h-28`} />)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`lg:col-span-2 ${cls} h-64`} />
        <div className={`${cls} h-64`} />
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   PATIENTS
   ════════════════════════════════════════════════════════════════ */
function DPatients({ data, loading, onReload, setPage, card, sub, border, darkMode, notify }) {
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState(null);
  const [patFile,  setPatFile]  = useState(null);
  const [patLoading, setPatLoading] = useState(false);
  const [fileTab,  setFileTab]  = useState('profil');

  const patients = data || [];
  const filtered = patients.filter(p =>
    !search ||
    `${p.firstName} ${p.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    (p.cmuNumber || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.phone || '').includes(search)
  );

  const openFile = async (pat) => {
    setSelected(pat);
    setPatFile(null);
    setPatLoading(true);
    try {
      const full = await doctorApi.patient(pat.id);
      setPatFile(full);
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setPatLoading(false);
    }
  };

  const fileTabs = [
    { id: 'profil',  label: 'Profil',        icon: User },
    { id: 'constantes', label: 'Constantes', icon: Activity },
    { id: 'medical', label: 'Dossier médical', icon: HeartPulse },
    { id: 'consult', label: 'Consultations', icon: ClipboardList },
    { id: 'labo',    label: 'Labo / Rx',     icon: Microscope },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {/* Colonne gauche : recherche + liste */}
      <div className="lg:col-span-1">
        <div className={`${card} border rounded-2xl p-4 space-y-3`}>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <Search className={`w-4 h-4 ${sub} flex-shrink-0`} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nom, téléphone, CMU..."
              className="flex-1 bg-transparent outline-none text-sm" />
            {search && <button onClick={() => setSearch('')}><X className={`w-3 h-3 ${sub}`} /></button>}
          </div>
          {loading ? (
            <div className="space-y-2">{[0,1,2,3].map(i => <div key={i} className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-12 rounded-xl`} />)}</div>
          ) : filtered.length === 0 ? (
            <p className={`text-xs ${sub} text-center py-4`}>Aucun patient trouvé</p>
          ) : (
            <div className="space-y-1">
              {filtered.map(p => (
                <button key={p.id} onClick={() => openFile(p)}
                  className={`w-full text-left p-2.5 rounded-xl flex items-center gap-2 transition-all
                    ${selected?.id === p.id ? 'bg-red-600 text-white' : (darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100')}`}>
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-red-700 flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
                    {p.firstName[0]}{p.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{p.firstName} {p.lastName}</p>
                    <p className={`text-[10px] ${selected?.id === p.id ? 'text-red-100' : sub} truncate`}>{p.cmuNumber} • {p.age} ans</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Colonne droite : fiche patient */}
      <div className="lg:col-span-3">
        {!selected ? (
          <div className={`${card} border rounded-2xl p-12 flex flex-col items-center gap-3 text-center`}>
            <User className={`w-12 h-12 ${sub}`} />
            <p className="font-semibold">Sélectionnez un patient</p>
            <p className={`text-sm ${sub}`}>La fiche complète s'affichera ici</p>
          </div>
        ) : patLoading ? (
          <div className={`${card} border rounded-2xl p-6 space-y-3`}>
            {[0,1,2].map(i => <div key={i} className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-16 rounded-xl`} />)}
          </div>
        ) : patFile ? (
          <div className="space-y-4">
            {/* Header patient */}
            <PatientHeader pat={patFile} card={card} sub={sub} border={border} darkMode={darkMode} onCons={() => setFileTab('consult')} />

            {/* Onglets */}
            <div className={`flex gap-1 p-1 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'} overflow-x-auto`}>
              {fileTabs.map(t => (
                <button key={t.id} onClick={() => setFileTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0
                    ${fileTab === t.id ? `bg-white shadow text-red-600 ${darkMode ? '!bg-slate-700' : ''}` : sub}`}>
                  <t.icon className="w-3 h-3" />{t.label}
                </button>
              ))}
            </div>

            {fileTab === 'profil'    && <PatientTabProfil    pat={patFile} card={card} sub={sub} border={border} darkMode={darkMode} />}
            {fileTab === 'constantes'&& <PatientTabConstantes pat={patFile} card={card} sub={sub} border={border} darkMode={darkMode} />}
            {fileTab === 'medical'   && <PatientTabMedical   pat={patFile} card={card} sub={sub} border={border} darkMode={darkMode} />}
            {fileTab === 'consult'   && <PatientTabConsult   pat={patFile} card={card} sub={sub} border={border} darkMode={darkMode} />}
            {fileTab === 'labo'      && <PatientTabLabo      pat={patFile} card={card} sub={sub} border={border} darkMode={darkMode} />}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PatientHeader({ pat, card, sub, border, darkMode }) {
  const hasAllergy = pat.medicalProfile?.allergies?.length > 0;
  return (
    <div className="space-y-2">
      {hasAllergy && (
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-2xl p-3 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-bold text-sm">ALLERGIES</p>
            <p className="text-xs text-red-100">{pat.medicalProfile.allergies.join(' • ')}</p>
          </div>
        </div>
      )}
      <div className={`${card} border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4`}>
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center text-xl font-bold flex-shrink-0">
          {pat.firstName[0]}{pat.lastName[0]}
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold">{pat.firstName} {pat.lastName}</h3>
          <p className={`text-xs ${sub}`}>{pat.cmuNumber}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
            <span><strong>{pat.age} ans</strong> • {pat.sex === 'M' ? 'Homme' : 'Femme'}</span>
            <span>Groupe : <strong className="text-red-600">{pat.bloodType || '—'}</strong></span>
            {pat.weightKg && <span>{pat.weightKg} kg • {pat.heightCm} cm</span>}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {pat.phone && (
            <a href={`tel:${pat.phone}`} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold">
              <Phone className="w-3 h-3" /> Appeler
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function PatientTabProfil({ pat, card, sub, border, darkMode }) {
  const fields = [
    { l: 'Date de naissance', v: pat.birthDate ? new Date(pat.birthDate).toLocaleDateString('fr-FR') : '—' },
    { l: 'Sexe',              v: pat.sex === 'M' ? 'Masculin' : 'Féminin' },
    { l: 'Groupe sanguin',    v: pat.bloodType || '—' },
    { l: 'Téléphone',         v: pat.phone || '—' },
    { l: 'Email',             v: pat.email || '—' },
    { l: 'Adresse',           v: pat.address ? `${pat.address}, ${pat.city}` : '—' },
    { l: 'Poids',             v: pat.weightKg ? `${pat.weightKg} kg` : '—' },
    { l: 'Taille',            v: pat.heightCm ? `${pat.heightCm} cm` : '—' },
    { l: 'Contact urgence',   v: pat.emergencyName ? `${pat.emergencyName} — ${pat.emergencyPhone}` : '—' },
  ];
  return (
    <div className={`${card} border rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`}>
      {fields.map((f, i) => (
        <div key={i}>
          <p className={`text-[10px] font-bold uppercase tracking-wider ${sub}`}>{f.l}</p>
          <p className="text-sm font-semibold mt-1">{f.v}</p>
        </div>
      ))}
    </div>
  );
}

function PatientTabConstantes({ pat, card, sub, border, darkMode }) {
  const types = ['blood_pressure', 'blood_glucose', 'heart_rate', 'temperature'];
  const labels = { blood_pressure: 'Tension', blood_glucose: 'Glycémie', heart_rate: 'Fréq. cardiaque', temperature: 'Température' };
  const colors = { blood_pressure: '#dc2626', blood_glucose: '#2563eb', heart_rate: '#16a34a', temperature: '#d97706' };
  const units  = { blood_pressure: 'mmHg', blood_glucose: 'g/L', heart_rate: 'bpm', temperature: '°C' };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {types.map(type => {
        const data = (pat.vitals || []).filter(v => v.type === type).slice(0, 12).reverse();
        const last = data[data.length - 1];
        const vals = data.map(v => Number(String(v.value).split('/')[0])).filter(Boolean);
        const mx = Math.max(...vals, 1), mn = Math.min(...vals);
        const pts = vals.map((v, i) => `${(i / Math.max(vals.length - 1, 1)) * 96 + 2},${96 - ((v - mn) / (mx - mn || 1)) * 70 - 10}`).join(' ');
        return (
          <div key={type} className={`${card} border rounded-2xl p-4`}>
            <div className="flex items-center justify-between mb-2">
              <p className="font-bold text-sm">{labels[type]}</p>
              <span className={`text-xs ${sub}`}>{data.length} mesures</span>
            </div>
            <p className="text-2xl font-bold mb-2" style={{ color: colors[type] }}>
              {last?.value || '—'} <span className={`text-xs font-normal ${sub}`}>{units[type]}</span>
            </p>
            {vals.length > 1 && (
              <div className="h-24">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                  <polyline points={pts} fill="none" stroke={colors[type]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
            {vals.length <= 1 && <p className={`text-xs ${sub} text-center py-4`}>Pas assez de données</p>}
          </div>
        );
      })}
    </div>
  );
}

function PatientTabMedical({ pat, card, sub, border, darkMode }) {
  const mp = pat.medicalProfile || {};
  const sections = [
    { key: 'allergies',       label: 'Allergies',                icon: AlertTriangle, color: 'red' },
    { key: 'chronicDiseases', label: 'Maladies chroniques',      icon: HeartPulse,    color: 'orange' },
    { key: 'familyHistory',   label: 'Antécédents familiaux',    icon: Users,         color: 'purple' },
    { key: 'surgicalHistory', label: 'Historique chirurgical',   icon: Stethoscope,   color: 'blue' },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {sections.map(s => {
        const items = mp[s.key] || [];
        const Icon = s.icon;
        return (
          <div key={s.key} className={`${card} border rounded-2xl p-4`}>
            <div className={`flex items-center gap-2 mb-3`}>
              <div className={`w-8 h-8 rounded-lg bg-${s.color}-100 flex items-center justify-center`}>
                <Icon className={`w-4 h-4 text-${s.color}-600`} />
              </div>
              <p className="font-bold text-sm">{s.label}</p>
              <span className={`ml-auto text-xs ${sub}`}>{items.length}</span>
            </div>
            {items.length === 0 ? (
              <p className={`text-xs ${sub}`}>Aucun(e)</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {items.map((item, i) => (
                  <span key={i} className={`px-2 py-1 rounded-lg text-xs font-semibold bg-${s.color}-50 text-${s.color}-700 border border-${s.color}-100`}>{item}</span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PatientTabConsult({ pat, card, sub, border, darkMode }) {
  const consultations = pat.consultations || [];
  return (
    <div className="space-y-3">
      {consultations.length === 0 ? (
        <div className={`${card} border rounded-2xl p-8 flex flex-col items-center gap-2`}>
          <ClipboardList className={`w-8 h-8 ${sub}`} />
          <p className={`text-sm ${sub}`}>Aucune consultation enregistrée</p>
        </div>
      ) : consultations.map(c => (
        <div key={c.id} className={`${card} border rounded-2xl p-4`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-8 rounded-full bg-emerald-500 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">{c.diagnosisMain || 'Consultation'}</p>
                <p className={`text-xs ${sub}`}>{new Date(c.startedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">Terminée</span>
          </div>
          {c.motif && <p className={`text-xs ${sub} mt-2`}><strong>Motif :</strong> {c.motif}</p>}
          {c.notes && <p className={`text-xs ${sub} mt-1`}>{c.notes}</p>}
          {c.recommendations && <p className={`text-xs mt-1 text-blue-600 font-medium`}>→ {c.recommendations}</p>}
        </div>
      ))}
    </div>
  );
}

function PatientTabLabo({ pat, card, sub, border, darkMode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className={`${card} border rounded-2xl p-4`}>
        <h4 className="font-bold text-sm mb-3 flex items-center gap-2"><Microscope className="w-4 h-4 text-blue-600" /> Résultats labo</h4>
        {(pat.labResults || []).length === 0 ? (
          <p className={`text-xs ${sub}`}>Aucun résultat</p>
        ) : (pat.labResults || []).map(r => (
          <div key={r.id} className={`flex items-center justify-between py-2 border-b ${border} last:border-0`}>
            <p className="text-xs font-semibold">{r.title}</p>
            <p className={`text-[10px] ${sub}`}>{new Date(r.performedAt).toLocaleDateString('fr-FR')}</p>
          </div>
        ))}
      </div>
      <div className={`${card} border rounded-2xl p-4`}>
        <h4 className="font-bold text-sm mb-3 flex items-center gap-2"><FileDown className="w-4 h-4 text-purple-600" /> Ordonnances</h4>
        {(pat.prescriptions || []).length === 0 ? (
          <p className={`text-xs ${sub}`}>Aucune ordonnance</p>
        ) : (pat.prescriptions || []).map(r => (
          <div key={r.id} className={`flex items-center justify-between py-2 border-b ${border} last:border-0`}>
            <p className="text-xs font-semibold">{new Date(r.prescribedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${r.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{r.status === 'active' ? 'Active' : 'Expirée'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   AGENDA
   ════════════════════════════════════════════════════════════════ */
function DAgenda({ data, loading, onReload, notify, setShowVid, card, sub, border, darkMode }) {
  const [filter, setFilter] = useState('all'); // today | upcoming | all
  const [updating, setUpdating] = useState(null);

  const appts = data || [];
  const today = new Date().toISOString().slice(0, 10);

  const filtered = appts.filter(a => {
    if (filter === 'today')    return a.startsAt.startsWith(today);
    if (filter === 'upcoming') return a.startsAt >= today;
    return true;
  });

  const handleAction = async (id, status) => {
    setUpdating(id);
    try {
      await doctorApi.updateAppointment(id, { status });
      notify(status === 'confirmed' ? 'RDV confirmé' : 'RDV annulé');
      onReload();
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setUpdating(null);
    }
  };

  const statusCfg = {
    confirmed: { label: 'Confirmé',  cls: 'bg-emerald-100 text-emerald-700' },
    cancelled: { label: 'Annulé',    cls: 'bg-red-100 text-red-700' },
    requested: { label: 'Demandé',   cls: 'bg-amber-100 text-amber-700' },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="text-2xl font-bold">Agenda</h2><p className={`text-sm ${sub}`}>{filtered.length} rendez-vous</p></div>
        <div className={`flex gap-1 p-1 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
          {[{id:'today',l:"Aujourd'hui"},{id:'upcoming',l:'À venir'},{id:'all',l:'Tous'}].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === f.id ? `bg-white shadow text-red-600 ${darkMode ? '!bg-slate-700' : ''}` : sub}`}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[0,1,2,3].map(i => <div key={i} className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-20 rounded-2xl`} />)}</div>
      ) : filtered.length === 0 ? (
        <div className={`${card} border rounded-2xl p-10 flex flex-col items-center gap-2`}>
          <Calendar className={`w-10 h-10 ${sub}`} />
          <p className={`text-sm ${sub}`}>Aucun rendez-vous dans cette période</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(a => {
            const st = statusCfg[a.status] || statusCfg.requested;
            const dt = new Date(a.startsAt);
            return (
              <div key={a.id} className={`${card} border rounded-2xl p-4 flex items-center gap-4`}>
                {/* Date bloc */}
                <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <p className="text-[10px] font-bold uppercase text-red-600">{dt.toLocaleDateString('fr-FR',{month:'short'})}</p>
                  <p className="text-xl font-black leading-none">{dt.getDate()}</p>
                  <p className={`text-[10px] ${sub}`}>{dt.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</p>
                </div>
                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="font-bold">{a.patientName}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${st.cls}`}>{st.label}</span>
                    {a.mode === 'video' && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-700 flex items-center gap-1"><Video className="w-2.5 h-2.5" />Vidéo</span>}
                  </div>
                  <p className={`text-xs ${sub}`}>{a.cmuNumber} • {a.age} ans</p>
                  <p className={`text-xs ${sub}`}>{a.specialty} • {a.location}</p>
                </div>
                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
                  {a.mode === 'video' && a.status === 'confirmed' && setShowVid && (
                    <button onClick={() => setShowVid(true)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 flex items-center gap-1">
                      <Video className="w-3 h-3" /> Démarrer
                    </button>
                  )}
                  {a.status === 'requested' && (
                    <button disabled={updating === a.id} onClick={() => handleAction(a.id, 'confirmed')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Confirmer
                    </button>
                  )}
                  {a.status !== 'cancelled' && (
                    <button disabled={updating === a.id} onClick={() => handleAction(a.id, 'cancelled')}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold disabled:opacity-50 flex items-center gap-1
                        ${darkMode ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-100'}`}>
                      <X className="w-3 h-3" /> Annuler
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   CONSULTATIONS
   ════════════════════════════════════════════════════════════════ */
function DCons({ data, loading, onReload, patientsData, loadPatients, notify, card, sub, border, darkMode }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ patientId: '', motif: '', diagnosisMain: '', diagnosisSecondary: '', notes: '', recommendations: '' });
  const [saving, setSaving] = useState(false);
  const [editCons, setEditCons] = useState(null); // {id, motif, diagnosisMain, diagnosisSecondary, notes, recommendations, status}
  const [editSaving, setEditSaving] = useState(false);

  const consultations = data || [];
  const patients = patientsData || [];

  const handleShowForm = () => {
    setShowForm(true);
    if (!patientsData) loadPatients();
  };

  const openEdit = (c) => setEditCons({
    id: c.id, motif: c.motif || '', diagnosisMain: c.diagnosisMain || '',
    diagnosisSecondary: c.diagnosisSecondary || '', notes: c.notes || '',
    recommendations: c.recommendations || '', status: c.status,
  });

  const handleEditSave = async () => {
    setEditSaving(true);
    try {
      await doctorApi.updateConsultation(editCons.id, editCons);
      notify('Consultation mise à jour');
      setEditCons(null);
      onReload();
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setEditSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.patientId) return notify('Sélectionnez un patient', 'error');
    setSaving(true);
    try {
      await doctorApi.createConsultation(form);
      notify('Consultation enregistrée');
      setShowForm(false);
      setForm({ patientId: '', motif: '', diagnosisMain: '', diagnosisSecondary: '', notes: '', recommendations: '' });
      onReload();
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const fld = (label, key, type = 'input', placeholder = '') => (
    <div>
      <label className={`text-xs font-bold uppercase tracking-wide ${sub}`}>{label}</label>
      {type === 'textarea' ? (
        <textarea value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} rows={3} placeholder={placeholder}
          className={`mt-1 w-full px-3 py-2 rounded-xl border text-sm outline-none resize-none ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`} />
      ) : (
        <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
          className={`mt-1 w-full px-3 py-2 rounded-xl border text-sm outline-none ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`} />
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="text-2xl font-bold">Consultations</h2><p className={`text-sm ${sub}`}>{consultations.length} enregistrées</p></div>
        <button onClick={handleShowForm}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 shadow-lg shadow-red-600/20">
          <Plus className="w-4 h-4" /> Nouvelle consultation
        </button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className={`${card} border rounded-2xl p-5 space-y-4`}>
          <div className="flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2"><ClipboardList className="w-4 h-4 text-red-600" /> Nouvelle consultation</h3>
            <button onClick={() => setShowForm(false)}><X className={`w-4 h-4 ${sub}`} /></button>
          </div>
          <div>
            <label className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Patient *</label>
            <select value={form.patientId} onChange={e => setForm(f => ({ ...f, patientId: e.target.value }))}
              className={`mt-1 w-full px-3 py-2 rounded-xl border text-sm outline-none ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <option value="">Sélectionner un patient...</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} — {p.cmuNumber}</option>)}
            </select>
          </div>
          {fld('Motif de consultation', 'motif', 'textarea', 'Symptômes, raison de la visite...')}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fld('Diagnostic principal', 'diagnosisMain', 'input', 'Ex: Hypertension artérielle stade 1')}
            {fld('Diagnostic secondaire', 'diagnosisSecondary', 'input', 'Optionnel')}
          </div>
          {fld('Observations médicales', 'notes', 'textarea', 'Notes cliniques, examens...')}
          {fld('Recommandations', 'recommendations', 'textarea', 'Traitement, suivi, conseils...')}
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowForm(false)} className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold ${darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'}`}>
              Annuler
            </button>
            <button onClick={handleSubmit} disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Enregistrement...</> : <><Save className="w-4 h-4" />Enregistrer</>}
            </button>
          </div>
        </div>
      )}

      {/* Modale d'édition consultation */}
      {editCons && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className={`${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col`}>
            <div className={`p-5 border-b ${border} flex items-center justify-between`}>
              <h3 className="font-bold flex items-center gap-2"><Edit3 className="w-4 h-4 text-red-600" /> Modifier la consultation</h3>
              <button onClick={() => setEditCons(null)}><X className={`w-5 h-5 ${sub}`} /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {[
                { l: 'Motif', k: 'motif', type: 'textarea' },
                { l: 'Diagnostic principal', k: 'diagnosisMain' },
                { l: 'Diagnostic secondaire', k: 'diagnosisSecondary' },
                { l: 'Observations', k: 'notes', type: 'textarea' },
                { l: 'Recommandations', k: 'recommendations', type: 'textarea' },
              ].map(({ l, k, type }) => (
                <div key={k}>
                  <label className={`text-xs font-bold uppercase tracking-wide ${sub}`}>{l}</label>
                  {type === 'textarea' ? (
                    <textarea value={editCons[k]} onChange={e => setEditCons(c => ({ ...c, [k]: e.target.value }))} rows={3}
                      className={`mt-1 w-full px-3 py-2 rounded-xl border text-sm outline-none resize-none ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`} />
                  ) : (
                    <input value={editCons[k]} onChange={e => setEditCons(c => ({ ...c, [k]: e.target.value }))}
                      className={`mt-1 w-full px-3 py-2 rounded-xl border text-sm outline-none ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`} />
                  )}
                </div>
              ))}
              <div>
                <label className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Statut</label>
                <select value={editCons.status} onChange={e => setEditCons(c => ({ ...c, status: e.target.value }))}
                  className={`mt-1 w-full px-3 py-2 rounded-xl border text-sm outline-none ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <option value="draft">Brouillon</option>
                  <option value="completed">Terminée</option>
                </select>
              </div>
            </div>
            <div className={`p-5 border-t ${border} flex gap-3`}>
              <button onClick={() => setEditCons(null)} className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold ${darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'}`}>
                Annuler
              </button>
              <button onClick={handleEditSave} disabled={editSaving}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {editSaving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />...</> : <><Save className="w-4 h-4" />Enregistrer</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <div className="space-y-3">{[0,1,2].map(i => <div key={i} className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-24 rounded-2xl`} />)}</div>
      ) : consultations.length === 0 ? (
        <div className={`${card} border rounded-2xl p-10 flex flex-col items-center gap-2`}>
          <ClipboardList className={`w-10 h-10 ${sub}`} />
          <p className={`text-sm ${sub}`}>Aucune consultation</p>
        </div>
      ) : consultations.map(c => (
        <div key={c.id} className={`${card} border rounded-2xl p-4`}>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-full min-h-[3rem] rounded-full bg-emerald-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                <div>
                  <p className="font-bold">{c.patientName}</p>
                  <p className={`text-xs ${sub}`}>{new Date(c.startedAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' })}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.status === 'draft' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {c.status === 'draft' ? 'Brouillon' : 'Terminée'}
                  </span>
                  <button onClick={() => openEdit(c)}
                    className={`p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 ${darkMode ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-100'}`}>
                    <Edit3 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              {c.motif && <p className={`text-xs ${sub} mt-1`}><strong>Motif :</strong> {c.motif}</p>}
              {c.diagnosisMain && (
                <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 text-red-700 text-xs font-semibold">
                  <Stethoscope className="w-3 h-3" />{c.diagnosisMain}
                </div>
              )}
              {c.notes && <p className={`text-xs ${sub} mt-2 line-clamp-2`}>{c.notes}</p>}
              {c.recommendations && <p className="text-xs text-blue-600 font-medium mt-1">→ {c.recommendations}</p>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   STATISTIQUES
   ════════════════════════════════════════════════════════════════ */
function DStats({ data, loading, card, sub, border, darkMode }) {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0,1].map(i => <div key={i} className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-64 rounded-2xl`} />)}
      </div>
    );
  }

  const { totalPatients = 0, totalConsultations = 0, avgRating = '—', ratingCount = 0, diagnoses = [], ratings = [] } = data;
  const maxDiag = Math.max(...diagnoses.map(d => d.count), 1);

  const kpiColors = ['red','blue','emerald','amber'];
  const kpis = [
    { l: 'Patients suivis',       v: totalPatients,       c: 'red' },
    { l: 'Consultations totales', v: totalConsultations,  c: 'blue' },
    { l: 'Satisfaction moyenne',  v: `${avgRating} / 5`,  c: 'emerald' },
    { l: 'Avis reçus',            v: ratingCount,         c: 'amber' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k, i) => (
          <div key={i} className={`${card} border rounded-2xl p-4`}>
            <p className={`text-xs ${sub}`}>{k.l}</p>
            <p className={`text-2xl font-bold mt-1 text-${k.c}-600`}>{k.v}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={`${card} border rounded-2xl p-5`}>
          <h3 className="font-bold mb-4 flex items-center gap-2"><Stethoscope className="w-4 h-4 text-red-600" /> Pathologies traitées</h3>
          {diagnoses.length === 0 ? (
            <p className={`text-sm ${sub} text-center py-4`}>Pas de données</p>
          ) : (
            <div className="space-y-3">
              {diagnoses.map((d, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold truncate pr-2">{d.name}</span>
                    <span className={sub}>{d.count}</span>
                  </div>
                  <div className={`h-2.5 rounded-full ${darkMode ? 'bg-slate-800' : 'bg-slate-200'} overflow-hidden`}>
                    <div className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full"
                      style={{ width: `${(d.count / maxDiag) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={`${card} border rounded-2xl p-5`}>
          <h3 className="font-bold mb-4 flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" /> Avis patients</h3>
          {ratings.length === 0 ? (
            <p className={`text-sm ${sub} text-center py-4`}>Aucun avis reçu</p>
          ) : (
            <div className="space-y-3">
              {ratings.map((r, i) => (
                <div key={i} className={`p-3 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-3 h-3 ${s <= r.rating ? 'text-amber-500 fill-amber-500' : sub}`} />
                    ))}
                    <span className={`text-xs ${sub} ml-auto`}>{new Date(r.createdAt).toLocaleDateString('fr-FR')}</span>
                  </div>
                  {r.comment && <p className={`text-xs ${sub}`}>"{r.comment}"</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   PROFIL MÉDECIN
   ════════════════════════════════════════════════════════════════ */
function DProfile({ data, loading, card, sub, border, darkMode }) {
  if (loading || !data) {
    return <div className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-64 rounded-2xl`} />;
  }
  const colorMap = { red: 'from-red-600 to-red-800', emerald: 'from-emerald-600 to-emerald-800', blue: 'from-blue-600 to-blue-800', indigo: 'from-indigo-600 to-indigo-800' };
  const grad = colorMap[data.avatarColor] || colorMap.red;

  const fields = [
    { l: 'Spécialité',     v: data.specialty + (data.subSpecialty ? ` — ${data.subSpecialty}` : '') },
    { l: 'Établissement',  v: data.address || '—' },
    { l: 'Ville',          v: data.city || '—' },
    { l: 'Téléphone',      v: data.phone || '—' },
    { l: 'Email',          v: data.email || '—' },
    { l: 'Expérience',     v: `${data.experienceYears} ans` },
    { l: 'Langues',        v: data.languages || 'Français' },
    { l: 'Tarif consultation', v: data.consultationFee ? `${(data.consultationFee / 1000).toFixed(0)} 000 FCFA` : '—' },
    { l: 'CMU',            v: data.acceptsCmu ? 'Acceptée' : 'Non acceptée' },
  ];

  return (
    <div className="space-y-4">
      <div className={`bg-gradient-to-br ${grad} rounded-2xl p-6 text-white flex flex-col sm:flex-row items-start sm:items-center gap-4`}>
        <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl font-black border-2 border-white/30 flex-shrink-0">
          {data.avatarInitials}
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">Dr. {data.firstName} {data.lastName}</h2>
          <p className="text-white/80 text-sm mt-0.5">{data.specialty} • {data.city}</p>
          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map(s => <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(data.rating) ? 'fill-amber-400 text-amber-400' : 'text-white/30'}`} />)}
            </div>
            <span className="text-sm font-bold">{data.rating} ({data.reviewsCount} avis)</span>
          </div>
        </div>
      </div>

      {data.bio && (
        <div className={`${card} border rounded-2xl p-5`}>
          <h3 className="font-bold mb-2">Bio</h3>
          <p className={`text-sm ${sub}`}>{data.bio}</p>
        </div>
      )}

      <div className={`${card} border rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`}>
        {fields.map((f, i) => (
          <div key={i}>
            <p className={`text-[10px] font-bold uppercase tracking-wider ${sub}`}>{f.l}</p>
            <p className="text-sm font-semibold mt-1">{f.v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ORDONNANCES MÉDECIN
   ════════════════════════════════════════════════════════════════ */
function DPrescriptions({ data, loading, onReload, patientsData, loadPatients, notify, card, sub, border, darkMode }) {
  const [showForm,    setShowForm]    = useState(false);
  const [form,        setForm]        = useState({ patientId: '', notes: '', validDays: 30 });
  const [items,       setItems]       = useState([{ name: '', dosage: '', frequency: '', duration: '' }]);
  const [saving,      setSaving]      = useState(false);
  const [detail,      setDetail]      = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const prescriptions = data || [];
  const patients      = patientsData || [];

  const handleShowForm = () => { setShowForm(true); if (!patientsData) loadPatients(); };
  const addItem    = () => setItems(prev => [...prev, { name: '', dosage: '', frequency: '', duration: '' }]);
  const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i, field, val) => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it));

  const handleSubmit = async () => {
    if (!form.patientId) return notify('Sélectionnez un patient', 'error');
    if (!items[0]?.name) return notify('Au moins un médicament requis', 'error');
    setSaving(true);
    try {
      await doctorApi.createPrescription({ ...form, items: items.filter(i => i.name), validDays: Number(form.validDays) });
      notify('Ordonnance émise');
      setShowForm(false);
      setForm({ patientId: '', notes: '', validDays: 30 });
      setItems([{ name: '', dosage: '', frequency: '', duration: '' }]);
      onReload();
    } catch (e) { notify(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const openDetail = async (rx) => {
    setDetailLoading(true);
    try { setDetail(await doctorApi.prescription(rx.id)); }
    catch (e) { notify(e.message, 'error'); }
    finally { setDetailLoading(false); }
  };

  const inp = `mt-1 w-full px-3 py-2 rounded-xl border text-sm outline-none ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="text-2xl font-bold">Ordonnances</h2><p className={`text-sm ${sub}`}>{prescriptions.length} émises</p></div>
        <button onClick={handleShowForm}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 shadow-lg shadow-red-600/20">
          <Plus className="w-4 h-4" /> Nouvelle ordonnance
        </button>
      </div>

      {detail && <PrescriptionDetail rx={detail} onClose={() => setDetail(null)} card={card} sub={sub} border={border} darkMode={darkMode} />}
      {detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className={`${card} border rounded-2xl p-8`}>
            <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      )}

      {showForm && (
        <div className={`${card} border rounded-2xl p-5 space-y-4`}>
          <div className="flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2"><FileDown className="w-4 h-4 text-red-600" /> Nouvelle ordonnance</h3>
            <button onClick={() => setShowForm(false)}><X className={`w-4 h-4 ${sub}`} /></button>
          </div>
          <div>
            <label className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Patient *</label>
            <select value={form.patientId} onChange={e => setForm(f => ({ ...f, patientId: e.target.value }))} className={inp}>
              <option value="">Sélectionner un patient...</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} — {p.cmuNumber}</option>)}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Médicaments *</label>
              <button onClick={addItem} className="flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700">
                <Plus className="w-3.5 h-3.5" /> Ajouter
              </button>
            </div>
            <div className="space-y-3">
              {items.map((item, i) => (
                <div key={i} className={`p-3 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-xs font-bold text-red-600">Médicament {i + 1}</p>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(i)} className="ml-auto text-slate-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[['Nom *', 'name', 'Ex: Paracétamol 500mg'], ['Posologie', 'dosage', 'Ex: 1 cp'], ['Fréquence', 'frequency', 'Ex: 3×/jour'], ['Durée', 'duration', 'Ex: 7 jours']].map(([lbl, fld, ph]) => (
                      <div key={fld}>
                        <label className={`text-[10px] font-bold uppercase ${sub}`}>{lbl}</label>
                        <input value={item[fld]} onChange={e => updateItem(i, fld, e.target.value)} placeholder={ph} className={inp} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Validité (jours)</label>
              <input type="number" value={form.validDays} onChange={e => setForm(f => ({ ...f, validDays: e.target.value }))} min="1" max="365" className={inp} />
            </div>
            <div>
              <label className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Notes</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Instructions..." className={inp} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowForm(false)} className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold ${darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'}`}>Annuler</button>
            <button onClick={handleSubmit} disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />...</> : <><Save className="w-4 h-4" />Émettre</>}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[0,1,2].map(i => <div key={i} className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-20 rounded-2xl`} />)}</div>
      ) : prescriptions.length === 0 ? (
        <div className={`${card} border rounded-2xl p-10 flex flex-col items-center gap-2`}>
          <FileDown className={`w-10 h-10 ${sub}`} />
          <p className={`text-sm ${sub}`}>Aucune ordonnance émise</p>
        </div>
      ) : prescriptions.map(rx => (
        <div key={rx.id} className={`${card} border rounded-2xl p-4 flex items-center gap-4`}>
          <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
            <FileDown className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold truncate">{rx.patientName}</p>
            <p className={`text-xs ${sub}`}>{rx.cmuNumber}</p>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${rx.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {rx.status === 'active' ? 'Active' : 'Expirée'}
              </span>
              <p className={`text-xs ${sub}`}>{new Date(rx.issuedAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' })}</p>
              <p className={`text-xs ${sub}`}>{rx.itemsCount} médicament{rx.itemsCount > 1 ? 's' : ''}</p>
            </div>
          </div>
          <button onClick={() => openDetail(rx)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 flex-shrink-0 ${darkMode ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-100'}`}>
            <Printer className="w-3 h-3" /> Voir / Imprimer
          </button>
        </div>
      ))}
    </div>
  );
}

function PrescriptionDetail({ rx, onClose, card, sub, border, darkMode }) {
  const handlePrint = () => {
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><title>Ordonnance — ${rx.patientName}</title>
<style>
  body{font-family:Arial,sans-serif;padding:40px;max-width:680px;margin:0 auto;color:#1e293b}
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #dc2626;padding-bottom:16px;margin-bottom:24px}
  .doc-name{font-weight:bold;font-size:17px}.doc-spec{color:#64748b;font-size:13px;margin-top:2px}
  .rx-title{font-size:22px;font-weight:800;color:#dc2626;letter-spacing:1px}
  .date{color:#64748b;font-size:12px;margin-top:4px;text-align:right}
  .patient{background:#f8fafc;border-radius:8px;padding:10px 14px;margin-bottom:20px}
  table{width:100%;border-collapse:collapse;margin-top:4px}
  th{text-align:left;font-size:10px;text-transform:uppercase;color:#94a3b8;padding:6px 8px;border-bottom:2px solid #e2e8f0;letter-spacing:.5px}
  td{padding:10px 8px;border-bottom:1px solid #f1f5f9;font-size:13px}
  tr:last-child td{border-bottom:none}
  .notes{margin-top:18px;padding:12px;background:#fefce8;border-radius:8px;font-size:12px;color:#713f12}
  .footer{margin-top:48px;display:flex;justify-content:space-between;font-size:11px;color:#94a3b8}
  .sig{text-align:right;width:160px;border-top:1px solid #334155;padding-top:4px;font-size:11px;color:#475569}
  @media print{button{display:none}}
</style></head><body>
<div class="hdr">
  <div><div class="doc-name">${rx.doctorName}</div><div class="doc-spec">${rx.doctorSpecialty || ''}</div></div>
  <div><div class="rx-title">ORDONNANCE</div><div class="date">${new Date(rx.issuedAt).toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'})}</div></div>
</div>
<div class="patient"><strong>${rx.patientName}</strong><span style="color:#64748b;margin-left:10px;font-size:12px">CMU: ${rx.cmuNumber}</span></div>
<table>
  <thead><tr><th>Médicament</th><th>Posologie</th><th>Fréquence</th><th>Durée</th></tr></thead>
  <tbody>${rx.items.map(i => `<tr><td><strong>${i.name}</strong>${i.instructions ? `<br><span style="font-size:11px;color:#64748b">${i.instructions}</span>` : ''}</td><td>${i.dosage || '—'}</td><td>${i.frequency || '—'}</td><td>${i.duration || '—'}</td></tr>`).join('')}</tbody>
</table>
${rx.notes ? `<div class="notes">📝 ${rx.notes}</div>` : ''}
${rx.validUntil ? `<p style="margin-top:14px;font-size:11px;color:#64748b">Valable jusqu'au : <strong>${new Date(rx.validUntil).toLocaleDateString('fr-FR')}</strong></p>` : ''}
<div class="footer"><span>NOVA — Carnet Santé Numérique</span><div class="sig">Signature et cachet</div></div>
<script>window.onload=()=>window.print()</script>
</body></html>`);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className={`${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col`}>
        <div className={`p-5 border-b ${border} flex items-center justify-between`}>
          <div>
            <h3 className="font-bold text-lg">Ordonnance</h3>
            <p className={`text-xs ${sub}`}>{rx.patientName} • {new Date(rx.issuedAt).toLocaleDateString('fr-FR')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700">
              <Printer className="w-3.5 h-3.5" /> Imprimer
            </button>
            <button onClick={onClose}><X className={`w-5 h-5 ${sub}`} /></button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div className={`rounded-xl p-3 ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
            <p className={`text-[10px] font-bold uppercase ${sub}`}>Patient</p>
            <p className="font-bold">{rx.patientName}</p>
            <p className={`text-xs ${sub}`}>CMU: {rx.cmuNumber}</p>
          </div>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wide ${sub} mb-2`}>Médicaments ({rx.items.length})</p>
            <div className="space-y-2">
              {rx.items.map((item, i) => (
                <div key={i} className={`p-3 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <p className="font-bold text-sm">{item.name}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                    {item.dosage    && <p className={`text-xs ${sub}`}>Dose: <strong>{item.dosage}</strong></p>}
                    {item.frequency && <p className={`text-xs ${sub}`}>Fréq: <strong>{item.frequency}</strong></p>}
                    {item.duration  && <p className={`text-xs ${sub}`}>Durée: <strong>{item.duration}</strong></p>}
                  </div>
                  {item.instructions && <p className="text-xs text-blue-600 mt-1">{item.instructions}</p>}
                </div>
              ))}
            </div>
          </div>
          {rx.notes && (
            <div>
              <p className={`text-xs font-bold uppercase tracking-wide ${sub} mb-1`}>Notes</p>
              <p className={`text-sm ${sub}`}>{rx.notes}</p>
            </div>
          )}
          <div className={`flex items-center justify-between text-xs ${sub}`}>
            <span>Émise le {new Date(rx.issuedAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' })}</span>
            {rx.validUntil && <span>Valide jusqu'au {new Date(rx.validUntil).toLocaleDateString('fr-FR')}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   DEMANDES D'ANALYSES
   ════════════════════════════════════════════════════════════════ */
function DLabRequests({ data, loading, onReload, patientsData, loadPatients, notify, card, sub, border, darkMode }) {
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ patientId: '', type: 'blood', title: '', notes: '' });
  const [saving,   setSaving]   = useState(false);

  const requests = data || [];
  const patients = patientsData || [];

  const labTypes = [
    { id: 'blood',   label: 'Bilan sanguin',  icon: '🩸' },
    { id: 'urine',   label: 'Analyse urine',  icon: '🧪' },
    { id: 'imaging', label: 'Imagerie',        icon: '📷' },
    { id: 'cardio',  label: 'Cardio (ECG)',    icon: '❤️' },
    { id: 'micro',   label: 'Microbiologie',   icon: '🔬' },
    { id: 'other',   label: 'Autre',           icon: '📋' },
  ];

  const handleShowForm = () => { setShowForm(true); if (!patientsData) loadPatients(); };

  const handleSubmit = async () => {
    if (!form.patientId) return notify('Sélectionnez un patient', 'error');
    if (!form.title)     return notify('Intitulé requis', 'error');
    setSaving(true);
    try {
      await doctorApi.createLabRequest(form);
      notify('Demande envoyée');
      setShowForm(false);
      setForm({ patientId: '', type: 'blood', title: '', notes: '' });
      onReload();
    } catch (e) { notify(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const statusCfg = {
    pending:    { label: 'En attente', cls: 'bg-amber-100 text-amber-700' },
    processing: { label: 'En cours',   cls: 'bg-blue-100 text-blue-700' },
    available:  { label: 'Disponible', cls: 'bg-emerald-100 text-emerald-700' },
  };

  const inp = `mt-1 w-full px-3 py-2 rounded-xl border text-sm outline-none ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="text-2xl font-bold">Demandes d'analyses</h2><p className={`text-sm ${sub}`}>{requests.length} demandes</p></div>
        <button onClick={handleShowForm}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20">
          <Plus className="w-4 h-4" /> Nouvelle demande
        </button>
      </div>

      {showForm && (
        <div className={`${card} border rounded-2xl p-5 space-y-4`}>
          <div className="flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2"><Microscope className="w-4 h-4 text-blue-600" /> Demande d'analyse</h3>
            <button onClick={() => setShowForm(false)}><X className={`w-4 h-4 ${sub}`} /></button>
          </div>
          <div>
            <label className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Patient *</label>
            <select value={form.patientId} onChange={e => setForm(f => ({ ...f, patientId: e.target.value }))} className={inp}>
              <option value="">Sélectionner un patient...</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} — {p.cmuNumber}</option>)}
            </select>
          </div>
          <div>
            <label className={`text-xs font-bold uppercase tracking-wide ${sub} block mb-2`}>Type d'analyse *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {labTypes.map(t => (
                <button key={t.id} onClick={() => setForm(f => ({ ...f, type: t.id }))}
                  className={`p-2.5 rounded-xl border text-xs font-semibold text-left flex items-center gap-2 transition-all
                    ${form.type === t.id ? 'border-blue-500 bg-blue-50 text-blue-700' : (darkMode ? 'border-slate-700 hover:border-slate-500' : 'border-slate-200 hover:border-slate-400')}`}>
                  <span>{t.icon}</span>{t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Intitulé *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Ex: NFS, CRP, Glycémie à jeun, Échographie abdominale..." className={inp} />
          </div>
          <div>
            <label className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Notes / Indications</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
              placeholder="Contexte clinique, degré d'urgence..."
              className={`mt-1 w-full px-3 py-2 rounded-xl border text-sm outline-none resize-none ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`} />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowForm(false)} className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold ${darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'}`}>Annuler</button>
            <button onClick={handleSubmit} disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />...</> : <><Send className="w-4 h-4" />Envoyer</>}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[0,1,2].map(i => <div key={i} className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-20 rounded-2xl`} />)}</div>
      ) : requests.length === 0 ? (
        <div className={`${card} border rounded-2xl p-10 flex flex-col items-center gap-2`}>
          <Microscope className={`w-10 h-10 ${sub}`} />
          <p className={`text-sm ${sub}`}>Aucune demande d'analyse</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map(r => {
            const st       = statusCfg[r.status] || statusCfg.pending;
            const typeIcon = labTypes.find(t => t.id === r.type)?.icon || '📋';
            return (
              <div key={r.id} className={`${card} border rounded-2xl p-4 flex items-center gap-4`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl ${darkMode ? 'bg-slate-800' : 'bg-blue-50'}`}>
                  {typeIcon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{r.title}</p>
                  <p className={`text-xs ${sub}`}>{r.patientName} • {r.cmuNumber}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${st.cls}`}>{st.label}</span>
                    <p className={`text-xs ${sub}`}>{new Date(r.requestedAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' })}</p>
                  </div>
                  {r.notes && <p className={`text-xs ${sub} mt-1 truncate`}>{r.notes}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SUIVI CHRONIQUES
   ════════════════════════════════════════════════════════════════ */
function DSuiviChroniques({ data, loading, onReload, notify, setPage, card, sub, border, darkMode }) {
  const [filter, setFilter] = useState('all'); // high | medium | low | all
  const patients = data || [];

  const filtered = filter === 'all' ? patients : patients.filter(p => p.risk === filter);

  const riskCfg = {
    high:   { label: 'Critique',     cls: 'bg-red-100 text-red-700',     dot: 'bg-red-500',     bar: 'bg-red-500' },
    medium: { label: 'À surveiller', cls: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500',   bar: 'bg-amber-500' },
    low:    { label: 'Stable',       cls: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', bar: 'bg-emerald-500' },
  };

  const counts = { high: patients.filter(p => p.risk === 'high').length, medium: patients.filter(p => p.risk === 'medium').length, low: patients.filter(p => p.risk === 'low').length };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Suivi des maladies chroniques</h2>
          <p className={`text-sm ${sub}`}>{patients.length} patients suivis</p>
        </div>
        <button onClick={onReload} className={`px-4 py-2 rounded-xl border text-sm font-semibold flex items-center gap-2 ${darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'}`}>
          <Activity className="w-4 h-4" /> Actualiser
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[{ k: 'high', l: 'Critique', I: AlertCircle }, { k: 'medium', l: 'À surveiller', I: Clock }, { k: 'low', l: 'Stable', I: CheckCircle2 }].map(({ k, l, I }) => (
          <button key={k} onClick={() => setFilter(filter === k ? 'all' : k)}
            className={`${card} border rounded-2xl p-4 text-left transition-all ${filter === k ? 'ring-2 ring-red-500' : ''}`}>
            <div className={`w-8 h-8 rounded-lg mb-2 flex items-center justify-center ${k === 'high' ? 'bg-red-100' : k === 'medium' ? 'bg-amber-100' : 'bg-emerald-100'}`}>
              <I className={`w-4 h-4 ${k === 'high' ? 'text-red-600' : k === 'medium' ? 'text-amber-600' : 'text-emerald-600'}`} />
            </div>
            <p className="text-2xl font-black">{counts[k]}</p>
            <p className={`text-xs ${sub}`}>{l}</p>
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="space-y-3">{[0,1,2,3].map(i => <div key={i} className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-24 rounded-2xl`} />)}</div>
      ) : filtered.length === 0 ? (
        <div className={`${card} border rounded-2xl p-10 flex flex-col items-center gap-2`}>
          <HeartPulse className={`w-10 h-10 ${sub}`} />
          <p className={`text-sm ${sub}`}>Aucun patient dans cette catégorie</p>
        </div>
      ) : filtered.map(pat => {
        const rc = riskCfg[pat.risk] || riskCfg.low;
        return (
          <div key={pat.id} className={`${card} border rounded-2xl p-4`}>
            <div className="flex items-start gap-4">
              {/* Avatar + risque */}
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-400 to-red-700 text-white flex items-center justify-center font-bold text-sm">
                  {pat.firstName[0]}{pat.lastName[0]}
                </div>
                <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${rc.dot}`} />
              </div>
              {/* Infos */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                  <div>
                    <p className="font-bold">{pat.firstName} {pat.lastName}</p>
                    <p className={`text-xs ${sub}`}>{pat.cmuNumber} • {pat.age} ans</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${rc.cls}`}>{rc.label}</span>
                </div>
                {/* Maladies chroniques */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {pat.chronicDiseases.map((d, i) => (
                    <span key={i} className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>{d}</span>
                  ))}
                </div>
                {/* Dernière consultation */}
                <div className={`flex items-center gap-4 text-xs ${sub}`}>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {pat.lastConsult
                      ? `Dernière visite il y a ${pat.daysSince} jour${pat.daysSince > 1 ? 's' : ''}`
                      : 'Jamais consulté'}
                  </span>
                  {pat.phone && <a href={`tel:${pat.phone}`} className="flex items-center gap-1 text-blue-600 font-semibold hover:underline"><Phone className="w-3 h-3" />{pat.phone}</a>}
                </div>
                {pat.lastDiagnosis && <p className={`text-xs mt-1 text-red-600 font-medium`}>→ {pat.lastDiagnosis}</p>}
              </div>
              {/* Action rapide */}
              <button onClick={() => setPage('consultations')}
                className="flex-shrink-0 p-2 rounded-xl bg-red-600 text-white hover:bg-red-700">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {/* Barre de risque */}
            {pat.daysSince !== null && (
              <div className="mt-3">
                <div className={`h-1.5 rounded-full ${darkMode ? 'bg-slate-800' : 'bg-slate-200'} overflow-hidden`}>
                  <div className={`h-full rounded-full ${rc.bar} transition-all`}
                    style={{ width: `${Math.min((pat.daysSince / 180) * 100, 100)}%` }} />
                </div>
                <p className={`text-[10px] ${sub} mt-0.5`}>Délai depuis dernière visite ({pat.daysSince}j / 180j recommandés)</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   URGENCES MÉDECIN
   ════════════════════════════════════════════════════════════════ */
function DUrgences({ data, loading, onReload, patientsData, loadPatients, notify, card, sub, border, darkMode }) {
  const [showForm, setShowForm]   = useState(false);
  const [form,     setForm]       = useState({ patientId: '', type: 'urgent', level: 'critical', title: '', body: '' });
  const [saving,   setSaving]     = useState(false);
  const [resolving, setResolving] = useState(null);

  const alerts  = data || [];
  const patients = patientsData || [];
  const open    = alerts.filter(a => a.status === 'open');
  const resolved = alerts.filter(a => a.status === 'resolved');

  const handleShowForm = () => { setShowForm(true); if (!patientsData) loadPatients(); };

  const handleSubmit = async () => {
    if (!form.patientId) return notify('Sélectionnez un patient', 'error');
    if (!form.title)     return notify('Titre requis', 'error');
    setSaving(true);
    try {
      await doctorApi.createAlert(form);
      notify('Alerte créée');
      setShowForm(false);
      setForm({ patientId: '', type: 'urgent', level: 'critical', title: '', body: '' });
      onReload();
    } catch (e) { notify(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleResolve = async (id) => {
    setResolving(id);
    try {
      await doctorApi.resolveAlert(id);
      notify('Alerte résolue');
      onReload();
    } catch (e) { notify(e.message, 'error'); }
    finally { setResolving(null); }
  };

  const levelCfg = {
    critical: { label: 'Critique',  cls: 'bg-red-100 text-red-700',     border: 'border-red-200' },
    warning:  { label: 'Attention', cls: 'bg-amber-100 text-amber-700', border: 'border-amber-200' },
    info:     { label: 'Info',      cls: 'bg-blue-100 text-blue-700',   border: 'border-blue-200' },
  };

  const typeLabels = { urgent: 'Urgence', chronic: 'Suivi chronique', followup: 'Relance', lab: 'Résultat labo', other: 'Autre' };

  const inp = `mt-1 w-full px-3 py-2 rounded-xl border text-sm outline-none ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Urgences & Alertes</h2>
          <p className={`text-sm ${sub}`}>{open.length} alerte{open.length > 1 ? 's' : ''} ouverte{open.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={handleShowForm}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 shadow-lg shadow-red-600/20">
          <Plus className="w-4 h-4" /> Nouvelle alerte
        </button>
      </div>

      {/* Contacts urgence rapides */}
      <div className={`${card} border rounded-2xl p-4`}>
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><Phone className="w-4 h-4 text-red-600" /> Contacts urgence rapides</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[{ l: 'SAMU', n: '15', c: 'red' }, { l: 'Pompiers', n: '18', c: 'orange' }, { l: 'Police', n: '17', c: 'blue' }, { l: 'Urgences CHU', n: '05 20 33 34 00', c: 'emerald' }].map(({ l, n, c }) => (
            <a key={l} href={`tel:${n}`}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all bg-${c}-50 border-${c}-200 hover:bg-${c}-100`}>
              <Phone className={`w-4 h-4 text-${c}-600`} />
              <p className={`text-xs font-bold text-${c}-700`}>{l}</p>
              <p className={`text-sm font-black text-${c}-600`}>{n}</p>
            </a>
          ))}
        </div>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className={`${card} border-2 border-red-200 rounded-2xl p-5 space-y-4`}>
          <div className="flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-600" /> Créer une alerte patient</h3>
            <button onClick={() => setShowForm(false)}><X className={`w-4 h-4 ${sub}`} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Patient *</label>
              <select value={form.patientId} onChange={e => setForm(f => ({ ...f, patientId: e.target.value }))} className={inp}>
                <option value="">Sélectionner...</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
              </select>
            </div>
            <div>
              <label className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Niveau *</label>
              <select value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))} className={inp}>
                <option value="critical">🔴 Critique</option>
                <option value="warning">🟡 Attention</option>
                <option value="info">🔵 Information</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={inp}>
                <option value="urgent">Urgence</option>
                <option value="chronic">Suivi chronique</option>
                <option value="followup">Relance</option>
                <option value="lab">Résultat labo</option>
                <option value="other">Autre</option>
              </select>
            </div>
            <div>
              <label className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Titre *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Résumé de l'alerte..." className={inp} />
            </div>
          </div>
          <div>
            <label className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Détails</label>
            <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={3}
              placeholder="Informations supplémentaires, actions à prendre..."
              className={`mt-1 w-full px-3 py-2 rounded-xl border text-sm outline-none resize-none ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`} />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)} className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold ${darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'}`}>Annuler</button>
            <button onClick={handleSubmit} disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />...</> : <><AlertCircle className="w-4 h-4" />Créer l'alerte</>}
            </button>
          </div>
        </div>
      )}

      {/* Alertes ouvertes */}
      {loading ? (
        <div className="space-y-3">{[0,1,2].map(i => <div key={i} className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-20 rounded-2xl`} />)}</div>
      ) : open.length === 0 && !showForm ? (
        <div className={`${card} border rounded-2xl p-8 flex flex-col items-center gap-2`}>
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          <p className="font-semibold text-emerald-600">Aucune alerte ouverte</p>
          <p className={`text-xs ${sub}`}>Tous vos patients sont à jour</p>
        </div>
      ) : (
        <div className="space-y-2">
          {open.map(a => {
            const lc = levelCfg[a.level] || levelCfg.warning;
            return (
              <div key={a.id} className={`${card} border-l-4 ${lc.border} rounded-2xl p-4 flex items-start gap-4`}>
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${a.level === 'critical' ? 'bg-red-500 animate-pulse' : a.level === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-0.5">
                    <p className="font-bold text-sm">{a.title}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${lc.cls}`}>{lc.label}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{typeLabels[a.type]}</span>
                    </div>
                  </div>
                  <p className={`text-xs ${sub}`}>{a.patientName} • {a.cmuNumber}</p>
                  {a.body && <p className={`text-xs ${sub} mt-1`}>{a.body}</p>}
                  <p className={`text-[10px] ${sub} mt-1`}>{new Date(a.createdAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</p>
                </div>
                <button onClick={() => handleResolve(a.id)} disabled={resolving === a.id}
                  className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Résoudre
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Alertes résolues (collapsible) */}
      {resolved.length > 0 && (
        <div className={`${card} border rounded-2xl p-4`}>
          <p className={`text-xs font-bold uppercase tracking-wide ${sub} mb-3`}>Résolues ({resolved.length})</p>
          <div className="space-y-2">
            {resolved.slice(0, 5).map(a => (
              <div key={a.id} className={`flex items-center gap-3 p-2 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'} opacity-60`}>
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{a.title}</p>
                  <p className={`text-[10px] ${sub}`}>{a.patientName}</p>
                </div>
                <p className={`text-[10px] ${sub} flex-shrink-0`}>{new Date(a.resolvedAt).toLocaleDateString('fr-FR')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ASSISTANT IA MÉDECIN
   ════════════════════════════════════════════════════════════════ */
function DAssistantIA({ chronicData, consultData, statsData, loadChronic, loadConsult, loadStats, notify, card, sub, border, darkMode }) {
  const [query,    setQuery]    = useState('');
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Bonjour Docteur 👋 Je suis votre assistant médical Nova. Je peux vous aider à analyser vos dossiers patients, suggérer des suivis prioritaires et alerter sur des cas à risque. Comment puis-je vous aider ?' }
  ]);

  useEffect(() => {
    if (!chronicData) loadChronic();
    if (!consultData) loadConsult();
    if (!statsData)   loadStats();
  }, []);

  const chronic  = chronicData || [];
  const consults = consultData || [];
  const stats    = statsData || {};

  // Alertes prédictives générées côté client
  const aiAlerts = [
    ...chronic.filter(p => p.risk === 'high').map(p => ({
      level: 'critical', icon: '🚨',
      text: `${p.firstName} ${p.lastName} — ${p.chronicDiseases[0] || 'Maladie chronique'} — Pas de visite depuis ${p.daysSince ?? '?'} jours`,
    })),
    ...chronic.filter(p => p.risk === 'medium').slice(0, 3).map(p => ({
      level: 'warning', icon: '⚠️',
      text: `${p.firstName} ${p.lastName} — Suivi ${p.chronicDiseases[0] || ''} recommandé (${p.daysSince}j)`,
    })),
    ...(stats.diagnoses || []).slice(0, 2).map(d => ({
      level: 'info', icon: '📊',
      text: `Pathologie fréquente : ${d.name} (${d.count} cas). Envisagez un protocole de suivi systématique.`,
    })),
  ].slice(0, 6);

  // Réponse IA simulée
  const handleSend = () => {
    if (!query.trim()) return;
    const q = query.trim();
    setMessages(m => [...m, { role: 'user', text: q }]);
    setQuery('');
    setTimeout(() => {
      let reply = '';
      const ql = q.toLowerCase();
      if (ql.includes('hypertension') || ql.includes('tension'))
        reply = '📋 Pour l\'hypertension artérielle : contrôlez la tension à chaque visite, prescrivez un bilan rénal annuel (créatinine, protéinurie), surveillez les facteurs de risque cardiovasculaires. Recommandez une réduction du sel < 5g/j et 30min d\'activité physique quotidienne.';
      else if (ql.includes('diabète') || ql.includes('glucose') || ql.includes('glycémie'))
        reply = '🩸 Pour le diabète de type 2 : HbA1c toutes les 3 mois jusqu\'à équilibre puis tous les 6 mois. Bilan lipidique annuel. Fond d\'œil + bilan rénal annuel. Surveillance des pieds à chaque consultation. Éducation thérapeutique systématique.';
      else if (ql.includes('patient') && ql.includes('risque'))
        reply = `⚠️ J\'ai identifié ${chronic.filter(p => p.risk === 'high').length} patient(s) à risque critique parmi vos patients chroniques. Je vous recommande de les contacter en priorité pour un bilan de suivi.`;
      else if (ql.includes('consultat') || ql.includes('stats'))
        reply = `📈 Ce mois, vous avez réalisé ${stats.monthConsultations || '—'} consultations. Vos 3 pathologies les plus fréquentes : ${(stats.diagnoses || []).slice(0, 3).map(d => d.name).join(', ') || '—'}.`;
      else if (ql.includes('ordonnance') || ql.includes('prescription'))
        reply = '💊 Rappel légal : toute ordonnance doit comporter votre nom, n° RPPS, la date, le nom du patient et les médicaments avec posologie complète. La durée de validité est limitée selon les classes de médicaments (3 mois pour les stupéfiants).';
      else
        reply = `Je n\'ai pas de réponse précise pour "${q}" dans ma base de connaissances actuelle. Je vous suggère de consulter les recommandations HAS ou de créer une alerte de suivi pour ce patient.`;
      setMessages(m => [...m, { role: 'ai', text: reply }]);
    }, 800);
  };

  const levelCls = { critical: 'border-red-200 bg-red-50', warning: 'border-amber-200 bg-amber-50', info: 'border-blue-200 bg-blue-50' };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><Brain className="w-6 h-6 text-purple-600" /> Assistant IA Nova</h2>
        <p className={`text-sm ${sub}`}>Analyse clinique intelligente • Alertes prédictives</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chat IA */}
        <div className={`${card} border rounded-2xl flex flex-col`} style={{ height: '520px' }}>
          <div className={`p-4 border-b ${border} flex items-center gap-2`}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm">Nova Medical AI</p>
              <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /><span className={`text-[10px] ${sub}`}>En ligne</span></div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                  ${m.role === 'user'
                    ? 'bg-purple-600 text-white rounded-br-sm'
                    : (darkMode ? 'bg-slate-800 text-slate-100' : 'bg-slate-100 text-slate-800') + ' rounded-bl-sm'}`}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div className={`p-3 border-t ${border} flex gap-2`}>
            <input value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Posez votre question médicale..."
              className={`flex-1 px-3 py-2 rounded-xl border text-sm outline-none ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`} />
            <button onClick={handleSend} disabled={!query.trim()}
              className="px-3 py-2 rounded-xl bg-purple-600 text-white disabled:opacity-40 hover:bg-purple-700">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Alertes prédictives */}
        <div className="space-y-3">
          <div className={`${card} border rounded-2xl p-4`}>
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" /> Alertes prédictives
              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-bold ${aiAlerts.filter(a => a.level === 'critical').length > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {aiAlerts.filter(a => a.level === 'critical').length} critique{aiAlerts.filter(a => a.level === 'critical').length > 1 ? 's' : ''}
              </span>
            </h3>
            {aiAlerts.length === 0 ? (
              <p className={`text-xs ${sub} text-center py-4`}>Chargement des données...</p>
            ) : (
              <div className="space-y-2">
                {aiAlerts.map((a, i) => (
                  <div key={i} className={`border rounded-xl p-3 text-xs ${levelCls[a.level] || levelCls.info}`}>
                    <span className="mr-2">{a.icon}</span>{a.text}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Suggestions rapides */}
          <div className={`${card} border rounded-2xl p-4`}>
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" /> Questions fréquentes
            </h3>
            <div className="space-y-2">
              {['Patients à risque critique ?', 'Protocole hypertension', 'Suivi diabète type 2', 'Stats du mois'].map(q => (
                <button key={q} onClick={() => { setQuery(q); }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all
                    ${darkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
                  {q} →
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   FINANCES
   ════════════════════════════════════════════════════════════════ */
function DFinances({ data, loading, card, sub, border, darkMode }) {
  if (loading || !data) return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0,1,2,3].map(i => <div key={i} className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-28 rounded-2xl`} />)}
      </div>
      <div className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-64 rounded-2xl`} />
    </div>
  );

  const { consultationFee, totalConsultations, monthConsultations, estimatedMonthRevenue, estimatedTotalRevenue, activePrescriptions, monthlyData = [] } = data;

  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n);
  const maxRev = Math.max(...monthlyData.map(m => m.revenue), 1);

  const kpis = [
    { l: 'Revenus estimés ce mois', v: `${fmt(estimatedMonthRevenue)} FCFA`, s: `${monthConsultations} consultations`, c: 'emerald', I: TrendingUp },
    { l: 'Revenus totaux estimés',  v: `${fmt(estimatedTotalRevenue)} FCFA`, s: `${totalConsultations} consult. total`, c: 'blue',    I: BarChart3 },
    { l: 'Tarif consultation',      v: `${fmt(consultationFee)} FCFA`,       s: 'Par consultation',           c: 'red',     I: Star },
    { l: 'Ordonnances actives',     v: activePrescriptions,                   s: 'En cours de validité',       c: 'purple',  I: FileDown },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Gestion financière</h2>
        <p className={`text-sm ${sub}`}>Estimations basées sur le tarif et les consultations enregistrées</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k, i) => (
          <div key={i} className={`${card} border rounded-2xl p-4`}>
            <div className={`w-9 h-9 rounded-lg bg-${k.c}-100 flex items-center justify-center mb-2`}>
              <k.I className={`w-4 h-4 text-${k.c}-600`} />
            </div>
            <p className={`text-xs ${sub}`}>{k.l}</p>
            <p className="text-lg font-black mt-0.5 leading-tight">{k.v}</p>
            <p className={`text-xs mt-0.5 text-${k.c}-600 font-semibold`}>{k.s}</p>
          </div>
        ))}
      </div>

      {/* Graphique revenus mensuels */}
      <div className={`${card} border rounded-2xl p-5`}>
        <h3 className="font-bold mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-600" /> Revenus estimés mensuels</h3>
        {monthlyData.length === 0 ? (
          <p className={`text-sm ${sub} text-center py-8`}>Pas encore de données</p>
        ) : (
          <div className="space-y-2">
            {monthlyData.map((m, i) => (
              <div key={i} className="flex items-center gap-3">
                <p className={`text-xs font-semibold w-16 flex-shrink-0 ${sub}`}>{m.month}</p>
                <div className={`flex-1 h-7 rounded-lg overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg flex items-center px-2 transition-all"
                    style={{ width: `${(m.revenue / maxRev) * 100}%`, minWidth: m.revenue > 0 ? '2rem' : '0' }}>
                    {m.revenue > 0 && <span className="text-[10px] font-bold text-white truncate">{m.count} cons.</span>}
                  </div>
                </div>
                <p className={`text-xs font-bold w-28 text-right flex-shrink-0 ${m.revenue > 0 ? 'text-emerald-600' : sub}`}>
                  {fmt(m.revenue)} FCFA
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Note estimation */}
      <div className={`${card} border rounded-2xl p-4 flex items-start gap-3`}>
        <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${sub}`} />
        <p className={`text-xs ${sub}`}>
          Les montants affichés sont des <strong>estimations</strong> basées sur le tarif de consultation configuré ({fmt(consultationFee)} FCFA) multiplié par le nombre de consultations terminées. La gestion des paiements réels sera disponible en Phase 6.
        </p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   RÉPUTATION & AVIS
   ════════════════════════════════════════════════════════════════ */
function DReputation({ data, loading, card, sub, border, darkMode }) {
  if (loading || !data) return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {[0,1].map(i => <div key={i} className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-64 rounded-2xl`} />)}
    </div>
  );

  const { avgRating, total, distribution, ratings = [] } = data;
  const maxDist = Math.max(...distribution.map(d => d.count), 1);
  const recommend = total > 0
    ? Math.round((distribution.filter(d => d.star >= 4).reduce((s, d) => s + d.count, 0) / total) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Réputation & Avis patients</h2>
        <p className={`text-sm ${sub}`}>{total} avis reçus</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Score global */}
        <div className={`${card} border rounded-2xl p-6 flex flex-col items-center justify-center gap-3`}>
          <div className="text-6xl font-black text-amber-500">{avgRating}</div>
          <div className="flex items-center gap-1">
            {[1,2,3,4,5].map(s => (
              <Star key={s} className={`w-5 h-5 ${s <= Math.round(Number(avgRating)) ? 'fill-amber-400 text-amber-400' : sub}`} />
            ))}
          </div>
          <p className={`text-sm ${sub}`}>{total} avis • {recommend}% recommandent</p>
          <div className="grid grid-cols-3 gap-3 w-full mt-2">
            {[{ l: 'Avis 5★', v: distribution[0]?.count || 0, c: 'emerald' },
              { l: 'Avis 4★', v: distribution[1]?.count || 0, c: 'blue' },
              { l: '< 3★',   v: distribution.slice(2).reduce((s, d) => s + d.count, 0), c: 'amber' }].map((k, i) => (
              <div key={i} className={`${darkMode ? 'bg-slate-800' : 'bg-slate-50'} rounded-xl p-3 text-center`}>
                <p className={`text-xl font-black text-${k.c}-600`}>{k.v}</p>
                <p className={`text-[10px] ${sub}`}>{k.l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Distribution étoiles */}
        <div className={`${card} border rounded-2xl p-5`}>
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" /> Distribution des notes</h3>
          <div className="space-y-3">
            {distribution.map(({ star, count }) => (
              <div key={star} className="flex items-center gap-3">
                <div className="flex items-center gap-0.5 w-20 flex-shrink-0">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} className={`w-3 h-3 ${s <= star ? 'fill-amber-400 text-amber-400' : sub}`} />
                  ))}
                </div>
                <div className={`flex-1 h-5 rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all"
                    style={{ width: `${(count / maxDist) * 100}%` }} />
                </div>
                <p className={`text-xs font-bold w-8 text-right flex-shrink-0 ${sub}`}>{count}</p>
              </div>
            ))}
          </div>
          {total === 0 && <p className={`text-xs ${sub} text-center py-4`}>Aucun avis reçu pour l'instant</p>}
        </div>
      </div>

      {/* Liste des avis */}
      <div className={`${card} border rounded-2xl p-5`}>
        <h3 className="font-bold text-sm mb-4">Tous les avis ({ratings.length})</h3>
        {ratings.length === 0 ? (
          <div className="py-8 flex flex-col items-center gap-2">
            <Award className={`w-10 h-10 ${sub}`} />
            <p className={`text-sm ${sub}`}>Aucun avis patient pour le moment</p>
          </div>
        ) : (
          <div className="space-y-3">
            {ratings.map((r, i) => (
              <div key={i} className={`p-4 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white text-xs font-bold">
                      {r.patientName[0]}
                    </div>
                    <p className="font-semibold text-sm">{r.patientName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? 'fill-amber-400 text-amber-400' : sub}`} />
                      ))}
                    </div>
                    <p className={`text-xs ${sub}`}>{new Date(r.createdAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' })}</p>
                  </div>
                </div>
                {r.comment
                  ? <p className={`text-sm ${sub} italic`}>"{r.comment}"</p>
                  : <p className={`text-xs ${sub}`}>Aucun commentaire</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SIGNATURE ÉLECTRONIQUE
   ════════════════════════════════════════════════════════════════ */
function DSignature({ data, loading, onSave, notify, card, sub, border, darkMode }) {
  const canvasRef = useRef(null);
  const [drawing,      setDrawing]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [signatureData, setSignatureData] = useState(null);

  // Charger signature existante dans le canvas
  useEffect(() => {
    const sig = data?.signatureData;
    if (!sig) return;
    setSignatureData(sig);
    if (!canvasRef.current) return;
    const img = new Image();
    img.onload = () => {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
    };
    img.src = sig;
  }, [data]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const src    = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - rect.left) * scaleX, y: (src.clientY - rect.top) * scaleY };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setDrawing(true);
    setSaved(false);
  };

  const draw = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.strokeStyle = darkMode ? '#e2e8f0' : '#1e293b';
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDraw = () => setDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData(null);
    setSaved(false);
  };

  const handleSave = async () => {
    const dataUrl = canvasRef.current.toDataURL('image/png');
    setSaving(true);
    try {
      await doctorApi.saveSignature({ signatureData: dataUrl });
      setSignatureData(dataUrl);
      setSaved(true);
      notify('Signature enregistrée');
      onSave();
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-64 rounded-2xl`} />;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><Edit3 className="w-6 h-6 text-indigo-600" /> Signature électronique</h2>
        <p className={`text-sm ${sub}`}>Votre signature sera apposée automatiquement sur les ordonnances imprimées</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pad de signature */}
        <div className={`${card} border rounded-2xl p-5 space-y-4`}>
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm">Dessiner votre signature</h3>
            <button onClick={clearCanvas}
              className={`text-xs font-semibold flex items-center gap-1 px-3 py-1.5 rounded-lg border ${darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'}`}>
              <Trash2 className="w-3 h-3" /> Effacer
            </button>
          </div>
          <div className={`rounded-xl border-2 border-dashed overflow-hidden ${darkMode ? 'border-slate-600 bg-slate-800' : 'border-slate-300 bg-white'}`}>
            <canvas
              ref={canvasRef}
              width={400} height={160}
              className="w-full touch-none cursor-crosshair block"
              onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
              onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
            />
          </div>
          <p className={`text-xs ${sub} text-center`}>Signez avec votre souris ou votre doigt (écran tactile)</p>
          <button onClick={handleSave} disabled={saving}
            className={`w-full py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 transition-all
              ${saved ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
            {saving
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Enregistrement...</>
              : saved
                ? <><CheckCircle2 className="w-4 h-4" />Signature enregistrée !</>
                : <><Save className="w-4 h-4" />Enregistrer la signature</>}
          </button>
        </div>

        {/* Prévisualisation */}
        <div className={`${card} border rounded-2xl p-5 space-y-4`}>
          <h3 className="font-bold text-sm">Prévisualisation sur ordonnance</h3>
          <div className={`rounded-xl border p-4 space-y-3 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} text-sm`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold">Dr. Aïcha Touré</p>
                <p className={`text-xs ${sub}`}>Cardiologie • Abidjan</p>
              </div>
              <div className="text-right">
                <p className="font-black text-red-600 tracking-widest text-base">ORDONNANCE</p>
                <p className={`text-xs ${sub}`}>{new Date().toLocaleDateString('fr-FR')}</p>
              </div>
            </div>
            <div className={`h-px ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
            <div className={`text-xs ${sub} space-y-0.5`}>
              <p><strong>Patient :</strong> Kouamé Bamba</p>
              <p className="mt-2 font-semibold">Prescriptions :</p>
              <p>1. Amlodipine 5mg — 1cp/j — 30 jours</p>
              <p>2. Ramipril 5mg — 1cp matin — 30 jours</p>
            </div>
            <div className="flex justify-end pt-2">
              <div className="w-36 text-right">
                {signatureData ? (
                  <img src={signatureData} alt="Signature" className="h-12 ml-auto mb-1"
                    style={{ filter: darkMode ? 'invert(1)' : 'none' }} />
                ) : (
                  <div className={`h-12 flex items-end justify-center ${sub}`}>
                    <p className="text-xs italic">Signature</p>
                  </div>
                )}
                <div className={`border-t ${border} pt-1`}>
                  <p className={`text-[10px] ${sub}`}>Signature & cachet</p>
                </div>
              </div>
            </div>
          </div>
          {!signatureData && (
            <div className={`flex items-start gap-2 p-3 rounded-xl border text-xs ${darkMode ? 'bg-amber-900/20 border-amber-700/50 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Aucune signature enregistrée. Dessinez et sauvegardez pour l'afficher sur vos ordonnances.</span>
            </div>
          )}
        </div>
      </div>

      {/* Infos légales */}
      <div className={`${card} border rounded-2xl p-4`}>
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-blue-600" /> Valeur légale & Sécurité</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: '🔒', t: 'Sécurisée', d: 'Stockée chiffrée côté serveur, liée à votre compte uniquement' },
            { icon: '📋', t: 'Ordonnances', d: 'Apposée automatiquement sur toutes les ordonnances imprimées' },
            { icon: '✅', t: 'Conforme ANAM', d: 'Conforme aux exigences de l\'Autorité Nationale d\'Accréditation et de Médecine' },
          ].map((item, i) => (
            <div key={i} className={`p-3 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <p className="text-2xl mb-1">{item.icon}</p>
              <p className="font-bold text-sm">{item.t}</p>
              <p className={`text-xs ${sub} mt-0.5`}>{item.d}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
