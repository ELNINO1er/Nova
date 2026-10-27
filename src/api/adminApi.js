import { request, toQuery } from './client.js';

export const adminApi = {
  dashboard: () => request('/admin/me/dashboard'),
  users: (params = {}) => request(`/admin/me/users${toQuery(params)}`),
  auditLogs: (params = {}) => request(`/admin/me/audit-logs${toQuery(params)}`),
  accessLogs: (params = {}) => request(`/admin/me/access-logs${toQuery(params)}`),
  system: () => request('/admin/me/system'),
  setDoctorStatus: (id, isAvailable) =>
    request(`/admin/me/doctors/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isAvailable }),
    }),
  createDoctor: (payload) => request('/admin/me/doctors', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  resetPassword: (userId) => request(`/admin/me/users/${userId}/reset-password`, { method: 'POST' }),
  // Pharmacien ou gouverneur (les médecins passent par createDoctor).
  createAccount: (payload) => request('/admin/me/accounts', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  setPharmacyStatus: (id, isOpen) =>
    request(`/admin/me/pharmacies/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isOpen }),
    }),
};
