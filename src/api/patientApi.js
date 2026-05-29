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
  conversation: (id) => request(`/patient/me/conversations/${id}`),
  sendMessage: (id, payload) => request(`/patient/me/conversations/${id}/messages`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  markConversationRead: (id) => request(`/patient/me/conversations/${id}/read`, { method: 'PATCH' }),
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
  prescriptions: (params = {}) => request(`/patient/me/prescriptions${toQuery(params)}`),
  prescription: (id) => request(`/patient/me/prescriptions/${id}`),
  vitals: (params = {}) => request(`/patient/me/vitals${toQuery(params)}`),
  addVital: (payload) => request('/patient/me/vitals', { method: 'POST', body: JSON.stringify(payload) }),
  emergencyCard: () => request('/patient/me/emergency-card'),
  emergencyCardQr: () => request('/patient/me/emergency-card/qr'),
  wellnessGoals: () => request('/patient/me/wellness-goals'),
  createWellnessGoal: (payload) => request('/patient/me/wellness-goals', { method: 'POST', body: JSON.stringify(payload) }),
  updateWellnessGoal: (id, payload) => request(`/patient/me/wellness-goals/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteWellnessGoal: (id) => request(`/patient/me/wellness-goals/${id}`, { method: 'DELETE' }),
  doctors: (params = {}) => request(`/patient/me/doctors${toQuery(params)}`),
  doctor: (id) => request(`/patient/me/doctors/${id}`),
  doctorSlots: (id, params = {}) => request(`/patient/me/doctors/${id}/slots${toQuery(params)}`),
  bookSlot: (doctorId, slotId) => request(`/patient/me/doctors/${doctorId}/slots/${slotId}/book`, { method: 'POST' }),
  notifications: () => request('/patient/me/notifications'),
  markNotificationRead: (id) => request(`/patient/me/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request('/patient/me/notifications/read-all', { method: 'PATCH' }),
  labResults: (params = {}) => request(`/patient/me/lab-results${toQuery(params)}`),
  labResult: (id) => request(`/patient/me/lab-results/${id}`),
  medicalProfile: () => request('/patient/me/medical-profile'),
  updateMedicalProfile: (payload) => request('/patient/me/medical-profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  uploadDocument: async (formData) => {
    const token = getToken();
    const r = await fetch(`${API_BASE_URL}/patient/me/documents`, {
      method: 'POST',
      body: formData,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || `Upload failed: ${r.status}`); }
    return r.json();
  },
  insurance: () => request('/patient/me/insurance'),
  pharmacies: (params = {}) => request(`/patient/me/pharmacies${toQuery(params)}`),
  pharmacyOrders: () => request('/patient/me/pharmacy-orders'),
  createPharmacyOrder: (payload) => request('/patient/me/pharmacy-orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
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
