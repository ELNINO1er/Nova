import React, { useEffect, useRef, useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useDialogFocus } from './useDialogFocus.js';
import { INSTALL_DISMISSED_KEY, INSTALL_KNOWN_KEY, forgetInstallationChoice, installationHidden, isAppleMobile, isPhoneOrTablet, isStandalone, rememberInstallationChoice } from '../utils/pwa.js';

export default function InstallPrompt() {
  const { pathname } = useLocation();
  const [promptEvent, setPromptEvent] = useState(null);
  const [installed, setInstalled] = useState(() => isStandalone() || installationHidden(INSTALL_KNOWN_KEY));
  const [dismissed, setDismissed] = useState(() => installationHidden(INSTALL_DISMISSED_KEY));
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const [instructions, setInstructions] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');
  const panel = useRef(null);
  const apple = isAppleMobile();
  useDialogFocus(instructions, panel, () => setInstructions(false));

  useEffect(() => {
    // Le retrait du formulaire de connexion ne déclenche pas toujours focusout.
    const frame = window.requestAnimationFrame(() => {
      setEditing(/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || ''));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    const mode = window.matchMedia('(display-mode: standalone)');
    const onMode = () => {
      if (isStandalone()) {
        rememberInstallationChoice(INSTALL_KNOWN_KEY, 90);
        setInstalled(true);
        setInstructions(false);
      }
    };
    const onInstalled = () => {
      rememberInstallationChoice(INSTALL_KNOWN_KEY, 90);
      setInstalled(true);
      setPromptEvent(null);
      setInstructions(false);
    };
    const onPrompt = (event) => {
      if (!isPhoneOrTablet() || isStandalone()) return;
      event.preventDefault();
      // Le navigateur peut de nouveau proposer l’installation après une désinstallation.
      forgetInstallationChoice(INSTALL_KNOWN_KEY);
      setInstalled(false);
      setPromptEvent(event);
    };
    const onStorage = (event) => {
      if (event.key === INSTALL_KNOWN_KEY) setInstalled(isStandalone() || installationHidden(INSTALL_KNOWN_KEY));
      if (event.key === INSTALL_DISMISSED_KEY) setDismissed(installationHidden(INSTALL_DISMISSED_KEY));
    };
    const onFocus = () => setEditing(/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || ''));
    const onBlur = (event) => setEditing(/^(INPUT|TEXTAREA|SELECT)$/.test(event.relatedTarget?.tagName || ''));
    const timer = window.setTimeout(() => setReady(true), 6000);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('storage', onStorage);
    mode.addEventListener?.('change', onMode);
    document.addEventListener('focusin', onFocus);
    document.addEventListener('focusout', onBlur);
    onMode();
    onFocus();
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('storage', onStorage);
      mode.removeEventListener?.('change', onMode);
      document.removeEventListener('focusin', onFocus);
      document.removeEventListener('focusout', onBlur);
    };
  }, []);

  const dismiss = () => {
    rememberInstallationChoice(INSTALL_DISMISSED_KEY, 7);
    setDismissed(true);
    setInstructions(false);
  };
  const alreadyInstalled = () => {
    rememberInstallationChoice(INSTALL_KNOWN_KEY, 90);
    setInstalled(true);
    setInstructions(false);
  };
  const install = async () => {
    if (!promptEvent) { setInstructions(true); return; }
    setWorking(true);
    setMessage('');
    try {
      // prompt() doit être appelé directement pendant le clic de l’utilisateur.
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      setPromptEvent(null);
      if (choice.outcome === 'accepted') alreadyInstalled();
      else dismiss();
    } catch {
      setPromptEvent(null);
      setMessage('Utilisez le menu de votre navigateur pour installer NOVA.');
      setInstructions(true);
    } finally { setWorking(false); }
  };

  if (installed || dismissed || !isPhoneOrTablet() || !window.isSecureContext) return null;
  if (!ready || (!promptEvent && !apple && !instructions)) return null;

  return <>
    {!editing && !instructions && <aside aria-label="Installer NOVA sur le téléphone" className="fixed z-40 left-3 right-3 sm:left-auto sm:w-96 bottom-[calc(env(safe-area-inset-bottom)+5rem)] rounded-2xl border border-red-200 bg-white text-slate-900 shadow-lg p-3 flex items-center gap-3">
      <img src="/icons/nova-192.png" alt="" className="size-10 rounded-xl shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">NOVA sur votre téléphone</p>
        <p className="text-xs text-slate-600">Un accès depuis votre écran d’accueil.</p>
        <button type="button" onClick={install} disabled={working}
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-red-700 disabled:opacity-50">
          <Download className="size-4" />
          {working ? 'Ouverture…' : apple && !promptEvent ? 'Comment installer' : 'Installer NOVA'}
        </button>
      </div>
      <button type="button" aria-label="Masquer l’invitation pendant 7 jours" onClick={dismiss}
        className="size-11 shrink-0 grid place-items-center rounded-xl hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500">
        <X className="size-5" />
      </button>
    </aside>}
    {instructions && <div className="fixed inset-0 z-[90] bg-slate-950/60 p-4 grid place-items-center" onClick={() => setInstructions(false)}>
      <section ref={panel} role="dialog" aria-modal="true" aria-labelledby="install-nova-title" tabIndex={-1} onClick={(event) => event.stopPropagation()} className="w-full max-w-md max-h-[85dvh] overflow-y-auto rounded-2xl bg-white text-slate-900 p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <Smartphone className="size-6 text-red-600 shrink-0" />
          <h2 id="install-nova-title" className="font-bold text-lg flex-1">Installer NOVA</h2>
          <button type="button" onClick={() => setInstructions(false)} aria-label="Fermer les instructions"
            className="size-11 grid place-items-center rounded-xl hover:bg-red-50">
            <X className="size-5" />
          </button>
        </div>
        {message && <p role="status" className="text-sm mt-3">{message}</p>}
        <ol className="list-decimal pl-5 mt-4 space-y-3 text-sm leading-relaxed">
          {apple ? <>
            <li>Dans votre navigateur, ouvrez le menu <strong>Partager</strong> <Share className="size-4 inline" aria-hidden="true" />.</li>
            <li>Choisissez <strong>Sur l’écran d’accueil</strong>, puis <strong>Ajouter</strong>. Si cette option manque, ouvrez NOVA dans Safari.</li>
            <li>Ouvrez ensuite NOVA depuis sa nouvelle icône.</li>
          </> : <>
            <li>Ouvrez le menu de votre navigateur, généralement les trois points en haut à droite.</li>
            <li>Choisissez <strong>Installer l’application</strong> ou <strong>Ajouter à l’écran d’accueil</strong>, puis confirmez.</li>
            <li>Ouvrez NOVA depuis sa nouvelle icône.</li>
          </>}
        </ol>
        <p className="mt-4 text-xs text-slate-600">Une connexion internet est nécessaire pour consulter vos données de santé. Votre connexion et votre double authentification restent nécessaires selon votre compte.</p>
        <div className="mt-5 grid gap-2">
          <button type="button" onClick={dismiss} className="min-h-11 bg-red-600 text-white rounded-xl font-semibold">J’ai compris</button>
          <button type="button" onClick={alreadyInstalled} className="min-h-11 rounded-xl border font-semibold text-sm">NOVA est déjà installée</button>
        </div>
      </section>
    </div>}
  </>;
}
