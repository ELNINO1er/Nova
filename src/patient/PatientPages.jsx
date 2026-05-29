import React, { useEffect, useState, useRef } from 'react';
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
import { patientApi } from '../api/patientApi.js';

/* ============== PATIENT PAGES ============== */
export default function PatientPages({ page, setPage, setShowQR, pills, setPills, setShowVid, onProfileSaved, card, sub, border, darkMode }) {
  const p = { card, sub, border, darkMode };
  const [apiData, setApiData] = useState({});
  const [apiLoading, setApiLoading] = useState({});
  const [apiError, setApiError] = useState('');
  const [notice, setNotice] = useState(null);

  const notify = (message, type = 'success') => {
    setNotice({ message, type });
    window.setTimeout(() => setNotice(null), 2600);
  };

  const loadPage = (pageKey, force = false) => {
    const loaders = {
      dashboard: patientApi.dashboard,
      profile: patientApi.profile,
      pilulier: patientApi.todayMedications,
      treatments: patientApi.treatments,
      rdv: patientApi.appointments,
      vaccinations: patientApi.vaccinations,
      history: patientApi.history,
      messages: patientApi.conversations,
      documents: patientApi.documents,
      notes: patientApi.notes,
      prescriptions: patientApi.prescriptions,
      labresults: patientApi.labResults,
      dna: patientApi.medicalProfile,
      vitals: patientApi.vitals,
      doctors: patientApi.doctors,
      notifications: patientApi.notifications,
      urgence: patientApi.emergencyCard,
      wellness: patientApi.wellnessGoals,
      insurance: patientApi.insurance,
      pharmacy: patientApi.pharmacies,
      settings: patientApi.settings,
    };
    const load = loaders[pageKey];
    if (!load) return;
    if (!force && apiData[pageKey]) return;

    setApiLoading((current) => ({ ...current, [pageKey]: true }));
    load()
      .then((data) => {
        setApiData((current) => ({ ...current, [pageKey]: data }));
        setApiError('');
      })
      .catch((error) => {
        setApiError(error.message);
      })
      .finally(() => {
        setApiLoading((current) => ({ ...current, [pageKey]: false }));
      });
  };

  useEffect(() => {
    loadPage(page);
  }, [page]);

  const replacePageData = (key, value) => {
    setApiData((current) => ({ ...current, [key]: value }));
  };
  const replacePageDataAndRefreshDashboard = (key, value) => {
    setApiData((current) => ({ ...current, [key]: value, dashboard: undefined }));
  };
  const refreshDashboard = () => loadPage('dashboard', true);
  const retryCurrentPage = () => { setApiError(''); loadPage(page, true); };

  const map = {
    dashboard: <PDash data={apiData.dashboard} loading={apiLoading.dashboard} onRefresh={refreshDashboard} setPage={setPage} setShowQR={setShowQR} setShowVid={setShowVid} {...p} />,
    profile: <PProfile data={apiData.profile} onSaved={(value) => {
      replacePageData('profile', value);
      onProfileSaved?.(value);
      notify('Profil enregistré');
      setApiData((current) => ({
        ...current,
        profile: value,
        dashboard: current.dashboard ? { ...current.dashboard, profile: value } : current.dashboard,
      }));
    }} {...p} />,
    pilulier: <PPilulier data={apiData.pilulier} onReload={(value) => replacePageDataAndRefreshDashboard('pilulier', value)} notify={notify} pills={pills} setPills={setPills} {...p} />,
    treatments: <PTreatments data={apiData.treatments} {...p} />,
    rdv: <PRDV data={apiData.rdv} onReload={(value) => replacePageDataAndRefreshDashboard('rdv', value)} notify={notify} setShowVid={setShowVid} {...p} />,
    vaccinations: <PVax data={apiData.vaccinations} {...p} />,
    dna: <PDNA data={apiData.dna} profile={apiData.profile || apiData.dashboard?.profile} onReload={(value) => replacePageData('dna', value)} notify={notify} {...p} />,
    history: <PHistory data={apiData.history} {...p} />,
    messages: <PMsg data={apiData.messages} setShowVid={setShowVid} {...p} />,
    documents: <PDocs data={apiData.documents} onReload={(value) => replacePageDataAndRefreshDashboard('documents', value)} notify={notify} {...p} />,
    notes: <PNotes data={apiData.notes} onReload={(value) => replacePageData('notes', value)} notify={notify} {...p} />,
    prescriptions: <POrdonnances data={apiData.prescriptions} {...p} />,
    labresults: <PLabResults data={apiData.labresults} {...p} />,
    vitals: <PVitals data={apiData.vitals} onAddVital={(v) => replacePageData('vitals', v)} notify={notify} {...p} />,
    doctors: <PDoctors data={apiData.doctors} onBooked={() => { loadPage('rdv', true); loadPage('notifications', true); }} notify={notify} setPage={setPage} {...p} />,
    notifications: <PNotifications data={apiData.notifications} onReload={(v) => replacePageData('notifications', v)} notify={notify} setPage={setPage} {...p} />,
    urgence: <PUrgence data={apiData.urgence} {...p} />,
    assistant: <PAssistant patientData={apiData.dashboard} {...p} />,
    wellness: <PWell data={apiData.wellness} onReload={(v) => replacePageData('wellness', v)} notify={notify} {...p} />,
    insurance: <PInsurance data={apiData.insurance} {...p} />,
    pharmacy: <PPharmacy data={apiData.pharmacy} notify={notify} {...p} />,
    settings: <SettingsPage data={apiData.settings} {...p} />
  };
  return (
    <>
      {apiError && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>API indisponible — {apiError}</span>
          </div>
          <button onClick={retryCurrentPage} className="px-3 py-1 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 flex-shrink-0">
            Réessayer
          </button>
        </div>
      )}
      {notice && (
        <div className={`fixed right-5 top-20 z-[70] rounded-xl border px-4 py-3 text-xs font-bold shadow-xl ${notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
          {notice.message}
        </div>
      )}
      {map[page] || map.dashboard}
    </>
  );
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatShortDayMonth(value) {
  if (!value) return '';
  const parts = new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
  }).replace('.', '').split(' ');
  return `${parts[0]} ${capitalize(parts[1] || '')}`;
}

function formatShortDate(value) {
  if (!value) return '';
  const d = new Date(value);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function formatDateFull(value) {
  if (!value) return '';
  const d = new Date(value + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatRelativeDate(value) {
  if (!value) return '';
  const date = new Date(value);
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (diffDays <= 0) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Hier';
  return `${diffDays} jours`;
}

function formatBytes(value = 0) {
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.round(value / 1024)} KB`;
}

function initials(value = '') {
  return value
    .replace(/^Dr\.\s*/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'DR';
}

function mapDocumentCategory(category) {
  const map = {
    prescription: 'ordonnance',
    lab: 'analyse',
    vaccine: 'certificat',
  };
  return map[category] || category || 'consultation';
}

function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function dashboardStatusText(status) {
  if (status === 'critical') return 'Critique';
  if (status === 'watch') return 'A surveiller';
  return 'Normal';
}

function dashboardStatusClass(status) {
  if (status === 'critical') return 'text-red-600';
  if (status === 'watch') return 'text-amber-600';
  return 'text-emerald-600';
}

function PatientModal({ title, onClose, children, card, darkMode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-slate-950/45" onClick={onClose} aria-label="Fermer"></button>
      <div className={`relative w-full max-w-3xl ${card} border rounded-2xl shadow-2xl overflow-hidden`}>
        <div className={`flex items-center justify-between px-5 py-4 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <h3 className="font-bold">{title}</h3>
          <button onClick={onClose} className={`w-9 h-9 rounded-lg flex items-center justify-center ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">
          {children}
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog({ title, message, onCancel, onConfirm, card, darkMode }) {
  return (
    <PatientModal title={title} onClose={onCancel} card={card} darkMode={darkMode}>
      <p className="text-sm text-slate-600 mb-5">{message}</p>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className={`px-4 py-2 rounded-lg border text-sm font-semibold ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>Annuler</button>
        <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold">Confirmer</button>
      </div>
    </PatientModal>
  );
}

function DashSkeleton({ card, sub, darkMode }) {
  const pulse = 'animate-pulse rounded-lg';
  const block = darkMode ? 'bg-slate-700' : 'bg-slate-200';
  return (
    <div className="space-y-5">
      <div className={`${pulse} h-36 ${darkMode ? 'bg-slate-800' : 'bg-red-100'} rounded-2xl`}></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`${card} border rounded-2xl p-6`}><div className={`${pulse} ${block} h-44 w-44 rounded-full mx-auto`}></div></div>
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[0,1,2,3].map(i => <div key={i} className={`${card} border rounded-2xl p-5`}><div className={`${pulse} ${block} h-6 w-20 mb-2`}></div><div className={`${pulse} ${block} h-8 w-28 mb-3`}></div><div className={`${pulse} ${block} h-12 w-full`}></div></div>)}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[0,1,2,3].map(i => <div key={i} className={`${card} border rounded-xl p-4 min-h-[92px]`}><div className={`${pulse} ${block} h-10 w-10 rounded-lg mb-3`}></div><div className={`${pulse} ${block} h-4 w-24`}></div></div>)}
      </div>
    </div>
  );
}

function PDash({ data, loading, onRefresh, setPage, setShowQR, setShowVid, card, sub, darkMode }) {
  if (!data && loading !== false) return <DashSkeleton card={card} sub={sub} darkMode={darkMode} />;

  const vitalMeta = {
    blood_pressure: { label: 'Tension', Icon: Heart, color: 'red' },
    blood_glucose: { label: 'Glycémie', Icon: Droplet, color: 'blue' },
    heart_rate: { label: 'Fréquence', Icon: Activity, color: 'pink' },
    temperature: { label: 'Température', Icon: Thermometer, color: 'orange' },
  };
  const cm = { red: '#dc2626', blue: '#2563eb', pink: '#db2777', orange: '#ea580c' };

  const displayVitals = (data?.latestVitals || []).map((vital) => {
    const meta = vitalMeta[vital.type] || { label: vital.label, Icon: Activity, color: 'blue' };
    return {
      type: vital.type,
      label: meta.label,
      value: String(vital.value),
      unit: vital.unit || '',
      Icon: meta.Icon,
      color: meta.color,
      history: vital.history?.map((p) => p.value).filter(Number.isFinite) || [],
      status: vital.status,
      measuredAt: vital.measuredAt,
    };
  });

  const profile = data?.profile;
  const patientName = profile ? `${profile.firstName} ${profile.lastName}` : '—';
  const patientInitials = profile
    ? `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase()
    : '—';
  const patientLocation = profile ? `CMU: ${profile.cmuNumber} — ${profile.city}` : '';

  const healthScore = data?.healthScore ?? 0;
  const healthStatus = healthScore >= 80 ? 'normal' : healthScore >= 60 ? 'watch' : 'critical';
  const healthScoreLabel = healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'À surveiller' : 'Critique';
  const scoreDash = `${Math.round((healthScore / 100) * 264)} 264`;

  const remainingMedications = data?.todayMedications
    ? data.todayMedications.filter((m) => m.intake?.status !== 'taken').length
    : 0;
  const unreadMessages = data?.unreadMessages ?? 0;
  const documentsCount = data?.documentsCount ?? 0;

  const nextRdv = data?.nextAppointment;
  const hasVideoRdv = nextRdv?.mode === 'video';

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-br from-red-600 via-red-700 to-red-800 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/20 rounded-full -translate-y-32 translate-x-32 blur-3xl"></div>
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-xl font-bold border border-white/30">
              {patientInitials}
            </div>
            <div>
              <p className="text-red-100 text-sm">Bonjour</p>
              <h2 className="text-2xl md:text-3xl font-bold">{patientName}</h2>
              {patientLocation && <p className="text-red-100 text-sm mt-1">{patientLocation}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button onClick={onRefresh} className="bg-white/20 backdrop-blur text-white px-3 py-3 rounded-xl font-semibold flex items-center gap-2 hover:bg-white/30 transition-colors" title="Rafraîchir">
                <Activity className="w-4 h-4" />
              </button>
            )}
            <button onClick={() => setShowQR(true)} className="bg-white text-red-700 px-5 py-3 rounded-xl font-semibold flex items-center gap-2 hover:scale-105 transition-transform shadow-xl">
              <Siren className="w-4 h-4" /> Pass Santé d'urgence
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`lg:col-span-1 ${card} border rounded-2xl p-6`}>
          <div className="flex items-center justify-between mb-4">
            <p className={`text-xs ${sub}`}>Score de Santé</p>
          </div>
          <div className="flex items-center justify-center py-4">
            <div className="relative w-44 h-44">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke={darkMode ? '#1e293b' : '#e2e8f0'} strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="url(#hg)" strokeWidth="8" strokeDasharray={scoreDash} strokeLinecap="round" />
                <defs><linearGradient id="hg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#dc2626" /><stop offset="100%" stopColor="#f97316" /></linearGradient></defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold">{healthScore}</span>
                <span className={`text-xs ${sub}`}>/ 100</span>
                <span className={`text-xs font-semibold mt-1 ${dashboardStatusClass(healthStatus)}`}>{healthScoreLabel}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {displayVitals.length > 0 ? displayVitals.map((vital) => {
            const hasHistory = vital.history.length >= 2;
            const pts = hasHistory
              ? (() => { const mx = Math.max(...vital.history), mn = Math.min(...vital.history), r = mx - mn || 1; return vital.history.map((v, idx) => `${(idx/(vital.history.length-1))*100},${100 - ((v-mn)/r)*80 - 10}`).join(' '); })()
              : '';
            return (
              <button key={vital.type} onClick={() => setPage('treatments')} className={`${card} border rounded-2xl p-5 text-left hover:shadow-md transition-shadow`}>
                <div className="flex items-center justify-between mb-1">
                  <p className={`text-xs ${sub}`}>{vital.label}</p>
                  <vital.Icon className={`w-4 h-4 ${sub}`} />
                </div>
                <p className="text-2xl font-bold">{vital.value} <span className={`text-sm font-normal ${sub}`}>{vital.unit}</span></p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className={`text-[10px] font-bold ${dashboardStatusClass(vital.status)}`}>{dashboardStatusText(vital.status)}</span>
                  {vital.measuredAt && <span className={`text-[10px] ${sub}`}>{formatRelativeDate(vital.measuredAt)}</span>}
                </div>
                {hasHistory && (
                  <div className="mt-3 h-12">
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                      <polyline points={pts} fill="none" stroke={cm[vital.color]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </button>
            );
          }) : (
            <div className={`sm:col-span-2 ${card} border rounded-2xl p-8 flex flex-col items-center justify-center text-center`}>
              <HeartPulse className={`w-10 h-10 ${sub} mb-3`} />
              <p className={`text-sm font-semibold ${sub}`}>Aucune constante enregistrée</p>
              <p className={`text-xs ${sub} mt-1`}>Vos données apparaîtront ici après votre première consultation.</p>
            </div>
          )}
        </div>
      </div>

      {nextRdv && (
        <div className={`${card} border rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4`}>
          <div className={`w-14 h-14 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-red-50'} flex flex-col items-center justify-center flex-shrink-0`}>
            <span className="text-lg font-bold">{new Date(nextRdv.startsAt).getDate()}</span>
            <span className={`text-[10px] ${sub}`}>{capitalize(new Date(nextRdv.startsAt).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''))}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-red-600 flex-shrink-0" />
              <h4 className="font-bold truncate">Prochain rendez-vous</h4>
            </div>
            <p className={`text-sm ${sub} mt-0.5`}>{nextRdv.doctorName} — {nextRdv.specialty}</p>
            <p className={`text-xs ${sub}`}>{new Date(nextRdv.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} • {nextRdv.location}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {nextRdv.mode === 'video' && (
              <button onClick={() => setShowVid(true)} className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-red-700">
                <Video className="w-3.5 h-3.5" /> Rejoindre
              </button>
            )}
            <button onClick={() => setPage('rdv')} className={`px-4 py-2 rounded-lg border text-xs font-semibold ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>
              Voir tout
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          hasVideoRdv
            ? {I:Video,l:'Téléconsultation',c:'from-blue-500 to-blue-600',on:() => setShowVid(true)}
            : {I:Video,l:'Téléconsultation',c:'from-slate-400 to-slate-500',on:() => setPage('rdv'),disabled:true},
          {I:Bell,l:`${remainingMedications} Rappel${remainingMedications > 1 ? 's' : ''}`,c:'from-orange-500 to-orange-600',on:() => setPage('pilulier')},
          {I:MessageCircle,l:`${unreadMessages} Message${unreadMessages > 1 ? 's' : ''}`,c:'from-purple-500 to-purple-600',on:() => setPage('messages')},
          {I:FileText,l:`${documentsCount} Document${documentsCount > 1 ? 's' : ''}`,c:'from-emerald-500 to-emerald-600',on:() => setPage('documents')}
        ].map((a, i) => (
          <button key={i} onClick={a.on} className={`${card} border rounded-xl p-4 min-h-[92px] flex flex-col items-start gap-3 text-left hover:scale-105 transition-transform ${a.disabled ? 'opacity-50' : ''}`}>
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

function PProfile({ data, onSaved, card, sub, border, darkMode }) {
  const [edit, setEdit] = useState(false);
  const [d, setD] = useState({
    firstName: '', lastName: '', birthDate: '', sex: '',
    cmu: '', phone: '', email: '',
    address: '', city: '',
    bloodType: '', weight: '', height: '',
    eName: '', eRel: '', ePhone: '',
  });

  useEffect(() => {
    if (!data) return;
    setD({
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      birthDate: data.birthDate || '',
      sex: data.sex || '',
      cmu: data.cmuNumber || '',
      phone: data.phone || '',
      email: data.email || '',
      address: data.address || '',
      city: data.city || '',
      bloodType: data.bloodType || '',
      weight: data.weightKg ? String(data.weightKg) : '',
      height: data.heightCm ? String(data.heightCm) : '',
      eName: data.emergencyContact?.name || '',
      eRel: data.emergencyContact?.relationship || '',
      ePhone: data.emergencyContact?.phone || '',
    });
  }, [data]);

  const profileInitials = `${d.firstName?.[0] || ''}${d.lastName?.[0] || ''}`.toUpperCase() || '—';
  const profileAge = d.birthDate ? Math.floor((Date.now() - new Date(d.birthDate).getTime()) / 31557600000) : null;

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const inputCls = `mt-1.5 w-full px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'} focus:outline-none focus:ring-2 focus:ring-red-500`;

  const saveProfile = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const updated = await patientApi.updateProfile({
        firstName:             d.firstName,
        lastName:              d.lastName,
        birthDate:             d.birthDate || undefined,
        sex:                   d.sex       || undefined,
        bloodType:             d.bloodType || undefined,
        phone:                 d.phone     || undefined,
        email:                 d.email     || undefined,
        address:               d.address   || undefined,
        city:                  d.city      || undefined,
        weightKg:              Number(d.weight) || undefined,
        heightCm:              Number(d.height) || undefined,
        emergencyName:         d.eName     || undefined,
        emergencyRelationship: d.eRel      || undefined,
        emergencyPhone:        d.ePhone    || undefined,
      });
      onSaved?.(updated);
      setEdit(false);
    } catch (error) {
      setSaveError(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (!data) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse bg-red-100 rounded-2xl h-40"></div>
        {[0,1,2,3].map(i => <div key={i} className={`${card} border rounded-2xl p-6`}><div className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-32 rounded-lg`}></div></div>)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-2xl p-6 text-white flex flex-col md:flex-row md:items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-400/20 rounded-full -translate-y-24 translate-x-24 blur-2xl"></div>
        <div className="relative w-24 h-24 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl font-bold border-2 border-white/30">{profileInitials}</div>
        <div className="relative flex-1">
          <h2 className="text-2xl font-bold">{d.firstName} {d.lastName}</h2>
          <p className="text-red-100 text-sm font-mono">{d.cmu}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {d.bloodType && <span className="px-2 py-1 rounded-full bg-white/20 text-xs font-semibold">{d.bloodType}</span>}
            {profileAge !== null && <span className="px-2 py-1 rounded-full bg-white/20 text-xs font-semibold">{profileAge} ans</span>}
            {d.city && <span className="px-2 py-1 rounded-full bg-white/20 text-xs font-semibold">{d.city}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {saveError && <p className="text-xs text-red-200 bg-red-900/40 px-3 py-1 rounded-lg max-w-xs text-right">{saveError}</p>}
          <div className="flex gap-2">
            {edit && <button onClick={() => { setEdit(false); setSaveError(''); }} className="relative bg-white/20 text-white px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 hover:scale-105 shadow">
              <X className="w-4 h-4" /> Annuler
            </button>}
            <button onClick={() => edit ? saveProfile() : setEdit(true)} disabled={saving} className="relative bg-white text-red-700 px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 hover:scale-105 shadow-lg disabled:opacity-50">
              {edit ? <><Save className="w-4 h-4" /> {saving ? 'Sauvegarde...' : 'Enregistrer'}</> : <><Edit3 className="w-4 h-4" /> Modifier</>}
            </button>
          </div>
        </div>
      </div>

      <div className={`${card} border rounded-2xl p-6`}>
        <h3 className="font-bold mb-4 flex items-center gap-2"><User className="w-4 h-4 text-red-600" /> Informations personnelles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`text-[11px] font-bold uppercase tracking-wider ${sub}`}>Prénom</label>
            {edit ? <input value={d.firstName} onChange={(e) => setD({ ...d, firstName: e.target.value })} className={inputCls} /> : <p className="mt-1.5 text-sm font-semibold py-2">{d.firstName || '—'}</p>}
          </div>
          <div>
            <label className={`text-[11px] font-bold uppercase tracking-wider ${sub}`}>Nom</label>
            {edit ? <input value={d.lastName} onChange={(e) => setD({ ...d, lastName: e.target.value })} className={inputCls} /> : <p className="mt-1.5 text-sm font-semibold py-2">{d.lastName || '—'}</p>}
          </div>
          <div>
            <label className={`text-[11px] font-bold uppercase tracking-wider ${sub} flex items-center gap-1`}><Calendar className="w-3 h-3" /> Date de naissance</label>
            {edit ? <input type="date" value={d.birthDate} onChange={(e) => setD({ ...d, birthDate: e.target.value })} className={inputCls} /> : <p className="mt-1.5 text-sm font-semibold py-2">{d.birthDate || '—'}</p>}
          </div>
          <div>
            <label className={`text-[11px] font-bold uppercase tracking-wider ${sub}`}>Sexe</label>
            {edit ? <input value={d.sex} onChange={(e) => setD({ ...d, sex: e.target.value })} className={inputCls} /> : <p className="mt-1.5 text-sm font-semibold py-2">{d.sex || '—'}</p>}
          </div>
          <div>
            <label className={`text-[11px] font-bold uppercase tracking-wider ${sub}`}>N° CMU</label>
            <p className="mt-1.5 text-sm font-semibold py-2">{d.cmu || '—'}</p>
          </div>
        </div>
      </div>

      <div className={`${card} border rounded-2xl p-6`}>
        <h3 className="font-bold mb-4 flex items-center gap-2"><Phone className="w-4 h-4 text-red-600" /> Coordonnées</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`text-[11px] font-bold uppercase tracking-wider ${sub} flex items-center gap-1`}><Smartphone className="w-3 h-3" /> Téléphone</label>
            {edit ? <input value={d.phone} onChange={(e) => setD({ ...d, phone: e.target.value })} className={inputCls} /> : <p className="mt-1.5 text-sm font-semibold py-2">{d.phone || '—'}</p>}
          </div>
          <div>
            <label className={`text-[11px] font-bold uppercase tracking-wider ${sub} flex items-center gap-1`}><Mail className="w-3 h-3" /> Email</label>
            {edit ? <input value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} className={inputCls} /> : <p className="mt-1.5 text-sm font-semibold py-2">{d.email || '—'}</p>}
          </div>
          <div className="md:col-span-2">
            <label className={`text-[11px] font-bold uppercase tracking-wider ${sub} flex items-center gap-1`}><MapPin className="w-3 h-3" /> Adresse</label>
            {edit ? <input value={d.address} onChange={(e) => setD({ ...d, address: e.target.value })} className={inputCls} /> : <p className="mt-1.5 text-sm font-semibold py-2">{d.address || '—'}</p>}
          </div>
          <div>
            <label className={`text-[11px] font-bold uppercase tracking-wider ${sub}`}>Ville</label>
            {edit ? <input value={d.city} onChange={(e) => setD({ ...d, city: e.target.value })} className={inputCls} /> : <p className="mt-1.5 text-sm font-semibold py-2">{d.city || '—'}</p>}
          </div>
        </div>
      </div>

      <div className={`${card} border rounded-2xl p-6`}>
        <h3 className="font-bold mb-4 flex items-center gap-2"><Heart className="w-4 h-4 text-red-600" /> Données médicales</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={`text-[11px] font-bold uppercase tracking-wider ${sub}`}>Groupe sanguin</label>
            {edit ? <input value={d.bloodType} onChange={(e) => setD({ ...d, bloodType: e.target.value })} className={inputCls} /> : <p className="mt-1.5 text-sm font-semibold py-2">{d.bloodType || '—'}</p>}
          </div>
          <div>
            <label className={`text-[11px] font-bold uppercase tracking-wider ${sub}`}>Poids (kg)</label>
            {edit ? <input value={d.weight} onChange={(e) => setD({ ...d, weight: e.target.value })} className={inputCls} /> : <p className="mt-1.5 text-sm font-semibold py-2">{d.weight || '—'}</p>}
          </div>
          <div>
            <label className={`text-[11px] font-bold uppercase tracking-wider ${sub}`}>Taille (cm)</label>
            {edit ? <input value={d.height} onChange={(e) => setD({ ...d, height: e.target.value })} className={inputCls} /> : <p className="mt-1.5 text-sm font-semibold py-2">{d.height || '—'}</p>}
          </div>
        </div>
      </div>

      <div className={`${card} border rounded-2xl p-6`}>
        <h3 className="font-bold mb-4 flex items-center gap-2"><Siren className="w-4 h-4 text-red-600" /> Contact d'urgence</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={`text-[11px] font-bold uppercase tracking-wider ${sub}`}>Nom</label>
            {edit ? <input value={d.eName} onChange={(e) => setD({ ...d, eName: e.target.value })} className={inputCls} /> : <p className="mt-1.5 text-sm font-semibold py-2">{d.eName || '—'}</p>}
          </div>
          <div>
            <label className={`text-[11px] font-bold uppercase tracking-wider ${sub}`}>Lien</label>
            {edit ? <input value={d.eRel} onChange={(e) => setD({ ...d, eRel: e.target.value })} className={inputCls} /> : <p className="mt-1.5 text-sm font-semibold py-2">{d.eRel || '—'}</p>}
          </div>
          <div>
            <label className={`text-[11px] font-bold uppercase tracking-wider ${sub}`}>Téléphone</label>
            {edit ? <input value={d.ePhone} onChange={(e) => setD({ ...d, ePhone: e.target.value })} className={inputCls} /> : <p className="mt-1.5 text-sm font-semibold py-2">{d.ePhone || '—'}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function PPilulier({ data, onReload, notify, pills, setPills, card, sub, darkMode }) {
  const pillColorMap = { blue: 'bg-blue-500', emerald: 'bg-emerald-500', red: 'bg-red-500', amber: 'bg-amber-500', purple: 'bg-purple-500' };
  const meds = data?.length ? data.map((item) => ({
    id: item.id,
    n: item.name,
    d: item.dosage,
    t: item.time,
    p: item.period,
    c: pillColorMap[item.color] || 'bg-blue-500',
    i: item.interaction,
    status: item.intake?.status || 'pending',
  })) : [];
  useEffect(() => {
    if (!data?.length) return;
    const statuses = {};
    data.forEach((item) => { statuses[item.id] = item.intake?.status || 'pending'; });
    setPills(statuses);
  }, [data, setPills]);
  const cnt = Object.values(pills).filter((status) => status === 'taken' || status === true).length;
  const missed = Object.values(pills).filter((status) => status === 'missed').length;
  const obs = meds.length ? Math.round((cnt / meds.length) * 100) : 0;
  const obsLabel = obs >= 80 ? 'Excellent' : obs >= 50 ? 'À améliorer' : obs > 0 ? 'Insuffisant' : '—';
  const obsColor = obs >= 80 ? 'text-emerald-600' : obs >= 50 ? 'text-amber-600' : 'text-red-600';
  const obsBadge = obs >= 80 ? 'bg-emerald-100 text-emerald-700' : obs >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
  const nextDue = meds.find((med) => !['taken', 'skipped', 'missed'].includes(pills[med.id] || med.status));
  const interactionMeds = meds.filter((m) => m.i);
  const markMedicationStatus = async (id, status) => {
    setPills({ ...pills, [id]: status });
    try {
      await patientApi.markMedication(id, { status });
      onReload?.(await patientApi.todayMedications());
      notify?.('Pilulier mis à jour');
    } catch (error) {
      notify?.(error.message || 'Erreur pilulier', 'error');
    }
  };

  if (!data) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Pilulier Numérique</h2>
        <div className={`${card} border rounded-2xl p-8`}>
          <div className="animate-pulse space-y-4">
            {[0,1,2].map(i => <div key={i} className={`h-16 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}></div>)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Pilulier Numérique</h2>
      {meds.length === 0 ? (
        <div className={`${card} border rounded-2xl p-12 flex flex-col items-center justify-center text-center`}>
          <Pill className={`w-12 h-12 ${sub} mb-4`} />
          <p className="font-semibold">Aucun médicament programmé</p>
          <p className={`text-xs ${sub} mt-1`}>Vos prises apparaîtront ici une fois prescrites par votre médecin.</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`lg:col-span-2 ${card} border rounded-2xl p-6`}>
          <div className="flex items-center justify-between mb-6">
            <div><h3 className="font-bold text-lg">Aujourd'hui</h3><p className={`text-xs ${sub}`}>{cnt} / {meds.length} pris{missed ? ` — ${missed} oublié${missed > 1 ? 's' : ''}` : ''}</p></div>
            <span className="text-xs font-semibold text-red-600 flex items-center gap-1"><Bell className="w-3 h-3" /> Prochain {nextDue?.t || 'terminé'}</span>
          </div>
          <div className={`h-2 rounded-full ${darkMode ? 'bg-slate-800' : 'bg-slate-200'} mb-6 overflow-hidden`}>
            <div className="h-full bg-gradient-to-r from-red-600 to-red-500" style={{ width: `${obs}%` }}></div>
          </div>
          <div className="space-y-4">
            {['Matin','Midi','Soir'].map(per => {
              const pm = meds.filter(m => m.p === per);
              if (!pm.length) return null;
              const pending = pm.filter(m => !['taken','missed','skipped'].includes(pills[m.id] || m.status));
              const done    = pm.filter(m =>  ['taken','missed','skipped'].includes(pills[m.id] || m.status));
              return (
                <div key={per}>
                  <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
                    {per === 'Soir' ? <Moon className="w-4 h-4 text-indigo-500" /> : <Sun className="w-4 h-4 text-amber-500" />}
                    {per} • {pm[0].t}
                    {pending.length === 0 && <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/>Terminé</span>}
                  </h4>
                  <div className="space-y-2">
                    {pm.map(m => {
                      const status = pills[m.id] || m.status || 'pending';
                      const isTaken = status === 'taken' || status === true;
                      const skipped = status === 'skipped';
                      const isMissed = status === 'missed';
                      const isDone = isTaken || skipped || isMissed;
                      return (
                      <div key={m.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isTaken ? 'bg-emerald-50 border-emerald-200' : isMissed ? 'bg-red-50 border-red-200' : skipped ? (darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200') : darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} ${isDone ? 'opacity-60' : ''}`}>
                        <div className={`w-2 h-12 rounded-full ${m.c} ${isDone ? 'opacity-50' : ''}`}></div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`font-semibold text-sm ${isDone ? 'line-through text-slate-400' : ''}`}>{m.n}</p>
                            {m.i && !isDone && <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Interaction</span>}
                          </div>
                          <p className={`text-xs ${sub}`}>{m.d} • {m.t}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => markMedicationStatus(m.id, 'taken')} className={`w-9 h-9 rounded-full flex items-center justify-center ${isTaken ? 'bg-emerald-600 text-white' : darkMode ? 'bg-slate-700' : 'bg-slate-100'}`} title="Pris">
                            <Check className="w-4 h-4" strokeWidth={3} />
                          </button>
                          <button onClick={() => markMedicationStatus(m.id, 'missed')} className={`w-9 h-9 rounded-full flex items-center justify-center ${isMissed ? 'bg-red-600 text-white' : darkMode ? 'bg-slate-700' : 'bg-slate-100'}`} title="Oublié">
                            <X className="w-4 h-4" strokeWidth={3} />
                          </button>
                          <button onClick={() => markMedicationStatus(m.id, 'skipped')} className={`w-9 h-9 rounded-full flex items-center justify-center ${skipped ? 'bg-slate-600 text-white' : darkMode ? 'bg-slate-700' : 'bg-slate-100'}`} title="Ignoré">
                            <Clock className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );})}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="space-y-4">
          <div className={`${card} border rounded-2xl p-6 text-center`}>
            <Award className="w-5 h-5 text-amber-500 mx-auto mb-2" />
            <p className={`text-5xl font-bold ${obsColor}`}>{obs}<span className="text-2xl">%</span></p>
            <p className={`text-xs ${sub} mt-2`}>Observance du jour</p>
            <span className={`inline-block mt-3 px-3 py-1 rounded-full text-xs font-bold ${obsBadge}`}>{obsLabel}</span>
          </div>
          {interactionMeds.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-red-900">Interaction détectée</h4>
                  <p className="text-xs mt-1 text-red-800">{interactionMeds.map(m => m.n).join(', ')} — Consultez votre médecin</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}

function PTreatments({ data, card, sub, darkMode }) {
  const colorMap = { red: { bar: 'bg-red-500', barGrad: 'bg-red-500', badge: 'bg-red-100 text-red-700' }, blue: { bar: 'bg-blue-500', barGrad: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700' }, emerald: { bar: 'bg-emerald-500', barGrad: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700' }, amber: { bar: 'bg-amber-500', barGrad: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700' } };
  const colorKeys = ['red', 'blue', 'emerald', 'amber'];
  const ts = data?.length ? data.map((t, index) => {
    const c = colorKeys[index % colorKeys.length];
    return {
      n: t.diagnosis,
      s: t.stage || capitalize(t.status),
      pr: t.progress || 0,
      du: t.startedAt ? `Depuis ${formatDate(t.startedAt)}` : 'En cours',
      dr: t.doctorName || 'Médecin référent',
      m: t.medications?.map((m) => `${m.name} ${m.dosage || ''}`.trim()) || [],
      nc: t.nextCheckupAt ? formatDate(t.nextCheckupAt) : 'À planifier',
      c,
    };
  }) : [];

  if (!data) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Mes Traitements</h2>
        {[0,1].map(i => <div key={i} className={`${card} border rounded-2xl p-6`}><div className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-40 rounded-lg`}></div></div>)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className="text-2xl font-bold">Mes Traitements</h2><p className={`text-sm ${sub}`}>Suivi de pathologies en cours</p></div>
        <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">{ts.length} actif{ts.length > 1 ? 's' : ''}</span>
      </div>
      {ts.length === 0 && (
        <div className={`${card} border rounded-2xl p-12 flex flex-col items-center justify-center text-center`}>
          <HeartPulse className={`w-12 h-12 ${sub} mb-4`} />
          <p className="font-semibold">Aucun traitement en cours</p>
          <p className={`text-xs ${sub} mt-1`}>Vos traitements apparaîtront ici une fois prescrits.</p>
        </div>
      )}
      {ts.map((t, i) => {
        const colors = colorMap[t.c] || colorMap.red;
        return (
        <div key={i} className={`${card} border rounded-2xl p-6 relative overflow-hidden`}>
          <div className={`absolute top-0 left-0 w-1 h-full ${colors.bar}`}></div>
          <div className="space-y-4 pl-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-bold">{t.n}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${colors.badge}`}>{t.s}</span>
              </div>
              <p className={`text-xs ${sub}`}>{t.du} • {t.dr}</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5"><span className="text-xs font-semibold">Progression</span><span className="text-xs font-bold">{t.pr}%</span></div>
              <div className={`h-2 rounded-full ${darkMode ? 'bg-slate-800' : 'bg-slate-200'} overflow-hidden`}>
                <div className={`h-full ${colors.barGrad}`} style={{ width: `${t.pr}%` }}></div>
              </div>
            </div>
            {t.m.length > 0 && (
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
            )}
            <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'} flex items-center gap-3`}>
              <CalendarClock className="w-5 h-5 text-red-600" />
              <div className="flex-1"><p className="text-xs font-bold">Prochain contrôle</p><p className={`text-xs ${sub}`}>{t.nc}</p></div>
            </div>
          </div>
        </div>
      );})}
    </div>
  );
}

function PRDV({ data, onReload, notify, card, sub, darkMode, setShowVid }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [form, setForm] = useState({
    startsAt: '2026-06-01T09:00',
    doctorName: 'Dr. Aïcha Touré',
    specialty: 'Médecine générale',
    location: 'CHU Treichville',
    mode: 'onsite',
  });
  const rs = data?.length ? data.map((r) => {
    const date = new Date(r.startsAt);
    const daysLeft = Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86400000));
    return {
      d: formatShortDayMonth(r.startsAt),
      t: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      dr: r.doctorName,
      sp: r.specialty,
      l: r.location,
      dl: daysLeft,
      v: r.mode === 'video',
      id: r.id,
      startsAt: r.startsAt,
      status: r.status,
      mode: r.mode,
    };
  }) : [];
  const resetRdvForm = () => {
    setEditingId(null);
    setForm({ startsAt: '2026-06-01T09:00', doctorName: 'Dr. Aïcha Touré', specialty: 'Médecine générale', location: 'CHU Treichville', mode: 'onsite' });
  };
  const openEditRdv = (rdv) => {
    setEditingId(rdv.id);
    setForm({
      startsAt: rdv.startsAt ? rdv.startsAt.slice(0, 16) : '2026-06-01T09:00',
      doctorName: rdv.dr,
      specialty: rdv.sp,
      location: rdv.l,
      mode: rdv.mode || (rdv.v ? 'video' : 'onsite'),
    });
    setShowForm(true);
  };
  const saveRdv = async () => {
    const payload = {
      ...form,
      startsAt: new Date(form.startsAt).toISOString(),
      status: 'requested',
    };
    try {
      if (editingId) await patientApi.updateAppointment(editingId, payload);
      else await patientApi.createAppointment(payload);
      onReload?.(await patientApi.appointments());
      notify?.(editingId ? 'Rendez-vous modifié' : 'Rendez-vous créé');
      setShowForm(false);
      resetRdvForm();
    } catch (error) {
      notify?.(error.message || 'Erreur rendez-vous', 'error');
    }
  };
  const deleteRdv = async (id) => {
    if (!id) return;
    try {
      await patientApi.deleteAppointment(id);
      onReload?.(await patientApi.appointments());
      notify?.('Rendez-vous supprimé');
      setPendingDelete(null);
    } catch (error) {
      notify?.(error.message || 'Erreur suppression', 'error');
    }
  };

  if (!data) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Mes Rendez-vous</h2>
        {[0,1,2].map(i => <div key={i} className={`${card} border rounded-2xl p-5`}><div className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-20 rounded-lg`}></div></div>)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold">Mes Rendez-vous</h2>
        <button onClick={() => { resetRdvForm(); setShowForm(true); }} className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-red-700">
          <Plus className="w-4 h-4" /> Nouveau RDV
        </button>
      </div>
      {showForm && (
        <>
          <button className="fixed inset-0 z-40 bg-slate-950/45" onClick={() => { setShowForm(false); resetRdvForm(); }} aria-label="Fermer"></button>
          <div className={`fixed z-50 left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 ${card} border rounded-2xl p-5 shadow-2xl`}>
            <h3 className="font-bold mb-4">{editingId ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({...form, startsAt: e.target.value})} className={`px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} />
              <input value={form.doctorName} onChange={(e) => setForm({...form, doctorName: e.target.value})} placeholder="Médecin" className={`px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} />
              <select value={form.mode} onChange={(e) => setForm({...form, mode: e.target.value})} className={`px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}>
                <option value="onsite">Présentiel</option>
                <option value="video">Téléconsultation</option>
              </select>
              <input value={form.specialty} onChange={(e) => setForm({...form, specialty: e.target.value})} placeholder="Spécialité" className={`px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} />
              <input value={form.location} onChange={(e) => setForm({...form, location: e.target.value})} placeholder="Lieu" className={`px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} />
              <div className="flex gap-2">
                <button onClick={saveRdv} className="flex-1 px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold">{editingId ? 'Modifier' : 'Créer'}</button>
                <button onClick={() => { setShowForm(false); resetRdvForm(); }} className={`flex-1 px-3 py-2 rounded-lg border text-sm font-semibold ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>Annuler</button>
              </div>
            </div>
          </div>
        </>
      )}
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
                      <button onClick={() => { if (r.l) window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.l)}`, '_blank'); }} className={`px-3 py-1.5 rounded-lg ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'} border text-xs font-semibold flex items-center gap-1`}><MapPin className="w-3 h-3" /> Itinéraire</button>
                    )}
                    {r.id && (
                      <>
                        <button onClick={() => openEditRdv(r)} className={`px-3 py-1.5 rounded-lg ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'} border text-xs font-semibold flex items-center gap-1`}><Edit3 className="w-3 h-3" /> Modifier</button>
                        <button onClick={() => setPendingDelete(r.id)} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 text-xs font-semibold flex items-center gap-1"><Trash2 className="w-3 h-3" /> Suppr.</button>
                      </>
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
      {pendingDelete && (
        <ConfirmDialog
          title="Supprimer le rendez-vous"
          message="Cette action retirera le rendez-vous du planning patient."
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => deleteRdv(pendingDelete)}
          card={card}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}

function PVax({ data, card, sub, border, darkMode }) {
  const [showQR, setShowQR]   = useState(false);
  const [qrData, setQrData]   = useState(null);
  const [qrLoading, setQrLoading] = useState(false);

  const openQR = async () => {
    setShowQR(true);
    if (qrData) return;
    setQrLoading(true);
    try {
      const res = await patientApi.emergencyCardQr();
      setQrData(res);
    } catch {
      setQrData(null);
    } finally {
      setQrLoading(false);
    }
  };

  if (!data) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Carnet Vaccinal</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[0,1,2].map(i => <div key={i} className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-28 rounded-2xl`}></div>)}
        </div>
        <div className={`${card} border rounded-2xl p-6`}><div className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-40 rounded-lg`}></div></div>
      </div>
    );
  }
  const vs = data.length ? data.map((v) => ({
    n: v.name,
    d: v.injectedAt ? formatDate(v.injectedAt) : 'Non renseigné',
    s: v.status === 'due_soon' ? 'Rappel prévu' : 'À jour',
    c: v.status === 'due_soon' ? 'amber' : 'emerald',
    x: v.nextDueAt ? formatDate(v.nextDueAt) : 'Aucun rappel',
  })) : [];
  const upToDateCount = vs.filter((v) => v.c === 'emerald').length;
  const dueSoonCount = vs.filter((v) => v.c === 'amber').length;
  const coverage = vs.length ? Math.round((upToDateCount / vs.length) * 100) : 0;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="text-2xl font-bold">Carnet Vaccinal</h2><p className={`text-sm ${sub}`}>Historique et rappels</p></div>
        <button onClick={openQR} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold shadow hover:opacity-90">
          <QrCode className="w-4 h-4" /> Passeport vaccinal QR
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-2xl p-5">
          <ShieldCheck className="w-6 h-6 mb-2" /><p className="text-3xl font-bold">{upToDateCount}</p><p className="text-xs">Vaccins à jour</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl p-5">
          <Clock className="w-6 h-6 mb-2" /><p className="text-3xl font-bold">{dueSoonCount}</p><p className="text-xs">Rappel à venir</p>
        </div>
        <div className="bg-gradient-to-br from-red-600 to-red-800 text-white rounded-2xl p-5">
          <Syringe className="w-6 h-6 mb-2" /><p className="text-3xl font-bold">{coverage}%</p><p className="text-xs">Couverture</p>
        </div>
      </div>
      <div className={`${card} border rounded-2xl p-6`}>
        <h3 className="font-bold mb-4">Historique complet</h3>
        {vs.length === 0 ? (
          <div className="py-8 flex flex-col items-center text-center">
            <Syringe className={`w-10 h-10 ${sub} mb-3`} />
            <p className={`text-sm ${sub}`}>Aucun vaccin enregistré</p>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {vs.map((v, i) => {
            const isAmber = v.c === 'amber';
            return (
            <div key={i} className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${isAmber ? 'bg-amber-100' : 'bg-emerald-100'} flex items-center justify-center`}><Syringe className={`w-5 h-5 ${isAmber ? 'text-amber-600' : 'text-emerald-600'}`} /></div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isAmber ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{v.s}</span>
              </div>
              <p className="font-bold">{v.n}</p>
              <p className={`text-xs ${sub} mt-1`}>{v.d}</p>
              <p className={`text-xs ${sub} mt-2`}>Prochain : <strong>{v.x}</strong></p>
            </div>
          );})}
        </div>
        )}
      </div>

      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowQR(false)}>
          <div className={`${card} border rounded-2xl p-6 w-full max-w-sm shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg">Passeport Vaccinal</h3>
                <p className={`text-xs ${sub}`}>Scannez pour vérifier les vaccinations</p>
              </div>
              <button onClick={() => setShowQR(false)} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><X className="w-4 h-4" /></button>
            </div>
            <div className="flex flex-col items-center gap-4">
              {qrLoading ? (
                <div className={`w-52 h-52 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-slate-100'} flex items-center justify-center animate-pulse`}>
                  <QrCode className={`w-10 h-10 ${sub}`} />
                </div>
              ) : qrData?.qr ? (
                <img src={qrData.qr} alt="QR Code vaccinal" className="w-52 h-52 rounded-xl border-4 border-emerald-500" />
              ) : (
                <div className={`w-52 h-52 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-slate-100'} flex flex-col items-center justify-center gap-2`}>
                  <QrCode className={`w-10 h-10 ${sub}`} />
                  <p className={`text-xs ${sub}`}>Génération impossible</p>
                </div>
              )}
              <div className="w-full">
                <p className={`text-xs font-bold ${sub} mb-2`}>Vaccinations ({vs.length})</p>
                <div className="space-y-1.5">
                  {vs.map((v, i) => (
                    <div key={i} className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                      <span className="font-medium">{v.n}</span>
                      <span className={`px-2 py-0.5 rounded-full font-bold ${v.c === 'emerald' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{v.s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PDNA({ data, profile, onReload, notify, card, sub, border, darkMode }) {
  const bloodType = profile?.bloodType || '—';
  const [editing, setEditing]   = useState(null); // 'allergies' | 'chronicDiseases' | 'familyHistory' | 'surgicalHistory'
  const [input, setInput]       = useState('');
  const [saving, setSaving]     = useState(false);

  const mp = data || { allergies: [], chronicDiseases: [], familyHistory: [], surgicalHistory: [] };

  const sectionConfig = [
    { key: 'allergies',       label: 'Allergies',                icon: AlertTriangle,  color: 'red' },
    { key: 'chronicDiseases', label: 'Maladies chroniques',      icon: HeartPulse,     color: 'orange' },
    { key: 'familyHistory',   label: 'Antécédents familiaux',    icon: Users,          color: 'purple' },
    { key: 'surgicalHistory', label: 'Historique chirurgical',   icon: Stethoscope,    color: 'blue' },
  ];

  const colorMap = {
    red:    { bg: darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-700', btn: 'text-red-500 hover:text-red-700' },
    orange: { bg: darkMode ? 'bg-orange-900/20 border-orange-800' : 'bg-orange-50 border-orange-200', badge: 'bg-orange-100 text-orange-700', btn: 'text-orange-500 hover:text-orange-700' },
    purple: { bg: darkMode ? 'bg-purple-900/20 border-purple-800' : 'bg-purple-50 border-purple-200', badge: 'bg-purple-100 text-purple-700', btn: 'text-purple-500 hover:text-purple-700' },
    blue:   { bg: darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200', badge: 'bg-blue-100 text-blue-700', btn: 'text-blue-500 hover:text-blue-700' },
  };

  const saveSection = async (key, newList) => {
    setSaving(true);
    try {
      const updated = await patientApi.updateMedicalProfile({ [key]: newList });
      onReload?.(updated);
      notify?.('Profil médical mis à jour');
    } catch (e) {
      notify?.(e.message || 'Erreur sauvegarde', 'error');
    } finally {
      setSaving(false);
      setEditing(null);
      setInput('');
    }
  };

  const addItem = (key) => {
    const v = input.trim();
    if (!v) return;
    saveSection(key, [...(mp[key] || []), v]);
  };

  const removeItem = (key, idx) => {
    const list = (mp[key] || []).filter((_, i) => i !== idx);
    saveSection(key, list);
  };

  if (!data) return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">ADN Médical</h2>
      <div className={`${card} border rounded-2xl p-6`}>
        <div className="space-y-3">{[0,1,2].map(i => <div key={i} className={`animate-pulse h-24 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />)}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">ADN Médical</h2>

      {/* Blood type hero */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-red-600 to-red-800 text-white rounded-2xl p-6 relative overflow-hidden sm:col-span-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/20 rounded-full -translate-y-16 translate-x-16 blur-2xl"></div>
          <Droplet className="w-6 h-6 mb-2" />
          <p className="text-xs text-red-100">Groupe Sanguin</p>
          <p className="text-5xl font-black mt-1">{bloodType}</p>
        </div>
        <div className={`${card} border rounded-2xl p-5 sm:col-span-2 flex flex-col justify-center`}>
          <p className="text-xs font-bold uppercase tracking-wider text-red-600 mb-1">Résumé du profil médical</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {sectionConfig.map(s => (
              <div key={s.key} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full bg-${s.color}-500 flex-shrink-0`}></span>
                <span className={sub}>{(mp[s.key] || []).length} {s.label.toLowerCase()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sectionConfig.map(({ key, label, icon: Icon, color }) => {
          const items = mp[key] || [];
          const c = colorMap[color];
          const isEditing = editing === key;
          return (
            <div key={key} className={`${card} border rounded-2xl p-5`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 text-${color}-600`} />
                  <h3 className="font-bold text-sm">{label}</h3>
                  <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${c.badge}`}>{items.length}</span>
                </div>
                <button onClick={() => { setEditing(isEditing ? null : key); setInput(''); }}
                  className={`text-xs font-semibold px-2 py-1 rounded-lg ${darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}>
                  {isEditing ? 'Fermer' : '+ Ajouter'}
                </button>
              </div>

              {isEditing && (
                <div className="flex gap-2 mb-3">
                  <input
                    value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addItem(key)}
                    placeholder={`Ajouter ${label.toLowerCase()}...`}
                    className={`flex-1 px-3 py-1.5 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-300'}`}
                    autoFocus
                  />
                  <button onClick={() => addItem(key)} disabled={saving || !input.trim()}
                    className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold disabled:opacity-50">
                    OK
                  </button>
                </div>
              )}

              {items.length === 0 ? (
                <p className={`text-xs ${sub} italic py-2`}>Aucun élément renseigné.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {items.map((item, idx) => (
                    <span key={idx} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${c.bg}`}>
                      {item}
                      <button onClick={() => removeItem(key, idx)} className={`ml-0.5 ${c.btn}`} disabled={saving}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============ RÉSULTATS LABO ============ */
function PLabResults({ data, card, sub, border, darkMode }) {
  const [expanded, setExpanded] = useState(null);

  const statusStyle = {
    normal:   { badge: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500' },
    high:     { badge: 'bg-red-100 text-red-600',         bar: 'bg-red-500' },
    low:      { badge: 'bg-amber-100 text-amber-700',     bar: 'bg-amber-500' },
    critical: { badge: 'bg-red-200 text-red-700 font-bold', bar: 'bg-red-600' },
  };
  const statusLabel = { normal: 'Normal', high: 'Élevé', low: 'Bas', critical: 'Critique' };

  const reportStatusColor = {
    completed:  'bg-emerald-100 text-emerald-700',
    pending:    'bg-amber-100 text-amber-700',
    cancelled:  'bg-slate-100 text-slate-500',
  };
  const reportStatusLabel = { completed: 'Terminé', pending: 'En attente', cancelled: 'Annulé' };

  if (!data) return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Résultats de laboratoire</h2>
      <div className={`${card} border rounded-2xl p-6`}>
        <div className="space-y-3">{[0,1,2].map(i => <div key={i} className={`animate-pulse h-24 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />)}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Résultats de laboratoire</h2>
          <p className={`text-sm ${sub}`}>{data.length} analyse{data.length > 1 ? 's' : ''}</p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className={`${card} border rounded-2xl p-12 flex flex-col items-center text-center`}>
          <Microscope className={`w-12 h-12 ${sub} mb-4`} />
          <p className="font-semibold">Aucun résultat disponible</p>
          <p className={`text-xs ${sub} mt-1`}>Vos analyses biologiques apparaîtront ici.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((report) => {
            const isOpen = expanded === report.id;
            const hasAbnormal = report.items.some(i => i.status !== 'normal');
            return (
              <div key={report.id} className={`${card} border rounded-2xl overflow-hidden`}>
                <button onClick={() => setExpanded(isOpen ? null : report.id)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-black/5 transition-colors">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                    <Microscope className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold truncate">{report.title}</p>
                      {hasAbnormal && <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-600">⚠ Valeurs anormales</span>}
                    </div>
                    <p className={`text-xs ${sub} mt-0.5`}>{report.laboratoryName} • {formatDate(report.performedAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${reportStatusColor[report.status] || 'bg-slate-100 text-slate-500'}`}>
                      {reportStatusLabel[report.status] || report.status}
                    </span>
                    <ChevronRight className={`w-4 h-4 ${sub} transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                  </div>
                </button>

                {isOpen && (
                  <div className={`border-t ${border} p-4`}>
                    {report.doctorName && (
                      <p className={`text-xs ${sub} mb-3`}>Prescrit par <strong>{report.doctorName}</strong></p>
                    )}
                    <div className="space-y-2">
                      {report.items.map((item) => {
                        const st = statusStyle[item.status] || statusStyle.normal;
                        return (
                          <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium truncate">{item.name}</p>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${st.badge}`}>
                                  {statusLabel[item.status] || item.status}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-base font-bold">{item.value}</span>
                                {item.unit && <span className={`text-xs ${sub}`}>{item.unit}</span>}
                                {item.referenceRange && (
                                  <span className={`text-xs ${sub} ml-auto`}>Réf : {item.referenceRange}</span>
                                )}
                              </div>
                              {item.status !== 'normal' && (
                                <div className={`mt-1.5 h-1.5 w-full rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                                  <div className={`h-1.5 rounded-full ${st.bar}`} style={{ width: item.status === 'critical' ? '100%' : '65%' }}></div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function historyTypeLabel(type) {
  const map = { consultation: 'Consultation', lab: 'Analyse', prescription: 'Ordonnance', vaccine: 'Vaccination' };
  return map[type] || capitalize(type || '');
}

function PHistory({ data, card, sub, darkMode }) {
  if (!data) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Historique médical</h2>
        <div className={`${card} border rounded-2xl p-6`}><div className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-48 rounded-lg`}></div></div>
      </div>
    );
  }
  const cs = data.map((item) => ({
    d: formatDate(item.occurredAt),
    dr: item.doctorName,
    sp: historyTypeLabel(item.type),
    di: item.title,
  }));
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Historique médical</h2>
      {cs.length === 0 ? (
        <div className={`${card} border rounded-2xl p-12 flex flex-col items-center text-center`}>
          <ClipboardList className={`w-12 h-12 ${sub} mb-4`} />
          <p className="font-semibold">Aucun historique</p>
          <p className={`text-xs ${sub} mt-1`}>Votre historique médical apparaîtra ici après vos premières consultations.</p>
        </div>
      ) : (
      <div className={`${card} border rounded-2xl p-6 space-y-3`}>
        {cs.map((c, i) => (
          <div key={i} className={`flex flex-col md:flex-row md:items-center gap-3 p-4 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className={`md:w-32 text-xs ${sub} font-semibold`}>{c.d}</div>
            <div className="flex-1">
              <p className="font-semibold">{c.dr} <span className={`text-xs font-normal ${sub}`}>• {c.sp}</span></p>
              <p className={`text-sm ${sub} mt-0.5`}>{c.di}</p>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

/* ============ ORDONNANCES ============ */
function POrdonnances({ data, card, sub, border, darkMode }) {
  const [filter, setFilter]   = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [printing, setPrinting] = useState(null);

  const statusLabel = { active: 'Active', expired: 'Expirée', cancelled: 'Annulée' };
  const statusStyle = {
    active:    'bg-emerald-100 text-emerald-700',
    expired:   'bg-slate-100 text-slate-500',
    cancelled: 'bg-red-100 text-red-600',
  };

  const prescriptions = data ?? [];
  const filtered = filter === 'all'
    ? prescriptions
    : prescriptions.filter((p) => p.status === filter);

  const daysLeft = (validUntil) => {
    if (!validUntil) return null;
    const diff = Math.ceil((new Date(validUntil) - Date.now()) / 86400000);
    return diff;
  };

  const handlePrint = (presc) => {
    setPrinting(presc);
    window.setTimeout(() => {
      window.print();
      setPrinting(null);
    }, 300);
  };

  if (!data) return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Ordonnances</h2>
      <div className={`${card} border rounded-2xl p-6`}>
        <div className="space-y-3">
          {[0,1,2].map(i => <div key={i} className={`animate-pulse h-28 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />)}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Print overlay */}
      {printing && (
        <div className="hidden print:block fixed inset-0 bg-white p-8 z-[999]">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-start justify-between mb-6 pb-4 border-b-2 border-slate-200">
              <div>
                <h1 className="text-2xl font-bold text-red-700">NOVA — Carnet Santé Ivoirien</h1>
                <p className="text-slate-500 text-sm">Ordonnance médicale numérique</p>
              </div>
              <div className="text-right text-sm text-slate-500">
                <p>Émise le {printing.issuedAt ? new Date(printing.issuedAt).toLocaleDateString('fr-FR') : '—'}</p>
                <p>Valable jusqu'au {printing.validUntil ? new Date(printing.validUntil).toLocaleDateString('fr-FR') : '—'}</p>
              </div>
            </div>
            <div className="mb-6">
              <p className="font-bold text-lg">{printing.doctorName}</p>
              <p className="text-slate-500">{printing.doctorSpecialty}</p>
            </div>
            <h3 className="font-bold mb-3 uppercase text-xs tracking-wider text-slate-400">Médicaments prescrits</h3>
            <div className="space-y-4">
              {printing.items.map((item, idx) => (
                <div key={item.id} className="p-4 border rounded-xl">
                  <p className="font-bold">{idx + 1}. {item.name} {item.dosage && `— ${item.dosage}`}</p>
                  {item.frequency && <p className="text-sm mt-1"><span className="font-semibold">Posologie :</span> {item.frequency}</p>}
                  {item.duration && <p className="text-sm"><span className="font-semibold">Durée :</span> {item.duration}</p>}
                  {item.instructions && <p className="text-sm text-slate-500 mt-1 italic">{item.instructions}</p>}
                </div>
              ))}
            </div>
            {printing.notes && <p className="mt-6 text-sm text-slate-500 border-t pt-4">{printing.notes}</p>}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2 print:hidden">
        <div>
          <h2 className="text-2xl font-bold">Ordonnances</h2>
          <p className={`text-sm ${sub}`}>{prescriptions.filter(p => p.status === 'active').length} ordonnance{prescriptions.filter(p => p.status === 'active').length > 1 ? 's' : ''} active{prescriptions.filter(p => p.status === 'active').length > 1 ? 's' : ''}</p>
        </div>
        <div className={`flex rounded-xl overflow-hidden border ${border} text-sm font-semibold`}>
          {[['all','Toutes'], ['active','Actives'], ['expired','Expirées']].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`px-4 py-2 transition-colors ${filter === v ? 'bg-red-600 text-white' : (darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-600 hover:bg-slate-50')}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className={`${card} border rounded-2xl p-12 flex flex-col items-center text-center print:hidden`}>
          <FileText className={`w-12 h-12 ${sub} mb-4`} />
          <p className="font-semibold">Aucune ordonnance</p>
          <p className={`text-xs ${sub} mt-1`}>Vos ordonnances apparaîtront ici après vos consultations.</p>
        </div>
      ) : (
        <div className="space-y-3 print:hidden">
          {filtered.map((presc) => {
            const open = expanded === presc.id;
            const days = daysLeft(presc.validUntil);
            const expiringSoon = days !== null && days > 0 && days <= 14;
            return (
              <div key={presc.id} className={`${card} border rounded-2xl overflow-hidden transition-all
                ${presc.status === 'active' ? (darkMode ? 'border-emerald-800' : 'border-emerald-200') : ''}`}>
                {/* Header card */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0
                        ${presc.status === 'active' ? 'bg-emerald-100 text-emerald-700' : (darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-400')}`}>
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold">{presc.doctorName}</p>
                        {presc.doctorSpecialty && <p className={`text-xs ${sub}`}>{presc.doctorSpecialty}</p>}
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusStyle[presc.status] || statusStyle.expired}`}>
                            {statusLabel[presc.status] || presc.status}
                          </span>
                          <span className={`text-[11px] ${sub}`}>
                            Émise le {new Date(presc.issuedAt).toLocaleDateString('fr-FR')}
                          </span>
                          {presc.validUntil && (
                            <span className={`text-[11px] font-semibold ${
                              expiringSoon ? 'text-amber-600' :
                              (days !== null && days <= 0) ? 'text-red-500' : sub
                            }`}>
                              {days !== null && days > 0
                                ? `Valable encore ${days} jour${days > 1 ? 's' : ''}`
                                : days !== null && days <= 0
                                ? 'Expirée'
                                : `Jusqu'au ${new Date(presc.validUntil).toLocaleDateString('fr-FR')}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                      <button onClick={() => handlePrint(presc)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors
                          ${darkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        <Download className="w-3.5 h-3.5" /> Imprimer
                      </button>
                      <button onClick={() => setExpanded(open ? null : presc.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                          ${open ? 'bg-red-600 text-white' : (darkMode ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}`}>
                        {open ? 'Réduire' : `Voir ${presc.items.length} méd.`}
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-90' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Résumé médicaments (toujours visible) */}
                  {!open && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {presc.items.map((item) => (
                        <span key={item.id} className={`text-[11px] px-2 py-0.5 rounded-full font-medium
                          ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                          {item.name} {item.dosage && `${item.dosage}`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Détail médicaments (expandable) */}
                {open && (
                  <div className={`border-t ${border} px-5 pb-5 pt-4`}>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${sub} mb-3`}>Médicaments prescrits</p>
                    <div className="space-y-3">
                      {presc.items.map((item, idx) => (
                        <div key={item.id} className={`flex gap-3 p-3 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5
                            ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-white text-slate-600 shadow-sm'}`}>
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm">{item.name}
                              {item.dosage && <span className={`ml-2 text-xs font-normal ${sub}`}>{item.dosage}</span>}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 mt-1.5">
                              {item.frequency && (
                                <p className={`text-xs ${sub}`}><span className="font-semibold">Posologie :</span> {item.frequency}</p>
                              )}
                              {item.duration && (
                                <p className={`text-xs ${sub}`}><span className="font-semibold">Durée :</span> {item.duration}</p>
                              )}
                            </div>
                            {item.instructions && (
                              <p className={`text-xs mt-1.5 italic ${darkMode ? 'text-amber-400' : 'text-amber-700'} flex gap-1`}>
                                <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                                {item.instructions}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {presc.notes && (
                      <div className={`mt-3 p-3 rounded-xl text-xs ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-blue-50 text-blue-800'} flex gap-2`}>
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{presc.notes}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============ GRAPHIQUES CONSTANTES ============ */
function PVitals({ data, onAddVital, notify, card, sub, border, darkMode }) {
  const [activeType, setActiveType] = useState('blood_pressure');
  const [range, setRange]           = useState(30);
  const [showAdd, setShowAdd]       = useState(false);
  const [addForm, setAddForm]       = useState({ type: 'blood_pressure', value: '' });
  const [saving, setSaving]         = useState(false);

  const typeConfig = {
    blood_pressure: { label: 'Tension artérielle', unit: 'mmHg', color: '#ef4444', icon: HeartPulse,  normal: '12/8', ref: '< 14/9' },
    blood_glucose:  { label: 'Glycémie',           unit: 'g/L',  color: '#f97316', icon: Droplet,     normal: '0.70–1.10', ref: '0.70–1.10' },
    heart_rate:     { label: 'Fréquence cardiaque',unit: 'bpm',  color: '#8b5cf6', icon: Heart,       normal: '60–100', ref: '60–100' },
    temperature:    { label: 'Température',        unit: '°C',   color: '#06b6d4', icon: Thermometer, normal: '36.1–37.2', ref: '36.1–37.2' },
  };

  const allVitals = data ?? [];
  const typeVitals = allVitals
    .filter(v => v.type === activeType)
    .sort((a, b) => new Date(a.measuredAt) - new Date(b.measuredAt))
    .slice(-range);

  const cfg = typeConfig[activeType];

  const toNum = (v) => {
    if (activeType === 'blood_pressure') return Number(String(v).split('/')[0]);
    return Number(v);
  };

  const nums = typeVitals.map(v => toNum(v.value)).filter(n => Number.isFinite(n));
  const minV = nums.length ? Math.min(...nums) : 0;
  const maxV = nums.length ? Math.max(...nums) : 1;
  const pad  = Math.max((maxV - minV) * 0.2, 1);
  const yMin = minV - pad;
  const yMax = maxV + pad;

  const W = 600, H = 160;
  const points = typeVitals.map((v, i) => {
    const x = typeVitals.length < 2 ? W / 2 : (i / (typeVitals.length - 1)) * (W - 20) + 10;
    const n = toNum(v.value);
    const y = Number.isFinite(n) ? H - ((n - yMin) / (yMax - yMin)) * (H - 20) - 10 : H / 2;
    return { x, y, v, raw: v };
  });

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
  const area = points.length > 1
    ? `M${points[0].x},${H} ` + points.map(p => `L${p.x},${p.y}`).join(' ') + ` L${points[points.length-1].x},${H} Z`
    : '';

  const latest = typeVitals.at(-1);
  const latestNum = latest ? toNum(latest.value) : null;
  const prev     = typeVitals.at(-2);
  const prevNum  = prev ? toNum(prev.value) : null;
  const trend    = latestNum && prevNum ? (latestNum > prevNum ? 'up' : latestNum < prevNum ? 'down' : 'flat') : 'flat';

  const saveVital = async () => {
    if (!addForm.value.trim()) return;
    setSaving(true);
    try {
      await patientApi.addVital({ type: addForm.type, value: addForm.value });
      const fresh = await patientApi.vitals();
      onAddVital?.(fresh);
      notify?.('Mesure enregistrée');
      setShowAdd(false);
      setAddForm({ type: 'blood_pressure', value: '' });
    } catch (e) {
      notify?.(e.message || 'Erreur', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!data) return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Mes constantes</h2>
      <div className={`${card} border rounded-2xl p-6`}>
        <div className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-48 rounded-xl`} />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold">Mes constantes</h2>
          <p className={`text-sm ${sub}`}>{typeVitals.length} mesures · {cfg.label}</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold flex items-center gap-1.5">
          <Plus className="w-3 h-3" /> Ajouter une mesure
        </button>
      </div>

      {showAdd && (
        <>
          <button className="fixed inset-0 z-40 bg-slate-950/45" onClick={() => setShowAdd(false)} aria-label="Fermer" />
          <div className={`fixed z-50 left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 ${card} border rounded-2xl p-5 shadow-2xl`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">Nouvelle mesure</h3>
              <button onClick={() => setShowAdd(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <select value={addForm.type} onChange={e => setAddForm(f => ({ ...f, type: e.target.value, value: '' }))}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}>
                {Object.entries(typeConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <div>
                <input value={addForm.value} onChange={e => setAddForm(f => ({ ...f, value: e.target.value }))}
                  placeholder={typeConfig[addForm.type].normal} onKeyDown={e => e.key === 'Enter' && saveVital()}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} />
                <p className={`text-xs ${sub} mt-1`}>Format attendu : {typeConfig[addForm.type].normal} ({typeConfig[addForm.type].unit})</p>
              </div>
              <div className="flex gap-2">
                <button onClick={saveVital} disabled={saving || !addForm.value.trim()}
                  className="flex-1 px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-50">
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
                <button onClick={() => setShowAdd(false)} className={`flex-1 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>Annuler</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Type selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {Object.entries(typeConfig).map(([type, c]) => {
          const typeLatest = allVitals.filter(v => v.type === type).at(-1);
          const isAct = activeType === type;
          const Icon = c.icon;
          return (
            <button key={type} onClick={() => setActiveType(type)}
              className={`rounded-2xl p-3 text-left transition-all ${isAct ? 'ring-2 ring-offset-1' : ''} ${darkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white border border-slate-200 hover:border-slate-300'} ${isAct ? 'ring-red-500' : ''}`}
              style={isAct ? { borderColor: c.color } : {}}>
              <Icon className="w-4 h-4 mb-1" style={{ color: c.color }} />
              <p className={`text-[10px] font-semibold ${sub}`}>{c.label}</p>
              <p className="text-lg font-black mt-0.5">{typeLatest ? typeLatest.value : '—'}</p>
              <p className={`text-[10px] ${sub}`}>{c.unit}</p>
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <div className={`${card} border rounded-2xl p-5`}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div>
              <p className={`text-xs font-semibold ${sub}`}>{cfg.label}</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black">{latest?.value ?? '—'}</span>
                <span className={`text-sm ${sub}`}>{cfg.unit}</span>
                {trend === 'up'   && <TrendingUp  className="w-4 h-4 text-red-500" />}
                {trend === 'down' && <TrendingUp  className="w-4 h-4 text-emerald-500 rotate-180" />}
              </div>
              {latest && <p className={`text-xs ${sub} mt-0.5`}>{formatDate(latest.measuredAt)}</p>}
            </div>
          </div>
          <div className={`flex gap-1 p-1 rounded-lg ${darkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
            {[7, 14, 30].map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-2.5 py-1 rounded text-xs font-semibold ${range === r ? 'bg-white text-slate-900 shadow' : sub}`}>
                {r}j
              </button>
            ))}
          </div>
        </div>

        {typeVitals.length < 2 ? (
          <div className={`flex items-center justify-center h-32 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
            <p className={`text-sm ${sub}`}>Pas assez de données — ajoutez des mesures</p>
          </div>
        ) : (
          <div className="relative w-full overflow-x-auto">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minHeight: '120px' }}>
              <defs>
                <linearGradient id={`grad-${activeType}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={cfg.color} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={cfg.color} stopOpacity="0" />
                </linearGradient>
              </defs>
              {area && <path d={area} fill={`url(#grad-${activeType})`} />}
              {points.length > 1 && <polyline points={polyline} fill="none" stroke={cfg.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
              {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={cfg.color} stroke={darkMode ? '#1e293b' : 'white'} strokeWidth="2" />
              ))}
              {/* X axis labels — only first and last */}
              {typeVitals.length > 1 && <>
                <text x={points[0].x} y={H - 2} textAnchor="middle" fontSize="9" fill={darkMode ? '#94a3b8' : '#64748b'}>{formatShortDate(typeVitals[0].measuredAt)}</text>
                <text x={points[points.length-1].x} y={H - 2} textAnchor="middle" fontSize="9" fill={darkMode ? '#94a3b8' : '#64748b'}>{formatShortDate(typeVitals.at(-1).measuredAt)}</text>
              </>}
            </svg>
          </div>
        )}

        <div className={`mt-3 pt-3 border-t ${border} flex items-center gap-4 text-xs ${sub} flex-wrap`}>
          <span>Normale : <strong>{cfg.ref} {cfg.unit}</strong></span>
          {nums.length > 0 && <>
            <span>Min : <strong>{Math.min(...nums)}</strong></span>
            <span>Max : <strong>{Math.max(...nums)}</strong></span>
            <span>Moy : <strong>{(nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1)}</strong></span>
          </>}
        </div>
      </div>

      {/* History table */}
      <div className={`${card} border rounded-2xl p-4`}>
        <h3 className="font-bold text-sm mb-3">Historique ({typeVitals.length} mesures)</h3>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {[...typeVitals].reverse().map((v, i) => (
            <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <span className={`text-xs ${sub}`}>{formatDate(v.measuredAt)}</span>
              <span className="font-bold text-sm">{v.value} <span className={`text-xs font-normal ${sub}`}>{cfg.unit}</span></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============ RECHERCHE MÉDECINS ============ */
function PDoctors({ data, onBooked, notify, card, sub, border, darkMode, setPage }) {
  const [q, setQ]             = useState('');
  const [specialty, setSpec]  = useState('');
  const [acceptsCmu, setCmu]  = useState(false);
  const [selected, setSelected] = useState(null);
  const [slots, setSlots]     = useState(null);
  const [loadingSlots, setLS] = useState(false);
  const [booking, setBooking] = useState(null);

  const specialties = [...new Set((data ?? []).map(d => d.specialty))].sort();

  const filtered = (data ?? []).filter(d => {
    if (specialty && d.specialty !== specialty) return false;
    if (acceptsCmu && !d.acceptsCmu) return false;
    if (q) {
      const lq = q.toLowerCase();
      return d.fullName.toLowerCase().includes(lq) || d.specialty.toLowerCase().includes(lq) || d.city.toLowerCase().includes(lq);
    }
    return true;
  });

  const openDoctor = async (doc) => {
    setSelected(doc);
    setSlots(null);
    setLS(true);
    try {
      const s = await patientApi.doctorSlots(doc.id);
      setSlots(s);
    } catch {
      setSlots([]);
    } finally {
      setLS(false);
    }
  };

  const handleBook = async (slot) => {
    setBooking(slot.id);
    try {
      await patientApi.bookSlot(selected.id, slot.id);
      notify?.(`RDV confirmé le ${slot.date} à ${slot.time} avec ${selected.fullName}`);
      setSelected(null);
      onBooked?.();
    } catch (e) {
      notify?.(e.message || 'Erreur réservation', 'error');
    } finally {
      setBooking(null);
    }
  };

  const avatarBg = {
    red: 'from-red-500 to-red-700', purple: 'from-purple-500 to-purple-700',
    blue: 'from-blue-500 to-blue-700', orange: 'from-orange-500 to-orange-700',
    emerald: 'from-emerald-500 to-emerald-700', indigo: 'from-indigo-500 to-indigo-700',
    pink: 'from-pink-500 to-pink-700', cyan: 'from-cyan-500 to-cyan-700',
  };

  // Group slots by date
  const slotsByDate = {};
  if (slots) {
    for (const s of slots) {
      if (!slotsByDate[s.date]) slotsByDate[s.date] = [];
      slotsByDate[s.date].push(s);
    }
  }

  if (!data) return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Trouver un médecin</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[0,1,2,3].map(i => <div key={i} className={`${card} border rounded-2xl p-5`}><div className={`animate-pulse h-28 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} /></div>)}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {selected && (
        <>
          <button className="fixed inset-0 z-40 bg-slate-950/45" onClick={() => setSelected(null)} aria-label="Fermer" />
          <div className={`fixed z-50 left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-2xl max-h-[85vh] overflow-y-auto -translate-x-1/2 -translate-y-1/2 ${card} border rounded-2xl shadow-2xl`}>
            {/* Header */}
            <div className={`p-5 border-b ${border} flex items-center gap-4`}>
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarBg[selected.avatarColor] || avatarBg.red} text-white flex items-center justify-center font-bold text-lg flex-shrink-0`}>
                {selected.avatarInitials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-lg">{selected.fullName}</p>
                <p className={`text-sm ${sub}`}>{selected.specialty}</p>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="flex items-center gap-1 text-xs text-amber-500 font-semibold"><Star className="w-3 h-3" />{selected.rating} ({selected.reviewsCount} avis)</span>
                  <span className={`text-xs ${sub}`}>{selected.experienceYears} ans d'expérience</span>
                  {selected.acceptsCmu && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">CMU</span>}
                </div>
              </div>
              <button onClick={() => setSelected(null)}><X className="w-5 h-5" /></button>
            </div>
            {/* Bio */}
            {selected.bio && <div className={`px-5 py-3 border-b ${border}`}><p className={`text-sm ${sub}`}>{selected.bio}</p></div>}
            {/* Info */}
            <div className={`px-5 py-3 border-b ${border} grid grid-cols-2 gap-2 text-xs`}>
              <div className="flex items-center gap-2"><MapPin className={`w-3.5 h-3.5 ${sub}`} /><span className={sub}>{selected.address || selected.city}</span></div>
              <div className="flex items-center gap-2"><PhoneCall className={`w-3.5 h-3.5 ${sub}`} /><span className={sub}>{selected.phone}</span></div>
              <div className="flex items-center gap-2"><Zap className={`w-3.5 h-3.5 text-amber-500`} /><span className={sub}>Consultation : {(selected.consultationFee / 1000).toFixed(0)} 000 FCFA</span></div>
              <div className="flex items-center gap-2"><Users className={`w-3.5 h-3.5 ${sub}`} /><span className={sub}>Langues : {selected.languages}</span></div>
            </div>
            {/* Slots */}
            <div className="p-5">
              <p className="font-bold text-sm mb-3">Créneaux disponibles</p>
              {loadingSlots ? (
                <div className={`animate-pulse h-20 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
              ) : Object.keys(slotsByDate).length === 0 ? (
                <p className={`text-sm ${sub} text-center py-6`}>Aucun créneau disponible pour le moment.</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(slotsByDate).slice(0, 5).map(([date, daySlots]) => (
                    <div key={date}>
                      <p className={`text-xs font-bold ${sub} mb-1.5`}>{formatDateFull(date)}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {daySlots.map(slot => (
                          <button key={slot.id} onClick={() => handleBook(slot)} disabled={booking === slot.id}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                              booking === slot.id ? 'bg-red-600 text-white border-red-600 opacity-60' :
                              (darkMode ? 'border-slate-600 hover:border-red-500 hover:text-red-400' : 'border-slate-300 hover:border-red-500 hover:bg-red-50 hover:text-red-600')
                            }`}>
                            {booking === slot.id ? '…' : slot.time}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <div>
        <h2 className="text-2xl font-bold">Trouver un médecin</h2>
        <p className={`text-sm ${sub}`}>{filtered.length} professionnel{filtered.length > 1 ? 's' : ''} disponible{filtered.length > 1 ? 's' : ''}</p>
      </div>

      {/* Filters */}
      <div className={`${card} border rounded-2xl p-4 flex flex-col sm:flex-row gap-3`}>
        <div className="relative flex-1">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${sub}`} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Nom, spécialité, ville…"
            className={`w-full pl-9 pr-3 py-2 rounded-xl border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`} />
        </div>
        <select value={specialty} onChange={e => setSpec(e.target.value)}
          className={`px-3 py-2 rounded-xl border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <option value="">Toutes spécialités</option>
          {specialties.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <label className={`flex items-center gap-2 text-sm cursor-pointer ${sub}`}>
          <input type="checkbox" checked={acceptsCmu} onChange={e => setCmu(e.target.checked)} className="rounded" />
          CMU acceptée
        </label>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map(doc => (
          <button key={doc.id} onClick={() => openDoctor(doc)}
            className={`${card} border rounded-2xl p-4 text-left hover:shadow-lg hover:scale-[1.01] transition-all`}>
            <div className="flex items-start gap-3">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${avatarBg[doc.avatarColor] || avatarBg.red} text-white flex items-center justify-center font-bold flex-shrink-0`}>
                {doc.avatarInitials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-sm">{doc.fullName}</p>
                    <p className={`text-xs ${sub}`}>{doc.specialty}</p>
                  </div>
                  {doc.isAvailable
                    ? <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 mt-1.5" title="Disponible" />
                    : <span className="w-2 h-2 rounded-full bg-slate-400 flex-shrink-0 mt-1.5" title="Indisponible" />
                  }
                </div>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="flex items-center gap-1 text-xs text-amber-500 font-semibold"><Star className="w-3 h-3" />{doc.rating}</span>
                  <span className={`text-xs ${sub} flex items-center gap-1`}><MapPin className="w-3 h-3" />{doc.city.split(' - ')[1] || doc.city}</span>
                  {doc.acceptsCmu && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">CMU</span>}
                </div>
              </div>
            </div>
            <div className={`mt-3 pt-3 border-t border-dashed ${border} flex items-center justify-between`}>
              <span className={`text-xs ${sub}`}>{doc.experienceYears} ans d'expérience</span>
              <span className="text-xs font-semibold text-red-600">{(doc.consultationFee / 1000).toFixed(0)} 000 FCFA</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============ NOTIFICATIONS ============ */
function PNotifications({ data, onReload, notify, setPage, card, sub, border, darkMode }) {
  const notifs = data ?? [];
  const unread = notifs.filter(n => !n.isRead).length;

  const typeIcon = {
    appointment: { icon: Calendar,    color: 'text-blue-600',    bg: darkMode ? 'bg-blue-900/30' : 'bg-blue-50' },
    medication:  { icon: Pill,        color: 'text-red-600',     bg: darkMode ? 'bg-red-900/30'  : 'bg-red-50'  },
    vaccine:     { icon: Syringe,     color: 'text-emerald-600', bg: darkMode ? 'bg-emerald-900/30' : 'bg-emerald-50' },
    message:     { icon: MessageCircle, color: 'text-purple-600',bg: darkMode ? 'bg-purple-900/30' : 'bg-purple-50' },
    result:      { icon: Microscope,  color: 'text-orange-600',  bg: darkMode ? 'bg-orange-900/30' : 'bg-orange-50' },
    system:      { icon: Bell,        color: 'text-slate-600',   bg: darkMode ? 'bg-slate-800'     : 'bg-slate-50'  },
  };

  const markRead = async (id) => {
    try {
      await patientApi.markNotificationRead(id);
      onReload?.(await patientApi.notifications());
    } catch {}
  };

  const markAll = async () => {
    try {
      await patientApi.markAllNotificationsRead();
      onReload?.(await patientApi.notifications());
      notify?.('Toutes les notifications sont lues');
    } catch {}
  };

  if (!data) return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Notifications</h2>
      <div className={`${card} border rounded-2xl p-6`}>
        <div className="space-y-3">{[0,1,2].map(i => <div key={i} className={`animate-pulse h-16 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />)}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notifications</h2>
          <p className={`text-sm ${sub}`}>{unread} non lue{unread > 1 ? 's' : ''}</p>
        </div>
        {unread > 0 && (
          <button onClick={markAll} className={`text-xs font-semibold ${sub} hover:text-red-600`}>Tout marquer comme lu</button>
        )}
      </div>

      {notifs.length === 0 ? (
        <div className={`${card} border rounded-2xl p-12 flex flex-col items-center text-center`}>
          <Bell className={`w-12 h-12 ${sub} mb-4`} />
          <p className="font-semibold">Aucune notification</p>
          <p className={`text-xs ${sub} mt-1`}>Vous êtes à jour !</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map((n) => {
            const t = typeIcon[n.type] || typeIcon.system;
            const Icon = t.icon;
            return (
              <div key={n.id} onClick={() => { markRead(n.id); if (n.linkPage) setPage?.(n.linkPage); }}
                className={`${card} border rounded-2xl p-4 flex items-start gap-3 cursor-pointer hover:shadow-md transition-all ${!n.isRead ? (darkMode ? 'ring-1 ring-slate-600' : 'ring-1 ring-red-200 shadow-sm') : 'opacity-70'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${t.bg}`}>
                  <Icon className={`w-5 h-5 ${t.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`font-semibold text-sm ${!n.isRead ? '' : sub}`}>{n.title}</p>
                    {!n.isRead && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 mt-1.5" />}
                  </div>
                  {n.body && <p className={`text-xs ${sub} mt-0.5 line-clamp-2`}>{n.body}</p>}
                  <p className={`text-[10px] ${sub} mt-1`}>{formatRelativeDate(n.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============ SOS URGENCE ============ */
function PUrgence({ data, card, sub, border, darkMode }) {
  const [showQR, setShowQR]   = useState(false);
  const [qrData, setQrData]   = useState(null);
  const [loadQR, setLoadQR]   = useState(false);

  const urgenceNumbers = [
    { label: 'SAMU',     number: '15', color: 'red',    icon: PhoneCall },
    { label: 'Police',   number: '17', color: 'blue',   icon: Shield },
    { label: 'Pompiers', number: '18', color: 'orange', icon: Siren },
    { label: 'CHU Abidjan', number: '+225 27 21 27 03 33', color: 'purple', icon: Stethoscope },
  ];

  const colorMap = {
    red:    'bg-red-600 hover:bg-red-700',
    blue:   'bg-blue-600 hover:bg-blue-700',
    orange: 'bg-orange-600 hover:bg-orange-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
  };

  const fetchQR = async () => {
    setLoadQR(true);
    try {
      const d = await patientApi.emergencyCardQr();
      setQrData(d);
      setShowQR(true);
    } catch (e) {
      alert('Erreur QR : ' + e.message);
    } finally {
      setLoadQR(false);
    }
  };

  const handlePrint = () => window.print();

  if (!data) return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">SOS Urgence</h2>
      <div className={`${card} border rounded-2xl p-6`}>
        <div className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-48 rounded-xl`} />
      </div>
    </div>
  );

  const age = data.birthDate
    ? Math.floor((Date.now() - new Date(data.birthDate)) / (365.25 * 86400000))
    : null;

  return (
    <div className="space-y-4">
      {/* QR modal */}
      {showQR && qrData && (
        <>
          <button className="fixed inset-0 z-40 bg-slate-950/50" onClick={() => setShowQR(false)} aria-label="Fermer" />
          <div className={`fixed z-50 left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 ${card} border rounded-2xl p-6 shadow-2xl text-center`}>
            <p className="font-bold mb-1">QR Code — Fiche Urgence</p>
            <p className={`text-xs ${sub} mb-4`}>Scannez en cas d'urgence pour accéder aux infos vitales</p>
            <img src={qrData.qr} alt="QR Urgence" className="mx-auto rounded-xl w-48 h-48" />
            <p className={`text-[10px] ${sub} mt-3`}>{data.firstName} {data.lastName} · {data.bloodType || '?'} · {data.phone}</p>
            <div className="flex gap-2 mt-4">
              <button onClick={handlePrint} className="flex-1 px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold flex items-center justify-center gap-1.5">
                <Download className="w-4 h-4" /> Imprimer
              </button>
              <button onClick={() => setShowQR(false)} className={`flex-1 px-3 py-2 rounded-lg border text-sm font-semibold ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>Fermer</button>
            </div>
          </div>
        </>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold">SOS Urgence</h2>
          <p className={`text-sm ${sub}`}>Fiche médicale d'urgence · Accès immédiat</p>
        </div>
        <button onClick={fetchQR} disabled={loadQR}
          className="px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50">
          {loadQR ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <QrCode className="w-3.5 h-3.5" />}
          QR Code
        </button>
      </div>

      {/* Identity card */}
      <div className="bg-gradient-to-br from-red-600 via-red-700 to-red-900 text-white rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-20 blur-2xl" />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" />
              <span className="text-xs font-bold tracking-wider uppercase">Fiche Urgence · NOVA</span>
            </div>
            <span className="text-xs font-mono opacity-70">{data.cmuNumber}</span>
          </div>
          <p className="text-2xl font-black">{data.firstName} {data.lastName}</p>
          <div className="flex flex-wrap gap-4 mt-2 text-sm">
            {age && <span>{age} ans · {data.sex === 'M' ? 'Homme' : data.sex === 'F' ? 'Femme' : data.sex}</span>}
            <span className="font-bold text-lg">{data.bloodType || 'Groupe ?'}</span>
          </div>
        </div>
      </div>

      {/* Numéros urgence */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {urgenceNumbers.map(({ label, number, color, icon: Icon }) => (
          <a key={label} href={`tel:${number}`}
            className={`${colorMap[color]} text-white rounded-2xl p-4 flex flex-col items-center gap-2 transition-transform hover:scale-105 active:scale-95`}>
            <Icon className="w-6 h-6" />
            <span className="text-2xl font-black">{number.length <= 3 ? number : label}</span>
            <span className="text-xs font-semibold opacity-90">{label}</span>
          </a>
        ))}
      </div>

      {/* Critical info grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Allergies */}
        <div className={`${card} border rounded-2xl p-5`}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <h3 className="font-bold text-sm">Allergies</h3>
          </div>
          {data.allergies?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {data.allergies.map((a, i) => (
                <span key={i} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">{a}</span>
              ))}
            </div>
          ) : <p className={`text-sm ${sub}`}>Aucune allergie connue</p>}
        </div>

        {/* Maladies chroniques */}
        <div className={`${card} border rounded-2xl p-5`}>
          <div className="flex items-center gap-2 mb-3">
            <HeartPulse className="w-4 h-4 text-orange-600" />
            <h3 className="font-bold text-sm">Maladies chroniques</h3>
          </div>
          {data.chronicDiseases?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {data.chronicDiseases.map((d, i) => (
                <span key={i} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">{d}</span>
              ))}
            </div>
          ) : <p className={`text-sm ${sub}`}>Aucune maladie chronique</p>}
        </div>

        {/* Médicaments actuels */}
        <div className={`${card} border rounded-2xl p-5`}>
          <div className="flex items-center gap-2 mb-3">
            <Pill className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm">Médicaments actuels</h3>
          </div>
          {data.currentMedications?.length ? (
            <div className="space-y-1.5">
              {data.currentMedications.map((m, i) => (
                <div key={i} className={`flex items-center justify-between text-xs px-2 py-1.5 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <span className="font-semibold">{m.name}</span>
                  <span className={sub}>{m.dosage}</span>
                </div>
              ))}
            </div>
          ) : <p className={`text-sm ${sub}`}>Aucun traitement en cours</p>}
        </div>

        {/* Contact urgence */}
        <div className={`${card} border rounded-2xl p-5`}>
          <div className="flex items-center gap-2 mb-3">
            <PhoneCall className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-sm">Contact d'urgence</h3>
          </div>
          {data.emergencyContact?.name ? (
            <div className="space-y-1">
              <p className="font-bold">{data.emergencyContact.name}</p>
              <p className={`text-xs ${sub}`}>{data.emergencyContact.relationship}</p>
              <a href={`tel:${data.emergencyContact.phone}`} className="text-sm font-semibold text-emerald-600 flex items-center gap-1.5 mt-1">
                <PhoneCall className="w-3.5 h-3.5" /> {data.emergencyContact.phone}
              </a>
            </div>
          ) : <p className={`text-sm ${sub}`}>Aucun contact renseigné</p>}
        </div>
      </div>
    </div>
  );
}

// Lucide doesn't have QrCode in all versions — safe fallback
function QrCode({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="5" height="5" /><rect x="16" y="3" width="5" height="5" /><rect x="3" y="16" width="5" height="5" />
      <path d="M21 16h-3v3" /><path d="M18 21h3" /><path d="M21 21v-3" /><path d="M3 11V8" /><path d="M8 3v3" /><path d="M11 3h2" /><path d="M11 8v3" /><path d="M11 11h1" /><path d="M13 11h1" /><path d="M14 11v3" /><path d="M11 14h3" /><path d="M16 14v3" /><path d="M16 8v3" />
    </svg>
  );
}

/* ============ ASSISTANT IA NOVA ============ */
function PAssistant({ patientData, card, sub, border, darkMode }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: `Bonjour ! Je suis Nova, votre assistant santé personnel. Comment puis-je vous aider aujourd'hui ?`, ts: new Date() }
  ]);
  const [input, setInput]   = useState('');
  const [typing, setTyping] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const suggestions = [
    "Quels médicaments je dois prendre ce soir ?",
    "Mon prochain rendez-vous c'est quand ?",
    "Que signifie une glycémie de 1.10 g/L ?",
    "Quels aliments éviter avec l'hypertension ?",
    "Comment améliorer mon score de santé ?",
    "Dois-je m'inquiéter pour mes résultats d'analyse ?",
  ];

  const simulateResponse = (userMsg) => {
    const msg = userMsg.toLowerCase();
    if (msg.includes('médic') || msg.includes('comprimé') || msg.includes('soir') || msg.includes('matin'))
      return `D'après votre traitement actuel, veillez à prendre vos médicaments aux horaires prescrits. Consultez votre page **Pilulier** pour voir vos prises du jour. Si vous avez un doute, contactez votre médecin.\n\n⚠️ *Je ne suis pas médecin — consultez toujours un professionnel de santé.*`;
    if (msg.includes('rendez-vous') || msg.includes('rdv'))
      return `Votre prochain rendez-vous est visible dans la section **Rendez-vous** de l'application. Vous pouvez aussi prendre un nouveau RDV via **Trouver un médecin**.\n\n💡 *Pensez à activer les rappels dans vos paramètres.*`;
    if (msg.includes('glycémie') || msg.includes('glucose') || msg.includes('1.10'))
      return `Une glycémie de **1,10 g/L** à jeun est dans la zone haute de la normale (0,70–1,10 g/L). Ce n'est pas alarmant, mais il est conseillé de limiter les sucres rapides et de pratiquer une activité physique régulière.\n\n⚠️ *Consultez votre diabétologue pour un suivi personnalisé.*`;
    if (msg.includes('hypertension') || msg.includes('tension') || msg.includes('aliment'))
      return `Avec de l'hypertension, il est conseillé de :\n• **Réduire le sel** (max 5g/jour)\n• Éviter les charcuteries et plats transformés\n• Limiter l'alcool et la caféine\n• Favoriser les fruits, légumes et poissons gras\n\n💡 *Le régime DASH est particulièrement recommandé.*`;
    if (msg.includes('score') || msg.includes('améliorer') || msg.includes('santé'))
      return `Votre **score de santé** est calculé en tenant compte de vos constantes vitales, de la prise de vos médicaments, de vos vaccins et de vos RDV.\n\nPour l'améliorer :\n• ✅ Prenez vos médicaments régulièrement\n• 📅 Maintenez vos rendez-vous médicaux\n• 💉 Mettez à jour vos vaccins\n• 🏃 Pratiquez 30 min d'activité physique par jour`;
    if (msg.includes('résultat') || msg.includes('analyse') || msg.includes('labo'))
      return `Vos résultats d'analyses sont disponibles dans la section **Résultats labo**. Les valeurs marquées en rouge ou orange méritent attention.\n\n⚠️ *Seul votre médecin peut interpréter correctement vos résultats dans leur contexte clinique.*`;
    if (msg.includes('merci') || msg.includes('super') || msg.includes('ok'))
      return `Avec plaisir ! N'hésitez pas à revenir si vous avez d'autres questions. Prenez soin de vous 😊`;
    return `Je comprends votre question. Pour des informations précises sur **${userMsg.slice(0, 40)}**, je vous recommande de :\n\n1. Consulter les sections dédiées de l'application\n2. Contacter votre médecin via la **Messagerie**\n3. Prendre un RDV via **Trouver un médecin**\n\n⚠️ *NOVA Assistant fournit des informations générales uniquement — pas un avis médical.*`;
  };

  const sendMessage = async () => {
    const txt = input.trim();
    if (!txt) return;
    setMessages(m => [...m, { role: 'user', text: txt, ts: new Date() }]);
    setInput('');
    setTyping(true);
    await new Promise(r => setTimeout(r, 900 + Math.random() * 800));
    setTyping(false);
    setMessages(m => [...m, { role: 'assistant', text: simulateResponse(txt), ts: new Date() }]);
  };

  const renderText = (txt) => txt.split('\n').map((line, i) => {
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return (
      <span key={i}>
        {parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p)}
        {i < txt.split('\n').length - 1 && <br />}
      </span>
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center flex-shrink-0">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Assistant Nova</h2>
          <p className={`text-xs ${sub}`}>IA Santé · Informations générales uniquement</p>
        </div>
        <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> En ligne
        </span>
      </div>

      {/* Disclaimer */}
      <div className={`flex items-start gap-2 p-3 rounded-xl border ${darkMode ? 'bg-amber-900/20 border-amber-800' : 'bg-amber-50 border-amber-200'}`}>
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 dark:text-amber-200">
          <strong>Avertissement médical :</strong> NOVA Assistant fournit des informations générales. Il ne remplace pas un médecin. En cas d'urgence, composez le <strong>15 (SAMU)</strong>.
        </p>
      </div>

      {/* Chat */}
      <div className={`${card} border rounded-2xl flex flex-col`} style={{ height: '480px' }}>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => {
            const isUser = msg.role === 'user';
            return (
              <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-2`}>
                {!isUser && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isUser
                    ? 'bg-red-600 text-white rounded-tr-sm'
                    : (darkMode ? 'bg-slate-800 text-slate-100 rounded-tl-sm' : 'bg-slate-100 text-slate-800 rounded-tl-sm')
                }`}>
                  {renderText(msg.text)}
                  <p className={`text-[10px] mt-1 ${isUser ? 'text-red-100 text-right' : sub}`}>
                    {msg.ts.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })}
          {typing && (
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center flex-shrink-0">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div className={`px-4 py-3 rounded-2xl rounded-tl-sm ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <div className="flex gap-1 items-center">
                  {[0,1,2].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />)}
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Suggestions */}
        {messages.length === 1 && (
          <div className={`px-3 pb-2 border-t ${border}`}>
            <p className={`text-[10px] font-semibold ${sub} mt-2 mb-1.5`}>Suggestions</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => setInput(s)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border ${darkMode ? 'border-slate-700 hover:border-red-500 hover:text-red-400' : 'border-slate-300 hover:border-red-400 hover:text-red-600'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className={`p-3 border-t ${border}`}>
          <div className={`flex items-center gap-2 rounded-2xl border px-3 py-2 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Posez une question à Nova…"
              className={`flex-1 text-sm bg-transparent outline-none ${darkMode ? 'placeholder-slate-500' : 'placeholder-slate-400'}`} />
            <button onClick={sendMessage} disabled={!input.trim() || typing}
              className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 disabled:opacity-40 flex-shrink-0">
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ BIEN-ÊTRE & PRÉVENTION ============ */
function PWell({ data, profile, onReload, notify, card, sub, border, darkMode }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', target: '', unit: '', color: 'emerald' });
  const [saving, setSaving]   = useState(false);

  const goals = data ?? [];

  // IMC
  const weight = profile?.weightKg;
  const height = profile?.heightCm;
  const bmi    = weight && height ? (weight / ((height / 100) ** 2)).toFixed(1) : null;
  const bmiCategory = !bmi ? null
    : bmi < 18.5 ? { label: 'Insuffisance pondérale', color: 'blue' }
    : bmi < 25   ? { label: 'Poids normal',           color: 'emerald' }
    : bmi < 30   ? { label: 'Surpoids',               color: 'amber' }
    : bmi < 35   ? { label: 'Obésité modérée',        color: 'orange' }
    : { label: 'Obésité sévère', color: 'red' };

  const healthTips = [
    { icon: Droplet,     title: 'Hydratation',         tip: 'Buvez au moins 2L d\'eau par jour, davantage si activité physique.',         color: 'cyan' },
    { icon: Moon,        title: 'Sommeil',              tip: 'Dormez 7 à 9 heures par nuit pour une récupération optimale.',              color: 'indigo' },
    { icon: Activity,    title: 'Activité physique',    tip: '30 minutes de marche rapide par jour réduisent le risque cardiaque de 35%.', color: 'blue' },
    { icon: Sun,         title: 'Exposition solaire',   tip: '15 min de soleil/jour favorisent la synthèse de vitamine D.',              color: 'amber' },
    { icon: HeartPulse,  title: 'Stress',               tip: 'Pratiquez la respiration profonde 5 minutes par jour pour réduire le stress.', color: 'rose' },
    { icon: Sparkles,    title: 'Alimentation',         tip: 'Consommez 5 fruits et légumes par jour. Limitez sel, sucre, graisses saturées.', color: 'emerald' },
  ];

  const colorProg = { emerald: 'bg-emerald-500', blue: 'bg-blue-500', cyan: 'bg-cyan-500', indigo: 'bg-indigo-500', amber: 'bg-amber-500', red: 'bg-red-500', orange: 'bg-orange-500', rose: 'bg-rose-500', purple: 'bg-purple-500' };
  const colorBadge = { emerald: 'bg-emerald-100 text-emerald-700', blue: 'bg-blue-100 text-blue-700', cyan: 'bg-cyan-100 text-cyan-700', indigo: 'bg-indigo-100 text-indigo-700', amber: 'bg-amber-100 text-amber-700', red: 'bg-red-100 text-red-600', orange: 'bg-orange-100 text-orange-700' };

  const addGoal = async () => {
    if (!newGoal.title || !newGoal.target) return;
    setSaving(true);
    try {
      await patientApi.createWellnessGoal({ type: 'custom', title: newGoal.title, target: Number(newGoal.target), unit: newGoal.unit, color: newGoal.color });
      onReload?.(await patientApi.wellnessGoals());
      notify?.('Objectif ajouté');
      setShowAdd(false);
      setNewGoal({ title: '', target: '', unit: '', color: 'emerald' });
    } catch (e) { notify?.(e.message || 'Erreur', 'error'); }
    finally { setSaving(false); }
  };

  const updateProgress = async (goal, delta) => {
    const next = Math.max(0, Math.min(goal.target, goal.currentValue + delta));
    const completed = next >= goal.target;
    try {
      await patientApi.updateWellnessGoal(goal.id, { currentValue: next, completed });
      onReload?.(await patientApi.wellnessGoals());
    } catch {}
  };

  const deleteGoal = async (id) => {
    try {
      await patientApi.deleteWellnessGoal(id);
      onReload?.(await patientApi.wellnessGoals());
      notify?.('Objectif supprimé');
    } catch {}
  };

  const completed = goals.filter(g => g.completed).length;

  if (!data) return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Bien-être & Prévention</h2>
      <div className={`${card} border rounded-2xl p-6`}><div className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-48 rounded-xl`} /></div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold">Bien-être & Prévention</h2>
          <p className={`text-sm ${sub}`}>{completed}/{goals.length} objectifs atteints</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5">
          <Plus className="w-3 h-3" /> Objectif
        </button>
      </div>

      {showAdd && (
        <>
          <button className="fixed inset-0 z-40 bg-slate-950/45" onClick={() => setShowAdd(false)} aria-label="Fermer" />
          <div className={`fixed z-50 left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 ${card} border rounded-2xl p-5 shadow-2xl`}>
            <h3 className="font-bold mb-4">Nouvel objectif</h3>
            <div className="space-y-3">
              <input value={newGoal.title} onChange={e => setNewGoal(g => ({ ...g, title: e.target.value }))} placeholder="Ex: Boire 2L d'eau"
                className={`w-full px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} />
              <div className="flex gap-2">
                <input type="number" value={newGoal.target} onChange={e => setNewGoal(g => ({ ...g, target: e.target.value }))} placeholder="Cible (ex: 2000)"
                  className={`flex-1 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} />
                <input value={newGoal.unit} onChange={e => setNewGoal(g => ({ ...g, unit: e.target.value }))} placeholder="mL, pas…"
                  className={`w-24 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} />
              </div>
              <div className="flex gap-2">
                <button onClick={addGoal} disabled={saving || !newGoal.title || !newGoal.target}
                  className="flex-1 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50">
                  {saving ? 'Enregistrement…' : 'Créer'}
                </button>
                <button onClick={() => setShowAdd(false)} className={`flex-1 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>Annuler</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* IMC */}
      {bmi && bmiCategory && (
        <div className={`${card} border rounded-2xl p-5`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm">Indice de Masse Corporelle (IMC)</h3>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${colorBadge[bmiCategory.color] || 'bg-slate-100 text-slate-600'}`}>{bmiCategory.label}</span>
          </div>
          <div className="flex items-end gap-3">
            <span className="text-5xl font-black">{bmi}</span>
            <div className={`text-sm ${sub} mb-1`}>
              <p>{weight} kg · {height} cm</p>
            </div>
          </div>
          <div className={`mt-3 h-3 rounded-full overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
            <div className={`h-3 rounded-full bg-gradient-to-r from-blue-400 via-emerald-400 via-amber-400 to-red-500`} style={{ width: '100%' }} />
          </div>
          <div className="flex justify-between text-[10px] mt-1">
            {['<18.5', '18.5-25', '25-30', '30-35', '>35'].map(l => <span key={l} className={sub}>{l}</span>)}
          </div>
          <div className="relative h-2 mt-0">
            <div className="absolute w-3 h-3 rounded-full border-2 border-white bg-slate-800 -translate-y-4 -translate-x-1.5 shadow-md"
              style={{ left: `${Math.min(98, Math.max(2, ((Number(bmi) - 15) / 25) * 100))}%` }} />
          </div>
        </div>
      )}

      {/* Objectifs */}
      <div className={`${card} border rounded-2xl p-5`}>
        <h3 className="font-bold text-sm mb-3">Mes objectifs du jour</h3>
        {goals.length === 0 ? (
          <p className={`text-sm ${sub} text-center py-4`}>Aucun objectif — cliquez sur "Objectif" pour en créer un.</p>
        ) : (
          <div className="space-y-3">
            {goals.map((goal) => {
              const prog = goal.progress;
              const barColor = colorProg[goal.color] || colorProg.emerald;
              return (
                <div key={goal.id} className={`p-3 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      {goal.completed && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      <span className={`text-sm font-semibold ${goal.completed ? 'line-through opacity-60' : ''}`}>{goal.title}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateProgress(goal, -Math.max(1, goal.target * 0.05))} className={`w-6 h-6 rounded-full ${darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-white hover:bg-slate-100'} flex items-center justify-center text-xs font-bold`}>−</button>
                      <span className={`text-xs font-bold min-w-12 text-center`}>{goal.currentValue}/{goal.target} {goal.unit}</span>
                      <button onClick={() => updateProgress(goal, Math.max(1, goal.target * 0.05))} className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold hover:bg-emerald-700">+</button>
                      <button onClick={() => deleteGoal(goal.id)} className={`ml-1 ${sub} hover:text-red-500`}><X className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <div className={`h-2 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                    <div className={`h-2 rounded-full transition-all ${barColor}`} style={{ width: `${prog}%` }} />
                  </div>
                  <p className={`text-[10px] ${sub} mt-1`}>{prog}% accompli</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tips santé */}
      <div className={`${card} border rounded-2xl p-5`}>
        <h3 className="font-bold text-sm mb-3">Conseils prévention</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {healthTips.map(({ icon: Icon, title, tip, color }) => (
            <div key={title} className={`flex items-start gap-3 p-3 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <div className={`w-8 h-8 rounded-lg bg-${color}-100 flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-4 h-4 text-${color}-600`} />
              </div>
              <div>
                <p className="text-xs font-bold">{title}</p>
                <p className={`text-xs ${sub} mt-0.5 leading-relaxed`}>{tip}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PMsg({ data, card, sub, border, darkMode, setShowVid }) {
  const [convList, setConvList]     = useState(data || []);
  const [selId, setSelId]           = useState(null);
  const [convData, setConvData]     = useState(null);
  const [convLoading, setConvLoading] = useState(false);
  const [msgText, setMsgText]       = useState('');
  const [sending, setSending]       = useState(false);
  const [showList, setShowList]     = useState(true); // mobile toggle
  const endRef   = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { if (data) setConvList(data); }, [data]);

  // auto-scroll when messages change
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convData?.messages?.length]);

  // auto-open first conversation on load
  useEffect(() => {
    if (convList.length > 0 && !selId) openConversation(convList[0].id);
  }, [convList]);

  const openConversation = async (id) => {
    if (id === selId && convData) return;
    setSelId(id);
    setConvData(null);
    setConvLoading(true);
    setShowList(false);
    try {
      const full = await patientApi.conversation(id);
      setConvData(full);
      await patientApi.markConversationRead(id);
      setConvList(prev => prev.map(c => c.id === id ? { ...c, unreadCount: 0 } : c));
    } catch { /* ignore */ }
    finally { setConvLoading(false); }
  };

  const sendMessage = async () => {
    const body = msgText.trim();
    if (!body || !selId || sending) return;
    setSending(true);
    setMsgText('');
    try {
      const msg = await patientApi.sendMessage(selId, { body });
      setConvData(prev => ({ ...prev, messages: [...(prev.messages || []), msg] }));
      setConvList(prev => prev.map(c =>
        c.id === selId ? { ...c, lastMessage: body, updatedAt: msg.createdAt } : c
      ));
    } catch { setMsgText(body); }
    finally { setSending(false); }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const formatMsgTime = (iso) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday
      ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const formatMsgDate = (iso) => new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  if (!data) return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Messages</h2>
      <div className={`${card} border rounded-2xl p-6`}>
        <div className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-96 rounded-lg`}></div>
      </div>
    </div>
  );

  const activeConv = convList.find(c => c.id === selId);

  /* ── group messages by day ── */
  const groupedMessages = (() => {
    if (!convData?.messages?.length) return [];
    const groups = [];
    let lastDate = null;
    for (const msg of convData.messages) {
      const day = new Date(msg.createdAt).toDateString();
      if (day !== lastDate) { groups.push({ type: 'date', label: formatMsgDate(msg.createdAt) }); lastDate = day; }
      groups.push({ type: 'msg', msg });
    }
    return groups;
  })();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Messages</h2>
        <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-100'} ${sub}`}>
          {convList.reduce((s, c) => s + c.unreadCount, 0)} non lu{convList.reduce((s, c) => s + c.unreadCount, 0) > 1 ? 's' : ''}
        </span>
      </div>

      {convList.length === 0 ? (
        <div className={`${card} border rounded-2xl p-12 flex flex-col items-center text-center`}>
          <MessageCircle className={`w-12 h-12 ${sub} mb-4`} />
          <p className="font-semibold">Aucune conversation</p>
          <p className={`text-xs ${sub} mt-1`}>Vos échanges avec les médecins apparaîtront ici.</p>
        </div>
      ) : (
        <div className={`${card} border rounded-2xl overflow-hidden flex`} style={{ height: '72vh', minHeight: 500 }}>

          {/* ── Liste conversations ── */}
          <div className={`${showList ? 'flex' : 'hidden md:flex'} flex-col w-full md:w-72 shrink-0 border-r ${border}`}>
            <div className={`p-3 border-b ${border} flex items-center gap-2`}>
              <MessageCircle className="w-4 h-4 text-red-600" />
              <span className="font-bold text-sm">Conversations</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {convList.map(c => {
                const unread = c.unreadCount > 0;
                const active = c.id === selId;
                return (
                  <button key={c.id} onClick={() => openConversation(c.id)}
                    className={`w-full p-3 border-b ${border} flex items-start gap-3 text-left transition-colors
                      ${active ? (darkMode ? 'bg-red-900/30 border-l-2 border-l-red-500' : 'bg-red-50 border-l-2 border-l-red-500')
                               : (darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50')}`}>
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center font-bold text-sm">
                        {initials(c.doctorName)}
                      </div>
                      {unread && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center">{c.unreadCount}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-sm truncate ${unread ? 'font-bold' : 'font-semibold'}`}>{c.doctorName}</p>
                        <p className={`text-[10px] shrink-0 ${sub}`}>{formatRelativeDate(c.updatedAt)}</p>
                      </div>
                      {c.doctorSpecialty && <p className={`text-[11px] ${sub} mb-0.5`}>{c.doctorSpecialty}</p>}
                      <p className={`text-xs truncate ${unread ? (darkMode ? 'text-slate-200' : 'text-slate-700') : sub}`}>{c.lastMessage}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Panneau chat ── */}
          <div className={`${showList ? 'hidden md:flex' : 'flex'} flex-col flex-1 min-w-0`}>
            {activeConv ? (
              <>
                {/* Header */}
                <div className={`p-3 border-b ${border} flex items-center gap-3`}>
                  <button className={`md:hidden p-1.5 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                    onClick={() => setShowList(true)}>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {initials(activeConv.doctorName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{activeConv.doctorName}</p>
                    {activeConv.doctorSpecialty && <p className={`text-xs ${sub}`}>{activeConv.doctorSpecialty}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`} title="Appel audio">
                      <Phone className="w-4 h-4 text-emerald-600" />
                    </button>
                    <button onClick={() => setShowVid?.(true)} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`} title="Vidéo">
                      <Video className="w-4 h-4 text-blue-600" />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className={`flex-1 overflow-y-auto p-4 space-y-1 ${darkMode ? 'bg-slate-950' : 'bg-slate-50/60'}`}>
                  {convLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full" />
                    </div>
                  ) : groupedMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <MessageCircle className={`w-10 h-10 ${sub} mb-2`} />
                      <p className={`text-sm ${sub}`}>Démarrez la conversation</p>
                    </div>
                  ) : (
                    groupedMessages.map((item, idx) => {
                      if (item.type === 'date') return (
                        <div key={`date-${idx}`} className="flex items-center gap-3 py-2">
                          <div className={`flex-1 h-px ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
                          <span className={`text-[10px] font-semibold capitalize ${sub}`}>{item.label}</span>
                          <div className={`flex-1 h-px ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
                        </div>
                      );
                      const { msg } = item;
                      const isPatient = msg.senderRole === 'patient';
                      return (
                        <div key={msg.id} className={`flex ${isPatient ? 'justify-end' : 'justify-start'} mb-1`}>
                          {!isPatient && (
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mr-2 mt-1">
                              {initials(activeConv.doctorName)}
                            </div>
                          )}
                          <div className={`max-w-[72%] group`}>
                            <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed
                              ${isPatient
                                ? 'bg-red-600 text-white rounded-tr-sm'
                                : (darkMode ? 'bg-slate-800 text-slate-100 rounded-tl-sm' : 'bg-white text-slate-800 shadow-sm rounded-tl-sm border border-slate-100')
                              }`}>
                              {msg.body}
                            </div>
                            <p className={`text-[10px] mt-0.5 ${sub} ${isPatient ? 'text-right' : 'text-left'}`}>
                              {formatMsgTime(msg.createdAt)}
                              {isPatient && msg.isRead && <span className="ml-1 text-blue-400">✓✓</span>}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={endRef} />
                </div>

                {/* Input */}
                <div className={`p-3 border-t ${border}`}>
                  <div className={`flex items-end gap-2 rounded-2xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} px-3 py-2`}>
                    <button className={`p-1 rounded-lg ${sub} hover:text-red-600 shrink-0 mb-0.5`} title="Joindre un fichier">
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <textarea
                      ref={inputRef}
                      value={msgText}
                      onChange={(e) => setMsgText(e.target.value)}
                      onKeyDown={handleKey}
                      placeholder="Écrire un message… (Entrée pour envoyer)"
                      rows={1}
                      className={`flex-1 resize-none bg-transparent text-sm outline-none max-h-28 leading-relaxed ${darkMode ? 'text-slate-100 placeholder-slate-500' : 'text-slate-800 placeholder-slate-400'}`}
                      style={{ fieldSizing: 'content' }}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!msgText.trim() || sending}
                      className="shrink-0 w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors mb-0.5">
                      {sending
                        ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <Send className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className={`text-[10px] ${sub} text-center mt-1.5`}>Messagerie médicale sécurisée · Nova</p>
                </div>
              </>
            ) : (
              <div className={`flex-1 flex flex-col items-center justify-center gap-3 ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
                <MessageCircle className={`w-12 h-12 ${sub}`} />
                <p className={`text-sm ${sub}`}>Sélectionnez une conversation</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function PDocs({ data, onReload, notify, card, sub, border, darkMode }) {
  const [f, setF] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [docForm, setDocForm] = useState({ title: '', category: 'prescription' });
  const [pickedFile, setPickedFile] = useState(null);
  const fileInputRef = useRef(null);

  const apiDocs = data?.length ? data.map((doc) => ({
    n: doc.title,
    t: doc.mimeType?.includes('pdf') ? 'PDF' : doc.mimeType?.includes('image') ? 'IMG' : 'DOC',
    cat: mapDocumentCategory(doc.category),
    d: formatDate(doc.createdAt),
    s: formatBytes(doc.sizeBytes),
    I: doc.category === 'lab' ? Microscope : doc.category === 'vaccine' ? ClipboardList : FileText,
    c: doc.category === 'lab' ? 'purple' : doc.category === 'vaccine' ? 'emerald' : 'red',
    id: doc.id,
    filePath: doc.filePath,
  })) : [];
  const filt = f === 'all' ? apiDocs : apiDocs.filter(d => d.cat === f);
  const cats = [
    { id: 'all', l: 'Tous' }, { id: 'ordonnance', l: 'Ordonnances' },
    { id: 'analyse', l: 'Analyses' }, { id: 'consultation', l: 'Consultations' },
    { id: 'certificat', l: 'Certificats' }
  ];

  const pickFile = (file) => {
    if (!file) return;
    setPickedFile(file);
    if (!docForm.title) setDocForm(f => ({ ...f, title: file.name.replace(/\.[^.]+$/, '') }));
  };

  const uploadDocument = async () => {
    if (!pickedFile && !docForm.title) { notify?.('Sélectionnez un fichier ou saisissez un titre', 'error'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      if (pickedFile) fd.append('file', pickedFile);
      fd.append('title', docForm.title || pickedFile?.name || 'Document');
      fd.append('category', docForm.category);
      await patientApi.uploadDocument(fd);
      onReload?.(await patientApi.documents());
      notify?.('Document ajouté');
      setShowForm(false);
      setDocForm({ title: '', category: 'prescription' });
      setPickedFile(null);
    } catch (error) {
      notify?.(error.message || 'Erreur upload', 'error');
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (id) => {
    if (!id) return;
    try {
      await patientApi.deleteDocument(id);
      onReload?.(await patientApi.documents());
      notify?.('Document supprimé');
      setPendingDelete(null);
    } catch (error) {
      notify?.(error.message || 'Erreur suppression', 'error');
    }
  };

  if (!data) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Mes Documents</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[0,1,2,3].map(i => <div key={i} className={`${card} border rounded-2xl p-4`}><div className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-32 rounded-lg`}></div></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className="text-2xl font-bold">Mes Documents</h2><p className={`text-sm ${sub}`}>{apiDocs.length} document{apiDocs.length > 1 ? 's' : ''} • Stockage chiffré</p></div>
        <button onClick={() => setShowForm(true)} className="px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold flex items-center gap-1">
          <Plus className="w-3 h-3" /> Importer
        </button>
      </div>

      {showForm && (
        <>
          <button className="fixed inset-0 z-40 bg-slate-950/45" onClick={() => { setShowForm(false); setPickedFile(null); }} aria-label="Fermer"></button>
          <div className={`fixed z-50 left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 ${card} border rounded-2xl p-5 shadow-2xl`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">Importer un document</h3>
              <button onClick={() => { setShowForm(false); setPickedFile(null); }}><X className="w-4 h-4" /></button>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files[0]); }}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer border-2 border-dashed rounded-xl p-6 text-center mb-3 transition-colors ${
                dragOver ? 'border-red-500 bg-red-50' :
                pickedFile ? 'border-emerald-500 bg-emerald-50' :
                (darkMode ? 'border-slate-600 hover:border-red-500' : 'border-slate-300 hover:border-red-400')
              }`}
            >
              <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={e => pickFile(e.target.files?.[0])} />
              {pickedFile ? (
                <div className="flex items-center justify-center gap-2 text-emerald-700">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-semibold truncate max-w-xs">{pickedFile.name}</span>
                  <span className={`text-xs ${sub}`}>({formatBytes(pickedFile.size)})</span>
                </div>
              ) : (
                <>
                  <HardDrive className={`w-8 h-8 mx-auto mb-2 ${sub}`} />
                  <p className={`text-sm font-medium ${sub}`}>Glissez-déposez ou cliquez pour choisir</p>
                  <p className={`text-xs ${sub} mt-1`}>PDF, JPG, PNG, WEBP — max 10 Mo</p>
                </>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
              <input value={docForm.title} onChange={e => setDocForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Titre du document"
                className={`col-span-2 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} />
              <select value={docForm.category} onChange={e => setDocForm(f => ({ ...f, category: e.target.value }))}
                className={`px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}>
                <option value="prescription">Ordonnance</option>
                <option value="lab">Analyse</option>
                <option value="consultation">Consultation</option>
                <option value="vaccine">Certificat</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button onClick={uploadDocument} disabled={uploading || (!pickedFile && !docForm.title)}
                className="flex-1 px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                {uploading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FileDown className="w-4 h-4" />}
                {uploading ? 'Import en cours…' : 'Importer'}
              </button>
              <button onClick={() => { setShowForm(false); setPickedFile(null); }}
                className={`flex-1 px-3 py-2 rounded-lg border text-sm font-semibold ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>
                Annuler
              </button>
            </div>
          </div>
        </>
      )}

      {pendingDelete && (
        <>
          <button className="fixed inset-0 z-40 bg-slate-950/45" onClick={() => setPendingDelete(null)} aria-label="Fermer"></button>
          <div className={`fixed z-50 left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 ${card} border rounded-2xl p-5 shadow-2xl`}>
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="font-bold text-center mb-1">Supprimer ce document ?</p>
            <p className={`text-xs ${sub} text-center mb-4`}>{pendingDelete.n}</p>
            <div className="flex gap-2">
              <button onClick={() => deleteDocument(pendingDelete.id)} className="flex-1 px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold">Supprimer</button>
              <button onClick={() => setPendingDelete(null)} className={`flex-1 px-3 py-2 rounded-lg border text-sm font-semibold ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>Annuler</button>
            </div>
          </div>
        </>
      )}
      <div className={`flex gap-1 p-1 rounded-xl ${darkMode ? 'bg-slate-900' : 'bg-slate-100'} overflow-x-auto`}>
        {cats.map(c => {
          const cnt = c.id === 'all' ? apiDocs.length : apiDocs.filter(d => d.cat === c.id).length;
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
            <p className={`text-[10px] ${sub} truncate mt-0.5`}>{d.cat}</p>
            <div className={`flex items-center justify-between mt-3 pt-3 border-t border-dashed ${border}`}>
              <span className={`text-[10px] ${sub}`}>{d.d}</span><span className={`text-[10px] ${sub}`}>{d.s}</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 mt-3">
              {d.filePath ? (
                <a href={`http://localhost:4001/uploads/${d.filePath.split(/[\\/]/).slice(-2).join('/')}`}
                  target="_blank" rel="noreferrer"
                  className={`px-2 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <Download className="w-3 h-3" /> Ouvrir
                </a>
              ) : (
                <div className={`px-2 py-1.5 rounded-lg text-[10px] flex items-center justify-center gap-1 ${darkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
                  <FileText className="w-3 h-3" /> Sans fichier
                </div>
              )}
              <button onClick={() => d.id ? setPendingDelete(d) : undefined} className="px-2 py-1.5 rounded-lg text-[10px] font-bold bg-red-600 text-white flex items-center justify-center gap-1 hover:bg-red-700"><Trash2 className="w-3 h-3" /> Suppr.</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PNotes({ data, onReload, notify, card, sub, border, darkMode }) {
  const [ns, setNs] = useState([]);
  const [sel, setSel] = useState(null);
  const [edit, setEdit] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  useEffect(() => {
    if (!data) return;
    const apiNotes = data.map((note) => ({
      id: note.id,
      t: note.title,
      c: note.content,
      col: note.color,
      u: formatRelativeDate(note.updatedAt),
      p: note.pinned,
    }));
    setNs(apiNotes);
    if (!sel || !apiNotes.find(n => n.id === sel.id)) setSel(apiNotes[0] || null);
  }, [data]);
  const cm = {
    amber: { bg: 'bg-amber-100', t: 'text-amber-900', b: 'border-amber-300', tab: 'bg-amber-400' },
    blue: { bg: 'bg-blue-100', t: 'text-blue-900', b: 'border-blue-300', tab: 'bg-blue-400' },
    emerald: { bg: 'bg-emerald-100', t: 'text-emerald-900', b: 'border-emerald-300', tab: 'bg-emerald-400' },
    red: { bg: 'bg-red-100', t: 'text-red-900', b: 'border-red-300', tab: 'bg-red-400' },
    purple: { bg: 'bg-purple-100', t: 'text-purple-900', b: 'border-purple-300', tab: 'bg-purple-400' }
  };

  const add = async () => {
    const created = await patientApi.createNote({ title: 'Nouvelle note', content: '', color: 'amber', pinned: false });
    const n = { id: created.id, t: created.title, c: created.content, col: created.color, u: 'À l\'instant', p: created.pinned };
    setNs([n, ...ns]); setSel(n); setEdit(true);
    onReload?.(await patientApi.notes());
  };
  const upd = async (ch) => {
    const u = { ...sel, ...ch, u: 'À l\'instant' };
    setSel(u); setNs(ns.map(n => n.id === u.id ? u : n));
    await patientApi.updateNote(u.id, { title: u.t, content: u.c, color: u.col, pinned: u.p });
    onReload?.(await patientApi.notes());
  };
  const del = async (id) => {
    try {
      await patientApi.deleteNote(id);
      const f = ns.filter(n => n.id !== id);
      setNs(f); if (sel?.id === id) setSel(f[0] || null);
      onReload?.(await patientApi.notes());
      notify?.('Note supprimée');
      setPendingDelete(null);
    } catch (error) {
      notify?.(error.message || 'Erreur suppression', 'error');
    }
  };
  const updLocal = (ch) => {
    const u = { ...sel, ...ch, u: 'A l\'instant' };
    setSel(u); setNs(ns.map(n => n.id === u.id ? u : n));
  };
  const saveNote = async () => {
    if (!sel) return;
    try {
      await patientApi.updateNote(sel.id, { title: sel.t, content: sel.c, color: sel.col, pinned: sel.p });
      onReload?.(await patientApi.notes());
      notify?.('Note enregistrée');
      setEdit(false);
    } catch (error) {
      notify?.(error.message || 'Erreur note', 'error');
    }
  };

  if (!data) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Bloc-notes</h2>
        <div className={`${card} border rounded-2xl p-4 min-h-[600px]`}><div className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-96 rounded-lg`}></div></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className="text-2xl font-bold">Bloc-notes</h2><p className={`text-sm ${sub}`}>{ns.length} note{ns.length > 1 ? 's' : ''}</p></div>
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
                  <input type="text" value={sel.t} onChange={(e) => updLocal({ t: e.target.value })}
                    className={`flex-1 text-xl font-bold bg-transparent outline-none border-b-2 ${border} pb-1`} />
                ) : (
                  <h3 className="text-xl font-bold flex-1">{sel.t}</h3>
                )}
                <div className="flex items-center gap-1">
                  <button onClick={() => upd({ p: !sel.p })} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                    <Star className={`w-4 h-4 ${sel.p ? 'text-amber-500 fill-amber-500' : sub}`} />
                  </button>
                  <button onClick={() => edit ? saveNote() : setEdit(true)} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                    {edit ? <Save className="w-4 h-4 text-emerald-600" /> : <Pencil className="w-4 h-4" />}
                  </button>
                  <button onClick={() => setPendingDelete(sel.id)} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
              {edit && (
                <div className="flex gap-2">
                  {Object.keys(cm).map(c => (
                    <button key={c} onClick={() => updLocal({ col: c })} className={`w-6 h-6 rounded-full ${cm[c].tab} ${sel.col === c ? 'ring-2 ring-offset-2 ring-slate-900' : ''}`}></button>
                  ))}
                </div>
              )}
              <p className={`text-xs ${sub}`}>Mis à jour : {sel.u}</p>
              {edit ? (
                <textarea value={sel.c} onChange={(e) => updLocal({ c: e.target.value })} placeholder="Écrivez..."
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
      {pendingDelete && (
        <ConfirmDialog
          title="Supprimer la note"
          message="Cette action retirera definitivement cette note."
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => del(pendingDelete)}
          card={card}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ASSURANCE
   ════════════════════════════════════════════════════════════════ */
function PInsurance({ data, card, sub, border, darkMode }) {
  if (!data) return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Mes Assurances</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0,1].map(i => <div key={i} className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-40 rounded-2xl`} />)}
      </div>
    </div>
  );

  const colorMap = {
    blue:    { bg: 'from-blue-600 to-blue-800',    badge: 'bg-blue-100 text-blue-700' },
    emerald: { bg: 'from-emerald-600 to-teal-700', badge: 'bg-emerald-100 text-emerald-700' },
    red:     { bg: 'from-red-600 to-red-800',      badge: 'bg-red-100 text-red-700' },
    amber:   { bg: 'from-amber-500 to-orange-600', badge: 'bg-amber-100 text-amber-700' },
  };

  const totalRate = data.length ? Math.round(data.reduce((s, i) => s + i.reimbursementRate, 0) / data.length) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Mes Assurances</h2>
          <p className={`text-sm ${sub}`}>Couvertures santé actives</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-bold">
          <Shield className="w-4 h-4" />
          Taux moyen : {totalRate}%
        </div>
      </div>

      {data.length === 0 ? (
        <div className={`${card} border rounded-2xl p-10 flex flex-col items-center text-center gap-3`}>
          <Shield className={`w-10 h-10 ${sub}`} />
          <p className={`text-sm ${sub}`}>Aucune assurance enregistrée</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.map((ins) => {
            const c = colorMap[ins.logoColor] || colorMap.blue;
            const isActive = ins.status === 'active';
            const validTo = ins.validTo ? new Date(ins.validTo).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' }) : '—';
            const validFrom = ins.validFrom ? new Date(ins.validFrom).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' }) : '—';
            return (
              <div key={ins.id} className={`rounded-2xl overflow-hidden border ${darkMode ? 'border-slate-700' : 'border-slate-200'} shadow-sm`}>
                {/* Header carte */}
                <div className={`bg-gradient-to-r ${c.bg} text-white p-5`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center font-black text-lg">
                      {ins.provider.slice(0, 2)}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60'}`}>
                      {isActive ? 'Actif' : 'Expiré'}
                    </span>
                  </div>
                  <p className="font-black text-xl tracking-wide">{ins.provider}</p>
                  <p className="text-xs text-white/70 mt-1 font-mono">{ins.policyNumber}</p>
                </div>
                {/* Corps */}
                <div className={`${darkMode ? 'bg-slate-900' : 'bg-white'} p-4 space-y-3`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${sub}`}>Titulaire</span>
                    <span className="text-sm font-semibold">{ins.holderName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${sub}`}>Couverture</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${c.badge}`}>{ins.coverageType}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${sub}`}>Validité</span>
                    <span className="text-xs font-semibold">{validFrom} → {validTo}</span>
                  </div>
                  <div className={`pt-2 border-t ${border}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs ${sub}`}>Taux de remboursement</span>
                      <span className="text-sm font-black text-emerald-600">{ins.reimbursementRate}%</span>
                    </div>
                    <div className={`w-full h-2 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                      <div className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${ins.reimbursementRate}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Infos remboursement */}
      <div className={`${card} border rounded-2xl p-5`}>
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Processus de remboursement
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { step: '1', title: 'Consultation',   desc: 'Demandez une fiche de soins lors de votre visite',         icon: Stethoscope },
            { step: '2', title: 'Soumission',      desc: 'Envoyez les justificatifs à votre assureur',               icon: FileText },
            { step: '3', title: 'Remboursement',   desc: 'Sous 5 à 10 jours ouvrés selon votre contrat',            icon: CheckCircle2 },
          ].map(({ step, title, desc, icon: Icon }) => (
            <div key={step} className={`flex gap-3 p-3 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <div className="w-7 h-7 rounded-full bg-red-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0">{step}</div>
              <div>
                <p className="font-semibold text-sm">{title}</p>
                <p className={`text-xs ${sub} mt-0.5`}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   PHARMACIE CONNECTÉE
   ════════════════════════════════════════════════════════════════ */
function PPharmacy({ data, card, sub, border, darkMode, notify }) {
  const [search, setSearch] = useState('');
  const [selectedPh, setSelectedPh] = useState(null);
  const [orders, setOrders] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [tab, setTab] = useState('list'); // 'list' | 'orders'

  const pharmacies = data || [];

  const filtered = pharmacies.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.city.toLowerCase().includes(search.toLowerCase())
  );

  const loadOrders = async () => {
    try {
      const o = await patientApi.pharmacyOrders();
      setOrders(o);
    } catch { setOrders([]); }
  };

  const handleTabOrders = () => {
    setTab('orders');
    if (!orders) loadOrders();
  };

  const submitOrder = async (pharmacyId) => {
    setOrderLoading(true);
    try {
      await patientApi.createPharmacyOrder({ pharmacyId });
      notify('Commande envoyée à la pharmacie !');
      setShowOrderModal(false);
      setSelectedPh(null);
      loadOrders();
    } catch (e) {
      notify(e.message || 'Erreur lors de la commande', 'error');
    } finally {
      setOrderLoading(false);
    }
  };

  const statusColors = {
    pending:   'bg-amber-100 text-amber-700',
    ready:     'bg-emerald-100 text-emerald-700',
    delivered: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  const statusLabels = {
    pending:   'En préparation',
    ready:     'Prêt à récupérer',
    delivered: 'Livré',
    cancelled: 'Annulé',
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Pharmacie Connectée</h2>
        <p className={`text-sm ${sub}`}>Trouvez une pharmacie et commandez vos médicaments</p>
      </div>

      {/* Tabs */}
      <div className={`flex gap-1 p-1 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
        {[{ id: 'list', label: 'Pharmacies', icon: MapPin }, { id: 'orders', label: 'Mes commandes', icon: ClipboardList }].map(t => (
          <button key={t.id} onClick={() => t.id === 'orders' ? handleTabOrders() : setTab('list')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t.id ? 'bg-white shadow text-red-600 ' + (darkMode ? 'bg-slate-700 shadow-slate-900' : '') : sub}`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {tab === 'list' && (
        <>
          {/* Recherche */}
          <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <Search className={`w-4 h-4 ${sub} flex-shrink-0`} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher une pharmacie..."
              className={`flex-1 bg-transparent outline-none text-sm`} />
            {search && <button onClick={() => setSearch('')}><X className={`w-4 h-4 ${sub}`} /></button>}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl p-4 text-center">
              <p className="text-2xl font-black">{filtered.filter(p => p.isOpen).length}</p>
              <p className="text-[11px]">Ouvertes</p>
            </div>
            <div className="bg-gradient-to-br from-red-600 to-red-800 text-white rounded-xl p-4 text-center">
              <p className="text-2xl font-black">{filtered.filter(p => p.isDuty).length}</p>
              <p className="text-[11px]">De garde</p>
            </div>
            <div className={`${card} border rounded-xl p-4 text-center`}>
              <p className="text-2xl font-black">{filtered.length}</p>
              <p className={`text-[11px] ${sub}`}>Total</p>
            </div>
          </div>

          {/* Liste */}
          <div className="space-y-3">
            {filtered.length === 0 && (
              <div className={`${card} border rounded-2xl p-8 flex flex-col items-center gap-2`}>
                <MapPin className={`w-8 h-8 ${sub}`} />
                <p className={`text-sm ${sub}`}>Aucune pharmacie trouvée</p>
              </div>
            )}
            {filtered.map(ph => (
              <div key={ph.id} className={`${card} border rounded-2xl p-4 flex items-start gap-4`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${ph.isDuty ? 'bg-red-100' : ph.isOpen ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                  {ph.isDuty ? <Siren className="w-6 h-6 text-red-600" /> : <MapPin className={`w-6 h-6 ${ph.isOpen ? 'text-emerald-600' : sub}`} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-bold">{ph.name}</p>
                    {ph.isDuty && <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700 animate-pulse">GARDE</span>}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ph.isOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {ph.isOpen ? `Ouvert · ${ph.opensAt}–${ph.closesAt}` : 'Fermé'}
                    </span>
                  </div>
                  <p className={`text-xs ${sub}`}>{ph.address}</p>
                  <p className={`text-xs ${sub}`}>{ph.city} · {ph.distanceKm} km</p>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <a href={`tel:${ph.phone}`} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700">
                      <Phone className="w-3 h-3" />{ph.phone}
                    </a>
                    <button onClick={() => { setSelectedPh(ph); setShowOrderModal(true); }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700">
                      <Pill className="w-3 h-3" /> Commander
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'orders' && (
        <div className="space-y-3">
          {!orders ? (
            <div className={`${card} border rounded-2xl p-6`}>
              <div className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-32 rounded-lg`} />
            </div>
          ) : orders.length === 0 ? (
            <div className={`${card} border rounded-2xl p-10 flex flex-col items-center gap-2 text-center`}>
              <ClipboardList className={`w-10 h-10 ${sub}`} />
              <p className={`text-sm ${sub}`}>Aucune commande</p>
              <button onClick={() => setTab('list')} className="mt-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold">
                Trouver une pharmacie
              </button>
            </div>
          ) : orders.map(o => (
            <div key={o.id} className={`${card} border rounded-2xl p-4 flex items-center gap-4`}>
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <Pill className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{o.pharmacyName}</p>
                <p className={`text-xs ${sub}`}>{o.pharmacyAddress}</p>
                <p className={`text-xs ${sub}`}>{new Date(o.createdAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' })}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${statusColors[o.status] || 'bg-slate-100 text-slate-600'}`}>
                {statusLabels[o.status] || o.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Modal commande */}
      {showOrderModal && selectedPh && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowOrderModal(false)}>
          <div className={`${card} border rounded-2xl p-6 w-full max-w-md shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Commander</h3>
              <button onClick={() => setShowOrderModal(false)} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><X className="w-4 h-4" /></button>
            </div>
            <div className={`p-3 rounded-xl mb-4 ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <p className="font-semibold">{selectedPh.name}</p>
              <p className={`text-xs ${sub}`}>{selectedPh.address}</p>
              <p className={`text-xs ${sub}`}>{selectedPh.distanceKm} km · {selectedPh.phone}</p>
            </div>
            <p className={`text-xs ${sub} mb-4`}>La pharmacie recevra votre demande et préparera vos médicaments. Vous serez notifié quand la commande sera prête.</p>
            <button onClick={() => submitOrder(selectedPh.id)} disabled={orderLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50">
              {orderLoading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Envoi...</> : <><Pill className="w-4 h-4" /> Confirmer la commande</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SettingsPage({ data, card, sub, border, darkMode }) {
  const [as, setAs] = useState('notif');
  const [s, setS] = useState({
    notif: { pill: true, rdv: true, msg: true, eme: true, news: true, promo: false },
    priv: { dr: true, fam: false, res: true, qr: true },
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
  useEffect(() => {
    if (!data) return;
    setS((current) => ({
      ...current,
      notif: {
        ...current.notif,
        rdv: data.notifications?.appointments ?? current.notif.rdv,
        pill: data.notifications?.medications ?? current.notif.pill,
        msg: data.notifications?.messages ?? current.notif.msg,
      },
      priv: {
        ...current.priv,
        dr: data.privacy?.shareWithDoctors ?? current.priv.dr,
        qr: data.privacy?.emergencyQr ?? current.priv.qr,
      },
      app: {
        ...current.app,
        lg: data.display?.language?.toUpperCase?.() || current.app.lg,
      },
    }));
  }, [data]);
  const upd = async (cat, k, v) => {
    const next = { ...s, [cat]: { ...s[cat], [k]: v !== undefined ? v : !s[cat][k] } };
    setS(next);
    await patientApi.updateSettings({
      notifications: {
        appointments: next.notif.rdv,
        medications: next.notif.pill,
        messages: next.notif.msg,
      },
      privacy: {
        emergencyQr: next.priv.qr,
        shareWithDoctors: next.priv.dr,
      },
      display: {
        language: String(next.app.lg || 'FR').toLowerCase(),
        density: 'comfortable',
      },
    });
  };

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
              <R l="QR Code d'urgence" d="Accès rapide aux infos médicales"><T ch={s.priv.qr} on={() => upd('priv', 'qr')} /></R>
              <button className={`w-full mt-3 p-3 rounded-xl text-sm font-semibold ${darkMode ? 'bg-slate-800' : 'bg-slate-100'} flex items-center justify-center gap-2`}>
                <Eye className="w-4 h-4" /> Qui a consulté mon dossier ?
              </button>
            </div>
          )}
          {as === 'sec' && (
            <div className="space-y-3">
              <h3 className="font-bold text-lg flex items-center gap-2"><Shield className="w-5 h-5 text-emerald-600" /> Sécurité</h3>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900">Ces paramètres sont enregistrés localement. Ils seront synchronisés avec le serveur dans une prochaine version.</p>
              </div>
              <R l="Authentification biométrique" d="Empreinte ou face ID"><T ch={s.sec.bio} on={() => upd('sec', 'bio')} /></R>
              <R l="Double authentification" d="Code SMS supplémentaire"><T ch={s.sec.ds} on={() => upd('sec', 'ds')} /></R>
              <R l="Verrouillage automatique" d="Délai déconnexion">
                <select value={s.sec.lock} onChange={(e) => upd('sec', 'lock', e.target.value)} className={`px-3 py-1.5 rounded-lg border text-sm ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-300'}`}>
                  <option>Jamais</option><option>1min</option><option>5min</option><option>15min</option>
                </select>
              </R>
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
