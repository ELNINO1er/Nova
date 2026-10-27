import { request } from './client.js';

export const governorApi = {
  dashboard: () => request('/governor/me/dashboard'),
};
