import NovaSelect from '../../components/NovaSelect.jsx';
import React, { useState, useEffect } from 'react';
import { User, Calendar, Smartphone, Mail, MapPin, Heart, Edit3, Save, X, Siren, FileDown, Camera, Trash2, IdCard } from 'lucide-react';
import { confirmDialog } from '../../components/dialogs.jsx';
import { patientApi } from '../../api/patientApi.js';
import { useUnsaved } from '../../unsaved.js';
import { PHOTO_ACCEPT, announcePhotoChange, preparePhoto, usePatientPhoto } from '../../utils/photo.js';
import { Button, Card, CardTitle, Chip, Field, PageHeader, inputClass } from '../../components/patient/ui.jsx';
import { ageFrom } from '../../utils/age.js';
import { sexLabel } from '../../utils/format.js';

/* Date de naissance en toutes lettres (« 14 mai 1950 »), sans décalage de fuseau. */
const fmtBirth = (value) => {
  if (!value) return null;
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
};
const fmtSex = (value) => sexLabel(value);

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

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
  const profileAge = ageFrom(d.birthDate);

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
    if (!(await confirmDialog({ title: 'Retirer votre photo de profil ?', message: 'Vos initiales seront affichées à la place. Vous pourrez ajouter une nouvelle photo à tout moment.', confirmLabel: 'Retirer la photo', danger: true }))) return;
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
        // Champ vidé = effacé côté serveur (chaîne vide ou null).
        firstName:             d.firstName.trim(),
        lastName:              d.lastName.trim(),
        birthDate:             d.birthDate || '',
        sex:                   ['M', 'F'].includes(d.sex) ? d.sex : '',
        bloodType:             BLOOD_TYPES.includes(d.bloodType) ? d.bloodType : '',
        email:                 d.email.trim(),
        address:               d.address.trim(),
        city:                  d.city.trim(),
        weightKg:              Number(d.weight) > 0 ? Number(d.weight) : null,
        heightCm:              Number(d.height) > 0 ? Number(d.height) : null,
        emergencyName:         d.eName.trim(),
        emergencyRelationship: d.eRel.trim(),
        emergencyPhone:        d.ePhone.trim(),
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
            <NovaSelect darkMode={darkMode} value={d.sex} onChange={(e) => setD({ ...d, sex: e.target.value })} className={inputCls}>
              <option value="">—</option>
              <option value="M">Homme</option>
              <option value="F">Femme</option>
              {d.sex && !['M', 'F'].includes(d.sex) && <option value={d.sex}>{d.sex}</option>}
            </NovaSelect>
          ) : key === 'bloodType' ? (
            <NovaSelect darkMode={darkMode} value={d.bloodType} onChange={(e) => setD({ ...d, bloodType: e.target.value })} className={inputCls}>
              <option value="">Non renseigné</option>
              {BLOOD_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
            </NovaSelect>
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
            <div>
              <Field label="Téléphone (identifiant de connexion)" Icon={Smartphone}>{d.phone || null}</Field>
              {edit && <p className={`text-xs mt-1 ${sub}`}>Pour changer de numéro, demandez-le à votre médecin ou à l’administrateur NOVA.</p>}
            </div>
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
