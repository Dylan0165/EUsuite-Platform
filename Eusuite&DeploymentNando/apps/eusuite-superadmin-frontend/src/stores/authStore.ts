import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AdminUser {
  id: number
  email: string
  first_name: string | null
  last_name: string | null
  role: 'super_admin' | 'admin' | 'support' | 'viewer'
  is_active: boolean
  last_login: string | null
  created_at: string
}

interface AuthState {
  token: string | null
  refreshToken: string | null
  user: AdminUser | null
  isAuthenticated: boolean
  setAuth: (token: string, refreshToken: string, user: AdminUser) => void
  setUser: (user: AdminUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      
      setAuth: (token, refreshToken, user) =>
        set({
          token,
          refreshToken,
          user,
          isAuthenticated: true,
        }),
      
      setUser: (user) =>
        set({
          user,
        }),
      
      logout: () =>
        set({
          token: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'eusuite-superadmin-auth',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
