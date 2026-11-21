import { createHmac } from 'node:crypto';

// Clé dédiée au QR d'ordonnance : PRESCRIPTION_QR_SECRET si défini, sinon dérivée de JWT_SECRET
// (jamais la clé des sessions elle-même : un QR ne peut pas servir de jeton de session).
export function prescriptionQrSecret() {
  if (process.env.PRESCRIPTION_QR_SECRET) return process.env.PRESCRIPTION_QR_SECRET;
  return createHmac('sha256', String(process.env.JWT_SECRET || '')).update('nova:prescription-qr').digest('base64url');
}

/** Durée du QR : jusqu'à la fin de validité de l'ordonnance (au plus 90 jours, au moins 1 heure). */
export function prescriptionQrLifetimeSeconds(validUntil) {
  const max = 90 * 86400;
  if (!validUntil) return max;
  const end = new Date(`${String(validUntil).slice(0, 10)}T23:59:59Z`).getTime();
  if (!Number.isFinite(end)) return max;
  return Math.max(3600, Math.min(max, Math.floor((end - Date.now()) / 1000)));
}
