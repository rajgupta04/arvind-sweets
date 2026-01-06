import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV, assertRequiredEnv } from '../config/env';

// Keep the storage key centralized so all services share it.
export const STORAGE_KEYS = {
  TOKEN: 'auth.token',
};

assertRequiredEnv();

export const api = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: 20000,
});

// Attach JWT on every request.
// Axios supports async interceptors; we return a Promise<config>.
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Normalize API errors to a predictable shape for UI.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      'Request failed';

    return Promise.reject({
      message,
      status: error?.response?.status,
      data: error?.response?.data,
      original: error,
    });
  }
);
