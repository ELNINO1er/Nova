import HeartLoader from '../../components/HeartLoader.jsx';
import { createPortal } from 'react-dom';
import React, { useEffect, useState } from 'react';
import { AlertTriangle, Shield, Siren, Printer, PhoneCall, Pill, QrCode, ShieldAlert, HeartPulse, Phone, UserRound } from 'lucide-react';
import { alertDialog, confirmDialog } from '../../components/dialogs.jsx';
import { patientApi } from '../../api/patientApi.js';
import { PageHeader, Card, Chip, Button } from '../../components/patient/ui.jsx';
import { EMERGENCY_NUMBERS, telHref } from '../../utils/emergency.js';
import { ageFrom } from '../../utils/age.js';
import { sexLabel } from '../../utils/format.js';
import { useEscape } from '../../utils/useEscape.js';

const EMERGENCY_ICONS = { samu: PhoneCall, pompiers: Siren, police: Shield, gendarmerie: Shield };

export default function PUrgence({ data, card, sub, border, darkMode }) {
  const [showQR, setShowQR]   = useState(false);
  useEscape(showQR, () => setShowQR(false));
  const [qrData, setQrData]   = useState(null);
  const [loadQR, setLoadQR]   = useState(false);

  // Numéros d'urgence de Côte d'Ivoire (source : src/utils/emergency.js).
  const urgenceNumbers = EMERGENCY_NUMBERS.map(n => ({ ...n, icon: EMERGENCY_ICONS[n.id] || PhoneCall }));

  // Carte perdue ou photo partagée : un nouveau QR rend l'ancien inutilisable.
  const renewQR = async () => {
    const ok = await confirmDialog({ title: 'Changer de QR code ?', message: 'L’ancien QR (cartes imprimées, photos) ne fonctionnera plus. Pensez à réimprimer votre carte.', confirmLabel: 'Changer de QR code', danger: true });
    if (!ok) return;
    try { await patientApi.renewEmergencyQr(); setQrData(await patientApi.emergencyCardQr()); }
    catch (e) { alertDialog({ title: 'QR code non modifié', message: e.message || 'Réessayez dans un instant.' }); }
  };

  const fetchQR = async () => {
    setLoadQR(true);
    try {
      const d = await patientApi.emergencyCardQr();
      setQrData(d);
      setShowQR(true);
    } catch (e) {
      alertDialog({ title: 'QR code indisponible', message: e.message || 'Réessayez dans un instant.' });
    } finally {
      setLoadQR(false);
    }
  };

  // Impression : une carte d'urgence dédiée (avec le QR) est rendue hors de la page, puis retirée après l'impression.
  const [printing, setPrinting] = useState(false);
  const handlePrint = () => setPrinting(true);
  useEffect(() => {
    if (!printing) return undefined;
    const done = () => setPrinting(false);
    window.addEventListener('afterprint', done);
    const t = setTimeout(() => window.print(), 250);
    return () => { clearTimeout(t); window.removeEventListener('afterprint', done); };
  }, [printing]);

  if (!data) return <HeartLoader darkMode={darkMode} />;

  const age = ageFrom(data.birthDate);

  const sexText = sexLabel(data.sex);
  const empty = (txt) => <p className={`text-sm ${sub}`}>{txt}</p>;

  return (
    <div className="space-y-5">
      {/* QR modal */}
      {showQR && qrData && (
        <>
          <button type="button" className="fixed inset-0 z-40 bg-slate-950/50" onClick={() => setShowQR(false)} aria-label="Fermer" />
          <Card darkMode={darkMode} role="dialog" aria-modal="true" aria-labelledby="purgence-qr-title"
            className="fixed z-50 left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 shadow-2xl text-center">
            <p id="purgence-qr-title" className="font-semibold">QR Code — Fiche Urgence</p>
            <p className={`text-xs mt-1 mb-4 ${sub}`}>Scannez-le avec l’appareil photo d’un téléphone : la fiche d’urgence s’ouvre, sans compte NOVA.</p>
            <div className="mx-auto w-fit p-3 rounded-2xl border border-red-100 bg-white">
              <img src={qrData.qr} alt="QR Urgence" className="w-48 h-48" />
            </div>
            <p className={`text-xs mt-3 ${sub}`}>{data.firstName} {data.lastName} · {data.bloodType || '?'} · {data.phone}</p>
            <div className="flex gap-2 mt-5">
              <Button Icon={Printer} onClick={handlePrint} darkMode={darkMode} className="flex-1">Imprimer</Button>
              <Button variant="secondary" onClick={() => setShowQR(false)} darkMode={darkMode} className="flex-1">Fermer</Button>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs font-semibold">
              {qrData.url && <a href={qrData.url} target="_blank" rel="noreferrer" className="text-red-700 underline underline-offset-2">Voir la fiche publique</a>}
              <button type="button" onClick={renewQR} className={`underline underline-offset-2 ${sub}`}>Changer de QR code</button>
            </div>
          </Card>
        </>
      )}

      <PageHeader title="SOS Urgence" sub={sub}
        subtitle="Fiche médicale d'urgence · Accès immédiat"
        actions={
          <Button variant="secondary" onClick={fetchQR} disabled={loadQR} darkMode={darkMode}>
            {loadQR
              ? <span className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
              : <QrCode className="w-4 h-4" />}
            QR Code
          </Button>
        } />

      {/* Numéros d'urgence : actions principales */}
      <section aria-labelledby="purgence-numbers">
        <h3 id="purgence-numbers" className="text-sm font-semibold mb-3">Appeler les secours</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5">
          {urgenceNumbers.map(({ label, number, hint, icon: Icon }) => (
            <a key={label} href={telHref(number)} aria-label={`Appeler ${label} au ${number}`}
              className="group rounded-3xl bg-red-600 hover:bg-red-700 active:bg-red-700 text-white p-5 flex items-center sm:flex-col sm:items-start gap-4 transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-red-300">
              <span className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                <Icon className="w-6 h-6" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-4xl font-bold leading-none tabular-nums">{number}</span>
                <span className="block mt-1.5 text-sm font-semibold">{label}</span>
                <span className="block text-xs text-red-100">{hint}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-white text-red-700 text-xs font-semibold shrink-0">
                <Phone className="w-3.5 h-3.5" /> Appeler
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* Fiche médicale d'urgence : l'essentiel en un coup d'œil */}
      <Card darkMode={darkMode} className="!p-0 overflow-hidden !border-red-200" aria-labelledby="purgence-card">
        <div className={`px-5 pt-5 pb-4 border-b ${darkMode ? 'border-slate-800' : 'border-red-100'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <span id="purgence-card" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-600">
              <ShieldAlert className="w-4 h-4" /> Fiche urgence · NOVA
            </span>
            {data.cmuNumber && <span className={`text-xs font-mono break-all ${sub}`}>{data.cmuNumber}</span>}
          </div>
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-2xl font-bold tracking-tight break-words">{data.firstName} {data.lastName}</p>
              {(age != null || sexText) && <p className={`text-sm mt-1 ${sub}`}>{[age != null ? `${age} an${age > 1 ? 's' : ''}` : null, sexText].filter(Boolean).join(' · ')}</p>}
            </div>
            <div className="rounded-2xl bg-red-600 text-white px-4 py-2 text-center shrink-0">
              <p className="text-[11px] font-medium text-red-100">Groupe sanguin</p>
              <p className="text-3xl font-bold leading-tight">{data.bloodType || '?'}</p>
            </div>
          </div>
        </div>

        <dl className={`grid grid-cols-1 md:grid-cols-2 ${darkMode ? 'divide-slate-800' : 'divide-red-100'} divide-y md:divide-y-0`}>
          <MedSection Icon={AlertTriangle} label="Allergies" count={data.allergies?.length} darkMode={darkMode} className="md:border-r md:border-b">
            {data.allergies?.length ? (
              <div className="flex flex-wrap gap-1.5">
                {data.allergies.map((a, i) => <Chip key={i} tone="alert">{a}</Chip>)}
              </div>
            ) : empty('Aucune allergie connue')}
          </MedSection>

          <MedSection Icon={HeartPulse} label="Maladies chroniques" count={data.chronicDiseases?.length} darkMode={darkMode} className="md:border-b">
            {data.chronicDiseases?.length ? (
              <div className="flex flex-wrap gap-1.5">
                {data.chronicDiseases.map((d, i) => <Chip key={i} tone="watch">{d}</Chip>)}
              </div>
            ) : empty('Aucune maladie chronique')}
          </MedSection>

          <MedSection Icon={Pill} label="Traitements en cours" count={data.currentMedications?.length} darkMode={darkMode} className="md:border-r">
            {data.currentMedications?.length ? (
              <ul className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-red-100'}`}>
                {data.currentMedications.map((m, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0 text-sm">
                    <span className="font-medium min-w-0 break-words">{m.name}</span>
                    <span className={`text-xs shrink-0 ${sub}`}>{m.dosage}</span>
                  </li>
                ))}
              </ul>
            ) : empty('Aucun traitement en cours')}
          </MedSection>

          <MedSection Icon={UserRound} label="Contact d'urgence" darkMode={darkMode}>
            {data.emergencyContact?.name ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold break-words">{data.emergencyContact.name}</p>
                  <p className={`text-xs mt-0.5 ${sub}`}>{data.emergencyContact.relationship}</p>
                  <p className="text-sm mt-1 tabular-nums">{data.emergencyContact.phone}</p>
                </div>
                <a href={`tel:${data.emergencyContact.phone}`} aria-label={`Appeler ${data.emergencyContact.name}`}
                  className="h-10 px-4 rounded-full bg-red-600 hover:bg-red-700 text-white text-sm font-semibold inline-flex items-center gap-2 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-300">
                  <PhoneCall className="w-4 h-4" /> Appeler
                </a>
              </div>
            ) : empty('Aucun contact renseigné')}
          </MedSection>

          {data.surgicalHistory?.length > 0 && (
            <MedSection Icon={Shield} label="Antécédents chirurgicaux" count={data.surgicalHistory.length} darkMode={darkMode} className="md:col-span-2 md:border-t">
              <div className="flex flex-wrap gap-1.5">{data.surgicalHistory.map((x, i) => <Chip key={i}>{x}</Chip>)}</div>
            </MedSection>
          )}
        </dl>
      </Card>

      <p className={`text-xs ${sub}`}>
        Présentez cette fiche ou son QR code aux secours. Mettez-la à jour depuis Identité et Infos médicales.
      </p>
      {printing && qrData && createPortal(
        <div className="print-root bg-white text-slate-900 p-6">
          <div className="max-w-xl mx-auto border-2 border-red-600 rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-red-700">Fiche d’urgence · NOVA</p>
                <p className="text-2xl font-bold mt-1">{data.firstName} {data.lastName}</p>
                <p className="text-sm">{[age != null ? `${age} an${age > 1 ? 's' : ''}` : null, sexText].filter(Boolean).join(' · ')}</p>
                <p className="mt-3 text-sm">Groupe sanguin : <strong className="text-xl text-red-700">{data.bloodType || 'non renseigné'}</strong></p>
              </div>
              <div className="text-center shrink-0">
                <img src={qrData.qr} alt="QR d’urgence" className="w-36 h-36" />
                <p className="text-[10px] mt-1">Scanner avec un téléphone</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div><p className="font-bold">Allergies</p><p>{data.allergies?.length ? data.allergies.join(', ') : 'Aucune connue'}</p></div>
              <div><p className="font-bold">Maladies chroniques</p><p>{data.chronicDiseases?.length ? data.chronicDiseases.join(', ') : 'Aucune connue'}</p></div>
              <div><p className="font-bold">Traitements en cours</p><p>{data.currentMedications?.length ? data.currentMedications.map((m) => [m.name, m.dosage].filter(Boolean).join(' ')).join(', ') : 'Aucun'}</p></div>
              <div><p className="font-bold">Personne à prévenir</p><p>{data.emergencyContact?.phone ? `${data.emergencyContact.name || ''} ${data.emergencyContact.phone}`.trim() : 'Non renseignée'}</p></div>
            </div>
            <p className="mt-4 text-xs">{EMERGENCY_NUMBERS.map((n) => `${n.label} ${n.number}`).join(' · ')} — Informations déclarées, à confirmer cliniquement.</p>
          </div>
        </div>, document.body)}
    </div>
  );
}

/* Rubrique de la fiche : intitulé (avec nombre d'éléments) et contenu. */
function MedSection({ Icon, label, count, children, darkMode, className = '' }) {
  return (
    <div className={`p-5 min-w-0 ${darkMode ? 'md:border-slate-800' : 'md:border-red-100'} ${className}`}>
      <dt className="flex items-center justify-between gap-2 mb-3">
        <span className="text-sm font-semibold flex items-center gap-2"><Icon className="w-4 h-4 text-red-600 shrink-0" />{label}</span>
        {count > 0 && <span className="text-[11px] font-semibold text-red-700 bg-red-50 rounded-full px-2 py-0.5">{count}</span>}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}
