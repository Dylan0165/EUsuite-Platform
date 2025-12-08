import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authAPI, userAPI } from '../api/client';
import toast from 'react-hot-toast';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  account_type: 'particulier' | 'company_admin' | 'company_user' | 'superadmin';
  phone?: string;
  is_verified: boolean;
  created_at: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    account_type: 'particulier' | 'company_admin';
    phone?: string;
  }) => Promise<boolean>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: {
    first_name?: string;
    last_name?: string;
    phone?: string;
  }) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken, isAuthenticated: true });
      },

      setUser: (user) => {
        set({ user });
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.login(email, password);
          const { access_token, refresh_token, user } = response.data;
          
          set({
            accessToken: access_token,
            refreshToken: refresh_token,
            user,
            isAuthenticated: true,
            isLoading: false,
          });

          toast.success('Welkom terug!');
          return true;
        } catch (error: any) {
          const message = error.response?.data?.detail || 'Login mislukt';
          set({ error: message, isLoading: false });
          toast.error(message);
          return false;
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          await authAPI.register(data);
          set({ isLoading: false });
          toast.success('Account aangemaakt! Check je email voor verificatie.');
          return true;
        } catch (error: any) {
          const message = error.response?.data?.detail || 'Registratie mislukt';
          set({ error: message, isLoading: false });
          toast.error(message);
          return false;
        }
      },

      logout: () => {
        authAPI.logout().catch(() => {});
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });
        toast.success('Uitgelogd');
      },

      fetchProfile: async () => {
        const { accessToken } = get();
        if (!accessToken) return;

        try {
          const response = await userAPI.getProfile();
          set({ user: response.data });
        } catch (error) {
          // Token might be invalid
          get().logout();
        }
      },

      updateProfile: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await userAPI.updateProfile(data);
          set({ user: response.data, isLoading: false });
          toast.success('Profiel bijgewerkt');
          return true;
        } catch (error: any) {
          const message = error.response?.data?.detail || 'Update mislukt';
          set({ error: message, isLoading: false });
          toast.error(message);
          return false;
        }
      },

      changePassword: async (currentPassword, newPassword) => {
        set({ isLoading: true, error: null });
        try {
          await userAPI.changePassword(currentPassword, newPassword);
          set({ isLoading: false });
          toast.success('Wachtwoord gewijzigd');
          return true;
        } catch (error: any) {
          const message = error.response?.data?.detail || 'Wachtwoord wijzigen mislukt';
          set({ error: message, isLoading: false });
          toast.error(message);
          return false;
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'eusuite-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
