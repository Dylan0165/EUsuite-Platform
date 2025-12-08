from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import (
    RegistrationCreate,
    RegistrationResponse,
    RegistrationStatusResponse,
    ContactCreate,
    ContactResponse,
    SlugCheckRequest,
    SlugCheckResponse,
    EmailCheckRequest,
    EmailCheckResponse,
)
from ..services import (
    check_slug_available,
    check_email_available,
    suggest_slug,
    create_registration,
    get_registration_by_token,
    get_registration_by_email,
    verify_email,
    provision_tenant,
    create_contact_message,
)
from ..email import send_verification_email, send_welcome_email
from ..config import get_settings

router = APIRouter(prefix="/api/v1/public", tags=["public"])
settings = get_settings()


@router.post("/register", response_model=RegistrationResponse)
async def register_company(
    data: RegistrationCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Register a new company and admin account.
    This starts the registration process.
    """
    # Check slug availability
    if not check_slug_available(db, data.company.slug):
        suggested = suggest_slug(db, data.company.slug)
        raise HTTPException(
            status_code=400,
            detail=f"Deze bedrijfsnaam is al in gebruik. Probeer: {suggested}"
        )
    
    # Check email availability
    if not check_email_available(db, data.admin.email):
        raise HTTPException(
            status_code=400,
            detail="Dit e-mailadres is al geregistreerd"
        )
    
    # Create registration
    registration = create_registration(db, data)
    
    # Send verification email in background
    background_tasks.add_task(
        send_verification_email,
        to=registration.admin_email,
        first_name=registration.admin_first_name,
        company_name=registration.company_name,
        verification_token=registration.verification_token,
    )
    
    return registration


@router.get("/verify")
async def verify_registration(
    token: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Verify email address using the token from the verification email.
    After verification, automatically provisions the tenant.
    """
    registration = get_registration_by_token(db, token)
    
    if not registration:
        raise HTTPException(status_code=404, detail="Ongeldige verificatie link")
    
    if registration.email_verified:
        return {
            "message": "E-mail is al geverifieerd",
            "status": registration.status.value,
            "redirect": f"{settings.company_portal_url}/login?company={registration.company_slug}"
        }
    
    # Verify email
    registration = verify_email(db, registration)
    
    # Provision tenant
    success = await provision_tenant(db, registration)
    
    if success:
        # Send welcome email
        background_tasks.add_task(
            send_welcome_email,
            to=registration.admin_email,
            first_name=registration.admin_first_name,
            company_name=registration.company_name,
            company_slug=registration.company_slug,
        )
        
        return {
            "message": "Account succesvol aangemaakt!",
            "status": "completed",
            "redirect": f"{settings.company_portal_url}/login?company={registration.company_slug}"
        }
    else:
        return {
            "message": "Er ging iets mis bij het aanmaken. Neem contact op met support.",
            "status": "failed",
            "error": registration.status_message
        }


@router.get("/registration/status", response_model=RegistrationStatusResponse)
async def get_registration_status(
    email: str,
    db: Session = Depends(get_db),
):
    """Check the status of a registration by email"""
    registration = get_registration_by_email(db, email)
    
    if not registration:
        raise HTTPException(status_code=404, detail="Registratie niet gevonden")
    
    portal_url = None
    if registration.status.value == "completed":
        portal_url = f"{settings.company_portal_url}/login?company={registration.company_slug}"
    
    return RegistrationStatusResponse(
        status=registration.status,
        status_message=registration.status_message,
        email_verified=registration.email_verified,
        company_slug=registration.company_slug,
        portal_url=portal_url,
    )


@router.post("/check-slug", response_model=SlugCheckResponse)
async def check_slug(
    data: SlugCheckRequest,
    db: Session = Depends(get_db),
):
    """Check if a company slug is available"""
    available = check_slug_available(db, data.slug)
    suggested = None if available else suggest_slug(db, data.slug)
    
    return SlugCheckResponse(available=available, suggested=suggested)


@router.post("/check-email", response_model=EmailCheckResponse)
async def check_email(
    data: EmailCheckRequest,
    db: Session = Depends(get_db),
):
    """Check if an email is available"""
    available = check_email_available(db, data.email)
    return EmailCheckResponse(available=available)


@router.post("/contact", response_model=ContactResponse)
async def submit_contact(
    data: ContactCreate,
    db: Session = Depends(get_db),
):
    """Submit a contact form message"""
    create_contact_message(db, data)
    
    return ContactResponse(
        success=True,
        message="Bedankt voor je bericht! We nemen zo snel mogelijk contact met je op."
    )


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "eusuite-website-backend"}
