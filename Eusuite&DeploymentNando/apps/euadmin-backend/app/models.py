"""
EUAdmin Backend - Database Models
Multi-tenant platform models for companies, tenants, branding, storage policies, deployments.
"""
from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey,
    BigInteger, JSON, Enum as SQLEnum, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func
import enum

Base = declarative_base()


class DeploymentTarget(enum.Enum):
    """Where the tenant ecosystem is deployed."""
    CENTRAL_CLOUD = "central_cloud"  # On EUSuite central VM
    COMPANY_CLOUD = "company_cloud"  # On company's own infrastructure
    SELF_HOSTED = "self_hosted"      # Downloaded YAML for manual deployment


class StoragePolicyType(enum.Enum):
    """Storage policy options for companies."""
    COMPANY_ONLY = "company_only"      # Data never touches central cloud
    EUSUITE_ONLY = "eusuite_only"      # Company uses only EUSuite cloud
    HYBRID = "hybrid"                   # User selects per file


class UserRole(enum.Enum):
    """User roles in the system."""
    SUPERADMIN = "superadmin"          # EUSuite platform admin
    COMPANY_ADMIN = "company_admin"     # Company administrator
    USER = "user"                       # Regular user


class DeploymentStatus(enum.Enum):
    """Status of a deployment."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    ROLLBACK = "rollback"


class ServiceType(enum.Enum):
    """Types of services in EUSuite ecosystem."""
    DASHBOARD = "dashboard"
    LOGIN = "login"
    EUCLOUD = "eucloud"
    EUTYPE = "eutype"
    EUMAIL = "eumail"
    EUGROUPS = "eugroups"
    EUADMIN = "euadmin"


# =============================================================================
# COMPANY / TENANT MODELS
# =============================================================================

class Company(Base):
    """
    Company/Tenant entity - represents an organization using EUSuite.
    Each company gets their own isolated EUSuite ecosystem.
    """
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Basic info
    name = Column(String(255), nullable=False, unique=True)
    slug = Column(String(100), nullable=False, unique=True)  # URL-friendly name
    description = Column(Text, nullable=True)
    
    # Contact info
    contact_email = Column(String(255), nullable=False)
    contact_phone = Column(String(50), nullable=True)
    billing_email = Column(String(255), nullable=True)
    
    # Registration
    registered_at = Column(DateTime, default=func.now())
    approved_at = Column(DateTime, nullable=True)
    approved_by = Column(Integer, nullable=True)  # superadmin user_id
    
    # Status
    is_active = Column(Boolean, default=True)
    is_approved = Column(Boolean, default=False)
    is_suspended = Column(Boolean, default=False)
    suspension_reason = Column(Text, nullable=True)
    
    # Deployment target
    deployment_target = Column(
        SQLEnum(DeploymentTarget), 
        default=DeploymentTarget.CENTRAL_CLOUD
    )
    
    # Kubernetes namespace (auto-generated: tenant-{slug})
    namespace = Column(String(63), nullable=True, unique=True)
    
    # External cluster config (for company_cloud deployments)
    external_cluster_config = Column(JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    users = relationship("CompanyUser", back_populates="company", cascade="all, delete-orphan")
    branding = relationship("CompanyBranding", back_populates="company", uselist=False, cascade="all, delete-orphan")
    storage_policy = relationship("CompanyStoragePolicy", back_populates="company", uselist=False, cascade="all, delete-orphan")
    services = relationship("CompanyService", back_populates="company", cascade="all, delete-orphan")
    deployments = relationship("DeploymentHistory", back_populates="company", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_company_slug', 'slug'),
        Index('idx_company_namespace', 'namespace'),
    )
    
    def __repr__(self):
        return f"<Company(id={self.id}, name='{self.name}', namespace='{self.namespace}')>"


class CompanyUser(Base):
    """
    User belonging to a company.
    Users can be admins or regular users within their company.
    """
    __tablename__ = "company_users"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    # User info
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False)  # voornaam.achternaam@EUmail.eu
    password_hash = Column(String(255), nullable=False)
    
    # Role
    role = Column(SQLEnum(UserRole), default=UserRole.USER)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    
    # Profile
    avatar_url = Column(String(500), nullable=True)
    phone = Column(String(50), nullable=True)
    department = Column(String(100), nullable=True)
    job_title = Column(String(100), nullable=True)
    
    # Storage
    storage_quota = Column(BigInteger, default=5 * 1024 * 1024 * 1024)  # 5GB default
    storage_used = Column(BigInteger, default=0)
    
    # Authentication
    last_login = Column(DateTime, nullable=True)
    login_count = Column(Integer, default=0)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
    
    # Password reset
    password_reset_token = Column(String(255), nullable=True)
    password_reset_expires = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    company = relationship("Company", back_populates="users")
    
    __table_args__ = (
        UniqueConstraint('company_id', 'email', name='uq_company_user_email'),
        Index('idx_company_user_email', 'email'),
        Index('idx_company_user_company', 'company_id'),
    )
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    @property
    def generated_email(self):
        """Generate email in format voornaam.achternaam@EUmail.eu"""
        first = self.first_name.lower().replace(' ', '')
        last = self.last_name.lower().replace(' ', '')
        return f"{first}.{last}@EUmail.eu"
    
    def __repr__(self):
        return f"<CompanyUser(id={self.id}, email='{self.email}', company_id={self.company_id})>"


# =============================================================================
# BRANDING MODELS
# =============================================================================

class CompanyBranding(Base):
    """
    Branding configuration for a company.
    Controls visual appearance of all EUSuite apps for this tenant.
    """
    __tablename__ = "company_branding"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # Company identity
    company_display_name = Column(String(255), nullable=True)  # Display name (can differ from company.name)
    tagline = Column(String(255), nullable=True)
    
    # Logos
    logo_url = Column(String(500), nullable=True)           # Main logo
    logo_dark_url = Column(String(500), nullable=True)      # Logo for dark backgrounds
    favicon_url = Column(String(500), nullable=True)        # Favicon
    header_logo_url = Column(String(500), nullable=True)    # Header logo (smaller)
    login_background_url = Column(String(500), nullable=True)
    
    # Colors (hex format)
    primary_color = Column(String(7), default="#1E40AF")    # Main brand color
    secondary_color = Column(String(7), default="#3B82F6")  # Secondary color
    accent_color = Column(String(7), default="#60A5FA")     # Accent/highlight color
    background_color = Column(String(7), default="#F3F4F6") # Background
    text_color = Column(String(7), default="#1F2937")       # Main text
    header_bg_color = Column(String(7), default="#1E40AF")  # Header background
    header_text_color = Column(String(7), default="#FFFFFF") # Header text
    sidebar_bg_color = Column(String(7), default="#1F2937") # Sidebar background
    sidebar_text_color = Column(String(7), default="#F9FAFB") # Sidebar text
    
    # Typography
    font_family = Column(String(100), default="Inter, sans-serif")
    heading_font_family = Column(String(100), nullable=True)
    
    # Custom CSS (advanced)
    custom_css = Column(Text, nullable=True)
    
    # Email branding
    email_header_html = Column(Text, nullable=True)
    email_footer_html = Column(Text, nullable=True)
    email_signature = Column(Text, nullable=True)
    
    # Login page customization
    login_title = Column(String(255), nullable=True)
    login_subtitle = Column(String(500), nullable=True)
    login_welcome_message = Column(Text, nullable=True)
    
    # Footer
    footer_text = Column(String(500), nullable=True)
    footer_links = Column(JSON, nullable=True)  # [{"label": "Privacy", "url": "/privacy"}]
    
    # Social links
    social_links = Column(JSON, nullable=True)  # {"twitter": "url", "linkedin": "url"}
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    company = relationship("Company", back_populates="branding")
    
    def __repr__(self):
        return f"<CompanyBranding(id={self.id}, company_id={self.company_id})>"
    
    def to_branding_json(self) -> dict:
        """Export branding as JSON for frontend injection."""
        return {
            "companyName": self.company_display_name or (self.company.name if self.company else "EUSuite"),
            "tagline": self.tagline,
            "logo": self.logo_url,
            "logoDark": self.logo_dark_url,
            "favicon": self.favicon_url,
            "headerLogo": self.header_logo_url,
            "loginBackground": self.login_background_url,
            "colors": {
                "primary": self.primary_color,
                "secondary": self.secondary_color,
                "accent": self.accent_color,
                "background": self.background_color,
                "text": self.text_color,
                "headerBg": self.header_bg_color,
                "headerText": self.header_text_color,
                "sidebarBg": self.sidebar_bg_color,
                "sidebarText": self.sidebar_text_color,
            },
            "typography": {
                "fontFamily": self.font_family,
                "headingFontFamily": self.heading_font_family,
            },
            "customCss": self.custom_css,
            "login": {
                "title": self.login_title,
                "subtitle": self.login_subtitle,
                "welcomeMessage": self.login_welcome_message,
            },
            "footer": {
                "text": self.footer_text,
                "links": self.footer_links or [],
            },
            "socialLinks": self.social_links or {},
        }


# =============================================================================
# STORAGE POLICY MODELS
# =============================================================================

class CompanyStoragePolicy(Base):
    """
    Storage policy configuration for a company.
    Determines where and how data is stored.
    """
    __tablename__ = "company_storage_policies"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # Policy type
    policy_type = Column(
        SQLEnum(StoragePolicyType), 
        default=StoragePolicyType.EUSUITE_ONLY
    )
    
    # Quotas
    total_storage_quota = Column(BigInteger, default=100 * 1024 * 1024 * 1024)  # 100GB default
    storage_used = Column(BigInteger, default=0)
    max_file_size = Column(BigInteger, default=100 * 1024 * 1024)  # 100MB default
    default_user_quota = Column(BigInteger, default=5 * 1024 * 1024 * 1024)  # 5GB default
    
    # Retention
    file_retention_days = Column(Integer, default=365)  # Days to keep deleted files
    trash_retention_days = Column(Integer, default=30)   # Days before permanent deletion
    
    # Backup settings
    backup_enabled = Column(Boolean, default=True)
    backup_frequency_hours = Column(Integer, default=24)
    backup_retention_days = Column(Integer, default=90)
    
    # Encryption
    encryption_enabled = Column(Boolean, default=True)
    encryption_algorithm = Column(String(50), default="AES-256")
    
    # Company cloud settings (for COMPANY_ONLY or HYBRID)
    company_storage_endpoint = Column(String(500), nullable=True)  # S3-compatible endpoint
    company_storage_bucket = Column(String(255), nullable=True)
    company_storage_access_key = Column(String(255), nullable=True)
    company_storage_secret_key = Column(String(255), nullable=True)  # Should be encrypted
    company_storage_region = Column(String(50), nullable=True)
    
    # Allowed file types (null = all allowed)
    allowed_file_types = Column(JSON, nullable=True)  # ["pdf", "docx", "xlsx"]
    blocked_file_types = Column(JSON, nullable=True)  # ["exe", "bat"]
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    company = relationship("Company", back_populates="storage_policy")
    
    def __repr__(self):
        return f"<CompanyStoragePolicy(id={self.id}, company_id={self.company_id}, type={self.policy_type})>"


# =============================================================================
# SERVICE & DEPLOYMENT MODELS
# =============================================================================

class CompanyService(Base):
    """
    Configuration for a specific service within a company's ecosystem.
    Each company can have multiple services (dashboard, eucloud, eumail, etc.)
    """
    __tablename__ = "company_services"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    # Service info
    service_type = Column(SQLEnum(ServiceType), nullable=False)
    service_name = Column(String(100), nullable=False)  # e.g., "acme-dashboard"
    
    # Status
    is_enabled = Column(Boolean, default=True)
    is_deployed = Column(Boolean, default=False)
    
    # Network configuration
    internal_port = Column(Integer, nullable=False)     # Container port
    node_port = Column(Integer, nullable=True)          # NodePort (30000-32767)
    ingress_path = Column(String(100), nullable=True)   # Ingress path
    custom_domain = Column(String(255), nullable=True)  # Custom domain if any
    
    # Resource limits
    cpu_request = Column(String(20), default="100m")
    cpu_limit = Column(String(20), default="500m")
    memory_request = Column(String(20), default="128Mi")
    memory_limit = Column(String(20), default="512Mi")
    replicas = Column(Integer, default=1)
    
    # Image
    image_repository = Column(String(255), nullable=False)
    image_tag = Column(String(100), default="latest")
    
    # Environment variables (encrypted)
    env_vars = Column(JSON, nullable=True)
    
    # Health check
    health_check_path = Column(String(100), default="/health")
    health_check_port = Column(Integer, nullable=True)
    
    # Deployment info
    last_deployed_at = Column(DateTime, nullable=True)
    last_deployment_status = Column(String(50), nullable=True)
    deployment_version = Column(String(50), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    company = relationship("Company", back_populates="services")
    
    __table_args__ = (
        UniqueConstraint('company_id', 'service_type', name='uq_company_service_type'),
        Index('idx_company_service', 'company_id', 'service_type'),
    )
    
    def __repr__(self):
        return f"<CompanyService(id={self.id}, company_id={self.company_id}, type={self.service_type})>"


class DeploymentHistory(Base):
    """
    History of deployments for a company.
    Tracks all deployment operations and their outcomes.
    """
    __tablename__ = "deployment_history"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    # Deployment info
    deployment_id = Column(String(50), nullable=False, unique=True)  # UUID
    deployment_type = Column(String(50), nullable=False)  # "full", "service", "update", "rollback"
    
    # Target
    target = Column(SQLEnum(DeploymentTarget), nullable=False)
    namespace = Column(String(63), nullable=False)
    
    # Services deployed
    services_deployed = Column(JSON, nullable=True)  # ["dashboard", "eucloud", "eumail"]
    
    # Status
    status = Column(SQLEnum(DeploymentStatus), default=DeploymentStatus.PENDING)
    status_message = Column(Text, nullable=True)
    
    # Initiated by
    initiated_by = Column(Integer, nullable=True)  # user_id
    initiated_by_email = Column(String(255), nullable=True)
    
    # Timing
    started_at = Column(DateTime, default=func.now())
    completed_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    
    # Configuration snapshot
    config_snapshot = Column(JSON, nullable=True)  # Full config at deployment time
    
    # Generated YAML (for self-hosted)
    generated_yaml = Column(Text, nullable=True)
    
    # Logs
    logs = Column(Text, nullable=True)
    
    # Rollback info
    rollback_from_deployment_id = Column(String(50), nullable=True)
    can_rollback = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    company = relationship("Company", back_populates="deployments")
    
    __table_args__ = (
        Index('idx_deployment_company', 'company_id'),
        Index('idx_deployment_status', 'status'),
        Index('idx_deployment_date', 'started_at'),
    )
    
    def __repr__(self):
        return f"<DeploymentHistory(id={self.id}, deployment_id='{self.deployment_id}', status={self.status})>"


# =============================================================================
# PLATFORM ADMIN MODELS
# =============================================================================

class PlatformAdmin(Base):
    """
    Platform-level administrators (superadmins).
    These users can manage all companies and the platform itself.
    """
    __tablename__ = "platform_admins"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # User info
    email = Column(String(255), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_super = Column(Boolean, default=False)  # Super superadmin
    
    # Permissions
    permissions = Column(JSON, nullable=True)  # Granular permissions
    
    # Authentication
    last_login = Column(DateTime, nullable=True)
    login_count = Column(Integer, default=0)
    mfa_enabled = Column(Boolean, default=False)
    mfa_secret = Column(String(255), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<PlatformAdmin(id={self.id}, email='{self.email}')>"


class PortAllocation(Base):
    """
    Track allocated NodePorts to prevent conflicts.
    """
    __tablename__ = "port_allocations"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    port = Column(Integer, nullable=False, unique=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="SET NULL"), nullable=True)
    service_type = Column(SQLEnum(ServiceType), nullable=True)
    namespace = Column(String(63), nullable=True)
    
    # Status
    is_allocated = Column(Boolean, default=True)
    allocated_at = Column(DateTime, default=func.now())
    released_at = Column(DateTime, nullable=True)
    
    # Notes
    notes = Column(String(255), nullable=True)
    
    __table_args__ = (
        Index('idx_port_allocation', 'port'),
    )
    
    def __repr__(self):
        return f"<PortAllocation(port={self.port}, company_id={self.company_id})>"


class AuditLog(Base):
    """
    Audit log for tracking all administrative actions.
    """
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Who
    user_type = Column(String(50), nullable=False)  # "platform_admin", "company_admin", "user"
    user_id = Column(Integer, nullable=True)
    user_email = Column(String(255), nullable=True)
    company_id = Column(Integer, nullable=True)
    
    # What
    action = Column(String(100), nullable=False)  # "create_company", "deploy", "delete_user"
    resource_type = Column(String(50), nullable=True)  # "company", "user", "deployment"
    resource_id = Column(String(100), nullable=True)
    
    # Details
    details = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    # Result
    success = Column(Boolean, default=True)
    error_message = Column(Text, nullable=True)
    
    # Timestamp
    created_at = Column(DateTime, default=func.now())
    
    __table_args__ = (
        Index('idx_audit_user', 'user_id'),
        Index('idx_audit_company', 'company_id'),
        Index('idx_audit_action', 'action'),
        Index('idx_audit_date', 'created_at'),
    )
    
    def __repr__(self):
        return f"<AuditLog(id={self.id}, action='{self.action}')>"
