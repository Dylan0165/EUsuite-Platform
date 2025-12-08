"""
EUSuite Public Backend - Company Registration Routes
Business registration and management
"""
import logging
import re
import secrets
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    Company, PublicUser, CompanyBranding, CompanyStoragePolicy, 
    Subscription, Plan, UserType, CompanyStatus, 
    StoragePolicyType, SubscriptionStatus
)
from ..schemas import (
    CompanyRegister, CompanyResponse, CompanyUpdate, 
    BaseResponse, BrandingResponse, StoragePolicyResponse
)
from ..auth import get_current_user, get_company_admin
from ..services.email_service import email_service
from ..config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter(prefix="/companies", tags=["Companies"])


def generate_slug(name: str) -> str:
    """Generate URL-safe slug from company name."""
    slug = name.lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s_-]+', '-', slug)
    slug = slug.strip('-')
    return slug[:50]


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_company(
    data: CompanyRegister,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Register a new company.
    Creates the company, admin user, and initial subscription.
    Company requires approval before becoming active.
    """
    # Check if admin email exists
    existing_user = db.query(PublicUser).filter(
        PublicUser.email == data.admin_email.lower()
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Admin email already registered"
        )
    
    # Generate slug
    slug = generate_slug(data.company_name)
    
    # Check if slug exists
    existing_company = db.query(Company).filter(Company.slug == slug).first()
    if existing_company:
        # Add random suffix
        slug = f"{slug}-{secrets.token_hex(3)}"
    
    # Get plan
    plan = db.query(Plan).filter(Plan.slug == data.plan_slug).first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan: {data.plan_slug}"
        )
    
    # Create company
    company = Company(
        name=data.company_name,
        slug=slug,
        contact_email=data.contact_email or data.admin_email,
        billing_email=data.billing_email or data.admin_email,
        phone=data.phone,
        website=data.website,
        address_line1=data.address_line1,
        address_line2=data.address_line2,
        city=data.city,
        state=data.state,
        postal_code=data.postal_code,
        country=data.country,
        kvk_number=data.kvk_number,
        vat_number=data.vat_number,
        status=CompanyStatus.PENDING,
        namespace=f"tenant-{slug}"
    )
    db.add(company)
    db.flush()
    
    # Create admin user
    admin_user = PublicUser(
        email=data.admin_email.lower(),
        first_name=data.admin_first_name,
        last_name=data.admin_last_name,
        user_type=UserType.COMPANY_ADMIN,
        company_id=company.id,
        is_active=True,
        is_verified=False
    )
    admin_user.set_password(data.admin_password)
    admin_user.verification_token = secrets.token_urlsafe(32)
    admin_user.verification_expires = datetime.utcnow() + timedelta(hours=24)
    db.add(admin_user)
    
    # Create default branding
    branding = CompanyBranding(company_id=company.id)
    db.add(branding)
    
    # Create default storage policy
    storage_policy = CompanyStoragePolicy(
        company_id=company.id,
        policy_type=StoragePolicyType.COMPANY_ONLY
    )
    db.add(storage_policy)
    
    # Create subscription (trial)
    subscription = Subscription(
        company_id=company.id,
        plan_id=plan.id,
        status=SubscriptionStatus.TRIAL,
        billing_cycle=data.billing_cycle,
        user_count=1,
        trial_ends_at=datetime.utcnow() + timedelta(days=14),
        current_period_start=datetime.utcnow(),
        current_period_end=datetime.utcnow() + timedelta(days=14)
    )
    db.add(subscription)
    
    db.commit()
    db.refresh(company)
    db.refresh(admin_user)
    
    logger.info(f"Company registered: {company.name} ({company.slug})")
    
    # Send emails
    background_tasks.add_task(
        email_service.send_verification_email,
        admin_user.email,
        admin_user.verification_token,
        admin_user.first_name
    )
    background_tasks.add_task(
        email_service.send_company_registration_email,
        admin_user.email,
        company.name,
        admin_user.full_name
    )
    
    return {
        "success": True,
        "message": "Registration received. Awaiting approval.",
        "company": company.to_dict(),
        "admin": admin_user.to_dict()
    }


@router.get("/me", response_model=CompanyResponse)
async def get_my_company(
    current_user: PublicUser = Depends(get_company_admin),
    db: Session = Depends(get_db)
):
    """Get current user's company."""
    if not current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No company associated with user"
        )
    
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    
    return CompanyResponse(**company.to_dict())


@router.patch("/me", response_model=CompanyResponse)
async def update_my_company(
    data: CompanyUpdate,
    current_user: PublicUser = Depends(get_company_admin),
    db: Session = Depends(get_db)
):
    """Update current user's company."""
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    
    update_data = data.dict(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(company, field, value)
    
    db.commit()
    db.refresh(company)
    
    logger.info(f"Company updated: {company.name}")
    
    return CompanyResponse(**company.to_dict())


@router.get("/me/branding", response_model=BrandingResponse)
async def get_company_branding(
    current_user: PublicUser = Depends(get_company_admin),
    db: Session = Depends(get_db)
):
    """Get company branding settings."""
    branding = db.query(CompanyBranding).filter(
        CompanyBranding.company_id == current_user.company_id
    ).first()
    
    if not branding:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branding not found")
    
    return BrandingResponse(**branding.to_dict())


@router.get("/me/storage-policy", response_model=StoragePolicyResponse)
async def get_company_storage_policy(
    current_user: PublicUser = Depends(get_company_admin),
    db: Session = Depends(get_db)
):
    """Get company storage policy."""
    policy = db.query(CompanyStoragePolicy).filter(
        CompanyStoragePolicy.company_id == current_user.company_id
    ).first()
    
    if not policy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Storage policy not found")
    
    return StoragePolicyResponse(**policy.to_dict())


@router.get("/me/subscription")
async def get_company_subscription(
    current_user: PublicUser = Depends(get_company_admin),
    db: Session = Depends(get_db)
):
    """Get company's active subscription."""
    subscription = db.query(Subscription).filter(
        Subscription.company_id == current_user.company_id,
        Subscription.status.in_([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL])
    ).first()
    
    if not subscription:
        return {"subscription": None}
    
    return {"subscription": subscription.to_dict()}


@router.get("/{company_slug}/branding.json")
async def get_public_branding(
    company_slug: str,
    db: Session = Depends(get_db)
):
    """
    Public endpoint to get company branding.
    Used by frontend apps to load tenant branding.
    """
    company = db.query(Company).filter(Company.slug == company_slug).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    
    branding = db.query(CompanyBranding).filter(
        CompanyBranding.company_id == company.id
    ).first()
    
    if not branding:
        # Return default branding
        return {
            "company": company.name,
            "colors": {
                "primary": "#166534",
                "secondary": "#d4af37",
                "accent": "#065f46",
                "background": "#f8fafc",
                "text": "#1e293b"
            },
            "logo": {
                "default": None,
                "light": None,
                "favicon": None
            },
            "typography": {
                "font_family": "Inter",
                "heading_font": "Inter"
            },
            "custom_css": None
        }
    
    return {
        "company": company.name,
        **branding.to_dict()
    }
