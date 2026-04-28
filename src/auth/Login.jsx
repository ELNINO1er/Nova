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

import { ACCOUNTS } from '../data/accounts.js';

/* ============== LOGIN ============== */
export default function Login({ auth, setAuth, onLogin }) {
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
