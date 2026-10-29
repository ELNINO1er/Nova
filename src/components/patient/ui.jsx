import React from 'react';
import { Avatar } from '../dashboard/kit.jsx';
import { highlightParts } from '../../utils/search.js';

/*
 * Kit d'interface de l'espace patient — deux couleurs seulement : rouge (red-50…red-700) et blanc.
 * Le gris (slate) ne sert qu'au texte secondaire et aux bordures fines, jamais aux fonds ni aux statuts.
 * Règles : pas de dégradé, pas d'autre teinte (vert, orange, bleu, violet…), coins arrondis généreux,
 * le rouge signale (action principale, élément actif, alerte), le gris informe.
 * Inspiré des maquettes de référence (Nexus, Liva, Clinik) : cartes blanches, pastilles, tableaux aérés.
 */

export { Avatar };

/* En-tête de page : titre, sous-titre et actions à droite. */
export function PageHeader({ title, subtitle, actions, sub }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h2>
        {subtitle && <p className={`text-sm mt-1 ${sub || 'text-slate-500'}`}>{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* Carte blanche (ou ardoise en mode sombre). */
export function Card({ children, className = '', darkMode, as: Tag = 'section', ...rest }) {
  return (
    <Tag className={`rounded-3xl border p-5 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/70'} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

/* Titre de carte avec action optionnelle à droite. */
export function CardTitle({ children, action, Icon, sub }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <h3 className="font-semibold flex items-center gap-2 min-w-0">
        {Icon && <Icon className="w-4 h-4 text-red-600 shrink-0" />}
        <span className="truncate">{children}</span>
      </h3>
      {action}
    </div>
  );
}

/* Pastilles de sélection (onglets internes à une page, filtres). options: [[id, label, count?]] */
export function Pills({ options, value, onChange, darkMode }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="tablist">
      {options.map(([id, label, count]) => {
        const active = value === id;
        return (
          <button key={id} type="button" role="tab" aria-selected={active} onClick={() => onChange(id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors flex items-center gap-1.5 ${active
              ? 'bg-red-600 border-red-600 text-white'
              : darkMode ? 'border-slate-700 text-slate-300 hover:border-red-500' : 'border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-700'}`}>
            {label}
            {count != null && <span className={`min-w-[1.25rem] px-1 rounded-full text-[10px] ${active ? 'bg-white/25 text-white' : darkMode ? 'bg-slate-800' : 'bg-red-50 text-red-700'}`}>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* Statut : tone 'alert' (rouge plein), 'watch' (rouge pâle), 'neutral' (gris). */
export function Chip({ tone = 'neutral', children, className = '' }) {
  const cls = tone === 'alert' ? 'bg-red-600 text-white' : tone === 'watch' ? 'bg-red-50 text-red-700' : 'bg-white border border-red-100 text-red-700/80';
  return <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${cls} ${className}`}>{children}</span>;
}

/* Bouton principal (rouge) et secondaire (contour). */
export function Button({ children, onClick, Icon, variant = 'primary', type = 'button', disabled, darkMode, className = '', ...rest }) {
  const base = 'h-10 px-4 rounded-full text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60';
  const look = variant === 'primary'
    ? 'bg-red-600 hover:bg-red-700 text-white'
    : variant === 'danger'
      ? (darkMode ? 'border border-red-900 text-red-300 hover:bg-red-950/40' : 'border border-red-200 text-red-700 hover:bg-red-50')
      : (darkMode ? 'border border-slate-700 hover:bg-slate-800' : 'border border-slate-200 bg-white hover:border-red-300 hover:text-red-700');
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${look} ${className}`} {...rest}>
      {Icon && <Icon className="w-4 h-4" />}{children}
    </button>
  );
}

/* Bouton rond icône seule (accessibilité : label obligatoire). */
export function IconButton({ Icon, label, onClick, tone = 'ghost', darkMode, disabled }) {
  const look = tone === 'primary' ? 'bg-red-600 hover:bg-red-700 text-white' : darkMode ? 'border border-slate-700 hover:bg-slate-800' : 'border border-slate-200 bg-white hover:bg-red-50';
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} disabled={disabled}
      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 disabled:opacity-60 ${look}`}>
      <Icon className="w-4 h-4" />
    </button>
  );
}

/* Pastille d'icône (rouge pâle) devant un élément de liste. */
export function IconBadge({ Icon, solid = false, size = 'md' }) {
  const s = size === 'lg' ? 'w-12 h-12' : size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  const i = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
  return <span className={`${s} rounded-2xl flex items-center justify-center shrink-0 ${solid ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600'}`}><Icon className={i} /></span>;
}

/* Indicateur chiffré (remplace les grandes tuiles colorées). highlight = fond rouge plein. */
export function StatTile({ label, value, unit, hint, Icon, highlight = false, darkMode, onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick}
      className={`text-left rounded-3xl border p-5 ${highlight ? 'bg-red-600 border-red-600 text-white' : darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/70'} ${onClick ? 'hover:shadow-md transition-shadow' : ''}`}>
      <div className="flex items-center gap-2">
        {Icon && <span className={`w-8 h-8 rounded-full flex items-center justify-center ${highlight ? 'bg-white/20' : 'bg-red-50 text-red-600'}`}><Icon className="w-4 h-4" /></span>}
        <span className={`text-sm font-medium ${highlight ? 'text-red-50' : darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{label}</span>
      </div>
      <p className="mt-3 flex items-baseline gap-1.5"><span className="text-3xl font-bold tabular-nums">{value}</span>{unit && <span className={`text-sm ${highlight ? 'text-red-100' : 'text-slate-500'}`}>{unit}</span>}</p>
      {hint && <p className={`text-xs mt-1 ${highlight ? 'text-red-100' : 'text-slate-500'}`}>{hint}</p>}
    </Tag>
  );
}

/* État vide compact : icône, titre, texte, action optionnelle. */
export function EmptyState({ Icon, title, children, action, darkMode }) {
  return (
    <div className={`rounded-3xl border border-dashed px-6 py-10 text-center ${darkMode ? 'border-slate-700' : 'border-slate-200 bg-white'}`}>
      {Icon && <span className="mx-auto mb-3 w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center"><Icon className="w-5 h-5" /></span>}
      {title && <p className="font-semibold">{title}</p>}
      {children && <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">{children}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

/* Tableau aéré dans une carte : columns = [label], rows = [[cell…]] ; première colonne en gras. */
export function DataTable({ columns, rows, darkMode, onRowClick }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className={darkMode ? 'bg-slate-800/40' : 'bg-red-50/50'}>
            {columns.map((c, i) => <th key={i} className="text-left text-xs font-semibold px-4 py-3 text-slate-500 whitespace-nowrap">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} onClick={onRowClick ? () => onRowClick(i) : undefined}
              className={`border-t ${darkMode ? 'border-slate-800' : 'border-slate-100'} ${onRowClick ? `cursor-pointer ${darkMode ? 'hover:bg-slate-800/40' : 'hover:bg-red-50/40'}` : ''}`}>
              {r.map((v, j) => <td key={j} className={`px-4 py-3.5 ${j === 0 ? 'font-medium min-w-[10rem]' : 'text-slate-500 whitespace-nowrap'}`}>{v}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* Ligne clé / valeur (fiches d'identité, détails). */
export function Field({ label, children, Icon }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-slate-500 flex items-center gap-1.5">{Icon && <Icon className="w-3.5 h-3.5" />}{label}</dt>
      <dd className="mt-1 text-sm font-medium break-words">{children ?? '—'}</dd>
    </div>
  );
}

/* Champ de formulaire stylé (input/select/textarea passés en enfant ou via props). */
export const inputClass = (darkMode) => `w-full h-11 px-4 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-400 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`;

/* Bloc date (jour en gros, mois au-dessus) : rouge plein pour le prochain élément. */
export function DateBlock({ date, highlight = false, darkMode }) {
  const d = date ? new Date(date) : null;
  return (
    <div className={`w-14 h-16 rounded-2xl flex flex-col items-center justify-center shrink-0 ${highlight ? 'bg-red-600 text-white' : darkMode ? 'bg-slate-800' : 'bg-red-50 text-red-700'}`}>
      <span className="text-[11px] font-semibold uppercase">{d ? d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '') : '—'}</span>
      <span className="text-xl font-bold leading-none">{d ? d.getDate() : ''}</span>
    </div>
  );
}

/* ─── Recherche ──────────────────────────────────────────────────────────── */

/*
 * Champ de recherche de page. Raccourci « / » pour y placer le curseur, Échap pour effacer.
 * Utiliser avec useUrlQuery() + useSearch() (src/utils/search.js) et <Highlight> dans les résultats.
 */
export function SearchInput({ value, onChange, placeholder = 'Rechercher…', label, darkMode, count, className = '', autoFocus = false }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && tag !== 'INPUT' && tag !== 'TEXTAREA' && !document.activeElement?.isContentEditable) {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div className={`relative ${className}`}>
      <SearchGlyph className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      <input ref={ref} type="search" value={value} onChange={(e) => onChange(e.target.value)} autoFocus={autoFocus}
        onKeyDown={(e) => { if (e.key === 'Escape' && value) { e.preventDefault(); onChange(''); } }}
        placeholder={placeholder} aria-label={label || placeholder}
        className={`w-full h-12 pl-11 pr-24 rounded-full border text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 [&::-webkit-search-cancel-button]:hidden ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`} />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
        {value && count != null && <span className="text-[11px] font-semibold text-red-700 bg-red-50 rounded-full px-2 py-0.5" aria-live="polite">{count} résultat{count > 1 ? 's' : ''}</span>}
        {value
          ? <button type="button" onClick={() => { onChange(''); ref.current?.focus(); }} aria-label="Effacer la recherche" className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50">×</button>
          : <kbd className="hidden sm:inline-flex h-6 min-w-6 px-1.5 items-center justify-center rounded-md border border-slate-200 text-[11px] text-slate-400 font-sans">/</kbd>}
      </div>
    </div>
  );
}

function SearchGlyph({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
    </svg>
  );
}

/* Surligne en rouge pâle les mots de la requête dans un texte (insensible aux accents). */
export function Highlight({ text, query }) {
  if (!query) return <>{text ?? ''}</>;
  return <>{highlightParts(text, query).map(([part, hit], i) => (hit ? <mark key={i} className="bg-red-100 text-red-800 rounded px-0.5">{part}</mark> : <React.Fragment key={i}>{part}</React.Fragment>))}</>;
}

/* Aucun résultat pour la recherche : rappelle la requête et propose d'effacer. */
export function NoResults({ query, onClear, darkMode }) {
  return (
    <div className={`rounded-3xl border border-dashed px-6 py-10 text-center ${darkMode ? 'border-slate-700' : 'border-red-100 bg-white'}`}>
      <p className="font-semibold">Aucun résultat pour « {query} »</p>
      <p className="text-sm text-slate-500 mt-1">Vérifiez l’orthographe ou essayez un autre mot (nom, date, médicament…).</p>
      {onClear && <button type="button" onClick={onClear} className="mt-4 h-10 px-4 rounded-full border border-red-200 text-red-700 text-sm font-semibold hover:bg-red-50">Effacer la recherche</button>}
    </div>
  );
}

/* ─── Registre (style « logiciel médical ») ─────────────────────────────── */

/* Panneau à coins nets avec barre de titre en petites capitales. */
export function Panel({ title, meta, actions, children, darkMode, className = '', bodyClass = '' }) {
  return (
    <section className={`rounded-xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} ${className}`}>
      {(title || actions) && (
        <header className={`flex items-center justify-between gap-3 px-4 h-11 border-b ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-baseline gap-2 min-w-0">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 truncate">{title}</h3>
            {meta != null && <span className="text-[11px] font-mono tabular-nums text-slate-400">{meta}</span>}
          </div>
          {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
        </header>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

/* Sélecteur segmenté à coins nets : options [[id, label, count?]]. */
export function Segmented({ options, value, onChange, darkMode, label }) {
  return (
    <div role="tablist" aria-label={label} className={`inline-flex max-w-full overflow-x-auto rounded-lg border p-0.5 ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
      {options.map(([id, text, count]) => {
        const active = value === id;
        return (
          <button key={id} type="button" role="tab" aria-selected={active} onClick={() => onChange(id)}
            className={`shrink-0 h-8 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${active ? 'bg-red-600 text-white' : darkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-red-50 hover:text-red-700'}`}>
            {text}
            {count != null && <span className={`font-mono tabular-nums text-[11px] ${active ? 'text-red-100' : 'text-slate-400'}`}>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* Statut sobre : petit repère carré + libellé (tone : alert | watch | neutral). */
export function StatusMark({ tone = 'neutral', children }) {
  const mark = tone === 'alert' ? 'bg-red-600' : tone === 'watch' ? 'bg-red-400' : 'bg-slate-300';
  const text = tone === 'neutral' ? 'text-slate-500' : 'text-red-700';
  return <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${text}`}><span className={`w-2 h-2 rounded-[2px] ${mark}`} aria-hidden="true" />{children}</span>;
}

/* Libellé de champ en petites capitales (fiches, documents). */
export function Label({ children }) {
  return <span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{children}</span>;
}
