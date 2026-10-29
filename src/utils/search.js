import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/*
 * Recherche plein texte côté navigateur (espace patient).
 * - insensible aux accents, à la casse et à la ponctuation : « fievre » trouve « Fièvre jaune » ;
 * - plusieurs mots = tous doivent être présents (dans un ou plusieurs champs) : « kouassi ordonnance » ;
 * - classement : correspondance exacte > début de champ > début de mot > ailleurs, pondéré par le champ
 *   (le premier champ, souvent le titre, compte le plus) ;
 * - les dates sont aussi cherchables sous leur forme lisible (« octobre 2026 », « 12/03/2019 »).
 */
export function normalize(value) {
  return String(value ?? '')
    .normalize('NFD').replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[’'`\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(query) {
  return normalize(query).split(' ').filter(Boolean);
}

// Rend une date ISO cherchable : « 12 mars 2019 12/03/2019 2019-03-12 ».
export function searchableDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const long = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
  const short = d.toLocaleDateString('fr-FR');
  return `${long} ${short} ${String(iso).slice(0, 10)}`;
}

/* Score d'un élément pour une requête (0 = ne correspond pas). fields : chaînes, du plus au moins important. */
export function scoreFields(tokens, fields) {
  if (!tokens.length) return 1;
  const norm = fields.map(normalize);
  let total = 0;
  for (const t of tokens) {
    let best = 0;
    norm.forEach((f, i) => {
      if (!f) return;
      const weight = Math.max(1, 4 - i); // titre ×4, puis ×3, ×2, ×1…
      let s = 0;
      if (f === t) s = 10;
      else if (f.startsWith(t)) s = 7;
      else if (f.includes(` ${t}`)) s = 5;
      else if (f.includes(t)) s = 2;
      else if (t.length > 2 && f.replace(/[^a-z0-9]/g, '').includes(t)) s = 1; // « nguessan » → « N’Guessan »
      best = Math.max(best, s * weight);
    });
    if (!best) return 0;
    total += best;
  }
  return total;
}

/* Filtre et trie une liste. getFields(item) → tableau de chaînes. Liste vide de requête = liste d'origine. */
export function searchItems(items, query, getFields) {
  const tokens = tokenize(query);
  if (!tokens.length) return items;
  return items
    .map((item, index) => ({ item, index, score: scoreFields(tokens, getFields(item)) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((r) => r.item);
}

export function useSearch(items, query, getFields) {
  // getFields est une fonction stable par page (définie hors rendu ou mémorisée).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => searchItems(Array.isArray(items) ? items : [], query, getFields), [items, query]);
}

/* Requête liée à l'URL (?q=…) : partageable, conservée à l'actualisation, remplie par la recherche globale. */
export function useUrlQuery() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '';
  const setQuery = (value) => {
    const next = new URLSearchParams(params);
    if (value) next.set('q', value); else next.delete('q');
    setParams(next, { replace: true });
  };
  return [query, setQuery];
}

/* Découpe un texte en segments [texte, surligné?] selon les mots de la requête (pour <Highlight>). */
export function highlightParts(text, query) {
  const source = String(text ?? '');
  const tokens = tokenize(query).filter((t) => t.length > 1 || tokenize(query).length === 1);
  if (!tokens.length || !source) return [[source, false]];
  // Correspondance sur la version sans accents, en conservant les index du texte d'origine.
  const chars = [...source];
  const folded = chars.map((ch) => normalize(ch).slice(0, 1) || ' ');
  const flat = folded.join('');
  const marks = new Array(chars.length).fill(false);
  for (const t of tokens) {
    let from = 0;
    for (;;) {
      const at = flat.indexOf(t, from);
      if (at < 0) break;
      for (let i = at; i < at + t.length && i < marks.length; i++) marks[i] = true;
      from = at + t.length;
    }
  }
  const parts = [];
  let current = '';
  let state = marks[0];
  chars.forEach((ch, i) => {
    if (marks[i] !== state) { parts.push([current, state]); current = ''; state = marks[i]; }
    current += ch;
  });
  parts.push([current, state]);
  return parts;
}
