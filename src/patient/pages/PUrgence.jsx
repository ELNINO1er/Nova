import React, { useState } from 'react';
import { AlertTriangle, Shield, Siren, Download, PhoneCall, Pill, QrCode, ShieldAlert, HeartPulse, Phone, UserRound } from 'lucide-react';
import { patientApi } from '../../api/patientApi.js';
import { PageHeader, Card, Chip, Button } from '../../components/patient/ui.jsx';

export default function PUrgence({ data, card, sub, border, darkMode }) {
  const [showQR, setShowQR]   = useState(false);
  const [qrData, setQrData]   = useState(null);
  const [loadQR, setLoadQR]   = useState(false);

  const urgenceNumbers = [
    // Numéros d'urgence de Côte d'Ivoire.
    { label: 'SAMU',     number: '185', hint: 'Urgence médicale', icon: PhoneCall },
    { label: 'Police',   number: '170', hint: 'Secours et sécurité', icon: Shield },
    { label: 'Pompiers', number: '180', hint: 'Incendie, accident', icon: Siren },
  ];

  const fetchQR = async () => {
    setLoadQR(true);
    try {
      const d = await patientApi.emergencyCardQr();
      setQrData(d);
      setShowQR(true);
    } catch (e) {
      alert('Erreur QR : ' + e.message);
    } finally {
      setLoadQR(false);
    }
  };

  const handlePrint = () => window.print();

  if (!data) return (
    <div className="space-y-5">
      <PageHeader title="SOS Urgence" sub={sub} />
      <Card darkMode={darkMode}>
        <div className={`animate-pulse h-48 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-red-50'}`} />
      </Card>
    </div>
  );

  const age = data.birthDate
    ? Math.floor((Date.now() - new Date(data.birthDate)) / (365.25 * 86400000))
    : null;

  const sexLabel = data.sex === 'M' ? 'Homme' : data.sex === 'F' ? 'Femme' : data.sex;
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
            <p className={`text-xs mt-1 mb-4 ${sub}`}>Scannez en cas d'urgence pour accéder aux infos vitales</p>
            <div className="mx-auto w-fit p-3 rounded-2xl border border-red-100 bg-white">
              <img src={qrData.qr} alt="QR Urgence" className="w-48 h-48" />
            </div>
            <p className={`text-xs mt-3 ${sub}`}>{data.firstName} {data.lastName} · {data.bloodType || '?'} · {data.phone}</p>
            <div className="flex gap-2 mt-5">
              <Button Icon={Download} onClick={handlePrint} darkMode={darkMode} className="flex-1">Imprimer</Button>
              <Button variant="secondary" onClick={() => setShowQR(false)} darkMode={darkMode} className="flex-1">Fermer</Button>
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
          {urgenceNumbers.map(({ label, number, hint, icon: Icon }) => (
            <a key={label} href={`tel:${number}`} aria-label={`Appeler ${label} au ${number}`}
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
              {age && <p className={`text-sm mt-1 ${sub}`}>{age} ans · {sexLabel}</p>}
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
        </dl>
      </Card>

      <p className={`text-xs ${sub}`}>
        Présentez cette fiche ou son QR code aux secours. Mettez-la à jour depuis votre profil et votre ADN médical.
      </p>
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
