// Copie de server/services/consent-terms.js (le serveur est déployé sans le dossier src).
// Conditions du partage du dossier médical, présentées au patient avant tout accord.
// Changer le texte = changer la version : les accords suivants enregistrent la nouvelle version.
export const CONSENT_TERMS_VERSION = '2026-11-17';
export const CONSENT_DURATION_DAYS = 365;
export const CONSENT_TERMS = [
  'Le médecin pourra consulter tout votre dossier clinique : antécédents, allergies, traitements, constantes, consultations, ordonnances, résultats d’analyses et documents.',
  'Il pourra y ajouter des consultations, des ordonnances et des demandes d’examens.',
  'L’accès dure 12 mois au plus. Vous pouvez le retirer à tout moment dans « Accès au dossier » ; le retrait est immédiat.',
  'Chaque consultation de votre dossier est enregistrée et visible dans votre « Journal d’accès ».',
  'Le médecin est tenu au secret médical. Vos données ne sont jamais transmises à un autre médecin sans votre accord.',
];
