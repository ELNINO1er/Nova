import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { CONSENT_TERMS, CONSENT_TERMS_VERSION, CONSENT_DURATION_DAYS, SHARE_DURATION_DAYS } from '../utils/consentTerms.js';

// Consentement éclairé : affiché avant tout accès accordé à un médecin. Le bouton n'est actif
// qu'après acceptation explicite ; la réponse envoyée au serveur porte la version des conditions.
// sharing : partage au moment d'un rendez-vous (accès de 90 jours) plutôt qu'une autorisation de 12 mois.
export default function ConsentDialog({ doctorName, confirming = false, sharing = false, onCancel, onAccept, darkMode }) {
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const panel = useRef(null);
  const until = new Date(Date.now() + (sharing ? SHARE_DURATION_DAYS : CONSENT_DURATION_DAYS) * 86400000).toLocaleDateString('fr-FR');

  const current = useRef({ busy, onCancel });
  current.current = { busy, onCancel };
  useEffect(() => containConsentFocus(panel.current, () => {
    if (!current.current.busy) current.current.onCancel();
  }), []);

  const accept = async () => {
    if (!accepted || busy) return;
    setError('');
    setBusy(true);
    try { await onAccept({ acknowledged: true, termsVersion: CONSENT_TERMS_VERSION }); }
    catch (err) { setError(err.message || 'Enregistrement impossible. Votre accord n’est pas confirmé. Réessayez.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60" role="presentation" onClick={() => !busy && onCancel()}>
      <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="consent-title" onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-2xl outline-none ${darkMode ? 'bg-slate-900 text-slate-100 border border-slate-800' : 'bg-white text-slate-900'}`}>
        <div className="flex items-start gap-3">
          <span className="w-11 h-11 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0"><ShieldCheck className="w-6 h-6" /></span>
          <div className="flex-1">
            <h2 id="consent-title" className="text-lg font-bold">{sharing ? 'Partager votre dossier avec ' : confirming ? 'Confirmer l’accès de ' : 'Autoriser '}{doctorName}</h2>
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Lisez ce que cet accès permet avant de décider.</p>
          </div>
          <button type="button" onClick={onCancel} disabled={busy} aria-label="Fermer" className="p-1 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className={`mt-4 rounded-xl border p-3 text-sm ${darkMode ? 'border-slate-700' : 'border-red-100 bg-red-50'}`}>
          <p><strong>Dossier clinique complet</strong> : le choix de rubriques séparées n’est pas disponible. Cet accord concerne le médecin nommé ci-dessus.</p>
          <p className="mt-2">{sharing ? 'Le partage est facultatif. Une réservation seule ne donne pas accès au dossier. Si le rendez-vous est confirmé avec votre accord, l’accès lié à ce rendez-vous dure au maximum 90 jours à partir du partage, pas de la date du rendez-vous. Un report ne prolonge pas cette durée. L’annulation du rendez-vous ferme l’accès lié à ce rendez-vous. Une autorisation explicite encore valide ou un autre rendez-vous confirmé avec partage peut toutefois maintenir l’accès de ce médecin ; pour le retirer entièrement, utilisez « Accès au dossier ».' : confirming ? 'Cette confirmation porte sur l’autorisation en cours ; elle ne renouvelle pas sa date d’expiration. Consultez « Accès au dossier » pour sa durée effective.' : 'Une nouvelle autorisation dure 365 jours. Si ce médecin possède déjà une autorisation valide, sa date d’expiration est conservée.'}</p>
          <p className="mt-2">Vous pouvez retirer l’accès dans « Accès au dossier ». Le retrait bloque les nouveaux accès de ce médecin, y compris ceux liés à un partage antérieur de rendez-vous. Il ne supprime pas les données déjà ajoutées au dossier ni les informations déjà consultées. Vous pourrez donner un nouvel accord ultérieurement.</p>
        </div>
        <ul className="mt-5 space-y-3 text-sm leading-relaxed">
          {CONSENT_TERMS.map((t) => <li key={t} className="flex gap-2"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" /><span>{t}</span></li>)}
        </ul>
        <p className={`mt-4 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{confirming ? 'Échéance : celle de l’autorisation existante.' : `Échéance indicative pour un nouvel accord : ${until}. L’échéance effective figure dans « Accès au dossier ».`} · conditions version {CONSENT_TERMS_VERSION}</p>
        <label className={`mt-5 flex items-start gap-3 p-3 rounded-xl border cursor-pointer text-sm ${accepted ? 'border-red-300 bg-red-50/60 text-slate-900' : darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <input type="checkbox" className="mt-0.5 w-4 h-4 accent-red-600" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
          <span>J’ai lu ces conditions et j’accepte que <strong>{doctorName}</strong> accède à mon dossier médical.</span>
        </label>
        {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button type="button" onClick={onCancel} disabled={busy} className={`h-11 px-5 rounded-xl font-semibold text-sm border ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>Annuler</button>
          <button type="button" onClick={accept} disabled={!accepted || busy} className="h-11 px-5 rounded-xl font-semibold text-sm bg-red-600 text-white disabled:opacity-40">
            {busy ? 'Enregistrement…' : sharing ? 'Partager et réserver' : confirming ? 'Confirmer l’accès' : 'Autoriser l’accès'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Keep keyboard navigation inside this modal, including while buttons are disabled.
export function containConsentFocus(dialog, onEscape) {
  const previous = document.activeElement;
  dialog?.focus();
  const onKey = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onEscape();
      return;
    }
    if (event.key !== 'Tab' || !dialog) return;
    const elements = Array.from(dialog.querySelectorAll(
      'button:not(:disabled), input:not(:disabled), a[href], [tabindex="0"]'
    )).filter((element) => element.getClientRects().length);
    const first = elements[0];
    const last = elements[elements.length - 1];
    const active = document.activeElement;
    if (!first) {
      event.preventDefault();
      dialog.focus();
    } else if (active === dialog || !dialog.contains(active) ||
      (event.shiftKey ? active === first : active === last)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    }
  };
  document.addEventListener('keydown', onKey);
  return () => {
    document.removeEventListener('keydown', onKey);
    if (previous?.isConnected) previous.focus();
  };
}
