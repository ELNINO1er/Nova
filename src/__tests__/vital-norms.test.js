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

  it('mêmes seuils partout : 1,10 g/L normal, 37,8 °C à surveiller, 14/9 à surveiller', () => {
    expect(vitalLevel('blood_glucose', '1.10')).toBe('normal');
    expect(vitalLevel('temperature', '37.8')).toBe('watch');
    expect(vitalLevel('blood_pressure', '14/9')).toBe('watch');
    expect(vitalLevel('blood_pressure', '120/80')).toBe('normal');
  });
});
