import { request, toQuery } from './client.js';

export const pharmacyApi = {
  dashboard:           ()        => request('/pharmacy/me/dashboard'),
  verifyPrescription:  (prescriptionId) => request('/pharmacy/me/verify-prescription', { method: 'POST', body: JSON.stringify({ prescriptionId }) }),
  prescription:        (id)      => request(`/pharmacy/me/prescription/${id}`),
  dispense:            (payload) => request('/pharmacy/me/dispense', { method: 'POST', body: JSON.stringify(payload) }),
  dispenses:           (params = {}) => request(`/pharmacy/me/dispenses${toQuery(params)}`),
};
