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
    dna: <PDNA data={apiData.profile || apiData.dashboard?.profile} {...p} />,
    history: <PHistory data={apiData.history} {...p} />,
    messages: <PMsg data={apiData.messages} setShowVid={setShowVid} {...p} />,
    documents: <PDocs data={apiData.documents} onReload={(value) => replacePageDataAndRefreshDashboard('documents', value)} notify={notify} {...p} />,
    notes: <PNotes data={apiData.notes} onReload={(value) => replacePageData('notes', value)} notify={notify} {...p} />,
    wellness: <PWell {...p} />,
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
      <div><h2 className="text-2xl font-bold">Carnet Vaccinal</h2><p className={`text-sm ${sub}`}>Historique et rappels</p></div>
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
    </div>
  );
}

function PDNA({ data, card, sub, darkMode }) {
  const profile = data;
  const bloodType = profile?.bloodType || '—';
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">ADN Médical</h2>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-900"><strong>Données limitées :</strong> les allergies et le profil génétique ne sont pas encore disponibles via l'API. Les informations ci-dessous proviennent du profil patient.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-red-600 to-red-800 text-white rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-400/20 rounded-full -translate-y-24 translate-x-24 blur-2xl"></div>
          <Droplet className="w-8 h-8 mb-3" />
          <p className="text-xs text-red-100">Groupe Sanguin</p>
          <p className="text-6xl font-bold">{bloodType}</p>
        </div>
        <div className={`${card} border rounded-2xl p-6`}>
          <div className="flex items-center gap-2 mb-4"><AlertTriangle className="w-5 h-5 text-red-600" /><h3 className="font-bold">Allergies</h3></div>
          <div className="py-8 flex flex-col items-center text-center">
            <ShieldAlert className={`w-10 h-10 ${sub} mb-3`} />
            <p className={`text-sm font-semibold ${sub}`}>Données non disponibles</p>
            <p className={`text-xs ${sub} mt-1`}>La gestion des allergies sera disponible dans une prochaine version.</p>
          </div>
        </div>
      </div>
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

function PWell({ card, sub, darkMode }) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Bien-être & Prévention</h2>
      <div className={`${card} border rounded-2xl p-12 flex flex-col items-center text-center`}>
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center mb-4">
          <Target className="w-10 h-10 text-emerald-600" />
        </div>
        <h3 className="text-xl font-bold">Bientôt disponible</h3>
        <p className={`text-sm ${sub} mt-2 max-w-md`}>Le suivi de bien-être (activité physique, hydratation, sommeil) sera disponible dans une prochaine version de NOVA.</p>
        <span className={`mt-4 px-4 py-2 rounded-full text-xs font-bold ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>Fonctionnalité en développement</span>
      </div>
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl p-6">
        <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur text-xs font-bold inline-block">Conseil santé</span>
        <h3 className="text-2xl font-bold mt-3">Hydratez-vous régulièrement</h3>
        <p className="text-amber-100 text-sm mt-2">Buvez 2,5L d'eau par jour, surtout entre 10h et 16h.</p>
      </div>
    </div>
  );
}

export function PMsg({ data, card, sub, border, darkMode, setShowVid }) {
  const [sel, setSel] = useState(null);
  const conversations = data?.length ? data.map((conversation) => ({
    id: conversation.id,
    n: conversation.doctorName,
    l: conversation.lastMessage,
    t: formatRelativeDate(conversation.updatedAt),
    u: conversation.unreadCount,
    on: conversation.unreadCount > 0,
    a: initials(conversation.doctorName),
  })) : [];
  const activeConversation = conversations.find((c) => c.id === sel) || conversations[0];

  if (!data) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Messages</h2>
        <div className={`${card} border rounded-2xl p-6`}><div className={`animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} h-96 rounded-lg`}></div></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Messages</h2>
      {conversations.length === 0 ? (
        <div className={`${card} border rounded-2xl p-12 flex flex-col items-center text-center`}>
          <MessageCircle className={`w-12 h-12 ${sub} mb-4`} />
          <p className="font-semibold">Aucune conversation</p>
          <p className={`text-xs ${sub} mt-1`}>Vos échanges avec les médecins apparaîtront ici.</p>
        </div>
      ) : (
      <div className={`${card} border rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-3 h-[600px]`}>
        <div className={`border-r ${border} overflow-y-auto`}>
          {conversations.map(c => (
            <button key={c.id} onClick={() => setSel(c.id)} className={`w-full p-3 border-b ${border} flex items-start gap-3 ${activeConversation?.id === c.id ? darkMode ? 'bg-slate-800' : 'bg-red-50' : darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center font-bold text-sm">{c.a}</div>
                {c.on && <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white"></span>}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between gap-2"><p className="font-semibold text-sm truncate">{c.n}</p><p className={`text-[10px] ${sub}`}>{c.t}</p></div>
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-xs ${sub} truncate`}>{c.l}</p>
                  {c.u > 0 && <span className="px-1.5 rounded-full bg-red-600 text-white text-[10px] font-bold">{c.u}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
        <div className="md:col-span-2 flex flex-col">
          {activeConversation ? (
            <>
              <div className={`p-3 border-b ${border} flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center font-bold text-sm">{activeConversation.a}</div>
                  <div><p className="font-bold text-sm">{activeConversation.n}</p></div>
                </div>
                <button onClick={() => setShowVid && setShowVid(true)} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                  <Video className="w-4 h-4 text-emerald-600" />
                </button>
              </div>
              <div className={`flex-1 p-6 flex flex-col items-center justify-center text-center ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
                <MessageCircle className={`w-10 h-10 ${sub} mb-3`} />
                <p className={`text-sm font-semibold ${sub}`}>Messagerie en lecture seule</p>
                <p className={`text-xs ${sub} mt-1`}>Dernier message : {activeConversation.l}</p>
                <p className={`text-xs ${sub} mt-3`}>L'envoi de messages sera disponible dans une prochaine version.</p>
              </div>
            </>
          ) : (
            <div className={`flex-1 flex items-center justify-center ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
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
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [docForm, setDocForm] = useState({
    title: 'Nouvelle ordonnance',
    category: 'prescription',
    mimeType: 'application/pdf',
    sizeBytes: 120000,
  });
  const apiDocs = data?.length ? data.map((doc) => ({
    n: doc.title,
    t: doc.mimeType?.includes('pdf') ? 'PDF' : 'DOC',
    cat: mapDocumentCategory(doc.category),
    d: formatDate(doc.createdAt),
    s: formatBytes(doc.sizeBytes),
    I: doc.category === 'lab' ? Microscope : doc.category === 'vaccine' ? ClipboardList : FileText,
    c: doc.category === 'lab' ? 'purple' : doc.category === 'vaccine' ? 'emerald' : 'red',
    dr: 'NOVA',
    id: doc.id,
  })) : [];
  const filt = f === 'all' ? apiDocs : apiDocs.filter(d => d.cat === f);
  const cats = [
    { id: 'all', l: 'Tous' }, { id: 'ordonnance', l: 'Ordonnances' },
    { id: 'analyse', l: 'Analyses' }, { id: 'consultation', l: 'Consultations' },
    { id: 'certificat', l: 'Certificats' }
  ];
  const addDocument = async () => {
    try {
      await patientApi.createDocument(docForm);
      onReload?.(await patientApi.documents());
      notify?.('Document ajoute');
      setShowForm(false);
      setDocForm({ title: 'Nouvelle ordonnance', category: 'prescription', mimeType: 'application/pdf', sizeBytes: 120000 });
    } catch (error) {
      notify?.(error.message || 'Erreur document', 'error');
    }
  };
  const deleteDocument = async (id) => {
    if (!id) return;
    try {
      await patientApi.deleteDocument(id);
      onReload?.(await patientApi.documents());
      notify?.('Document supprimé');
      setPendingDelete(null);
      setSelectedDoc(null);
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
          <Plus className="w-3 h-3" /> Ajouter
        </button>
      </div>
      {showForm && (
        <>
          <button className="fixed inset-0 z-40 bg-slate-950/45" onClick={() => setShowForm(false)} aria-label="Fermer"></button>
          <div className={`fixed z-50 left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 ${card} border rounded-2xl p-5 shadow-2xl`}>
            <h3 className="font-bold mb-4">Ajouter un document</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input value={docForm.title} onChange={(e) => setDocForm({ ...docForm, title: e.target.value })} placeholder="Titre du document" className={`md:col-span-2 px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} />
              <select value={docForm.category} onChange={(e) => setDocForm({ ...docForm, category: e.target.value })} className={`px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}>
                <option value="prescription">Ordonnance</option>
                <option value="lab">Analyse</option>
                <option value="consultation">Consultation</option>
                <option value="vaccine">Certificat</option>
              </select>
              <div className="md:col-span-3 flex gap-2">
                <button onClick={addDocument} className="flex-1 px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold">Ajouter</button>
                <button onClick={() => setShowForm(false)} className={`flex-1 px-3 py-2 rounded-lg border text-sm font-semibold ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>Annuler</button>
              </div>
            </div>
          </div>
        </>
      )}
      {selectedDoc && (
        <div className={`fixed z-50 left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 ${card} border rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-3 justify-between shadow-2xl`}>
          <div>
            <p className="font-bold">{selectedDoc.n}</p>
            <p className={`text-xs ${sub}`}>{selectedDoc.cat} - {selectedDoc.d} - {selectedDoc.s}</p>
          </div>
          <button onClick={() => setSelectedDoc(null)} className={`px-3 py-2 rounded-lg border text-xs font-semibold ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>Fermer</button>
        </div>
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
            <p className={`text-[10px] ${sub} truncate mt-0.5`}>{d.dr}</p>
            <div className={`flex items-center justify-between mt-3 pt-3 border-t border-dashed ${border}`}>
              <span className={`text-[10px] ${sub}`}>{d.d}</span><span className={`text-[10px] ${sub}`}>{d.s}</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 mt-3">
              <button onClick={() => setSelectedDoc(d)} className={`px-2 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}><Eye className="w-3 h-3" /> Voir</button>
              <button onClick={() => d.id ? setPendingDelete(d.id) : undefined} className="px-2 py-1.5 rounded-lg text-[10px] font-bold bg-red-600 text-white flex items-center justify-center gap-1 hover:bg-red-700"><Trash2 className="w-3 h-3" /> Suppr.</button>
            </div>
          </div>
        ))}
      </div>
      {pendingDelete && (
        <ConfirmDialog
          title="Supprimer le document"
          message="Cette action retirera le document de la base patient."
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => deleteDocument(pendingDelete)}
          card={card}
          darkMode={darkMode}
        />
      )}
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
