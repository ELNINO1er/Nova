import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Droplet, HeartPulse, Phone, Pill, ShieldAlert, User } from 'lucide-react';

// Fiche d'urgence ouverte en scannant le QR du patient : sans compte, lisible d'un coup d'œil par un secouriste.
export default function EmergencyPublic() {
  const { token } = useParams();
  const [card, setCard] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Fiche d’urgence — NOVA';
    const meta = document.createElement('meta');
    meta.name = 'robots'; meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    fetch(`/api/public/emergency/${encodeURIComponent(token || '')}`, { credentials: 'omit', cache: 'no-store' })
      .then(async (r) => { const body = await r.json().catch(() => ({})); if (!r.ok) throw new Error(body.message || 'Fiche indisponible.'); return body; })
      .then(setCard)
      .catch((e) => setError(e.message || 'Fiche indisponible.'));
    return () => meta.remove();
  }, [token]);

  const Section = ({ Icon, title, items, emptyText, alert }) => (
    <section className={`rounded-2xl border p-4 ${alert && items.length ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'}`}>
      <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-700"><Icon className={`w-4 h-4 ${alert && items.length ? 'text-red-600' : 'text-slate-500'}`} />{title}</h2>
      {items.length
        ? <ul className="mt-2 space-y-1">{items.map((x, i) => <li key={i} className={`text-base ${alert ? 'font-semibold text-red-800' : 'text-slate-900'}`}>{x}</li>)}</ul>
        : <p className="mt-2 text-sm text-slate-500">{emptyText}</p>}
    </section>
  );

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-red-600 text-white px-4 py-4">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <ShieldAlert className="w-7 h-7 shrink-0" />
          <div>
            <p className="text-lg font-bold leading-tight">Fiche d’urgence</p>
            <p className="text-xs text-red-100">NOVA · Carnet santé ivoirien</p>
          </div>
        </div>
      </header>
      <div className="max-w-xl mx-auto p-4 space-y-3">
        <a href="tel:185" className="flex items-center justify-center gap-2 h-12 rounded-2xl bg-slate-900 text-white font-semibold">
          <Phone className="w-5 h-5" /> Appeler le SAMU (185)
        </a>

        {!card && !error && <div className="h-40 rounded-2xl bg-white animate-pulse" role="status" aria-label="Chargement" />}
        {error && (
          <div role="alert" className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
            <AlertTriangle className="w-8 h-8 mx-auto text-amber-500" />
            <p className="mt-2 font-semibold">{error}</p>
            <p className="mt-1 text-sm text-slate-500">Le QR a peut-être été remplacé ou désactivé par son titulaire.</p>
          </div>
        )}

        {card && (
          <>
            <section className="rounded-2xl bg-white border border-slate-200 p-4 flex items-center gap-4">
              <span className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0"><User className="w-6 h-6" /></span>
              <div className="flex-1 min-w-0">
                <p className="text-xl font-bold leading-tight break-words">{card.firstName} {card.lastName}</p>
                <p className="text-sm text-slate-600">{[card.age != null ? `${card.age} ans` : null, card.sex].filter(Boolean).join(' · ') || 'Âge non renseigné'}</p>
              </div>
              <div className="text-center shrink-0">
                <Droplet className="w-5 h-5 mx-auto text-red-600" />
                <p className="text-2xl font-black text-red-700 leading-none mt-1">{card.bloodType || '?'}</p>
                <p className="text-[10px] uppercase text-slate-500 mt-1">Groupe</p>
              </div>
            </section>

            <Section Icon={AlertTriangle} title="Allergies" items={card.allergies} emptyText="Aucune allergie renseignée." alert />
            <Section Icon={HeartPulse} title="Maladies chroniques" items={card.chronicDiseases} emptyText="Aucune maladie chronique renseignée." />
            <Section Icon={Pill} title="Traitements en cours" items={card.currentMedications} emptyText="Aucun traitement en cours renseigné." />

            {card.emergencyContact && (
              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Personne à prévenir</h2>
                <p className="mt-2 text-base font-semibold">{card.emergencyContact.name || 'Contact'}{card.emergencyContact.relationship ? ` (${card.emergencyContact.relationship})` : ''}</p>
                <a href={`tel:${card.emergencyContact.phone.replace(/\s/g, '')}`} className="mt-3 flex items-center justify-center gap-2 h-12 rounded-2xl bg-red-600 text-white font-semibold">
                  <Phone className="w-5 h-5" /> Appeler {card.emergencyContact.phone}
                </a>
              </section>
            )}

            <p className="text-xs text-slate-500 text-center px-2">
              Informations déclarées par le patient et son équipe soignante, à confirmer cliniquement.
              Cette consultation est enregistrée et signalée au patient.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
