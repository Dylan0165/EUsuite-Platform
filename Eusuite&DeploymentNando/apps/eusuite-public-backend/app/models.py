"""
EUSuite Public Backend - Database Models
All models for public website: users, companies, plans, subscriptions, payments
"""
from datetime import datetime
from enum import Enum as PyEnum
from typing import Optional, List
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Text, 
    ForeignKey, Enum, BigInteger, JSON, Float, UniqueConstraint
)
from sqlalchemy.orm import relationship
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from .database import Base

ph = PasswordHasher()


# ============================================================================
# ENUMS
# ============================================================================

class PlanType(str, PyEnum):
    """Subscription plan types."""
    PARTICULIER = "particulier"  # Free tier for individuals
    BUSINESS = "business"        # Business tier
    ENTERPRISE = "enterprise"    # Enterprise tier


class SubscriptionStatus(str, PyEnum):
    """Subscription status."""
    ACTIVE = "active"
    TRIAL = "trial"
    CANCELLED = "cancelled"
    SUSPENDED = "suspended"
    EXPIRED = "expired"


class CompanyStatus(str, PyEnum):
    """Company registration status."""
    PENDING = "pending"          # Awaiting approval
    APPROVED = "approved"        # Approved and active
    REJECTED = "rejected"        # Registration rejected
    SUSPENDED = "suspended"      # Suspended by admin


class PaymentStatus(str, PyEnum):
    """Payment status."""
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class UserType(str, PyEnum):
    """User types for authentication."""
    PARTICULIER = "particulier"     # Individual user
    COMPANY_ADMIN = "company_admin"  # Company administrator
    COMPANY_USER = "company_user"    # Company employee
    SUPERADMIN = "superadmin"        # Platform administrator


class DeploymentTarget(str, PyEnum):
    """Where tenant is deployed."""
    CENTRAL_CLOUD = "central_cloud"   # Shared EUSuite cloud
    COMPANY_CLOUD = "company_cloud"   # Isolated company namespace
    SELF_HOSTED = "self_hosted"       # On-premise deployment


class StoragePolicyType(str, PyEnum):
    """Storage policy types."""
    COMPANY_ONLY = "company_only"     # Data stays in company
    CENTRAL_CLOUD = "central_cloud"   # Use EUSuite central cloud
    HYBRID = "hybrid"                 # User chooses per file


# ============================================================================
# MODELS
# ============================================================================

class Plan(Base):
    """Subscription plans available."""
    __tablename__ = "plans"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    slug = Column(String(50), unique=True, nullable=False)  # particulier, business, enterprise
    plan_type = Column(Enum(PlanType), nullable=False)
    description = Column(Text)
    
    # Pricing (in cents)
    price_monthly = Column(Integer, default=0)  # Per user per month
    price_yearly = Column(Integer, default=0)   # Per user per year (discount)
    
    # Limits
    max_users = Column(Integer, default=1)      # Max users (-1 = unlimited)
    max_storage_gb = Column(Integer, default=5) # Storage per user in GB
    max_apps = Column(Integer, default=-1)      # -1 = all apps
    
    # Features (JSON array of feature slugs)
    features = Column(JSON, default=list)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    subscriptions = relationship("Subscription", back_populates="plan")
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "plan_type": self.plan_type.value,
            "description": self.description,
            "price_monthly": self.price_monthly,
            "price_yearly": self.price_yearly,
            "max_users": self.max_users,
            "max_storage_gb": self.max_storage_gb,
            "max_apps": self.max_apps,
            "features": self.features,
            "is_featured": self.is_featured,
        }


class PublicUser(Base):
    """
    Users registered on the public website.
    These are either particulier users or company admins.
    """
    __tablename__ = "public_users"
    
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    
    # Profile
    first_name = Column(String(100))
    last_name = Column(String(100))
    phone = Column(String(50))
    
    # User type
    user_type = Column(Enum(UserType), default=UserType.PARTICULIER)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    verification_token = Column(String(255))
    verification_expires = Column(DateTime)
    
    # Password reset
    reset_token = Column(String(255))
    reset_token_expires = Column(DateTime)
    
    # 2FA
    two_factor_enabled = Column(Boolean, default=False)
    two_factor_secret = Column(String(100))
    
    # Company link (if company admin)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime)
    
    # Relationships
    company = relationship("Company", back_populates="admin_user", foreign_keys=[company_id])
    subscriptions = relationship("Subscription", back_populates="user")
    payments = relationship("Payment", back_populates="user")
    
    def set_password(self, password: str):
        """Hash and set password."""
        self.password_hash = ph.hash(password)
    
    def check_password(self, password: str) -> bool:
        """Verify password."""
        try:
            ph.verify(self.password_hash, password)
            return True
        except VerifyMismatchError:
            return False
        except Exception:
            return False
    
    @property
    def full_name(self) -> str:
        return f"{self.first_name or ''} {self.last_name or ''}".strip()
    
    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "full_name": self.full_name,
            "phone": self.phone,
            "user_type": self.user_type.value,
            "is_active": self.is_active,
            "is_verified": self.is_verified,
            "company_id": self.company_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Company(Base):
    """
    Registered companies (B2B customers).
    Each company gets their own tenant namespace.
    """
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True)
    
    # Company Info
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)  # Used for namespace
    
    # Contact
    contact_email = Column(String(255), nullable=False)
    billing_email = Column(String(255))
    phone = Column(String(50))
    website = Column(String(255))
    
    # Address
    address_line1 = Column(String(255))
    address_line2 = Column(String(255))
    city = Column(String(100))
    state = Column(String(100))
    postal_code = Column(String(20))
    country = Column(String(2), default="NL")  # ISO country code
    
    # Business Info
    kvk_number = Column(String(50))  # Chamber of Commerce number
    vat_number = Column(String(50))  # BTW number
    
    # Status
    status = Column(Enum(CompanyStatus), default=CompanyStatus.PENDING)
    rejection_reason = Column(Text)
    suspension_reason = Column(Text)
    
    # Deployment
    deployment_target = Column(Enum(DeploymentTarget), default=DeploymentTarget.CENTRAL_CLOUD)
    namespace = Column(String(100))  # Kubernetes namespace
    
    # Approval
    approved_at = Column(DateTime)
    approved_by = Column(Integer)  # Superadmin user ID
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    admin_user = relationship("PublicUser", back_populates="company", foreign_keys="PublicUser.company_id")
    subscriptions = relationship("Subscription", back_populates="company")
    branding = relationship("CompanyBranding", back_populates="company", uselist=False)
    storage_policy = relationship("CompanyStoragePolicy", back_populates="company", uselist=False)
    deployments = relationship("CompanyDeployment", back_populates="company")
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "contact_email": self.contact_email,
            "billing_email": self.billing_email,
            "phone": self.phone,
            "website": self.website,
            "address": {
                "line1": self.address_line1,
                "line2": self.address_line2,
                "city": self.city,
                "state": self.state,
                "postal_code": self.postal_code,
                "country": self.country,
            },
            "kvk_number": self.kvk_number,
            "vat_number": self.vat_number,
            "status": self.status.value,
            "deployment_target": self.deployment_target.value,
            "namespace": self.namespace,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "approved_at": self.approved_at.isoformat() if self.approved_at else None,
        }


class CompanyBranding(Base):
    """Company branding settings for white-label experience."""
    __tablename__ = "company_branding"
    
    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id"), unique=True, nullable=False)
    
    # Colors
    primary_color = Column(String(7), default="#166534")     # Emerald green
    secondary_color = Column(String(7), default="#d4af37")   # Gold
    accent_color = Column(String(7), default="#065f46")
    background_color = Column(String(7), default="#f8fafc")
    text_color = Column(String(7), default="#1e293b")
    
    # Logo
    logo_url = Column(String(500))
    logo_light_url = Column(String(500))  # For dark backgrounds
    favicon_url = Column(String(500))
    
    # Typography
    font_family = Column(String(100), default="Inter")
    heading_font = Column(String(100), default="Inter")
    
    # Custom CSS
    custom_css = Column(Text)
    
    # Login Page
    login_background_url = Column(String(500))
    login_message = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    company = relationship("Company", back_populates="branding")
    
    def to_dict(self):
        return {
            "company_id": self.company_id,
            "colors": {
                "primary": self.primary_color,
                "secondary": self.secondary_color,
                "accent": self.accent_color,
                "background": self.background_color,
                "text": self.text_color,
            },
            "logo": {
                "default": self.logo_url,
                "light": self.logo_light_url,
                "favicon": self.favicon_url,
            },
            "typography": {
                "font_family": self.font_family,
                "heading_font": self.heading_font,
            },
            "custom_css": self.custom_css,
            "login": {
                "background_url": self.login_background_url,
                "message": self.login_message,
            },
        }


class CompanyStoragePolicy(Base):
    """Storage policy settings per company."""
    __tablename__ = "company_storage_policies"
    
    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id"), unique=True, nullable=False)
    
    # Policy Type
    policy_type = Column(Enum(StoragePolicyType), default=StoragePolicyType.COMPANY_ONLY)
    
    # Sharing Rules
    allow_internal_sharing = Column(Boolean, default=True)   # Employees can share with each other
    allow_external_sharing = Column(Boolean, default=False)  # Can share with external parties
    allow_public_links = Column(Boolean, default=False)      # Can create public share links
    allow_particulier_upload = Column(Boolean, default=False)  # Particuliers can upload to company
    
    # File Restrictions
    max_file_size_mb = Column(Integer, default=100)
    allowed_extensions = Column(JSON, default=list)  # Empty = all allowed
    blocked_extensions = Column(JSON, default=lambda: [".exe", ".bat", ".sh"])
    
    # Retention
    trash_retention_days = Column(Integer, default=30)
    version_retention_count = Column(Integer, default=10)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    company = relationship("Company", back_populates="storage_policy")
    
    def to_dict(self):
        return {
            "company_id": self.company_id,
            "policy_type": self.policy_type.value,
            "sharing": {
                "allow_internal": self.allow_internal_sharing,
                "allow_external": self.allow_external_sharing,
                "allow_public_links": self.allow_public_links,
                "allow_particulier_upload": self.allow_particulier_upload,
            },
            "file_restrictions": {
                "max_file_size_mb": self.max_file_size_mb,
                "allowed_extensions": self.allowed_extensions,
                "blocked_extensions": self.blocked_extensions,
            },
            "retention": {
                "trash_days": self.trash_retention_days,
                "version_count": self.version_retention_count,
            },
        }


class Subscription(Base):
    """User/Company subscriptions to plans."""
    __tablename__ = "subscriptions"
    
    id = Column(Integer, primary_key=True)
    
    # Owner (either user OR company)
    user_id = Column(Integer, ForeignKey("public_users.id"), nullable=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    
    # Plan
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=False)
    
    # Status
    status = Column(Enum(SubscriptionStatus), default=SubscriptionStatus.TRIAL)
    
    # Billing
    billing_cycle = Column(String(20), default="monthly")  # monthly, yearly
    current_period_start = Column(DateTime)
    current_period_end = Column(DateTime)
    
    # Usage (for business plans)
    user_count = Column(Integer, default=1)  # Number of seats
    
    # Stripe
    stripe_subscription_id = Column(String(100))
    stripe_customer_id = Column(String(100))
    
    # Trial
    trial_ends_at = Column(DateTime)
    
    # Cancellation
    cancelled_at = Column(DateTime)
    cancel_reason = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("PublicUser", back_populates="subscriptions")
    company = relationship("Company", back_populates="subscriptions")
    plan = relationship("Plan", back_populates="subscriptions")
    payments = relationship("Payment", back_populates="subscription")
    
    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "company_id": self.company_id,
            "plan": self.plan.to_dict() if self.plan else None,
            "status": self.status.value,
            "billing_cycle": self.billing_cycle,
            "user_count": self.user_count,
            "current_period_start": self.current_period_start.isoformat() if self.current_period_start else None,
            "current_period_end": self.current_period_end.isoformat() if self.current_period_end else None,
            "trial_ends_at": self.trial_ends_at.isoformat() if self.trial_ends_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Payment(Base):
    """Payment records."""
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True)
    
    # Owner
    user_id = Column(Integer, ForeignKey("public_users.id"), nullable=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=True)
    
    # Amount (in cents)
    amount = Column(Integer, nullable=False)
    currency = Column(String(3), default="EUR")
    
    # Status
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    
    # Stripe
    stripe_payment_intent_id = Column(String(100))
    stripe_invoice_id = Column(String(100))
    
    # Invoice
    invoice_number = Column(String(50))
    invoice_url = Column(String(500))
    
    # Description
    description = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    paid_at = Column(DateTime)
    
    # Relationships
    user = relationship("PublicUser", back_populates="payments")
    subscription = relationship("Subscription", back_populates="payments")
    
    def to_dict(self):
        return {
            "id": self.id,
            "amount": self.amount,
            "currency": self.currency,
            "status": self.status.value,
            "invoice_number": self.invoice_number,
            "invoice_url": self.invoice_url,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "paid_at": self.paid_at.isoformat() if self.paid_at else None,
        }


class CompanyDeployment(Base):
    """Track company deployments to Kubernetes."""
    __tablename__ = "company_deployments"
    
    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    
    # Deployment Info
    deployment_id = Column(String(100), unique=True, nullable=False)
    namespace = Column(String(100), nullable=False)
    
    # Services deployed (JSON array)
    services = Column(JSON, default=list)  # ["dashboard", "eucloud", "eumail", etc.]
    
    # Port Allocations (JSON object)
    port_allocations = Column(JSON, default=dict)  # {"dashboard": 31000, "eucloud": 31001, ...}
    
    # Status
    status = Column(String(50), default="pending")  # pending, deploying, active, failed
    status_message = Column(Text)
    
    # YAML (stored for rollback)
    generated_yaml = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    deployed_at = Column(DateTime)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    company = relationship("Company", back_populates="deployments")
    
    def to_dict(self):
        return {
            "id": self.id,
            "company_id": self.company_id,
            "deployment_id": self.deployment_id,
            "namespace": self.namespace,
            "services": self.services,
            "port_allocations": self.port_allocations,
            "status": self.status,
            "status_message": self.status_message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "deployed_at": self.deployed_at.isoformat() if self.deployed_at else None,
        }


class PortAllocation(Base):
    """Track allocated NodePorts to prevent conflicts."""
    __tablename__ = "port_allocations"
    
    id = Column(Integer, primary_key=True)
    port = Column(Integer, unique=True, nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)  # Null = reserved
    service_type = Column(String(50))  # dashboard, eucloud, eumail, etc.
    namespace = Column(String(100))
    
    # Status
    is_allocated = Column(Boolean, default=False)
    
    # Timestamps
    allocated_at = Column(DateTime)
    released_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        UniqueConstraint("company_id", "service_type", name="unique_company_service"),
    )


class AuditLog(Base):
    """Audit log for important actions."""
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True)
    
    # Actor
    user_id = Column(Integer)
    user_email = Column(String(255))
    user_type = Column(String(50))
    
    # Action
    action = Column(String(100), nullable=False)  # e.g., "company.create", "user.login"
    resource_type = Column(String(50))  # e.g., "company", "user"
    resource_id = Column(String(100))
    
    # Details
    details = Column(JSON)
    ip_address = Column(String(50))
    user_agent = Column(String(500))
    
    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow)
