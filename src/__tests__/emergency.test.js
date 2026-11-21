import { describe, it, expect } from 'vitest';
import { EMERGENCY_NUMBERS, SAMU_NUMBER, telHref } from '../utils/emergency.js';

describe('numéros d\'urgence de Côte d\'Ivoire', () => {
  it('utilise les numéros officiels (diplomatie.gouv.ci)', () => {
    const byId = Object.fromEntries(EMERGENCY_NUMBERS.map(n => [n.id, n.number]));
    expect(byId).toEqual({ samu: '185', pompiers: '180', police: '100', gendarmerie: '170' });
    expect(SAMU_NUMBER).toBe('185');
  });

  it('ne contient aucun numéro d\'urgence français', () => {
    for (const { number } of EMERGENCY_NUMBERS) expect(['15', '17', '18', '112']).not.toContain(number);
  });

  it('construit le lien d\'appel à partir du numéro affiché', () => {
    for (const { number } of EMERGENCY_NUMBERS) expect(telHref(number)).toBe(`tel:${number}`);
    expect(telHref('05 20 33 34 00')).toBe('tel:0520333400');
  });
});
