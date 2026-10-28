import React, { useEffect, useState } from 'react';
import { Bell, FileDown, KeyRound, Lock, QrCode, Shield, UserX } from 'lucide-react';
import { patientApi } from '../../api/patientApi.js';
import { request } from '../../api/client.js';

/*
 * Paramètres du compte. Seuls les réglages réellement enregistrés ET appliqués sont proposés :
 *  - notifications (patient) : le serveur ne crée plus la notification d'une catégorie désactivée ;
 *  - QR d'urgence (patient) : le serveur refuse de générer le QR s'il est désactivé ;
 *  - mot de passe (tous rôles).
 * Rôle « patient » si aucune API spécifique n'est fournie (médecin : sécurité uniquement).
 */
export default function SettingsPage({ data, card, sub, darkMode, setPage, api: apiOverride }) {
  const isPatient = !apiOverride;
  const [prefs, setPrefs] = useState({ appointments: true, medications: true, messages: true, emergencyQr: true });
  const [saving, setSaving] = useState('');
  const [status, setStatus] = useState({ error: '', ok: '' });

  useEffect(() => {
    if (!data) return;
    setPrefs({
      appointments: data.notifications?.appointments ?? true,
      medications: data.notifications?.medications ?? true,
      messages: data.notifications?.messages ?? true,
      emergencyQr: data.privacy?.emergencyQr ?? true,
    });
  }, [data]);

  // Enregistrement immédiat ; en cas d'échec, le réglage revient à sa valeur précédente.
  const toggle = async (key) => {
    const previous = prefs;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setSaving(key);
    setStatus({ error: '', ok: '' });
    try {
      await patientApi.updateSettings({
        notifications: { appointments: next.appointments, medications: next.medications, messages: next.messages },
        privacy: { emergencyQr: next.emergencyQr },
      });
      setStatus({ error: '', ok: 'Réglage enregistré.' });
    } catch (err) {
      setPrefs(previous);
      setStatus({ error: err.message || 'Enregistrement impossible.', ok: '' });
    } finally {
      setSaving('');
    }
  };

  const row = `flex items-center justify-between gap-4 p-4 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`;
  const Toggle = ({ k, label }) => (
    <button type="button" role="switch" aria-checked={prefs[k]} aria-label={label} disabled={saving === k} onClick={() => toggle(k)}
      className={`relative w-11 h-6 shrink-0 rounded-full transition-colors disabled:opacity-60 ${prefs[k] ? 'bg-red-600' : darkMode ? 'bg-slate-600' : 'bg-slate-300'}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${prefs[k] ? 'translate-x-5' : ''}`} />
    </button>
  );
  const Section = ({ Icon, title, children }) => (
    <section className={`${card} border rounded-2xl p-5 space-y-3`}>
      <h3 className="font-bold flex items-center gap-2"><Icon className="w-5 h-5 text-red-600" /> {title}</h3>
      {children}
    </section>
  );

  return (
    <div className="space-y-4">
      <div><h2 className="text-2xl font-bold">Paramètres</h2><p className={`text-sm ${sub}`}>Sécurité de votre compte{isPatient ? ', notifications et confidentialité' : ''}</p></div>
      {status.error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2">{status.error}</p>}
      {status.ok && <p className="text-sm text-emerald-700">{status.ok}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {isPatient && (
          <Section Icon={Bell} title="Notifications">
            {[
              ['appointments', 'Rendez-vous', 'Confirmations, annulations et changements'],
              ['medications', 'Rappels de prise', 'Médicaments de votre pilulier'],
              ['messages', 'Messages', 'Nouveaux messages de vos médecins'],
            ].map(([k, l, d]) => (
              <div key={k} className={row}><div><p className="font-semibold text-sm">{l}</p><p className={`text-xs ${sub}`}>{d}</p></div><Toggle k={k} label={l} /></div>
            ))}
            <p className={`text-xs ${sub}`}>Les notifications médicales (consultation, ordonnance, résultat, délivrance) restent toujours actives.</p>
          </Section>
        )}

        {isPatient && (
          <Section Icon={Lock} title="Confidentialité">
            <div className={row}>
              <div><p className="font-semibold text-sm flex items-center gap-1.5"><QrCode className="w-4 h-4" /> QR code d’urgence</p><p className={`text-xs ${sub}`}>Désactivé, le Pass Santé n’affiche plus de QR lisible par un secouriste.</p></div>
              <Toggle k="emergencyQr" label="QR code d’urgence" />
            </div>
            {setPage && (
              <button type="button" onClick={() => setPage('privacy')} className={`w-full p-3 rounded-xl text-sm font-semibold border ${darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-50'}`}>
                Gérer qui a accès à mon dossier et voir l’historique des accès
              </button>
            )}
          </Section>
        )}

        <PasswordSection card={card} sub={sub} darkMode={darkMode} strong={!isPatient} />

        {isPatient && (
          <Section Icon={FileDown} title="Mes données">
            <button type="button" onClick={exportData} className={`${row} w-full text-left`}><div><p className="font-semibold text-sm">Exporter mes données (JSON)</p><p className={`text-xs ${sub}`}>Dossier et lignes détaillées, sans limite de pagination</p></div><FileDown className="w-5 h-5 text-red-600" /></button>
            <a href={patientApi.exportPdfUrl()} target="_blank" rel="noreferrer" className={`${row} hover:opacity-90`}>
              <div><p className="font-semibold text-sm">Télécharger un résumé (PDF)</p><p className={`text-xs ${sub}`}>Identité, rendez-vous et ordonnances récents</p></div>
              <FileDown className="w-5 h-5 text-red-600" />
            </a>
            <div className={row}>
              <div><p className="font-semibold text-sm flex items-center gap-1.5"><UserX className="w-4 h-4" /> Fermer mon compte</p>
                <p className={`text-xs ${sub}`}>La fermeture n’est pas encore disponible en libre-service : demandez-la à votre médecin ou à l’administrateur NOVA. Vos actes médicaux restent conservés conformément à la réglementation.</p></div>
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function PasswordSection({ card, sub, darkMode, strong }) {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [state, setState] = useState({ saving: false, error: '', ok: '' });
  const valid = strong
    ? form.next.length >= 12 && /[a-z]/.test(form.next) && /[A-Z]/.test(form.next) && /\d/.test(form.next) && /[^A-Za-z0-9]/.test(form.next)
    : form.next.length >= 8 && /[A-Za-z]/.test(form.next) && /\d/.test(form.next);
  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return setState({ saving: false, error: 'Le nouveau mot de passe ne respecte pas les règles.', ok: '' });
    if (form.next !== form.confirm) return setState({ saving: false, error: 'Les deux nouveaux mots de passe ne correspondent pas.', ok: '' });
    setState({ saving: true, error: '', ok: '' });
    try {
      await request('/auth/password/self-change', { method: 'POST', body: JSON.stringify({ currentPassword: form.current, newPassword: form.next }) });
      setForm({ current: '', next: '', confirm: '' });
      setState({ saving: false, error: '', ok: 'Mot de passe modifié. Reconnexion nécessaire.' });
        window.dispatchEvent(new Event('nova:logout'));
    } catch (err) {
      setState({ saving: false, error: err.message || 'Modification impossible.', ok: '' });
    }
  };
  const input = `mt-1 w-full min-h-11 rounded-xl border px-3 text-sm ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`;
  return (
    <form onSubmit={submit} className={`${card} border rounded-2xl p-5 space-y-3`}>
      <h3 className="font-bold flex items-center gap-2"><KeyRound className="w-5 h-5 text-red-600" /> Changer mon mot de passe</h3>
      <label className="block text-xs font-semibold">Mot de passe actuel<input type="password" autoComplete="current-password" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} className={input} /></label>
      <label className="block text-xs font-semibold">Nouveau mot de passe<input type="password" autoComplete="new-password" value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} className={input} /></label>
      <label className="block text-xs font-semibold">Confirmation<input type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} className={input} /></label>
      <p className={`text-xs ${sub} flex items-start gap-1.5`}><Shield className="w-3.5 h-3.5 mt-0.5 shrink-0" />{strong ? '12 caractères minimum, avec majuscule, minuscule, chiffre et caractère spécial.' : '8 caractères minimum, avec au moins une lettre et un chiffre.'}</p>
      {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-emerald-700">{state.ok}</p>}
      <button type="submit" disabled={state.saving || !form.current || !form.next || !form.confirm} className="w-full min-h-11 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-50">{state.saving ? 'Enregistrement…' : 'Enregistrer'}</button>
    </form>
  );
}
