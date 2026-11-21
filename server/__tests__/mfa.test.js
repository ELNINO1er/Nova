import { describe, expect, it } from 'vitest';
import { generateTotpCode, verifyTotpCode } from '../services/mfa.service.js';

const RFC_SECRET = 'JBSWY3DPEHPK3PXP';

describe('NOVA TOTP', () => {
  it('génère un code numérique à six chiffres', () => {
    expect(generateTotpCode(RFC_SECRET, 1_700_000_000_000)).toMatch(/^\d{6}$/);
  });

  it('accepte le code de la fenêtre courante', () => {
    const now = 1_700_000_000_000;
    expect(verifyTotpCode(RFC_SECRET, generateTotpCode(RFC_SECRET, now), now)).toBe(true);
  });

  it('tolère une seule fenêtre de décalage horaire', () => {
    const now = 1_700_000_000_000;
    expect(verifyTotpCode(RFC_SECRET, generateTotpCode(RFC_SECRET, now - 30_000), now)).toBe(true);
    expect(verifyTotpCode(RFC_SECRET, generateTotpCode(RFC_SECRET, now - 90_000), now)).toBe(false);
  });

  it('refuse les codes mal formés', () => {
    expect(verifyTotpCode(RFC_SECRET, '1234')).toBe(false);
    expect(verifyTotpCode(RFC_SECRET, 'abcdef')).toBe(false);
  });
});
