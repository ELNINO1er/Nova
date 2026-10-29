import {hasUnsavedData} from '../unsaved.js';
import React, { useEffect, useState, useRef } from 'react';
import { AlertCircle } from 'lucide-react';
import { patientApi } from '../api/patientApi.js';

import PDash from './pages/PDash.jsx';
import PProfile from './pages/PProfile.jsx';
import PPilulier from './pages/PPilulier.jsx';
import PTreatments from './pages/PTreatments.jsx';
import PRDV from './pages/PRDV.jsx';
import PVax from './pages/PVax.jsx';
import PDNA from './pages/PDNA.jsx';
import PLabResults from './pages/PLabResults.jsx';
import PHistory from './pages/PHistory.jsx';
import POrdonnances from './pages/POrdonnances.jsx';
import PVitals from './pages/PVitals.jsx';
import PDoctors from './pages/PDoctors.jsx';
import PNotifications from './pages/PNotifications.jsx';
import PUrgence from './pages/PUrgence.jsx';
import PAssistant from './pages/PAssistant.jsx';
import PWell from './pages/PWell.jsx';
import PMsg from './pages/PMsg.jsx';
import PDocs from './pages/PDocs.jsx';
import PNotes from './pages/PNotes.jsx';
import PInsurance from './pages/PInsurance.jsx';
import PPharmacy from './pages/PPharmacy.jsx';
import PFamily from './pages/PFamily.jsx';
import PPrivacy from './pages/PPrivacy.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

export { PMsg, PDocs, SettingsPage };

export default function PatientPages({ page, setPage, setShowQR, pills, setPills, setShowVid, onProfileSaved, onBadgesChange, card, sub, border, darkMode }) {
  const p = { card, sub, border, darkMode };
  const generations=useRef({});
  const [apiData, setApiData] = useState({});
  const [apiLoading, setApiLoading] = useState({});
  const [apiError, setApiError] = useState({}); // erreur de chargement par page
  const [pagination,setPagination]=useState({});
  const [notice, setNotice] = useState(null);

  const notify = (message, type = 'success') => {
    setNotice({ message, type });
    window.setTimeout(() => setNotice(null), 2600);
  };

  const loadPage = (pageKey, force = false, listPage = pagination[pageKey]?.page || 1) => {
    const loaders = {
      dashboard: patientApi.dashboard,
      profile: patientApi.profile,
      pilulier: patientApi.todayMedications,
      treatments: patientApi.treatments,
      rdv: patientApi.appointments,
      vaccinations: patientApi.vaccinations,
      history: patientApi.history,
      messages: patientApi.conversations,
      documents: patientApi.documents,
      notes: patientApi.notes,
      prescriptions: patientApi.prescriptions,
      labresults: patientApi.labResults,
      dna: patientApi.medicalProfile,
      vitals: patientApi.vitals,
      doctors: patientApi.doctors,
      notifications: patientApi.notifications,
      urgence: patientApi.emergencyCard,
      wellness: patientApi.wellnessGoals,
      insurance: patientApi.insurance,
      pharmacy: patientApi.pharmacies,
      family: patientApi.familyMembers,
      privacy: async () => {
        const [consents, accessLogs, careTeam] = await Promise.all([patientApi.consents(), patientApi.accessLogs(), patientApi.careTeam()]);
        return { consents, accessLogs, careTeam };
      },
      settings: patientApi.settings,
    };
    const load = loaders[pageKey];
    if (!load) return;
    if (!force && apiData[pageKey]) return;

    const generation=(generations.current[pageKey]||0)+1;generations.current[pageKey]=generation;
    setApiLoading((current) => ({ ...current, [pageKey]: true }));
    load({page:listPage})
      .then((raw) => {
        if(generations.current[pageKey]!==generation)return;
        // Déballe les enveloppes paginées { data:[...], pagination } en tableau,
        // pour un format de liste uniforme côté composants.
        const data = raw && !Array.isArray(raw) && Array.isArray(raw.data) && raw.pagination
          ? raw.data
          : raw;
        if(raw?.pagination)setPagination(current=>({...current,[pageKey]:raw.pagination}));
        setApiData((current) => ({ ...current, [pageKey]: data }));
        setApiError((current) => ({ ...current, [pageKey]: null }));
      })
      .catch((error) => {
        if(generations.current[pageKey]!==generation)return;
        setApiError((current) => ({ ...current, [pageKey]: error.message }));
      })
      .finally(() => {
        if(generations.current[pageKey]!==generation)return;
        setApiLoading((current) => ({ ...current, [pageKey]: false }));
      });
  };

  useEffect(() => {
    loadPage(page,true);
  }, [page]);

  useEffect(()=>{const update=()=>{for(const key of Object.keys(generations.current))generations.current[key]++;setApiData({});loadPage(page,true);};const focus=()=>{if(!hasUnsavedData())update();};window.addEventListener('nova:data-changed',update);window.addEventListener('focus',focus);return ()=>{window.removeEventListener('nova:data-changed',update);window.removeEventListener('focus',focus);};},[page]);

  const replacePageData = (key, value) => {
    setApiData((current) => ({ ...current, [key]: value }));
  };
  const replaceNotifications = (value) => {
    replacePageData('notifications', value);
    if (Array.isArray(value)) {
      onBadgesChange?.({ notifications: value.filter((n) => !n.isRead).length });
    }
  };
  const replaceMessages = (value) => {
    replacePageData('messages', value);
    if (Array.isArray(value)) {
      onBadgesChange?.({ messages: value.reduce((sum, c) => sum + Number(c.unreadCount || 0), 0) });
    }
  };
  const replacePageDataAndRefreshDashboard = (key, value) => {
    setApiData((current) => ({ ...current, [key]: value, dashboard: undefined }));
  };
  const refreshDashboard = () => loadPage('dashboard', true);
  const retryCurrentPage = () => loadPage(page, true);

  const map = {
    dashboard: <PDash data={apiData.dashboard} loading={apiLoading.dashboard} onRefresh={refreshDashboard} setPage={setPage} setShowQR={setShowQR} setShowVid={setShowVid} {...p} />,
    profile: <PProfile data={apiData.profile} onSaved={(value) => {
      replacePageData('profile', value);
      onProfileSaved?.(value);
      notify('Profil enregistré');
      setApiData((current) => ({
        ...current,
        profile: value,
        dashboard: current.dashboard ? { ...current.dashboard, profile: value } : current.dashboard,
      }));
    }} {...p} />,
    pilulier: <PPilulier data={apiData.pilulier} onReload={(value) => replacePageDataAndRefreshDashboard('pilulier', value)} notify={notify} pills={pills} setPills={setPills} {...p} />,
    treatments: <PTreatments data={apiData.treatments} {...p} />,
    rdv: <PRDV data={apiData.rdv} onReload={(value) => replacePageDataAndRefreshDashboard('rdv', value)} notify={notify} setShowVid={setShowVid} {...p} />,
    vaccinations: <PVax data={apiData.vaccinations} {...p} />,
    dna: <PDNA data={apiData.dna} profile={apiData.profile || apiData.dashboard?.profile} onReload={(value) => replacePageData('dna', value)} notify={notify} {...p} />,
    history: <PHistory data={apiData.history} {...p} />,
    messages: <PMsg data={apiData.messages} onConversationsChange={replaceMessages} setShowVid={setShowVid} {...p} />,
    documents: <PDocs data={apiData.documents} onReload={(value) => replacePageDataAndRefreshDashboard('documents', value)} notify={notify} {...p} />,
    notes: <PNotes data={apiData.notes} onReload={(value) => replacePageData('notes', value)} notify={notify} {...p} />,
    prescriptions: <POrdonnances data={apiData.prescriptions} {...p} />,
    labresults: <PLabResults data={apiData.labresults} {...p} />,
    vitals: <PVitals data={apiData.vitals} onAddVital={(v) => replacePageData('vitals', v)} notify={notify} {...p} />,
    doctors: <PDoctors data={apiData.doctors} onBooked={() => { loadPage('rdv', true); loadPage('notifications', true); }} notify={notify} setPage={setPage} {...p} />,
    notifications: <PNotifications data={apiData.notifications} onReload={replaceNotifications} notify={notify} setPage={setPage} {...p} />,
    urgence: <PUrgence data={apiData.urgence} {...p} />,
    assistant: <PAssistant patientData={apiData.dashboard} {...p} />,
    wellness: <PWell data={apiData.wellness} profile={apiData.dashboard?.profile} onReload={(v) => replacePageData('wellness', v)} notify={notify} {...p} />,
    insurance: <PInsurance data={apiData.insurance} {...p} />,
    pharmacy: <PPharmacy data={apiData.pharmacy} notify={notify} {...p} />,
    family: <PFamily data={apiData.family} onReload={(v) => replacePageData('family', v)} notify={notify} {...p} />,
    privacy: <PPrivacy data={apiData.privacy} onReload={(v) => replacePageData('privacy', v)} notify={notify} {...p} />,
    settings: <SettingsPage data={apiData.settings} setPage={setPage} {...p} />
  };

  return (
    <>
      {apiError[page] && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>Chargement impossible — {apiError[page]}</span>
          </div>
          <button onClick={retryCurrentPage} className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 flex-shrink-0">
            Réessayer
          </button>
        </div>
      )}

      {notice && (
        <div className={`fixed right-5 top-20 z-[70] rounded-xl border px-4 py-3 text-xs font-bold shadow-xl transition-all ${notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-red-100 bg-white text-slate-900'}`}>
          {notice.message}
        </div>
      )}

      {pagination[page]?.totalPages>1 && <nav aria-label="Pagination" className="flex gap-4 items-center mb-3"><button disabled={pagination[page].page<=1 || apiLoading[page]} onClick={()=>loadPage(page,true,pagination[page].page-1)}>Précédent</button><span>Page {pagination[page].page} / {pagination[page].totalPages} — {pagination[page].total} éléments</span><button disabled={!pagination[page].hasMore || apiLoading[page]} onClick={()=>loadPage(page,true,pagination[page].page+1)}>Suivant</button></nav>}
      {map[page] || <div className={`${card} border rounded-2xl p-8 text-center`}><p className={`${sub} text-sm`}>Page "{page}" en développement</p></div>}
    </>
  );
}
