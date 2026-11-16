// Mots de passe publiés dans d'anciennes versions du dépôt ou de la documentation (démo, tests).
// Ils sont considérés comme compromis : refusés pour tout nouveau mot de passe, refusés comme
// valeur de seed et refusés à la connexion hors développement/test.
// Stockés sous forme d'empreinte SHA-256 pour ne pas republier les valeurs en clair.
import { createHash } from 'node:crypto';

const PUBLIC_PASSWORD_SHA256 = new Set([
  'f776bb42243b411558bab3ff008ae287bd7369e77ca0ebe73e660ffbe5999a2d', // ancien mot de passe démo
  '3da52f189f4b166424d230e62fed393570eee50571ef215392e3a1d2768dbc44', // ancien mot de passe des comptes fictifs
]);

const sha256 = (value) => createHash('sha256').update(String(value), 'utf8').digest('hex');

export function isPublicPassword(password) {
  if (password == null || password === '') return false;
  return PUBLIC_PASSWORD_SHA256.has(sha256(String(password).trim().toLowerCase()));
}

export function publicPasswordAllowedAtLogin() {
  return ['development', 'test'].includes(process.env.NODE_ENV || '');
}
