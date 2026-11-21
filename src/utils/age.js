// Copie de server/services/birthdate.js (le serveur est déployé sans le dossier src).
// Date de naissance : format AAAA-MM-JJ, entre 1900 et aujourd'hui. Âge calculé à l'anniversaire près.
// Une date absente ou aberrante (ex. année « 0008 » saisie par erreur) donne un âge null, jamais « 2018 ans ».
export const MIN_BIRTH_YEAR = 1900;

export function parseBirthDate(value) {
  if (value instanceof Date) value = Number.isNaN(value.getTime()) ? '' : value.toISOString();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? '').trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null; // 31/02…
  return { y, mo, d };
}

export function isValidBirthDate(value, now = new Date()) {
  const b = parseBirthDate(value);
  if (!b || b.y < MIN_BIRTH_YEAR) return false;
  const today = [now.getFullYear(), now.getMonth() + 1, now.getDate()];
  return compare([b.y, b.mo, b.d], today) <= 0;
}

function compare(a, b) { for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; }

export function ageFrom(value, now = new Date()) {
  if (!isValidBirthDate(value, now)) return null;
  const b = parseBirthDate(value);
  let age = now.getFullYear() - b.y;
  if (now.getMonth() + 1 < b.mo || (now.getMonth() + 1 === b.mo && now.getDate() < b.d)) age -= 1;
  return age;
}
