import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as ui from '../utils/consentTerms.js';
import * as server from '../../server/services/consent-terms.js';

describe('conditions de partage', () => {
  it('le patient lit exactement les conditions que le serveur exige', () => {
    expect(ui.CONSENT_TERMS_VERSION).toBe(server.CONSENT_TERMS_VERSION);
    expect(ui.CONSENT_TERMS).toEqual(server.CONSENT_TERMS);
    const strip = (f) => readFileSync(new URL(f, import.meta.url), 'utf8').split('\n').filter((l) => !l.startsWith('// Copie')).join('\n');
    expect(strip('../utils/consentTerms.js')).toBe(strip('../../server/services/consent-terms.js'));
  });
});
