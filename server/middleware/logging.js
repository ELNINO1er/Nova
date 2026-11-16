// Journaux : utiles pour comprendre un incident, sans identifiants, jetons ni données médicales.
import morgan from 'morgan';

// Numéro masqué : seuls les 2 derniers chiffres restent (ex. 07••••••21).
export function maskPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  return `${digits.slice(0, 2)}${'•'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-2)}`;
}

// Chemin sans paramètres de requête (recherches par nom, téléphone…) et identifiants longs raccourcis.
export function safePath(url) {
  return String(url || '').split('?')[0].replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, (id) => `${id.slice(0, 8)}…`);
}

morgan.token('safe-url', (req) => safePath(req.originalUrl || req.url));
morgan.token('user', (req) => (req.user ? `${req.user.role}:${String(req.user.id).slice(0, 8)}` : '-'));

// Journal d'accès : jamais de cookie, d'en-tête Authorization, de corps de requête ni de paramètre de recherche.
export const accessLogger = morgan(':remote-addr :method :safe-url :status :res[content-length] - :response-time ms :user', {
  skip: (req) => req.path === '/api/health',
});

// Événement de sécurité structuré (une ligne JSON), sans secret ni donnée médicale.
const FORBIDDEN = /password|token|secret|code|otp|cookie|authorization|content|diagnos|allerg/i;
export function securityEvent(event, data = {}) {
  const clean = Object.fromEntries(Object.entries(data).filter(([k]) => !FORBIDDEN.test(k)));
  console.warn(JSON.stringify({ event, at: new Date().toISOString(), ...clean }));
}

// Erreur serveur journalisée sans la requête SQL ni ses valeurs (qui peuvent contenir des données patients).
export function describeError(err) {
  return {
    name: err?.name, code: typeof err?.code === 'string' ? err.code : undefined, status: err?.status,
    // Les messages MySQL recopient les valeurs entre guillemets : elles sont masquées.
    message: String(err?.message || '').replace(/'[^']*'/g, "'…'").replace(/\d{8,}/g, '…').slice(0, 300),
    stack: String(err?.stack || '').split('\n').slice(1, 6).map((l) => l.trim()).join(' | '),
  };
}
