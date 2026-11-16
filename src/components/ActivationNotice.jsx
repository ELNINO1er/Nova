import React, { useState } from 'react';
import { MessageSquare, Printer, ShieldCheck } from 'lucide-react';
import { formatDate } from '../utils/format.js';

const dateTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${formatDate(iso)} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
};

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function printSheet({ name, phone, code, expiresAt }) {
  const win = window.open('', '_blank', 'width=600,height=700');
  if (!win) return false;
  win.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Activation NOVA</title>
  <style>body{font-family:system-ui,sans-serif;padding:32px;color:#0f172a}h1{font-size:20px}dt{font-size:12px;color:#475569;margin-top:16px}dd{margin:4px 0 0;font-size:18px;font-weight:700}code{font-size:24px;letter-spacing:2px}p{font-size:13px;line-height:1.5}</style></head>
  <body><h1>Activation de votre compte NOVA</h1>
  <p>Remis en main propre à : <strong>${escapeHtml(name)}</strong></p>
  <dl><dt>Numéro de connexion</dt><dd>${escapeHtml(phone)}</dd>
  <dt>Code d’activation (usage unique)</dt><dd><code>${escapeHtml(code)}</code></dd>
  <dt>Valable jusqu’au</dt><dd>${escapeHtml(dateTime(expiresAt))}</dd></dl>
  <p>Connectez-vous avec votre numéro et ce code, puis choisissez votre propre mot de passe. Le code ne fonctionnera plus ensuite.
  Ne le communiquez à personne. S’il a expiré, demandez un nouveau code à votre médecin.</p>
  <script>window.onload=()=>window.print()</script></body></html>`);
  win.document.close();
  return true;
}

/** Résultat d'une activation patient : SMS envoyé, échec SMS, ou fiche à remettre (code affiché une fois). */
export default function ActivationNotice({ activation, name, phone, darkMode, onRenew, renewing }) {
  const [copied, setCopied] = useState(false);
  if (!activation) return null;
  const until = dateTime(activation.expiresAt);

  if (activation.channel === 'sms') {
    return activation.sent ? (
      <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900 flex gap-2">
        <MessageSquare className="w-4 h-4 shrink-0 mt-0.5" />
        <p>Code d’activation envoyé par SMS au patient (valable jusqu’au {until}). Il choisira son mot de passe à la première connexion. Le code n’est pas affiché ici.</p>
      </div>
    ) : (
      <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 space-y-2">
        <p>Le SMS d’activation n’a pas pu être envoyé. Vérifiez le numéro puis renvoyez un code.</p>
        {onRenew && <button type="button" onClick={onRenew} disabled={renewing} className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-semibold disabled:opacity-50">Renvoyer le code</button>}
      </div>
    );
  }

  const copy = async () => {
    try { await navigator.clipboard?.writeText(`Numéro : ${phone}\nCode d’activation : ${activation.code}\nValable jusqu’au : ${until}`); setCopied(true); }
    catch { setCopied(false); }
  };
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 flex gap-2">
        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
        <p>Remettez ce code <strong>en main propre</strong> au patient. Il est à usage unique, expire le {until} et ne sera plus affiché.
          Le patient choisit ensuite son propre mot de passe : le code ne fonctionne plus.</p>
      </div>
      <div className="rounded-xl bg-slate-950 text-white p-4 space-y-1">
        <p className="text-xs text-slate-300">Numéro</p>
        <p className="font-mono font-bold">{phone}</p>
        <p className="text-xs text-slate-300 pt-2">Code d’activation</p>
        <code className="text-lg font-bold break-all select-all">{activation.code}</code>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => printSheet({ name, phone, code: activation.code, expiresAt: activation.expiresAt })}
          className={`flex-1 px-4 py-2 rounded-lg border font-semibold text-sm flex items-center justify-center gap-1.5 ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>
          <Printer className="w-4 h-4" /> Imprimer la fiche
        </button>
        <button type="button" onClick={copy}
          className={`flex-1 px-4 py-2 rounded-lg border font-semibold text-sm ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>
          {copied ? 'Copié' : 'Copier'}
        </button>
      </div>
    </div>
  );
}
