import axios from 'axios';

// API base URL
const API_URL = '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============ Types ============

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  admin_email: string;
}

export interface ValidateResponse {
  valid: boolean;
  email?: string;
  expires_at?: string;
}

export interface User {
  id: number;
  user_id: string;
  username: string;
  email: string | null;
  avatar_color: string | null;
  is_active: boolean;
  storage_quota?: number;
  storage_used?: number;
  storage_quota_gb?: number;
  storage_used_gb?: number;
  file_count?: number;
  actual_storage?: number;
  actual_storage_mb?: number;
  created_at: string | null;
  last_login: string | null;
}

export interface UserStorage {
  user_id: string;
  total_files: number;
  total_bytes: number;
  total_mb: number;
  total_gb: number;
  storage_by_type: Record<string, { count: number; bytes: number; mb: number }>;
}

export interface UserActivity {
  action: string;
  detail: string;
  timestamp: string | null;
  metadata: Record<string, any> | null;
}

export interface SystemStats {
  total_users: number;
  active_users_24h: number;
  total_storage: {
    total_files: number;
    total_bytes: number;
    total_mb: number;
    total_gb: number;
    users_with_files: number;
  };
}

export interface Pod {
  name: string;
  status: string;
  ready: boolean;
  restarts: number;
  created: string | null;
  app: string;
  node: string | null;
}

// Alias for backward compatibility
export type PodInfo = Pod;

export interface PodMetrics {
  name: string;
  cpu_millicores: number;
  memory_mb: number;
  timestamp: string;
}

export interface Deployment {
  name: string;
  replicas: number;
  ready_replicas: number;
  available_replicas: number;
  updated_replicas: number;
  created: string | null;
}

export interface ActionResponse {
  success: boolean;
  message: string;
  details?: Record<string, any>;
}

// ============ Admin API ============

export const adminApi = {
  // Auth
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const { data } = await api.post('/admin/login', { email, password });
    return data;
  },

  validateToken: async (): Promise<ValidateResponse> => {
    const { data } = await api.get('/admin/validate');
    return data;
  },

  logout: async (): Promise<void> => {
    await api.post('/admin/logout');
  },

  // Users
  getUsers: async (limit = 100, offset = 0): Promise<{ users: User[]; total: number }> => {
    const { data } = await api.get('/admin/users', { params: { limit, offset } });
    return data;
  },

  getUser: async (userId: string): Promise<User> => {
    const { data } = await api.get(`/admin/user/${userId}`);
    return data;
  },

  getUserStorage: async (userId: string): Promise<UserStorage> => {
    const { data } = await api.get(`/admin/user/${userId}/storage`);
    return data;
  },

  getUserActivity: async (userId: string, limit = 50): Promise<{ user_id: string; activities: UserActivity[] }> => {
    const { data } = await api.get(`/admin/user/${userId}/activity`, { params: { limit } });
    return data;
  },

  deleteUser: async (userId: string): Promise<ActionResponse> => {
    const { data } = await api.delete(`/admin/user/${userId}`);
    return data;
  },

  blockUser: async (userId: string): Promise<ActionResponse> => {
    const { data } = await api.post(`/admin/user/${userId}/block`);
    return data;
  },

  unblockUser: async (userId: string): Promise<ActionResponse> => {
    const { data } = await api.post(`/admin/user/${userId}/unblock`);
    return data;
  },

  resetUserStorage: async (userId: string): Promise<ActionResponse> => {
    const { data } = await api.post(`/admin/user/${userId}/resetStorage`);
    return data;
  },

  forceLogoutUser: async (userId: string): Promise<ActionResponse> => {
    const { data } = await api.post(`/admin/user/${userId}/forceLogout`);
    return data;
  },

  // System
  getSystemStats: async (): Promise<SystemStats> => {
    const { data } = await api.get('/admin/system/stats');
    return data;
  },

  getSystemUsage: async (): Promise<{
    pods: PodMetrics[];
    nodes: any[];
    total_cpu_millicores: number;
    total_memory_mb: number;
  }> => {
    const { data } = await api.get('/admin/system/usage');
    return data;
  },

  getSystemStorage: async (): Promise<{
    total_storage: Record<string, any>;
    persistent_volumes: any[];
  }> => {
    const { data } = await api.get('/admin/system/storage');
    return data;
  },

  getPods: async (): Promise<{ pods: Pod[]; total: number; running: number; not_ready: number }> => {
    const { data } = await api.get('/admin/system/pods');
    return data;
  },

  getDeployments: async (): Promise<{ deployments: Deployment[]; total: number }> => {
    const { data } = await api.get('/admin/system/deployments');
    return data;
  },

  getLogs: async (podName?: string, lines = 100): Promise<any> => {
    const params: Record<string, any> = { lines };
    if (podName) params.pod_name = podName;
    const { data } = await api.get('/admin/system/logs', { params });
    return data;
  },

  restartDeployment: async (deploymentName: string): Promise<ActionResponse> => {
    const { data } = await api.post(`/admin/system/restart/${deploymentName}`);
    return data;
  },
};

export default api;
