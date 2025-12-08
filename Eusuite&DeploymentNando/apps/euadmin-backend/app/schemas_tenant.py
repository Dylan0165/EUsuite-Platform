"""
EUAdmin Backend - Pydantic Schemas
API request/response schemas for the multi-tenant platform.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, EmailStr, validator
from enum import Enum
import re


# =============================================================================
# ENUMS
# =============================================================================

class DeploymentTargetEnum(str, Enum):
    CENTRAL_CLOUD = "central_cloud"
    COMPANY_CLOUD = "company_cloud"
    SELF_HOSTED = "self_hosted"


class StoragePolicyTypeEnum(str, Enum):
    COMPANY_ONLY = "company_only"
    EUSUITE_ONLY = "eusuite_only"
    HYBRID = "hybrid"


class UserRoleEnum(str, Enum):
    SUPERADMIN = "superadmin"
    COMPANY_ADMIN = "company_admin"
    USER = "user"


class DeploymentStatusEnum(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    ROLLBACK = "rollback"


class ServiceTypeEnum(str, Enum):
    DASHBOARD = "dashboard"
    LOGIN = "login"
    EUCLOUD = "eucloud"
    EUTYPE = "eutype"
    EUMAIL = "eumail"
    EUGROUPS = "eugroups"
    EUADMIN = "euadmin"


# =============================================================================
# BASE SCHEMAS
# =============================================================================

class BaseSchema(BaseModel):
    class Config:
        from_attributes = True
        use_enum_values = True


# =============================================================================
# COMPANY SCHEMAS
# =============================================================================

class CompanyCreate(BaseSchema):
    """Schema for creating a new company."""
    name: str = Field(..., min_length=2, max_length=255)
    slug: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    contact_email: EmailStr
    contact_phone: Optional[str] = None
    billing_email: Optional[EmailStr] = None
    deployment_target: DeploymentTargetEnum = DeploymentTargetEnum.CENTRAL_CLOUD
    
    @validator('slug', pre=True, always=True)
    def generate_slug(cls, v, values):
        if v:
            return re.sub(r'[^a-z0-9-]', '', v.lower().replace(' ', '-'))
        if 'name' in values:
            return re.sub(r'[^a-z0-9-]', '', values['name'].lower().replace(' ', '-'))
        return v


class CompanyUpdate(BaseSchema):
    """Schema for updating a company."""
    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    billing_email: Optional[EmailStr] = None
    is_active: Optional[bool] = None
    is_suspended: Optional[bool] = None
    suspension_reason: Optional[str] = None
    deployment_target: Optional[DeploymentTargetEnum] = None


class CompanyResponse(BaseSchema):
    """Schema for company response."""
    id: int
    name: str
    slug: str
    description: Optional[str]
    contact_email: str
    contact_phone: Optional[str]
    billing_email: Optional[str]
    registered_at: Optional[datetime]
    approved_at: Optional[datetime]
    is_active: bool
    is_approved: bool
    is_suspended: bool
    suspension_reason: Optional[str]
    deployment_target: str
    namespace: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    user_count: Optional[int] = 0
    storage_used: Optional[int] = 0


class CompanyListResponse(BaseSchema):
    """Schema for listing companies."""
    companies: List[CompanyResponse]
    total: int
    page: int
    page_size: int


class CompanyRegister(BaseSchema):
    """Schema for company self-registration."""
    company_name: str = Field(..., min_length=2, max_length=255)
    contact_email: EmailStr
    contact_phone: Optional[str] = None
    admin_first_name: str = Field(..., min_length=1, max_length=100)
    admin_last_name: str = Field(..., min_length=1, max_length=100)
    admin_email: Optional[EmailStr] = None  # If not provided, auto-generate
    password: str = Field(..., min_length=8)
    description: Optional[str] = None


# =============================================================================
# COMPANY USER SCHEMAS
# =============================================================================

class CompanyUserCreate(BaseSchema):
    """Schema for creating a company user."""
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: Optional[EmailStr] = None  # Auto-generated if not provided
    password: Optional[str] = None  # Auto-generated if not provided
    role: UserRoleEnum = UserRoleEnum.USER
    department: Optional[str] = None
    job_title: Optional[str] = None
    storage_quota: Optional[int] = None  # Bytes


class CompanyUserUpdate(BaseSchema):
    """Schema for updating a company user."""
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    role: Optional[UserRoleEnum] = None
    department: Optional[str] = None
    job_title: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None
    storage_quota: Optional[int] = None


class CompanyUserResponse(BaseSchema):
    """Schema for company user response."""
    id: int
    company_id: int
    first_name: str
    last_name: str
    full_name: Optional[str] = None
    email: str
    role: str
    is_active: bool
    is_verified: bool
    department: Optional[str]
    job_title: Optional[str]
    phone: Optional[str]
    storage_quota: int
    storage_used: int
    storage_quota_gb: Optional[float] = None
    storage_used_gb: Optional[float] = None
    last_login: Optional[datetime]
    created_at: Optional[datetime]
    
    @validator('full_name', pre=True, always=True)
    def set_full_name(cls, v, values):
        if v:
            return v
        first = values.get('first_name', '')
        last = values.get('last_name', '')
        return f"{first} {last}".strip()
    
    @validator('storage_quota_gb', pre=True, always=True)
    def calc_quota_gb(cls, v, values):
        quota = values.get('storage_quota', 0)
        return round(quota / (1024**3), 2) if quota else 0
    
    @validator('storage_used_gb', pre=True, always=True)
    def calc_used_gb(cls, v, values):
        used = values.get('storage_used', 0)
        return round(used / (1024**3), 2) if used else 0


class CompanyUserListResponse(BaseSchema):
    """Schema for listing company users."""
    users: List[CompanyUserResponse]
    total: int
    page: int
    page_size: int


class UserCreatedResponse(BaseSchema):
    """Response when a user is created with generated credentials."""
    user: CompanyUserResponse
    generated_email: str
    generated_password: str  # Only returned on creation


# =============================================================================
# BRANDING SCHEMAS
# =============================================================================

class BrandingColors(BaseSchema):
    """Color configuration for branding."""
    primary: str = Field(default="#1E40AF", pattern=r'^#[0-9A-Fa-f]{6}$')
    secondary: str = Field(default="#3B82F6", pattern=r'^#[0-9A-Fa-f]{6}$')
    accent: str = Field(default="#60A5FA", pattern=r'^#[0-9A-Fa-f]{6}$')
    background: str = Field(default="#F3F4F6", pattern=r'^#[0-9A-Fa-f]{6}$')
    text: str = Field(default="#1F2937", pattern=r'^#[0-9A-Fa-f]{6}$')
    headerBg: str = Field(default="#1E40AF", pattern=r'^#[0-9A-Fa-f]{6}$')
    headerText: str = Field(default="#FFFFFF", pattern=r'^#[0-9A-Fa-f]{6}$')
    sidebarBg: str = Field(default="#1F2937", pattern=r'^#[0-9A-Fa-f]{6}$')
    sidebarText: str = Field(default="#F9FAFB", pattern=r'^#[0-9A-Fa-f]{6}$')


class BrandingTypography(BaseSchema):
    """Typography configuration for branding."""
    fontFamily: str = "Inter, sans-serif"
    headingFontFamily: Optional[str] = None


class BrandingLogin(BaseSchema):
    """Login page branding configuration."""
    title: Optional[str] = None
    subtitle: Optional[str] = None
    welcomeMessage: Optional[str] = None


class BrandingFooter(BaseSchema):
    """Footer branding configuration."""
    text: Optional[str] = None
    links: List[Dict[str, str]] = []


class CompanyBrandingCreate(BaseSchema):
    """Schema for creating/updating company branding."""
    company_display_name: Optional[str] = None
    tagline: Optional[str] = None
    logo_url: Optional[str] = None
    logo_dark_url: Optional[str] = None
    favicon_url: Optional[str] = None
    header_logo_url: Optional[str] = None
    login_background_url: Optional[str] = None
    colors: Optional[BrandingColors] = None
    typography: Optional[BrandingTypography] = None
    custom_css: Optional[str] = None
    login: Optional[BrandingLogin] = None
    footer: Optional[BrandingFooter] = None
    social_links: Optional[Dict[str, str]] = None


class CompanyBrandingResponse(BaseSchema):
    """Schema for branding response."""
    id: int
    company_id: int
    company_display_name: Optional[str]
    tagline: Optional[str]
    logo_url: Optional[str]
    logo_dark_url: Optional[str]
    favicon_url: Optional[str]
    header_logo_url: Optional[str]
    login_background_url: Optional[str]
    primary_color: str
    secondary_color: str
    accent_color: str
    background_color: str
    text_color: str
    header_bg_color: str
    header_text_color: str
    sidebar_bg_color: str
    sidebar_text_color: str
    font_family: str
    heading_font_family: Optional[str]
    custom_css: Optional[str]
    login_title: Optional[str]
    login_subtitle: Optional[str]
    login_welcome_message: Optional[str]
    footer_text: Optional[str]
    footer_links: Optional[List[Dict[str, str]]]
    social_links: Optional[Dict[str, str]]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]


class BrandingJsonResponse(BaseSchema):
    """Schema for branding.json endpoint (runtime injection)."""
    companyName: str
    tagline: Optional[str]
    logo: Optional[str]
    logoDark: Optional[str]
    favicon: Optional[str]
    headerLogo: Optional[str]
    loginBackground: Optional[str]
    colors: BrandingColors
    typography: BrandingTypography
    customCss: Optional[str]
    login: BrandingLogin
    footer: BrandingFooter
    socialLinks: Dict[str, str]


# =============================================================================
# STORAGE POLICY SCHEMAS
# =============================================================================

class StoragePolicyCreate(BaseSchema):
    """Schema for creating/updating storage policy."""
    policy_type: StoragePolicyTypeEnum = StoragePolicyTypeEnum.EUSUITE_ONLY
    total_storage_quota: Optional[int] = 100 * 1024 * 1024 * 1024  # 100GB
    max_file_size: Optional[int] = 100 * 1024 * 1024  # 100MB
    default_user_quota: Optional[int] = 5 * 1024 * 1024 * 1024  # 5GB
    file_retention_days: Optional[int] = 365
    trash_retention_days: Optional[int] = 30
    backup_enabled: Optional[bool] = True
    backup_frequency_hours: Optional[int] = 24
    backup_retention_days: Optional[int] = 90
    encryption_enabled: Optional[bool] = True
    allowed_file_types: Optional[List[str]] = None
    blocked_file_types: Optional[List[str]] = None
    # Company cloud settings
    company_storage_endpoint: Optional[str] = None
    company_storage_bucket: Optional[str] = None
    company_storage_access_key: Optional[str] = None
    company_storage_secret_key: Optional[str] = None
    company_storage_region: Optional[str] = None


class StoragePolicyResponse(BaseSchema):
    """Schema for storage policy response."""
    id: int
    company_id: int
    policy_type: str
    total_storage_quota: int
    storage_used: int
    max_file_size: int
    default_user_quota: int
    file_retention_days: int
    trash_retention_days: int
    backup_enabled: bool
    backup_frequency_hours: int
    backup_retention_days: int
    encryption_enabled: bool
    encryption_algorithm: str
    allowed_file_types: Optional[List[str]]
    blocked_file_types: Optional[List[str]]
    has_company_storage: bool = False
    total_storage_quota_gb: Optional[float] = None
    storage_used_gb: Optional[float] = None
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    
    @validator('has_company_storage', pre=True, always=True)
    def check_company_storage(cls, v, values):
        return False  # Will be set by the service
    
    @validator('total_storage_quota_gb', pre=True, always=True)
    def calc_quota_gb(cls, v, values):
        quota = values.get('total_storage_quota', 0)
        return round(quota / (1024**3), 2) if quota else 0
    
    @validator('storage_used_gb', pre=True, always=True)
    def calc_used_gb(cls, v, values):
        used = values.get('storage_used', 0)
        return round(used / (1024**3), 2) if used else 0


# =============================================================================
# SERVICE CONFIGURATION SCHEMAS
# =============================================================================

class ServiceConfig(BaseSchema):
    """Configuration for a single service."""
    service_type: ServiceTypeEnum
    enabled: bool = True
    node_port: Optional[int] = None
    custom_domain: Optional[str] = None
    replicas: int = 1
    cpu_request: str = "100m"
    cpu_limit: str = "500m"
    memory_request: str = "128Mi"
    memory_limit: str = "512Mi"
    env_vars: Optional[Dict[str, str]] = None


class CompanyServiceCreate(BaseSchema):
    """Schema for creating company services."""
    services: List[ServiceConfig]


class CompanyServiceResponse(BaseSchema):
    """Schema for company service response."""
    id: int
    company_id: int
    service_type: str
    service_name: str
    is_enabled: bool
    is_deployed: bool
    internal_port: int
    node_port: Optional[int]
    ingress_path: Optional[str]
    custom_domain: Optional[str]
    cpu_request: str
    cpu_limit: str
    memory_request: str
    memory_limit: str
    replicas: int
    image_repository: str
    image_tag: str
    health_check_path: str
    last_deployed_at: Optional[datetime]
    last_deployment_status: Optional[str]
    deployment_version: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]


# =============================================================================
# DEPLOYMENT SCHEMAS
# =============================================================================

class DeploymentRequest(BaseSchema):
    """Schema for initiating a deployment."""
    deployment_type: str = "full"  # "full", "service", "update"
    services: Optional[List[ServiceTypeEnum]] = None  # If None, deploy all enabled
    namespace: Optional[str] = None  # Auto-generated if not provided
    ip_address: Optional[str] = None  # For display/config purposes
    force: bool = False  # Force redeploy even if already deployed


class DeploymentConfigPreview(BaseSchema):
    """Schema for deployment configuration preview."""
    company_id: int
    company_name: str
    namespace: str
    target: str
    services: List[Dict[str, Any]]
    branding: Optional[Dict[str, Any]]
    storage_policy: Optional[Dict[str, Any]]
    estimated_resources: Dict[str, str]


class DeploymentYAMLPreview(BaseSchema):
    """Schema for YAML preview before deployment."""
    namespace_yaml: str
    secrets_yaml: str
    services_yaml: Dict[str, str]  # service_name -> yaml
    combined_yaml: str


class DeploymentResponse(BaseSchema):
    """Schema for deployment response."""
    id: int
    company_id: int
    deployment_id: str
    deployment_type: str
    target: str
    namespace: str
    services_deployed: Optional[List[str]]
    status: str
    status_message: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    duration_seconds: Optional[int]
    can_rollback: bool
    created_at: Optional[datetime]


class DeploymentHistoryResponse(BaseSchema):
    """Schema for deployment history list."""
    deployments: List[DeploymentResponse]
    total: int
    page: int
    page_size: int


class DeploymentLogsResponse(BaseSchema):
    """Schema for deployment logs."""
    deployment_id: str
    logs: str
    status: str
    last_updated: datetime


# =============================================================================
# PORT ALLOCATION SCHEMAS
# =============================================================================

class PortAllocationResponse(BaseSchema):
    """Schema for port allocation response."""
    port: int
    company_id: Optional[int]
    service_type: Optional[str]
    namespace: Optional[str]
    is_allocated: bool
    allocated_at: Optional[datetime]


class AvailablePortsResponse(BaseSchema):
    """Schema for available ports response."""
    available_ports: List[int]
    allocated_ports: List[PortAllocationResponse]
    port_range: Dict[str, int]  # {"min": 30100, "max": 32767}


# =============================================================================
# DASHBOARD / STATS SCHEMAS
# =============================================================================

class PlatformStatsResponse(BaseSchema):
    """Platform-wide statistics."""
    total_companies: int
    active_companies: int
    pending_approval: int
    total_users: int
    total_deployments: int
    successful_deployments: int
    failed_deployments: int
    total_storage_used: int
    total_storage_used_gb: float
    active_namespaces: int


class CompanyStatsResponse(BaseSchema):
    """Statistics for a single company."""
    company_id: int
    company_name: str
    user_count: int
    active_users: int
    storage_used: int
    storage_quota: int
    storage_percentage: float
    deployed_services: int
    total_services: int
    last_deployment: Optional[datetime]
    deployment_count: int


# =============================================================================
# AUTH SCHEMAS
# =============================================================================

class LoginRequest(BaseSchema):
    """Login request schema."""
    email: EmailStr
    password: str


class LoginResponse(BaseSchema):
    """Login response schema."""
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]
    expires_in: int


class TokenPayload(BaseSchema):
    """JWT token payload."""
    sub: str  # user_id or email
    user_type: str  # "platform_admin", "company_admin", "user"
    company_id: Optional[int] = None
    role: str
    exp: datetime


# =============================================================================
# AUDIT LOG SCHEMAS
# =============================================================================

class AuditLogResponse(BaseSchema):
    """Schema for audit log response."""
    id: int
    user_type: str
    user_id: Optional[int]
    user_email: Optional[str]
    company_id: Optional[int]
    action: str
    resource_type: Optional[str]
    resource_id: Optional[str]
    details: Optional[Dict[str, Any]]
    ip_address: Optional[str]
    success: bool
    error_message: Optional[str]
    created_at: Optional[datetime]


class AuditLogListResponse(BaseSchema):
    """Schema for audit log list."""
    logs: List[AuditLogResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# WEBSOCKET SCHEMAS
# =============================================================================

class WebSocketMessage(BaseSchema):
    """WebSocket message schema."""
    type: str  # "log", "status", "progress", "error", "complete"
    deployment_id: Optional[str] = None
    message: str
    timestamp: datetime
    data: Optional[Dict[str, Any]] = None


# =============================================================================
# ERROR SCHEMAS
# =============================================================================

class ErrorResponse(BaseSchema):
    """Standard error response."""
    error: str
    detail: Optional[str] = None
    code: Optional[str] = None


class ValidationErrorResponse(BaseSchema):
    """Validation error response."""
    error: str = "Validation Error"
    details: List[Dict[str, Any]]
