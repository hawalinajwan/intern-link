import axios from 'axios';
import { clearAuth, getToken } from './auth';
import { showToast } from './toast';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: {
    Accept: 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestMethod = String(error.config?.method || 'get').toLowerCase();
    const skipNotFoundRedirect = error.config?.headers?.['X-Skip-NotFound-Redirect'] === '1';

    if (error.response?.status === 401) {
      clearAuth();

      if (typeof window !== 'undefined' && window.location.pathname !== '/auth/login') {
        window.location.href = '/auth/login';
      }
    }

    if (!error.response) {
      showToast('Jaringan bermasalah. Periksa koneksi lalu coba lagi.');
    }

    if (status === 403 && typeof window !== 'undefined' && window.location.pathname !== '/akses-ditolak') {
      window.location.href = '/akses-ditolak';
    }

    if (
      status === 404 &&
      requestMethod === 'get' &&
      !skipNotFoundRedirect &&
      typeof window !== 'undefined' &&
      window.location.pathname !== '/tidak-ditemukan'
    ) {
      window.location.href = '/tidak-ditemukan';
    }

    return Promise.reject(error);
  }
);

export default api;
