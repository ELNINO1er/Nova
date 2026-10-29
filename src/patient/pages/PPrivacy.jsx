import React, { useState, useEffect } from 'react';
import { Shield, Eye, Lock, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { patientApi } from '../../api/patientApi.js';
import { searchableDate, useSearch, useUrlQuery } from '../../utils/search.js';
import { Avatar, Button, Card, CardTitle, Chip, DataTable, EmptyState, Highlight, IconBadge, NoResults, PageHeader, Pills, SearchInput, StatTile } from '../../components/patient/ui.jsx';

/* Statut d'une demande : en attente = action requise (rouge plein), accordé = actif (rouge pâle), révoqué = neutre. */
const STATUS_MAP = {
  granted: { label: 'Accordé', icon: CheckCircle2, tone: 'watch' },
  pending: { label: 'En attente', icon: Clock, tone: 'alert' },
  revoked: { label: 'Révoqué', icon: XCircle, tone: 'neutral' },
};

const REASONS = {
  revoked: ['Accès révoqué par vous', 'neutral'],
  consent: ['Accès accordé', 'watch'],
  care: ['Accès lié à votre suivi en cours', 'watch'],
  none: ['Pas d’accès actuellement', 'neutral'],
};

/* Champs cherchables par onglet, du plus au moins important. */
const TEAM_FIELDS = (m) => [m.doctorName, m.specialty, m.city, (REASONS[m.reason] || REASONS.none)[0], m.hasAccess ? 'accès autorisé' : 'sans accès'];
const CONSENT_FIELDS = (c) => [c.doctorName || 'Médecin', (STATUS_MAP[c.status] || STATUS_MAP.pending).label, searchableDate(c.respondedAt || c.requestedAt)];
const logUser = (l) => l.accessorName || l.userName || 'Inconnu';
const logWhen = (l) => l.accessedAt || l.createdAt;
const LOG_FIELDS = (l) => [logUser(l), l.action || 'Consultation', l.dataAccessed || l.resource, searchableDate(logWhen(l))];
const TAB_LABELS = { team: 'Qui a accès', consents: 'Demandes', logs: 'Journal d’accès' };

export default function PPrivacy({ data, onReload, notify, card, sub, darkMode }) {
  const [tab, setTab] = useState('team');
  const [team, setTeam] = useState([]);
  const [busy, setBusy] = useState('');
  const [consents, setConsents] = useState([]);
  const [logs, setLogs] = useState([]);
  const [query, setQuery] = useUrlQuery();
  const teamResults = useSearch(team, query, TEAM_FIELDS);
  const consentResults = useSearch(consents, query, CONSENT_FIELDS);
  const logResults = useSearch(logs, query, LOG_FIELDS);

  useEffect(() => {
    if (!data) return;
    setConsents(Array.isArray(data.consents) ? data.consents : []);
    setLogs(Array.isArray(data.accessLogs) ? data.accessLogs : []);
    setTeam(Array.isArray(data.careTeam) ? data.careTeam : []);
  }, [data]);

  // Demande en attente : réponse à la demande ; accès révoqué : nouvel accord au médecin (l'API refuse de « ré-accorder » une demande close).
  const grant = async (id) => {
    const consent = consents.find((c) => c.id === id);
    try {
      if (consent && consent.status !== 'pending' && consent.doctorId) await patientApi.grantDoctorAccess(consent.doctorId);
      else await patientApi.grantConsent(id);
      onReload?.({ consents: await patientApi.consents(), accessLogs: await patientApi.accessLogs(), careTeam: await patientApi.careTeam() });
      notify?.('Consentement accordé');
    } catch (error) {
      notify?.(error.message || 'Erreur', 'error');
    }
  };

  const revoke = async (id) => {
    try {
      await patientApi.revokeConsent(id);
      onReload?.({ consents: await patientApi.consents(), accessLogs: await patientApi.accessLogs(), careTeam: await patientApi.careTeam() });
      notify?.('Consentement révoqué');
    } catch (error) {
      notify?.(error.message || 'Erreur', 'error');
    }
  };

  if (!data) {
    return (
      <div className="space-y-5">
        <PageHeader title="Confidentialité" sub={sub} />
        {[0, 1, 2].map(i => (
          <Card key={i} darkMode={darkMode}><div className={`animate-pulse h-20 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-red-50'}`} /></Card>
        ))}
      </div>
    );
  }

  // Révoquer / autoriser un médecin : la décision la plus récente fait foi côté serveur.
  const decide = async (m, action) => {
    if (action === 'revoke' && !window.confirm(`Retirer à ${m.doctorName} l’accès à votre dossier ?`)) return;
    setBusy(m.doctorId);
    try {
      if (action === 'revoke') await patientApi.revokeDoctorAccess(m.doctorId);
      else await patientApi.grantDoctorAccess(m.doctorId);
      const [consentsNext, accessLogs, careTeam] = await Promise.all([patientApi.consents(), patientApi.accessLogs(), patientApi.careTeam()]);
      onReload?.({ consents: consentsNext, accessLogs, careTeam });
      notify?.(action === 'revoke' ? 'Accès révoqué.' : 'Accès autorisé.');
    } catch (e) {
      notify?.(e.message || 'Action impossible.', 'error');
    } finally { setBusy(''); }
  };

  const withAccess = team.filter((m) => m.hasAccess).length;
  const pending = consents.filter((c) => c.status === 'pending').length;

  // Avec une recherche, les pastilles affichent le nombre de résultats de chaque onglet.
  const counts = query
    ? { team: teamResults.length, consents: consentResults.length, logs: logResults.length }
    : { team: team.length, consents: consents.length, logs: logs.length };
  const tabs = Object.keys(TAB_LABELS).map((id) => [id, TAB_LABELS[id], counts[id]]);
  const activeCount = counts[tab];
  const otherHits = query ? Object.keys(TAB_LABELS).filter((id) => id !== tab && counts[id] > 0) : [];
  const hl = (text) => <Highlight text={text} query={query} />;

  const fmtWhen = (l) => (logWhen(l) ? new Date(logWhen(l)).toLocaleString('fr-FR') : '—');
  const noResults = (
    <div className="space-y-3">
      <NoResults query={query} onClear={() => setQuery('')} darkMode={darkMode} />
      {otherHits.length > 0 && (
        <p className={`text-sm text-center ${sub}`}>
          Résultats dans :{' '}
          {otherHits.map((id, i) => (
            <React.Fragment key={id}>
              {i > 0 && ', '}
              <button type="button" onClick={() => setTab(id)} className="font-semibold text-red-700 hover:underline">{TAB_LABELS[id]} ({counts[id]})</button>
            </React.Fragment>
          ))}
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Confidentialité" subtitle="Gérez vos consentements et consultez les accès à votre dossier" sub={sub} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatTile label="Médecins avec accès" value={withAccess} Icon={Lock} darkMode={darkMode} onClick={() => setTab('team')} />
        <StatTile label="Demandes en attente" value={pending} Icon={Shield} highlight={pending > 0} darkMode={darkMode} onClick={() => setTab('consents')} />
        <StatTile label="Accès enregistrés" value={logs.length} Icon={Eye} darkMode={darkMode} onClick={() => setTab('logs')} />
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex-1 min-w-0"><Pills options={tabs} value={tab} onChange={setTab} darkMode={darkMode} /></div>
        <SearchInput value={query} onChange={setQuery} count={activeCount} darkMode={darkMode} className="w-full lg:w-96"
          placeholder={tab === 'logs' ? 'Médecin, action, date…' : tab === 'consents' ? 'Médecin, statut, date…' : 'Médecin, spécialité, ville…'}
          label={`Rechercher dans « ${TAB_LABELS[tab]} »`} />
      </div>

      {tab === 'team' && (
        <div className="space-y-5">
          <p className={`text-sm max-w-3xl ${sub}`}>
            Un médecin accède à votre dossier si vous l’avez autorisé, ou s’il vous suit actuellement (rendez-vous récent ou à venir, acte de moins d’un an).
            Une révocation prime toujours et s’applique immédiatement.
          </p>
          {team.length === 0 ? (
            <EmptyState Icon={Lock} title="Aucun médecin n’a accès à votre dossier." darkMode={darkMode} />
          ) : teamResults.length === 0 ? noResults : (
            <Card darkMode={darkMode} className="!p-0 overflow-hidden">
              <ul>
                {teamResults.map((m, i) => {
                  const [reasonLabel, reasonTone] = REASONS[m.reason] || REASONS.none;
                  return (
                    <li key={m.doctorId} className={`p-5 flex items-center gap-4 flex-wrap ${i ? `border-t ${darkMode ? 'border-slate-800' : 'border-slate-100'}` : ''}`}>
                      <Avatar name={m.doctorName} />
                      <div className="flex-1 min-w-[10rem]">
                        <p className="font-semibold break-words">{hl(m.doctorName)}</p>
                        <p className={`text-xs mt-0.5 ${sub}`}>{hl([m.specialty, m.city].filter(Boolean).join(' · ') || '—')}</p>
                        <div className="mt-2"><Chip tone={reasonTone}>{reasonLabel}</Chip></div>
                      </div>
                      {m.hasAccess ? (
                        <Button variant="danger" darkMode={darkMode} disabled={busy === m.doctorId} onClick={() => decide(m, 'revoke')}>Révoquer l’accès</Button>
                      ) : (
                        <Button darkMode={darkMode} disabled={busy === m.doctorId} onClick={() => decide(m, 'grant')}>Autoriser l’accès</Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </div>
      )}

      {tab === 'consents' && (
        consents.length === 0 ? (
          <EmptyState Icon={Shield} title="Aucun consentement" darkMode={darkMode}>Aucune demande de consentement pour le moment.</EmptyState>
        ) : consentResults.length === 0 ? noResults : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {consentResults.map((c) => {
              const st = STATUS_MAP[c.status] || STATUS_MAP.pending;
              const StIcon = st.icon;
              return (
                <Card key={c.id} darkMode={darkMode}>
                  <div className="flex items-start gap-4">
                    <IconBadge Icon={Lock} solid={c.status === 'pending'} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <h4 className="font-semibold break-words min-w-0">{hl(c.doctorName || 'Médecin')}</h4>
                        <Chip tone={st.tone}><StIcon className="w-3 h-3" /> {st.label}</Chip>
                      </div>
                      <p className={`text-xs mt-1 ${sub}`}>Accès au dossier clinique, révocable. Le partage par rubrique n’est pas proposé.</p>
                      <div className="flex flex-wrap gap-2 mt-4">
                        {c.status !== 'granted' && (
                          <Button Icon={CheckCircle2} darkMode={darkMode} onClick={() => grant(c.id)}>Accorder</Button>
                        )}
                        {c.status !== 'revoked' && (
                          <Button variant="danger" Icon={XCircle} darkMode={darkMode} onClick={() => revoke(c.id)}>Révoquer</Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      )}

      {tab === 'logs' && (
        logs.length === 0 ? (
          <EmptyState Icon={Eye} title="Aucun accès enregistré" darkMode={darkMode}>Le journal des accès à votre dossier apparaîtra ici.</EmptyState>
        ) : logResults.length === 0 ? noResults : (
          <Card darkMode={darkMode} className="!p-0 overflow-hidden">
            <div className="px-5 pt-5"><CardTitle Icon={Eye} action={<span className={`text-xs ${sub}`}>{logResults.length} entrée{logResults.length > 1 ? 's' : ''}</span>}>Journal d’accès</CardTitle></div>
            {/* Tableau sur écran large, liste sur mobile (pas de défilement horizontal à 375 px). */}
            <div className="hidden md:block">
              <DataTable
                darkMode={darkMode}
                columns={['Utilisateur', 'Action', 'Données', 'Date']}
                rows={logResults.map((l) => [
                  hl(logUser(l)),
                  hl(l.action || 'Consultation'),
                  hl(l.dataAccessed || l.resource || '—'),
                  hl(fmtWhen(l)),
                ])}
              />
            </div>
            <ul className="md:hidden">
              {logResults.map((l, i) => (
                <li key={l.id || i} className={`px-5 py-4 border-t ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-sm min-w-0 break-words">{hl(logUser(l))}</p>
                    <Chip>{hl(l.action || 'Consultation')}</Chip>
                  </div>
                  <p className={`text-xs mt-1 break-words ${sub}`}>{hl(l.dataAccessed || l.resource || '—')}</p>
                  <p className={`text-xs mt-0.5 ${sub}`}>{hl(fmtWhen(l))}</p>
                </li>
              ))}
            </ul>
          </Card>
        )
      )}
    </div>
  );
}
