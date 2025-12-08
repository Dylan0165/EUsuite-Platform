from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, Enum as SQLEnum
from sqlalchemy.sql import func
import enum
from .database import Base


class RegistrationStatus(str, enum.Enum):
    PENDING = "pending"
    EMAIL_VERIFIED = "email_verified"
    PROVISIONING = "provisioning"
    COMPLETED = "completed"
    FAILED = "failed"


class Registration(Base):
    """Pending company registrations"""
    __tablename__ = "registrations"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Company info
    company_name = Column(String(255), nullable=False)
    company_slug = Column(String(100), unique=True, nullable=False, index=True)
    industry = Column(String(100))
    employee_count = Column(String(50))
    plan = Column(String(50), nullable=False, default="business")
    
    # Admin info
    admin_first_name = Column(String(100), nullable=False)
    admin_last_name = Column(String(100), nullable=False)
    admin_email = Column(String(255), unique=True, nullable=False, index=True)
    admin_password_hash = Column(String(255), nullable=False)
    
    # Verification
    verification_token = Column(String(255), unique=True, index=True)
    email_verified = Column(Boolean, default=False)
    
    # Status
    status = Column(SQLEnum(RegistrationStatus), default=RegistrationStatus.PENDING)
    status_message = Column(Text)
    
    # Tenant reference (after provisioning)
    tenant_id = Column(Integer)
    
    # Marketing
    agree_marketing = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    verified_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))


class ContactMessage(Base):
    """Contact form submissions"""
    __tablename__ = "contact_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    company = Column(String(255))
    subject = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    
    # Status
    read = Column(Boolean, default=False)
    responded = Column(Boolean, default=False)
    responded_at = Column(DateTime(timezone=True))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
