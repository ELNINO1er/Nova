const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API request failed: ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

export const patientApi = {
  dashboard: () => request('/patient/me/dashboard'),
  profile: () => request('/patient/me/profile'),
  updateProfile: (payload) => request('/patient/me/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  vitals: (params = {}) => request(`/patient/me/vitals${toQuery(params)}`),
  treatments: () => request('/patient/me/treatments'),
  todayMedications: () => request('/patient/me/medications/today'),
  markMedication: (scheduleId, payload = { status: 'taken' }) => request(`/patient/me/medications/${scheduleId}/intakes`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  appointments: () => request('/patient/me/appointments'),
  createAppointment: (payload) => request('/patient/me/appointments', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateAppointment: (id, payload) => request(`/patient/me/appointments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  deleteAppointment: (id) => request(`/patient/me/appointments/${id}`, { method: 'DELETE' }),
  vaccinations: () => request('/patient/me/vaccinations'),
  history: () => request('/patient/me/history'),
  documents: (params = {}) => request(`/patient/me/documents${toQuery(params)}`),
  createDocument: (payload) => request('/patient/me/documents', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  deleteDocument: (id) => request(`/patient/me/documents/${id}`, { method: 'DELETE' }),
  conversations: () => request('/patient/me/conversations'),
  notes: () => request('/patient/me/notes'),
  createNote: (payload) => request('/patient/me/notes', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateNote: (id, payload) => request(`/patient/me/notes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  deleteNote: (id) => request(`/patient/me/notes/${id}`, { method: 'DELETE' }),
  settings: () => request('/patient/me/settings'),
  updateSettings: (payload) => request('/patient/me/settings', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
};

function toQuery(params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value);
  });
  const text = query.toString();
  return text ? `?${text}` : '';
}
