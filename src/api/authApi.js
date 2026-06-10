import { request } from './client.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api';

async function authRequest(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Erreur ${res.status}`);
  return data;
}

export const authApi = {
  check: (phone) => authRequest('/auth/check', {
    method: 'POST',
    body: JSON.stringify({ phone: phone.replace(/\s/g, '') }),
  }),

  login: (phone, code) => authRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone: phone.replace(/\s/g, ''), code }),
  }),

  me: () => {
    const token = localStorage.getItem('nova_token') || '';
    return authRequest('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
  },

  logout: () => {
    localStorage.removeItem('nova_token');
  },

  getToken: () => localStorage.getItem('nova_token') || '',
  setToken: (t) => localStorage.setItem('nova_token', t),
};
