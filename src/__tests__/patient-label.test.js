import { describe, it, expect } from 'vitest';
import { patientLabel, patientMeta } from '../utils/format.js';

describe('libellés patient', () => {
  it('n’affiche jamais de tiret ou de séparateur isolé', () => {
    expect(patientLabel({ firstName: 'Rachelle', lastName: 'Tano', cmuNumber: null, age: null })).toBe('Rachelle Tano');
    expect(patientLabel({ firstName: 'Aya', lastName: 'Koné', cmuNumber: 'CI-2026-0042', age: 34 })).toBe('Aya Koné · CMU CI-2026-0042 · 34 ans');
    expect(patientMeta({ cmuNumber: '', age: null })).toBe('Informations non renseignées');
    expect(patientMeta({ cmuNumber: null, age: 34 })).toBe('34 ans');
  });
});
