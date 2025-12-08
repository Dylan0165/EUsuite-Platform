from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON, ForeignKey, Enum as SQLEnum, BigInteger, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum
from .database import Base


# Enums
class AdminRole(str, enum.Enum):
    SUPERADMIN = "superadmin"
    ADMIN = "admin"
    SUPPORT = "support"
    VIEWER = "viewer"


class TenantStatus(str, enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    TERMINATED = "terminated"


class SubscriptionStatus(str, enum.Enum):
    TRIAL = "trial"
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class PlanTier(str, enum.Enum):
    FREE = "free"
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


class InvoiceStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING = "pending"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


# Models
class AdminUser(Base):
    """Superadmin portal users"""
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    role = Column(SQLEnum(AdminRole), default=AdminRole.VIEWER, nullable=False)
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    audit_logs = relationship("AuditLog", back_populates="admin_user")


class Plan(Base):
    """Subscription plans"""
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    tier = Column(SQLEnum(PlanTier), nullable=False)
    description = Column(Text)
    
    # Pricing
    price_monthly = Column(Float, default=0)
    price_yearly = Column(Float, default=0)
    currency = Column(String(3), default="EUR")
    
    # Limits
    max_users = Column(Integer, default=5)
    max_storage_gb = Column(Integer, default=10)
    max_apps = Column(Integer, default=3)
    
    # Features
    features = Column(JSON, default=list)
    
    # Stripe
    stripe_monthly_price_id = Column(String(100))
    stripe_yearly_price_id = Column(String(100))
    stripe_product_id = Column(String(100))
    
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    tenants = relationship("Tenant", back_populates="plan")


class Tenant(Base):
    """Tenant/Company organizations"""
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    domain = Column(String(255), unique=True)
    
    # Contact
    contact_email = Column(String(255), nullable=False)
    contact_phone = Column(String(50))
    contact_name = Column(String(255))
    
    # Address
    address_line1 = Column(String(255))
    address_line2 = Column(String(255))
    city = Column(String(100))
    state = Column(String(100))
    postal_code = Column(String(20))
    country = Column(String(2), default="NL")
    
    # Business
    company_registration = Column(String(100))
    vat_number = Column(String(50))
    
    # Status
    status = Column(SQLEnum(TenantStatus), default=TenantStatus.PENDING, nullable=False)
    
    # Plan & Subscription
    plan_id = Column(Integer, ForeignKey("plans.id"))
    subscription_status = Column(SQLEnum(SubscriptionStatus), default=SubscriptionStatus.TRIAL)
    trial_ends_at = Column(DateTime(timezone=True))
    subscription_ends_at = Column(DateTime(timezone=True))
    
    # Stripe
    stripe_customer_id = Column(String(100), unique=True)
    stripe_subscription_id = Column(String(100))
    
    # Usage
    current_users = Column(Integer, default=0)
    current_storage_bytes = Column(BigInteger, default=0)
    current_apps = Column(Integer, default=0)
    
    # Kubernetes
    k8s_namespace = Column(String(100))
    k8s_deployed = Column(Boolean, default=False)
    
    # Settings
    settings = Column(JSON, default=dict)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    activated_at = Column(DateTime(timezone=True))
    suspended_at = Column(DateTime(timezone=True))

    # Relationships
    plan = relationship("Plan", back_populates="tenants")
    deployments = relationship("TenantDeployment", back_populates="tenant", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="tenant", cascade="all, delete-orphan")
    support_tickets = relationship("SupportTicket", back_populates="tenant", cascade="all, delete-orphan")


class TenantDeployment(Base):
    """App deployments for tenants"""
    __tablename__ = "tenant_deployments"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    
    app_name = Column(String(50), nullable=False)  # eucloud, eumail, eutype, eugroups
    status = Column(String(20), default="pending")  # pending, deploying, running, stopped, failed
    
    # Kubernetes
    k8s_deployment_name = Column(String(100))
    k8s_service_name = Column(String(100))
    node_port = Column(Integer)
    replicas = Column(Integer, default=1)
    
    # Resource limits
    cpu_limit = Column(String(20), default="500m")
    memory_limit = Column(String(20), default="512Mi")
    storage_limit = Column(String(20), default="10Gi")
    
    # URLs
    internal_url = Column(String(255))
    external_url = Column(String(255))
    
    # Metadata
    version = Column(String(50))
    config = Column(JSON, default=dict)
    
    deployed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    tenant = relationship("Tenant", back_populates="deployments")


class Invoice(Base):
    """Billing invoices"""
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    
    invoice_number = Column(String(50), unique=True, nullable=False)
    status = Column(SQLEnum(InvoiceStatus), default=InvoiceStatus.DRAFT)
    
    # Amounts
    subtotal = Column(Float, default=0)
    tax_rate = Column(Float, default=21)  # VAT percentage
    tax_amount = Column(Float, default=0)
    total = Column(Float, default=0)
    currency = Column(String(3), default="EUR")
    
    # Line items
    line_items = Column(JSON, default=list)
    
    # Dates
    invoice_date = Column(DateTime(timezone=True), server_default=func.now())
    due_date = Column(DateTime(timezone=True))
    paid_at = Column(DateTime(timezone=True))
    
    # Stripe
    stripe_invoice_id = Column(String(100))
    stripe_payment_intent_id = Column(String(100))
    
    # PDF
    pdf_url = Column(String(500))
    
    notes = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    tenant = relationship("Tenant", back_populates="invoices")


class SupportTicket(Base):
    """Support tickets from tenants"""
    __tablename__ = "support_tickets"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    
    ticket_number = Column(String(50), unique=True, nullable=False)
    subject = Column(String(255), nullable=False)
    description = Column(Text)
    
    priority = Column(String(20), default="medium")  # low, medium, high, urgent
    status = Column(String(20), default="open")  # open, in_progress, waiting, resolved, closed
    category = Column(String(50))  # billing, technical, feature_request, other
    
    # Assignment
    assigned_to = Column(Integer, ForeignKey("admin_users.id"))
    
    # Contact
    requester_email = Column(String(255))
    requester_name = Column(String(255))
    
    # Resolution
    resolution = Column(Text)
    resolved_at = Column(DateTime(timezone=True))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    tenant = relationship("Tenant", back_populates="support_tickets")
    messages = relationship("TicketMessage", back_populates="ticket", cascade="all, delete-orphan")


class TicketMessage(Base):
    """Messages within a support ticket"""
    __tablename__ = "ticket_messages"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("support_tickets.id"), nullable=False)
    
    message = Column(Text, nullable=False)
    is_internal = Column(Boolean, default=False)  # Internal notes not visible to customer
    is_from_admin = Column(Boolean, default=False)
    
    sender_name = Column(String(255))
    sender_email = Column(String(255))
    
    attachments = Column(JSON, default=list)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    ticket = relationship("SupportTicket", back_populates="messages")


class AuditLog(Base):
    """Audit logs for superadmin actions"""
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    admin_user_id = Column(Integer, ForeignKey("admin_users.id"))
    
    action = Column(String(100), nullable=False)
    resource_type = Column(String(50), nullable=False)
    resource_id = Column(String(100))
    
    details = Column(JSON, default=dict)
    ip_address = Column(String(45))
    user_agent = Column(String(500))
    
    status = Column(String(20), default="success")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    admin_user = relationship("AdminUser", back_populates="audit_logs")


class SystemSetting(Base):
    """Global system settings"""
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(Text)
    value_type = Column(String(20), default="string")  # string, number, boolean, json
    description = Column(Text)
    is_public = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class PortAllocation(Base):
    """Track allocated NodePorts"""
    __tablename__ = "port_allocations"

    id = Column(Integer, primary_key=True, index=True)
    port = Column(Integer, unique=True, nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    deployment_id = Column(Integer, ForeignKey("tenant_deployments.id"))
    app_name = Column(String(50))
    allocated_at = Column(DateTime(timezone=True), server_default=func.now())


class PlatformMetrics(Base):
    """Platform-wide metrics snapshots"""
    __tablename__ = "platform_metrics"

    id = Column(Integer, primary_key=True, index=True)
    
    # Tenant metrics
    total_tenants = Column(Integer, default=0)
    active_tenants = Column(Integer, default=0)
    trial_tenants = Column(Integer, default=0)
    
    # User metrics
    total_users = Column(Integer, default=0)
    active_users_24h = Column(Integer, default=0)
    
    # Revenue metrics
    mrr = Column(Float, default=0)  # Monthly Recurring Revenue
    arr = Column(Float, default=0)  # Annual Recurring Revenue
    
    # Resource metrics
    total_storage_bytes = Column(BigInteger, default=0)
    total_deployments = Column(Integer, default=0)
    
    # Snapshot timestamp
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())
