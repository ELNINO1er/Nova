import NovaSelect from '../components/NovaSelect.jsx';
import React, { useState, useEffect, useRef } from 'react';
import {
  Activity, AlertCircle, ArrowUpRight, Building2, CalendarDays, AlertTriangle, Check, CheckCircle2, ChevronRight,
  Clock, ClipboardList, FileText, Package, Pill, QrCode, Search,
  ShieldCheck, Stethoscope, User, X, Camera, Scan
} from 'lucide-react';
import { promptDialog } from '../components/dialogs.jsx';
import { pharmacyApi } from '../api/pharmacyApi.js';
import PageError from '../components/PageError.jsx';
import PhOrders from './PhOrders.jsx';
import SettingsPage from '../patient/pages/SettingsPage.jsx';
import { PageHeader } from '../components/patient/ui.jsx';
import {
  Empty, dayKey, fmtDay, fmtTime, initialsOf,
} from '../components/dashboard/kit.jsx';

export default function PharmacyPages({ page, setPage, card, sub, border, darkMode }) {
  const [apiData, setApiData] = useState({});
  const [apiLoading, setApiLoading] = useState({});
  const [apiError, setApiError] = useState({});
  const [notice, setNotice] = useState(null);
  const p = { card, sub, border, darkMode };

  const notify = (msg, type = 'success') => {
    setNotice({ message: msg, type });
    setTimeout(() => setNotice(null), 3500);
  };

  const loadPage = (key, force = false) => {
    const loaders = {
      dashboard: pharmacyApi.dashboard,
      settings:  pharmacyApi.dashboard,
      history:   pharmacyApi.dispenses,
    };
    const load = loaders[key];
    if (!load || (!force && apiData[key])) return;
    setApiLoading(c => ({ ...c, [key]: true }));
    setApiError(c => ({ ...c, [key]: null }));
    load()
      .then(data => setApiData(c => ({ ...c, [key]: data })))
      .catch(err => { setApiError(c => ({ ...c, [key]: err.message })); notify(err.message, 'error'); })
      .finally(() => setApiLoading(c => ({ ...c, [key]: false })));
  };

  useEffect(() => { loadPage(page,true); }, [page]);
  useEffect(()=>{const update=()=>{setApiData({});loadPage(page,true);};window.addEventListener('nova:data-changed',update);window.addEventListener('focus',update);return()=>{window.removeEventListener('nova:data-changed',update);window.removeEventListener('focus',update);};},[page]);

  return (
    <div data-theme={darkMode ? 'dark' : 'light'} className="group space-y-5">
      {notice && (
        <div className={`fixed right-5 top-20 z-[70] rounded-xl border px-4 py-3 text-xs font-bold shadow-xl
          ${notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
          {notice.message}
        </div>
      )}

      {page !== 'dashboard' && <PageHeader title={{ orders: 'Ordonnances reçues', scan: 'Scanner une ordonnance', history: 'Historique des délivrances', settings: 'Mon officine' }[page]}
        sub={sub} actions={page === 'history' && <PhLink onClick={() => setPage('scan')}>Scanner une ordonnance</PhLink>} />}
      {apiError[page] && !apiData[page] ? (
        <PageError message={apiError[page]} onRetry={() => loadPage(page, true)} card={card} sub={sub} />
      ) : (<>
      {page === 'dashboard' && <PhDashboard data={apiData.dashboard} setPage={setPage} {...p} />}
      {page === 'orders'    && <PhOrders notify={notify} setPage={setPage} />}
      {page === 'scan'      && <PhScan notify={notify} setPage={setPage} {...p} />}
      {page === 'history'   && <PhHistory data={apiData.history} loading={apiLoading.history} {...p} />}
      {page === 'settings'  && <PhSettings data={apiData.settings} loading={apiLoading.settings} setPage={setPage} {...p} />}
      </>)}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PARAMÈTRES PHARMACIE
   ═══════════════════════════════════════════════════════════════ */
function PhSettings({ data, loading, card, sub, border, darkMode, setPage }) {
  if (loading && !data) return <PhSkeleton darkMode={darkMode} card={card} />;
  const ph = data?.pharmacy || {};

  return (
    <div className="space-y-5">
      <div className={`${card} border rounded-2xl p-5`}>
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-red-600" /> Informations de l'officine
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <InfoCell label="Nom" value={ph.name} sub={sub} />
          <InfoCell label="Ville" value={ph.city} sub={sub} />
          <InfoCell label="Téléphone" value={ph.phone} sub={sub} />
          <InfoCell label="Adresse" value={ph.address} sub={sub} />
        </div>
      </div>

      <p className={`text-xs ${sub}`}>Pour modifier le nom, l’adresse, le téléphone ou les horaires de l’officine, contactez l’administrateur NOVA.</p>
      {/* Sécurité du compte : mêmes réglages que les autres professionnels. */}
      <SettingsPage api={pharmacyApi} card={card} sub={sub} darkMode={darkMode} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD PHARMACIE
   ═══════════════════════════════════════════════════════════════ */
const dispenseLabels = { full: 'Complète', partial: 'Partielle', refused: 'Refusée' };
const phNumber = new Intl.NumberFormat('fr-FR');
const phWeekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });
const phDayLabel = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' });
const phSurface = 'min-w-0 rounded-xl border border-red-100 bg-white group-data-[theme=dark]:border-slate-800 group-data-[theme=dark]:bg-slate-900';
const phTint = 'border-red-100 bg-red-50/70 group-data-[theme=dark]:border-slate-800 group-data-[theme=dark]:bg-slate-950/70';
const phRed = 'text-red-700 group-data-[theme=dark]:text-red-300';

function PhPanel({ title, Icon, action, className = '', children }) {
  return (
    <section className={`${phSurface} p-4 ${className}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold"><Icon size={17} className={phRed} aria-hidden="true" />{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function PhLink({ children, onClick }) {
  return <button type="button" onClick={onClick} className={`inline-flex min-h-8 items-center gap-1 text-xs font-semibold hover:underline ${phRed}`}>
    {children}<ArrowUpRight size={13} aria-hidden="true" />
  </button>;
}

function DispenseStatus({ status }) {
  const emphasis = status === 'full' ? 'bg-red-700 text-white' : 'bg-red-50 text-red-800 ring-1 ring-inset ring-red-200';
  return <span className={`inline-block rounded-full px-2 py-1 text-[11px] font-semibold ${emphasis}`}>{dispenseLabels[status] || 'Statut inconnu'}</span>;
}

function PhDashboard({ data, setPage, card, sub, darkMode }) {
  const [date, setDate] = useState(null);
  const [status, setStatus] = useState('all');
  if (!data) return <PhSkeleton darkMode={darkMode} card={card} />;
  const office = data.pharmacy;
  const recent = data.recentDispenses || [];
  const currentDate = new Date();
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(currentDate);
    day.setDate(day.getDate() + index - 6);
    return day;
  });
  const marked = new Set(recent.filter(row => row.dispensedAt).map(row => dayKey(row.dispensedAt)));
  const byDate = date ? recent.filter(row => dayKey(row.dispensedAt) === date) : recent;
  const filtered = status === 'all' ? byDate : byDate.filter(row => row.status === status);
  const counts = data.dispenseCounts || {};
  const metrics = [
    { label: 'Délivrances du jour', value: data.todayDispenses, Icon: CalendarDays },
    { label: 'Délivrances enregistrées', value: data.totalDispenses, Icon: Package },
    { label: 'Délivrances partielles', value: counts.partial, Icon: Pill },
  ];

  return (
    <div data-theme={darkMode ? 'dark' : 'light'} className="group space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-gradient-to-r from-red-800 to-red-600 px-5 py-5 text-white sm:px-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-red-100">Tableau de bord</p>
          <h1 className="break-words text-xl font-bold sm:text-2xl">{office?.name || 'Espace pharmacie'}</h1>
          {office?.city && <p className="mt-1 text-xs text-red-100">{office.city}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setPage('history')} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/60 px-3 text-sm font-semibold hover:bg-white/15"><ClipboardList size={16} aria-hidden="true" /> Historique</button>
          <button type="button" onClick={() => setPage('scan')} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold text-red-800 hover:bg-red-50"><Scan size={16} aria-hidden="true" /> Scanner une ordonnance</button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {metrics.map(({ label, value, Icon }) => (
          <div key={label} className={`flex items-center gap-3 p-3 ${phSurface}`}>
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-red-100 text-red-800"><Icon size={19} aria-hidden="true" /></span>
            <span className="min-w-0"><span className={`block text-xs ${sub}`}>{label}</span><strong className="text-xl tabular-nums">{value == null ? '—' : phNumber.format(value)}</strong></span>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <PhPanel title="Activité de l’officine" Icon={CalendarDays} action={<PhLink onClick={() => setPage('history')}>Historique</PhLink>}>
          <div className="grid grid-cols-7 gap-1" aria-label="Filtrer les dernières délivrances par jour">
            {days.map(day => {
              const key = dayKey(day);
              const active = date === key;
              return <button key={key} type="button" aria-label={phDayLabel.format(day)} aria-pressed={active} onClick={() => setDate(active ? null : key)}
                className={`min-h-12 min-w-0 rounded-lg border px-0.5 py-1 text-center ${active ? 'border-red-700 bg-red-700 text-white' : phTint}`}>
                <span className="block text-[10px] capitalize">{phWeekday.format(day)}</span>
                <strong className="block text-xs">{day.getDate()}</strong>
                {marked.has(key) && <span className={`mx-auto mt-0.5 block size-1 rounded-full ${active ? 'bg-white' : 'bg-red-600'}`} />}
              </button>;
            })}
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className={`text-xs ${sub}`}>{date ? fmtDay(date) : 'Dernières délivrances'}</p>
            {date && <PhLink onClick={() => setDate(null)}>Retirer le filtre</PhLink>}
          </div>
          {byDate.length ? <ul className="mt-2 space-y-2">
            {byDate.slice(0, 3).map(row => <li key={row.id} className={`flex min-w-0 items-center gap-2 rounded-lg border p-2.5 ${phTint}`}>
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-red-100 text-[11px] font-bold text-red-800">{initialsOf(row.patientName || '')}</span>
              <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{row.patientName}</p><p className={`text-[11px] ${sub}`}>{fmtDay(row.dispensedAt)} · {fmtTime(row.dispensedAt)}</p></div>
              <DispenseStatus status={row.status} />
            </li>)}
          </ul> : <Empty sub={sub}>{date ? 'Aucune délivrance récente pour cette date.' : 'Aucune délivrance enregistrée.'}</Empty>}
        </PhPanel>

        <PhPanel title="Dernières délivrances" Icon={ClipboardList} action={
          <NovaSelect darkMode={darkMode} aria-label="Filtrer par statut" value={status} onChange={event => setStatus(event.target.value)}
            className={`max-w-full rounded-lg border px-2 py-2 text-xs ${phTint}`}>
            <option value="all">Tous les statuts</option>
            {Object.entries(dispenseLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </NovaSelect>
        }>
          {filtered.length ? <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead><tr className={`border-b border-red-100 ${sub}`}><th scope="col" className="p-2">Patient</th><th scope="col" className="p-2">Délivrée le</th><th scope="col" className="p-2">Statut</th></tr></thead>
              <tbody className="divide-y divide-red-100 group-data-[theme=dark]:divide-slate-800">
                {filtered.slice(0, 5).map(row => <tr key={row.id}>
                  <td className="break-words p-2 font-semibold">{row.patientName}</td><td className={`p-2 ${sub}`}>{fmtDay(row.dispensedAt)} · {fmtTime(row.dispensedAt)}</td><td className="p-2"><DispenseStatus status={row.status} /></td>
                </tr>)}
              </tbody>
            </table>
          </div> : <Empty sub={sub}>{recent.length ? 'Aucune délivrance ne correspond aux filtres.' : 'Les délivrances apparaîtront après enregistrement.'}</Empty>}
          <PhLink onClick={() => setPage('history')}>Voir l’historique complet</PhLink>
        </PhPanel>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <PhPanel title="Répartition des délivrances" Icon={Activity}>
          <dl className="space-y-2">
            {Object.entries(dispenseLabels).map(([key, label]) => <div key={key} className={`flex justify-between rounded-lg border p-2.5 text-xs ${phTint}`}>
              <dt>{label}</dt><dd className={`font-bold tabular-nums ${phRed}`}>{counts[key] == null ? '—' : phNumber.format(counts[key])}</dd>
            </div>)}
          </dl>
        </PhPanel>
        <PhPanel title="Mon officine" Icon={Building2} action={<PhLink onClick={() => setPage('settings')}>Informations</PhLink>}>
          <p className="text-sm font-semibold">{office?.name || 'Officine'}</p>
          {[office?.address, office?.city, office?.phone].filter(Boolean).map((value, index) => <p key={index} className={`mt-1 break-words text-xs ${sub}`}>{value}</p>)}
        </PhPanel>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SCAN & VÉRIFICATION ORDONNANCE
   ═══════════════════════════════════════════════════════════════ */
function PhScan({ notify, setPage, card, sub, border, darkMode }) {
  const [prescriptionId, setPrescriptionId] = useState('');
  const [verification, setVerification] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dispensing, setDispensing] = useState(false);
  const [dispenseItems, setDispenseItems] = useState([]);
  const inputRef = useRef(null);
  const operation = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const verify = async () => {
    if (!prescriptionId.trim()) return;
    setLoading(true);
    setVerification(null);
    setDetail(null);
    try {
      const v = await pharmacyApi.verifyPrescription(prescriptionId.trim());
      setVerification(v);
      if (v.verification.canDispense) {
        const d = await pharmacyApi.prescription(v.id, prescriptionId.trim());
        setDetail(d);
        setDispenseItems(d.items.map(i => ({ prescriptionItemId: i.id, quantityDispensed: i.remaining ?? 0, substituted: false, name: i.name })));
      }
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const doDispense = async (status) => {
    if(dispensing) return;
    const notes=status==='refused'?await promptDialog({title:'Refuser la délivrance',message:'Le motif sera visible par le patient et le prescripteur.',label:'Motif du refus',multiline:true,maxLength:500,required:true,confirmLabel:'Refuser la délivrance'}):null;
    if(status==='refused'&&!notes?.trim()) return;
    const lines=dispenseItems.filter(i=>i.quantityDispensed>0).map(({name,...rest})=>rest);
    const fingerprint=JSON.stringify({id:verification?.id,status,lines,notes});
    if(operation.current?.fingerprint!==fingerprint) operation.current={fingerprint,key:crypto.randomUUID()};
    setDispensing(true);
    try {
      await pharmacyApi.dispense({
        prescriptionId: verification?.id,
        requestKey:operation.current.key, notes:notes||undefined,
        qrToken: prescriptionId.trim(),
        status,
        items: status==='refused'?[]:lines,
      });
      notify('Opération enregistrée ; le statut est calculé selon les quantités délivrées.');
      setVerification(null);
      setDetail(null);
      setPrescriptionId(''); operation.current=null;
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setDispensing(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-2">
        <button onClick={() => setPage('dashboard')} className={`text-xs font-semibold ${sub} flex items-center gap-1`}>
          ← Retour
        </button>
      </div>

      {/* Saisie ID ordonnance */}
      <div className={`${card} border rounded-2xl p-6`}>
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Scan className="w-5 h-5 text-red-600" /> Vérifier une ordonnance
        </h3>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input ref={inputRef} type="text" value={prescriptionId} onChange={e => setPrescriptionId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && verify()}
            placeholder="Scanner ou coller le token QR ordonnance..."
            className={`min-w-0 flex-1 px-4 py-3 rounded-xl border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'} focus:outline-none focus:ring-2 focus:ring-red-500`}
          />
          <button onClick={verify} disabled={loading}
            className="px-6 py-3 rounded-xl bg-red-600 text-white font-bold text-sm flex items-center gap-2 hover:bg-red-700 disabled:opacity-50">
            {loading ? <Clock className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Vérifier
          </button>
        </div>
      </div>

      {/* Résultat vérification */}
      {verification && (
        <div className={`${card} border rounded-2xl p-6`}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-bold text-lg">{verification.patientName}</h3>
              <p className={`text-sm ${sub}`}>CMU : {verification.cmuNumber || 'masque'}</p>
            </div>
            <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${
              verification.verification.canDispense ? 'bg-emerald-100 text-emerald-800'
              : 'bg-red-100 text-red-800'
            }`}>
              {verification.verification.canDispense ? '✓ Valide — dispensable'
              : verification.verification.expired ? '✗ Expirée'
              : verification.verification.alreadyFull ? '✗ Déjà délivrée'
              : verification.status === 'cancelled' ? '✗ Annulée'
              : verification.verification.quantitiesMissing ? '✗ Quantités prescrites manquantes'
              : '✗ Non dispensable'}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <InfoCell label="Prescripteur" value={verification.doctorName} sub={sub} />
            <InfoCell label="Spécialité" value={verification.doctorSpecialty} sub={sub} />
            <InfoCell label="Émise le" value={verification.issuedAt ? new Date(verification.issuedAt).toLocaleDateString('fr-FR') : '—'} sub={sub} />
            <InfoCell label="Valide jusqu'au" value={verification.validUntil ? new Date(verification.validUntil).toLocaleDateString('fr-FR') : 'Illimitée'} sub={sub} />
          </div>

          {verification.lastDispense && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-xs text-red-800 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Dernière opération : {dispenseLabels[verification.lastDispense.status] === 'Refusée' ? 'délivrance refusée' : `délivrance ${(dispenseLabels[verification.lastDispense.status] || '').toLowerCase()}`} le {new Date(verification.lastDispense.dispensedAt).toLocaleDateString('fr-FR')}
              </p>
            </div>
          )}

          {/* Authentification */}
          <div className="grid grid-cols-1 gap-2 mb-4 sm:grid-cols-3">
            <StatusBadge ok={verification.verification.authentic} label="Authenticité" darkMode={darkMode} />
            <StatusBadge ok={!verification.verification.expired} label="Non expirée" darkMode={darkMode} />
            <StatusBadge ok={!verification.verification.alreadyFull} label="Non délivrée" darkMode={darkMode} />
          </div>
        </div>
      )}

      {/* Détail médicaments + délivrance */}
      {detail && verification?.verification.canDispense && (
        <div className={`${card} border rounded-2xl p-6`}>
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Pill className="w-5 h-5 text-red-600" /> Médicaments prescrits ({detail.items.length})
          </h3>

          <div className="space-y-3 mb-6">
            {detail.items.map((item, idx) => (
              <div key={item.id} className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-bold text-sm">{item.name}</p>
                    <p className={`text-xs ${sub} mt-0.5`}>
                      {[item.dosage, item.frequency, item.duration].filter(Boolean).join(' • ')}
                    </p>
                    <p className={`text-xs ${sub}`}>Prescrit : {item.quantityPrescribed ?? "Non renseigné"} {item.quantityUnit} · Restant : {item.remaining ?? "À confirmer par le prescripteur"}</p>
                    {item.instructions && <p className={`text-xs ${sub} mt-1 italic`}>{item.instructions}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <label className={`text-xs ${sub}`}>Qté</label>
                    <input type="number" min="0" max={item.remaining ?? 0} disabled={item.remaining==null} value={dispenseItems[idx]?.quantityDispensed ?? 0}
                      onChange={e => {
                        const next = [...dispenseItems];
                        next[idx] = { ...next[idx], quantityDispensed: parseInt(e.target.value) || 0 };
                        setDispenseItems(next);
                      }}
                      className={`w-16 px-2 py-1 rounded-lg border text-sm text-center ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button onClick={() => doDispense('full')} disabled={dispensing || detail.items.some(i=>i.remaining==null)}
              className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-700 disabled:opacity-50">
              <CheckCircle2 className="w-4 h-4" /> Délivrance complète
            </button>
            <button onClick={() => doDispense('partial')} disabled={dispensing || detail.items.some(i=>i.remaining==null)}
              className={`flex-1 px-4 py-3 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 ${darkMode ? 'border-slate-700' : 'border-slate-300'} disabled:opacity-50`}>
              <Clock className="w-4 h-4" /> Délivrance partielle
            </button><button type="button" onClick={()=>doDispense('refused')} disabled={dispensing} className="px-4 py-2 border rounded-xl text-red-700">Refuser (motif obligatoire)</button>
            <button onClick={() => { setVerification(null); setDetail(null); setPrescriptionId(''); }}
              className="px-4 py-3 rounded-xl bg-red-50 text-red-600 font-bold text-sm flex items-center justify-center gap-2 border border-red-200 hover:bg-red-100">
              <X className="w-4 h-4" /> Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HISTORIQUE DÉLIVRANCES
   ═══════════════════════════════════════════════════════════════ */
function PhHistory({ data, loading, card, sub, border, darkMode }) {
  if (loading && !data) return <PhSkeleton darkMode={darkMode} card={card} />;
  const items = data || [];

  return (
    <div className={`${card} border rounded-2xl p-5`}>
      <h3 className="font-bold mb-4 flex items-center gap-2">
        <ClipboardList className="w-5 h-5 text-red-600" /> Historique des délivrances
      </h3>
      {items.length === 0 ? (
        <div className="py-12 text-center">
          <Package className={`w-12 h-12 mx-auto ${sub} mb-3`} />
          <p className={`text-sm font-semibold ${sub}`}>Aucune délivrance enregistrée</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(d => (
            <div key={d.id} className={`flex items-center gap-3 p-3 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0
                ${d.status === 'full' ? 'bg-emerald-600' : d.status === 'partial' ? 'bg-amber-500' : 'bg-slate-500'}`}>
                {d.status === 'full' ? <Check className="w-5 h-5" /> : d.status === 'partial' ? <Clock className="w-5 h-5" /> : <X className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{d.patientName}</p>
                <p className={`text-xs ${sub}`}>{[d.cmuNumber && `CMU ${d.cmuNumber}`, d.doctorName && `Prescrite par ${d.doctorName}`].filter(Boolean).join(' • ')}</p>
                {d.status === 'refused' && d.notes && <p className={`text-xs ${sub} mt-0.5`}>Motif : {d.notes}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold
                  ${d.status === 'full' ? 'bg-emerald-100 text-emerald-800' : d.status === 'partial' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'}`}>
                  {d.status === 'full' ? 'Complète' : d.status === 'partial' ? 'Partielle' : 'Refusée'}
                </span>
                <p className={`text-[10px] ${sub} mt-1`}>
                  {new Date(d.dispensedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Helpers ───────────────────────────────────────────────────── */

function InfoCell({ label, value, sub }) {
  return (
    <div>
      <p className={`text-[10px] font-bold uppercase ${sub}`}>{label}</p>
      <p className="text-sm font-semibold mt-0.5">{value || '—'}</p>
    </div>
  );
}

function StatusBadge({ ok, label, darkMode }) {
  return (
    <div className={`flex items-center gap-2 p-3 rounded-lg border ${ok
      ? 'bg-emerald-50 border-emerald-200'
      : 'bg-red-50 border-red-300'}`}>
      {ok
        ? <ShieldCheck className="w-4 h-4 text-emerald-700 flex-shrink-0" aria-hidden="true" />
        : <AlertCircle className="w-4 h-4 text-red-700 flex-shrink-0" aria-hidden="true" />}
      <span className={`text-xs font-bold ${ok ? 'text-emerald-800' : 'text-red-800'}`}>{label} : {ok ? 'oui' : 'non'}</span>
    </div>
  );
}

function PhSkeleton({ darkMode, card }) {
  const block = darkMode ? 'bg-slate-700' : 'bg-slate-200';
  return (
    <div className="space-y-4 animate-pulse">
      <div className={`h-32 rounded-2xl ${darkMode ? 'bg-red-900' : 'bg-red-100'}`}></div>
      <div className="grid grid-cols-3 gap-4">
        {[0,1,2].map(i => <div key={i} className={`${card} border rounded-2xl p-5 h-28`}><div className={`${block} h-10 w-10 rounded-lg mb-3`}></div><div className={`${block} h-4 w-16`}></div></div>)}
      </div>
    </div>
  );
}
