import { normalizeDisplayIds } from '../utils/displayId';
import axios from 'axios';
import { loadingManager } from '../utils/loadingManager';

// Use the configured API, defaulting to the hosted backend. Set VITE_API_BASE_URL for local backend development.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() || 'https://api.unigather.app/api';

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // Allow up to two minutes for uploads and slower API requests.
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to automatically attach Admin JWT token from localStorage and coordinate Unigather loading
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (!config.silent && !config.headers?.['x-silent-loader']) {
      const url = String(config.url || '');
      let label = 'Processing request...';
      if (config.loadingText) {
        label = config.loadingText;
      } else if (url.includes('/auth/login')) {
        label = 'Signing in to Unigather Admin...';
      } else if (url.includes('/auth/forgot-password')) {
        label = 'Sending password recovery...';
      } else if (config.method === 'get') {
        label = 'Loading workspace data...';
      } else if (config.method === 'post') {
        label = 'Saving changes...';
      } else if (config.method === 'put' || config.method === 'patch') {
        label = 'Updating records...';
      } else if (config.method === 'delete') {
        label = 'Removing record...';
      }
      config._loaderKey = loadingManager.start(null, label);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

API.interceptors.response.use(
  (response) => {
    if (response.config?._loaderKey) {
      loadingManager.stop(response.config._loaderKey);
    }
    response.data = normalizeDisplayIds(response.data);
    return response;
  },
  (error) => {
    if (error.config?._loaderKey) {
      loadingManager.stop(error.config._loaderKey);
    }
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
