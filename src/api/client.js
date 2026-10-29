import {clearUnsaved} from '../unsaved.js';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const REQUEST_TIMEOUT_MS = 30000;

// Codes renvoyés par server/middleware/auth.js quand le jeton d'accès n'est plus
// valable. Les autres 401 (ex. QR d'ordonnance invalide) sont des erreurs métier
// et ne doivent ni rafraîchir la session ni déconnecter l'utilisateur.
const SESSION_ERRORS = new Set(['unauthorized', 'invalid_token', 'token_revoked']);

const updates=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('nova-data'):null;
if(updates)updates.onmessage=()=>window.dispatchEvent(new Event('nova:data-changed'));
let refreshPromise = null;
// Pendant une déconnexion, aucun renouvellement de session ne doit recréer les cookies.
let sessionClosing = false;

/** À appeler avant /auth/logout : bloque les renouvellements et attend celui éventuellement en cours. */
export async function prepareLogout() {
  sessionClosing = true;
  if (refreshPromise) await refreshPromise.catch(() => {});
}

/** À appeler après une connexion réussie (ou une déconnexion échouée). */
export function sessionOpened() {
  sessionClosing = false;
}

async function refreshToken() {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    if(res.status>=500)throw new Error('Service de session temporairement indisponible. Réessayez.');
    if (!res.ok) return false;
    await res.json().catch(() => ({}));
    return true;
  } catch (e) {
    throw new Error(e.message || 'Connexion indisponible. Réessayez.');
  }
}

// Un seul refresh à la fois, partagé par toutes les requêtes en attente.
function sharedRefresh() {
  if (!refreshPromise) {
    refreshPromise = (navigator.locks ? navigator.locks.request('nova-session-refresh', async()=>{if(sessionClosing)return false;const check=await fetch(`${API_BASE_URL}/auth/me`,{credentials:'include'});return check.ok || refreshToken();}) : refreshToken()).finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

async function send(path, options) {
  const isForm = options.body instanceof FormData;
  const headers = isForm ? { ...options.headers } : { 'Content-Type': 'application/json', ...options.headers };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(`${API_BASE_URL}${path}`, { ...options, credentials: 'include', headers, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Le serveur met trop de temps à répondre. Réessayez.');
    throw new Error('Impossible de joindre le serveur. Vérifiez votre connexion.');
  } finally {
    clearTimeout(timer);
  }
}

async function readBody(response) {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}

/**
 * Requête API avec cookies de session.
 * Sur un 401 de session : un refresh puis une seule nouvelle tentative.
 * `silent: true` évite l'événement de déconnexion globale (vérification au démarrage).
 * `responseType: 'blob'` renvoie le contenu binaire (ex. photo de profil).
 */
export async function request(path, options = {}) {
  const { silent = false, responseType, ...fetchOptions } = options;
  let response = await send(path, fetchOptions);

  if (response.status === 401) {
    const body = await readBody(response.clone());
    if (!body || SESSION_ERRORS.has(body.error)) {
      if (!sessionClosing && await sharedRefresh()) {
        response = await send(path, fetchOptions);
      } else {
        if (!silent) {
          localStorage.removeItem('nova_user');
          window.dispatchEvent(new Event('nova:logout'));
        }
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }
    }
  }

  if (responseType === 'blob' && response.ok) return response.blob();
  const data = await readBody(response);
  if (!response.ok) {
    const error = new Error(data?.message || `Erreur ${response.status}`);
    error.status = response.status;
    error.code = data?.error;
    throw error;
  }
  if(fetchOptions.method && fetchOptions.method!=='GET' && !path.includes('/read') && !path.startsWith('/auth/')) {clearUnsaved();window.dispatchEvent(new Event('nova:data-changed'));updates?.postMessage('changed');}
  return data;
}

export function toQuery(params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value);
  });
  const text = query.toString();
  return text ? `?${text}` : '';
}
