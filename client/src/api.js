import axios from 'axios';
const fallbackBaseURL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
export const api = axios.create({ baseURL: fallbackBaseURL, withCredentials: true });
export const saveAccessToken = token => localStorage.setItem('snacks-access-token', token);
export const clearAccessToken = () => localStorage.removeItem('snacks-access-token');
api.interceptors.request.use(config => {
  const token = localStorage.getItem('snacks-access-token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
