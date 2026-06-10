import { request, toQuery } from './client.js';

export const doctorApi = {
  dashboard:    ()        => request('/doctor/me/dashboard'),
  patients:     (params = {}) => request(`/doctor/me/patients${toQuery(params)}`),
  patient:      (id)      => request(`/doctor/me/patients/${id}`),
  appointments: (params = {}) => request(`/doctor/me/appointments${toQuery(params)}`),
  updateAppointment: (id, payload) => request(`/doctor/me/appointments/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  consultations: ()       => request('/doctor/me/consultations'),
  createConsultation: (payload) => request('/doctor/me/consultations', { method: 'POST', body: JSON.stringify(payload) }),
  updateConsultation: (id, payload) => request(`/doctor/me/consultations/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  stats:        ()        => request('/doctor/me/stats'),
  profile:      ()        => request('/doctor/me/profile'),
  prescriptions:       ()        => request('/doctor/me/prescriptions'),
  prescription:        (id)      => request(`/doctor/me/prescriptions/${id}`),
  createPrescription:  (payload) => request('/doctor/me/prescriptions', { method: 'POST', body: JSON.stringify(payload) }),
  labRequests:         ()        => request('/doctor/me/lab-requests'),
  createLabRequest:    (payload) => request('/doctor/me/lab-requests', { method: 'POST', body: JSON.stringify(payload) }),
  chronicPatients:     ()        => request('/doctor/me/chronic-patients'),
  alerts:              ()        => request('/doctor/me/alerts'),
  createAlert:         (payload) => request('/doctor/me/alerts', { method: 'POST', body: JSON.stringify(payload) }),
  resolveAlert:        (id)      => request(`/doctor/me/alerts/${id}/resolve`, { method: 'PATCH' }),
  finances:            ()        => request('/doctor/me/finances'),
  reputation:          ()        => request('/doctor/me/reputation'),
  signature:           ()        => request('/doctor/me/signature'),
  saveSignature:       (payload) => request('/doctor/me/signature', { method: 'POST', body: JSON.stringify(payload) }),
  // Création patient
  createPatient:       (payload) => request('/doctor/me/patients', { method: 'POST', body: JSON.stringify(payload) }),
  // Consentement
  requestConsent:      (patientId, scope) => request(`/doctor/me/consents/${patientId}/request`, { method: 'POST', body: JSON.stringify({ scope }) }),
  // Statut délivrance
  prescriptionDispenseStatus: (id) => request(`/doctor/me/prescriptions/${id}/dispense-status`),
  // Templates consultation
  consultationTemplates: () => request('/doctor/me/consultation-templates'),
  createConsultationTemplate: (payload) => request('/doctor/me/consultation-templates', { method: 'POST', body: JSON.stringify(payload) }),
  deleteConsultationTemplate: (id) => request(`/doctor/me/consultation-templates/${id}`, { method: 'DELETE' }),
  // Templates ordonnance
  prescriptionTemplates: () => request('/doctor/me/prescription-templates'),
  createPrescriptionTemplate: (payload) => request('/doctor/me/prescription-templates', { method: 'POST', body: JSON.stringify(payload) }),
  deletePrescriptionTemplate: (id) => request(`/doctor/me/prescription-templates/${id}`, { method: 'DELETE' }),
  // Transferts
  referrals: () => request('/doctor/me/referrals'),
  createReferral: (payload) => request('/doctor/me/referrals', { method: 'POST', body: JSON.stringify(payload) }),
  acceptReferral: (id) => request(`/doctor/me/referrals/${id}/accept`, { method: 'POST' }),
  declineReferral: (id) => request(`/doctor/me/referrals/${id}/decline`, { method: 'POST' }),
  // Vitals par médecin
  addPatientVital: (patientId, payload) => request(`/doctor/me/patients/${patientId}/vitals`, { method: 'POST', body: JSON.stringify(payload) }),
};
