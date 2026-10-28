import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/* Kit commun des tableaux de bord NOVA (rouge et blanc) : en-tête, cartes, calendriers,
   graphiques. Chaque composant reçoit `darkMode` et les classes de thème `card` / `sub`. */

export const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const DAYS_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
export const dayKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
export const fmtTime = (iso) => (iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—');
export const fmtDay = (iso) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const initialsOf = (name = '') => name.replace(/^Dr\.?\s*/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

function useMounted() {
  const [shown, setShown] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(id); }, []);
  return shown;
}

/* ── Structure ─────────────────────────────────────────── */

export function DashHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, subtitle, action, children, card, sub, className = '' }) {
  return (
    <section className={`${card} border rounded-2xl p-5 ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            {title && <h3 className="font-bold">{title}</h3>}
            {subtitle && <p className={`text-xs mt-0.5 ${sub}`}>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function LinkButton({ children, onClick }) {
  return <button type="button" onClick={onClick} className="text-xs font-semibold text-red-600 hover:text-red-700 whitespace-nowrap">{children}</button>;
}

export function PrimaryButton({ children, onClick, Icon }) {
  return (
    <button type="button" onClick={onClick} className="min-h-11 px-4 rounded-xl bg-red-600 text-white text-sm font-semibold flex items-center gap-2 hover:bg-red-700 shadow-sm shadow-red-600/20 transition-colors">
      {Icon && <Icon className="w-4 h-4" />} {children}
    </button>
  );
}

export function GhostButton({ children, onClick, Icon, darkMode, title }) {
  return (
    <button type="button" onClick={onClick} title={title} className={`min-h-11 px-4 rounded-xl border text-sm font-semibold flex items-center gap-2 transition-colors ${darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
      {Icon && <Icon className="w-4 h-4" />} {children}
    </button>
  );
}

/* ── Indicateurs ───────────────────────────────────────── */

export function KpiCard({ label, value, unit, Icon, hint, chip, chipTone = 'neutral', onClick, card, sub }) {
  const tones = {
    good: 'bg-emerald-50 text-emerald-700', warn: 'bg-amber-50 text-amber-700',
    bad: 'bg-red-50 text-red-700', neutral: 'bg-slate-100 text-slate-600',
  };
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick}
      className={`${card} border rounded-2xl p-5 text-left ${onClick ? 'hover:shadow-md hover:-translate-y-0.5 transition-all' : ''}`}>
      <div className="flex items-center gap-2.5">
        {Icon && <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0"><Icon className="w-4 h-4" /></span>}
        <p className="min-w-0 text-[13px] sm:text-sm font-semibold leading-tight line-clamp-2 hyphens-auto" lang="fr">{label}</p>
      </div>
      <p className="text-3xl font-bold leading-none mt-4 whitespace-nowrap">
        {value ?? '—'}{unit && <span className={`text-sm font-medium ml-1 ${sub}`}>{unit}</span>}
      </p>
      {(hint || chip) && (
        <div className="flex items-center justify-between gap-2 mt-3 flex-wrap">
          {hint && <p className={`text-xs ${sub}`}>{hint}</p>}
          {chip && <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${tones[chipTone]}`}>{chip}</span>}
        </div>
      )}
    </Tag>
  );
}

export function StatusChip({ status }) {
  const map = {
    confirmed: ['Confirmé', 'bg-emerald-50 text-emerald-700'],
    requested: ['En attente', 'bg-amber-50 text-amber-700'],
    completed: ['Terminé', 'bg-slate-100 text-slate-600'],
    cancelled: ['Annulé', 'bg-red-50 text-red-700'],
    in_progress: ['En cours', 'bg-blue-50 text-blue-700'],
    full: ['Complète', 'bg-emerald-50 text-emerald-700'],
    partial: ['Partielle', 'bg-amber-50 text-amber-700'],
    refused: ['Refusée', 'bg-red-50 text-red-700'],
    draft: ['Brouillon', 'bg-slate-100 text-slate-600'],
  };
  const [label, cls] = map[status] || [status || '—', 'bg-slate-100 text-slate-600'];
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${cls}`}>{label}</span>;
}

export function Avatar({ name, size = 'md' }) {
  const s = size === 'lg' ? 'w-12 h-12 text-sm' : size === 'sm' ? 'w-8 h-8 text-[11px]' : 'w-10 h-10 text-xs';
  return <span className={`${s} shrink-0 rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center font-bold`}>{initialsOf(name)}</span>;
}

export function Empty({ children, sub }) {
  return <p className={`text-sm py-6 text-center ${sub}`}>{children}</p>;
}

/** Sélecteur segmenté (maquette « Week / Month / Year »). */
export function Segmented({ options, value, onChange, darkMode }) {
  return (
    <div className={`inline-flex p-0.5 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`} role="group">
      {options.map(([id, label]) => (
        <button key={id} type="button" onClick={() => onChange(id)} aria-pressed={value === id}
          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${value === id ? 'bg-red-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

export const PERIODS = [['week', 'Semaine'], ['month', 'Mois'], ['half', '6 mois']];
export const PERIOD_TEXT = { week: 'sur les 7 derniers jours', month: 'sur les 4 dernières semaines', half: 'sur les 6 derniers mois' };

/** Regroupe des dates en colonnes selon la période : 7 jours, 4 semaines ou 6 mois. */
export function bucketize(dates, period) {
  const now = new Date();
  if (period === 'half') {
    return Array.from({ length: 6 }, (_, i) => {
      const m = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = `${m.getFullYear()}-${m.getMonth()}`;
      return {
        label: MONTHS[m.getMonth()].slice(0, 4), full: `${MONTHS[m.getMonth()]} ${m.getFullYear()}`,
        value: dates.filter((d) => { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth()}` === key; }).length,
      };
    });
  }
  if (period === 'month') {
    return Array.from({ length: 4 }, (_, i) => {
      const end = new Date(now); end.setHours(23, 59, 59, 999); end.setDate(end.getDate() - (3 - i) * 7);
      const start = new Date(end); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0);
      return {
        label: `${start.getDate()}/${start.getMonth() + 1}`,
        full: `Semaine du ${start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`,
        value: dates.filter((d) => { const x = new Date(d); return x >= start && x <= end; }).length,
      };
    });
  }
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now); d.setDate(d.getDate() - (6 - i));
    const k = dayKey(d);
    return {
      label: d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', ''),
      full: d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
      value: dates.filter((x) => dayKey(x) === k).length,
    };
  });
}

/* ── Calendriers ───────────────────────────────────────── */

/** Bandeau de jours (maquette « Checkup schedule ») : jour choisi en rouge, point sous les jours occupés. */
export function WeekStrip({ start, days = 11, selected, onSelect, marked = new Set(), darkMode }) {
  const today = dayKey(new Date());
  const list = Array.from({ length: days }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${days}, minmax(2.75rem, 1fr))` }}>
      {list.map((d) => {
        const k = dayKey(d);
        const active = k === selected;
        return (
          <button key={k} type="button" onClick={() => onSelect(k)} aria-pressed={active}
            className={`rounded-xl border py-2 flex flex-col items-center gap-1 transition-colors ${active
              ? 'border-red-600 bg-red-50 text-red-700'
              : darkMode ? 'border-slate-700 hover:border-slate-500' : 'border-slate-200 hover:border-red-300'}`}>
            <span className={`text-[11px] ${active ? 'text-red-600' : 'text-slate-400'}`}>{DAYS_SHORT[d.getDay()]}</span>
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${active ? 'bg-red-600 text-white' : k === today ? 'text-red-600' : ''}`}>{d.getDate()}</span>
            <span className={`w-1.5 h-1.5 rounded-full ${marked.has(k) ? 'bg-red-500' : 'bg-transparent'}`} />
          </button>
        );
      })}
    </div>
  );
}

/** Mini-calendrier mensuel : aujourd'hui en rouge plein, jours marqués d'un point. */
export function MiniCalendar({ marked = new Set(), selected, onSelect, darkMode }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const today = dayKey(new Date());
  const cells = useMemo(() => {
    const first = new Date(cursor);
    const offset = (first.getDay() + 6) % 7; // semaine du lundi
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(first); d.setDate(1 - offset + i); return d; });
  }, [cursor]);
  const move = (n) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1));
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={() => move(-1)} aria-label="Mois précédent" className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}><ChevronLeft className="w-4 h-4" /></button>
        <p className="text-sm font-bold capitalize">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</p>
        <button type="button" onClick={() => move(1)} aria-label="Mois suivant" className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}><ChevronRight className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] text-slate-400 mb-1">{['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'].map((d) => <span key={d}>{d}</span>)}</div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {cells.map((d) => {
          const k = dayKey(d);
          const outside = d.getMonth() !== cursor.getMonth();
          const isToday = k === today;
          const isSel = k === selected;
          return (
            <button key={k} type="button" onClick={() => onSelect?.(k)} disabled={!onSelect}
              className={`relative mx-auto w-8 h-8 rounded-full text-xs font-medium flex items-center justify-center ${outside ? 'text-slate-300' : ''} ${isToday ? 'bg-red-600 text-white font-bold' : isSel ? 'ring-2 ring-red-500 text-red-600' : onSelect ? (darkMode ? 'hover:bg-slate-800' : 'hover:bg-red-50') : ''}`}>
              {d.getDate()}
              {marked.has(k) && !isToday && <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-red-500" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Graphiques ────────────────────────────────────────── */

export function niceTicks(max, integer = true) {
  // Comptages : graduations entières (jamais 0,5 consultation).
  const raw = Math.max(integer ? 4 : 1, max) / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = Math.max(integer ? 1 : 0, [1, 2, 5, 10].map((m) => m * pow).find((v) => v >= raw));
  const top = Math.ceil(Math.max(1, max) / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => +(i * step).toFixed(6));
}

/** Colonnes animées : axe et grille discrets, valeur au sommet, info-bulle au survol. */
export function ColumnChart({ data, valueLabel = 'valeur', format = (v) => v, height = '14rem', darkMode, showValues = true }) {
  const shown = useMounted();
  const [hover, setHover] = useState(null);
  const ticks = niceTicks(Math.max(0, ...data.map((d) => d.value)));
  const top = ticks[ticks.length - 1];
  const total = data.reduce((s, d) => s + d.value, 0);
  const grid = darkMode ? 'border-slate-800' : 'border-slate-200';
  const fill = darkMode ? 'bg-red-500' : 'bg-red-600';
  const fade = darkMode ? 'bg-red-500/35' : 'bg-red-600/35';
  return (
    <div>
      <div className="flex gap-3 pt-5" style={{ height }}>
        <div className="relative w-8 text-[11px] tabular-nums text-slate-400" aria-hidden="true">
          {ticks.map((t) => <span key={t} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${(t / top) * 100}%` }}>{format(t)}</span>)}
        </div>
        <div className="relative flex-1">
          {ticks.map((t) => <div key={t} className={`absolute inset-x-0 border-t ${grid}`} style={{ bottom: `${(t / top) * 100}%` }} aria-hidden="true" />)}
          <div className="absolute inset-0 flex items-end justify-around">
            {data.map((d, i) => {
              const pct = (d.value / top) * 100;
              const active = hover === i;
              return (
                <button key={d.label} type="button" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                  aria-label={`${d.label} : ${format(d.value)} ${valueLabel}`} className="relative h-full flex-1 max-w-[6rem] flex items-end justify-center outline-none">
                  <span className={`relative w-6 rounded-t-[4px] transition-[height,background-color] duration-700 ease-out motion-reduce:transition-none ${hover !== null && !active ? fade : fill}`}
                    style={{ height: shown ? `${pct}%` : '0%', transitionDelay: shown ? `${i * 60}ms` : '0ms' }}>
                    {showValues && d.value > 0 && <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 text-xs font-semibold tabular-nums">{format(d.value)}</span>}
                  </span>
                  {active && (
                    <span role="tooltip" className={`absolute z-10 translate-y-1/2 px-3 py-2 rounded-lg shadow-lg text-xs text-left whitespace-nowrap pointer-events-none ${darkMode ? 'bg-slate-100 text-slate-900' : 'bg-slate-900 text-white'}`}
                      style={{ bottom: `${Math.max(pct, 12)}%`, ...(i >= data.length - 2 ? { right: 'calc(50% + 1rem)' } : { left: 'calc(50% + 1rem)' }) }}>
                      <span className="font-semibold">{d.full || d.label}</span><br />
                      {format(d.value)} {valueLabel}{total ? ` · ${Math.round((d.value / total) * 100)} %` : ''}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="flex gap-3 mt-2">
        <div className="w-8" />
        <div className="flex-1 flex justify-around">{data.map((d) => <span key={d.label} className="flex-1 max-w-[6rem] text-center text-[11px] text-slate-500 truncate">{d.label}</span>)}</div>
      </div>
      <table className="sr-only"><tbody>{data.map((d) => <tr key={d.label}><td>{d.full || d.label}</td><td>{format(d.value)}</td></tr>)}</tbody></table>
    </div>
  );
}

/** Courbe lissée avec aire légère, réticule et info-bulle au survol, tracé animé à l'apparition. */
export function LineChart({ data, valueLabel = '', format = (v) => v, height = 200, darkMode, min }) {
  const shown = useMounted();
  const [hover, setHover] = useState(null);
  if (data.length < 2) return <Empty sub="text-slate-500">Pas encore assez de mesures pour tracer une courbe.</Empty>;
  const W = 600; const H = height; const padL = 34; const padB = 22; const padT = 12;
  const values = data.map((d) => d.value);
  // Axe partant de zéro (comptages) : graduations entières « propres » ; sinon axe resserré autour des valeurs.
  const zeroBased = min === 0;
  const ticks = niceTicks(zeroBased ? Math.max(...values) : Math.max(...values) - Math.min(...values));
  const yMin = zeroBased ? 0 : Math.max(0, Math.floor(Math.min(...values) - (ticks[1] || 1)));
  const yMax = zeroBased ? ticks[ticks.length - 1] : Math.max(...values) + (ticks[1] || 1) * 0.5;
  const x = (i) => padL + (i / (data.length - 1)) * (W - padL - 8);
  const y = (v) => padT + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - padT - padB);
  const pts = data.map((d, i) => [x(i), y(d.value)]);
  const path = pts.reduce((acc, [px, py], i) => {
    if (!i) return `M${px},${py}`;
    const [qx, qy] = pts[i - 1];
    const cx = (qx + px) / 2;
    return `${acc} C${cx},${qy} ${cx},${py} ${px},${py}`;
  }, '');
  const area = `${path} L${pts[pts.length - 1][0]},${H - padB} L${pts[0][0]},${H - padB} Z`;
  const yTicks = zeroBased ? ticks : [0, 0.5, 1].map((f) => yMin + f * (yMax - yMin));
  const stroke = darkMode ? '#ef4444' : '#dc2626';
  const gridC = darkMode ? '#1e293b' : '#e2e8f0';
  const labelStep = Math.ceil(data.length / 6);
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Courbe : ${valueLabel}`}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const rel = ((e.clientX - r.left) / r.width) * W;
          setHover(Math.max(0, Math.min(data.length - 1, Math.round(((rel - padL) / (W - padL - 8)) * (data.length - 1)))));
        }}>
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - 8} y1={y(t)} y2={y(t)} stroke={gridC} strokeWidth="1" />
            <text x={padL - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill="#94a3b8">{format(Math.round(t * 10) / 10)}</text>
          </g>
        ))}
        <path d={area} fill={stroke} opacity={shown ? 0.1 : 0} style={{ transition: 'opacity 700ms ease' }} />
        <path d={path} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          pathLength="1" strokeDasharray="1" strokeDashoffset={shown ? 0 : 1} style={{ transition: 'stroke-dashoffset 1100ms ease-out' }} />
        {data.map((d, i) => i % labelStep === 0 && <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="#94a3b8">{d.label}</text>)}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={padT} y2={H - padB} stroke="#94a3b8" strokeWidth="1" />
            <circle cx={x(hover)} cy={y(data[hover].value)} r="5" fill={stroke} stroke={darkMode ? '#0f172a' : '#fff'} strokeWidth="2" />
          </g>
        )}
        <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="4" fill={stroke} stroke={darkMode ? '#0f172a' : '#fff'} strokeWidth="2" />
      </svg>
      {hover !== null && (
        <div role="tooltip" className={`absolute top-0 px-3 py-2 rounded-lg shadow-lg text-xs pointer-events-none whitespace-nowrap ${darkMode ? 'bg-slate-100 text-slate-900' : 'bg-slate-900 text-white'}`}
          style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > data.length / 2 ? 'calc(-100% - 8px)' : '8px'})` }}>
          <span className="font-semibold">{data[hover].full || data[hover].label}</span><br />{format(data[hover].value)} {valueLabel}
        </div>
      )}
    </div>
  );
}

/** Jauge circulaire (score) animée. */
export function RingGauge({ value, max = 100, label, caption, darkMode }) {
  const shown = useMounted();
  const r = 52; const c = 2 * Math.PI * r;
  const pct = Number.isFinite(Number(value)) ? Math.max(0, Math.min(1, Number(value) / max)) : 0;
  return (
    <div className="relative w-44 h-44 mx-auto">
      <div className={`absolute -inset-3 rounded-full ${darkMode ? 'bg-red-950/40' : 'bg-red-50'} animate-[pulse_3s_ease-in-out_infinite] motion-reduce:animate-none`} aria-hidden="true" />
      <svg viewBox="0 0 120 120" className="relative w-full h-full -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={r} fill={darkMode ? '#0f172a' : '#fff'} stroke={darkMode ? '#1e293b' : '#fee2e2'} strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke="#dc2626" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={shown ? c * (1 - pct) : c} style={{ transition: 'stroke-dashoffset 1200ms ease-out' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-4xl font-bold leading-none">{value ?? '—'}</span>
        <span className="text-xs text-slate-500 mt-1">{label}</span>
        {caption && <span className="text-[11px] font-bold text-red-600 mt-0.5">{caption}</span>}
      </div>
    </div>
  );
}
