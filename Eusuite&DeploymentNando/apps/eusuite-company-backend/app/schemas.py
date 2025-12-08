from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# Enums
class UserRole(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    USER = "user"
    VIEWER = "viewer"


class AppType(str, Enum):
    DASHBOARD = "dashboard"
    EUCLOUD = "eucloud"
    EUMAIL = "eumail"
    EUTYPE = "eutype"
    EUGROUPS = "eugroups"


class DeploymentStatus(str, Enum):
    PENDING = "pending"
    DEPLOYING = "deploying"
    RUNNING = "running"
    STOPPED = "stopped"
    FAILED = "failed"
    UPDATING = "updating"


# =============== USER SCHEMAS ===============

class UserBase(BaseModel):
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    phone: Optional[str] = None
    role: UserRole = UserRole.USER


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    storage_quota_bytes: Optional[int] = None


class UserBulkCreate(BaseModel):
    users: List[UserCreate]


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    storage_quota_bytes: Optional[int] = None


class UserResponse(UserBase):
    id: int
    company_id: int
    is_active: bool
    is_verified: bool
    storage_quota_bytes: Optional[int]
    storage_used_bytes: int
    created_at: datetime
    last_login: Optional[datetime]
    
    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    users: List[UserResponse]
    total: int
    page: int
    per_page: int


# =============== APP PERMISSION SCHEMAS ===============

class AppPermissionBase(BaseModel):
    app_type: AppType
    can_access: bool = True
    can_upload: bool = True
    can_download: bool = True
    can_share: bool = True
    can_delete: bool = False
    settings: Dict[str, Any] = {}


class AppPermissionUpdate(BaseModel):
    can_access: Optional[bool] = None
    can_upload: Optional[bool] = None
    can_download: Optional[bool] = None
    can_share: Optional[bool] = None
    can_delete: Optional[bool] = None
    settings: Optional[Dict[str, Any]] = None


class AppPermissionResponse(AppPermissionBase):
    id: int
    user_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# =============== BRANDING SCHEMAS ===============

class BrandingBase(BaseModel):
    primary_color: str = "#1e5631"
    secondary_color: str = "#d4af37"
    accent_color: Optional[str] = None
    background_color: str = "#ffffff"
    text_color: str = "#1f2937"
    company_name_display: Optional[str] = None
    tagline: Optional[str] = None
    support_email: Optional[EmailStr] = None
    show_powered_by: bool = True
    custom_domain: Optional[str] = None
    custom_css: Optional[str] = None


class BrandingUpdate(BaseModel):
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    accent_color: Optional[str] = None
    background_color: Optional[str] = None
    text_color: Optional[str] = None
    company_name_display: Optional[str] = None
    tagline: Optional[str] = None
    support_email: Optional[EmailStr] = None
    show_powered_by: Optional[bool] = None
    custom_domain: Optional[str] = None
    custom_css: Optional[str] = None
    
    @validator('primary_color', 'secondary_color', 'accent_color', 'background_color', 'text_color')
    def validate_color(cls, v):
        if v and not v.startswith('#'):
            raise ValueError('Color must be a valid hex color (e.g., #1e5631)')
        return v


class BrandingResponse(BrandingBase):
    id: int
    company_id: int
    logo_url: Optional[str]
    logo_dark_url: Optional[str]
    favicon_url: Optional[str]
    login_background_url: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


# =============== STORAGE POLICY SCHEMAS ===============

class StoragePolicyBase(BaseModel):
    total_storage_bytes: int = 10737418240  # 10GB
    default_user_quota_bytes: Optional[int] = None
    max_file_size_bytes: int = 104857600  # 100MB
    allowed_extensions: List[str] = []
    blocked_extensions: List[str] = [".exe", ".bat", ".sh", ".cmd"]
    trash_retention_days: int = 30
    version_retention_count: int = 10
    require_encryption: bool = False
    scan_for_malware: bool = True


class StoragePolicyUpdate(BaseModel):
    total_storage_bytes: Optional[int] = None
    default_user_quota_bytes: Optional[int] = None
    max_file_size_bytes: Optional[int] = None
    allowed_extensions: Optional[List[str]] = None
    blocked_extensions: Optional[List[str]] = None
    trash_retention_days: Optional[int] = None
    version_retention_count: Optional[int] = None
    require_encryption: Optional[bool] = None
    scan_for_malware: Optional[bool] = None


class StoragePolicyResponse(StoragePolicyBase):
    id: int
    company_id: int
    used_storage_bytes: int
    created_at: datetime
    updated_at: Optional[datetime]
    
    # Computed fields
    storage_used_percentage: float = 0.0
    
    class Config:
        from_attributes = True
    
    @validator('storage_used_percentage', pre=True, always=True)
    def calculate_percentage(cls, v, values):
        total = values.get('total_storage_bytes', 1)
        used = values.get('used_storage_bytes', 0)
        return round((used / total) * 100, 2) if total > 0 else 0.0


# =============== DEPLOYMENT SCHEMAS ===============

class DeploymentBase(BaseModel):
    app_type: AppType
    replicas: int = 1
    cpu_request: str = "100m"
    cpu_limit: str = "500m"
    memory_request: str = "128Mi"
    memory_limit: str = "512Mi"


class DeploymentCreate(DeploymentBase):
    pass


class DeploymentUpdate(BaseModel):
    replicas: Optional[int] = None
    cpu_request: Optional[str] = None
    cpu_limit: Optional[str] = None
    memory_request: Optional[str] = None
    memory_limit: Optional[str] = None
    image_tag: Optional[str] = None


class DeploymentResponse(DeploymentBase):
    id: int
    company_id: int
    namespace: str
    deployment_name: str
    service_name: str
    node_port: int
    status: DeploymentStatus
    status_message: Optional[str]
    ready_replicas: int
    internal_url: Optional[str]
    external_url: Optional[str]
    image_tag: str
    last_deployed_at: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True


class DeploymentListResponse(BaseModel):
    deployments: List[DeploymentResponse]
    total: int


# =============== TEAM SCHEMAS ===============

class TeamBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    parent_team_id: Optional[int] = None


class TeamCreate(TeamBase):
    member_ids: List[int] = []


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    parent_team_id: Optional[int] = None


class TeamMemberAdd(BaseModel):
    user_id: int
    role: str = "member"


class TeamResponse(TeamBase):
    id: int
    company_id: int
    created_at: datetime
    member_count: int = 0
    
    class Config:
        from_attributes = True


# =============== AUDIT LOG SCHEMAS ===============

class AuditLogResponse(BaseModel):
    id: int
    company_id: int
    user_id: Optional[int]
    action: str
    resource_type: str
    resource_id: Optional[str]
    details: Dict[str, Any]
    ip_address: Optional[str]
    status: str
    error_message: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    logs: List[AuditLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# =============== DEPARTMENT SCHEMAS ===============

class DepartmentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    parent_id: Optional[int] = None
    manager_id: Optional[int] = None


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[int] = None
    manager_id: Optional[int] = None
    is_active: Optional[bool] = None


class DepartmentResponse(BaseModel):
    id: int
    company_id: int
    name: str
    description: Optional[str]
    parent_id: Optional[int]
    manager_id: Optional[int]
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class DepartmentListResponse(BaseModel):
    departments: List[DepartmentResponse]
    total: int


# =============== STORAGE POLICY SCHEMAS (Extended) ===============

class StoragePolicyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    max_file_size_mb: int = 100
    max_storage_gb: int = 10
    allowed_extensions: List[str] = []
    retention_days: int = 365
    is_default: bool = False


class StoragePolicyListResponse(BaseModel):
    policies: List[StoragePolicyResponse]
    total: int


# =============== COMPANY SETTINGS SCHEMAS ===============

class CompanySettingsUpdate(BaseModel):
    mfa_required: Optional[bool] = None
    session_timeout_minutes: Optional[int] = None
    password_min_length: Optional[int] = None
    password_require_uppercase: Optional[bool] = None
    password_require_lowercase: Optional[bool] = None
    password_require_numbers: Optional[bool] = None
    password_require_symbols: Optional[bool] = None
    max_login_attempts: Optional[int] = None
    lockout_duration_minutes: Optional[int] = None
    allowed_ip_ranges: Optional[List[str]] = None
    email_notifications_enabled: Optional[bool] = None
    webhook_url: Optional[str] = None
    notify_on_user_created: Optional[bool] = None
    notify_on_storage_warning: Optional[bool] = None
    notify_on_deployment_status: Optional[bool] = None
    storage_warning_threshold: Optional[int] = None
    feature_flags: Optional[Dict[str, Any]] = None
    enabled_apps: Optional[List[str]] = None
    default_timezone: Optional[str] = None
    default_language: Optional[str] = None
    date_format: Optional[str] = None


class CompanySettingsResponse(BaseModel):
    id: int
    company_id: int
    mfa_required: bool
    session_timeout_minutes: int
    password_min_length: int
    password_require_uppercase: bool
    password_require_lowercase: bool
    password_require_numbers: bool
    password_require_symbols: bool
    max_login_attempts: int
    lockout_duration_minutes: int
    allowed_ip_ranges: List[str]
    email_notifications_enabled: bool
    webhook_url: Optional[str]
    notify_on_user_created: bool
    notify_on_storage_warning: bool
    notify_on_deployment_status: bool
    storage_warning_threshold: int
    feature_flags: Dict[str, Any]
    enabled_apps: List[str]
    default_timezone: str
    default_language: str
    date_format: str
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


# =============== NOTIFICATION SCHEMAS ===============

class NotificationType(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    SUCCESS = "success"


class NotificationResponse(BaseModel):
    id: int
    company_id: int
    user_id: Optional[int]
    type: NotificationType
    title: str
    message: str
    link: Optional[str]
    is_read: bool
    created_at: datetime
    expires_at: Optional[datetime]
    
    class Config:
        from_attributes = True


# =============== DASHBOARD SCHEMAS ===============

class DashboardStats(BaseModel):
    total_users: int
    active_users: int
    total_storage_bytes: int
    used_storage_bytes: int
    storage_percentage: float
    active_deployments: int
    total_deployments: int
    recent_logins: int  # Last 24h


class StorageBreakdown(BaseModel):
    app_type: AppType
    used_bytes: int
    file_count: int
