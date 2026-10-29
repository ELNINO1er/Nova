import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Activity, AlertCircle, AlertTriangle, Check, CheckCircle2, ChevronRight,
  Clock, ClipboardList, FileText, Package, Pill, QrCode, Search,
  ShieldCheck, Stethoscope, User, X, Camera, Scan
} from 'lucide-react';
import { pharmacyApi } from '../api/pharmacyApi.js';
import PageError from '../components/PageError.jsx';
import {
  Avatar, ColumnChart, DashHeader, Empty, GhostButton, KpiCard, LinkButton, MiniCalendar, Panel, PERIODS, PERIOD_TEXT,
  PrimaryButton, Segmented, StatusChip, bucketize, dayKey, fmtDay, fmtTime,
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
    <div className="space-y-5">
      {notice && (
        <div className={`fixed right-5 top-20 z-[70] rounded-xl border px-4 py-3 text-xs font-bold shadow-xl
          ${notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
          {notice.message}
        </div>
      )}

      {apiError[page] && !apiData[page] ? (
        <PageError message={apiError[page]} onRetry={() => loadPage(page, true)} card={card} sub={sub} />
      ) : (<>
      {page === 'dashboard' && <PhDashboard data={apiData.dashboard} loading={apiLoading.dashboard} setPage={setPage} notify={notify} {...p} />}
      {page === 'scan'      && <PhScan notify={notify} setPage={setPage} {...p} />}
      {page === 'history'   && <PhHistory data={apiData.history} loading={apiLoading.history} {...p} />}
      {page === 'settings'  && <PhSettings data={apiData.settings} loading={apiLoading.settings} {...p} />}
      </>)}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PARAMÈTRES PHARMACIE
   ═══════════════════════════════════════════════════════════════ */
function PhSettings({ data, loading, card, sub, border, darkMode }) {
  if (loading && !data) return <PhSkeleton darkMode={darkMode} card={card} />;
  const ph = data?.pharmacy || {};

  return (
    <div className="space-y-5">
      <div className={`${card} border rounded-2xl p-5`}>
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" /> Informations de l'officine
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <InfoCell label="Nom" value={ph.name} sub={sub} />
          <InfoCell label="Ville" value={ph.city} sub={sub} />
          <InfoCell label="Téléphone" value={ph.phone} sub={sub} />
          <InfoCell label="Adresse" value={ph.address} sub={sub} />
        </div>
      </div>

      <div className={`${card} border rounded-2xl p-5`}>
        <h3 className="font-bold mb-2 flex items-center gap-2">
          <User className="w-5 h-5 text-emerald-600" /> Compte
        </h3>
        <p className={`text-sm ${sub}`}>
          La gestion du compte et des préférences de l'officine sera disponible prochainement.
          Pour toute modification, contactez l'administrateur.
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD PHARMACIE
   ═══════════════════════════════════════════════════════════════ */
function PhDashboard({ data, loading, setPage, card, sub, darkMode }) {
  const [dispenses, setDispenses] = useState([]);
  const [period, setPeriod] = useState('week');
  useEffect(() => {
    let alive = true;
    pharmacyApi.dispenses().then((r) => alive && setDispenses(Array.isArray(r) ? r : r?.data || [])).catch(() => {});
    return () => { alive = false; };
  }, []);

  // Délivrances regroupées selon la période choisie.
  const series = useMemo(() => bucketize(dispenses.filter((x) => x.dispensedAt).map((x) => x.dispensedAt), period), [dispenses, period]);
  const marked = useMemo(() => new Set(dispenses.map((x) => dayKey(x.dispensedAt))), [dispenses]);

  if (loading || !data) return <PhSkeleton darkMode={darkMode} card={card} />;
  const partial = dispenses.filter((x) => x.status === 'partial').length;
  const full = dispenses.filter((x) => x.status === 'full').length;
  const fullRate = dispenses.length ? Math.round((full / dispenses.length) * 100) : null;

  return (
    <div className="space-y-5">
      <DashHeader
        title={data.pharmacy?.name || 'Pharmacie'}
        subtitle={[data.pharmacy?.city, data.pharmacy?.phone].filter(Boolean).join(' · ') || 'Tableau de bord officine'}
        actions={<>
          <GhostButton Icon={ClipboardList} onClick={() => setPage('history')} darkMode={darkMode}>Historique</GhostButton>
          <PrimaryButton Icon={Scan} onClick={() => setPage('scan')}>Scanner une ordonnance</PrimaryButton>
        </>}
      />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        <div className="xl:col-span-2 space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Aujourd’hui" Icon={Pill} value={data.todayDispenses ?? 0} hint="Délivrances du jour" card={card} sub={sub} />
            <KpiCard label="Total" Icon={Package} value={data.totalDispenses ?? 0} hint="Depuis l’ouverture" onClick={() => setPage('history')} card={card} sub={sub} />
            <KpiCard label="Partielles" Icon={AlertTriangle} value={partial} chip={partial ? 'À compléter' : null} chipTone="warn" hint="Ordonnances à finir" onClick={() => setPage('history')} card={card} sub={sub} />
            <KpiCard label="Taux complet" Icon={CheckCircle2} value={fullRate ?? '—'} unit={fullRate != null ? '%' : undefined} hint="Délivrances complètes" card={card} sub={sub} />
          </div>
          <Panel title="Activité des délivrances" subtitle={`${series.reduce((s, d) => s + d.value, 0)} délivrance(s) ${PERIOD_TEXT[period]}`} action={<Segmented options={PERIODS} value={period} onChange={setPeriod} darkMode={darkMode} />} card={card} sub={sub}>
            <ColumnChart key={period} data={series} valueLabel="délivrance(s)" height="13rem" darkMode={darkMode} />
          </Panel>
          <Panel title="Dernières délivrances" action={<LinkButton onClick={() => setPage('history')}>Tout voir</LinkButton>} card={card} sub={sub}>
            {(data.recentDispenses || []).length === 0 ? <Empty sub={sub}>Aucune délivrance pour le moment.</Empty> : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm">
                  <thead><tr className={`text-xs ${sub} ${darkMode ? 'bg-slate-800/60' : 'bg-red-50/60'}`}>
                    <th className="text-left font-semibold px-3 py-2.5 rounded-l-lg">Patient</th>
                    <th className="text-left font-semibold px-3 py-2.5">Date</th>
                    <th className="text-left font-semibold px-3 py-2.5 rounded-r-lg">Statut</th>
                  </tr></thead>
                  <tbody>{data.recentDispenses.slice(0, 6).map((d) => (
                    <tr key={d.id} className={`border-b last:border-0 ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                      <td className="px-3 py-3"><span className="flex items-center gap-2.5"><Avatar name={d.patientName} size="sm" /><span className="font-medium">{d.patientName}</span></span></td>
                      <td className={`px-3 py-3 whitespace-nowrap ${sub}`}>{fmtDay(d.dispensedAt)} · {fmtTime(d.dispensedAt)}</td>
                      <td className="px-3 py-3"><StatusChip status={d.status} /></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
        <div className="space-y-5">
          <section className="rounded-2xl p-6 bg-gradient-to-br from-red-600 to-red-800 text-white relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" aria-hidden="true" />
            <QrCode className="w-8 h-8" />
            <h3 className="font-bold text-lg mt-3">Délivrer une ordonnance</h3>
            <p className="text-sm text-red-100 mt-1">Scannez le QR code de l’ordonnance du patient pour vérifier son authenticité et la délivrer.</p>
            <button type="button" onClick={() => setPage('scan')} className="mt-4 w-full min-h-11 rounded-xl bg-white text-red-700 font-semibold text-sm hover:bg-red-50">Ouvrir le scanner</button>
          </section>
          <Panel title="Calendrier" subtitle="Les points indiquent les jours de délivrance" card={card} sub={sub}>
            <MiniCalendar marked={marked} darkMode={darkMode} />
          </Panel>
          <Panel title="Répartition" card={card} sub={sub}>
            {[['Complètes', full, 'bg-red-600'], ['Partielles', partial, 'bg-red-300']].map(([l, n, c]) => (
              <div key={l} className="mb-3 last:mb-0">
                <div className="flex justify-between text-sm"><span>{l}</span><span className="font-semibold">{n}</span></div>
                <div className={`h-2 rounded-full mt-1.5 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}><div className={`h-full rounded-full ${c}`} style={{ width: `${dispenses.length ? (n / dispenses.length) * 100 : 0}%` }} /></div>
              </div>
            ))}
          </Panel>
        </div>
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
    const notes=status==='refused'?window.prompt('Motif du refus :'):null;
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
          <Scan className="w-5 h-5 text-emerald-600" /> Vérifier une ordonnance
        </h3>
        <div className="flex gap-3">
          <input ref={inputRef} type="text" value={prescriptionId} onChange={e => setPrescriptionId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && verify()}
            placeholder="Scanner ou coller le token QR ordonnance..."
            className={`flex-1 px-4 py-3 rounded-xl border text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'} focus:outline-none focus:ring-2 focus:ring-emerald-500`}
          />
          <button onClick={verify} disabled={loading}
            className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm flex items-center gap-2 hover:bg-emerald-700 disabled:opacity-50">
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
              verification.verification.canDispense ? 'bg-emerald-100 text-emerald-700'
              : verification.verification.expired ? 'bg-red-100 text-red-700'
              : 'bg-amber-100 text-amber-700'
            }`}>
              {verification.verification.canDispense ? '✓ Valide — dispensable'
              : verification.verification.expired ? '✗ Expirée'
              : verification.verification.alreadyFull ? '✗ Déjà délivrée'
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
            <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-xs text-amber-800 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Dernière délivrance : {verification.lastDispense.status === 'full' ? 'Complète' : 'Partielle'} le {new Date(verification.lastDispense.dispensedAt).toLocaleDateString('fr-FR')}
              </p>
            </div>
          )}

          {/* Authentification */}
          <div className="grid grid-cols-3 gap-3 mb-4">
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
            <Pill className="w-5 h-5 text-emerald-600" /> Médicaments prescrits ({detail.items.length})
          </h3>

          <div className="space-y-3 mb-6">
            {detail.items.map((item, idx) => (
              <div key={item.id} className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="flex items-start justify-between gap-3">
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

          <div className="flex gap-3">
            <button onClick={() => doDispense('full')} disabled={dispensing || detail.items.some(i=>i.remaining==null)}
              className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-50">
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
        <ClipboardList className="w-5 h-5 text-emerald-600" /> Historique des délivrances
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
                ${d.status === 'full' ? 'bg-emerald-500' : d.status === 'partial' ? 'bg-amber-500' : 'bg-red-500'}`}>
                {d.status === 'full' ? <Check className="w-5 h-5" /> : d.status === 'partial' ? <Clock className="w-5 h-5" /> : <X className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{d.patientName}</p>
                <p className={`text-xs ${sub}`}>{d.cmuNumber} • Dr. {d.doctorName}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold
                  ${d.status === 'full' ? 'bg-emerald-100 text-emerald-700' : d.status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
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
    <div className={`flex items-center gap-2 p-3 rounded-lg ${ok
      ? 'bg-emerald-50 border border-emerald-200'
      : 'bg-red-50 border border-red-200'}`}>
      {ok
        ? <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
        : <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />}
      <span className={`text-xs font-bold ${ok ? 'text-emerald-700' : 'text-red-700'}`}>{label}</span>
    </div>
  );
}

function PhSkeleton({ darkMode, card }) {
  const block = darkMode ? 'bg-slate-700' : 'bg-slate-200';
  return (
    <div className="space-y-4 animate-pulse">
      <div className={`h-32 rounded-2xl ${darkMode ? 'bg-emerald-900' : 'bg-emerald-100'}`}></div>
      <div className="grid grid-cols-3 gap-4">
        {[0,1,2].map(i => <div key={i} className={`${card} border rounded-2xl p-5 h-28`}><div className={`${block} h-10 w-10 rounded-lg mb-3`}></div><div className={`${block} h-4 w-16`}></div></div>)}
      </div>
    </div>
  );
}
