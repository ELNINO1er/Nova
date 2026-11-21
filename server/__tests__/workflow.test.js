import { describe, expect, it } from 'vitest';
import { APPOINTMENT_TRANSITIONS, assertTransition } from '../services/workflow.js';
import { doctorAccessClause } from '../services/access.js';

describe('Transitions des rendez-vous', () => {
  const t = (from, to, actor) => () => assertTransition(APPOINTMENT_TRANSITIONS, from, to, actor);

  it('le patient ne peut pas confirmer lui-même un rendez-vous', () => {
    expect(t('requested', 'confirmed', 'patient')).toThrow(/non autorisé/);
  });

  it('le patient peut annuler une demande ou un rendez-vous confirmé', () => {
    expect(t('requested', 'cancelled', 'patient')).not.toThrow();
    expect(t('confirmed', 'cancelled', 'patient')).not.toThrow();
  });

  it('le médecin confirme ou refuse une demande', () => {
    expect(t('requested', 'confirmed', 'doctor')).not.toThrow();
    expect(t('requested', 'cancelled', 'doctor')).not.toThrow();
  });

  it('un rendez-vous annulé ne peut plus être rouvert', () => {
    expect(t('cancelled', 'confirmed', 'doctor')).toThrow();
    expect(t('cancelled', 'requested', 'patient')).toThrow();
  });

  it('renvoie une erreur 409 exploitable par l’interface', () => {
    try { assertTransition(APPOINTMENT_TRANSITIONS, 'cancelled', 'confirmed', 'doctor'); } catch (err) {
      expect(err.status).toBe(409);
      expect(err.code).toBe('invalid_transition');
    }
  });
});

describe('Règle d’accès médecin → dossier', () => {
  it('a autant de paramètres que de marqueurs SQL', () => {
    const clause = doctorAccessClause('doc-x', 'p.id');
    expect((clause.sql.match(/\?/g) || []).length).toBe(clause.params.length);
  });

  it('fait primer une révocation récente sur tout autre lien', () => {
    const { sql } = doctorAccessClause('doc-x');
    expect(sql).toMatch(/NOT EXISTS[\s\S]*status = 'revoked'/);
    expect(sql.indexOf("status = 'revoked'")).toBeLessThan(sql.indexOf("status = 'granted' AND"));
  });
});
