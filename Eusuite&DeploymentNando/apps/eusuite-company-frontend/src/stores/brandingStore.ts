import { create } from 'zustand'
import apiClient from '@/api/client'

interface Branding {
  id: number
  company_id: number
  primary_color: string
  secondary_color: string
  accent_color: string | null
  background_color: string
  text_color: string
  logo_url: string | null
  logo_dark_url: string | null
  favicon_url: string | null
  company_name_display: string | null
  tagline: string | null
  show_powered_by: boolean
  custom_css: string | null
}

interface BrandingState {
  branding: Branding | null
  isLoading: boolean
  error: string | null
  
  fetchBranding: () => Promise<void>
  updateBranding: (data: Partial<Branding>) => Promise<void>
  uploadLogo: (file: File, type: 'logo' | 'logo_dark' | 'favicon') => Promise<string>
  applyBranding: (branding: Branding) => void
}

export const useBrandingStore = create<BrandingState>((set, get) => ({
  branding: null,
  isLoading: false,
  error: null,

  fetchBranding: async () => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await apiClient.get('/branding')
      const branding = response.data
      
      set({ branding, isLoading: false })
      get().applyBranding(branding)
    } catch (error: any) {
      // Branding might not be set yet, use defaults
      set({ isLoading: false })
    }
  },

  updateBranding: async (data: Partial<Branding>) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await apiClient.put('/branding', data)
      const branding = response.data
      
      set({ branding, isLoading: false })
      get().applyBranding(branding)
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to update branding'
      set({ isLoading: false, error: message })
      throw new Error(message)
    }
  },

  uploadLogo: async (file: File, type: 'logo' | 'logo_dark' | 'favicon') => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)
    
    const response = await apiClient.post('/branding/logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    
    // Refresh branding after upload
    await get().fetchBranding()
    
    return response.data.url
  },

  applyBranding: (branding: Branding) => {
    const root = document.documentElement
    
    root.style.setProperty('--brand-primary', branding.primary_color)
    root.style.setProperty('--brand-secondary', branding.secondary_color)
    root.style.setProperty('--brand-accent', branding.accent_color || '#3b82f6')
    root.style.setProperty('--brand-background', branding.background_color)
    root.style.setProperty('--brand-text', branding.text_color)
    
    // Update favicon if set
    if (branding.favicon_url) {
      const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
      if (favicon) {
        favicon.href = branding.favicon_url
      }
    }
    
    // Update page title with company name
    if (branding.company_name_display) {
      document.title = `${branding.company_name_display} Admin | EUSuite`
    }
    
    // Apply custom CSS
    if (branding.custom_css) {
      let styleEl = document.getElementById('custom-branding-css')
      if (!styleEl) {
        styleEl = document.createElement('style')
        styleEl.id = 'custom-branding-css'
        document.head.appendChild(styleEl)
      }
      styleEl.textContent = branding.custom_css
    }
  },
}))
