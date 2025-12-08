import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import apiClient from '@/api/client'

interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  role: 'admin' | 'manager' | 'user' | 'viewer'
  company_id: number
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
  clearError: () => void
  setUser: (user: User) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await apiClient.post('/auth/login', { email, password })
          const { access_token, user } = response.data
          
          set({
            token: access_token,
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
        } catch (error: any) {
          const message = error.response?.data?.detail || 'Login failed'
          set({
            isLoading: false,
            error: message,
            isAuthenticated: false,
            user: null,
            token: null,
          })
          throw new Error(message)
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        })
      },

      checkAuth: async () => {
        const { token } = get()
        
        if (!token) {
          set({ isLoading: false, isAuthenticated: false })
          return
        }
        
        try {
          const response = await apiClient.get('/auth/me')
          set({
            user: response.data,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          })
        }
      },

      clearError: () => {
        set({ error: null })
      },

      setUser: (user: User) => {
        set({ user })
      },
    }),
    {
      name: 'eusuite-company-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
    }
  )
)
