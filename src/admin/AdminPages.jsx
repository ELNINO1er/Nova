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
import SettingsPage from '../patient/pages/SettingsPage.jsx';
import { adminApi } from '../api/adminApi.js';

/* ============== ADMIN PAGES ============== */
export default function AdminPages({ page, card, sub, border, darkMode }) {
  const p = { card, sub, border, darkMode };
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    const loaders = {
      dashboard: adminApi.dashboard,
      audit: () => adminApi.auditLogs({ limit: 50 }),
      system: adminApi.system,
    };
    const loader = loaders[page];
    setError('');
    if (!loader) {
      setData(null);
      return () => { alive = false; };
    }
    loader()
      .then((res) => { if (alive) setData(res); })
      .catch((err) => { if (alive) setError(err.message || 'Chargement impossible.'); });
    return () => { alive = false; };
  }, [page]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className="text-2xl font-bold">Tour de Contrôle</h2><p className={`text-sm ${sub}`}>Gouvernance & Audit • NOVA Côte d'Ivoire</p></div>
      </div>
      {error && <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>}
      {page === 'dashboard' && <ADash data={data} {...p} />}
      {page === 'audit' && <AAudit data={data} {...p} />}
      {page === 'users' && <AUsers {...p} />}
      {page === 'system' && <ASystem data={data} {...p} />}
      {page === 'settings' && <SettingsPage {...p} />}
    </div>
  );
}

function ADash({ data, card, sub, darkMode }) {
  const kpis = data?.kpis || {};
  const statCards = [
    { l: 'Patients', v: (kpis.patients ?? 0).toLocaleString('fr-FR'), s: 'Comptes patients', c: 'red', I: Users },
    { l: 'Médecins', v: (kpis.doctors ?? 0).toLocaleString('fr-FR'), s: 'Professionnels enregistrés', c: 'blue', I: Stethoscope },
    { l: "Consult. aujourd'hui", v: (kpis.consultationsToday ?? 0).toLocaleString('fr-FR'), s: 'Jour courant', c: 'emerald', I: Activity },
    { l: 'Traçabilité 24h', v: (kpis.access24h ?? 0).toLocaleString('fr-FR'), s: `${kpis.audit24h ?? 0} actions audit`, c: 'amber', I: AlertTriangle }
  ];
  const positions = [[35, 75], [45, 50], [40, 60], [25, 85], [42, 25], [55, 40], [30, 45], [48, 72]];
  const rs = (data?.cities || []).map((city, index) => ({
    n: city.city,
    u: Number(city.patients || 0),
    x: positions[index]?.[0] || 50,
    y: positions[index]?.[1] || 50,
    s: Math.max(8, Math.min(24, 8 + Math.log10(Number(city.patients || 1)) * 4)),
  }));
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {statCards.map((k, i) => (
        <div key={i} className={`${card} border rounded-2xl p-5`}>
          <div className={`w-10 h-10 rounded-lg bg-${k.c}-100 flex items-center justify-center mb-3`}><k.I className={`w-5 h-5 text-${k.c}-600`} /></div>
          <p className={`text-xs ${sub}`}>{k.l}</p>
          <p className="text-3xl font-bold mt-1">{k.v}</p>
          <p className={`text-xs mt-1 text-${k.c}-600 font-semibold`}>{k.s}</p>
        </div>
      ))}
      {false && [
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
    </div>
  );
}

function AAudit({ data, card, sub, darkMode }) {
  const ls = (data?.data || []).map((row) => ({
    t: formatDate(row.createdAt),
    a: row.userRole || row.userId || 'system',
    ac: row.action,
    tg: row.resourceId || row.resourceType || '-',
    cr: row.action?.includes('status_update') ? 'warning' : 'info',
  }));
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

function AUsers({ card, sub, darkMode }) {
  const [tab, setTab] = useState('doctors');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    adminApi.users({ type: tab, limit: 50 })
      .then((res) => { if (alive) setRows(res?.data || []); })
      .catch((err) => { if (alive) setError(err.message || 'Chargement impossible.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [tab]);

  const list = rows.map((u) => tab === 'doctors'
      ? { n: `Dr. ${u.firstName || ''} ${u.lastName || ''}`.trim(), sp: u.specialty || '-', p: u.phone || '-', s: u.isAvailable ? 'Actif' : 'Suspendu' }
      : { n: `${u.firstName || ''} ${u.lastName || ''}`.trim(), cmu: u.cmuNumber || '-', p: u.phone || '-', a: ageFromBirthDate(u.birthDate) });
  return (
    <div className={`${card} border rounded-2xl p-6`}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className={`flex gap-1 p-1 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
          <button onClick={() => setTab('doctors')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${tab === 'doctors' ? 'bg-white text-slate-900 shadow' : sub}`}>
            <Stethoscope className="w-4 h-4" /> Médecins ({tab === 'doctors' ? rows.length : '—'})
          </button>
          <button onClick={() => setTab('patients')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${tab === 'patients' ? 'bg-white text-slate-900 shadow' : sub}`}>
            <User className="w-4 h-4" /> Patients ({tab === 'patients' ? rows.length : '—'})
          </button>
        </div>
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

function ASystem({ data, card, sub, darkMode }) {
  const uptimeDays = data?.api?.uptimeSeconds ? (data.api.uptimeSeconds / 86400).toFixed(1) : null;
  const entityTotal = data?.database ? Object.values(data.database).reduce((a, b) => a + Number(b || 0), 0) : null;
  const systemCards = [
    { l: 'Uptime API', v: uptimeDays ? `${uptimeDays}j` : '99.97%', s: data?.api?.nodeEnv || '30 jours', I: ServerCog, c: 'emerald' },
    { l: 'Permissions', v: data?.security?.permissions ?? '142', s: 'RBAC actif', I: Zap, c: 'blue' },
    { l: 'Donnees', v: entityTotal ?? '67%', s: 'Entites principales', I: Database, c: 'amber' }
  ];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {systemCards.map((s, i) => (
        <div key={i} className={`${card} border rounded-2xl p-6`}>
          <div className={`w-10 h-10 rounded-lg bg-${s.c}-100 flex items-center justify-center mb-3`}><s.I className={`w-5 h-5 text-${s.c}-600`} /></div>
          <p className={`text-xs ${sub}`}>{s.l}</p>
          <p className="text-3xl font-bold mt-1">{s.v}</p>
          <p className={`text-xs ${sub} mt-1`}>{s.s}</p>
        </div>
      ))}
      {false && [
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

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

function ageFromBirthDate(value) {
  if (!value) return '-';
  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) return '-';
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}
