import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Delete all users - DANGER ZONE! 🚨⚠️
export const deleteAllUsers = async (confirmationCode) => {
  try {
    const response = await api.delete('/auth/delete-all-users', {
      data: { confirmationCode }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Delete all messages - DANGER ZONE! 🚨⚠️
export const deleteAllMessages = async (confirmationCode) => {
  try {
    const response = await api.delete('/messages/delete-all', {
      data: { confirmationCode }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export default api; 
