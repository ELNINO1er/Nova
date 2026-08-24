import React, { useEffect, useState } from 'react';
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
  const [apiData, setApiData] = useState({});
  const [apiLoading, setApiLoading] = useState({});
  const [apiError, setApiError] = useState('');
  const [notice, setNotice] = useState(null);

  const notify = (message, type = 'success') => {
    setNotice({ message, type });
    window.setTimeout(() => setNotice(null), 2600);
  };

  const loadPage = (pageKey, force = false) => {
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
        const [consents, accessLogs] = await Promise.all([patientApi.consents(), patientApi.accessLogs()]);
        return { consents, accessLogs };
      },
      settings: patientApi.settings,
    };
    const load = loaders[pageKey];
    if (!load) return;
    if (!force && apiData[pageKey]) return;

    setApiLoading((current) => ({ ...current, [pageKey]: true }));
    load()
      .then((data) => {
        setApiData((current) => ({ ...current, [pageKey]: data }));
        setApiError('');
      })
      .catch((error) => {
        setApiError(error.message);
      })
      .finally(() => {
        setApiLoading((current) => ({ ...current, [pageKey]: false }));
      });
  };

  useEffect(() => {
    loadPage(page);
  }, [page]);

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
  const retryCurrentPage = () => { setApiError(''); loadPage(page, true); };

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
    settings: <SettingsPage data={apiData.settings} {...p} />
  };

  return (
    <>
      {apiError && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>API indisponible — {apiError}</span>
          </div>
          <button onClick={retryCurrentPage} className="px-3 py-1 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 flex-shrink-0">
            Réessayer
          </button>
        </div>
      )}

      {notice && (
        <div className={`fixed right-5 top-20 z-[70] rounded-xl border px-4 py-3 text-xs font-bold shadow-xl transition-all ${notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
          {notice.message}
        </div>
      )}

      {map[page] || <div className={`${card} border rounded-2xl p-8 text-center`}><p className={`${sub} text-sm`}>Page "{page}" en développement</p></div>}
    </>
  );
}
