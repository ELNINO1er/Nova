export const INSTALL_DISMISSED_KEY = 'nova:pwa:dismissed-until';
export const INSTALL_KNOWN_KEY = 'nova:pwa:installed-until';
const DAY = 86400000;

export function isStandalone(win = window) {
  return win.navigator.standalone === true || win.matchMedia('(display-mode: standalone)').matches;
}

export function isAppleMobile(nav = navigator) {
  return /iPad|iPhone|iPod/.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
}

export function isPhoneOrTablet(win = window) {
  return isAppleMobile(win.navigator) || /Android/i.test(win.navigator.userAgent)
    || (win.navigator.maxTouchPoints > 0 && win.matchMedia('(max-width: 1024px)').matches);
}

export function installationHidden(key, storage, now = Date.now()) {
  try { return Number((storage || window.localStorage).getItem(key)) > now; } catch { return false; }
}

export function rememberInstallationChoice(key, days, storage) {
  try { (storage || window.localStorage).setItem(key, String(Date.now() + days * DAY)); } catch { /* L’installation reste utilisable si le stockage est bloqué. */ }
}

export function forgetInstallationChoice(key, storage) {
  try { (storage || window.localStorage).removeItem(key); } catch { /* Navigation privée ou stockage bloqué. */ }
}
