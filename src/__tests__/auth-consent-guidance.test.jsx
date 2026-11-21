import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.mock('../api/authApi.js', () => ({ authApi: {} }));
import Login, { Enrollment, Verification, Recovery } from '../auth/Login.jsx';
import ConsentDialog, { containConsentFocus } from '../components/ConsentDialog.jsx';

const noop = () => {};
const props = { code: '', setCode: noop, verifyTotp: noop };
describe('guidance for existing authentication and consent flows', () => {
  it('explains role boundaries without promising SMS recovery', () => {
    const html = renderToStaticMarkup(<Login setAuth={noop} onLogin={noop} />);
    expect(html).toContain('La récupération patient ne réinitialise pas un compte professionnel');
    expect(html).toContain('Authenticator est obligatoire');
    expect(html).not.toContain('reçu par SMS');
  });
  it('makes manual setup available on the same phone and disables invalid enrollment', () => {
    const html = renderToStaticMarkup(<Enrollment {...props} enrollment={{ secret: 'EXAMPLEONLY' }} />);
    expect(html).toContain('Saisir une clé de configuration');
    expect(html).toContain('basé sur le temps (TOTP)');
    expect(html).toContain('Copier la clé');
    expect(html).toMatch(/disabled=""/);
    expect(html).toContain('10 minutes');
  });
  it('explains lost-device recovery and preserves single-use warnings', () => {
    expect(renderToStaticMarkup(<Verification {...props} />)).toContain('Aucun code SMS ne remplace cette étape');
    expect(renderToStaticMarkup(<Recovery codes={['EXAMPLEONLY']} finish={noop} />)).toContain('une seule fois');
  });
  it('shows the actual full scope and booking expiry without pre-acceptance', () => {
    const html = renderToStaticMarkup(<ConsentDialog sharing doctorName="Dr Exemple" onCancel={noop} onAccept={noop} />);
    expect(html).toContain('Dossier clinique complet');
    expect(html).toContain('90 jours à partir du partage');
    expect(html).toContain('Un report ne prolonge pas');
    expect(html).toContain('L’annulation du rendez-vous ferme l’accès lié à ce rendez-vous.');
    expect(html).toContain('Une autorisation explicite encore valide ou un autre rendez-vous confirmé avec partage peut toutefois maintenir l’accès');
    expect(html).not.toContain('checked=""');
    expect(html).toMatch(/disabled=""/);
  });
  it('does not promise a fresh 365 days when confirming existing consent', () => {
    const html = renderToStaticMarkup(<ConsentDialog confirming doctorName="Dr Exemple" onCancel={noop} onAccept={noop} />);
    expect(html).toContain('ne renouvelle pas sa date d’expiration');
    expect(html).toContain('Échéance : celle de l’autorisation existante.');
    expect(html).not.toContain('Échéance indicative');
  });
});

describe('consent keyboard confinement', () => {
  it('wraps Tab/Shift+Tab, handles no enabled controls, and restores focus on close', () => {
    const listeners = new Map();
    const fakeDocument = {
      activeElement: null,
      addEventListener: (type, fn) => listeners.set(type, fn),
      removeEventListener: (type, fn) => { if (listeners.get(type) === fn) listeners.delete(type); },
    };
    vi.stubGlobal('document', fakeDocument);
    const element = () => ({
      isConnected: true,
      getClientRects: () => [1],
      focus() { fakeDocument.activeElement = this; },
    });
    const trigger = element(), first = element(), last = element(), dialog = element();
    let controls = [first, last];
    dialog.querySelectorAll = () => controls;
    dialog.contains = (node) => node === dialog || controls.includes(node);
    const escape = vi.fn();
    trigger.focus();
    let cleanup;
    try {
      cleanup = containConsentFocus(dialog, escape);
      expect(fakeDocument.activeElement).toBe(dialog);
      const key = (key, shiftKey = false) => {
        const event = { key, shiftKey, preventDefault: vi.fn() };
        listeners.get('keydown')(event);
        return event;
      };
      expect(key('Tab').preventDefault).toHaveBeenCalledOnce();
      expect(fakeDocument.activeElement).toBe(first);
      key('Tab', true);
      expect(fakeDocument.activeElement).toBe(last);
      key('Tab');
      expect(fakeDocument.activeElement).toBe(first);
      expect(key('ArrowDown').preventDefault).not.toHaveBeenCalled();
      // An escaped focus is brought back rather than navigating the background.
      trigger.focus();
      key('Tab', true);
      expect(fakeDocument.activeElement).toBe(last);
      controls = [];
      key('Tab');
      expect(fakeDocument.activeElement).toBe(dialog);
      key('Escape');
      expect(escape).toHaveBeenCalledOnce();
      cleanup();
      cleanup = null;
      expect(listeners.size).toBe(0);
      expect(fakeDocument.activeElement).toBe(trigger);
    } finally {
      cleanup?.();
      vi.unstubAllGlobals();
    }
  });
});
