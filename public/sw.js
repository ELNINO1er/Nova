const CACHE_NAME = 'nova-app-shell-v3';
const APP_SHELL = ['/offline.html', '/manifest.json', '/nova-icon.svg', '/icons/nova-180.png', '/icons/nova-192.png', '/icons/nova-512.png', '/icons/nova-maskable-512.png'];

// Seuls les fichiers publics du build et les icônes peuvent être enregistrés.
// Photos, QR, fiches d’urgence, pièces jointes et API restent hors du cache.
function isPublicAsset(url) {
  return url.origin === self.location.origin && !url.search && (
    APP_SHELL.includes(url.pathname)
    || /^\/assets\/[\w.-]+\.(js|css|woff2?|png|svg|webp)$/.test(url.pathname)
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  // Une mise à jour attend la fermeture des anciens onglets pour préserver les formulaires ouverts.
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('nova-app-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() => new Response(
        JSON.stringify({ error: 'offline', message: 'Connexion indisponible. Reconnectez-vous à internet pour consulter vos données de santé.' }),
        { status: 503, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
      ))
    );
    return;
  }

  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request, { cache: 'no-store' }).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      return await cache.match('/offline.html') || new Response('Connexion internet nécessaire pour ouvrir NOVA.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }));
    return;
  }

  if (!isPublicAsset(url)) return;
  event.respondWith((async () => {
    let cache;
    try { cache = await caches.open(CACHE_NAME); } catch { return fetch(event.request); }
    const cached = await cache.match(event.request).catch(() => null);
    if (cached) return cached;
    const response = await fetch(event.request);
    if (response.ok && response.type === 'basic' && !response.redirected) {
      // Un stockage saturé ne doit pas empêcher l’affichage du fichier reçu du réseau.
      await cache.put(event.request, response.clone()).catch(() => {});
    }
    return response;
  })());
});
