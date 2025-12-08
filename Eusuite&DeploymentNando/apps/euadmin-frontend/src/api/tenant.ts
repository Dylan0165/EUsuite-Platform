/**
 * EUAdmin Frontend - API Client for Multi-tenant Platform
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://192.168.124.50:30095/api';

// Helper for API calls
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  
  if (response.status === 204) {
    return {} as T;
  }
  
  return response.json();
}

// ============================================================================
// TYPES
// ============================================================================

export interface Company {
  id: number;
  name: string;
  slug: string;
  description?: string;
  contact_email: string;
  contact_phone?: string;
  billing_email?: string;
  registered_at?: string;
  approved_at?: string;
  is_active: boolean;
  is_approved: boolean;
  is_suspended: boolean;
  suspension_reason?: string;
  deployment_target: string;
  namespace?: string;
  domain?: string;
  max_users: number;
  max_storage_gb: number;
  status: 'pending' | 'active' | 'suspended' | 'deleted';
  external_cluster_config?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  user_count?: number;
  storage_used?: number;
}

export interface CompanyUser {
  id: number;
  company_id: number;
  first_name: string;
  last_name: string;
  full_name?: string;
  email: string;
  role: string;
  is_active: boolean;
  is_verified?: boolean;
  department?: string;
  job_title?: string;
  phone?: string;
  storage_quota?: number;
  storage_used?: number;
  storage_quota_gb?: number;
  storage_used_gb?: number;
  last_login?: string;
  created_at?: string;
}

// Alias for backward compatibility
export type CompanyBranding = Branding;

export interface Branding {
  id: number;
  company_id: number;
  company_display_name?: string;
  tagline?: string;
  logo_url?: string;
  logo_dark_url?: string;
  favicon_url?: string;
  header_logo_url?: string;
  login_background_url?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  header_bg_color: string;
  header_text_color: string;
  sidebar_bg_color: string;
  sidebar_text_color: string;
  font_family: string;
  heading_font_family?: string;
  custom_css?: string;
  login_title?: string;
  login_subtitle?: string;
  login_welcome_message?: string;
  footer_text?: string;
  footer_links?: { label: string; url: string }[];
  social_links?: Record<string, string>;
}

export interface StoragePolicy {
  id: number;
  company_id: number;
  policy_type: string;
  max_file_size_mb: number;
  allowed_extensions: string[];
  blocked_extensions: string[];
  total_storage_quota?: number;
  storage_used?: number;
  default_user_quota?: number;
  file_retention_days?: number;
  trash_retention_days?: number;
  backup_enabled?: boolean;
  backup_frequency_hours?: number;
  backup_retention_days?: number;
  encryption_enabled?: boolean;
  encryption_algorithm?: string;
  has_company_storage?: boolean;
  total_storage_quota_gb?: number;
  storage_used_gb?: number;
}

export interface Deployment {
  id: number;
  company_id: number;
  deployment_id: string;
  deployment_type: string;
  target: string;
  namespace: string;
  services_deployed?: string[];
  status: string;
  status_message?: string;
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number;
  can_rollback: boolean;
  created_at?: string;
}

export interface PlatformStats {
  total_companies: number;
  active_companies: number;
  pending_approval: number;
  total_users: number;
  total_deployments: number;
  successful_deployments: number;
  failed_deployments: number;
  total_storage_used: number;
  total_storage_used_gb: number;
  active_namespaces: number;
}

export interface DeploymentPreview {
  company_id: number;
  company_name: string;
  namespace: string;
  target: string;
  services: {
    type: string;
    name: string;
    port?: number;
    replicas: number;
  }[];
  estimated_resources: {
    cpu: string;
    memory: string;
  };
  branding?: Record<string, unknown>;
}

// ============================================================================
// COMPANIES API
// ============================================================================

export const companiesApi = {
  list: async (params: {
    page?: number;
    page_size?: number;
    search?: string;
    is_active?: boolean;
    is_approved?: boolean;
  } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.page_size) searchParams.set('page_size', String(params.page_size));
    if (params.search) searchParams.set('search', params.search);
    if (params.is_active !== undefined) searchParams.set('is_active', String(params.is_active));
    if (params.is_approved !== undefined) searchParams.set('is_approved', String(params.is_approved));
    
    return fetchApi<{ companies: Company[]; total: number; page: number; page_size: number }>(
      `/companies?${searchParams}`
    );
  },
  
  get: (id: number) => fetchApi<Company>(`/companies/${id}`),
  
  create: (data: {
    name: string;
    slug?: string;
    description?: string;
    contact_email: string;
    contact_phone?: string;
    billing_email?: string;
    deployment_target?: string;
  }) => fetchApi<Company>('/companies', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  update: (id: number, data: Partial<Company>) =>
    fetchApi<Company>(`/companies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  
  delete: (id: number) => fetchApi<void>(`/companies/${id}`, { method: 'DELETE' }),
  
  approve: (id: number, approvedBy: number) =>
    fetchApi<Company>(`/companies/${id}/approve?approved_by=${approvedBy}`, { method: 'POST' }),
  
  suspend: (id: number, reason: string) =>
    fetchApi<Company>(`/companies/${id}/suspend?reason=${encodeURIComponent(reason)}`, { method: 'POST' }),
  
  unsuspend: (id: number) =>
    fetchApi<Company>(`/companies/${id}/unsuspend`, { method: 'POST' }),
  
  getStats: (id: number) => fetchApi<{
    company_id: number;
    company_name: string;
    user_count: number;
    active_users: number;
    storage_used: number;
    storage_quota: number;
    storage_percentage: number;
    deployed_services: number;
    total_services: number;
  }>(`/companies/${id}/stats`),
  
  register: (data: {
    company_name: string;
    contact_email: string;
    contact_phone?: string;
    admin_first_name: string;
    admin_last_name: string;
    admin_email?: string;
    password: string;
    description?: string;
  }) => fetchApi<{ company: Company; admin: CompanyUser; message: string }>(
    '/companies/register',
    { method: 'POST', body: JSON.stringify(data) }
  ),
};

// ============================================================================
// COMPANY USERS API
// ============================================================================

export const companyUsersApi = {
  list: async (companyId: number, params: {
    page?: number;
    page_size?: number;
    search?: string;
    role?: string;
    is_active?: boolean;
  } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.page_size) searchParams.set('page_size', String(params.page_size));
    if (params.search) searchParams.set('search', params.search);
    if (params.role) searchParams.set('role', params.role);
    if (params.is_active !== undefined) searchParams.set('is_active', String(params.is_active));
    
    const response = await fetchApi<{ users: CompanyUser[]; total: number; page: number; page_size: number }>(
      `/companies/${companyId}/users?${searchParams}`
    );
    return response.users;
  },
  
  get: (companyId: number, userId: number) =>
    fetchApi<CompanyUser>(`/companies/${companyId}/users/${userId}`),
  
  create: (companyId: number, data: {
    first_name: string;
    last_name: string;
    email?: string;
    password?: string;
    role?: string;
    is_active?: boolean;
    department?: string;
    job_title?: string;
    storage_quota?: number;
  }) => fetchApi<{
    user: CompanyUser;
    generated_email: string;
    generated_password: string;
  }>(`/companies/${companyId}/users`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  update: (companyId: number, userId: number, data: Partial<CompanyUser>) =>
    fetchApi<CompanyUser>(`/companies/${companyId}/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  
  delete: (companyId: number, userId: number) =>
    fetchApi<void>(`/companies/${companyId}/users/${userId}`, { method: 'DELETE' }),
  
  resetPassword: (companyId: number, userId: number) =>
    fetchApi<{ user_id: number; email: string; new_password: string; message: string }>(
      `/companies/${companyId}/users/${userId}/reset-password`,
      { method: 'POST' }
    ),
};

// ============================================================================
// BRANDING API
// ============================================================================

export const brandingApi = {
  get: (companyId: number) => fetchApi<Branding>(`/companies/${companyId}/branding`),
  
  update: (companyId: number, data: Partial<Branding>) =>
    fetchApi<Branding>(`/companies/${companyId}/branding`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  reset: (companyId: number) =>
    fetchApi<Branding>(`/companies/${companyId}/branding/reset`, { method: 'POST' }),
  
  getJson: (companyId: number) =>
    fetchApi<Record<string, unknown>>(`/companies/${companyId}/branding.json`),
};

// ============================================================================
// STORAGE POLICY API
// ============================================================================

export const storagePolicyApi = {
  get: (companyId: number) => fetchApi<StoragePolicy>(`/companies/${companyId}/storage-policy`),
  
  update: (companyId: number, data: Partial<StoragePolicy>) =>
    fetchApi<StoragePolicy>(`/companies/${companyId}/storage-policy`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  getStats: (companyId: number) => fetchApi<{
    total_quota: number;
    total_quota_gb: number;
    total_used: number;
    total_used_gb: number;
    percentage_used: number;
    available: number;
    available_gb: number;
    user_count: number;
    default_user_quota: number;
    default_user_quota_gb: number;
    max_file_size: number;
    max_file_size_mb: number;
  }>(`/companies/${companyId}/storage-policy/stats`),
  
  getOptions: (companyId: number) => fetchApi<{
    options: string[];
    default: string;
    policy_type: string;
    has_company_storage: boolean;
  }>(`/companies/${companyId}/storage-policy/options`),
};

// ============================================================================
// DEPLOYMENTS API
// ============================================================================

export const deploymentsApi = {
  deploy: (companyId: number, data: {
    deployment_type?: string;
    services?: string[];
    namespace?: string;
    force?: boolean;
  } = {}, initiatedBy?: number) => {
    const params = initiatedBy ? `?initiated_by=${initiatedBy}` : '';
    return fetchApi<Deployment>(`/companies/${companyId}/deploy${params}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  listForCompany: async (companyId: number, params: { page?: number; page_size?: number } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.page_size) searchParams.set('page_size', String(params.page_size));
    
    const response = await fetchApi<{ deployments: Deployment[]; total: number; page: number; page_size: number }>(
      `/companies/${companyId}/deployments?${searchParams}`
    );
    return response.deployments;
  },
  
  getHistory: (companyId: number, params: { page?: number; page_size?: number } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.page_size) searchParams.set('page_size', String(params.page_size));
    
    return fetchApi<{ deployments: Deployment[]; total: number; page: number; page_size: number }>(
      `/companies/${companyId}/deployments?${searchParams}`
    );
  },
  
  get: (deploymentId: string) => fetchApi<Deployment>(`/deployments/${deploymentId}`),
  
  getLogs: (deploymentId: string) => fetchApi<{
    deployment_id: string;
    status: string;
    logs: string;
  }>(`/deployments/${deploymentId}/logs`),
  
  getYaml: (deploymentId: string) => fetchApi<{
    deployment_id: string;
    namespace: string;
    yaml: string;
  }>(`/deployments/${deploymentId}/yaml`),
  
  rollback: (companyId: number, targetDeploymentId: string, initiatedBy?: number) => {
    const params = new URLSearchParams({ target_deployment_id: targetDeploymentId });
    if (initiatedBy) params.set('initiated_by', String(initiatedBy));
    return fetchApi<Deployment>(`/companies/${companyId}/rollback?${params}`, { method: 'POST' });
  },
  
  delete: (companyId: number) =>
    fetchApi<void>(`/companies/${companyId}/deployment`, { method: 'DELETE' }),
  
  preview: (companyId: number) => fetchApi<DeploymentPreview>(`/companies/${companyId}/deploy/preview`),
  
  previewYaml: (companyId: number) => fetchApi<{
    company_id: number;
    namespace: string;
    yaml: string;
    ports: Record<string, number>;
  }>(`/companies/${companyId}/deploy/yaml-preview`),
};

// ============================================================================
// PORTS API
// ============================================================================

export const portsApi = {
  getAvailable: (count: number = 10) => fetchApi<{
    available_ports: number[];
    allocated_ports: {
      port: number;
      company_id?: number;
      service_type?: string;
      namespace?: string;
      is_allocated: boolean;
      allocated_at?: string;
    }[];
    port_range: { min: number; max: number };
  }>(`/ports/available?count=${count}`),
  
  getCompanyPorts: (companyId: number) => fetchApi<{
    company_id: number;
    ports: Record<string, number>;
  }>(`/companies/${companyId}/ports`),
};

// ============================================================================
// PLATFORM API
// ============================================================================

export const platformApi = {
  getStats: () => fetchApi<PlatformStats>('/platform/stats'),
  
  health: () => fetchApi<{
    status: string;
    components: Record<string, string>;
  }>('/platform/health'),
};

// ============================================================================
// WEBSOCKET
// ============================================================================

export function createDeploymentLogsWebSocket(
  deploymentId: string,
  onMessage: (data: { type: string; message: string; data?: Record<string, unknown> }) => void,
  onError?: (error: Event) => void
): WebSocket {
  const wsBase = API_BASE.replace('http', 'ws');
  const ws = new WebSocket(`${wsBase}/ws/deployments/${deploymentId}/logs`);
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch {
      onMessage({ type: 'raw', message: event.data });
    }
  };
  
  ws.onerror = (error) => {
    if (onError) onError(error);
  };
  
  return ws;
}
