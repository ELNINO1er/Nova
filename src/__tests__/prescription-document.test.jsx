import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrescriptionDocument } from '../patient/pages/POrdonnances.jsx';
import POrdonnances from '../patient/pages/POrdonnances.jsx';
import { MemoryRouter } from 'react-router-dom';

const rx = {
  id: 'rx-fictitious-full-reference', doctorName: 'Dr Fictif', doctorSpecialty: 'Médecine générale',
  issuedAt: '2026-11-19', validUntil: '2026-11-20', status: 'partial',
  items: [{ id: 'line', name: 'Médicament fictif', dosage: '1 comprimé', frequency: 'matin et soir', duration: '3 jours', quantityPrescribed: 6, quantityDispensed: 2, remaining: 4, quantityUnit: 'comprimés', instructions: '<script>unsafe</script>' }],
};
afterEach(() => vi.useRealTimers());
describe('prescription screen and printed document', () => {
  it.each([false, true])('shows the cancellation record and contact instructions (print=%s)', print => {
    const cancelled = { ...rx, status: 'cancelled', cancellation: { reason: 'Erreur de dosage <script>', createdAt: '2026-11-20T10:30:00Z' } };
    const html = renderToStaticMarkup(<PrescriptionDocument p={cancelled} print={print} />);
    expect(html).toContain('Ordonnance annulée');
    expect(html).toContain('Erreur de dosage &lt;script&gt;');
    expect(html).toContain('Annulée le');
    expect(html).toContain('Contactez le médecin prescripteur');
  });
  it('retains standalone list rendering and hides pharmacy QR for a cancelled prescription', () => {
    const html = renderToStaticMarkup(<MemoryRouter><POrdonnances data={[{ ...rx, status: 'cancelled' }]} /></MemoryRouter>);
    expect(html).toContain('Ordonnance annulée');
    expect(html).not.toContain('QR pour la pharmacie');
    expect(html).not.toContain('Envoyer à une pharmacie');
  });
  it.each([false, true])('retains traceability and remaining quantities (print=%s)', print => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-20T22:00:00Z'));
    const html = renderToStaticMarkup(<PrescriptionDocument p={rx} print={print} />);
    for (const value of [rx.id, 'Dr Fictif', 'Délivrance partielle', '6 / 2 / 4 comprimés', 'Valable aujourd’hui']) expect(html).toContain(value);
    expect(html).not.toContain('numérique signée');
    expect(html).not.toContain('<script>unsafe');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('QR présenté par le patient');
  });
});
