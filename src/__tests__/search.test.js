import { describe, expect, it } from 'vitest';
import { highlightParts, normalize, searchItems } from '../utils/search.js';

const items = [
  { t: 'Fièvre jaune', d: 'Dr. Awa Kouassi' },
  { t: 'Tétanos', d: 'Dr. Christelle N’Guessan' },
  { t: 'Amoxicilline 1 g', d: 'Dr. Awa Kouassi' },
];
const fields = (i) => [i.t, i.d];

describe('Recherche patient', () => {
  it('ignore accents, casse et apostrophes', () => {
    expect(normalize('Fièvre  JAUNE')).toBe('fievre jaune');
    expect(searchItems(items, 'fievre', fields).map((i) => i.t)).toEqual(['Fièvre jaune']);
    expect(searchItems(items, 'nguessan', fields).map((i) => i.t)).toEqual(['Tétanos']);
    expect(searchItems(items, 'n guessan', fields).map((i) => i.t)).toEqual(['Tétanos']);
  });

  it('exige tous les mots et classe le titre avant le reste', () => {
    expect(searchItems(items, 'kouassi amox', fields).map((i) => i.t)).toEqual(['Amoxicilline 1 g']);
    expect(searchItems(items, 'kouassi', fields)).toHaveLength(2);
    expect(searchItems(items, '', fields)).toBe(items);
  });

  it('surligne les mots trouvés en conservant le texte d’origine', () => {
    expect(highlightParts('Fièvre jaune', 'fievre')).toEqual([['Fièvre', true], [' jaune', false]]);
  });
});
