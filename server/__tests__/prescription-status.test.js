import { describe, it, expect } from 'vitest';
import { prescriptionStatus, validUntilOf, isPrescriptionExpired, DEFAULT_PRESCRIPTION_DAYS } from '../services/prescription-status.js';

const daysFromNow = (n) => new Date(Date.now() + n * 86400000).toISOString();

describe('statut des ordonnances (patient, médecin, pharmacie)', () => {
  it('une ordonnance active dont la date est passée est expirée', () => {
    expect(prescriptionStatus({ status: 'active', valid_until: daysFromNow(-1).slice(0, 10) })).toBe('expired');
    expect(prescriptionStatus({ status: 'partial', valid_until: daysFromNow(-1).slice(0, 10) })).toBe('expired');
  });

  it('une ordonnance délivrée reste délivrée, même après sa date', () => {
    expect(prescriptionStatus({ status: 'dispensed', valid_until: daysFromNow(-10).slice(0, 10) })).toBe('dispensed');
  });

  it('sans date de fin, la validité vaut 90 jours après émission', () => {
    const issued = daysFromNow(-(DEFAULT_PRESCRIPTION_DAYS + 1));
    expect(isPrescriptionExpired({ status: 'active', issued_at: issued })).toBe(true);
    expect(prescriptionStatus({ status: 'active', issued_at: daysFromNow(-5) })).toBe('active');
    expect(validUntilOf({ issued_at: '2026-01-01T10:00:00.000Z' })).toBe('2026-04-01');
  });

  it('accepte une date MySQL (objet Date) ou une chaîne', () => {
    expect(validUntilOf({ valid_until: '2026-12-31' })).toBe('2026-12-31');
    expect(validUntilOf({ valid_until: new Date('2026-12-31T00:00:00Z') })).toBe('2026-12-31');
  });
});
