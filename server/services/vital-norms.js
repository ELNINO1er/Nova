// Référence unique des constantes : seuils d'alerte (serveur) et valeurs affichées (écran).
// Copie à l'identique dans src/utils/vitalNorms.js (le serveur est déployé sans le dossier src).
export const VITAL_NORMS = {
  blood_pressure: { label: 'Tension artérielle', unit: 'mmHg', example: '120/80', normal: 'Adulte au repos : < 140/90 ; objectifs individualisés', watch: [90, 139], critical: [80, 180], range: [50, 260] },
  blood_glucose:  { label: 'Glycémie',           unit: 'g/L',  example: '0,95',   normal: 'À jeun ≥ 8 h : 0,70 – 0,99 ; hors jeûne : contexte requis', watch: [0.7, 1.1], critical: [0.54, Infinity], range: [0.2, 6] },
  heart_rate:     { label: 'Fréquence cardiaque', unit: 'bpm', example: '72',     normal: '60 – 100', watch: [60, 100], critical: [40, 131], range: [20, 250] },
  temperature:    { label: 'Température',        unit: '°C',   example: '36,8',   normal: 'Repère adulte : 36,1 – 38,0', watch: [36.1, 38], critical: [35, 39.1], range: [30, 45] },
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
  const norm = Object.hasOwn(VITAL_NORMS, type) ? VITAL_NORMS[type] : null;
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
  if (!/^\d+(?:[.,]\d+)?$/.test(text)) return null;
  const n = Number(text.replace(',', '.'));
  if (!Number.isFinite(n) || n < norm.range[0] || n > norm.range[1]) return null;
  return String(n);
}

// Repères de tri adulte, pas un diagnostic ni un score NEWS2 validé.
// AHA: https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings/when-to-call-911-for-high-blood-pressure
// ADA 2026: https://doi.org/10.2337/dc26-s006 ; https://doi.org/10.2337/dc26-s002
// RCP NEWS2: https://www.rcp.ac.uk/media/eczf5mvm/news2-chart-3_news-observation-chart_2022_0_0.pdf
export function vitalLevel(type, value, context = {}) {
  const normalized = normalizeVital(type, value);
  if (normalized === null) return 'unknown';
  const n = vitalNumber(type, normalized);
  if (type === 'blood_pressure') {
    const [sys, dia] = normalized.split('/').map(Number);
    if (sys <= 90 || sys >= 180 || dia >= 120) return 'critical';
    return sys >= 140 || dia >= 90 || dia < 60 ? 'watch' : 'normal';
  }
  if (type === 'blood_glucose') {
    if (n < 0.54) return 'critical';
    if (n < 0.7 || n >= 2) return 'watch';
    if (context.glucoseTiming === 'fasting') return n >= 1 ? 'watch' : 'normal';
    return 'unknown'; // Une valeur isolée sans contexte ne prouve pas une glycémie normale.
  }
  if (type === 'heart_rate') {
    if (n <= 40 || n >= 131) return 'critical';
    return n < 60 || n > 100 ? 'watch' : 'normal';
  }
  if (n <= 35 || n >= 39.1) return 'critical';
  return n < 36.1 || n > 38 ? 'watch' : 'normal';
}

export function vitalAssessment(type, value, context = {}) {
  const level = vitalLevel(type, value, context);
  const messages = {
    unknown: 'Interprétation indéterminée : vérifier la saisie et le contexte de mesure.',
    normal: 'Dans les repères adultes ; cela ne permet pas d’exclure un problème de santé.',
    watch: 'Mesure à réévaluer avec un professionnel selon les symptômes et les objectifs personnels.',
    critical: 'Mesure très inhabituelle : demander rapidement une évaluation médicale. En cas de douleur thoracique, essoufflement, malaise ou trouble neurologique, contacter immédiatement les urgences locales.',
  };
  const message = type === 'blood_glucose' && normalizeVital(type, value) !== null && vitalNumber(type, value) < 0.7
    ? 'Glycémie basse : suivre immédiatement le plan de prise en charge donné par votre soignant et demander rapidement un avis médical. En cas de confusion, perte de connaissance ou impossibilité d’avaler, contacter immédiatement les urgences locales.'
    : messages[level];
  return { level, message, scope: 'Repères adultes uniquement, hors grossesse ; pas de diagnostic automatique.' };
}

export function parseVitalContext(value) {
  if (typeof value === 'string') { try { value = JSON.parse(value); } catch { return {}; } }
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}
export function validateVitalContext(context = {}) {
  if (!context || typeof context !== 'object' || Array.isArray(context) || Object.keys(context).some(k => k !== 'glucoseTiming') || (context.glucoseTiming !== undefined && !['fasting', 'post_meal', 'random', 'unknown'].includes(context.glucoseTiming))) {
    throw Object.assign(new Error('Contexte invalide.'), { status: 422 });
  }
  return context;
}
