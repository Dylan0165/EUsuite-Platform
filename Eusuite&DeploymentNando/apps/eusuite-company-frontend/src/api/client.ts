import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Add tenant header if available
    const tenant = getTenantFromSubdomain()
    if (tenant) {
      config.headers['X-Tenant-ID'] = tenant
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - logout
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    
    return Promise.reject(error)
  }
)

// Extract tenant from subdomain
function getTenantFromSubdomain(): string | null {
  const host = window.location.hostname
  
  // Pattern: {tenant}.company.eusuite.eu or {tenant}.company.eusuite.local
  const match = host.match(/^([^.]+)\.company\.eusuite\.(eu|local)$/)
  if (match) {
    return match[1]
  }
  
  // For development, allow tenant from localStorage
  if (import.meta.env.DEV) {
    return localStorage.getItem('dev_tenant') || null
  }
  
  return null
}

export default apiClient
export { getTenantFromSubdomain }
