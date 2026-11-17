import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, HelpCircle, Info, X } from 'lucide-react';

/*
 * Fenêtres de dialogue NOVA (remplacent window.confirm / prompt / alert, qui affichent
 * « nova.mhtechconsulting.com indique » et ne suivent ni le thème ni l'accessibilité).
 *   if (!(await confirmDialog({ title, message, confirmLabel, danger: true }))) return;
 *   const motif = await promptDialog({ title, label, required: true });   // null si annulé
 *   await alertDialog({ title, message });
 * Un seul <DialogHost /> est monté (main.jsx) ; les demandes s'affichent l'une après l'autre.
 */
let queue = [];
let notify = null;
const push = (dialog) => new Promise((resolve) => {
  queue = [...queue, { ...dialog, resolve, id: Math.random().toString(36).slice(2) }];
  notify?.(queue);
});

export const confirmDialog = (opts) => push({ kind: 'confirm', ...opts });
export const promptDialog = (opts) => push({ kind: 'prompt', ...opts });
export const alertDialog = (opts) => push({ kind: 'alert', ...opts });

const isDark = () => { try { return localStorage.getItem('nova_darkMode') === 'true'; } catch { return false; } };

export function DialogHost() {
  const [items, setItems] = useState(queue);
  useEffect(() => { notify = setItems; return () => { notify = null; }; }, []);
  const current = items[0];
  if (!current) return null;
  const close = (value) => {
    queue = queue.filter((d) => d.id !== current.id);
    setItems(queue);
    current.resolve(value);
  };
  return <Dialog key={current.id} d={current} close={close} dark={isDark()} />;
}

function Dialog({ d, close, dark }) {
  const [value, setValue] = useState(d.defaultValue || '');
  const [error, setError] = useState('');
  const panel = useRef(null);
  const field = useRef(null);
  const confirmBtn = useRef(null);
  const previous = useRef(typeof document !== 'undefined' ? document.activeElement : null);
  const cancelValue = d.kind === 'confirm' ? false : d.kind === 'prompt' ? null : undefined;

  useEffect(() => {
    // Focus : le champ de saisie, sinon le bouton le moins risqué (Annuler pour une action dangereuse).
    const target = field.current || (d.danger ? panel.current?.querySelector('[data-cancel]') : confirmBtn.current);
    target?.focus();
    const back = previous.current;
    return () => { if (back && typeof back.focus === 'function') back.focus(); };
  }, [d.danger]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(cancelValue); return; }
      if (e.key !== 'Tab') return;
      // Le focus reste dans la fenêtre.
      const nodes = [...panel.current.querySelectorAll('button, input, textarea')].filter((n) => !n.disabled);
      if (!nodes.length) return;
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  const submit = (e) => {
    e?.preventDefault();
    if (d.kind === 'confirm') return close(true);
    if (d.kind === 'alert') return close(undefined);
    const text = value.trim();
    if (d.required && !text) { setError(d.requiredMessage || 'Ce champ est obligatoire.'); field.current?.focus(); return; }
    const problem = d.validate?.(text);
    if (problem) { setError(problem); field.current?.focus(); return; }
    close(text);
  };

  const Icon = d.kind === 'alert' ? Info : d.danger ? AlertTriangle : HelpCircle;
  const tone = d.danger ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600';
  const confirmLabel = d.confirmLabel || (d.kind === 'alert' ? 'Compris' : d.kind === 'prompt' ? 'Valider' : 'Confirmer');
  const input = `mt-1.5 block w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500/40 ${dark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'} ${error ? '!border-red-500' : ''}`;
  const InputTag = d.multiline ? 'textarea' : 'input';

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/60" role="presentation"
      onMouseDown={(e) => { if (e.target === e.currentTarget && d.kind !== 'alert') close(cancelValue); }}>
      <form ref={panel} onSubmit={submit} role={d.danger ? 'alertdialog' : 'dialog'} aria-modal="true" aria-labelledby={`dlg-t-${d.id}`} aria-describedby={d.message ? `dlg-m-${d.id}` : undefined}
        className={`w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl ${dark ? 'bg-slate-900 text-slate-100 border border-slate-800' : 'bg-white text-slate-900'}`}>
        <div className="flex items-start gap-3">
          <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${tone}`}><Icon className="w-5 h-5" /></span>
          <div className="flex-1 min-w-0 pt-1">
            <h2 id={`dlg-t-${d.id}`} className="text-base font-bold leading-snug">{d.title}</h2>
            {d.message && <p id={`dlg-m-${d.id}`} className={`mt-1.5 text-sm leading-relaxed ${dark ? 'text-slate-300' : 'text-slate-600'}`}>{d.message}</p>}
          </div>
          {d.kind !== 'alert' && (
            <button type="button" onClick={() => close(cancelValue)} aria-label="Fermer" className={`p-1 -mt-1 -mr-1 rounded-lg ${dark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}><X className="w-5 h-5" /></button>
          )}
        </div>
        {d.kind === 'prompt' && (
          <label className="block mt-4 text-sm font-medium">
            {d.label}
            <InputTag ref={field} value={value} onChange={(e) => { setValue(e.target.value); setError(''); }} placeholder={d.placeholder}
              inputMode={d.inputMode} maxLength={d.maxLength} rows={d.multiline ? 3 : undefined} aria-invalid={Boolean(error)}
              onKeyDown={(e) => { if (d.multiline && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(e); }}
              className={input} />
            {error ? <span role="alert" className="block mt-1.5 text-xs text-red-600">{error}</span>
              : d.hint && <span className={`block mt-1.5 text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{d.hint}</span>}
          </label>
        )}
        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          {d.kind !== 'alert' && (
            <button type="button" data-cancel onClick={() => close(cancelValue)}
              className={`h-11 px-5 rounded-xl text-sm font-semibold border ${dark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-50'}`}>
              {d.cancelLabel || 'Annuler'}
            </button>
          )}
          <button ref={confirmBtn} type="submit"
            className={`h-11 px-5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700`}>
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
