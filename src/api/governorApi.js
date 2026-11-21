import { request, toQuery } from './client.js';
export const governorApi = {dashboard: (params={}) => request(`/governor/me/dashboard${toQuery(params)}`),report:(params={})=>request(`/governor/me/report${toQuery(params)}`)};
