import { create } from 'zustand';
import Cookies from 'js-cookie';
import { User } from '../types';

interface AuthState {
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (accessToken: string, refreshToken: string, user: User) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  setAccessToken: (token: string) => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: (accessToken, refreshToken, user) => {
    // Set Cookies for NEXT.JS middleware checking (Expires in 7 days for refresh token, 15m for access token)
    Cookies.set('access_token', accessToken, { expires: 15 / (24 * 60), secure: true, sameSite: 'strict' });
    Cookies.set('refresh_token', refreshToken, { expires: 7, secure: true, sameSite: 'strict' });

    // Set localStorage for profile data
    localStorage.setItem('user_profile', JSON.stringify(user));

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
    localStorage.removeItem('user_profile');
    set({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  updateUser: (updatedFields) => {
    set((state) => {
      if (!state.user) return state;
      const newUser = { ...state.user, ...updatedFields };
      localStorage.setItem('user_profile', JSON.stringify(newUser));
      return { user: newUser };
    });
  },

  setAccessToken: (token) => {
    Cookies.set('access_token', token, { expires: 15 / (24 * 60), secure: true, sameSite: 'strict' });
    set({ accessToken: token });
  },

  initialize: () => {
    const accessToken = Cookies.get('access_token') || null;
    const refreshToken = Cookies.get('refresh_token') || null;
    const savedUser = localStorage.getItem('user_profile');

    if (refreshToken && savedUser) {
      try {
        const user = JSON.parse(savedUser) as User;
        set({
          accessToken,
          user,
          isAuthenticated: true,
          isLoading: false,
        });
        return;
      } catch (e) {
        localStorage.removeItem('user_profile');
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
