import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Calendar, ClipboardList, CornerDownLeft, FileDown, FileText, HeartPulse, History, MessageCircle,
  Microscope, Search, StickyNote, Stethoscope, Syringe, X, ArrowRight,
} from 'lucide-react';
import { patientApi } from '../api/patientApi.js';
import { ROLE_SPACES } from '../navigation.js';
import { scoreFields, searchableDate, tokenize } from '../utils/search.js';
import { Highlight } from '../components/patient/ui.jsx';

/*
 * Recherche globale de l'espace patient (Ctrl+K ou « Rechercher » dans le header).
 * Cherche à la fois dans les pages de l'application et dans les données du patient
 * (consultations, ordonnances et médicaments, analyses, vaccins, documents, notes, messages,
 * rendez-vous, médecins, pharmacies). Les données sont chargées à l'ouverture puis gardées
 * une minute ; tout est filtré dans le navigateur (rien n'est envoyé à un service tiers).
 * Choisir un résultat ouvre la page concernée déjà filtrée (?q=…).
 */
const CACHE_MS = 60_000;
const RECENT_KEY = 'nova_recent_searches';
const list = (r) => (Array.isArray(r) ? r : r?.data || []);
const day = (iso) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

// Mots-clés supplémentaires pour trouver une page par son usage (« tension » → Constantes).
const PAGE_KEYWORDS = {
  dashboard: 'accueil aujourd hui resume tableau de bord',
  history: 'historique consultations comptes rendus visites',
  dna: 'groupe sanguin allergies maladies chroniques antecedents chirurgie adn',
  vitals: 'tension glycemie pouls temperature poids mesures constantes',
  labresults: 'analyses laboratoire bilan sang resultats',
  vaccinations: 'vaccins rappels carnet vaccinal',
  documents: 'fichiers importer pdf certificats',
  notes: 'bloc notes memo',
  prescriptions: 'ordonnances medicaments qr imprimer',
  pilulier: 'prises medicaments rappels pilulier horaires',
  treatments: 'traitements suivi pathologies',
  pharmacy: 'pharmacies garde commandes',
  rdv: 'rendez vous agenda consultation reserver',
  doctors: 'medecins specialistes trouver reserver',
  messages: 'messagerie conversation ecrire medecin',
  wellness: 'bien etre objectifs imc prevention',
  privacy: 'confidentialite acces consentement revoquer journal',
  profile: 'identite coordonnees photo profil',
  family: 'famille proches contacts',
  insurance: 'assurance cmu remboursement mutuelle',
  settings: 'parametres export donnees langue notifications',
  urgence: 'sos urgence samu 185 police pompiers',
  notifications: 'notifications alertes',
  assistant: 'aide nova assistant question',
};
const EXTRA_PAGES = [
  { id: 'urgence', label: 'SOS Urgence' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'assistant', label: 'Aide NOVA' },
];

const SOURCES = [
  { key: 'history', label: 'Consultations', Icon: ClipboardList, load: patientApi.history,
    map: (h) => ({ title: h.title, subtitle: [h.doctorName, day(h.occurredAt)].filter(Boolean).join(' · '), page: 'history', fields: [h.title, h.doctorName, h.type, searchableDate(h.occurredAt)] }) },
  { key: 'prescriptions', label: 'Ordonnances et médicaments', Icon: FileDown, load: patientApi.prescriptions,
    map: (p) => {
      const meds = (p.items || []).map((i) => `${i.name} ${i.dosage || ''}`.trim()).join(', ');
      return { title: meds || 'Ordonnance', subtitle: [p.doctorName, day(p.issuedAt), p.status === 'active' ? 'active' : null].filter(Boolean).join(' · '), page: 'prescriptions', q: (p.items || [])[0]?.name,
        fields: [meds, p.doctorName, p.doctorSpecialty, p.notes, (p.items || []).map((i) => `${i.frequency || ''} ${i.instructions || ''}`).join(' '), searchableDate(p.issuedAt), 'ordonnance'] };
    } },
  { key: 'labs', label: 'Analyses', Icon: Microscope, load: patientApi.labResults,
    map: (l) => ({ title: l.title, subtitle: [l.laboratoryName, day(l.performedAt)].filter(Boolean).join(' · '), page: 'labresults', fields: [l.title, (l.items || []).map((i) => i.name).join(' '), l.laboratoryName, l.doctorName, searchableDate(l.performedAt)] }) },
  { key: 'vaccines', label: 'Vaccins', Icon: Syringe, load: patientApi.vaccinations,
    map: (v) => ({ title: v.name, subtitle: [day(v.injectedAt), v.nextDueAt ? `rappel ${day(v.nextDueAt)}` : null].filter(Boolean).join(' · '), page: 'vaccinations', fields: [v.name, 'vaccin', searchableDate(v.injectedAt), searchableDate(v.nextDueAt)] }) },
  { key: 'appointments', label: 'Rendez-vous', Icon: Calendar, load: patientApi.appointments,
    map: (a) => ({ title: a.doctorName, subtitle: [a.specialty, day(a.startsAt), a.status === 'confirmed' ? 'confirmé' : a.status === 'cancelled' ? 'annulé' : 'en attente'].filter(Boolean).join(' · '), page: 'rdv', fields: [a.doctorName, a.specialty, a.location, 'rendez vous', searchableDate(a.startsAt)] }) },
  { key: 'messages', label: 'Messages', Icon: MessageCircle, load: patientApi.conversations,
    map: (c) => ({ title: c.doctorName, subtitle: c.lastMessage, page: 'messages', fields: [c.doctorName, c.lastMessage, c.doctorSpecialty, 'message'] }) },
  { key: 'documents', label: 'Documents', Icon: FileText, load: patientApi.documents,
    map: (d) => ({ title: d.title, subtitle: [d.category, day(d.createdAt)].filter(Boolean).join(' · '), page: 'documents', fields: [d.title, d.category, searchableDate(d.createdAt)] }) },
  { key: 'notes', label: 'Mes notes', Icon: StickyNote, load: patientApi.notes,
    map: (n) => ({ title: n.title || 'Note', subtitle: String(n.content || '').slice(0, 80), page: 'notes', fields: [n.title, n.content, searchableDate(n.updatedAt)] }) },
  { key: 'treatments', label: 'Traitements', Icon: HeartPulse, load: patientApi.treatments,
    map: (t) => ({ title: t.diagnosis, subtitle: t.status, page: 'treatments', fields: [t.diagnosis, 'traitement'] }) },
  { key: 'doctors', label: 'Médecins', Icon: Stethoscope, load: patientApi.doctors,
    map: (d) => ({ title: d.fullName, subtitle: [d.specialty, d.city].filter(Boolean).join(' · '), page: 'doctors', fields: [d.fullName, d.specialty, d.subSpecialty, d.city, d.address, 'medecin docteur'] }) },
  { key: 'pharmacies', label: 'Pharmacies', Icon: Building2, load: patientApi.pharmacies,
    map: (p) => ({ title: p.name, subtitle: [p.city, p.isDuty ? 'de garde' : null].filter(Boolean).join(' · '), page: 'pharmacy', fields: [p.name, p.city, p.address, p.isDuty ? 'garde' : '', 'pharmacie'] }) },
];

function readRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').slice(0, 5); } catch { return []; }
}
function saveRecent(q) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...readRecent().filter((x) => x !== q)].slice(0, 5))); } catch { /* stockage indisponible */ }
}

export default function GlobalSearch({ darkMode }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState([]);
  const loadedAt = useRef(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();

  // Ctrl+K / Cmd+K ouvre la recherche partout dans l'espace patient.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(true); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    setActive(0);
    setTimeout(() => inputRef.current?.focus(), 0);
    if (Date.now() - loadedAt.current > CACHE_MS) {
      setLoading(true);
      Promise.allSettled(SOURCES.map((s) => s.load())).then((results) => {
        const next = {}; const ko = [];
        results.forEach((r, i) => { if (r.status === 'fulfilled') next[SOURCES[i].key] = list(r.value); else ko.push(SOURCES[i].label); });
        setData(next); setFailed(ko); setLoading(false); loadedAt.current = Date.now();
      });
    }
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [open]);

  const pages = useMemo(() => [
    ...(ROLE_SPACES.patient || []).flatMap((s) => s.pages.map((p) => ({ id: p.id, label: p.label === s.label ? p.label : `${p.label}`, space: s.label, Icon: p.Icon }))),
    ...EXTRA_PAGES.map((p) => ({ ...p, space: 'Raccourci', Icon: ArrowRight })),
  ], []);

  // Résultats groupés : pages d'abord, puis chaque source de données (5 max par groupe).
  const groups = useMemo(() => {
    const tokens = tokenize(query);
    if (!tokens.length) return [];
    const out = [];
    const pageHits = pages
      .map((p) => ({ p, s: scoreFields(tokens, [p.label, p.space, PAGE_KEYWORDS[p.id] || '']) }))
      .filter((x) => x.s).sort((a, b) => b.s - a.s).slice(0, 4)
      .map(({ p, s }) => ({ id: `page-${p.id}`, title: p.label, subtitle: p.space, page: p.id, Icon: p.Icon, score: s, isPage: true }));
    if (pageHits.length) out.push({ label: 'Pages', items: pageHits });
    for (const src of SOURCES) {
      const rows = (data[src.key] || []).map((raw, i) => ({ ...src.map(raw), id: `${src.key}-${raw.id ?? i}` }))
        .map((r) => ({ ...r, Icon: src.Icon, score: scoreFields(tokens, r.fields) }))
        .filter((r) => r.score).sort((a, b) => b.score - a.score);
      if (rows.length) out.push({ label: src.label, items: rows.slice(0, 5), total: rows.length });
    }
    return out;
  }, [query, data, pages]);
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const total = groups.reduce((n, g) => n + (g.total ?? g.items.length), 0);

  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => { listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' }); }, [active]);

  const choose = useCallback((item) => {
    if (!item) return;
    if (query.trim()) saveRecent(query.trim());
    setOpen(false); setQuery('');
    const filter = item.isPage ? '' : (item.q || item.title || '');
    navigate(`/patient/${item.page}${filter ? `?q=${encodeURIComponent(filter)}` : ''}`);
  }, [navigate, query]);

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(flat.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(flat[active]); }
  };

  const recent = open && !query ? readRecent() : [];
  const panel = darkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-red-100';
  let index = -1;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Rechercher (Ctrl+K)"
        className={`hidden md:flex items-center gap-2 h-10 w-64 lg:w-80 px-4 rounded-full border text-sm text-slate-400 ${darkMode ? 'border-slate-700 bg-slate-900 hover:border-slate-600' : 'border-slate-200 bg-white hover:border-red-300'}`}>
        <Search className="w-4 h-4" />
        <span className="flex-1 text-left">Rechercher dans mon dossier…</span>
        <kbd className="text-[11px] border border-slate-200 rounded-md px-1.5 font-sans">Ctrl K</kbd>
      </button>
      <button type="button" onClick={() => setOpen(true)} aria-label="Rechercher" className={`md:hidden p-2 rounded-lg ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-red-50'}`}>
        <Search className="w-4 h-4" />
      </button>

      {/* Portail vers <body> : le flou du header créerait sinon un contexte d'empilement sous la barre latérale. */}
      {open && createPortal(
        <div className="fixed inset-0 z-[80] bg-slate-950/40 flex items-start justify-center p-3 sm:pt-[10vh]" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-label="Recherche" className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden ${panel}`}>
            <div className={`flex items-center gap-3 px-5 h-16 border-b ${darkMode ? 'border-slate-800' : 'border-red-100'}`}>
              <Search className="w-5 h-5 text-red-600 shrink-0" />
              <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onKeyDown}
                placeholder="Médicament, médecin, analyse, date, page…" aria-label="Rechercher" role="combobox" aria-expanded={flat.length > 0}
                aria-controls="global-search-results" aria-activedescendant={flat[active] ? `gs-${flat[active].id}` : undefined}
                className="flex-1 bg-transparent text-base outline-none placeholder:text-slate-400" />
              {loading && <span className="text-xs text-slate-400">Chargement…</span>}
              <button type="button" onClick={() => setOpen(false)} aria-label="Fermer la recherche" className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50"><X className="w-4 h-4" /></button>
            </div>

            <div id="global-search-results" ref={listRef} role="listbox" className="max-h-[60vh] overflow-y-auto p-2">
              {!query && (
                <div className="p-3 space-y-4">
                  {recent.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Recherches récentes</p>
                      <div className="flex flex-wrap gap-1.5">{recent.map((r) => <button key={r} type="button" onClick={() => setQuery(r)} className="px-3 py-1.5 rounded-full border border-red-100 text-xs font-medium hover:bg-red-50">{r}</button>)}</div>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-2">Exemples</p>
                    <div className="flex flex-wrap gap-1.5">{['amoxicilline', 'tension', 'octobre 2026', 'vaccin', 'pharmacie de garde', 'cardiologie'].map((r) => <button key={r} type="button" onClick={() => setQuery(r)} className="px-3 py-1.5 rounded-full bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100">{r}</button>)}</div>
                  </div>
                  <p className="text-xs text-slate-400">Astuce : plusieurs mots affinent la recherche (« kouassi ordonnance »). Les accents ne sont pas nécessaires.</p>
                </div>
              )}
              {query && !loading && flat.length === 0 && (
                <div className="px-4 py-10 text-center">
                  <p className="font-semibold">Aucun résultat pour « {query} »</p>
                  <p className="text-sm text-slate-500 mt-1">Essayez un nom de médecin, un médicament, une date (« mars 2019 ») ou une page.</p>
                </div>
              )}
              {groups.map((g) => (
                <div key={g.label} className="mb-2" role="group" aria-label={g.label}>
                  <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 flex justify-between">
                    <span>{g.label}</span>{g.total > g.items.length && <span className="normal-case tracking-normal">{g.total} au total</span>}
                  </p>
                  {g.items.map((it) => {
                    index += 1;
                    const isActive = index === active;
                    const i = index;
                    return (
                      <button key={it.id} id={`gs-${it.id}`} type="button" role="option" aria-selected={isActive} data-active={isActive}
                        onMouseEnter={() => setActive(i)} onClick={() => choose(it)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left ${isActive ? (darkMode ? 'bg-slate-800' : 'bg-red-50') : ''}`}>
                        <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isActive ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600'}`}><it.Icon className="w-4 h-4" /></span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold truncate"><Highlight text={it.title} query={query} /></span>
                          {it.subtitle && <span className="block text-xs text-slate-500 truncate"><Highlight text={it.subtitle} query={query} /></span>}
                        </span>
                        {isActive && <CornerDownLeft className="w-4 h-4 text-red-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className={`flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 border-t text-[11px] text-slate-400 ${darkMode ? 'border-slate-800' : 'border-red-100'}`}>
              <span>{query ? `${total} résultat${total > 1 ? 's' : ''}` : 'Pages, soins, documents, médecins et pharmacies'}{failed.length ? ` · indisponible : ${failed.join(', ')}` : ''}</span>
              <span className="hidden sm:inline">↑ ↓ pour naviguer · Entrée pour ouvrir · Échap pour fermer</span>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
