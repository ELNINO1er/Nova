import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit3, Trash2, X, UserPlus, Calendar, Smartphone, Mail } from 'lucide-react';
import { patientApi } from '../../api/patientApi.js';
import { ConfirmDialog } from '../../components/PatientModal.jsx';
import { searchableDate, useSearch, useUrlQuery } from '../../utils/search.js';
import { Avatar, Button, Card, Chip, DataTable, EmptyState, Highlight, IconButton, NoResults, PageHeader, SearchInput, inputClass } from '../../components/patient/ui.jsx';

/* Codes enregistrés par l'API (nova_family_members.relationship) et leurs libellés. */
const REL_OPTIONS = [['spouse', 'Conjoint(e)'], ['parent', 'Parent'], ['child', 'Enfant'], ['sibling', 'Frère / sœur'], ['other', 'Autre']];
const REL_LABELS = Object.fromEntries(REL_OPTIONS);
const relLabel = (r) => REL_LABELS[r] || r;

const fullName = (m) => `${m.firstName || ''} ${m.lastName || ''}`.trim();
const fmtBirth = (v) => (v ? new Date(v).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : null);
const ageOf = (v) => (v ? Math.floor((Date.now() - new Date(v).getTime()) / 31557600000) : null);
/* Champs cherchables d'un membre, du plus au moins important. */
const FAMILY_FIELDS = (m) => [fullName(m), relLabel(m.relationship), m.phone, m.email, searchableDate(m.birthDate), m.notes];

const emptyForm = { firstName: '', lastName: '', relationship: 'spouse', birthDate: '', notes: '' };

export default function PFamily({ data, onReload, notify, card, sub, darkMode }) {
  const [members, setMembers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [query, setQuery] = useUrlQuery();
  const results = useSearch(members, query, FAMILY_FIELDS);

  useEffect(() => {
    if (!data) return;
    setMembers(Array.isArray(data) ? data : []);
  }, [data]);

  const resetForm = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
  };

  const openEdit = (m) => {
    setEditingId(m.id);
    setForm({
      firstName: m.firstName || '',
      lastName: m.lastName || '',
      relationship: REL_LABELS[m.relationship] ? m.relationship : 'other',
      birthDate: m.birthDate ? m.birthDate.slice(0, 10) : '',
      notes: m.notes || '',
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      notify?.('Veuillez remplir le nom et le prénom', 'error');
      return;
    }
    // Champs vides non envoyés : une date vide serait refusée par la colonne DATE.
    const payload = { ...form, firstName: form.firstName.trim(), lastName: form.lastName.trim(), birthDate: form.birthDate || undefined, notes: form.notes?.trim() || undefined };
    try {
      if (editingId) {
        await patientApi.updateFamilyMember(editingId, payload);
      } else {
        await patientApi.createFamilyMember(payload);
      }
      onReload?.(await patientApi.familyMembers());
      notify?.(editingId ? 'Membre modifié' : 'Membre ajouté');
      setShowForm(false);
      resetForm();
    } catch (error) {
      notify?.(error.message || 'Erreur', 'error');
    }
  };

  const del = async (id) => {
    try {
      await patientApi.deleteFamilyMember(id);
      onReload?.(await patientApi.familyMembers());
      notify?.('Membre supprimé');
      setPendingDelete(null);
    } catch (error) {
      notify?.(error.message || 'Erreur suppression', 'error');
    }
  };

  const closeForm = () => { setShowForm(false); resetForm(); };
  const fieldCls = inputClass(darkMode);
  const labelCls = 'block text-xs font-medium text-slate-500 space-y-1';

  if (!data) {
    return (
      <div className="space-y-5">
        <PageHeader title="Contacts familiaux" sub={sub} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[0, 1].map(i => (
            <Card key={i} darkMode={darkMode}><div className={`animate-pulse h-20 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-red-50'}`} /></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Contacts familiaux"
        subtitle={`${members.length} membre${members.length > 1 ? 's' : ''} · Ces contacts n’accordent aucun accès à leur dossier. La délégation médicale n’est pas disponible.`}
        sub={sub}
        actions={<Button Icon={Plus} darkMode={darkMode} onClick={() => { resetForm(); setShowForm(true); }}>Ajouter un membre</Button>}
      />

      {showForm && (
        <>
          <button type="button" className="fixed inset-0 z-40 bg-slate-950/45" onClick={closeForm} aria-label="Fermer"></button>
          <div role="dialog" aria-modal="true" aria-labelledby="family-form-title"
            className={`fixed z-50 left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto -translate-x-1/2 -translate-y-1/2 rounded-3xl border p-6 shadow-2xl ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/70'}`}>
            <div className="flex items-center justify-between gap-3 mb-5">
              <h3 id="family-form-title" className="font-semibold flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-red-600" />
                {editingId ? 'Modifier le membre' : 'Nouveau membre'}
              </h3>
              <IconButton Icon={X} label="Fermer" darkMode={darkMode} onClick={closeForm} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className={labelCls}><span>Prénom</span>
                <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="Prénom" className={fieldCls} />
              </label>
              <label className={labelCls}><span>Nom</span>
                <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="Nom" className={fieldCls} />
              </label>
              <label className={labelCls}><span>Lien</span>
                <select value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} className={fieldCls}>
                  {REL_OPTIONS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                </select>
              </label>
              <label className={labelCls}><span>Date de naissance</span>
                <input type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} className={fieldCls} />
              </label>
              <label className={`${labelCls} sm:col-span-2`}><span>Notes (optionnel)</span>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes (optionnel)" rows={3} className={`${fieldCls} h-auto py-3 resize-none`} />
              </label>
              <div className="sm:col-span-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
                <Button variant="secondary" darkMode={darkMode} onClick={closeForm}>Annuler</Button>
                <Button darkMode={darkMode} onClick={save}>{editingId ? 'Modifier' : 'Ajouter'}</Button>
              </div>
            </div>
          </div>
        </>
      )}

      {members.length === 0 ? (
        <EmptyState Icon={Users} title="Aucun membre familial" darkMode={darkMode}
          action={<Button Icon={Plus} variant="secondary" darkMode={darkMode} onClick={() => { resetForm(); setShowForm(true); }}>Ajouter un membre</Button>}>
          Ajoutez des membres de votre famille pour un meilleur suivi médical.
        </EmptyState>
      ) : (
        <Card darkMode={darkMode} className="!p-0 overflow-hidden">
          <div className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold">Membres</h3>
              <p className={`text-xs mt-0.5 ${sub}`}>{query ? `${results.length} sur ${members.length}` : `${members.length} au total`}</p>
            </div>
            <SearchInput value={query} onChange={setQuery} count={results.length} darkMode={darkMode} className="w-full sm:w-80"
              placeholder="Nom, lien, date de naissance, notes…" label="Rechercher un membre" />
          </div>

          {results.length === 0 ? (
            <div className="p-4 sm:p-5"><NoResults query={query} onClear={() => setQuery('')} darkMode={darkMode} /></div>
          ) : (
            <>
              {/* Tableau (écran large) */}
              <div className="hidden md:block">
                <DataTable
                  darkMode={darkMode}
                  columns={['Membre', 'Lien', 'Naissance', <span key="ops" className="sr-only">Actions</span>]}
                  rows={results.map((m) => [
                    <span key="n" className="flex items-center gap-3 min-w-0">
                      <Avatar name={fullName(m)} />
                      <span className="min-w-0">
                        <span className="block font-semibold truncate"><Highlight text={fullName(m)} query={query} /></span>
                        {m.notes && <span className={`block text-xs font-normal truncate max-w-[16rem] ${sub}`}><Highlight text={m.notes} query={query} /></span>}
                      </span>
                    </span>,
                    <Chip key="r" tone="watch"><Highlight text={relLabel(m.relationship)} query={query} /></Chip>,
                    m.birthDate ? <span key="b">{fmtBirth(m.birthDate)}{ageOf(m.birthDate) != null && <span className="block text-xs">{ageOf(m.birthDate)} ans</span>}</span> : '—',
                    <span key="a" className="flex justify-end gap-1.5">
                      <IconButton Icon={Edit3} label={`Modifier ${fullName(m)}`} darkMode={darkMode} onClick={() => openEdit(m)} />
                      <IconButton Icon={Trash2} label={`Supprimer ${fullName(m)}`} darkMode={darkMode} onClick={() => setPendingDelete(m.id)} />
                    </span>,
                  ])}
                />
              </div>

              {/* Cartes (mobile) */}
              <ul className="md:hidden">
                {results.map((m, i) => (
                  <li key={m.id} className={`p-4 ${i ? `border-t ${darkMode ? 'border-slate-800' : 'border-slate-100'}` : ''}`}>
                    <div className="flex items-start gap-3">
                      <Avatar name={fullName(m)} size="lg" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold break-words"><Highlight text={fullName(m)} query={query} /></p>
                        <div className="mt-1.5"><Chip tone="watch"><Highlight text={relLabel(m.relationship)} query={query} /></Chip></div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <IconButton Icon={Edit3} label={`Modifier ${fullName(m)}`} darkMode={darkMode} onClick={() => openEdit(m)} />
                        <IconButton Icon={Trash2} label={`Supprimer ${fullName(m)}`} darkMode={darkMode} onClick={() => setPendingDelete(m.id)} />
                      </div>
                    </div>
                    <dl className={`mt-3 space-y-1.5 text-xs ${sub}`}>
                      {m.birthDate && <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 shrink-0" /> Né(e) le {fmtBirth(m.birthDate)}</div>}
                      {m.phone && <div className="flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5 shrink-0" /><Highlight text={m.phone} query={query} /></div>}
                      {m.email && <div className="flex items-center gap-1.5 min-w-0"><Mail className="w-3.5 h-3.5 shrink-0" /><span className="break-all"><Highlight text={m.email} query={query} /></span></div>}
                    </dl>
                    {m.notes && <p className={`text-sm mt-2 line-clamp-2 ${sub}`}><Highlight text={m.notes} query={query} /></p>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Supprimer le membre"
          message="Cette action retirera définitivement ce membre de votre liste familiale."
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => del(pendingDelete)}
          card={card}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}
