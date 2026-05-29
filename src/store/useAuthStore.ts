// src/store/useAuthStore.ts
import { create } from 'zustand';
import Cookies from 'js-cookie';
import { User } from '../types';

const decodeJwt = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

interface AuthState {
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (accessToken: string, refreshToken: string, user: User) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  setAccessToken: (token: string) => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: (accessToken, refreshToken, user) => {
    Cookies.set('access_token', accessToken, { expires: 15 / (24 * 60), secure: true, sameSite: 'strict' });
    Cookies.set('refresh_token', refreshToken, { expires: 7, secure: true, sameSite: 'strict' });

    set({
      accessToken,
      user,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  logout: () => {
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    set({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },

  updateUser: (updatedFields) => {
    set((state) => {
      if (!state.user) return state;
      return { user: { ...state.user, ...updatedFields } };
    });
  },

  setAccessToken: (token) => {
    Cookies.set('access_token', token, { expires: 15 / (24 * 60), secure: true, sameSite: 'strict' });
    set({ accessToken: token });
  },

  initialize: async () => {
    const initialAccessToken = Cookies.get('access_token') || null;
    const initialRefreshToken = Cookies.get('refresh_token') || null;

    if (initialAccessToken || initialRefreshToken) {
      try {
        const { api } = await import('../lib/axios');
        const response = await api.get('/auth/profile');
        const user = response.data;

        let finalAccessToken = initialAccessToken;

        // 🚀 [NEW LOGIC] ตรวจสอบสิทธิ์ระหว่าง Database กับ Cookie
        if (initialAccessToken) {
          const payload = decodeJwt(initialAccessToken);
          if (payload) {
            const tokenRoles = payload.roles?.sort().join(',') || '';
            const dbRoles = user.roles?.sort().join(',') || '';
            const tokenPerms = payload.permissions?.sort().join(',') || '';
            const dbPerms = user.permissions?.sort().join(',') || '';

            if (tokenRoles !== dbRoles || tokenPerms !== dbPerms) {
              if (initialRefreshToken) { 
                try {
                  const refreshRes = await api.post('/auth/refresh', {
                    refresh_token: initialRefreshToken
                  });

                  if (refreshRes.data?.access_token) {
                    const newAccess = String(refreshRes.data.access_token);
                    finalAccessToken = newAccess;
                    Cookies.set('access_token', newAccess, { expires: 15 / (24 * 60), secure: true, sameSite: 'strict' });

                    if (refreshRes.data?.refresh_token) {
                      const newRefresh = String(refreshRes.data.refresh_token);
                      Cookies.set('refresh_token', newRefresh, { expires: 7, secure: true, sameSite: 'strict' });
                    }
                  }
                } catch (refreshErr) {
                  if (typeof window !== 'undefined') {
                    window.location.href = '/'; 
                  }
                }
              }
            }
          }
        }

        set({
          accessToken: finalAccessToken,
          user,
          isAuthenticated: true,
          isLoading: false,
        });
        return;
      } catch (e) {
        Cookies.remove('access_token');
        Cookies.remove('refresh_token');
      }
    }

    set({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },
}));