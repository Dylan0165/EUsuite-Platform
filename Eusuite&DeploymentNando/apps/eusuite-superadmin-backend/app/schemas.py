from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
from datetime import datetime
from enum import Enum


# Enums
class AdminRole(str, Enum):
    SUPERADMIN = "superadmin"
    ADMIN = "admin"
    SUPPORT = "support"
    VIEWER = "viewer"


class TenantStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    TERMINATED = "terminated"


class SubscriptionStatus(str, Enum):
    TRIAL = "trial"
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class PlanTier(str, Enum):
    FREE = "free"
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    PENDING = "pending"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


# Auth schemas
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: str
    role: str
    exp: datetime


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# Admin User schemas
class AdminUserBase(BaseModel):
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: AdminRole = AdminRole.VIEWER


class AdminUserCreate(AdminUserBase):
    password: str = Field(..., min_length=8)


class AdminUserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[AdminRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=8)


class AdminUserResponse(AdminUserBase):
    id: int
    is_active: bool
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Plan schemas
class PlanBase(BaseModel):
    name: str
    slug: str
    tier: PlanTier
    description: Optional[str] = None
    price_monthly: float = 0
    price_yearly: float = 0
    currency: str = "EUR"
    max_users: int = 5
    max_storage_gb: int = 10
    max_apps: int = 3
    features: List[str] = []


class PlanCreate(PlanBase):
    stripe_monthly_price_id: Optional[str] = None
    stripe_yearly_price_id: Optional[str] = None
    stripe_product_id: Optional[str] = None


class PlanUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price_monthly: Optional[float] = None
    price_yearly: Optional[float] = None
    max_users: Optional[int] = None
    max_storage_gb: Optional[int] = None
    max_apps: Optional[int] = None
    features: Optional[List[str]] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None
    sort_order: Optional[int] = None


class PlanResponse(PlanBase):
    id: int
    is_active: bool
    is_featured: bool
    sort_order: int
    stripe_product_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Tenant schemas
class TenantBase(BaseModel):
    name: str
    slug: str
    domain: Optional[str] = None
    contact_email: EmailStr
    contact_phone: Optional[str] = None
    contact_name: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: str = "NL"
    company_registration: Optional[str] = None
    vat_number: Optional[str] = None


class TenantCreate(TenantBase):
    plan_id: Optional[int] = None


class TenantUpdate(BaseModel):
    name: Optional[str] = None
    domain: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    contact_name: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    company_registration: Optional[str] = None
    vat_number: Optional[str] = None
    status: Optional[TenantStatus] = None
    plan_id: Optional[int] = None
    settings: Optional[dict] = None


class TenantResponse(TenantBase):
    id: int
    status: TenantStatus
    subscription_status: SubscriptionStatus
    trial_ends_at: Optional[datetime] = None
    subscription_ends_at: Optional[datetime] = None
    stripe_customer_id: Optional[str] = None
    current_users: int
    current_storage_bytes: int
    current_apps: int
    k8s_namespace: Optional[str] = None
    k8s_deployed: bool
    plan_id: Optional[int] = None
    settings: dict = {}
    created_at: datetime
    updated_at: datetime
    activated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TenantDetailResponse(TenantResponse):
    plan: Optional[PlanResponse] = None
    deployments: List["DeploymentResponse"] = []
    recent_invoices: List["InvoiceResponse"] = []


# Deployment schemas
class DeploymentBase(BaseModel):
    app_name: str
    replicas: int = 1
    cpu_limit: str = "500m"
    memory_limit: str = "512Mi"
    storage_limit: str = "10Gi"


class DeploymentCreate(DeploymentBase):
    tenant_id: int
    config: dict = {}


class DeploymentUpdate(BaseModel):
    replicas: Optional[int] = None
    cpu_limit: Optional[str] = None
    memory_limit: Optional[str] = None
    storage_limit: Optional[str] = None
    config: Optional[dict] = None


class DeploymentResponse(DeploymentBase):
    id: int
    tenant_id: int
    status: str
    k8s_deployment_name: Optional[str] = None
    k8s_service_name: Optional[str] = None
    node_port: Optional[int] = None
    internal_url: Optional[str] = None
    external_url: Optional[str] = None
    version: Optional[str] = None
    config: dict = {}
    deployed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Invoice schemas
class LineItem(BaseModel):
    description: str
    quantity: int = 1
    unit_price: float
    total: float


class InvoiceBase(BaseModel):
    subtotal: float
    tax_rate: float = 21
    tax_amount: float
    total: float
    currency: str = "EUR"
    line_items: List[LineItem] = []


class InvoiceCreate(InvoiceBase):
    tenant_id: int
    due_date: Optional[datetime] = None
    notes: Optional[str] = None


class InvoiceUpdate(BaseModel):
    status: Optional[InvoiceStatus] = None
    notes: Optional[str] = None
    paid_at: Optional[datetime] = None


class InvoiceResponse(InvoiceBase):
    id: int
    tenant_id: int
    invoice_number: str
    status: InvoiceStatus
    invoice_date: datetime
    due_date: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    stripe_invoice_id: Optional[str] = None
    pdf_url: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Support Ticket schemas
class TicketMessageBase(BaseModel):
    message: str
    is_internal: bool = False


class TicketMessageCreate(TicketMessageBase):
    attachments: List[str] = []


class TicketMessageResponse(TicketMessageBase):
    id: int
    ticket_id: int
    is_from_admin: bool
    sender_name: Optional[str] = None
    sender_email: Optional[str] = None
    attachments: List[str] = []
    created_at: datetime

    class Config:
        from_attributes = True


class SupportTicketBase(BaseModel):
    subject: str
    description: Optional[str] = None
    priority: str = "medium"
    category: Optional[str] = None


class SupportTicketCreate(SupportTicketBase):
    tenant_id: int
    requester_email: Optional[EmailStr] = None
    requester_name: Optional[str] = None


class SupportTicketUpdate(BaseModel):
    subject: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    category: Optional[str] = None
    assigned_to: Optional[int] = None
    resolution: Optional[str] = None


class SupportTicketResponse(SupportTicketBase):
    id: int
    tenant_id: int
    ticket_number: str
    status: str
    assigned_to: Optional[int] = None
    requester_email: Optional[str] = None
    requester_name: Optional[str] = None
    resolution: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SupportTicketDetailResponse(SupportTicketResponse):
    messages: List[TicketMessageResponse] = []


# Audit Log schemas
class AuditLogResponse(BaseModel):
    id: int
    admin_user_id: Optional[int] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    details: dict = {}
    ip_address: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# System Setting schemas
class SystemSettingBase(BaseModel):
    key: str
    value: str
    value_type: str = "string"
    description: Optional[str] = None
    is_public: bool = False


class SystemSettingUpdate(BaseModel):
    value: str
    description: Optional[str] = None


class SystemSettingResponse(SystemSettingBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Platform Metrics schemas
class PlatformMetricsResponse(BaseModel):
    total_tenants: int
    active_tenants: int
    trial_tenants: int
    total_users: int
    active_users_24h: int
    mrr: float
    arr: float
    total_storage_bytes: int
    total_deployments: int
    recorded_at: datetime

    class Config:
        from_attributes = True


# Dashboard schemas
class DashboardStats(BaseModel):
    total_tenants: int
    active_tenants: int
    total_users: int
    mrr: float
    arr: float
    total_storage_gb: float
    open_tickets: int
    pending_invoices: int


class RevenueByMonth(BaseModel):
    month: str
    revenue: float


class TenantGrowth(BaseModel):
    month: str
    new_tenants: int
    churned_tenants: int


# Pagination
class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    page_size: int
    total_pages: int
