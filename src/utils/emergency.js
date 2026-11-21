// Numéros d'urgence de Côte d'Ivoire, source unique pour tous les écrans NOVA.
// Source officielle : Ministère des Affaires étrangères de Côte d'Ivoire, « Numéros utiles »
// https://www.diplomatie.gouv.ci/numeros-utiles (consulté le 16/11/2026) :
//   185 SAMU CI · 180 Sapeurs-pompiers · 100 Police secours · 110 / 1111 / 170 Urgence gendarmerie.
// Le lien d'appel est toujours construit à partir du numéro affiché (voir telHref).
export const EMERGENCY_NUMBERS = Object.freeze([
  Object.freeze({ id: 'samu', label: 'SAMU', number: '185', hint: 'Urgence médicale' }),
  Object.freeze({ id: 'pompiers', label: 'Sapeurs-pompiers', number: '180', hint: 'Incendie, accident, secours' }),
  Object.freeze({ id: 'police', label: 'Police secours', number: '100', hint: 'Agression, sécurité' }),
  Object.freeze({ id: 'gendarmerie', label: 'Gendarmerie', number: '170', hint: 'Urgence gendarmerie' }),
]);

export const SAMU_NUMBER = EMERGENCY_NUMBERS[0].number;

export function telHref(number) {
  return `tel:${String(number).replace(/[^\d+]/g, '')}`;
}
