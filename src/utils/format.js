export function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function formatShortDayMonth(value) {
  if (!value) return '';
  const parts = new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
  }).replace('.', '').split(' ');
  return `${parts[0]} ${capitalize(parts[1] || '')}`;
}

export function formatShortDate(value) {
  if (!value) return '';
  const d = new Date(value);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

export function formatDateFull(value) {
  if (!value) return '';
  const d = new Date(value + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function formatRelativeDate(value) {
  if (!value) return '';
  const date = new Date(value);
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (diffDays <= 0) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Hier';
  return `${diffDays} jours`;
}

export function formatBytes(value = 0) {
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.round(value / 1024)} KB`;
}

export function initials(value = '') {
  return value
    .replace(/^Dr\.\s*/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'DR';
}

export function mapDocumentCategory(category) {
  const map = {
    prescription: 'ordonnance',
    lab: 'analyse',
    vaccine: 'certificat',
  };
  return map[category] || category || 'consultation';
}

export function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

export function dashboardStatusText(status) {
  if (status === 'critical') return 'Critique';
  if (status === 'watch') return 'A surveiller';
  return 'Normal';
}

export function dashboardStatusClass(status) {
  if (status === 'critical') return 'text-red-600';
  if (status === 'watch') return 'text-amber-600';
  return 'text-emerald-600';
}

export function historyTypeLabel(type) {
  const labels = { appointment: 'Consultation', prescription: 'Ordonnance', lab_result: 'Analyse', vaccination: 'Vaccination', vital: 'Constante', document: 'Document' };
  return labels[type] || type;
}

// Libellé d'un patient dans une liste : nom, puis CMU et âge seulement s'ils sont connus (jamais de « — » isolé).
export function patientLabel(p) {
  if (!p) return '';
  const parts = [`${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Patient'];
  if (p.cmuNumber) parts.push(`CMU ${p.cmuNumber}`);
  if (Number.isInteger(p.age)) parts.push(`${p.age} ans`);
  return parts.join(' · ');
}

// Ligne secondaire d'un patient (CMU, âge) : seulement ce qui est connu.
export function patientMeta(p) {
  return [p?.cmuNumber && `CMU ${p.cmuNumber}`, Number.isInteger(p?.age) && `${p.age} ans`].filter(Boolean).join(' • ') || 'Informations non renseignées';
}
