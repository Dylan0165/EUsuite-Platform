"""
EUSuite Public Backend - Pydantic Schemas
Request/Response validation models
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field, validator
import re


# ============================================================================
# BASE SCHEMAS
# ============================================================================

class BaseResponse(BaseModel):
    """Base response with success flag."""
    success: bool = True
    message: Optional[str] = None


class PaginatedResponse(BaseModel):
    """Paginated response."""
    items: List[Any]
    total: int
    page: int
    page_size: int
    total_pages: int


# ============================================================================
# AUTH SCHEMAS
# ============================================================================

class UserRegister(BaseModel):
    """User registration request."""
    email: EmailStr
    password: str = Field(..., min_length=8)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    phone: Optional[str] = None
    
    @validator("password")
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v


class UserLogin(BaseModel):
    """User login request."""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """JWT token response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: Dict[str, Any]


class TokenPayload(BaseModel):
    """JWT token payload."""
    sub: str  # User ID
    email: str
    user_type: str
    tenant_id: Optional[int] = None  # Company ID if applicable
    exp: datetime
    iat: datetime


class PasswordResetRequest(BaseModel):
    """Password reset request."""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Password reset confirmation."""
    token: str
    new_password: str = Field(..., min_length=8)


class EmailVerification(BaseModel):
    """Email verification."""
    token: str


# ============================================================================
# USER SCHEMAS
# ============================================================================

class UserResponse(BaseModel):
    """User response."""
    id: int
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    full_name: str
    phone: Optional[str]
    user_type: str
    is_active: bool
    is_verified: bool
    company_id: Optional[int]
    created_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    """User update request."""
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = None


class ChangePassword(BaseModel):
    """Change password request."""
    current_password: str
    new_password: str = Field(..., min_length=8)


# ============================================================================
# COMPANY SCHEMAS
# ============================================================================

class CompanyRegister(BaseModel):
    """Company registration request."""
    # Company Info
    company_name: str = Field(..., min_length=2, max_length=255)
    
    # Admin User
    admin_email: EmailStr
    admin_password: str = Field(..., min_length=8)
    admin_first_name: str = Field(..., min_length=1, max_length=100)
    admin_last_name: str = Field(..., min_length=1, max_length=100)
    
    # Contact
    contact_email: Optional[EmailStr] = None
    billing_email: Optional[EmailStr] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    
    # Address
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: str = "NL"
    
    # Business
    kvk_number: Optional[str] = None
    vat_number: Optional[str] = None
    
    # Plan
    plan_slug: str = "business"
    billing_cycle: str = "monthly"  # monthly, yearly


class CompanyResponse(BaseModel):
    """Company response."""
    id: int
    name: str
    slug: str
    contact_email: str
    billing_email: Optional[str]
    phone: Optional[str]
    website: Optional[str]
    address: Dict[str, Any]
    kvk_number: Optional[str]
    vat_number: Optional[str]
    status: str
    deployment_target: str
    namespace: Optional[str]
    created_at: Optional[datetime]
    approved_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class CompanyUpdate(BaseModel):
    """Company update request."""
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    contact_email: Optional[EmailStr] = None
    billing_email: Optional[EmailStr] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    kvk_number: Optional[str] = None
    vat_number: Optional[str] = None


# ============================================================================
# PLAN SCHEMAS
# ============================================================================

class PlanResponse(BaseModel):
    """Plan response."""
    id: int
    name: str
    slug: str
    plan_type: str
    description: Optional[str]
    price_monthly: int
    price_yearly: int
    max_users: int
    max_storage_gb: int
    max_apps: int
    features: List[str]
    is_featured: bool
    
    class Config:
        from_attributes = True


# ============================================================================
# SUBSCRIPTION SCHEMAS
# ============================================================================

class CreateSubscription(BaseModel):
    """Create subscription request."""
    plan_slug: str
    billing_cycle: str = "monthly"  # monthly, yearly
    user_count: int = 1  # For business plans


class SubscriptionResponse(BaseModel):
    """Subscription response."""
    id: int
    user_id: Optional[int]
    company_id: Optional[int]
    plan: PlanResponse
    status: str
    billing_cycle: str
    user_count: int
    current_period_start: Optional[datetime]
    current_period_end: Optional[datetime]
    trial_ends_at: Optional[datetime]
    created_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class UpdateSubscription(BaseModel):
    """Update subscription request."""
    plan_slug: Optional[str] = None
    billing_cycle: Optional[str] = None
    user_count: Optional[int] = None


class CancelSubscription(BaseModel):
    """Cancel subscription request."""
    reason: Optional[str] = None
    cancel_immediately: bool = False


# ============================================================================
# PAYMENT SCHEMAS
# ============================================================================

class CreatePaymentIntent(BaseModel):
    """Create Stripe payment intent."""
    subscription_id: int
    amount: Optional[int] = None  # Override amount if needed


class PaymentResponse(BaseModel):
    """Payment response."""
    id: int
    amount: int
    currency: str
    status: str
    invoice_number: Optional[str]
    invoice_url: Optional[str]
    description: Optional[str]
    created_at: Optional[datetime]
    paid_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class StripeWebhookEvent(BaseModel):
    """Stripe webhook event."""
    type: str
    data: Dict[str, Any]


# ============================================================================
# BRANDING SCHEMAS
# ============================================================================

class BrandingUpdate(BaseModel):
    """Branding update request."""
    primary_color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    secondary_color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    accent_color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    background_color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    text_color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    logo_url: Optional[str] = None
    logo_light_url: Optional[str] = None
    favicon_url: Optional[str] = None
    font_family: Optional[str] = None
    heading_font: Optional[str] = None
    custom_css: Optional[str] = None
    login_background_url: Optional[str] = None
    login_message: Optional[str] = None


class BrandingResponse(BaseModel):
    """Branding response."""
    company_id: int
    colors: Dict[str, str]
    logo: Dict[str, Optional[str]]
    typography: Dict[str, str]
    custom_css: Optional[str]
    login: Dict[str, Optional[str]]
    
    class Config:
        from_attributes = True


# ============================================================================
# STORAGE POLICY SCHEMAS
# ============================================================================

class StoragePolicyUpdate(BaseModel):
    """Storage policy update request."""
    policy_type: Optional[str] = None  # company_only, central_cloud, hybrid
    allow_internal_sharing: Optional[bool] = None
    allow_external_sharing: Optional[bool] = None
    allow_public_links: Optional[bool] = None
    allow_particulier_upload: Optional[bool] = None
    max_file_size_mb: Optional[int] = None
    allowed_extensions: Optional[List[str]] = None
    blocked_extensions: Optional[List[str]] = None
    trash_retention_days: Optional[int] = None
    version_retention_count: Optional[int] = None


class StoragePolicyResponse(BaseModel):
    """Storage policy response."""
    company_id: int
    policy_type: str
    sharing: Dict[str, bool]
    file_restrictions: Dict[str, Any]
    retention: Dict[str, int]
    
    class Config:
        from_attributes = True


# ============================================================================
# DEPLOYMENT SCHEMAS
# ============================================================================

class DeploymentRequest(BaseModel):
    """Deployment request."""
    services: List[str] = ["dashboard", "eucloud", "eumail", "eugroups", "eutype"]
    deployment_target: str = "central_cloud"  # central_cloud, company_cloud


class DeploymentResponse(BaseModel):
    """Deployment response."""
    id: int
    company_id: int
    deployment_id: str
    namespace: str
    services: List[str]
    port_allocations: Dict[str, int]
    status: str
    status_message: Optional[str]
    created_at: Optional[datetime]
    deployed_at: Optional[datetime]
    
    class Config:
        from_attributes = True


# ============================================================================
# CONTACT/SUPPORT SCHEMAS
# ============================================================================

class ContactForm(BaseModel):
    """Contact form submission."""
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    company: Optional[str] = None
    subject: str = Field(..., min_length=5, max_length=200)
    message: str = Field(..., min_length=10, max_length=5000)
    
    
class NewsletterSubscribe(BaseModel):
    """Newsletter subscription."""
    email: EmailStr
    first_name: Optional[str] = None
