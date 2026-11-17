import React, { useEffect, useState } from 'react';
import { MapPin, Phone, Pill, ClipboardList, Siren, X, Clock } from 'lucide-react';
import { patientApi } from '../../api/patientApi.js';
import { PageHeader, Card, Pills, Chip, Button, IconButton, IconBadge, StatTile, EmptyState, SearchInput, Highlight, NoResults } from '../../components/patient/ui.jsx';
import { useSearch, useUrlQuery } from '../../utils/search.js';
import SendPrescriptionDialog from '../../components/pharmacy/SendPrescriptionDialog.jsx';
import { confirmDialog } from '../../components/dialogs.jsx';
import { useRealtime } from '../../realtime/socket.js';
import { useLocation } from 'react-router-dom';
import { openNow } from '../../utils/pharmacyHours.js';

/* Champs cherchables : nom, ville, adresse, garde / ouverture, téléphone. */
const FIELDS = (p) => [p.name, p.city, p.address, p.isDuty ? 'de garde pharmacie de garde' : '', openNow(p) ? 'ouvert ouverte' : 'fermé fermée', p.phone];

export default function PPharmacy({ data, card, sub, border, darkMode, notify, setPage }) {
  const [search, setSearch] = useUrlQuery();
  const [scope, setScope] = useState('all'); // 'all' | 'open' | 'duty'
  const [selectedPh, setSelectedPh] = useState(null);
  const [orders, setOrders] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  // Arrivée depuis une notification de pharmacie : onglet du suivi directement.
  const location = useLocation();
  const [tab, setTab] = useState(location.state?.targetId === 'orders' ? 'orders' : 'list'); // 'list' | 'orders'

  const pharmacies = data || [];

  const results = useSearch(pharmacies, search, FIELDS);
  const filtered = scope === 'open' ? results.filter(openNow) : scope === 'duty' ? results.filter((p) => p.isDuty) : results;

  const loadOrders = async () => {
    try {
      const o = await patientApi.pharmacyOrders();
      setOrders(o);
    } catch { setOrders([]); }
  };

  const handleTabOrders = () => {
    setTab('orders');
    if (!orders) loadOrders();
  };

  // Commandes chargées d'emblée (compteur de l'onglet) puis à chaque réponse d'une pharmacie.
  useEffect(() => { loadOrders(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useRealtime('pharmacy-order:changed', () => loadOrders());

  const cancelOrder = async (o) => {
    if (!(await confirmDialog({ title: 'Annuler la demande ?', message: `${o.pharmacyName} ne préparera pas cette ordonnance. Vous pourrez l’envoyer à une autre pharmacie.`, confirmLabel: 'Annuler la demande', cancelLabel: 'Garder', danger: true }))) return;
    try { await patientApi.cancelPharmacyOrder(o.id); notify('Demande annulée.'); loadOrders(); }
    catch (e) { notify(e.message || 'Annulation impossible.', 'error'); }
  };

  /* Prête à retirer = action attendue (rouge plein) ; envoyée = à suivre. */
  const statusTone = { pending: 'watch', ready: 'alert', unavailable: 'alert', dispensed: 'neutral', cancelled: 'neutral' };
  const statusLabels = {
    pending:     'Envoyée · en attente',
    ready:       'Prête à retirer',
    unavailable: 'Indisponible',
    dispensed:   'Délivrée',
    cancelled:   'Annulée',
  };
  const openOrders = (orders || []).filter((o) => ['pending', 'ready', 'unavailable'].includes(o.status)).length;

  const divider = darkMode ? 'border-slate-800' : 'border-slate-100';

  return (
    <div className="space-y-5">
      <PageHeader title="Pharmacies" subtitle="Envoyez une ordonnance à préparer ; stocks et distances non vérifiés" sub={sub} />

      <Pills darkMode={darkMode} value={tab}
        onChange={(id) => (id === 'orders' ? handleTabOrders() : setTab('list'))}
        options={[['list', 'Pharmacies', pharmacies.length], ['orders', 'Mes ordonnances envoyées', orders ? openOrders : undefined]]} />

      {tab === 'list' && (
        <>
          <div className="grid grid-cols-3 gap-3 sm:gap-5">
            <StatTile label="Ouvertes" value={results.filter(openNow).length} Icon={Clock} darkMode={darkMode} onClick={() => setScope('open')} />
            <StatTile label="De garde" value={results.filter(p => p.isDuty).length} Icon={Siren} highlight darkMode={darkMode} onClick={() => setScope('duty')} />
            <StatTile label="Total" value={results.length} Icon={MapPin} darkMode={darkMode} onClick={() => setScope('all')} />
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <SearchInput value={search} onChange={setSearch} darkMode={darkMode} count={filtered.length} className="flex-1 min-w-0"
              placeholder="Pharmacie, ville, quartier, « de garde »…" label="Rechercher une pharmacie" />
            <Pills darkMode={darkMode} value={scope} onChange={setScope}
              options={[['all', 'Toutes', results.length], ['open', 'Ouvertes', results.filter(openNow).length], ['duty', 'De garde', results.filter(p => p.isDuty).length]]} />
          </div>

          {filtered.length === 0 ? (
            search && results.length === 0
              ? <NoResults query={search} onClear={() => setSearch('')} darkMode={darkMode} />
              : <EmptyState Icon={MapPin} title="Aucune pharmacie trouvée" darkMode={darkMode}
                  action={scope !== 'all' ? <Button variant="secondary" darkMode={darkMode} onClick={() => setScope('all')}>Voir toutes les pharmacies</Button> : null}>
                  {scope !== 'all' ? 'Aucune pharmacie ne correspond à ce filtre.' : 'L’annuaire des pharmacies est vide pour le moment.'}
                </EmptyState>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5">
              {filtered.map(ph => (
                <Card key={ph.id} darkMode={darkMode} className={`flex flex-col ${ph.isDuty ? '!border-red-200' : ''}`}>
                  <div className="flex items-start gap-4 flex-1">
                    <IconBadge Icon={ph.isDuty ? Siren : MapPin} solid={ph.isDuty} size="lg" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold break-words"><Highlight text={ph.name} query={search} /></p>
                      <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                        {ph.isDuty && <Chip tone="alert">De garde</Chip>}
                        <Chip tone={openNow(ph) ? 'watch' : 'neutral'}>
                          <Clock className="w-3 h-3" />{openNow(ph) ? `Ouverte${ph.opensAt && ph.closesAt ? ` · ${ph.opensAt}–${ph.closesAt}` : ''}` : `Fermée${ph.opensAt && ph.closesAt ? ` · ${ph.opensAt}–${ph.closesAt}` : ''}`}
                        </Chip>
                      </div>
                      <p className={`text-xs mt-2 flex items-start gap-1.5 ${sub}`}><MapPin className="w-3 h-3 shrink-0 mt-0.5" /><span className="min-w-0 break-words"><Highlight text={ph.address} query={search} /></span></p>
                      <p className={`text-xs ${sub}`}><Highlight text={ph.city} query={search} /> · Distance non calculée</p>
                    </div>
                  </div>
                  <div className={`mt-4 pt-4 border-t ${divider} flex items-center gap-2 flex-wrap`}>
                    {ph.phone && <a href={`tel:${ph.phone.replace(/\s/g, '')}`} aria-label={`Appeler ${ph.name}`}
                      className={`h-9 px-4 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 border transition-colors ${darkMode ? 'border-red-900 text-red-300 hover:bg-red-950/40' : 'border-red-200 bg-white text-red-700 hover:bg-red-50'}`}>
                      <Phone className="w-3.5 h-3.5" />{ph.phone}
                    </a>}
                    <button type="button" onClick={() => { setSelectedPh(ph); setShowOrderModal(true); }}
                      className="h-9 px-4 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 bg-red-600 text-white hover:bg-red-700">
                      <Pill className="w-3.5 h-3.5" /> Envoyer une ordonnance
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'orders' && (
        <div className="space-y-3">
          {!orders ? (
            <Card darkMode={darkMode}>
              <div className={`animate-pulse h-28 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-red-50/60'}`} />
            </Card>
          ) : orders.length === 0 ? (
            <EmptyState Icon={ClipboardList} title="Aucune ordonnance envoyée" darkMode={darkMode}
              action={<Button onClick={() => setTab('list')} Icon={MapPin}>Choisir une pharmacie</Button>}>
              Envoyez une ordonnance à une pharmacie : elle prépare vos médicaments et vous prévient quand vous pouvez passer.
            </EmptyState>
          ) : (
            <Card darkMode={darkMode} className="!p-0 overflow-hidden">
              <ul>
                {orders.map((o, i) => (
                  <li key={o.id} className={`p-4 sm:px-5 flex items-start gap-4 ${i ? `border-t ${divider}` : ''} ${o.status === 'ready' ? 'border-l-4 border-l-red-600' : ''}`}>
                    <IconBadge Icon={Pill} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm">{o.pharmacyName}</p>
                        <Chip tone={statusTone[o.status] || 'neutral'}>{statusLabels[o.status] || o.status}</Chip>
                      </div>
                      <p className={`text-xs ${sub}`}>Ordonnance du {o.prescriptionDoctor} · {o.itemCount} médicament{o.itemCount > 1 ? 's' : ''} · envoyée le {new Date(o.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}</p>
                      {o.pharmacistMessage && <p className={`mt-2 text-sm rounded-xl px-3 py-2 ${darkMode ? 'bg-slate-800' : 'bg-red-50/70'}`}><span className="font-semibold">Message de la pharmacie : </span>{o.pharmacistMessage}</p>}
                      {o.status === 'ready' && <p className="mt-2 text-xs font-semibold text-red-700">Passez à la pharmacie et présentez le QR code de l’ordonnance au comptoir.</p>}
                      {o.status === 'pending' && <p className={`mt-2 text-xs ${sub}`}>La pharmacie prépare votre ordonnance ; vous serez prévenu dès qu’elle est prête.</p>}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {['ready', 'pending'].includes(o.status) && setPage && <Button darkMode={darkMode} onClick={() => setPage('prescriptions', o.prescriptionId)}>Afficher le QR de l’ordonnance</Button>}
                        {o.pharmacyPhone && ['pending', 'ready', 'unavailable'].includes(o.status) && <a href={`tel:${o.pharmacyPhone}`} className={`h-10 px-4 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 border ${darkMode ? 'border-slate-700' : 'border-red-200 text-red-700'}`}><Phone className="w-3.5 h-3.5" />Appeler</a>}
                        {['pending', 'ready', 'unavailable'].includes(o.status) && <Button variant="secondary" darkMode={darkMode} onClick={() => cancelOrder(o)}>Annuler la demande</Button>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {showOrderModal && selectedPh && (
        <SendPrescriptionDialog pharmacyId={selectedPh.id} darkMode={darkMode} onClose={() => setShowOrderModal(false)}
          onSent={(o) => { setShowOrderModal(false); setSelectedPh(null); notify(`Ordonnance envoyée à ${o?.pharmacyName || 'la pharmacie'}.`); loadOrders(); setTab('orders'); }} />
      )}
    </div>
  );
}
