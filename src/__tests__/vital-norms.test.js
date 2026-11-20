import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { normalizeVital, vitalLevel } from '../../server/services/vital-norms.js';

describe('Normes des constantes', () => {
  it('la copie de l’interface est identique à celle du serveur', () => {
    const server = fs.readFileSync(new URL('../../server/services/vital-norms.js', import.meta.url), 'utf8');
    const ui = fs.readFileSync(new URL('../utils/vitalNorms.js', import.meta.url), 'utf8').split('\n').slice(1).join('\n');
    expect(ui.replace(/\r/g, '')).toBe(server.replace(/\r/g, ''));
  });

  it('normalise la tension en mmHg et refuse les valeurs impossibles', () => {
    expect(normalizeVital('blood_pressure', '12/8')).toBe('120/80');
    expect(normalizeVital('blood_pressure', '135 / 85')).toBe('135/85');
    expect(normalizeVital('blood_pressure', '80/120')).toBeNull();
    expect(normalizeVital('blood_glucose', '0,95')).toBe('0.95');
    expect(normalizeVital('temperature', '52')).toBeNull();
  });

  it('ne confond pas repère glycémique, contexte et urgence', () => {
    expect(vitalLevel('blood_glucose', '1.10')).toBe('unknown');
    expect(vitalLevel('blood_glucose', '1.10', { glucoseTiming: 'fasting' })).toBe('watch');
    expect(vitalLevel('blood_glucose', '1.26', { glucoseTiming: 'fasting' })).toBe('watch');
    expect(vitalLevel('blood_glucose', '0.99', { glucoseTiming: 'fasting' })).toBe('normal');
    expect(vitalLevel('blood_glucose', '0.53')).toBe('critical');
    expect(vitalLevel('blood_glucose', '0.54')).toBe('watch');
    expect(vitalLevel('blood_glucose', '0.70')).toBe('unknown');
    expect(vitalLevel('blood_glucose', '2')).toBe('watch');
  });
  it.each([['120/95', 'watch'], ['130/120', 'critical'], ['180/80', 'critical'], ['90/60', 'critical'], ['120/80', 'normal'], ['14/9', 'watch']])('prend en compte les deux pressions : %s', (value, level) => {
    expect(vitalLevel('blood_pressure', value)).toBe(level);
  });
  it.each([['heart_rate', '40', 'critical'], ['heart_rate', '41', 'watch'], ['heart_rate', '130', 'watch'], ['heart_rate', '131', 'critical'], ['temperature', '35', 'critical'], ['temperature', '38', 'normal'], ['temperature', '38.1', 'watch'], ['temperature', '39.1', 'critical']])('teste la borne %s %s', (type, value, level) => {
    expect(vitalLevel(type, value)).toBe(level);
  });
  it.each(['', ' ', 'NaN', 'Infinity', '0x10', '1e2', '-1', '1.2.3'])('refuse une saisie non décimale %s', value => {
    expect(normalizeVital('blood_glucose', value)).toBeNull();
    expect(vitalLevel('blood_glucose', value)).toBe('unknown');
  });
});
