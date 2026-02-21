import axios from 'axios';

const api = axios.create({
  baseURL: '/bigot-registry/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

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
