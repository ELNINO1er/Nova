import React, { useState } from 'react';
import { Target, Plus, Minus, Activity, Droplet, Moon as MoonIcon, Heart, HeartPulse, CheckCircle2, Sun, X, Footprints, Scale, Apple } from 'lucide-react';
import { patientApi } from '../../api/patientApi.js';
import { useSearch, useUrlQuery } from '../../utils/search.js';
import { PageHeader, Card, CardTitle, Chip, Button, IconBadge, EmptyState, StatTile, SearchInput, Highlight, NoResults, inputClass } from '../../components/patient/ui.jsx';

/* Échelle d'IMC linéaire 15–40 : bandes, repères et curseur partagent la même fonction de position. */
const BMI_MIN = 15;
const BMI_MAX = 40;
const bmiPos = (v) => ((Math.min(BMI_MAX, Math.max(BMI_MIN, v)) - BMI_MIN) / (BMI_MAX - BMI_MIN)) * 100;
const BMI_BANDS = [
  { from: 15,   to: 18.5, light: 'bg-red-100', dark: 'bg-red-950/50' },
  { from: 18.5, to: 25,   light: 'bg-white',   dark: 'bg-slate-900' },
  { from: 25,   to: 30,   light: 'bg-red-200', dark: 'bg-red-900/60' },
  { from: 30,   to: 35,   light: 'bg-red-400', dark: 'bg-red-700' },
  { from: 35,   to: 40,   light: 'bg-red-600', dark: 'bg-red-600' },
];
const BMI_TICKS = [18.5, 25, 30, 35];

function BmiScale({ bmi, darkMode, sub }) {
  const pos = bmiPos(bmi);
  return (
    <div className="mt-6" role="img" aria-label={`IMC ${bmi} sur une échelle de ${BMI_MIN} à ${BMI_MAX}`}>
      <div className="relative">
        <div className={`flex h-3 rounded-full overflow-hidden border ${darkMode ? 'border-slate-700' : 'border-red-100'}`}>
          {BMI_BANDS.map((b) => (
            <div key={b.from} className={darkMode ? b.dark : b.light} style={{ width: `${bmiPos(b.to) - bmiPos(b.from)}%` }} />
          ))}
        </div>
        <span className={`absolute top-1/2 w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-slate-900 shadow ${darkMode ? 'border-slate-200' : 'border-white'}`}
          style={{ left: `${pos}%` }} />
      </div>
      <div className="relative h-5 mt-1.5 text-[11px] tabular-nums">
        {BMI_TICKS.map((t) => (
          <span key={t} className={`absolute -translate-x-1/2 ${sub}`} style={{ left: `${bmiPos(t)}%` }}>{String(t).replace('.', ',')}</span>
        ))}
      </div>
      <div className={`flex justify-between text-[11px] ${sub}`}>
        <span>Maigreur</span><span>Normal</span><span>Obésité</span>
      </div>
    </div>
  );
}

/* Catégorie lisible d'un objectif (type enregistré côté serveur). */
const GOAL_CATEGORY = {
  steps:          { label: 'Activité physique',  Icon: Footprints },
  water:          { label: 'Hydratation',        Icon: Droplet },
  sleep:          { label: 'Sommeil',            Icon: MoonIcon },
  weight:         { label: 'Poids',              Icon: Scale },
  blood_pressure: { label: 'Tension artérielle', Icon: HeartPulse },
  custom:         { label: 'Personnalisé',       Icon: Target },
};
const categoryOf = (g) => GOAL_CATEGORY[g.type] || GOAL_CATEGORY.custom;

/* Conseils de prévention (contenu statique, cherchable). */
const HEALTH_TIPS = [
  { icon: Droplet,    title: 'Hydratation',        category: 'Habitudes',    tip: 'Buvez au moins 2L d\'eau par jour, davantage si activité physique.' },
  { icon: MoonIcon,   title: 'Sommeil',            category: 'Récupération', tip: 'Dormez 7 à 9 heures par nuit pour une récupération optimale.' },
  { icon: Activity,   title: 'Activité physique',  category: 'Cœur',         tip: '30 minutes de marche rapide par jour réduisent le risque cardiaque de 35%.' },
  { icon: Sun,        title: 'Exposition solaire', category: 'Vitamines',    tip: '15 min de soleil/jour favorisent la synthèse de vitamine D.' },
  { icon: HeartPulse, title: 'Stress',             category: 'Mental',       tip: 'Pratiquez la respiration profonde 5 minutes par jour pour réduire le stress.' },
  { icon: Apple,      title: 'Alimentation',       category: 'Nutrition',    tip: 'Consommez 5 fruits et légumes par jour. Limitez sel, sucre, graisses saturées.' },
];

// Champs cherchables : objectif (titre, catégorie, unité, statut) et conseil (titre, catégorie, texte).
const GOAL_FIELDS = (g) => [g.title, categoryOf(g).label, g.unit, g.completed ? 'terminé atteint' : 'en cours actif', g.type];
const TIP_FIELDS = (t) => [t.title, t.category, t.tip];

export default function PWell({ data, profile, onReload, notify, card, sub, border, darkMode }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', target: '', unit: '', color: 'emerald' });
  const [saving, setSaving]   = useState(false);
  const [query, setQuery]     = useUrlQuery();

  const goals = data ?? [];
  const goalResults = useSearch(data, query, GOAL_FIELDS);
  const tipResults = useSearch(HEALTH_TIPS, query, TIP_FIELDS);

  // IMC
  const weight = profile?.weightKg;
  const height = profile?.heightCm;
  const bmi    = weight && height ? (weight / ((height / 100) ** 2)).toFixed(1) : null;
  const bmiCategory = !bmi ? null
    : bmi < 18.5 ? { label: 'Insuffisance pondérale', tone: 'watch' }
    : bmi < 25   ? { label: 'Poids normal',           tone: 'neutral' }
    : bmi < 30   ? { label: 'Surpoids',               tone: 'watch' }
    : bmi < 35   ? { label: 'Obésité modérée',        tone: 'alert' }
    : { label: 'Obésité sévère', tone: 'alert' };

  const addGoal = async () => {
    if (!newGoal.title || !newGoal.target) return;
    setSaving(true);
    try {
      await patientApi.createWellnessGoal({ type: 'custom', title: newGoal.title, target: Number(newGoal.target), unit: newGoal.unit, color: newGoal.color });
      onReload?.(await patientApi.wellnessGoals());
      notify?.('Objectif ajouté');
      setShowAdd(false);
      setNewGoal({ title: '', target: '', unit: '', color: 'emerald' });
    } catch (e) { notify?.(e.message || 'Erreur', 'error'); }
    finally { setSaving(false); }
  };

  const updateProgress = async (goal, delta) => {
    const next = Math.max(0, Math.min(goal.target, goal.currentValue + delta));
    const completed = next >= goal.target;
    try {
      await patientApi.updateWellnessGoal(goal.id, { currentValue: next, completed });
      onReload?.(await patientApi.wellnessGoals());
    } catch {}
  };

  const deleteGoal = async (id) => {
    try {
      await patientApi.deleteWellnessGoal(id);
      onReload?.(await patientApi.wellnessGoals());
      notify?.('Objectif supprimé');
    } catch {}
  };

  const completed = goals.filter(g => g.completed).length;
  const active = goals.length - completed;
  const avgProgress = goals.length ? Math.round(goals.reduce((s, g) => s + (Number(g.progress) || 0), 0) / goals.length) : 0;
  const step = (goal) => Math.max(1, goal.target * 0.05);

  if (!data) return (
    <div className="space-y-5">
      <PageHeader title="Bien-être & Prévention" sub={sub} />
      <Card darkMode={darkMode}><div className={`animate-pulse h-48 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-red-50'}`} /></Card>
    </div>
  );

  const showBmi = Boolean(bmi && bmiCategory);
  const firstName = profile?.firstName;
  const total = goalResults.length + tipResults.length;
  const line = darkMode ? 'divide-slate-800' : 'divide-slate-100';
  const showGoals = !query || goalResults.length > 0;
  const bmiVisible = showBmi && !query;

  return (
    <div className="space-y-5">
      <PageHeader title="Bien-être & Prévention" sub={sub}
        subtitle={`${completed}/${goals.length} objectifs atteints`}
        actions={<Button Icon={Plus} onClick={() => setShowAdd(true)} darkMode={darkMode}>Objectif</Button>} />

      {showAdd && (
        <>
          <button type="button" className="fixed inset-0 z-40 bg-slate-950/45" onClick={() => setShowAdd(false)} aria-label="Fermer" />
          <Card darkMode={darkMode} role="dialog" aria-modal="true" aria-labelledby="pwell-new-goal"
            className="fixed z-50 left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 shadow-2xl">
            <h3 id="pwell-new-goal" className="font-semibold mb-4">Nouvel objectif</h3>
            <div className="space-y-3">
              <input value={newGoal.title} onChange={e => setNewGoal(g => ({ ...g, title: e.target.value }))} placeholder="Ex: Boire 2L d'eau"
                aria-label="Intitulé de l'objectif" className={inputClass(darkMode)} />
              <div className="flex gap-2">
                <input type="number" value={newGoal.target} onChange={e => setNewGoal(g => ({ ...g, target: e.target.value }))} placeholder="Cible (ex: 2000)"
                  aria-label="Valeur cible" className={`${inputClass(darkMode)} flex-1 min-w-0`} />
                <input value={newGoal.unit} onChange={e => setNewGoal(g => ({ ...g, unit: e.target.value }))} placeholder="mL, pas…"
                  aria-label="Unité" className={`${inputClass(darkMode)} !w-24 shrink-0`} />
              </div>
              <div className="flex gap-2 pt-1">
                <Button onClick={addGoal} disabled={saving || !newGoal.title || !newGoal.target} darkMode={darkMode} className="flex-1">
                  {saving ? 'Enregistrement…' : 'Créer'}
                </Button>
                <Button variant="secondary" onClick={() => setShowAdd(false)} darkMode={darkMode} className="flex-1">Annuler</Button>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Synthèse : accueil + compteurs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <Card darkMode={darkMode} className="col-span-2 flex flex-col justify-between gap-4">
          <div>
            <p className={`text-sm ${sub}`}>Bonjour{firstName ? `, ${firstName}` : ''}</p>
            <p className="text-xl font-bold tracking-tight mt-1">
              {goals.length === 0 ? 'Fixez-vous un premier objectif'
                : active === 0 ? 'Tous vos objectifs sont atteints'
                : `${active} objectif${active > 1 ? 's' : ''} en cours aujourd’hui`}
            </p>
          </div>
          <div>
            <div className="flex items-baseline justify-between text-xs">
              <span className={sub}>Progression moyenne</span>
              <span className="font-semibold tabular-nums">{avgProgress}%</span>
            </div>
            <div className={`mt-1.5 h-2 rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-red-50'}`}
              role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={avgProgress} aria-label="Progression moyenne des objectifs">
              <div className="h-2 rounded-full bg-red-600 transition-all" style={{ width: `${avgProgress}%` }} />
            </div>
          </div>
        </Card>
        <StatTile label="Objectifs actifs" value={active} Icon={Target} highlight darkMode={darkMode} hint="à poursuivre" />
        <StatTile label="Terminés" value={completed} Icon={CheckCircle2} darkMode={darkMode} hint={goals.length ? `sur ${goals.length}` : 'aucun objectif'} />
      </div>

      <SearchInput value={query} onChange={setQuery} count={total} darkMode={darkMode}
        placeholder="Rechercher un objectif ou un conseil (sommeil, hydratation…)" label="Rechercher dans le bien-être" />

      {query && total === 0 ? (
        <NoResults query={query} onClear={() => setQuery('')} darkMode={darkMode} />
      ) : (
        <>
          {(bmiVisible || showGoals) && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              {/* IMC */}
              {bmiVisible && (
                <Card darkMode={darkMode} className="lg:col-span-2">
                  <CardTitle Icon={Activity} action={<Chip tone={bmiCategory.tone}>{bmiCategory.label}</Chip>}>Indice de masse corporelle</CardTitle>
                  <div className="flex items-end gap-3">
                    <span className="text-5xl font-bold tracking-tight tabular-nums">{bmi}</span>
                    <p className={`text-sm mb-1.5 ${sub}`}>{weight} kg · {height} cm</p>
                  </div>
                  <BmiScale bmi={Number(bmi)} darkMode={darkMode} sub={sub} />
                </Card>
              )}

              {/* Objectifs */}
              {showGoals && (
                <Card darkMode={darkMode} className={bmiVisible ? 'lg:col-span-3' : 'lg:col-span-5'}>
                  <CardTitle Icon={Target} action={query ? <span className={`text-xs ${sub}`}>{goalResults.length} / {goals.length}</span> : null}>Mes objectifs du jour</CardTitle>
                  {goals.length === 0 ? (
                    <EmptyState Icon={Target} title="Aucun objectif" darkMode={darkMode}>
                      Cliquez sur « Objectif » pour en créer un.
                    </EmptyState>
                  ) : (
                    <ul className={`divide-y ${line} -my-1`}>
                      {goalResults.map((goal) => {
                        const prog = goal.progress;
                        const cat = categoryOf(goal);
                        return (
                          <li key={goal.id} className="py-3.5">
                            <div className="flex items-center gap-3">
                              <IconBadge Icon={goal.completed ? CheckCircle2 : cat.Icon} solid={goal.completed} size="sm" />
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-semibold truncate ${goal.completed ? 'line-through opacity-60' : ''}`}>
                                  <Highlight text={goal.title} query={query} />
                                </p>
                                <p className={`text-[11px] ${sub}`}>
                                  <Highlight text={cat.label} query={query} />{goal.completed ? ' · atteint' : ''}
                                </p>
                              </div>
                              <span className="text-xs font-semibold tabular-nums text-right shrink-0">{goal.currentValue}/{goal.target} {goal.unit}</span>
                            </div>
                            <div className="mt-2.5 flex items-center gap-2 sm:pl-11">
                              <div className={`flex-1 min-w-0 h-2 rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-red-50'}`}
                                role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={prog} aria-label={`Progression : ${goal.title}`}>
                                <div className="h-2 rounded-full bg-red-600 transition-all" style={{ width: `${prog}%` }} />
                              </div>
                              <span className={`text-[11px] tabular-nums w-9 text-right shrink-0 ${sub}`}>{prog}%</span>
                              <button type="button" onClick={() => updateProgress(goal, -step(goal))} aria-label={`Diminuer : ${goal.title}`}
                                className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 bg-white hover:bg-red-50'}`}>
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <button type="button" onClick={() => updateProgress(goal, step(goal))} aria-label={`Augmenter : ${goal.title}`}
                                className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shrink-0">
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <button type="button" onClick={() => deleteGoal(goal.id)} aria-label={`Supprimer : ${goal.title}`}
                                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${sub} hover:text-red-600 ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-red-50'}`}>
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Card>
              )}
            </div>
          )}

          {/* Conseils */}
          {tipResults.length > 0 && (
            <section aria-labelledby="pwell-tips">
              <h3 id="pwell-tips" className="font-semibold flex items-center gap-2 mb-3">
                <Heart className="w-4 h-4 text-red-600" /> Conseils prévention
                {query && <span className={`text-xs font-normal ${sub}`}>{tipResults.length} / {HEALTH_TIPS.length}</span>}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                {tipResults.map(({ icon: Icon, title, category, tip }) => (
                  <Card key={title} darkMode={darkMode} as="article" className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <IconBadge Icon={Icon} />
                      <Chip><Highlight text={category} query={query} /></Chip>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold"><Highlight text={title} query={query} /></p>
                      <p className={`text-sm mt-1 leading-relaxed ${sub}`}><Highlight text={tip} query={query} /></p>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
