import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import PVitals from '../patient/pages/PVitals.jsx';
const render = data => renderToString(<MemoryRouter><PVitals data={data} darkMode={false} sub="text-slate-500" /></MemoryRouter>);
describe('conseils sur les constantes patient', () => {
  it('affiche les conseils urgents et la supervision sans données', () => {
    const html = render([]);
    expect(html).toContain('urgences locales');
    expect(html).toContain('à interpréter avec un soignant');
    expect(html).toContain('ni une validation clinique');
  });
  it('explique une tension diastolique très élevée', () => {
    const html = render([{ id: 'v1', type: 'blood_pressure', value: '130/120', measuredAt: '2026-11-20T10:00:00Z' }]);
    expect(html).toContain('évaluation médicale');
    expect(html).not.toContain('Valeurs normales');
  });
});
