// Référence unique des constantes : seuils d'alerte (serveur) et valeurs affichées (écran).
// Copie à l'identique dans src/utils/vitalNorms.js (le serveur est déployé sans le dossier src).
export const VITAL_NORMS = {
  blood_pressure: { label: 'Tension artérielle', unit: 'mmHg', example: '120/80', normal: '< 140/90', watch: [90, 139], critical: [80, 180], range: [50, 260] },
  blood_glucose:  { label: 'Glycémie',           unit: 'g/L',  example: '0,95',   normal: '0,70 – 1,10', watch: [0.7, 1.1], critical: [0.6, 1.26], range: [0.2, 6] },
  heart_rate:     { label: 'Fréquence cardiaque', unit: 'bpm', example: '72',     normal: '60 – 100', watch: [60, 100], critical: [45, 120], range: [20, 250] },
  temperature:    { label: 'Température',        unit: '°C',   example: '36,8',   normal: '36,1 – 37,5', watch: [36, 37.5], critical: [35, 39], range: [30, 45] },
};

/** Valeur numérique d'une mesure ; la tension saisie en cmHg (« 12/8 ») est convertie en mmHg. */
export function vitalNumber(type, value) {
  if (type === 'blood_pressure') {
    const sys = Number(String(value).split('/')[0].replace(',', '.'));
    return Number.isFinite(sys) && sys < 30 ? sys * 10 : sys;
  }
  return Number(String(value).replace(',', '.'));
}

/** Normalise une saisie (tension en mmHg « 120/80 », décimales à point) ; null si invalide ou hors limites. */
export function normalizeVital(type, raw) {
  const norm = VITAL_NORMS[type];
  if (!norm) return null;
  const text = String(raw || '').trim().replace(/\s/g, '');
  if (type === 'blood_pressure') {
    const m = text.match(/^(\d{1,3}(?:[.,]\d)?)\/(\d{1,3}(?:[.,]\d)?)$/);
    if (!m) return null;
    let [sys, dia] = [Number(m[1].replace(',', '.')), Number(m[2].replace(',', '.'))];
    if (sys < 30) { sys *= 10; dia *= 10; }
    if (sys < norm.range[0] || sys > norm.range[1] || dia < 30 || dia > 160 || dia >= sys) return null;
    return `${Math.round(sys)}/${Math.round(dia)}`;
  }
  const n = Number(text.replace(',', '.'));
  if (!Number.isFinite(n) || n < norm.range[0] || n > norm.range[1]) return null;
  return String(n);
}

/** Niveau : normal, watch (à surveiller) ou critical. */
export function vitalLevel(type, value) {
  const norm = VITAL_NORMS[type];
  const n = vitalNumber(type, value);
  if (!norm || !Number.isFinite(n)) return 'normal';
  if (n < norm.critical[0] || n >= norm.critical[1]) return 'critical';
  if (n < norm.watch[0] || n > norm.watch[1]) return 'watch';
  return 'normal';
}
