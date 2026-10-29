import React, { useState, useEffect } from 'react';
import { User, Calendar, Smartphone, Mail, MapPin, Heart, Edit3, Save, X, Siren, FileDown, Camera, Trash2, IdCard } from 'lucide-react';
import { patientApi } from '../../api/patientApi.js';
import { useUnsaved } from '../../unsaved.js';
import { PHOTO_ACCEPT, announcePhotoChange, preparePhoto, usePatientPhoto } from '../../utils/photo.js';
import { Button, Card, CardTitle, Chip, Field, PageHeader, inputClass } from '../../components/patient/ui.jsx';

/* Date de naissance en toutes lettres (« 14 mai 1950 »), sans décalage de fuseau. */
const fmtBirth = (value) => {
  if (!value) return null;
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
};
const SEX_LABELS = { M: 'Homme', F: 'Femme', H: 'Homme' };
const fmtSex = (value) => (value ? SEX_LABELS[String(value).toUpperCase()] || value : null);

export default function PProfile({ data, onSaved, card, sub, border, darkMode }) {
  const [edit, setEdit] = useState(false);
  const [d, setD] = useState({
    firstName: '', lastName: '', birthDate: '', sex: '',
    cmu: '', phone: '', email: '',
    address: '', city: '',
    bloodType: '', weight: '', height: '',
    eName: '', eRel: '', ePhone: '',
  });

  // Formulaire réinitialisé depuis le serveur, sauf pendant une modification (une actualisation ne l'écrase pas).
  const fromData = (src) => ({
      firstName: src.firstName || '',
      lastName: src.lastName || '',
      birthDate: src.birthDate || '',
      sex: src.sex || '',
      cmu: src.cmuNumber || '',
      phone: src.phone || '',
      email: src.email || '',
      address: src.address || '',
      city: src.city || '',
      bloodType: src.bloodType || '',
      weight: src.weightKg ? String(src.weightKg) : '',
      height: src.heightCm ? String(src.heightCm) : '',
      eName: src.emergencyContact?.name || '',
      eRel: src.emergencyContact?.relationship || '',
      ePhone: src.emergencyContact?.phone || '',
  });
  useEffect(() => {
    if (!data || edit) return;
    setD(fromData(data));
    // fromData ne lit que son argument.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, edit]);
  // Modifications non enregistrées : bloque l'actualisation automatique et avertit avant de quitter la page.
  useUnsaved(edit, JSON.stringify(d));

  const profileInitials = `${d.firstName?.[0] || ''}${d.lastName?.[0] || ''}`.toUpperCase() || '—';
  const profileAge = d.birthDate ? Math.floor((Date.now() - new Date(d.birthDate).getTime()) / 31557600000) : null;

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const photoSrc = usePatientPhoto(true);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');

  const changePhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoBusy(true); setPhotoError('');
    try { await patientApi.updatePhoto(await preparePhoto(file)); announcePhotoChange(); }
    catch (err) { setPhotoError(err.message || 'Photo non enregistrée.'); }
    finally { setPhotoBusy(false); }
  };
  const deletePhoto = async () => {
    if (!window.confirm('Retirer votre photo de profil ?')) return;
    setPhotoBusy(true); setPhotoError('');
    try { await patientApi.removePhoto(); announcePhotoChange(); }
    catch (err) { setPhotoError(err.message || 'Suppression impossible.'); }
    finally { setPhotoBusy(false); }
  };

  const inputCls = `mt-1 ${inputClass(darkMode)}`;

  const saveProfile = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const updated = await patientApi.updateProfile({
        firstName:             d.firstName,
        lastName:              d.lastName,
        birthDate:             d.birthDate || undefined,
        sex:                   d.sex       || undefined,
        bloodType:             d.bloodType || undefined,
        phone:                 d.phone     || undefined,
        email:                 d.email     || undefined,
        address:               d.address   || undefined,
        city:                  d.city      || undefined,
        weightKg:              Number(d.weight) || undefined,
        heightCm:              Number(d.height) || undefined,
        emergencyName:         d.eName     || undefined,
        emergencyRelationship: d.eRel      || undefined,
        emergencyPhone:        d.ePhone    || undefined,
      });
      onSaved?.(updated);
      setEdit(false);
    } catch (error) {
      setSaveError(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (!data) {
    return (
      <div className="space-y-5">
        <PageHeader title="Mon profil" sub={sub} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {[0, 1, 2].map(i => (
            <Card key={i} darkMode={darkMode}><div className={`animate-pulse h-48 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-red-50'}`} /></Card>
          ))}
        </div>
      </div>
    );
  }

  /* Ligne libellé / valeur, ou champ de saisie en mode édition. */
  const row = (label, key, { Icon, type = 'text', display, className = '' } = {}) => (
    <div className={className}>
      {edit ? (
        <label className="block min-w-0">
          <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">{Icon && <Icon className="w-3.5 h-3.5" />}{label}</span>
          {key === 'sex' ? (
            <select value={d.sex} onChange={(e) => setD({ ...d, sex: e.target.value })} className={inputCls}>
              <option value="">—</option>
              <option value="M">Homme</option>
              <option value="F">Femme</option>
              {d.sex && !['M', 'F'].includes(d.sex) && <option value={d.sex}>{d.sex}</option>}
            </select>
          ) : (
            <input type={type} value={d[key]} onChange={(e) => setD({ ...d, [key]: e.target.value })} className={inputCls} />
          )}
        </label>
      ) : (
        <Field label={label} Icon={Icon}>{(display ? display(d[key]) : d[key]) || null}</Field>
      )}
    </div>
  );

  const actionLabel = photoSrc ? 'Changer la photo' : 'Ajouter une photo';

  /* Antécédents / conditions, seulement si le profil les fournit (listes ou texte). */
  const toList = (v) => (Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? x : x?.name || x?.label || '')).filter(Boolean) : v ? [String(v)] : []);
  const conditions = [...toList(data.chronicDiseases), ...toList(data.conditions), ...toList(data.allergies)];
  const emergencyText = [d.eName, d.eRel && `(${d.eRel})`].filter(Boolean).join(' ');
  const keyStats = [
    ['Taille', d.height ? `${d.height}` : '—', d.height ? 'cm' : ''],
    ['Poids', d.weight ? `${d.weight}` : '—', d.weight ? 'kg' : ''],
    ['Groupe sanguin', d.bloodType || '—', ''],
  ];
  const line = darkMode ? 'border-slate-800' : 'border-slate-100';

  return (
    <div className="space-y-5">
      <PageHeader
        title="Mon profil"
        subtitle="Vos informations d’identité, de contact et de santé"
        sub={sub}
        actions={(
          <>
            <a href={patientApi.exportPdfUrl()} target="_blank" rel="noreferrer"
              className={`h-10 px-4 rounded-full text-sm font-semibold inline-flex items-center gap-2 transition-colors ${darkMode ? 'border border-slate-700 hover:bg-slate-800' : 'border border-slate-200 bg-white hover:border-red-300 hover:text-red-700'}`}>
              <FileDown className="w-4 h-4" /> Exporter PDF
            </a>
            {edit && (
              <Button variant="secondary" Icon={X} darkMode={darkMode} onClick={() => { if (data) setD(fromData(data)); setEdit(false); setSaveError(''); }}>Annuler</Button>
            )}
            <Button Icon={edit ? Save : Edit3} disabled={saving} darkMode={darkMode} onClick={() => (edit ? saveProfile() : setEdit(true))}>
              {edit ? (saving ? 'Sauvegarde...' : 'Enregistrer') : 'Modifier'}
            </Button>
          </>
        )}
      />

      {saveError && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-2xl px-4 py-2.5">{saveError}</p>}

      {/* Fiche patient : carte rouge (photo, nom, âge, mesures clés) + carte blanche (coordonnées) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-stretch">
        <section aria-label="Fiche patient" className={`lg:col-span-2 rounded-3xl p-6 text-white ${darkMode ? 'bg-red-700' : 'bg-red-600'}`}>
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24 shrink-0">
              <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center text-2xl font-bold border-4 border-white/30 bg-white text-red-700">
                {photoSrc ? <img src={photoSrc} alt="Votre photo de profil" className="w-full h-full object-cover" /> : profileInitials}
              </div>
              <label title={actionLabel} className={`absolute -bottom-0.5 -right-0.5 w-9 h-9 rounded-full bg-white text-red-700 flex items-center justify-center cursor-pointer hover:bg-red-50 border-2 border-red-600 focus-within:ring-2 focus-within:ring-white ${photoBusy ? 'opacity-60 pointer-events-none' : ''}`}>
                <Camera className="w-4 h-4" />
                <span className="sr-only">{actionLabel}</span>
                <input type="file" accept={PHOTO_ACCEPT} onChange={changePhoto} disabled={photoBusy} className="sr-only" />
              </label>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-100">Patient</p>
              <h3 className="text-xl sm:text-2xl font-bold leading-tight break-words">{d.firstName} {d.lastName}</h3>
              <p className="text-sm text-red-100 mt-1">
                {[profileAge !== null ? `${profileAge} ans` : null, fmtSex(d.sex), d.city].filter(Boolean).join(' · ') || 'Âge non renseigné'}
              </p>
              {photoSrc && (
                <button type="button" onClick={deletePhoto} disabled={photoBusy} aria-label="Retirer la photo"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-red-100 hover:text-white disabled:opacity-60">
                  <Trash2 className="w-3.5 h-3.5" /> Retirer la photo
                </button>
              )}
            </div>
          </div>
          {photoError && <p role="alert" className="mt-3 text-xs font-medium bg-white text-red-700 rounded-xl px-3 py-1.5">{photoError}</p>}

          <dl className="mt-6 pt-5 border-t border-white/20 grid grid-cols-3 gap-3">
            {keyStats.map(([label, value, unit]) => (
              <div key={label} className="min-w-0">
                <dt className="text-[11px] sm:text-xs text-red-100 leading-tight">{label}</dt>
                <dd className="mt-1 flex items-baseline gap-1"><span className="text-xl sm:text-2xl font-bold tabular-nums">{value}</span>{unit && <span className="text-xs text-red-100">{unit}</span>}</dd>
              </div>
            ))}
          </dl>
        </section>

        <Card darkMode={darkMode} className="lg:col-span-3">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
            <Field label="Téléphone" Icon={Smartphone}>{d.phone || null}</Field>
            <Field label="Email" Icon={Mail}>{d.email || null}</Field>
            <Field label="N° CMU" Icon={IdCard}>{d.cmu ? <span className="font-mono">{d.cmu}</span> : null}</Field>
            <Field label="Date de naissance" Icon={Calendar}>{fmtBirth(d.birthDate)}</Field>
            {conditions.length > 0 && (
              <div className="sm:col-span-2">
                <Field label="Antécédents et conditions" Icon={Heart}>
                  <span className="flex flex-wrap gap-1.5 mt-0.5">{conditions.map((c, i) => <Chip key={`${c}-${i}`} tone="watch">{c}</Chip>)}</span>
                </Field>
              </div>
            )}
            <div className={`sm:col-span-2 pt-5 border-t ${line}`}>
              <Field label="Contact d’urgence" Icon={Siren}>
                {emergencyText || d.ePhone ? (
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {emergencyText && <span>{emergencyText}</span>}
                    {d.ePhone && <a href={`tel:${d.ePhone}`} className="text-red-700 font-semibold hover:underline">{d.ePhone}</a>}
                  </span>
                ) : null}
              </Field>
            </div>
          </dl>
        </Card>
      </div>

      {edit && <p className={`text-sm ${sub}`}>Mode édition : modifiez les champs ci-dessous puis cliquez sur « Enregistrer ».</p>}

      {/* Sections détaillées (éditables) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <Card darkMode={darkMode} className={edit ? (darkMode ? 'border-red-900' : 'border-red-200') : ''}>
          <CardTitle Icon={User}>Informations générales</CardTitle>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
            {row('Prénom', 'firstName')}
            {row('Nom', 'lastName')}
            {row('Date de naissance', 'birthDate', { Icon: Calendar, type: 'date', display: fmtBirth })}
            {row('Sexe', 'sex', { display: fmtSex })}
            <Field label="N° CMU" Icon={IdCard}>{d.cmu || null}</Field>
            {row('Ville', 'city')}
            {row('Adresse', 'address', { Icon: MapPin, className: 'sm:col-span-2' })}
          </dl>
        </Card>

        <Card darkMode={darkMode} className={edit ? (darkMode ? 'border-red-900' : 'border-red-200') : ''}>
          <CardTitle Icon={Smartphone}>Coordonnées</CardTitle>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
            {row('Téléphone', 'phone', { Icon: Smartphone, type: 'tel' })}
            {row('Email', 'email', { Icon: Mail, type: 'email' })}
          </dl>
        </Card>

        <Card darkMode={darkMode} className={edit ? (darkMode ? 'border-red-900' : 'border-red-200') : ''}>
          <CardTitle Icon={Heart}>Anamnèse</CardTitle>
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-5">
            {row('Groupe sanguin', 'bloodType')}
            {row('Poids (kg)', 'weight', { type: edit ? 'number' : 'text', display: (v) => (v ? `${v} kg` : null) })}
            {row('Taille (cm)', 'height', { type: edit ? 'number' : 'text', display: (v) => (v ? `${v} cm` : null) })}
          </dl>
        </Card>

        <Card darkMode={darkMode} className={edit ? (darkMode ? 'border-red-900' : 'border-red-200') : ''}>
          <CardTitle Icon={Siren}>Contact d’urgence</CardTitle>
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-5">
            {row('Nom', 'eName')}
            {row('Lien', 'eRel')}
            {row('Téléphone', 'ePhone', { Icon: Smartphone, type: 'tel' })}
          </dl>
        </Card>
      </div>
    </div>
  );
}
