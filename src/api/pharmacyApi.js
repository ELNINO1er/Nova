import { request, toQuery } from './client.js';

export const pharmacyApi = {
  dashboard:           ()        => request('/pharmacy/me/dashboard'),
  verifyPrescription:  (qrToken) => request('/pharmacy/me/verify-prescription', { method: 'POST', body: JSON.stringify({ qrToken }) }),
  // Le QR présenté par le patient est exigé par le serveur pour lire ou délivrer l'ordonnance.
  prescription:        (id, qrToken) => request(`/pharmacy/me/prescription/${id}`, { headers: { 'X-Prescription-QR': qrToken } }),
  dispense:            (payload) => request('/pharmacy/me/dispense', { method: 'POST', body: JSON.stringify(payload) }),
  dispenses:           (params = {}) => request(`/pharmacy/me/dispenses${toQuery(params)}`),
};
