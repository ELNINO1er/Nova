import { describe, expect, it } from 'vitest';
import { ROLE_PAGES, ROLE_SPACES, spaceOf } from '../navigation.js';

// Pages volontairement hors espace : ouvertes depuis le header (SOS) ou le bouton flottant.
const OUTSIDE_SPACES = { patient: ['urgence', 'assistant'] };

describe('Espaces de navigation', () => {
  for (const role of Object.keys(ROLE_PAGES)) {
    it(`${role} : chaque page est joignable et chaque onglet existe`, () => {
      const inSpaces = ROLE_SPACES[role].flatMap((s) => s.pages.map((p) => p.id));
      expect(new Set(inSpaces).size).toBe(inSpaces.length);
      for (const id of inSpaces) expect(ROLE_PAGES[role]).toContain(id);
      for (const id of ROLE_PAGES[role]) {
        if (!(OUTSIDE_SPACES[role] || []).includes(id)) expect(spaceOf(role, id)).not.toBeNull();
      }
    });
  }

  it('au plus 5 espaces par rôle', () => {
    for (const spaces of Object.values(ROLE_SPACES)) expect(spaces.length).toBeLessThanOrEqual(5);
  });
});
