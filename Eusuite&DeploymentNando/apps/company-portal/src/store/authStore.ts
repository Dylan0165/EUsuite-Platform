import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

export interface Company {
  id: number;
  name: string;
  slug: string;
  logo_url?: string;
  primary_color?: string;
  subscription_plan: string;
  status: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  company: Company | null;
  isAuthenticated: boolean;
  
  login: (token: string, user: User, company: Company) => void;
  logout: () => void;
  updateCompany: (company: Company) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      company: null,
      isAuthenticated: false,
      
      login: (token, user, company) => set({
        token,
        user,
        company,
        isAuthenticated: true,
      }),
      
      logout: () => set({
        token: null,
        user: null,
        company: null,
        isAuthenticated: false,
      }),
      
      updateCompany: (company) => set({ company }),
    }),
    {
      name: 'company-portal-auth',
    }
  )
);
