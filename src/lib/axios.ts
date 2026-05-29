import axios from 'axios';
import Cookies from 'js-cookie';
import { useAuthStore } from '../store/useAuthStore';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor
api.interceptors.request.use(
  (config) => {
    // 1. Get access token from cookie (most up-to-date source) or zustand store
    const token = Cookies.get('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Public auth endpoints that should NOT trigger token refresh or redirect
const PUBLIC_AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/verify-email', '/auth/resend-verification'];

// Response Interceptor for Token Refresh
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Catch Rate Limit errors and override with user-friendly message
    if (error.response?.status === 429) {
      const rateLimitMsg = 'Too many requests. Please try again after some time.';
      if (error.response.data) {
        if (typeof error.response.data === 'string') {
          error.response.data = { message: rateLimitMsg };
        } else {
          error.response.data.message = rateLimitMsg;
        }
      } else {
        error.response.data = { message: rateLimitMsg };
      }
      return Promise.reject(error);
    }

    const originalRequest = error.config;
    const requestUrl = originalRequest?.url || '';

    // Skip interceptor logic for public auth endpoints
    // Let the calling component handle the error directly (e.g., show toast)
    if (PUBLIC_AUTH_PATHS.some((path) => requestUrl.includes(path))) {
      return Promise.reject(error);
    }

    // If 401 error and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = Cookies.get('refresh_token');
      if (refreshToken) {
        try {
          // Call refresh token endpoint (avoid intercepting this call to prevent loops)
          const response = await axios.post(`${baseURL}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token, user } = response.data;

          // Update Zustand store and cookies
          useAuthStore.getState().setAccessToken(access_token);
          if (user) {
            useAuthStore.getState().updateUser(user);
          }

          // Retry the original request with the new access token
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed - force logout
          useAuthStore.getState().logout();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token available - force logout
        useAuthStore.getState().logout();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);
