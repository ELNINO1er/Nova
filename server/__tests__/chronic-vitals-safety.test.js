import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validFollowupDate, followupStatus } from '../services/chronic-followup.js';
import { vitalAssessment } from '../services/vital-norms.js';
const { execute, access } = vi.hoisted(() => ({ execute: vi.fn(), access: vi.fn() }));
vi.mock('../db/database.js', () => ({ pool: { execute } }));
vi.mock('../services/access.js', () => ({ assertDoctorPatientAccess: access, doctorAccessClause: () => ({ sql: '1=1', params: [] }), hasDoctorPatientAccess: vi.fn() }));
vi.mock('../services/notification.service.js', () => ({ notifyPatientConsultation: vi.fn(), notifyPatientPrescription: vi.fn(), notifyDoctorReferral: vi.fn(), notifyPatientAppointmentStatus: vi.fn() }));
const { setChronicFollowup, addVitalByDoctor, createDoctorPrescription } = await import('../services/doctor.service.js');
beforeEach(() => { execute.mockReset(); access.mockReset(); access.mockResolvedValue(undefined); });
describe('dates civiles de suivi', () => {
  it.each(['2026-02-29', '2026-04-31', '2026-13-01', '2026-00-01', '2026-1-01', '', null, '2026-11-20T12:00:00Z'])('refuse %s', value => expect(validFollowupDate(value)).toBe(false));
  it('accepte une année bissextile et distingue passé, aujourd’hui, 7 et 8 jours', () => {
    expect(validFollowupDate('2028-02-29')).toBe(true);
    for (const [date, status] of [[null, 'unscheduled'], ['2026-11-19', 'overdue'], ['2026-11-20', 'due_soon'], ['2026-11-27', 'due_soon'], ['2026-11-28', 'scheduled']]) expect(followupStatus(date, '2026-11-20').followupStatus).toBe(status);
  });
  it('refuse un accès révoqué avant toute écriture', async () => {
    access.mockRejectedValue(Object.assign(new Error('Accès refusé'), { status: 403 }));
    await expect(setChronicFollowup('doctor-a', 'patient', '2026-12-01')).rejects.toMatchObject({ status: 403 });
    expect(execute).not.toHaveBeenCalled();
  });
  it('isole les échéances par médecin et accepte leur suppression explicite', async () => {
    execute.mockResolvedValueOnce([[{ chronic_diseases: '["HTA"]' }]]).mockResolvedValueOnce([{}]);
    await expect(setChronicFollowup('doctor-a', 'patient', null)).resolves.toMatchObject({ nextFollowupDate: null, followupStatus: 'unscheduled' });
    expect(execute.mock.calls[1][1]).toEqual(['doctor-a', 'patient', null]);
    expect(execute.mock.calls[1][0]).toContain('ON DUPLICATE KEY UPDATE');
  });
  it('ne crée pas un suivi chronique pour un profil sans maladie chronique', async () => {
    execute.mockResolvedValueOnce([[{ chronic_diseases: '[]' }]]);
    await expect(setChronicFollowup('doctor', 'patient', '2026-12-01')).rejects.toMatchObject({ status: 422 });
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
describe('saisie clinique', () => {
  it('fixe les libellés et unités côté serveur et conserve le contexte', async () => {
    execute.mockResolvedValue([{}]);
    const result = await addVitalByDoctor('doctor', 'patient', { type: 'blood_glucose', value: '1,26', label: 'wrong', unit: 'mg/dL', context: { glucoseTiming: 'fasting' } });
    expect(execute.mock.calls[0][1].slice(2, 6)).toEqual(['blood_glucose', 'Glycémie', '1.26', 'g/L']);
    expect(result.assessment.level).toBe('watch');
    expect(result.context).toEqual({ glucoseTiming: 'fasting' });
  });
  it('bloque une mesure invalide au niveau service', async () => {
    await expect(addVitalByDoctor('doctor', 'patient', { type: 'blood_pressure', value: '80/120' })).rejects.toMatchObject({ status: 422 });
    expect(execute).not.toHaveBeenCalled();
  });
  it('bloque un contexte non reconnu', async () => {
    await expect(addVitalByDoctor('doctor', 'patient', { type: 'blood_glucose', value: '1', context: { glucoseTiming: 'invented' } })).rejects.toMatchObject({ status: 422 });
    expect(execute).not.toHaveBeenCalled();
  });
  it('ne promet pas de diagnostic et garde les consignes symptomatiques', () => {
    expect(vitalAssessment('blood_pressure', '190/125').message).toContain('urgences locales');
    expect(vitalAssessment('blood_glucose', '1.26').level).not.toBe('critical');
    expect(vitalAssessment('heart_rate', '72').message).toContain('ne permet pas d’exclure');
  });
});

describe('champs de prescription vides', () => {
  it.each(['name', 'quantityUnit', 'dosage', 'frequency', 'duration'])('rejette les espaces seuls pour %s avant transaction', async field => {
    const item = { name: 'Médicament test', quantityPrescribed: 1, quantityUnit: 'unité', [field]: '  ' };
    await expect(createDoctorPrescription('doctor', { patientId: 'patient', items: [item] })).rejects.toMatchObject({ status: 422 });
    expect(execute).not.toHaveBeenCalled();
  });
});
