// Synchronisation de session entre onglets : une déconnexion ou un changement de compte
// dans un onglet est répercuté dans les autres (BroadcastChannel, repli sur l'événement storage).
const CHANNEL = 'nova-auth';
const STORAGE_KEY = 'nova_auth_event';

const channel = typeof window !== 'undefined' && 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL) : null;

export function broadcastAuth(event) {
  const message = { ...event, at: Date.now() };
  if (channel) channel.postMessage(message);
  else {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(message)); } catch { /* stockage indisponible */ }
  }
}

export function onAuthBroadcast(handler) {
  const fromChannel = (e) => handler(e.data);
  const fromStorage = (e) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return;
    try { handler(JSON.parse(e.newValue)); } catch { /* message illisible */ }
  };
  channel?.addEventListener('message', fromChannel);
  window.addEventListener('storage', fromStorage);
  return () => {
    channel?.removeEventListener('message', fromChannel);
    window.removeEventListener('storage', fromStorage);
  };
}
