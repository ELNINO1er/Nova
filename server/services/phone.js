import { z } from 'zod';

// Numéros ivoiriens : 10 chiffres (ex. 0749157741), identifiant de connexion de tous les comptes.
// Accepte les saisies « 07 49 15 77 41 », « 07.49.15.77.41 », « +225 0749157741 » ou « 002250749157741 ».
export function normalizePhone(value) {
  let digits = String(value ?? '').replace(/[\s.\-()]/g, '');
  if (digits.startsWith('+225')) digits = digits.slice(4);
  else if (digits.startsWith('00225')) digits = digits.slice(5);
  return /^\d{10}$/.test(digits) ? digits : null;
}

/** Schéma zod : renvoie le numéro normalisé à 10 chiffres. */
export const phoneSchema = z.preprocess(
  (v) => normalizePhone(v) ?? v,
  z.string().regex(/^\d{10}$/, 'Numéro invalide : 10 chiffres attendus (ex. 0749157741).'),
);
