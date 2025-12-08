import secrets
import httpx
from datetime import datetime
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from typing import Optional

from .models import Registration, RegistrationStatus, ContactMessage
from .schemas import RegistrationCreate, ContactCreate
from .config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
settings = get_settings()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def generate_verification_token() -> str:
    return secrets.token_urlsafe(32)


# ============ Registration Services ============

def check_slug_available(db: Session, slug: str) -> bool:
    """Check if a company slug is available"""
    existing = db.query(Registration).filter(
        Registration.company_slug == slug,
        Registration.status != RegistrationStatus.FAILED
    ).first()
    return existing is None


def check_email_available(db: Session, email: str) -> bool:
    """Check if an admin email is available"""
    existing = db.query(Registration).filter(
        Registration.admin_email == email,
        Registration.status != RegistrationStatus.FAILED
    ).first()
    return existing is None


def suggest_slug(db: Session, base_slug: str) -> str:
    """Suggest an available slug variant"""
    counter = 1
    suggested = base_slug
    while not check_slug_available(db, suggested):
        suggested = f"{base_slug}-{counter}"
        counter += 1
    return suggested


def create_registration(db: Session, data: RegistrationCreate) -> Registration:
    """Create a new registration"""
    registration = Registration(
        company_name=data.company.name,
        company_slug=data.company.slug,
        industry=data.company.industry,
        employee_count=data.company.employee_count,
        plan=data.company.plan,
        admin_first_name=data.admin.first_name,
        admin_last_name=data.admin.last_name,
        admin_email=data.admin.email,
        admin_password_hash=hash_password(data.admin.password),
        verification_token=generate_verification_token(),
        agree_marketing=data.agree_marketing,
        status=RegistrationStatus.PENDING,
    )
    db.add(registration)
    db.commit()
    db.refresh(registration)
    return registration


def get_registration_by_token(db: Session, token: str) -> Optional[Registration]:
    """Get registration by verification token"""
    return db.query(Registration).filter(
        Registration.verification_token == token
    ).first()


def get_registration_by_email(db: Session, email: str) -> Optional[Registration]:
    """Get registration by admin email"""
    return db.query(Registration).filter(
        Registration.admin_email == email
    ).first()


def verify_email(db: Session, registration: Registration) -> Registration:
    """Mark email as verified"""
    registration.email_verified = True
    registration.verified_at = datetime.utcnow()
    registration.status = RegistrationStatus.EMAIL_VERIFIED
    db.commit()
    db.refresh(registration)
    return registration


async def provision_tenant(db: Session, registration: Registration) -> bool:
    """Provision the tenant in the admin backend"""
    registration.status = RegistrationStatus.PROVISIONING
    db.commit()
    
    try:
        async with httpx.AsyncClient() as client:
            # Create company in admin backend
            response = await client.post(
                f"{settings.admin_backend_url}/api/v1/companies",
                headers={
                    "X-API-Key": settings.admin_api_key,
                    "Content-Type": "application/json"
                },
                json={
                    "name": registration.company_name,
                    "slug": registration.company_slug,
                    "subscription_plan": registration.plan,
                    "owner_email": registration.admin_email,
                    "admin_user": {
                        "email": registration.admin_email,
                        "password": "temp-will-be-reset",  # They'll use their original password
                        "first_name": registration.admin_first_name,
                        "last_name": registration.admin_last_name,
                    }
                },
                timeout=60.0
            )
            
            if response.status_code in (200, 201):
                data = response.json()
                registration.tenant_id = data.get("id")
                registration.status = RegistrationStatus.COMPLETED
                registration.completed_at = datetime.utcnow()
                registration.status_message = "Tenant successfully provisioned"
            else:
                registration.status = RegistrationStatus.FAILED
                registration.status_message = f"Failed to provision: {response.text}"
                
    except Exception as e:
        registration.status = RegistrationStatus.FAILED
        registration.status_message = f"Provisioning error: {str(e)}"
    
    db.commit()
    db.refresh(registration)
    return registration.status == RegistrationStatus.COMPLETED


# ============ Contact Services ============

def create_contact_message(db: Session, data: ContactCreate) -> ContactMessage:
    """Create a new contact message"""
    message = ContactMessage(
        name=data.name,
        email=data.email,
        company=data.company,
        subject=data.subject,
        message=data.message,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message
