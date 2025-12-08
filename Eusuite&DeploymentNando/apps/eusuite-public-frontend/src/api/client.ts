import axios, { AxiosInstance, AxiosError } from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token } = response.data;
          useAuthStore.getState().setTokens(access_token, refresh_token);

          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    account_type: 'particulier' | 'company_admin';
    phone?: string;
  }) => api.post('/auth/register', data),

  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  logout: () => api.post('/auth/logout'),

  verifyEmail: (token: string) =>
    api.get(`/auth/verify-email/${token}`),

  resendVerification: (email: string) =>
    api.post('/auth/resend-verification', { email }),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    api.post(`/auth/reset-password/${token}`, { password }),

  refreshToken: (refreshToken: string) =>
    api.post('/auth/refresh', { refresh_token: refreshToken }),
};

// User API
export const userAPI = {
  getProfile: () => api.get('/users/me'),

  updateProfile: (data: {
    first_name?: string;
    last_name?: string;
    phone?: string;
  }) => api.put('/users/me', data),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/users/me/password', {
      current_password: currentPassword,
      new_password: newPassword,
    }),

  deleteAccount: () => api.delete('/users/me'),
};

// Plans API
export const plansAPI = {
  getAll: () => api.get('/plans/'),

  getById: (planId: number) => api.get(`/plans/${planId}`),

  comparePlans: () => api.get('/plans/compare'),
};

// Subscriptions API
export const subscriptionsAPI = {
  getMine: () => api.get('/subscriptions/mine'),

  create: (data: {
    plan_id: number;
    billing_cycle: 'monthly' | 'yearly';
    company_id?: number;
  }) => api.post('/subscriptions/', data),

  cancel: (subscriptionId: number) =>
    api.put(`/subscriptions/${subscriptionId}/cancel`),

  upgrade: (subscriptionId: number, newPlanId: number) =>
    api.put(`/subscriptions/${subscriptionId}/upgrade`, { new_plan_id: newPlanId }),
};

// Payments API
export const paymentsAPI = {
  createIntent: (data: {
    subscription_id?: number;
    amount_cents?: number;
    description?: string;
  }) => api.post('/payments/create-intent', data),

  getHistory: (page?: number, perPage?: number) =>
    api.get('/payments/history', { params: { page, per_page: perPage } }),
};

// Companies API
export const companiesAPI = {
  register: (data: {
    name: string;
    kvk_number?: string;
    btw_number?: string;
    address?: string;
    city?: string;
    postal_code?: string;
    country?: string;
    phone?: string;
    website?: string;
    plan_id: number;
    billing_cycle: 'monthly' | 'yearly';
  }) => api.post('/companies/register', data),

  getMine: () => api.get('/companies/mine'),
};

// Public API
export const publicAPI = {
  getStats: () => api.get('/public/stats'),

  getTestimonials: () => api.get('/public/testimonials'),

  getFAQ: () => api.get('/public/faq'),

  getApps: () => api.get('/public/apps'),

  submitContact: (data: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }) => api.post('/public/contact', data),
};

export default api;
