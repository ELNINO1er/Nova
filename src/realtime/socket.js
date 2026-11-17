import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { renewSession, API_ORIGIN } from '../api/client.js';

// Connexion temps réel unique par onglet (messages et notifications poussés par le serveur).
// Authentification par le cookie de session ; si la session expire, on la renouvelle puis on se reconnecte.
let socket = null;
let userKey = null;

export function connectRealtime(userId) {
  if (socket && userKey === userId) return socket;
  disconnectRealtime();
  userKey = userId;
  socket = io(API_ORIGIN || undefined, { path: '/socket.io', withCredentials: true, transports: ['websocket', 'polling'] });
  let attempts = 0; // évite une boucle si la session ne peut pas être rétablie
  socket.on('connect', () => { attempts = 0; });
  const reconnectAfterRenewal = async () => {
    const current = socket;
    if (++attempts > 5) return;
    try { if (await renewSession() && current === socket) current.connect(); } catch { /* hors ligne : nouvel essai au prochain évènement */ }
  };
  socket.on('session:expired', () => { setTimeout(reconnectAfterRenewal, 500); });
  socket.on('connect_error', (err) => { if (err?.data?.code) setTimeout(reconnectAfterRenewal, 2000); });
  // Après une coupure réseau, Socket.IO se reconnecte seul ; on prévient les écrans pour qu'ils se resynchronisent.
  socket.io.on('reconnect', () => window.dispatchEvent(new Event('nova:realtime-reconnected')));
  window.dispatchEvent(new Event('nova:realtime-ready'));
  return socket;
}

export function disconnectRealtime() {
  if (socket) { socket.removeAllListeners(); socket.disconnect(); }
  socket = null;
  userKey = null;
}

/** Abonne un composant à un évènement temps réel ; le gestionnaire le plus récent est toujours utilisé. */
export function useRealtime(event, handler) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const listener = (payload) => ref.current?.(payload);
    const attach = () => socket?.on(event, listener);
    attach();
    // La connexion peut être créée après le montage du composant.
    const onReady = () => { socket?.off(event, listener); attach(); };
    window.addEventListener('nova:realtime-ready', onReady);
    return () => { socket?.off(event, listener); window.removeEventListener('nova:realtime-ready', onReady); };
  }, [event]);
}
