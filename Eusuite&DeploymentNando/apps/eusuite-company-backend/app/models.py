from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Enum, JSON, BigInteger
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    USER = "user"
    VIEWER = "viewer"


class DeploymentStatus(str, enum.Enum):
    PENDING = "pending"
    DEPLOYING = "deploying"
    RUNNING = "running"
    STOPPED = "stopped"
    FAILED = "failed"
    UPDATING = "updating"


class AppType(str, enum.Enum):
    DASHBOARD = "dashboard"
    EUCLOUD = "eucloud"
    EUMAIL = "eumail"
    EUTYPE = "eutype"
    EUGROUPS = "eugroups"


# Company Users (managed by company admin)
class CompanyUser(Base):
    __tablename__ = "company_users"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, index=True, nullable=False)  # References public DB
    public_user_id = Column(Integer, nullable=True)  # References public DB (for linked accounts)
    
    # User details (can differ from public if bulk created)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(50), nullable=True)
    
    # Role and permissions
    role = Column(Enum(UserRole), default=UserRole.USER)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=True)  # Company-created users are auto-verified
    
    # Department
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    
    # Storage
    storage_policy_id = Column(Integer, ForeignKey("storage_policies.id"), nullable=True)
    storage_quota_bytes = Column(BigInteger, nullable=True)  # Null = use company default
    storage_used_bytes = Column(BigInteger, default=0)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(Integer, nullable=True)  # Admin who created this user
    
    # Computed property
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    # Relationships
    app_permissions = relationship("UserAppPermission", back_populates="user", cascade="all, delete-orphan")
    storage_policy = relationship("StoragePolicy", foreign_keys=[storage_policy_id])


# App Permissions per User
class UserAppPermission(Base):
    __tablename__ = "user_app_permissions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("company_users.id", ondelete="CASCADE"))
    app_type = Column(Enum(AppType), nullable=False)
    
    # Permissions
    can_access = Column(Boolean, default=True)
    can_upload = Column(Boolean, default=True)
    can_download = Column(Boolean, default=True)
    can_share = Column(Boolean, default=True)
    can_delete = Column(Boolean, default=False)
    
    # App-specific settings stored as JSON
    settings = Column(JSON, default={})
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("CompanyUser", back_populates="app_permissions")


# Branding Configuration
class BrandingConfig(Base):
    __tablename__ = "branding_config"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, unique=True, index=True, nullable=False)
    
    # Colors
    primary_color = Column(String(20), default="#1e5631")
    secondary_color = Column(String(20), default="#d4af37")
    accent_color = Column(String(20), nullable=True)
    background_color = Column(String(20), default="#ffffff")
    text_color = Column(String(20), default="#1f2937")
    
    # Assets
    logo_url = Column(String(500), nullable=True)
    logo_dark_url = Column(String(500), nullable=True)
    favicon_url = Column(String(500), nullable=True)
    login_background_url = Column(String(500), nullable=True)
    
    # Customization
    company_name_display = Column(String(100), nullable=True)
    tagline = Column(String(255), nullable=True)
    support_email = Column(String(255), nullable=True)
    custom_css = Column(Text, nullable=True)
    
    # Features
    show_powered_by = Column(Boolean, default=True)
    custom_domain = Column(String(255), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


# Storage Policy
class StoragePolicy(Base):
    __tablename__ = "storage_policies"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    
    # Global limits
    total_storage_bytes = Column(BigInteger, default=10737418240)  # 10GB default
    used_storage_bytes = Column(BigInteger, default=0)
    default_user_quota_bytes = Column(BigInteger, nullable=True)  # Per user default
    max_storage_gb = Column(Integer, default=10)
    
    # File restrictions
    max_file_size_bytes = Column(BigInteger, default=104857600)  # 100MB default
    max_file_size_mb = Column(Integer, default=100)
    allowed_extensions = Column(JSON, default=[])  # Empty = all allowed
    blocked_extensions = Column(JSON, default=[".exe", ".bat", ".sh", ".cmd"])
    
    # Retention
    trash_retention_days = Column(Integer, default=30)
    retention_days = Column(Integer, default=365)
    version_retention_count = Column(Integer, default=10)
    
    # Security
    require_encryption = Column(Boolean, default=False)
    scan_for_malware = Column(Boolean, default=True)
    
    # Default flag
    is_default = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


# App Deployment (per company)
class AppDeployment(Base):
    __tablename__ = "app_deployments"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, index=True, nullable=False)
    app_type = Column(Enum(AppType), nullable=False)
    
    # K8s Info
    namespace = Column(String(100), nullable=False)
    deployment_name = Column(String(100), nullable=False)
    service_name = Column(String(100), nullable=False)
    
    # Port allocation
    node_port = Column(Integer, unique=True, nullable=False)
    internal_port = Column(Integer, default=80)
    
    # Status
    status = Column(Enum(DeploymentStatus), default=DeploymentStatus.PENDING)
    status_message = Column(Text, nullable=True)
    replicas = Column(Integer, default=1)
    ready_replicas = Column(Integer, default=0)
    
    # Resources
    cpu_request = Column(String(20), default="100m")
    cpu_limit = Column(String(20), default="500m")
    memory_request = Column(String(20), default="128Mi")
    memory_limit = Column(String(20), default="512Mi")
    
    # URLs
    internal_url = Column(String(255), nullable=True)
    external_url = Column(String(255), nullable=True)
    
    # Versioning
    image_tag = Column(String(100), default="latest")
    last_deployed_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


# Audit Log
class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, index=True, nullable=False)
    user_id = Column(Integer, nullable=True)
    
    # Action
    action = Column(String(100), nullable=False)
    resource_type = Column(String(100), nullable=False)
    resource_id = Column(String(100), nullable=True)
    
    # Details
    details = Column(JSON, default={})
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    # Status
    status = Column(String(20), default="success")
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# Teams/Groups
class Team(Base):
    __tablename__ = "teams"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    
    # Parent team for hierarchy
    parent_team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    members = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")
    children = relationship("Team")


class TeamMember(Base):
    __tablename__ = "team_members"
    
    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("company_users.id", ondelete="CASCADE"))
    role = Column(String(50), default="member")  # leader, member
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    team = relationship("Team", back_populates="members")


class NotificationType(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    SUCCESS = "success"


# Departments
class Department(Base):
    __tablename__ = "departments"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    parent_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    manager_id = Column(Integer, ForeignKey("company_users.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    children = relationship("Department", backref="parent", remote_side=[id])


# Company Settings
class CompanySettings(Base):
    __tablename__ = "company_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, unique=True, index=True, nullable=False)
    
    # Security settings
    mfa_required = Column(Boolean, default=False)
    session_timeout_minutes = Column(Integer, default=480)  # 8 hours
    password_min_length = Column(Integer, default=8)
    password_require_uppercase = Column(Boolean, default=True)
    password_require_lowercase = Column(Boolean, default=True)
    password_require_numbers = Column(Boolean, default=True)
    password_require_symbols = Column(Boolean, default=False)
    max_login_attempts = Column(Integer, default=5)
    lockout_duration_minutes = Column(Integer, default=30)
    allowed_ip_ranges = Column(JSON, default=[])  # Empty = all allowed
    
    # Notification settings
    email_notifications_enabled = Column(Boolean, default=True)
    webhook_url = Column(String(500), nullable=True)
    notify_on_user_created = Column(Boolean, default=True)
    notify_on_storage_warning = Column(Boolean, default=True)
    notify_on_deployment_status = Column(Boolean, default=True)
    storage_warning_threshold = Column(Integer, default=80)  # Percentage
    
    # Feature flags
    feature_flags = Column(JSON, default={})
    enabled_apps = Column(JSON, default=["eucloud", "eumail", "eugroups", "eutype"])
    
    # Locale settings
    default_timezone = Column(String(50), default="Europe/Amsterdam")
    default_language = Column(String(10), default="en")
    date_format = Column(String(20), default="DD-MM-YYYY")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


# Notifications
class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("company_users.id"), nullable=True)  # Null = all users
    
    type = Column(Enum(NotificationType), default=NotificationType.INFO)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    link = Column(String(500), nullable=True)
    
    is_read = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)


# Sessions for tracking active logins
class Session(Base):
    __tablename__ = "sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("company_users.id", ondelete="CASCADE"))
    company_id = Column(Integer, index=True, nullable=False)
    
    token_hash = Column(String(255), unique=True, nullable=False)
    device_info = Column(String(500), nullable=True)
    ip_address = Column(String(50), nullable=True)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_activity = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
