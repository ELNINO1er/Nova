// Ouverte maintenant : d'après les horaires quand ils sont connus (heure d'Abidjan = UTC), sinon l'indicateur saisi.
export function openNow(ph) {
  if (ph.isDuty) return true;
  const toMin = (t) => { const [h, m] = String(t || '').split(':').map(Number); return Number.isFinite(h) ? h * 60 + (m || 0) : null; };
  const from = toMin(ph.opensAt), to = toMin(ph.closesAt);
  if (from == null || to == null) return Boolean(ph.isOpen);
  const d = new Date(); const now = d.getUTCHours() * 60 + d.getUTCMinutes();
  return Boolean(ph.isOpen) && (from <= to ? now >= from && now < to : now >= from || now < to);
}
