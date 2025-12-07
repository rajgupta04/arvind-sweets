// API configuration - Axios setup
import axios from 'axios';

const backendUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL;
const apiBase = backendUrl ? `${backendUrl}/api` : '/api';

const API = axios.create({
  baseURL: apiBase,
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
