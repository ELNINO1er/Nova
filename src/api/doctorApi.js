const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api';

const getToken = () => localStorage.getItem('nova_token') || '';

async function request(path, options = {}) {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API error: ${response.status}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

function toQuery(params) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.set(k, v);
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

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
};
