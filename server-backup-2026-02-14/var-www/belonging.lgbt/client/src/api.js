import axios from 'axios';

// Detect if we're on a standalone domain (use /api) or evepanzarino.com (use /belonging/api)
const standaloneDomains = ['belonging.lgbt', 'www.belonging.lgbt', 'belonging.network', 'www.belonging.network'];
const isStandaloneDomain = standaloneDomains.includes(window.location.hostname);
const API_URL = process.env.REACT_APP_API_URL || (isStandaloneDomain ? '/api' : '/belonging/api');

// Export the base path for use in routing
export const BASE_PATH = isStandaloneDomain ? '' : '/belonging';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = `${BASE_PATH}/login`;
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const login = (credentials) => api.post('/auth/login', credentials);
export const register = (userData) => api.post('/auth/register', userData);
export const getCurrentUser = () => api.get('/auth/me');

export default api;
