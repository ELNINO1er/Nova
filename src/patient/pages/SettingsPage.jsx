import React, { useEffect, useState } from 'react';
import { Bell, ChevronRight, FileDown, KeyRound, Lock, QrCode, Shield, UserX } from 'lucide-react';
import { patientApi } from '../../api/patientApi.js';
import { request } from '../../api/client.js';
import { useSearch, useUrlQuery } from '../../utils/search.js';
import { Button, Card, Highlight, IconBadge, NoResults, PageHeader, Pills, SearchInput, inputClass } from '../../components/patient/ui.jsx';

/*
 * Paramètres du compte. Seuls les réglages réellement enregistrés ET appliqués sont proposés :
 *  - notifications (patient) : le serveur ne crée plus la notification d'une catégorie désactivée ;
 *  - QR d'urgence (patient) : le serveur refuse de générer le QR s'il est désactivé ;
 *  - mot de passe (tous rôles).
 * Rôle « patient » si aucune API spécifique n'est fournie (médecin : sécurité uniquement).
 */

/* Rubriques (navigation de gauche) et index des réglages cherchables. */
const SECTIONS = [
  { id: 'notifications', label: 'Notifications', Icon: Bell, patientOnly: true, intro: 'Choisissez les notifications que vous recevez. Enregistrement immédiat.' },
  { id: 'privacy', label: 'Confidentialité', Icon: Lock, patientOnly: true, intro: 'QR code d’urgence et accès à votre dossier.' },
  { id: 'security', label: 'Sécurité', Icon: KeyRound, intro: 'Mot de passe de connexion à votre compte.' },
  { id: 'data', label: 'Mes données', Icon: FileDown, patientOnly: true, intro: 'Exporter votre dossier ou demander la fermeture du compte.' },
];
const SETTINGS = [
  { id: 'appointments', section: 'notifications', label: 'Rendez-vous', description: 'Confirmations, annulations et changements', keywords: 'notification alerte rdv consultation' },
  { id: 'medications', section: 'notifications', label: 'Rappels de prise', description: 'Médicaments de votre pilulier', keywords: 'notification alerte médicament traitement pilulier rappel' },
  { id: 'messages', section: 'notifications', label: 'Messages', description: 'Nouveaux messages de vos médecins', keywords: 'notification alerte messagerie' },
  { id: 'emergencyQr', section: 'privacy', label: 'QR code d’urgence', description: 'Désactivé, le Pass Santé n’affiche plus de QR lisible par un secouriste.', keywords: 'confidentialité urgence secours pass santé qr' },
  { id: 'access', section: 'privacy', label: 'Qui a accès à mon dossier', description: 'Gérer les accès des médecins et voir l’historique des accès', keywords: 'confidentialité consentement journal médecin', needsNav: true },
  { id: 'password', section: 'security', label: 'Changer mon mot de passe', description: 'Mot de passe actuel, nouveau mot de passe et confirmation', keywords: 'sécurité connexion compte identifiant' },
  { id: 'exportJson', section: 'data', label: 'Exporter mes données (JSON)', description: 'Dossier et lignes détaillées, sans limite de pagination', keywords: 'export télécharger sauvegarde portabilité rgpd' },
  { id: 'exportPdf', section: 'data', label: 'Télécharger un résumé (PDF)', description: 'Identité, rendez-vous et ordonnances récents', keywords: 'export télécharger imprimer pdf' },
  { id: 'close', section: 'data', label: 'Fermer mon compte', description: 'Demande à votre médecin ou à l’administrateur NOVA', keywords: 'supprimer compte fermeture désinscription' },
];
const sectionLabel = (id) => SECTIONS.find((s) => s.id === id)?.label || '';
const SETTINGS_FIELDS = (r) => [r.label, r.description, sectionLabel(r.section), r.keywords];

export default function SettingsPage({ data, card, sub, darkMode, setPage, api: apiOverride }) {
  const isPatient = !apiOverride;
  const [prefs, setPrefs] = useState({ appointments: true, medications: true, messages: true, emergencyQr: true });
  const [saving, setSaving] = useState('');
  const [status, setStatus] = useState({ error: '', ok: '' });
  const [exporting, setExporting] = useState(false);
  const [query, setQuery] = useUrlQuery();

  const sections = SECTIONS.filter((s) => isPatient || !s.patientOnly);
  const available = SETTINGS.filter((r) => sections.some((s) => s.id === r.section) && (!r.needsNav || setPage));
  const [active, setActive] = useState(sections[0].id);
  const results = useSearch(available, query, SETTINGS_FIELDS);

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

  // Export JSON complet du dossier (route GET /patient/me/export/json), téléchargé côté navigateur.
  const exportData = async () => {
    if (exporting) return;
    setExporting(true);
    setStatus({ error: '', ok: '' });
    try {
      const blob = await request('/patient/me/export/json', { responseType: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'nova-dossier.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus({ error: '', ok: 'Export téléchargé.' });
    } catch (err) {
      setStatus({ error: err.message || 'Export impossible.', ok: '' });
    } finally {
      setExporting(false);
    }
  };

  const line = darkMode ? 'border-slate-800' : 'border-slate-100';
  const linkRow = `w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-colors ${darkMode ? 'border-slate-800 hover:border-red-800' : 'border-red-100 bg-white hover:border-red-300'}`;
  const hl = (text) => <Highlight text={text} query={query} />;

  const toggleEl = (k, label) => (
    <button type="button" role="switch" aria-checked={prefs[k]} aria-label={label} disabled={saving === k} onClick={() => toggle(k)}
      className={`relative w-11 h-6 shrink-0 rounded-full border transition-colors disabled:opacity-60 ${prefs[k] ? 'bg-red-600 border-red-600' : darkMode ? 'bg-slate-900 border-slate-600' : 'bg-white border-red-200'}`}>
      <span className={`absolute top-0.5 left-0.5 w-[1.125rem] h-[1.125rem] rounded-full shadow transition-transform ${prefs[k] ? 'translate-x-5 bg-white' : darkMode ? 'bg-slate-500' : 'bg-red-200'}`} />
    </button>
  );

  /* Rendu d'un réglage (r = entrée de SETTINGS). */
  const renderSetting = (r) => {
    switch (r.id) {
      case 'appointments':
      case 'medications':
      case 'messages':
        return (
          <div className="flex items-center justify-between gap-4 py-4">
            <div className="min-w-0"><p className="font-medium text-sm">{hl(r.label)}</p><p className={`text-xs mt-0.5 ${sub}`}>{hl(r.description)}</p></div>
            {toggleEl(r.id, r.label)}
          </div>
        );
      case 'emergencyQr':
        return (
          <div className="flex items-center justify-between gap-4 py-4">
            <div className="min-w-0"><p className="font-medium text-sm flex items-center gap-1.5"><QrCode className="w-4 h-4 text-red-600 shrink-0" /> {hl(r.label)}</p><p className={`text-xs mt-0.5 ${sub}`}>{hl(r.description)}</p></div>
            {toggleEl('emergencyQr', r.label)}
          </div>
        );
      case 'access':
        return (
          <div className="py-4">
            <button type="button" onClick={() => setPage('privacy')} className={linkRow}>
              <IconBadge Icon={Shield} size="sm" />
              <span className="flex-1 min-w-0"><span className="block font-medium text-sm">{hl(r.label)}</span><span className={`block text-xs mt-0.5 ${sub}`}>{hl(r.description)}</span></span>
              <ChevronRight className="w-4 h-4 text-red-600 shrink-0" />
            </button>
          </div>
        );
      case 'password':
        return <div className="py-4"><PasswordSection sub={sub} darkMode={darkMode} strong={!isPatient} title={hl(r.label)} /></div>;
      case 'exportJson':
        return (
          <div className="py-4">
            <button type="button" onClick={exportData} disabled={exporting} className={`${linkRow} disabled:opacity-60`}>
              <IconBadge Icon={FileDown} size="sm" />
              <span className="flex-1 min-w-0"><span className="block font-medium text-sm">{exporting ? 'Export en cours…' : hl(r.label)}</span><span className={`block text-xs mt-0.5 ${sub}`}>{hl(r.description)}</span></span>
              <ChevronRight className="w-4 h-4 text-red-600 shrink-0" />
            </button>
          </div>
        );
      case 'exportPdf':
        return (
          <div className="py-4">
            <a href={patientApi.exportPdfUrl()} target="_blank" rel="noreferrer" className={linkRow}>
              <IconBadge Icon={FileDown} size="sm" />
              <span className="flex-1 min-w-0"><span className="block font-medium text-sm">{hl(r.label)}</span><span className={`block text-xs mt-0.5 ${sub}`}>{hl(r.description)}</span></span>
              <ChevronRight className="w-4 h-4 text-red-600 shrink-0" />
            </a>
          </div>
        );
      case 'close':
        return (
          <div className="py-4">
            <div className={`flex items-start gap-4 p-4 rounded-2xl border ${darkMode ? 'border-slate-800' : 'border-red-100 bg-white'}`}>
              <IconBadge Icon={UserX} size="sm" />
              <div className="min-w-0"><p className="font-medium text-sm">{hl(r.label)}</p>
                <p className={`text-xs mt-0.5 ${sub}`}>La fermeture n’est pas encore disponible en libre-service : demandez-la à votre médecin ou à l’administrateur NOVA. Vos actes médicaux restent conservés conformément à la réglementation.</p></div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Avec une recherche : toutes les rubriques ayant un résultat ; sinon la rubrique choisie dans la navigation.
  const searching = Boolean(query.trim());
  const countBySection = Object.fromEntries(sections.map((s) => [s.id, (searching ? results : available).filter((r) => r.section === s.id).length]));
  const shownSections = searching ? sections.filter((s) => countBySection[s.id] > 0) : sections.filter((s) => s.id === active);
  const rowsOf = (sectionId) => (searching ? results : available).filter((r) => r.section === sectionId);
  const pick = (id) => {
    setActive(id);
    if (searching) document.getElementById(`settings-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Paramètres" subtitle={`Sécurité de votre compte${isPatient ? ', notifications et confidentialité' : ''}`} sub={sub} />

      <SearchInput value={query} onChange={setQuery} count={results.length} darkMode={darkMode}
        placeholder="Rechercher un réglage (export, notifications, mot de passe…)" label="Rechercher dans les paramètres" />

      {status.error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-2xl px-4 py-2.5">{status.error}</p>}
      {status.ok && <p role="status" className={`text-sm font-medium rounded-2xl px-4 py-2.5 border ${darkMode ? 'border-slate-800 text-red-300' : 'border-red-100 bg-white text-red-700'}`}>{status.ok}</p>}

      {/* Mobile : rubriques en pastilles */}
      {sections.length > 1 && (
        <div className="lg:hidden">
          <Pills options={sections.map((s) => [s.id, s.label, searching ? countBySection[s.id] : undefined])} value={active} onChange={pick} darkMode={darkMode} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[15rem_minmax(0,1fr)] gap-5 items-start">
        {/* Navigation verticale (écran large) */}
        <Card darkMode={darkMode} as="nav" aria-label="Rubriques des paramètres" className="hidden lg:block !p-2 lg:sticky lg:top-4">
          <ul className="space-y-1">
            {sections.map(({ id, label, Icon }) => {
              const isActive = !searching && id === active;
              const dim = searching && !countBySection[id];
              return (
                <li key={id}>
                  <button type="button" onClick={() => pick(id)} aria-current={isActive ? 'page' : undefined} disabled={dim}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium text-left transition-colors disabled:opacity-40 ${isActive
                      ? 'bg-red-600 text-white'
                      : darkMode ? 'hover:bg-slate-800' : 'hover:bg-red-50 hover:text-red-700'}`}>
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-red-600'}`} />
                    <span className="flex-1 truncate">{label}</span>
                    {searching && countBySection[id] > 0 && <span className="min-w-[1.25rem] px-1 rounded-full text-[10px] font-semibold text-center bg-red-50 text-red-700">{countBySection[id]}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="space-y-5 min-w-0">
          {searching && results.length === 0 ? (
            <NoResults query={query} onClear={() => setQuery('')} darkMode={darkMode} />
          ) : shownSections.map((s) => {
            const sectionRows = rowsOf(s.id);
            return (
              <Card key={s.id} id={`settings-${s.id}`} darkMode={darkMode} className="scroll-mt-4">
                <div className="flex items-start gap-3 mb-1">
                  <IconBadge Icon={s.Icon} size="sm" />
                  <div className="min-w-0">
                    <h3 className="font-semibold">{s.label}</h3>
                    <p className={`text-xs mt-0.5 ${sub}`}>{s.intro}</p>
                  </div>
                </div>
                <div className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                  {sectionRows.map((r) => <React.Fragment key={r.id}>{renderSetting(r)}</React.Fragment>)}
                </div>
                {s.id === 'notifications' && (
                  <p className={`text-xs pt-4 border-t ${line} ${sub}`}>Les notifications médicales (consultation, ordonnance, résultat, délivrance) restent toujours actives.</p>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* Changement de mot de passe : « Annuler » et « Enregistrer » en haut à droite (seule rubrique à enregistrement explicite). */
function PasswordSection({ sub, darkMode, strong, title = 'Changer mon mot de passe' }) {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [state, setState] = useState({ saving: false, error: '', ok: '' });
  const valid = strong
    ? form.next.length >= 12 && /[a-z]/.test(form.next) && /[A-Z]/.test(form.next) && /\d/.test(form.next) && /[^A-Za-z0-9]/.test(form.next)
    : form.next.length >= 8 && /[A-Za-z]/.test(form.next) && /\d/.test(form.next);
  const dirty = Boolean(form.current || form.next || form.confirm);
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
  const cancel = () => { setForm({ current: '', next: '', confirm: '' }); setState({ saving: false, error: '', ok: '' }); };
  const input = `mt-1 ${inputClass(darkMode)}`;
  const label = 'block text-xs font-medium text-slate-500';
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-medium text-sm">{title}</p>
        <div className="flex gap-2">
          <Button variant="secondary" darkMode={darkMode} onClick={cancel} disabled={!dirty || state.saving}>Annuler</Button>
          <Button type="submit" darkMode={darkMode} disabled={state.saving || !form.current || !form.next || !form.confirm}>{state.saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label className={label}>Mot de passe actuel<input type="password" autoComplete="current-password" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} className={input} /></label>
        <label className={label}>Nouveau mot de passe<input type="password" autoComplete="new-password" value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} className={input} /></label>
        <label className={label}>Confirmation<input type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} className={input} /></label>
      </div>
      <p className={`text-xs ${sub} flex items-start gap-1.5`}><Shield className="w-3.5 h-3.5 mt-0.5 shrink-0 text-red-600" />{strong ? '12 caractères minimum, avec majuscule, minuscule, chiffre et caractère spécial.' : '8 caractères minimum, avec au moins une lettre et un chiffre.'}</p>
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm font-medium text-red-700">{state.ok}</p>}
    </form>
  );
}
