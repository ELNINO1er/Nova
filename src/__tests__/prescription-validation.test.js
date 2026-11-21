import { describe, expect, it } from 'vitest';
import { validatePrescriptionDraft } from '../utils/prescriptionValidation.js';
import { orderIsPartial, pharmacyOrderLabel, pharmacyOrderTime } from '../utils/pharmacyOrder.js';

const form = { patientId: 'fictitious', validDays: 30 };
const item = { name: 'Médicament fictif', quantityPrescribed: '12', quantityUnit: 'comprimés' };

describe('prescription creation safeguards', () => {
  it('accepts valid quantities and endpoint limits', () => {
    expect(validatePrescriptionDraft(form, [item])).toBeNull();
    expect(validatePrescriptionDraft({ ...form, validDays: 365 }, [{ ...item, quantityPrescribed: 100000 }])).toBeNull();
  });
  it.each(['', 0, 366, 1.5, 'abc'])('rejects invalid validity %s', validDays => {
    expect(validatePrescriptionDraft({ ...form, validDays }, [item])).toContain('validité');
  });
  it.each(['', 0, -1, 1.5, 100001, 'NaN'])('rejects invalid quantity %s', quantityPrescribed => {
    expect(validatePrescriptionDraft(form, [{ ...item, quantityPrescribed }])).toContain('quantité');
  });
  it('rejects missing patient, empty prescription and silent line omission', () => {
    expect(validatePrescriptionDraft({ ...form, patientId: '' }, [item])).toContain('patient');
    expect(validatePrescriptionDraft(form, [])).toContain('médicament');
    expect(validatePrescriptionDraft(form, [item, { ...item, name: '  ' }])).toContain('Médicament 2');
  });
  it.each([' ', 'x'.repeat(41)])('rejects invalid units', quantityUnit => {
    expect(validatePrescriptionDraft(form, [{ ...item, quantityUnit }])).toContain('unité');
  });
});

describe('partial order patient guidance', () => {
  it.each([
    ['pending', 'Délivrance partielle · reste à préparer'],
    ['ready', 'Complément prêt à retirer'],
    ['unavailable', 'Complément indisponible'],
  ])('keeps the partial context for %s', (status, label) => {
    expect(pharmacyOrderLabel({ status, lastDispenseStatus: 'partial' })).toBe(label);
  });
  it('does not describe cancelled or completed orders as still needing a complement', () => {
    expect(orderIsPartial({ status: 'cancelled', lastDispenseStatus: 'partial' })).toBe(false);
    expect(pharmacyOrderLabel({ status: 'dispensed', lastDispenseStatus: 'full' })).toBe('Délivrée');
    expect(pharmacyOrderLabel({ status: 'pending' })).toBe('Envoyée · en attente');
  });
  it('handles absent or malformed timestamps', () => {
    expect(pharmacyOrderTime(null)).toBe('—');
    expect(pharmacyOrderTime('invalid')).toBe('—');
    expect(pharmacyOrderTime('2026-11-20T12:30:00Z')).toContain('2026');
  });
});
