import React, { useEffect, useMemo, useState } from 'react';
import { Star, MapPin, PhoneCall, Users, Wallet, X, ShieldCheck, Briefcase, Stethoscope, CalendarDays, Phone } from 'lucide-react';
import { patientApi } from '../../api/patientApi.js';
import { formatDateFull } from '../../utils/format.js';
import { PageHeader, Card, Chip, Button, IconButton, EmptyState, Field, Pills, SearchInput, Highlight, NoResults } from '../../components/patient/ui.jsx';
import { useSearch, useUrlQuery } from '../../utils/search.js';

/* Note sur 5 avec une décimale (4,9) ; tarif « 15 000 FCFA ». */
const fmtRating = (v) => (v == null || Number.isNaN(Number(v)) ? '—' : Number(v).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const fmtFee = (v) => (v == null || Number.isNaN(Number(v)) ? 'Tarif non renseigné' : `${Math.round(Number(v)).toLocaleString('fr-FR').replace(/ | /g, ' ')} FCFA`);

/* Champs cherchables, du plus au moins important. */
const FIELDS = (d) => [d.fullName, d.specialty, d.subSpecialty, d.city, d.address, d.languages, d.acceptsCmu ? 'cmu' : '', d.bio];

const initials = (doc) => doc.avatarInitials || (doc.fullName || '').replace(/^Dr\.?\s*/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

/* Avatar médecin : rond, initiales rouges sur fond rouge pâle (ou rouge plein en grand). */
function DocAvatar({ doc, size = 'md', solid = false }) {
  const s = size === 'xl' ? 'w-20 h-20 text-xl' : size === 'lg' ? 'w-16 h-16 text-lg' : 'w-12 h-12 text-sm';
  return <span className={`${s} rounded-full flex items-center justify-center font-bold shrink-0 ${solid ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700'}`} aria-hidden="true">{initials(doc)}</span>;
}

export default function PDoctors({ data, onBooked, notify, card, sub, border, darkMode, setPage }) {
  const [q, setQ]             = useUrlQuery();
  const [specialty, setSpec]  = useState('all');
  const [acceptsCmu, setCmu]  = useState(false);
  const [selected, setSelected] = useState(null);
  const [slots, setSlots]     = useState(null);
  const [loadingSlots, setLS] = useState(false);
  const [booking, setBooking] = useState(null);
  const [shareRecord, setShareRecord] = useState(false);
  const [chosenSlot, setChosenSlot] = useState(null);

  const doctors = useMemo(() => data ?? [], [data]);
  const results = useSearch(doctors, q, FIELDS);
  const pool = acceptsCmu ? results.filter((d) => d.acceptsCmu) : results;
  const specialties = useMemo(() => [...new Set(doctors.map((d) => d.specialty).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr')), [doctors]);
  const filtered = specialty === 'all' ? pool : pool.filter((d) => d.specialty === specialty);

  useEffect(() => {
    if (!selected) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setSelected(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selected]);

  const openDoctor = async (doc) => {
    setSelected(doc);
    setShareRecord(false);
    setChosenSlot(null);
    setSlots(null);
    setLS(true);
    try {
      const s = await patientApi.doctorSlots(doc.id);
      setSlots(s);
    } catch {
      setSlots([]);
    } finally {
      setLS(false);
    }
  };

  const handleBook = async (slot) => {
    if (!slot) {
      notify?.('Choisissez un créneau.', 'error');
      return;
    }
    if (booking) return;
    if (!shareRecord) {
      notify?.('Acceptez le partage de votre dossier avec ce médecin pour réserver.', 'error');
      return;
    }
    setBooking(slot.id);
    try {
      await patientApi.bookSlot(selected.id, slot.id, true);
      notify?.(`RDV confirmé le ${slot.date} à ${slot.time} avec ${selected.fullName}`);
      setSelected(null);
      setChosenSlot(null);
      onBooked?.();
    } catch (e) {
      notify?.(e.message || 'Erreur réservation', 'error');
    } finally {
      setBooking(null);
    }
  };

  const grantAccess = async () => {
    if (!window.confirm(`Autoriser ${selected.fullName} à consulter votre dossier clinique ? Vous pourrez révoquer cet accès depuis Mon compte.`)) return;
    try {
      await patientApi.grantDoctorAccess(selected.id);
      notify?.('Accès accordé au médecin.');
    } catch (e) {
      notify?.(e.message, 'error');
    }
  };

  // Créneaux groupés par jour
  const slotsByDate = {};
  if (slots) {
    for (const s of slots) {
      if (!slotsByDate[s.date]) slotsByDate[s.date] = [];
      slotsByDate[s.date].push(s);
    }
  }

  const divider = darkMode ? 'border-slate-800' : 'border-slate-100';
  const resetFilters = () => { setQ(''); setSpec('all'); setCmu(false); };
  const shortCity = (doc) => (doc.city || '').split(' - ')[1] || doc.city;

  if (!data) return (
    <div className="space-y-5">
      <PageHeader title="Trouver un médecin" sub={sub} />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {[0, 1, 2, 3].map(i => <Card key={i} darkMode={darkMode}><div className={`animate-pulse h-48 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-red-50/60'}`} /></Card>)}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Trouver un médecin" sub={sub}
        subtitle={`${filtered.length} professionnel${filtered.length > 1 ? 's' : ''} sur ${doctors.length}`} />

      {/* Barre d'outils : recherche, CMU, spécialités */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <SearchInput value={q} onChange={setQ} darkMode={darkMode} count={filtered.length} className="flex-1 min-w-0"
            placeholder="Nom, spécialité, quartier, langue…" label="Rechercher un médecin" />
          <label className={`h-12 px-4 rounded-full border flex items-center gap-2 text-sm cursor-pointer whitespace-nowrap ${acceptsCmu ? (darkMode ? 'border-red-900 text-red-300' : 'border-red-200 bg-red-50 text-red-700') : darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 bg-white text-slate-600'}`}>
            <input type="checkbox" checked={acceptsCmu} onChange={e => setCmu(e.target.checked)} className="w-4 h-4 accent-red-600" />
            CMU acceptée
          </label>
        </div>
        {specialties.length > 1 && (
          <Pills darkMode={darkMode} value={specialty} onChange={setSpec}
            options={[['all', 'Toutes', pool.length], ...specialties.map((s) => [s, s, pool.filter((d) => d.specialty === s).length])]} />
        )}
      </div>

      <div className={selected ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-5 lg:items-start' : ''}>
        {/* Annuaire */}
        <div className="min-w-0">
          {filtered.length === 0 ? (
            q && results.length === 0
              ? <NoResults query={q} onClear={() => setQ('')} darkMode={darkMode} />
              : <EmptyState Icon={Stethoscope} title="Aucun médecin trouvé" darkMode={darkMode}
                  action={<Button variant="secondary" darkMode={darkMode} onClick={resetFilters}>Réinitialiser les filtres</Button>}>
                  Modifiez votre recherche ou vos filtres.
                </EmptyState>
          ) : (
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-5 ${selected ? '2xl:grid-cols-3' : 'xl:grid-cols-3 2xl:grid-cols-4'}`}>
              {filtered.map(doc => {
                const isSel = selected?.id === doc.id;
                return (
                  <article key={doc.id}
                    className={`relative rounded-3xl border flex flex-col transition-colors ${isSel
                      ? (darkMode ? 'bg-slate-900 border-red-700' : 'bg-white border-red-400')
                      : darkMode ? 'bg-slate-900 border-slate-800 hover:border-red-800' : 'bg-white border-slate-200/70 hover:border-red-200'}`}>
                    <span className="absolute left-4 top-4 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700" aria-label={`Note ${fmtRating(doc.rating)} sur 5`}>
                      <Star className="w-3 h-3 fill-current" aria-hidden="true" />{fmtRating(doc.rating)}
                    </span>
                    {doc.acceptsCmu && <span className="absolute right-4 top-4"><Chip>CMU</Chip></span>}
                    <button type="button" onClick={() => openDoctor(doc)} aria-pressed={isSel}
                      aria-label={`Voir la fiche de ${doc.fullName}`}
                      className="flex-1 px-5 pt-10 pb-4 flex flex-col items-center text-center rounded-t-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50">
                      <DocAvatar doc={doc} size="xl" solid={isSel} />
                      <p className="font-semibold mt-3 break-words"><Highlight text={doc.fullName} query={q} /></p>
                      <span className={`mt-1.5 px-3 py-1 rounded-full text-xs font-semibold ${darkMode ? 'bg-red-950/40 text-red-300' : 'bg-red-50 text-red-700'}`}>
                        <Highlight text={doc.specialty} query={q} />
                      </span>
                      {doc.subSpecialty && <p className={`text-xs mt-1.5 ${sub}`}><Highlight text={doc.subSpecialty} query={q} /></p>}
                      <p className={`text-xs mt-2 flex items-start justify-center gap-1 ${sub}`}>
                        <MapPin className="w-3 h-3 shrink-0 mt-0.5" aria-hidden="true" />
                        <span className="min-w-0 break-words"><Highlight text={doc.address || shortCity(doc)} query={q} />{doc.address && shortCity(doc) ? <> · <Highlight text={shortCity(doc)} query={q} /></> : null}</span>
                      </p>
                      <p className={`text-xs mt-1 flex items-center gap-1 ${sub}`}><Briefcase className="w-3 h-3" aria-hidden="true" />{doc.experienceYears} ans d'exp. · {fmtFee(doc.consultationFee)}</p>
                    </button>
                    <div className={`grid grid-cols-2 border-t ${divider}`}>
                      <button type="button" onClick={() => openDoctor(doc)}
                        className={`h-11 text-xs font-semibold inline-flex items-center justify-center gap-1.5 rounded-bl-3xl ${darkMode ? 'text-red-300 hover:bg-red-950/40' : 'text-red-700 hover:bg-red-50'}`}>
                        <CalendarDays className="w-3.5 h-3.5" aria-hidden="true" /> Disponibilités
                      </button>
                      {doc.phone ? (
                        <a href={`tel:${doc.phone}`} aria-label={`Appeler ${doc.fullName}`}
                          className={`h-11 text-xs font-semibold inline-flex items-center justify-center gap-1.5 rounded-br-3xl border-l ${divider} ${darkMode ? 'hover:bg-red-950/40' : 'hover:bg-red-50 hover:text-red-700'}`}>
                          <Phone className="w-3.5 h-3.5" aria-hidden="true" /> Appeler
                        </a>
                      ) : (
                        <span className={`h-11 text-xs inline-flex items-center justify-center border-l ${divider} ${sub}`}>Sans téléphone</span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Fiche détaillée : panneau à droite (ordinateur), feuille modale (mobile) */}
        {selected && (
          <>
            <button type="button" className="lg:hidden fixed inset-0 z-40 bg-slate-950/45" onClick={() => setSelected(null)} aria-label="Fermer la fiche" />
            <aside role="dialog" aria-modal="true" aria-label={`Prendre rendez-vous avec ${selected.fullName}`}
              className={`fixed z-50 inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-3xl border shadow-xl lg:shadow-none lg:z-auto lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:rounded-3xl ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/70'}`}>
              <div className="p-5 flex items-center justify-between gap-3">
                <p className="font-semibold">Fiche médecin</p>
                <IconButton Icon={X} label="Fermer la fiche" onClick={() => setSelected(null)} darkMode={darkMode} />
              </div>
              <div className="px-5 pb-5 flex flex-col items-center text-center">
                <DocAvatar doc={selected} size="xl" solid />
                <p className="font-semibold text-lg mt-3 leading-tight">{selected.fullName}</p>
                <span className={`mt-1.5 px-3 py-1 rounded-full text-xs font-semibold ${darkMode ? 'bg-red-950/40 text-red-300' : 'bg-red-50 text-red-700'}`}>{selected.specialty}</span>
                {selected.subSpecialty && <p className={`text-xs mt-1.5 ${sub}`}>{selected.subSpecialty}</p>}
              </div>

              <div className={`grid grid-cols-3 border-y ${divider} text-center`}>
                <div className="py-3 px-2 min-w-0">
                  <p className="text-sm font-bold flex items-center justify-center gap-1"><Star className="w-3.5 h-3.5 text-red-600 fill-red-600" aria-hidden="true" />{fmtRating(selected.rating)}</p>
                  <p className={`text-[11px] ${sub}`}>{selected.reviewsCount ?? 0} avis</p>
                </div>
                <div className={`py-3 px-2 border-x ${divider} min-w-0`}>
                  <p className="text-sm font-bold">{selected.experienceYears ?? '—'} ans</p>
                  <p className={`text-[11px] ${sub}`}>d'expérience</p>
                </div>
                <div className="py-3 px-2 min-w-0">
                  <p className="text-sm font-bold break-words">{fmtFee(selected.consultationFee).replace(' FCFA', '')}</p>
                  <p className={`text-[11px] ${sub}`}>{selected.consultationFee == null ? 'tarif' : 'FCFA'}</p>
                </div>
              </div>

              {selected.bio && <div className={`px-5 py-4 border-b ${divider}`}><p className={`text-sm ${sub}`}>{selected.bio}</p></div>}

              <dl className={`px-5 py-4 border-b ${divider} grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4`}>
                <Field label="Adresse" Icon={MapPin}>{selected.address || selected.city}</Field>
                <Field label="Téléphone" Icon={PhoneCall}>{selected.phone ? <a href={`tel:${selected.phone}`} className="text-red-700 hover:underline">{selected.phone}</a> : null}</Field>
                <Field label="Consultation" Icon={Wallet}>{fmtFee(selected.consultationFee)}{selected.acceptsCmu ? ' · CMU acceptée' : ''}</Field>
                <Field label="Langues" Icon={Users}>{selected.languages}</Field>
              </dl>

              <div className={`px-5 py-4 border-b ${divider} space-y-2`}>
                <p className={`text-xs ${sub}`}>Accès au dossier clinique complet ; aucun partage par rubrique.</p>
                <Button variant="danger" darkMode={darkMode} Icon={ShieldCheck} onClick={grantAccess} className="!h-9 !px-3 text-xs">
                  Autoriser l’accès à mon dossier
                </Button>
              </div>

              {/* Créneaux */}
              <div className="p-5">
                <p className="font-semibold text-sm mb-3">Créneaux disponibles</p>
                {loadingSlots ? (
                  <div className={`animate-pulse h-20 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-red-50/60'}`} />
                ) : Object.keys(slotsByDate).length === 0 ? (
                  <p className={`text-sm ${sub} text-center py-6`}>Aucun créneau disponible pour le moment.</p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(slotsByDate).slice(0, 5).map(([date, daySlots]) => (
                      <div key={date}>
                        <p className={`text-xs font-semibold mb-2 capitalize ${sub}`}>{formatDateFull(date)}</p>
                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-2">
                          {daySlots.map(slot => {
                            const unavailable = slot.status && slot.status !== 'available';
                            const isChosen = chosenSlot?.id === slot.id;
                            return (
                              <button key={slot.id} type="button" onClick={() => setChosenSlot(slot)} disabled={unavailable || !!booking}
                                aria-pressed={isChosen}
                                aria-label={`${unavailable ? 'Indisponible' : 'Choisir'} le ${formatDateFull(date)} à ${String(slot.time).slice(0, 5)}`}
                                className={`h-9 rounded-full text-xs font-semibold border tabular-nums transition-colors disabled:cursor-not-allowed ${isChosen
                                  ? 'bg-red-600 text-white border-red-600'
                                  : unavailable
                                    ? (darkMode ? 'border-slate-800 text-slate-600 line-through' : 'border-slate-200 text-slate-300 line-through')
                                    : (darkMode ? 'border-red-800 text-red-300 hover:bg-red-950/40' : 'border-red-300 bg-white text-red-700 hover:bg-red-50')}`}>
                                {String(slot.time).slice(0, 5)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <label className={`flex items-start gap-3 p-4 rounded-2xl border text-xs mt-5 cursor-pointer ${shareRecord ? (darkMode ? 'border-red-900' : 'border-red-200 bg-red-50/50') : darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                  <input type="checkbox" className="mt-0.5 w-4 h-4 accent-red-600 shrink-0" checked={shareRecord} onChange={(e) => setShareRecord(e.target.checked)} />
                  <span>J’accepte que {selected.fullName} consulte mon dossier pour ce rendez-vous. <span className={sub}>Révocable à tout moment dans « Accès au dossier ».</span></span>
                </label>

                <Button onClick={() => handleBook(chosenSlot)} disabled={!chosenSlot || !!booking} className="w-full !h-11 mt-4">
                  {booking
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Réservation…</>
                    : chosenSlot
                      ? `Réserver · ${formatDateFull(chosenSlot.date)} à ${String(chosenSlot.time).slice(0, 5)}`
                      : 'Choisissez un créneau'}
                </Button>
                {chosenSlot && !shareRecord && <p className={`text-[11px] mt-2 text-center ${sub}`}>Cochez l’accord de partage pour réserver.</p>}
              </div>
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
