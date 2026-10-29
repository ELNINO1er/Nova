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
  HelpCircle, BookOpen, Pencil, HardDrive, Wifi,
  Camera
} from 'lucide-react';
import { PHOTO_ACCEPT, preparePhoto } from '../utils/photo.js';
import { doctorApi } from '../api/doctorApi.js';
import { patientApi } from '../api/patientApi.js';

/* ============== MODALS ============== */
export function QRModal({ onClose }) {
  // Pass Santé d'urgence : vraies données du patient et QR lisible par tout téléphone (texte de la fiche).
  const [card, setCard] = useState(null);
  const [qr, setQr] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    Promise.all([patientApi.emergencyCard(), patientApi.emergencyCardQr()])
      .then(([c, q]) => { if (alive) { setCard(c); setQr(q); } })
      .catch((e) => { if (alive) setError(e.message || 'Fiche indisponible.'); });
    return () => { alive = false; };
  }, []);
  const age = card?.birthDate ? Math.floor((Date.now() - new Date(card.birthDate)) / (365.25 * 86400000)) : null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label="Pass Santé d'urgence">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl text-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><Siren className="w-5 h-5 text-red-600" /><h3 className="font-bold">Pass Santé d’urgence</h3></div>
          <button onClick={onClose} aria-label="Fermer"><X className="w-5 h-5" /></button>
        </div>
        {error && <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-xl p-3">{error}</p>}
        {!error && !card && <p className="text-sm text-slate-500 py-8 text-center">Chargement de votre fiche…</p>}
        {card && (
          <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-2xl p-6 text-white">
            <p className="text-xs text-red-100">URGENCE MÉDICALE</p>
            <h4 className="text-2xl font-bold mt-1">{card.firstName} {card.lastName}</h4>
            <p className="text-xs text-red-100">CMU {card.cmuNumber || '—'}</p>
            <div className="bg-white rounded-xl p-3 my-4 flex items-center justify-center">
              {qr?.qr ? <img src={qr.qr} alt="QR de la fiche d’urgence" className="w-44 h-44" /> : <p className="text-xs text-slate-500 py-10">QR indisponible</p>}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white/10 rounded-lg p-3"><p className="text-[10px] text-red-100">GROUPE</p><p className="text-xl font-bold">{card.bloodType || '—'}</p></div>
              <div className="bg-white/10 rounded-lg p-3"><p className="text-[10px] text-red-100">ÂGE</p><p className="text-xl font-bold">{age != null ? `${age} ans` : '—'}</p></div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 mt-3">
              <p className="text-[10px] text-red-100 mb-1">ALLERGIES</p>
              <p className="text-sm font-semibold">{card.allergies?.length ? card.allergies.join(', ') : 'Aucune allergie renseignée'}</p>
            </div>
            <p className="text-[11px] text-red-100 mt-3">Le QR contient ces informations en clair, lisibles par l’appareil photo d’un secouriste. Vous pouvez le désactiver dans vos paramètres.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function AyaChat({ onClose }) {
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
        <button onClick={onClose} aria-label="Fermer"><X className="w-5 h-5" /></button>
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

export function VideoModal({ onClose }) {
  // Aucun service vidéo n'est intégré : on l'indique clairement au lieu de simuler un appel.
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label="Téléconsultation">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl text-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><Video className="w-5 h-5 text-red-600" /><h3 className="font-bold">Téléconsultation</h3></div>
          <button onClick={onClose} aria-label="Fermer"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm">La vidéo n’est pas encore disponible dans NOVA.</p>
        <p className="text-sm text-slate-600 mt-2">Pour un rendez-vous en téléconsultation, le médecin vous indique comment le joindre (téléphone ou application de son choix). Vous pouvez aussi lui écrire depuis la messagerie.</p>
        <button type="button" onClick={onClose} className="mt-5 w-full min-h-11 rounded-xl bg-red-600 text-white font-semibold">J’ai compris</button>
      </div>
    </div>
  );
}

export function RxModal({ onClose, darkMode, sub, border }) {
  const [ms, setMs] = useState([{ id: 1, n: 'Amlodipine', d: '5mg', f: '1x/j', du: '30j' }]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label="Nouvelle prescription">
      <div className={`${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className={`p-6 border-b ${border} flex items-center justify-between`}>
          <div className="flex items-center gap-2"><Pill className="w-5 h-5 text-red-600" /><h3 className="font-bold">Nouvelle prescription</h3></div>
          <button onClick={onClose} aria-label="Fermer"><X className="w-5 h-5" /></button>
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

export function ConsModal({ onClose, darkMode, sub, border }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label="Module de consultation">
      <div className={`${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className={`p-6 border-b ${border} flex items-center justify-between`}>
          <div className="flex items-center gap-2"><ClipboardList className="w-5 h-5 text-red-600" /><h3 className="font-bold">Module de consultation</h3></div>
          <button onClick={onClose} aria-label="Fermer"><X className="w-5 h-5" /></button>
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

// Mot de passe provisoire lisible (sans 0/O, 1/l/I) : lettres et chiffres.
function generatePassword(length = 10) {
  const letters = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const all = letters + digits;
  const values = crypto.getRandomValues(new Uint32Array(length));
  const chars = Array.from(values, (v) => all[v % all.length]);
  chars[values[0] % length] = digits[values[1] % digits.length];
  chars[(values[0] + 1) % length] = letters[values[2] % letters.length];
  return chars.join('');
}

export function CreatePatientModal({ onClose, onCreated, role, darkMode, sub, border }) {
  const [step, setStep] = useState(1);
  const [d, setD] = useState({ fn: '', ln: '', p: '', pw: '', cmu: '', sex: 'M', bd: '', bt: 'O+', addr: '', city: 'Abidjan' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);
  const [photo, setPhoto] = useState(null); // data URL réduite, envoyée avec la création

  const pickPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try { setPhoto(await preparePhoto(file)); setError(''); }
    catch (err) { setError(err.message); }
  };

  const payload = {
    firstName: d.fn.trim(),
    lastName: d.ln.trim(),
    phone: d.p.trim(),
    password: d.pw || undefined, // vide : le serveur génère un mot de passe provisoire
    cmuNumber: d.cmu.trim() || undefined,
    sex: d.sex,
    birthDate: d.bd || undefined,
    bloodType: d.bt || undefined,
    address: d.addr.trim() || undefined,
    city: d.city.trim() || undefined,
    photo: photo || undefined,
  };

  const validateStep = () => {
    if (step === 1 && (!payload.firstName || !payload.lastName || !payload.birthDate)) return 'Renseignez le prénom, le nom et la date de naissance.';
    if (step === 2 && payload.phone.replace(/\D/g, '').length !== 10) return 'Numéro à 10 chiffres requis : il servira d’identifiant de connexion.';
    if (step === 2 && d.pw && (d.pw.length < 8 || !/[A-Za-z]/.test(d.pw) || !/\d/.test(d.pw))) return 'Mot de passe : 8 caractères minimum, avec une lettre et un chiffre.';
    return '';
  };

  const next = async () => {
    setError('');
    const validation = validateStep();
    if (validation) {
      setError(validation);
      return;
    }
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    if (role !== 'doctor') {
      setError('La création patient est disponible depuis un compte médecin.');
      return;
    }
    setSaving(true);
    try {
      const result = await doctorApi.createPatient(payload);
      setCreated(result);
      onCreated?.(result);
    } catch (e) {
      setError(e.message || 'Création du patient impossible.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label="Nouveau patient">
      <div className={`${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className={`p-6 border-b ${border} flex items-center justify-between`}>
          <div>
            <div className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-red-600" /><h3 className="font-bold">Nouveau patient</h3></div>
            <p className={`text-xs ${sub} mt-1`}>Étape {step}/3</p>
          </div>
          <button onClick={onClose} aria-label="Fermer"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 pt-4">
          <div className={`h-1 rounded-full ${darkMode ? 'bg-slate-800' : 'bg-slate-200'} overflow-hidden`}>
            <div className="h-full bg-gradient-to-r from-red-600 to-red-700" style={{ width: `${(step / 3) * 100}%` }}></div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
              {error}
            </div>
          )}
          {created && (
            <div className="space-y-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                <p className="font-bold">Patient créé : {created.name}</p>
                <p>CMU : {created.cmuNumber}</p>
                {photo && !created.photoSaved && <p className="mt-1 font-semibold text-amber-800">La photo n’a pas pu être enregistrée : le patient pourra l’ajouter depuis son profil.</p>}
                <p className="mt-1">Remettez ces identifiants au patient. Le mot de passe ne sera plus affiché ; le patient devra le changer à sa première connexion.</p>
              </div>
              <div className="rounded-xl bg-slate-950 text-white p-4 space-y-1">
                <p className="text-xs text-slate-400">Numéro</p>
                <p className="font-mono font-bold">{created.phone}</p>
                <p className="text-xs text-slate-400 pt-2">Mot de passe provisoire</p>
                <code className="text-lg font-bold break-all select-all">{created.provisionalPassword}</code>
              </div>
              <button type="button" onClick={() => navigator.clipboard?.writeText(`Numéro : ${created.phone}\nMot de passe : ${created.provisionalPassword}`)}
                className={`w-full px-4 py-2 rounded-lg border font-semibold text-sm ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>
                Copier les identifiants
              </button>
            </div>
          )}
          {step === 1 && (
            <>
              <h4 className="font-bold">Identité</h4>
              <div className="flex items-center gap-4">
                <div className={`w-20 h-20 rounded-full overflow-hidden flex items-center justify-center shrink-0 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  {photo ? <img src={photo} alt="Photo du patient" className="w-full h-full object-cover" /> : <Camera className={`w-7 h-7 ${sub}`} />}
                </div>
                <div className="space-y-1.5">
                  <div className="flex flex-wrap gap-2">
                    <label className={`cursor-pointer px-3 py-2 rounded-lg border text-xs font-semibold ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>
                      {photo ? 'Changer la photo' : 'Ajouter une photo'}
                      <input type="file" accept={PHOTO_ACCEPT} capture="user" onChange={pickPhoto} className="sr-only" />
                    </label>
                    {photo && <button type="button" onClick={() => setPhoto(null)} className="px-3 py-2 rounded-lg text-xs font-semibold text-red-600">Retirer</button>}
                  </div>
                  <p className={`text-[11px] ${sub}`}>Facultatif. Aide à identifier le patient ; il pourra la changer lui-même.</p>
                </div>
              </div>
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
              <h4 className="font-bold">Contact et accès</h4>
              <div>
                <label className={`text-xs ${sub}`}>Téléphone *</label>
                <div className={`mt-1 flex items-center gap-2 p-2 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}>
                  <span className="text-xs font-bold pr-2 border-r">🇨🇮 +225</span>
                  <input type="tel" value={d.p} onChange={(e) => setD({...d, p: e.target.value})} placeholder="07 89 45 23 11" className="flex-1 outline-none bg-transparent text-sm" />
                </div>
              </div>
              <div>
                <label className={`text-xs ${sub}`}>Mot de passe provisoire</label>
                <div className="mt-1 flex gap-2">
                  <input type="text" value={d.pw} onChange={(e) => setD({...d, pw: e.target.value})} placeholder="Laisser vide pour le générer" autoComplete="off" className={`flex-1 px-3 py-2 rounded-lg border text-sm font-mono ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`} />
                  <button type="button" onClick={() => setD({...d, pw: generatePassword()})} className={`px-3 py-2 rounded-lg border text-xs font-semibold ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>Générer</button>
                </div>
                <p className={`text-[11px] ${sub} mt-1`}>8 caractères minimum avec une lettre et un chiffre. Le patient le changera à sa première connexion.</p>
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
                <p className="text-xs text-emerald-900">Le patient se connectera avec son numéro et le mot de passe provisoire, affiché après la création.</p>
              </div>
            </>
          )}
        </div>
        <div className={`p-6 border-t ${border} flex gap-2`}>
          {step > 1 && !created && <button onClick={() => setStep(step - 1)} disabled={saving} className={`flex-1 px-4 py-2 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-white border'} font-semibold text-sm disabled:opacity-50`}>Précédent</button>}
          <button onClick={created ? onClose : next} disabled={saving} className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-semibold text-sm flex items-center justify-center gap-1 hover:bg-red-700 disabled:opacity-50">
            {created ? <>Fermer</> : saving ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Création...</> : step === 3 ? <><Save className="w-4 h-4" /> Créer</> : <>Suivant <ArrowRight className="w-4 h-4" /></>}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CreateDoctorModal({ onClose, darkMode, sub, border }) {
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
