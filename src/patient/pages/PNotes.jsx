import React, { useState, useEffect } from 'react';
import { StickyNote, Plus, Trash2, Save, Pencil, Star } from 'lucide-react';
import { patientApi } from '../../api/patientApi.js';
import { formatRelativeDate } from '../../utils/format.js';
import { ConfirmDialog } from '../../components/PatientModal.jsx';
import { searchableDate, useSearch, useUrlQuery } from '../../utils/search.js';
import {
  Button, Card, EmptyState, Highlight, IconButton, NoResults, PageHeader, Pills, SearchInput,
} from '../../components/patient/ui.jsx';

// Champs cherchables, du plus au moins important.
const FIELDS = (n) => [n.t, n.c, searchableDate(n.at), n.p ? 'epinglee' : ''];

export default function PNotes({ data, onReload, notify, card, sub, border, darkMode }) {
  const [ns, setNs] = useState([]);
  const [sel, setSel] = useState(null);
  const [edit, setEdit] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useUrlQuery();
  useEffect(() => {
    if (!data) return;
    const apiNotes = data.map((note) => ({
      id: note.id,
      t: note.title,
      c: note.content,
      col: note.color,
      u: formatRelativeDate(note.updatedAt),
      at: note.updatedAt,
      p: note.pinned,
    }));
    setNs(apiNotes);
    if (!sel || !apiNotes.find(n => n.id === sel.id)) setSel(apiNotes[0] || null);
  }, [data]);
  // Les codes couleur stockés sont conservés ; ils s'affichent en intensités de rouge (charte rouge et blanc).
  const cm = {
    amber:   { bar: 'bg-red-200', swatch: 'bg-white border-2 border-red-200', name: 'Repère clair' },
    blue:    { bar: 'bg-red-300', swatch: 'bg-red-100', name: 'Repère pâle' },
    emerald: { bar: 'bg-red-400', swatch: 'bg-red-300', name: 'Repère moyen' },
    red:     { bar: 'bg-red-600', swatch: 'bg-red-600', name: 'Repère vif' },
    purple:  { bar: 'bg-red-700', swatch: 'bg-red-700', name: 'Repère foncé' },
  };
  const tone = (col) => cm[col] || cm.amber;
  const found = useSearch(ns, query, FIELDS);
  // Pendant une recherche, la note affichée suit le premier résultat si elle n'en fait plus partie.
  useEffect(() => {
    if (query && found.length && !found.some(n => n.id === sel?.id)) { setSel(found[0]); setEdit(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const add = async () => {
    const created = await patientApi.createNote({ title: 'Nouvelle note', content: '', color: 'amber', pinned: false });
    const n = { id: created.id, t: created.title, c: created.content, col: created.color, u: 'À l\'instant', p: created.pinned };
    setNs([n, ...ns]); setSel(n); setEdit(true);
    onReload?.(await patientApi.notes());
  };
  const upd = async (ch) => {
    const u = { ...sel, ...ch, u: 'À l\'instant' };
    setSel(u); setNs(ns.map(n => n.id === u.id ? u : n));
    await patientApi.updateNote(u.id, { title: u.t, content: u.c, color: u.col, pinned: u.p });
    onReload?.(await patientApi.notes());
  };
  const del = async (id) => {
    try {
      await patientApi.deleteNote(id);
      const f = ns.filter(n => n.id !== id);
      setNs(f); if (sel?.id === id) setSel(f[0] || null);
      onReload?.(await patientApi.notes());
      notify?.('Note supprimée');
      setPendingDelete(null);
    } catch (error) {
      notify?.(error.message || 'Erreur suppression', 'error');
    }
  };
  const updLocal = (ch) => {
    const u = { ...sel, ...ch, u: 'À l\'instant' };
    setSel(u); setNs(ns.map(n => n.id === u.id ? u : n));
  };
  const saveNote = async () => {
    if (!sel) return;
    try {
      await patientApi.updateNote(sel.id, { title: sel.t, content: sel.c, color: sel.col, pinned: sel.p });
      onReload?.(await patientApi.notes());
      notify?.('Note enregistrée');
      setEdit(false);
    } catch (error) {
      notify?.(error.message || 'Erreur note', 'error');
    }
  };

  if (!data) {
    return (
      <div className="space-y-5">
        <PageHeader title="Bloc-notes" sub={sub} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card darkMode={darkMode} className="space-y-3">{[0, 1, 2].map(i => <div key={i} className={`animate-pulse h-16 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-red-50'}`} />)}</Card>
          <Card darkMode={darkMode} className="lg:col-span-2"><div className={`animate-pulse h-72 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-red-50'}`} /></Card>
        </div>
      </div>
    );
  }

  // Recherche puis filtre ; sans requête, les notes épinglées restent en tête (la recherche trie par pertinence).
  const filtered = filter === 'pinned' ? found.filter(n => n.p) : found;
  const sorted = query ? filtered : [...filtered].sort((a, b) => (b.p ? 1 : 0) - (a.p ? 1 : 0));
  const pinnedCount = ns.filter(n => n.p).length;
  const newNote = <Button Icon={Plus} onClick={add}>Nouvelle note</Button>;

  return (
    <div className="space-y-5">
      <PageHeader title="Bloc-notes" sub={sub} subtitle={`${ns.length} note${ns.length > 1 ? 's' : ''} personnelle${ns.length > 1 ? 's' : ''}`} actions={newNote} />

      {ns.length === 0 ? (
        <EmptyState Icon={StickyNote} title="Aucune note" darkMode={darkMode} action={newNote}>
          Notez vos symptômes, vos questions pour le médecin ou vos rappels personnels.
        </EmptyState>
      ) : (
        <>
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <SearchInput value={query} onChange={setQuery} count={sorted.length} darkMode={darkMode} className="w-full lg:max-w-md"
            placeholder="Rechercher dans vos notes…" />
          <div className="lg:ml-auto">
            <Pills darkMode={darkMode} value={filter} onChange={setFilter}
              options={[['all', 'Toutes', found.length], ['pinned', 'Épinglées', found.filter(n => n.p).length]]} />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card darkMode={darkMode} className="!p-3 self-start">
            <div className="flex items-center justify-between px-2 pt-1 pb-3">
              <p className="text-sm font-semibold">{query ? 'Résultats' : filter === 'pinned' ? 'Notes épinglées' : 'Toutes les notes'}</p>
              <span className={`text-xs ${sub}`}>{sorted.length}{!query && filter === 'all' && pinnedCount ? ` · ${pinnedCount} épinglée${pinnedCount > 1 ? 's' : ''}` : ''}</span>
            </div>
            {query && sorted.length === 0 ? (
              <NoResults query={query} onClear={() => setQuery('')} darkMode={darkMode} />
            ) : sorted.length === 0 ? (
              <p className={`text-sm px-2 pb-3 ${sub}`}>Aucune note épinglée.</p>
            ) : (
            <ul className="space-y-1.5 max-h-[32rem] overflow-y-auto">
              {sorted.map(n => {
                const active = sel?.id === n.id;
                return (
                  <li key={n.id}>
                    <button type="button" onClick={() => { setSel(n); setEdit(false); }} aria-current={active ? 'true' : undefined}
                      className={`relative w-full pl-5 pr-3 py-3 rounded-2xl text-left transition-colors overflow-hidden border ${active
                        ? (darkMode ? 'bg-red-950/30 border-red-900' : 'bg-red-50 border-red-100')
                        : (darkMode ? 'border-transparent hover:bg-slate-800/60' : 'border-transparent hover:bg-red-50/50')}`}>
                      <span className={`absolute left-2 top-3 bottom-3 w-1 rounded-full ${tone(n.col).bar}`} aria-hidden="true" />
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`font-semibold text-sm truncate ${active ? 'text-red-700' : ''}`}><Highlight text={n.t || 'Sans titre'} query={query} /></h4>
                        {n.p && <Star className="w-3.5 h-3.5 text-red-600 fill-red-600 shrink-0" aria-label="Épinglée" />}
                      </div>
                      <p className={`text-xs mt-1 line-clamp-2 whitespace-pre-line break-words ${sub}`}>{n.c ? <Highlight text={n.c} query={query} /> : 'Note vide'}</p>
                      <p className="text-[11px] mt-1.5 text-slate-400">{n.u}</p>
                    </button>
                  </li>
                );
              })}
            </ul>
            )}
          </Card>

          <Card darkMode={darkMode} className="lg:col-span-2">
            {sel ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  {edit ? (
                    <input type="text" value={sel.t} onChange={(e) => updLocal({ t: e.target.value })} aria-label="Titre de la note"
                      className={`flex-1 min-w-0 text-xl font-bold bg-transparent outline-none border-b-2 pb-1 focus:border-red-400 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`} />
                  ) : (
                    <h3 className="text-xl font-bold flex-1 min-w-0 break-words"><Highlight text={sel.t || 'Sans titre'} query={query} /></h3>
                  )}
                  <div className="flex items-center gap-2">
                    <IconButton Icon={Star} label={sel.p ? 'Désépingler la note' : 'Épingler la note'} onClick={() => upd({ p: !sel.p })} darkMode={darkMode} />
                    <IconButton Icon={edit ? Save : Pencil} label={edit ? 'Enregistrer la note' : 'Modifier la note'} tone={edit ? 'primary' : 'ghost'}
                      onClick={() => edit ? saveNote() : setEdit(true)} darkMode={darkMode} />
                    <IconButton Icon={Trash2} label="Supprimer la note" onClick={() => setPendingDelete(sel.id)} darkMode={darkMode} />
                  </div>
                </div>
                {sel.p && <p className="text-xs font-semibold text-red-700 -mt-2">Note épinglée</p>}
                {edit && (
                  <div className="flex items-center gap-2" role="radiogroup" aria-label="Repère de la note">
                    {Object.keys(cm).map(c => (
                      <button key={c} type="button" role="radio" aria-checked={sel.col === c} aria-label={cm[c].name} title={cm[c].name}
                        onClick={() => updLocal({ col: c })}
                        className={`w-7 h-7 rounded-full ${cm[c].swatch} ${sel.col === c ? `ring-2 ring-offset-2 ring-red-600 ${darkMode ? 'ring-offset-slate-900' : ''}` : ''}`} />
                    ))}
                  </div>
                )}
                <p className={`text-xs ${sub}`}>Mise à jour : {sel.u}</p>
                {edit ? (
                  <textarea value={sel.c} onChange={(e) => updLocal({ c: e.target.value })} placeholder="Écrivez…" aria-label="Contenu de la note"
                    className={`w-full min-h-[22rem] p-4 rounded-2xl border text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-400 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`} />
                ) : (
                  <div className={`relative pl-6 pr-4 py-4 rounded-2xl border min-h-[22rem] whitespace-pre-line text-sm leading-relaxed overflow-hidden ${darkMode ? 'border-slate-800' : 'border-slate-200/70'}`}>
                    <span className={`absolute left-2.5 top-4 bottom-4 w-1 rounded-full ${tone(sel.col).bar}`} aria-hidden="true" />
                    {sel.c ? <Highlight text={sel.c} query={query} /> : <span className="text-slate-400">Note vide. Cliquez sur le crayon pour écrire.</span>}
                  </div>
                )}
              </div>
            ) : (
              <EmptyState Icon={StickyNote} title="Aucune note sélectionnée" darkMode={darkMode}>Sélectionnez une note dans la liste ou créez-en une nouvelle.</EmptyState>
            )}
          </Card>
        </div>
        </>
      )}
      {pendingDelete && (
        <ConfirmDialog
          title="Supprimer la note"
          message="Cette action retirera définitivement cette note."
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => del(pendingDelete)}
          card={card}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}
