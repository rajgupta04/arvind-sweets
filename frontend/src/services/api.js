// API configuration - Axios setup
import axios from 'axios';

const envBackendUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL;

let backendUrl = envBackendUrl;

// Safety fallback for production if env isn't injected at build time.
// Avoids calling `/api` on the static frontend host (which can hang behind rewrites).
if (!backendUrl && typeof window !== 'undefined') {
  const host = window.location.hostname;
  const isLocalHost = host === 'localhost' || host === '127.0.0.1';
  if (!isLocalHost) {
    backendUrl = 'https://arvind-sweets.onrender.com';
  }
}

const apiBase = backendUrl ? `${backendUrl}/api` : '/api';

const API = axios.create({
  baseURL: apiBase,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;
