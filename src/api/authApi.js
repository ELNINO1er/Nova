import { request } from './client.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

async function authRequest(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include',
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Erreur ${res.status}`);
  return data;
}

export const authApi = {
  // Tous les comptes : numéro à 10 chiffres + mot de passe (le médecin enchaîne avec Authenticator).
  loginWithPassword: (phone, password) => authRequest('/auth/password/login', {
    method: 'POST',
    body: JSON.stringify({ phone: phone.replace(/\s/g, ''), password }),
  }),

  changeInitialPassword: (challengeId, newPassword) => authRequest('/auth/password/change', {
    method: 'POST',
    body: JSON.stringify({ challengeId, newPassword }),
  }),

  changeDoctorPassword: (challengeId, newPassword) => authRequest('/auth/doctor/password/change', {
    method: 'POST',
    body: JSON.stringify({ challengeId, newPassword }),
  }),

  verifyDoctorTotpEnrollment: (challengeId, code) => authRequest('/auth/doctor/totp/enroll/verify', {
    method: 'POST',
    body: JSON.stringify({ challengeId, code }),
  }),

  verifyDoctorTotp: (challengeId, code) => authRequest('/auth/doctor/totp/verify', {
    method: 'POST',
    body: JSON.stringify({ challengeId, code }),
  }),

  // Passe par request() pour tenter un refresh si le jeton d'accès (30 min) a expiré.
  me: () => request('/auth/me', { silent: true }),

  logout: async () => {
    await authRequest('/auth/logout', { method: 'POST' }).catch(() => {});
    localStorage.removeItem('nova_user');
  },
};
