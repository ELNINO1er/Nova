import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const source = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8');
function worker(fetch = vi.fn().mockResolvedValue(new Response('public'))) {
  const events = {};
  const cache = { match: vi.fn().mockResolvedValue(undefined), put: vi.fn().mockResolvedValue(undefined), addAll: vi.fn().mockResolvedValue(undefined) };
  const caches = { open: vi.fn().mockResolvedValue(cache), keys: vi.fn().mockResolvedValue(['nova-app-shell-v2', 'another-app-cache']), delete: vi.fn().mockResolvedValue(true) };
  const self = { location: { origin: 'https://nova.example' }, clients: { claim: vi.fn() }, addEventListener: (name, handler) => { events[name] = handler; } };
  vm.runInNewContext(source, { self, caches, fetch, URL, Response });
  return { events, cache, caches, fetch };
}
function request(url, mode = 'cors', method = 'GET') { return { url: `https://nova.example${url}`, mode, method }; }

describe('Confidentialité du cache PWA', () => {
  it('sert les fichiers publics même si le cache est saturé', async () => {
    const response = new Response('public-script');
    Object.defineProperty(response, 'type', { value: 'basic' });
    const state = worker(vi.fn().mockResolvedValue(response));
    state.cache.put.mockRejectedValue(new Error('QuotaExceededError'));
    const respondWith = vi.fn();
    state.events.fetch({ request: request('/assets/index-public.js'), respondWith });
    expect(await (await respondWith.mock.calls[0][0]).text()).toBe('public-script');
    expect(state.cache.put).toHaveBeenCalled();
  });
  it('ne met jamais les API en cache, même si elles sont appelées comme des images', async () => {
    const state = worker();
    const respondWith = vi.fn();
    state.events.fetch({ request: request('/api/patient/me/photo'), respondWith });
    await respondWith.mock.calls[0][0];
    expect(state.fetch).toHaveBeenCalledWith(expect.anything(), { cache: 'no-store' });
    expect(state.cache.put).not.toHaveBeenCalled();
  });
  it.each(['/uploads/photo.png', '/urgence/secret-token.png', '/patient-document.pdf', '/assets/logo.svg?token=secret'])('ignore les ressources sensibles %s', url => {
    const state = worker();
    const respondWith = vi.fn();
    state.events.fetch({ request: request(url), respondWith });
    expect(respondWith).not.toHaveBeenCalled();
  });
  it('répond clairement hors ligne sans utiliser une ancienne réponse médicale', async () => {
    const state = worker(vi.fn().mockRejectedValue(new Error('offline')));
    const respondWith = vi.fn();
    state.events.fetch({ request: request('/api/patient/me/prescriptions'), respondWith });
    const response = await respondWith.mock.calls[0][0];
    expect(response.status).toBe(503);
    expect((await response.json()).error).toBe('offline');
    expect(state.cache.match).not.toHaveBeenCalled();
  });
  it('sert uniquement la page hors ligne générique pour une navigation indisponible', async () => {
    const state = worker(vi.fn().mockRejectedValue(new Error('offline')));
    state.cache.match.mockResolvedValue(new Response('Connexion nécessaire'));
    const respondWith = vi.fn();
    state.events.fetch({ request: request('/urgence/jeton-prive', 'navigate'), respondWith });
    expect(await (await respondWith.mock.calls[0][0]).text()).toContain('Connexion nécessaire');
    expect(state.cache.match).toHaveBeenCalledWith('/offline.html');
    expect(state.cache.put).not.toHaveBeenCalled();
  });
  it('retire ses anciens caches sans supprimer ceux d’une autre application', async () => {
    const state = worker();
    const waitUntil = vi.fn();
    state.events.activate({ waitUntil });
    await waitUntil.mock.calls[0][0];
    expect(state.caches.delete).toHaveBeenCalledWith('nova-app-shell-v2');
    expect(state.caches.delete).not.toHaveBeenCalledWith('another-app-cache');
  });
  it('fournit des icônes PNG installables avec les dimensions déclarées', () => {
    const manifest = JSON.parse(readFileSync(new URL('../../public/manifest.json', import.meta.url), 'utf8'));
    for (const icon of manifest.icons.filter(icon => icon.type === 'image/png')) {
      const png = readFileSync(new URL(`../../public${icon.src}`, import.meta.url));
      expect(png.subarray(1, 4).toString()).toBe('PNG');
      expect(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`).toBe(icon.sizes);
    }
    expect(manifest.display).toBe('standalone');
    expect(manifest.scope).toBe('/');
  });
});
