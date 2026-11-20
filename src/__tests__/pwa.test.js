import { describe, expect, it } from 'vitest';
import { isAppleMobile, isPhoneOrTablet, isStandalone, installationHidden, rememberInstallationChoice, forgetInstallationChoice } from '../utils/pwa.js';

describe('Invitation à installer NOVA', () => {
  it('reconnaît les applications ouvertes en mode installé sur Android et iOS', () => {
    expect(isStandalone({ navigator: { standalone: true }, matchMedia: () => ({ matches: false }) })).toBe(true);
    expect(isStandalone({ navigator: {}, matchMedia: () => ({ matches: true }) })).toBe(true);
    expect(isStandalone({ navigator: {}, matchMedia: () => ({ matches: false }) })).toBe(false);
  });
  it('reconnaît iPhone, iPad et Android sans solliciter un ordinateur classique', () => {
    expect(isAppleMobile({ userAgent: 'iPhone', platform: 'iPhone', maxTouchPoints: 1 })).toBe(true);
    expect(isAppleMobile({ userAgent: 'Safari', platform: 'MacIntel', maxTouchPoints: 5 })).toBe(true);
    expect(isPhoneOrTablet({ navigator: { userAgent: 'Android', platform: 'Linux', maxTouchPoints: 1 }, matchMedia: () => ({ matches: false }) })).toBe(true);
    expect(isPhoneOrTablet({ navigator: { userAgent: 'Chrome Windows', platform: 'Win32', maxTouchPoints: 0 }, matchMedia: () => ({ matches: false }) })).toBe(false);
  });
  it('respecte la durée du masquage et permet de reproposer après désinstallation', () => {
    const values = new Map();
    const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
    rememberInstallationChoice('invitation', 7, storage);
    expect(installationHidden('invitation', storage)).toBe(true);
    expect(installationHidden('invitation', storage, Date.now() + 8 * 86400000)).toBe(false);
    forgetInstallationChoice('invitation', storage);
    expect(installationHidden('invitation', storage)).toBe(false);
  });
  it('reste utilisable lorsque le navigateur bloque le stockage', () => {
    const storage = { getItem() { throw new Error('bloqué'); }, setItem() { throw new Error('bloqué'); }, removeItem() { throw new Error('bloqué'); } };
    expect(installationHidden('clé', storage)).toBe(false);
    expect(() => rememberInstallationChoice('clé', 7, storage)).not.toThrow();
    expect(() => forgetInstallationChoice('clé', storage)).not.toThrow();
  });
});
