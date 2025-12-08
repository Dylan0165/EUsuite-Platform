"""
EUSuite Public Backend - Authentication Routes
User registration, login, verification, password reset
"""
import logging
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import PublicUser, UserType
from ..schemas import (
    UserRegister, UserLogin, TokenResponse, 
    PasswordResetRequest, PasswordResetConfirm, EmailVerification,
    BaseResponse
)
from ..auth import (
    create_access_token, create_refresh_token, 
    verify_token, get_current_user
)
from ..services.email_service import email_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    data: UserRegister,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Register a new particulier (individual) user.
    Business users should use /companies/register instead.
    """
    # Check if email exists
    existing = db.query(PublicUser).filter(PublicUser.email == data.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )
    
    # Create user
    user = PublicUser(
        email=data.email.lower(),
        first_name=data.first_name,
        last_name=data.last_name,
        phone=data.phone,
        user_type=UserType.PARTICULIER,
        is_active=True,
        is_verified=False
    )
    user.set_password(data.password)
    
    # Generate verification token
    user.verification_token = secrets.token_urlsafe(32)
    user.verification_expires = datetime.utcnow() + timedelta(hours=24)
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    logger.info(f"New user registered: {user.email}")
    
    # Send verification email in background
    background_tasks.add_task(
        email_service.send_verification_email,
        user.email,
        user.verification_token,
        user.first_name
    )
    
    # Send welcome email
    background_tasks.add_task(
        email_service.send_welcome_particulier_email,
        user.email,
        user.first_name
    )
    
    # Generate tokens
    access_token = create_access_token(user)
    refresh_token = create_refresh_token(user)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=30 * 60,  # 30 minutes
        user=user.to_dict()
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    data: UserLogin,
    db: Session = Depends(get_db)
):
    """Login with email and password."""
    user = db.query(PublicUser).filter(PublicUser.email == data.email.lower()).first()
    
    if not user or not user.check_password(data.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled"
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    logger.info(f"User logged in: {user.email}")
    
    # Generate tokens
    access_token = create_access_token(user)
    refresh_token = create_refresh_token(user)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=30 * 60,
        user=user.to_dict()
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    refresh_token: str,
    db: Session = Depends(get_db)
):
    """Refresh access token using refresh token."""
    payload = verify_token(refresh_token, "refresh")
    
    user_id = payload.get("sub")
    user = db.query(PublicUser).filter(PublicUser.id == int(user_id)).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled"
        )
    
    # Generate new tokens
    new_access_token = create_access_token(user)
    new_refresh_token = create_refresh_token(user)
    
    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        expires_in=30 * 60,
        user=user.to_dict()
    )


@router.post("/verify-email", response_model=BaseResponse)
async def verify_email(
    data: EmailVerification,
    db: Session = Depends(get_db)
):
    """Verify email address with token."""
    user = db.query(PublicUser).filter(
        PublicUser.verification_token == data.token
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification token"
        )
    
    if user.verification_expires and user.verification_expires < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token expired"
        )
    
    user.is_verified = True
    user.verification_token = None
    user.verification_expires = None
    db.commit()
    
    logger.info(f"Email verified: {user.email}")
    
    return BaseResponse(success=True, message="Email verified successfully")


@router.post("/resend-verification", response_model=BaseResponse)
async def resend_verification(
    background_tasks: BackgroundTasks,
    current_user: PublicUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resend verification email."""
    if current_user.is_verified:
        return BaseResponse(success=True, message="Email already verified")
    
    # Generate new token
    current_user.verification_token = secrets.token_urlsafe(32)
    current_user.verification_expires = datetime.utcnow() + timedelta(hours=24)
    db.commit()
    
    # Send email
    background_tasks.add_task(
        email_service.send_verification_email,
        current_user.email,
        current_user.verification_token,
        current_user.first_name
    )
    
    return BaseResponse(success=True, message="Verification email sent")


@router.post("/forgot-password", response_model=BaseResponse)
async def forgot_password(
    data: PasswordResetRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Request password reset email."""
    user = db.query(PublicUser).filter(PublicUser.email == data.email.lower()).first()
    
    # Always return success to prevent email enumeration
    if not user:
        return BaseResponse(success=True, message="If email exists, reset link sent")
    
    # Generate reset token
    user.reset_token = secrets.token_urlsafe(32)
    user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
    db.commit()
    
    # Send email
    background_tasks.add_task(
        email_service.send_password_reset_email,
        user.email,
        user.reset_token,
        user.first_name
    )
    
    logger.info(f"Password reset requested: {user.email}")
    
    return BaseResponse(success=True, message="If email exists, reset link sent")


@router.post("/reset-password", response_model=BaseResponse)
async def reset_password(
    data: PasswordResetConfirm,
    db: Session = Depends(get_db)
):
    """Reset password with token."""
    user = db.query(PublicUser).filter(
        PublicUser.reset_token == data.token
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token"
        )
    
    if user.reset_token_expires and user.reset_token_expires < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token expired"
        )
    
    # Set new password
    user.set_password(data.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()
    
    logger.info(f"Password reset completed: {user.email}")
    
    return BaseResponse(success=True, message="Password reset successfully")


@router.get("/me")
async def get_me(current_user: PublicUser = Depends(get_current_user)):
    """Get current user info."""
    return current_user.to_dict()


@router.post("/logout", response_model=BaseResponse)
async def logout(current_user: PublicUser = Depends(get_current_user)):
    """Logout (client should discard tokens)."""
    # In a production app, you might want to blacklist the token
    logger.info(f"User logged out: {current_user.email}")
    return BaseResponse(success=True, message="Logged out successfully")
