import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, HeartPulse, Plus, Stethoscope, Users, X } from 'lucide-react';
import { patientApi } from '../../api/patientApi.js';
import { useSearch, useUrlQuery } from '../../utils/search.js';
import {
  Button, Highlight, Label, NoResults, PageHeader, Panel, SearchInput, Segmented, inputClass,
} from '../../components/patient/ui.jsx';

/*
 * ADN médical : fiche structurée.
 * 1. Bande d'identité médicale (groupe sanguin, âge, sexe, taille, poids, IMC).
 * 2. Tableau des antécédents : une ligne par rubrique, éléments en liste, ajout dans la ligne.
 * Le profil est chargé ici s'il n'a pas été transmis (accès direct à la page).
 */
const SECTIONS = [
  { key: 'allergies', label: 'Allergies', hint: 'Médicaments, aliments, autres', Icon: AlertTriangle, critical: true },
  { key: 'chronicDiseases', label: 'Maladies chroniques', hint: 'Pathologies suivies au long cours', Icon: HeartPulse },
  { key: 'familyHistory', label: 'Antécédents familiaux', hint: 'Parents, fratrie', Icon: Users },
  { key: 'surgicalHistory', label: 'Historique chirurgical', hint: 'Interventions et année', Icon: Stethoscope },
];
const EMPTY_PROFILE = { allergies: [], chronicDiseases: [], familyHistory: [], surgicalHistory: [] };
const FIELDS = (t) => [t.item, t.label];

const ageOf = (birth) => {
  if (!birth) return null;
  const d = new Date(birth);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) a -= 1;
  return a;
};
const sexLabel = (s) => (s === 'M' || s === 'male' ? 'Homme' : s === 'F' || s === 'female' ? 'Femme' : null);

export default function PDNA({ data, profile: profileProp, onReload, notify, sub, darkMode }) {
  const [profile, setProfile] = useState(profileProp || null);
  const [editing, setEditing] = useState(null);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState('all');
  const [query, setQuery] = useUrlQuery();

  useEffect(() => {
    if (profileProp) { setProfile(profileProp); return undefined; }
    let alive = true;
    patientApi.profile().then((p) => alive && setProfile(p)).catch(() => {});
    return () => { alive = false; };
  }, [profileProp]);

  const mp = data || EMPTY_PROFILE;
  const tags = useMemo(() => SECTIONS.flatMap(({ key, label }) =>
    (mp[key] || []).map((item, idx) => ({ id: `${key}-${idx}`, key, label, item: String(item), idx }))), [mp]);
  const found = useSearch(tags, query, FIELDS);

  const saveSection = async (key, newList) => {
    setSaving(true);
    try {
      const updated = await patientApi.updateMedicalProfile({ [key]: newList });
      onReload?.(updated);
      notify?.('Profil médical mis à jour');
      setEditing(null);
      setInput('');
    } catch (e) {
      notify?.(e.message || 'Erreur de sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };
  const addItem = (key) => {
    const v = input.trim();
    if (!v) return;
    saveSection(key, [...(mp.patientDeclarations?.[key] || []), v]);
  };
  const removeItem = (key, idx) => {
    const value = mp[key]?.[idx];
    saveSection(key, (mp.patientDeclarations?.[key] || []).filter((x) => x !== value));
  };

  if (!data) return (
    <div className="space-y-5">
      <PageHeader title="ADN médical" sub={sub} />
      {[0, 1].map((i) => <div key={i} className={`animate-pulse h-40 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-red-50'}`} />)}
    </div>
  );

  const line = darkMode ? 'border-slate-800' : 'border-slate-200';
  const age = ageOf(profile?.birthDate);
  const bmi = profile?.heightCm && profile?.weightKg ? (profile.weightKg / ((profile.heightCm / 100) ** 2)) : null;
  const identity = [
    ['Âge', age != null ? `${age} ans` : null],
    ['Sexe', sexLabel(profile?.sex)],
    ['Taille', profile?.heightCm ? `${profile.heightCm} cm` : null],
    ['Poids', profile?.weightKg ? `${profile.weightKg} kg` : null],
    ['IMC', bmi ? bmi.toFixed(1).replace('.', ',') : null],
  ];
  const countIn = (key) => found.filter((t) => t.key === key).length;
  const foundIds = new Set(found.map((t) => t.id));
  const rows = SECTIONS.filter((s) => (section === 'all' || section === s.key) && (!query || countIn(s.key) > 0 || editing === s.key));
  const allergies = mp.allergies || [];

  return (
    <div className="space-y-5">
      <PageHeader title="ADN médical" sub={sub}
        subtitle="Fiche médicale de référence : à présenter à un soignant, notamment en urgence." />

      {/* 1. Identité médicale */}
      <Panel title="Identité médicale" meta={profile?.cmuNumber ? `CMU ${profile.cmuNumber}` : undefined} darkMode={darkMode}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-[auto_repeat(5,minmax(0,1fr))]">
          <div className={`col-span-2 sm:col-span-3 lg:col-span-1 flex items-center gap-4 px-5 py-4 border-b lg:border-b-0 lg:border-r ${line}`}>
            <div>
              <Label>Groupe sanguin</Label>
              <p className={`text-3xl font-bold leading-tight ${profile?.bloodType ? 'text-red-600' : 'text-slate-300'}`}>{profile?.bloodType || '—'}</p>
            </div>
            <div className={`pl-4 border-l ${line}`}>
              <Label>Allergies</Label>
              <p className={`text-sm font-semibold mt-0.5 ${allergies.length ? 'text-red-700' : 'text-slate-500'}`}>{allergies.length ? `${allergies.length} connue${allergies.length > 1 ? 's' : ''}` : 'Aucune connue'}</p>
            </div>
          </div>
          {identity.map(([label, value], i) => (
            <div key={label} className={`px-5 py-4 border-b sm:border-b-0 ${i < identity.length - 1 ? `lg:border-r ${line}` : ''} ${line}`}>
              <Label>{label}</Label>
              <p className={`text-base font-semibold mt-0.5 tabular-nums ${value ? '' : 'text-slate-300'}`}>{value || '—'}</p>
            </div>
          ))}
        </div>
      </Panel>

      {/* 2. Antécédents */}
      {tags.length > 0 && (
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <SearchInput value={query} onChange={setQuery} count={found.length} darkMode={darkMode} className="flex-1 min-w-0"
            placeholder="Allergie, maladie, opération…" label="Rechercher dans ma fiche médicale" />
          <Segmented darkMode={darkMode} value={section} onChange={setSection} label="Rubrique"
            options={[['all', 'Toutes', found.length], ...SECTIONS.map((s) => [s.key, s.label, countIn(s.key)])]} />
        </div>
      )}

      {query && found.length === 0 && !editing ? (
        <NoResults query={query} onClear={() => setQuery('')} darkMode={darkMode} />
      ) : (
        <Panel title="Antécédents et terrain" meta={`${tags.length} élément${tags.length > 1 ? 's' : ''}`} darkMode={darkMode}>
          <div className={`hidden md:grid grid-cols-[15rem_minmax(0,1fr)_7rem] gap-4 px-5 py-2 border-b text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 ${line}`}>
            <span>Rubrique</span><span>Éléments</span><span className="text-right">Action</span>
          </div>
          {rows.length === 0 && <p className="px-5 py-6 text-sm text-slate-500">Aucune correspondance dans cette rubrique.</p>}
          {rows.map(({ key, label, hint, Icon, critical }) => {
            const all = mp[key] || [];
            const items = all.map((item, idx) => ({ item: String(item), idx })).filter(({ idx }) => !query || foundIds.has(`${key}-${idx}`));
            const declared = mp.patientDeclarations?.[key] || [];
            const isEditing = editing === key;
            return (
              <div key={key} className={`grid grid-cols-1 md:grid-cols-[15rem_minmax(0,1fr)_7rem] gap-x-4 gap-y-2 px-5 py-4 border-b last:border-0 ${line}`}>
                <div className="flex items-start gap-3 min-w-0">
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${critical && all.length ? 'text-red-600' : 'text-slate-400'}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{label} <span className="font-mono text-xs text-slate-400 tabular-nums">{query ? `${items.length}/${all.length}` : all.length}</span></p>
                    <p className="text-xs text-slate-400">{hint}</p>
                  </div>
                </div>
                <div className="min-w-0">
                  {items.length === 0 && !isEditing && <p className="text-sm text-slate-400">{all.length && query ? 'Aucune correspondance.' : 'Aucun élément renseigné.'}</p>}
                  {items.length > 0 && (
                    <ul className="space-y-1.5">
                      {items.map(({ item, idx }) => {
                        const mine = declared.includes(item);
                        return (
                          <li key={idx} className="flex items-center gap-2 text-sm min-w-0">
                            <span className={`w-1.5 h-1.5 rounded-[1px] shrink-0 ${critical ? 'bg-red-600' : 'bg-red-300'}`} aria-hidden="true" />
                            <span className="min-w-0 break-words"><Highlight text={item} query={query} /></span>
                            <span className="text-[10px] uppercase tracking-wide text-slate-400 shrink-0">{mine ? 'déclaré' : 'dossier'}</span>
                            {mine && (
                              <button type="button" onClick={() => removeItem(key, idx)} disabled={saving} aria-label={`Retirer ${item}`}
                                className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 shrink-0">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {isEditing && (
                    <div className="flex gap-2 mt-2">
                      <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addItem(key); if (e.key === 'Escape') setEditing(null); }}
                        placeholder={`Nouvel élément — ${label.toLowerCase()}`} aria-label={`Ajouter — ${label}`} className={`${inputClass(darkMode)} !h-9 !rounded-lg`} autoFocus />
                      <Button onClick={() => addItem(key)} disabled={saving || !input.trim()} className="!h-9 !rounded-lg">Ajouter</Button>
                    </div>
                  )}
                </div>
                <div className="md:text-right">
                  <button type="button" onClick={() => { setEditing(isEditing ? null : key); setInput(''); }}
                    className={`h-8 px-3 rounded-lg border text-xs font-semibold inline-flex items-center gap-1 ${darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:border-red-300 hover:text-red-700'}`}>
                    {isEditing ? <><X className="w-3.5 h-3.5" /> Annuler</> : <><Plus className="w-3.5 h-3.5" /> Ajouter</>}
                  </button>
                </div>
              </div>
            );
          })}
        </Panel>
      )}
      <p className="text-xs text-slate-500">« Déclaré » : ajouté par vous, modifiable · « Dossier » : saisi par votre médecin, non modifiable ici.</p>
    </div>
  );
}
