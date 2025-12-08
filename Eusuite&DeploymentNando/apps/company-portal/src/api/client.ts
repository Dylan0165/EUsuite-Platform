import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============ Auth API ============

export interface LoginRequest {
  email: string;
  password: string;
  company_slug: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  };
  company: {
    id: number;
    name: string;
    slug: string;
    logo_url?: string;
    primary_color?: string;
    subscription_plan: string;
    status: string;
  };
}

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },
  
  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },
  
  refreshToken: async (): Promise<{ access_token: string }> => {
    const response = await api.post('/auth/refresh');
    return response.data;
  },
};

// ============ Users API ============

export interface CompanyUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  created_at: string;
  last_login?: string;
}

export interface CreateUserRequest {
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  send_invite: boolean;
}

export const usersApi = {
  list: async (): Promise<CompanyUser[]> => {
    const response = await api.get('/users');
    return response.data;
  },
  
  get: async (id: number): Promise<CompanyUser> => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
  
  create: async (data: CreateUserRequest): Promise<CompanyUser> => {
    const response = await api.post('/users', data);
    return response.data;
  },
  
  update: async (id: number, data: Partial<CreateUserRequest>): Promise<CompanyUser> => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },
  
  delete: async (id: number): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
  
  resendInvite: async (id: number): Promise<void> => {
    await api.post(`/users/${id}/resend-invite`);
  },
};

// ============ Apps API ============

export interface EUSuiteApp {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  url?: string;
  status: 'active' | 'inactive' | 'deploying' | 'error';
}

export const appsApi = {
  list: async (): Promise<EUSuiteApp[]> => {
    const response = await api.get('/apps');
    return response.data;
  },
  
  toggle: async (appId: string, enabled: boolean): Promise<EUSuiteApp> => {
    const response = await api.post(`/apps/${appId}/toggle`, { enabled });
    return response.data;
  },
  
  getStatus: async (appId: string): Promise<{ status: string; url?: string }> => {
    const response = await api.get(`/apps/${appId}/status`);
    return response.data;
  },
};

// ============ Settings API ============

export interface CompanySettings {
  name: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  timezone: string;
  language: string;
  custom_domain?: string;
}

export const settingsApi = {
  get: async (): Promise<CompanySettings> => {
    const response = await api.get('/settings');
    return response.data;
  },
  
  update: async (data: Partial<CompanySettings>): Promise<CompanySettings> => {
    const response = await api.put('/settings', data);
    return response.data;
  },
  
  uploadLogo: async (file: File): Promise<{ logo_url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/settings/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

// ============ Stats API ============

export interface DashboardStats {
  total_users: number;
  active_users: number;
  storage_used_gb: number;
  storage_limit_gb: number;
  apps_enabled: number;
  apps_total: number;
}

export interface UsageHistory {
  date: string;
  active_users: number;
  storage_gb: number;
}

export const statsApi = {
  dashboard: async (): Promise<DashboardStats> => {
    const response = await api.get('/stats/dashboard');
    return response.data;
  },
  
  usageHistory: async (days: number = 30): Promise<UsageHistory[]> => {
    const response = await api.get(`/stats/usage?days=${days}`);
    return response.data;
  },
};

export default api;
