import axios from 'axios';

// Reads backend API URL strictly from .env (VITE_API_BASE_URL)
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 25000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to automatically attach Admin JWT token from localStorage
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401 && !error.config?.url?.includes('/auth/login')) {
      console.warn('Unauthorized admin request - Token expired or invalid. Prompting re-authentication.');
      localStorage.removeItem('admin_token');
      localStorage.removeItem('studegram_user');
      window.dispatchEvent(new CustomEvent('auth:unauthorized', { 
        detail: { message: error.response.data?.message || 'Your session has expired. Please log in again.' } 
      }));
    }
    return Promise.reject(error);
  }
);

export default API;
