import axios from 'axios';

const api = axios.create({
  baseURL: '/hate-registry/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const login = (credentials) => api.post('/auth/login', credentials);
export const register = (userData) => api.post('/auth/register', userData);
export const getCurrentUser = () => api.get('/auth/me');

// Admin API
export const getAllPeople = () => api.get('/admin/people');
export const getAllComments = () => api.get('/admin/comments');
export const getPendingPeople = () => api.get('/admin/pending/people');
export const approvePerson = (id) => api.post(`/admin/people/${id}/review`, { action: 'approve' });
export const denyPerson = (id) => api.post(`/admin/people/${id}/review`, { action: 'deny' });
export const adminDeletePerson = (id) => api.delete(`/admin/people/${id}`);
export const getPendingComments = () => api.get('/admin/pending/comments');
export const approveComment = (id) => api.post(`/admin/comments/${id}/review`, { action: 'approve' });
export const denyComment = (id) => api.post(`/admin/comments/${id}/review`, { action: 'deny' });
export const adminDeleteComment = (id) => api.delete(`/admin/comments/${id}`);
export const getUsers = () => api.get('/admin/users');
export const deleteUser = (id) => api.delete(`/admin/users/${id}`);

// People API
export const getPeople = (params) => api.get('/people', { params });
export const getPerson = (slug) => api.get(`/people/${slug}`);
export const createPerson = (data) => api.post('/people', data);
export const updatePerson = (id, data) => api.put(`/people/${id}`, data);
export const deletePerson = (id) => api.delete(`/people/${id}`);

// Hate Records API
export const getHateRecords = (personId) => api.get(`/people/${personId}/hate-records`);
export const createHateRecord = (personId, data) => api.post(`/people/${personId}/hate-records`, data);
export const updateHateRecord = (id, data) => api.put(`/hate-records/${id}`, data);
export const deleteHateRecord = (id) => api.delete(`/hate-records/${id}`);

// Photos API
export const getPhotos = (personId) => api.get(`/people/${personId}/photos`);
export const addPhoto = (personId, data) => api.post(`/people/${personId}/photos`, data);
export const uploadPhoto = (personId, formData) => 
  api.post(`/people/${personId}/photos/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
export const deletePhoto = (id) => api.delete(`/photos/${id}`);

// Social Profiles API
export const getSocialProfiles = (personId) => api.get(`/people/${personId}/social-profiles`);
export const addSocialProfile = (personId, data) => api.post(`/people/${personId}/social-profiles`, data);
export const deleteSocialProfile = (id) => api.delete(`/social-profiles/${id}`);

// Comments API
export const getComments = (personId) => api.get(`/people/${personId}/comments`);
export const createComment = (personId, data) => api.post(`/people/${personId}/comments`, data);
export const deleteComment = (id) => api.delete(`/comments/${id}`);

// Stats
export const getStats = () => api.get('/stats');
export const healthCheck = () => api.get('/health');

export default api;
