from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from .models import RegistrationStatus


# ============ Registration Schemas ============

class CompanyRegistration(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    slug: str = Field(..., min_length=2, max_length=100, pattern=r"^[a-z0-9-]+$")
    industry: Optional[str] = None
    employee_count: Optional[str] = None
    plan: str = Field(default="business")


class AdminRegistration(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)


class RegistrationCreate(BaseModel):
    company: CompanyRegistration
    admin: AdminRegistration
    agree_marketing: bool = False


class RegistrationResponse(BaseModel):
    id: int
    company_name: str
    company_slug: str
    admin_email: str
    status: RegistrationStatus
    created_at: datetime
    
    class Config:
        from_attributes = True


class RegistrationStatusResponse(BaseModel):
    status: RegistrationStatus
    status_message: Optional[str] = None
    email_verified: bool
    company_slug: str
    portal_url: Optional[str] = None


# ============ Contact Schemas ============

class ContactCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    company: Optional[str] = Field(None, max_length=255)
    subject: str = Field(..., min_length=1, max_length=100)
    message: str = Field(..., min_length=10, max_length=5000)


class ContactResponse(BaseModel):
    success: bool
    message: str


# ============ Validation Schemas ============

class SlugCheckRequest(BaseModel):
    slug: str = Field(..., min_length=2, max_length=100, pattern=r"^[a-z0-9-]+$")


class SlugCheckResponse(BaseModel):
    available: bool
    suggested: Optional[str] = None


class EmailCheckRequest(BaseModel):
    email: EmailStr


class EmailCheckResponse(BaseModel):
    available: bool
