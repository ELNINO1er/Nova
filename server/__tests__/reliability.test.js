import { describe, expect, it } from 'vitest';
import { reliabilityCheckStatus } from '../services/reliability.service.js';

describe('Contrôles de récupération des données', () => {
  const now = Date.parse('2026-11-20T12:00:00Z');
  it('ne présente pas une vérification absente ou future comme réalisée', () => {
    expect(reliabilityCheckStatus('backup', null, now)).toBe('missing');
    expect(reliabilityCheckStatus('backup', '2026-11-21T12:00:00Z', now)).toBe('missing');
    expect(reliabilityCheckStatus('restore', 'invalide', now)).toBe('missing');
  });
  it('signale une sauvegarde non contrôlée depuis plus de deux jours', () => {
    expect(reliabilityCheckStatus('backup', '2026-11-19T12:00:00Z', now)).toBe('current');
    expect(reliabilityCheckStatus('backup', '2026-11-17T12:00:00Z', now)).toBe('overdue');
  });
  it('demande un nouvel exercice de restauration après trois mois', () => {
    expect(reliabilityCheckStatus('restore', '2026-11-19T12:00:00Z', now)).toBe('current');
    expect(reliabilityCheckStatus('restore', '2026-01-01T12:00:00Z', now)).toBe('overdue');
  });
});
