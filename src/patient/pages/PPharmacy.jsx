import React, { useState } from 'react';
import { MapPin, Phone, Pill, ClipboardList, Siren, X, Clock } from 'lucide-react';
import { patientApi } from '../../api/patientApi.js';
import { PageHeader, Card, Pills, Chip, Button, IconButton, IconBadge, StatTile, EmptyState, SearchInput, Highlight, NoResults } from '../../components/patient/ui.jsx';
import { useSearch, useUrlQuery } from '../../utils/search.js';

/* Champs cherchables : nom, ville, adresse, garde / ouverture, téléphone. */
const FIELDS = (p) => [p.name, p.city, p.address, p.isDuty ? 'de garde pharmacie de garde' : '', p.isOpen ? 'ouvert ouverte' : 'fermé fermée', p.phone];

export default function PPharmacy({ data, card, sub, border, darkMode, notify }) {
  const [search, setSearch] = useUrlQuery();
  const [scope, setScope] = useState('all'); // 'all' | 'open' | 'duty'
  const [selectedPh, setSelectedPh] = useState(null);
  const [orders, setOrders] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [tab, setTab] = useState('list'); // 'list' | 'orders'

  const pharmacies = data || [];

  const results = useSearch(pharmacies, search, FIELDS);
  const filtered = scope === 'open' ? results.filter((p) => p.isOpen) : scope === 'duty' ? results.filter((p) => p.isDuty) : results;

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

  const submitOrder = async (pharmacyId) => {
    setOrderLoading(true);
    try {
      await patientApi.createPharmacyOrder({ pharmacyId });
      notify('Commande envoyée à la pharmacie !');
      setShowOrderModal(false);
      setSelectedPh(null);
      loadOrders();
    } catch (e) {
      notify(e.message || 'Erreur lors de la commande', 'error');
    } finally {
      setOrderLoading(false);
    }
  };

  /* Prêt à récupérer = action attendue (rouge plein) ; en préparation = à suivre (rouge pâle). */
  const statusTone = { pending: 'watch', ready: 'alert', delivered: 'neutral', cancelled: 'neutral' };
  const statusLabels = {
    pending:   'En préparation',
    ready:     'Prêt à récupérer',
    delivered: 'Livré',
    cancelled: 'Annulé',
  };

  const divider = darkMode ? 'border-slate-800' : 'border-slate-100';

  return (
    <div className="space-y-5">
      <PageHeader title="Pharmacie connectée" subtitle="Annuaire des pharmacies ; stock et distance non vérifiés" sub={sub} />

      <Pills darkMode={darkMode} value={tab}
        onChange={(id) => (id === 'orders' ? handleTabOrders() : setTab('list'))}
        options={[['list', 'Pharmacies', pharmacies.length], ['orders', 'Mes commandes', orders ? orders.length : undefined]]} />

      {tab === 'list' && (
        <>
          <div className="grid grid-cols-3 gap-3 sm:gap-5">
            <StatTile label="Ouvertes" value={results.filter(p => p.isOpen).length} Icon={Clock} darkMode={darkMode} onClick={() => setScope('open')} />
            <StatTile label="De garde" value={results.filter(p => p.isDuty).length} Icon={Siren} highlight darkMode={darkMode} onClick={() => setScope('duty')} />
            <StatTile label="Total" value={results.length} Icon={MapPin} darkMode={darkMode} onClick={() => setScope('all')} />
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <SearchInput value={search} onChange={setSearch} darkMode={darkMode} count={filtered.length} className="flex-1 min-w-0"
              placeholder="Pharmacie, ville, quartier, « de garde »…" label="Rechercher une pharmacie" />
            <Pills darkMode={darkMode} value={scope} onChange={setScope}
              options={[['all', 'Toutes', results.length], ['open', 'Ouvertes', results.filter(p => p.isOpen).length], ['duty', 'De garde', results.filter(p => p.isDuty).length]]} />
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
                        <Chip tone={ph.isOpen ? 'watch' : 'neutral'}>
                          <Clock className="w-3 h-3" />{ph.isOpen ? `Ouvert · ${ph.opensAt}–${ph.closesAt}` : 'Fermé'}
                        </Chip>
                      </div>
                      <p className={`text-xs mt-2 flex items-start gap-1.5 ${sub}`}><MapPin className="w-3 h-3 shrink-0 mt-0.5" /><span className="min-w-0 break-words"><Highlight text={ph.address} query={search} /></span></p>
                      <p className={`text-xs ${sub}`}><Highlight text={ph.city} query={search} /> · Distance non calculée</p>
                    </div>
                  </div>
                  <div className={`mt-4 pt-4 border-t ${divider} flex items-center gap-2 flex-wrap`}>
                    <a href={`tel:${ph.phone}`} aria-label={`Appeler ${ph.name}`}
                      className={`h-9 px-4 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 border transition-colors ${darkMode ? 'border-red-900 text-red-300 hover:bg-red-950/40' : 'border-red-200 bg-white text-red-700 hover:bg-red-50'}`}>
                      <Phone className="w-3.5 h-3.5" />{ph.phone}
                    </a>
                    <button type="button" disabled title="Transmission aux officines non intégrée"
                      className={`h-9 px-4 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 border border-dashed cursor-not-allowed ${darkMode ? 'border-slate-700 text-slate-500' : 'border-slate-200 bg-white text-slate-400'}`}>
                      <Pill className="w-3.5 h-3.5" /> Commande indisponible
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
            <EmptyState Icon={ClipboardList} title="Aucune commande" darkMode={darkMode}
              action={<Button onClick={() => setTab('list')} Icon={MapPin}>Trouver une pharmacie</Button>}>
              Vos commandes passées en pharmacie apparaîtront ici.
            </EmptyState>
          ) : (
            <Card darkMode={darkMode} className="!p-0 overflow-hidden">
              <ul>
                {orders.map((o, i) => (
                  <li key={o.id} className={`p-4 sm:px-5 flex items-center gap-4 ${i ? `border-t ${divider}` : ''} ${o.status === 'ready' ? 'border-l-4 border-l-red-600' : ''}`}>
                    <IconBadge Icon={Pill} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{o.pharmacyName}</p>
                      <p className={`text-xs truncate ${sub}`}>{o.pharmacyAddress}</p>
                      <p className={`text-xs ${sub}`}>{new Date(o.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    </div>
                    <Chip tone={statusTone[o.status] || 'neutral'}>{statusLabels[o.status] || o.status}</Chip>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {/* Fenêtre de commande */}
      {showOrderModal && selectedPh && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/50 p-4" onClick={() => setShowOrderModal(false)}>
          <div className={`rounded-3xl border p-6 w-full max-w-md shadow-xl ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/70'}`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Commander</h3>
              <IconButton Icon={X} label="Fermer" onClick={() => setShowOrderModal(false)} darkMode={darkMode} />
            </div>
            <div className={`p-4 rounded-2xl border mb-4 ${darkMode ? 'border-slate-800' : 'border-red-100'}`}>
              <p className="font-semibold">{selectedPh.name}</p>
              <p className={`text-xs ${sub}`}>{selectedPh.address}</p>
              <p className={`text-xs ${sub}`}>Distance non calculée · {selectedPh.phone}</p>
            </div>
            <p className={`text-xs ${sub} mb-4`}>La pharmacie recevra votre demande et préparera vos médicaments. Vous serez notifié quand la commande sera prête.</p>
            <Button onClick={() => submitOrder(selectedPh.id)} disabled={orderLoading} className="w-full !h-11">
              {orderLoading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Envoi…</>
                : <><Pill className="w-4 h-4" /> Confirmer la commande</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
