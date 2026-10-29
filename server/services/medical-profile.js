// Lecture des listes du profil médical (colonnes JSON de nova_medical_profile).
// L'API n'accepte que des chaînes en écriture, mais d'anciennes données (seed)
// contiennent des objets détaillés : on les ramène toutes à un libellé texte.

function parse(value) {
  if (value == null) return [];
  // mysql2 renvoie déjà les colonnes JSON désérialisées ; ne parser que les chaînes.
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return []; }
}

function toLabel(item) {
  if (item == null) return '';
  if (typeof item !== 'object') return String(item);
  if (item.relation && item.condition) return `${item.relation} : ${item.condition}`;
  const main = item.name || item.procedure || item.condition || item.label || '';
  const detail = item.reaction || (item.date ? String(item.date).slice(0, 4) : '');
  return detail && main ? `${main} (${detail})` : main;
}

export function medicalList(value) {
  const list = parse(value);
  return Array.isArray(list) ? list.map(toLabel).filter(Boolean) : [];
}
