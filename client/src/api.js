import axios from 'axios';
const fallbackBaseURL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
export const api = axios.create({ baseURL: fallbackBaseURL, withCredentials: true });
