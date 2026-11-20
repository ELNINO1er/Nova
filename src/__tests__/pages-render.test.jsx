import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import DAgenda from '../doctor/pages/DAgenda.jsx';
import DFinances from '../doctor/pages/DFinances.jsx';
import DSignature from '../doctor/pages/DSignature.jsx';
import DSuiviChroniques from '../doctor/pages/DSuiviChroniques.jsx';
import DAssistantIA from '../doctor/pages/DAssistantIA.jsx';
import DProfile from '../doctor/pages/DProfile.jsx';
import DCons from '../doctor/pages/DCons.jsx';
import DLabRequests from '../doctor/pages/DLabRequests.jsx';
import DPatients from '../doctor/pages/DPatients.jsx';
import DPrescriptions from '../doctor/pages/DPrescriptions.jsx';
import PharmacyPages from '../pharmacy/PharmacyPages.jsx';
import GovernorPages from '../governor/GovernorPages.jsx';

// Chaque page corrigée doit s'afficher sans planter avec des données fictives.
const ui = { card: 'bg-white', sub: 'text-slate-500', border: 'border-slate-200', darkMode: false, notify: () => {}, setPage: () => {}, onReload: () => {} };
const soon = new Date(Date.now() + 86400000).toISOString();
// Rendu dans un routeur, comme dans l'application.
const text = (el) => renderToString(<MemoryRouter>{el}</MemoryRouter>).replace(/<!-- -->/g, '');

describe('pages de l’espace médecin', () => {
  it('Agenda', () => {
    const html = text(<DAgenda {...ui} data={[{ id: 'a1', startsAt: soon, patientName: 'Awa K.', status: 'requested', recordShared: false, specialty: 'MG', location: 'Cabinet' }]} />);
    expect(html).toContain('Demande à confirmer');
  });
  it('Finances sans tarif', () => {
    const html = text(<DFinances {...ui} data={{ consultationFee: null, totalConsultations: 3, monthConsultations: 1, estimatedMonthRevenue: null, estimatedTotalRevenue: null, paidTotal: 0, paidCount: 0, activePrescriptions: 2, monthlyData: [{ month: '2026-11', count: 1, revenue: null }] }} />);
    expect(html).toContain('Aucun tarif de consultation renseigné');
  });
  it('Signature', () => expect(text(<DSignature {...ui} data={{ signatureData: null }} onSave={() => {}} />)).toContain('Signature manuscrite'));
  it('Suivi chronique', () => {
    const html = text(<DSuiviChroniques {...ui} data={[{ id: 'p1', firstName: 'Awa', lastName: 'K', chronicDiseases: ['HTA'], allergies: [], risk: 'high', daysSince: null }]} />);
    expect(html).toContain('Échéance à définir');
    expect(html).toContain('Aucune échéance définie');
    expect(html).not.toContain('180j recommandés');
  });
  it('une échéance future ne promet pas la stabilité clinique', () => {
    const html = text(<DSuiviChroniques {...ui} data={[{ id: 'p1', firstName: 'Awa', chronicDiseases: ['HTA'], risk: 'high', daysSince: 400, nextFollowupDate: '2027-01-12', followupStatus: 'scheduled' }]} />);
    expect(html).toContain('Échéance planifiée');
    expect(html).toContain('ne renseigne pas la stabilité clinique');
    expect(html).not.toContain('Suivi à jour');
  });
  it('Aide-mémoire', () => expect(text(<DAssistantIA {...ui} chronicData={[]} consultData={[]} statsData={{}} loadChronic={() => {}} loadConsult={() => {}} loadStats={() => {}} />)).toContain('Aide-mémoire NOVA'));
  it('Profil', () => {
    const html = text(<DProfile {...ui} data={{ firstName: 'Dion', lastName: 'Papou', specialty: 'MG', consultationFee: 12500, rating: null, reviewsCount: 0 }} />);
    expect(html).toContain('12');
    expect(html).toContain('Aucun avis pour le moment');
  });
  it('Consultations', () => {
    const html = text(<DCons {...ui} data={[{ id: 'c1', patientName: 'Awa K.', startedAt: soon, status: 'draft', amendments: [] }]} patientsData={[]} loadPatients={() => {}} />);
    expect(html).toContain('Brouillon');
  });
  it('Analyses', () => {
    const html = text(<DLabRequests {...ui} data={[{ id: 'l1', title: 'NFS', patientName: 'Awa K.', status: 'completed', requestedAt: soon, resultId: 'r1' }]} patientsData={[]} loadPatients={() => {}} />);
    expect(html).toContain('Résultat reçu');
  });
  it('Patients', () => expect(() => text(<DPatients {...ui} data={[]} />)).not.toThrow());
  it('Ordonnances', () => {
    const html = text(<DPrescriptions {...ui} data={[{ id: 'x1', patientName: 'Awa K.', issuedAt: soon, validUntil: soon, status: 'partial', itemsCount: 1 }]} patientsData={[]} loadPatients={() => {}} />);
    expect(html).toContain('Délivrance partielle');
  });
});

describe('pharmacie et santé publique', () => {
  for (const page of ['dashboard', 'orders', 'scan', 'history', 'settings']) {
    it(`pharmacie : ${page}`, () => expect(() => text(<PharmacyPages {...ui} page={page} />)).not.toThrow());
  }
  it('santé publique : indicateurs et paramètres', () => {
    expect(() => text(<GovernorPages {...ui} page="dashboard" />)).not.toThrow();
    expect(text(<GovernorPages {...ui} page="settings" />)).toContain('Paramètres');
  });
});
