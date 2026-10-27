import React, { useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, ChevronLeft, Copy, HeartPulse, KeyRound, ShieldCheck, Smartphone } from 'lucide-react';
import { authApi } from '../api/authApi.js';

const strongPassword = (value) => value.length >= 12 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);
const simplePassword = (value) => value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
// Mêmes règles que le serveur (auth.service.js > passwordPolicyError).
const isStrongRole = (role) => ['doctor', 'admin', 'governor'].includes(role);

export default function Login({ setAuth, onLogin }) {
  const [step, setStep] = useState('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountRole, setAccountRole] = useState('doctor'); // rôle du compte qui change son mot de passe
  const [code, setCode] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [enrollment, setEnrollment] = useState({});
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [pendingUser, setPendingUser] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const cleanedPhone = phone.replace(/\s/g, '');
  const formatPhone = (value) => value.replace(/\D/g, '').slice(0, 10).replace(/(\d{2})(?=\d)/g, '$1 ').trim();

  const useNextAction = (result) => {
    setChallengeId(result.challengeId || '');
    setEnrollment({ qr: result.qrCodeDataUrl, secret: result.secret });
    setCode('');
    setStep(result.nextAction || 'verify_totp');
  };

  const submit = async () => {
    setError('');
    if (cleanedPhone.length !== 10) return setError('Numéro invalide : 10 chiffres.');
    if (!password) return setError('Mot de passe requis.');
    setLoading(true);
    try {
      // Même formulaire pour tous ; le médecin enchaîne ensuite avec Authenticator.
      const result = await authApi.loginWithPassword(cleanedPhone, password);
      if (result.user) return onLogin(result.user);
      setAccountRole(result.role || 'patient');
      useNextAction(result); // change_password, enroll_totp ou verify_totp
    } catch (err) { setError(err.message || 'Connexion impossible.'); }
    finally { setLoading(false); }
  };

  const changePassword = async () => {
    setError('');
    const valid = isStrongRole(accountRole) ? strongPassword(newPassword) : simplePassword(newPassword);
    if (!valid) return setError('Le mot de passe ne respecte pas tous les critères.');
    if (newPassword !== confirmPassword) return setError('Les mots de passe ne correspondent pas.');
    setLoading(true);
    try {
      if (accountRole === 'doctor') {
        useNextAction(await authApi.changeDoctorPassword(challengeId, newPassword));
        setPassword(newPassword);
        setNewPassword(''); setConfirmPassword('');
      } else {
        onLogin((await authApi.changeInitialPassword(challengeId, newPassword)).user);
      }
    } catch (err) { setError(err.message || 'Modification impossible.'); }
    finally { setLoading(false); }
  };

  const verifyTotp = async () => {
    setError(''); setLoading(true);
    try {
      const result = step === 'enroll_totp'
        ? await authApi.verifyDoctorTotpEnrollment(challengeId, code.trim())
        : await authApi.verifyDoctorTotp(challengeId, code.trim());
      if (result.recoveryCodes?.length) {
        setPendingUser(result.user); setRecoveryCodes(result.recoveryCodes); setStep('recovery_codes');
      } else onLogin(result.user);
    } catch (err) { setError(err.message || 'Code incorrect.'); }
    finally { setLoading(false); }
  };

  const reset = () => {
    setStep('login'); setAuth('login'); setPassword(''); setNewPassword(''); setConfirmPassword(''); setCode(''); setChallengeId(''); setError(''); setLoading(false);
  };

  return <div className="min-h-screen flex bg-white">
    <aside className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-red-600 via-red-700 to-red-900 text-white p-12">
      <div className="flex flex-col justify-between w-full"><Brand light /><div><span className="px-3 py-1 rounded-full bg-white/20 text-xs font-bold">Plateforme Santé sécurisée</span><h1 className="text-5xl font-bold leading-tight mt-5">Votre santé,<br /><span className="text-amber-300">en toute sérénité.</span></h1><p className="text-red-100 mt-4 text-lg max-w-md">Accès professionnel protégé par mot de passe et application Authenticator.</p></div><p className="flex items-center gap-2 text-xs text-red-100"><ShieldCheck className="w-4 h-4" /> Accès contrôlés, audit et sessions sécurisées</p></div>
    </aside>
    <main className="flex-1 flex items-center justify-center p-6 sm:p-12"><div className="w-full max-w-md"><div className="lg:hidden flex justify-center mb-8"><Brand /></div>
      {!['login', 'recovery_codes'].includes(step) && <Back onClick={reset} />}
      {step === 'login' && <LoginForm {...{ phone, setPhone, formatPhone, password, setPassword, error, loading, submit, cleanedPhone }} />}
      {step === 'change_password' && <PasswordForm {...{ newPassword, setNewPassword, confirmPassword, setConfirmPassword, error, loading, changePassword, strong: isStrongRole(accountRole) }} />}
      {step === 'enroll_totp' && <Enrollment {...{ enrollment, code, setCode, error, loading, verifyTotp }} />}
      {step === 'verify_totp' && <Verification {...{ code, setCode, error, loading, verifyTotp }} />}
      {step === 'recovery_codes' && <Recovery codes={recoveryCodes} copy={() => navigator.clipboard.writeText(recoveryCodes.join('\n'))} finish={() => onLogin(pendingUser)} />}
    </div></main>
  </div>;
}

function LoginForm({ phone, setPhone, formatPhone, password, setPassword, error, loading, submit, cleanedPhone }) {
  return <section className="space-y-6"><Header title="Bienvenue" text="Connectez-vous avec votre numéro de téléphone et votre mot de passe." /><div className="space-y-4"><Field label="Numéro de téléphone"><span className="text-sm font-semibold">+225</span><input type="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="07 49 15 77 41" className="flex-1 outline-none font-mono" autoComplete="username" autoFocus /><Smartphone className="w-5 h-5 text-slate-400" /></Field><Field label="Mot de passe"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} className="flex-1 outline-none" autoComplete="current-password" /><KeyRound className="w-5 h-5 text-slate-400" /></Field></div><Error value={error} /><Primary onClick={submit} disabled={loading || !password || cleanedPhone.length !== 10}>{loading ? 'Connexion…' : <>Se connecter <ArrowRight className="w-4 h-4" /></>}</Primary><p className="text-[11px] text-slate-500 text-center">Pas encore de mot de passe ou oublié ? Demandez-le à votre médecin ou à l’administrateur.</p></section>;
}

function PasswordForm({ newPassword, setNewPassword, confirmPassword, setConfirmPassword, error, loading, changePassword, strong }) {
  const valid = strong ? strongPassword(newPassword) : simplePassword(newPassword);
  return <section className="space-y-5"><Header icon={KeyRound} title="Sécurisez votre compte" text="Choisissez votre propre mot de passe pour remplacer le mot de passe provisoire." /><Field label="Nouveau mot de passe"><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="flex-1 outline-none" autoComplete="new-password" autoFocus /></Field><Field label="Confirmation"><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && changePassword()} className="flex-1 outline-none" autoComplete="new-password" /></Field><div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600">{strong ? <><strong>12 caractères minimum</strong>, avec majuscule, minuscule, chiffre et caractère spécial.</> : <><strong>8 caractères minimum</strong>, avec au moins une lettre et un chiffre.</>}</div><Error value={error} /><Primary onClick={changePassword} disabled={loading || !valid || newPassword !== confirmPassword}>{loading ? 'Enregistrement…' : 'Enregistrer et continuer'}</Primary></section>;
}

function Enrollment({ enrollment, code, setCode, error, loading, verifyTotp }) {
  return <section className="space-y-5"><Header icon={ShieldCheck} title="Activez Authenticator" text="Scannez le QR avec Google Authenticator, Microsoft Authenticator ou une application compatible." />{enrollment.qr && <div className="flex justify-center"><img src={enrollment.qr} alt="QR d’activation Authenticator" className="w-52 h-52 rounded-xl border border-slate-200" /></div>}<details className="text-xs text-slate-600"><summary className="cursor-pointer font-semibold">Impossible de scanner ?</summary><code className="mt-2 block break-all rounded-lg bg-slate-100 p-3 select-all">{enrollment.secret}</code></details><Code value={code} setValue={setCode} onEnter={verifyTotp} label="Code à 6 chiffres" /><Error value={error} /><Primary onClick={verifyTotp} disabled={loading || !/^\d{6}$/.test(code)}>{loading ? 'Vérification…' : 'Activer la double authentification'}</Primary></section>;
}

function Verification({ code, setCode, error, loading, verifyTotp }) { return <section className="space-y-5"><Header icon={ShieldCheck} title="Double authentification" text="Entrez le code de votre application ou un code de récupération." /><Code value={code} setValue={setCode} onEnter={verifyTotp} label="Code Authenticator ou récupération" recovery /><Error value={error} /><Primary onClick={verifyTotp} disabled={loading || code.trim().length < 6}>{loading ? 'Vérification…' : 'Se connecter'}</Primary></section>; }

function Recovery({ codes, copy, finish }) { return <section className="space-y-5"><Header icon={CheckCircle2} title="Compte sécurisé" text="Sauvegardez ces codes. Chacun ne fonctionne qu’une seule fois." /><div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-950 p-4 text-center font-mono text-sm text-white">{codes.map((item) => <span key={item} className="rounded bg-white/10 p-2">{item}</span>)}</div><button type="button" onClick={copy} className="w-full min-h-11 border border-slate-300 rounded-xl flex items-center justify-center gap-2 font-semibold hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-red-500"><Copy className="w-4 h-4" /> Copier les codes</button><Primary onClick={finish}>J’ai sauvegardé mes codes</Primary></section>; }

function Brand({ light = false }) { return <div className="flex items-center gap-3"><div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${light ? 'bg-white/20' : 'bg-red-600'}`}><HeartPulse className="w-7 h-7 text-white" /></div><div><h2 className={`text-2xl font-bold ${light ? 'text-white' : 'text-slate-900'}`}>NOVA</h2><p className={`text-xs ${light ? 'text-red-100' : 'text-slate-500'}`}>Carnet Santé Ivoirien</p></div></div>; }
function Header({ icon: Icon, title, text }) { return <div>{Icon && <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mb-4"><Icon className="w-7 h-7 text-red-600" /></div>}<h2 className="text-3xl font-bold text-slate-900">{title}</h2><p className="text-slate-500 mt-2">{text}</p></div>; }
function Field({ label, children }) { return <label className="block text-xs font-semibold text-slate-700 uppercase">{label}<span className="mt-2 min-h-12 flex items-center gap-2 p-3 rounded-xl border-2 border-slate-200 focus-within:border-red-500 normal-case text-base font-normal">{children}</span></label>; }
function Code({ value, setValue, onEnter, label, recovery = false }) { return <Field label={label}><input type="text" inputMode={recovery ? 'text' : 'numeric'} value={value} onChange={(e) => setValue(recovery ? e.target.value.toUpperCase().slice(0, 16) : e.target.value.replace(/\D/g, '').slice(0, 6))} onKeyDown={(e) => e.key === 'Enter' && onEnter()} placeholder={recovery ? '123456 ou XXXX-XXXX' : '123456'} className="w-full text-center text-xl tracking-widest font-mono outline-none" autoComplete="one-time-code" autoFocus /></Field>; }
function Primary({ children, ...props }) { return <button type="button" {...props} className="w-full min-h-12 bg-gradient-to-r from-red-600 to-red-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500">{children}</button>; }
function Back({ onClick }) { return <button type="button" onClick={onClick} className="mb-6 min-h-11 flex items-center gap-1 text-sm text-slate-600 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-red-500 rounded-lg px-2"><ChevronLeft className="w-4 h-4" /> Recommencer</button>; }
function Error({ value }) { return value ? <p role="alert" className="text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {value}</p> : null; }
