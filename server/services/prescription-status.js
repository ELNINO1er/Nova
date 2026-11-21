// Durée de validité : 90 jours par défaut, 1 an au plus (aucune ordonnance sans fin).
export const DEFAULT_PRESCRIPTION_DAYS = 90;
export const MAX_PRESCRIPTION_DAYS = 365;

const day = (v) => (v ? new Date(v).toISOString().slice(0, 10) : null);

// Fin de validité effective (AAAA-MM-JJ). Les anciennes ordonnances enregistrées sans date de fin
// valent 90 jours après leur émission, comme les nouvelles par défaut.
export function validUntilOf(row) {
  if (row.valid_until) return String(row.valid_until instanceof Date ? day(row.valid_until) : row.valid_until).slice(0, 10);
  if (!row.issued_at) return null;
  return day(new Date(new Date(row.issued_at).getTime() + DEFAULT_PRESCRIPTION_DAYS * 86400000));
}

export const isPrescriptionExpired = (row) => {
  const end = validUntilOf(row);
  return Boolean(end && end < new Date().toISOString().slice(0, 10));
};

// Statut affiché d'une ordonnance, identique pour le patient, le médecin et la pharmacie :
// une ordonnance active ou partiellement délivrée dont la date de validité est passée est « expirée ».
export function prescriptionStatus(row) {
  if (['active', 'partial'].includes(row.status) && isPrescriptionExpired(row)) return 'expired';
  return row.status;
}
