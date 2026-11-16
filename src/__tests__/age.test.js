// Âge et date de naissance : jamais « 2018 ans » pour une année mal saisie.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { ageFrom, isValidBirthDate } from '../utils/age.js';
import * as server from '../../server/services/birthdate.js';

const now = new Date(2026, 10, 16); // 16 novembre 2026

describe('âge', () => {
  it('refuse les dates aberrantes au lieu d’afficher un âge absurde', () => {
    for (const v of ['0008-05-12', '1899-12-31', '2030-01-01', '2024-02-30', 'abc', '', null, undefined]) {
      expect(isValidBirthDate(v, now), String(v)).toBe(false);
      expect(ageFrom(v, now), String(v)).toBeNull();
    }
  });

  it('compte l’âge à l’anniversaire près, y compris pour un nourrisson', () => {
    expect(ageFrom('1991-11-16', now)).toBe(35);
    expect(ageFrom('1991-11-17', now)).toBe(34);
    expect(ageFrom('2026-09-01', now)).toBe(0);
    expect(ageFrom('1991-03-14T00:00:00.000Z', now)).toBe(35);
    expect(ageFrom(new Date('1991-03-14'), now)).toBe(35);
  });

  it('le serveur et l’interface appliquent exactement la même règle', () => {
    const strip = (f) => readFileSync(new URL(f, import.meta.url), 'utf8').split('\n').filter((l) => !l.startsWith('// Copie')).join('\n');
    expect(strip('../utils/age.js')).toBe(strip('../../server/services/birthdate.js'));
    expect(server.ageFrom('0008-05-12', now)).toBeNull();
  });
});
