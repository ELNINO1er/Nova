import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { CONSENT_TERMS, CONSENT_TERMS_VERSION, CONSENT_DURATION_DAYS, SHARE_DURATION_DAYS } from '../utils/consentTerms.js';

// Consentement éclairé : affiché avant tout accès accordé à un médecin. Le bouton n'est actif
// qu'après acceptation explicite ; la réponse envoyée au serveur porte la version des conditions.
// sharing : partage au moment d'un rendez-vous (accès de 90 jours) plutôt qu'une autorisation de 12 mois.
export default function ConsentDialog({ doctorName, confirming = false, sharing = false, onCancel, onAccept, darkMode }) {
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const panel = useRef(null);
  const until = new Date(Date.now() + (sharing ? SHARE_DURATION_DAYS : CONSENT_DURATION_DAYS) * 86400000).toLocaleDateString('fr-FR');

  useEffect(() => {
    panel.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  const accept = async () => {
    if (!accepted || busy) return;
    setBusy(true);
    try { await onAccept({ acknowledged: true, termsVersion: CONSENT_TERMS_VERSION }); }
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
        <ul className="mt-5 space-y-3 text-sm leading-relaxed">
          {CONSENT_TERMS.map((t) => <li key={t} className="flex gap-2"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" /><span>{t}</span></li>)}
        </ul>
        <p className={`mt-4 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Accès valable jusqu’au {until} au plus · conditions version {CONSENT_TERMS_VERSION}</p>
        <label className={`mt-5 flex items-start gap-3 p-3 rounded-xl border cursor-pointer text-sm ${accepted ? 'border-red-300 bg-red-50/60 text-slate-900' : darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <input type="checkbox" className="mt-0.5 w-4 h-4 accent-red-600" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
          <span>J’ai lu ces conditions et j’accepte que <strong>{doctorName}</strong> accède à mon dossier médical.</span>
        </label>
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
