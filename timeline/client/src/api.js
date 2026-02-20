import axios from 'axios';

const baseURL = process.env.NODE_ENV === 'production' 
  ? '/timeline/api' 
  : 'http://localhost:5007/api';

const api = axios.create({
  baseURL
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('timeline_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
