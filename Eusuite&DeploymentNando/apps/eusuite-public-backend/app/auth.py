"""
EUSuite Public Backend - Authentication Service
JWT tokens, password hashing, and authentication middleware
"""
import logging
from datetime import datetime, timedelta
from typing import Optional, Tuple
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from .config import get_settings
from .database import get_db
from .models import PublicUser, UserType

logger = logging.getLogger(__name__)
settings = get_settings()

# Security scheme
security = HTTPBearer(auto_error=False)


def create_access_token(user: PublicUser, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token."""
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    
    expire = datetime.utcnow() + expires_delta
    
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "user_type": user.user_type.value,
        "tenant_id": user.company_id,
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access"
    }
    
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user: PublicUser) -> str:
    """Create JWT refresh token."""
    expire = datetime.utcnow() + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    
    payload = {
        "sub": str(user.id),
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "refresh"
    }
    
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate JWT token."""
    try:
        payload = jwt.decode(
            token, 
            settings.JWT_SECRET_KEY, 
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError as e:
        logger.warning(f"JWT decode error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )


def verify_token(token: str, token_type: str = "access") -> dict:
    """Verify token type and validity."""
    payload = decode_token(token)
    
    if payload.get("type") != token_type:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token type. Expected {token_type}",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return payload


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> PublicUser:
    """Get current authenticated user from JWT token."""
    
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    token = credentials.credentials
    payload = verify_token(token, "access")
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    user = db.query(PublicUser).filter(PublicUser.id == int(user_id)).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )
    
    return user


async def get_current_active_user(
    current_user: PublicUser = Depends(get_current_user)
) -> PublicUser:
    """Get current active user."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    return current_user


async def get_verified_user(
    current_user: PublicUser = Depends(get_current_user)
) -> PublicUser:
    """Get verified user only."""
    if not current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified"
        )
    return current_user


async def get_company_admin(
    current_user: PublicUser = Depends(get_current_user)
) -> PublicUser:
    """Require company admin role."""
    if current_user.user_type != UserType.COMPANY_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Company admin access required"
        )
    return current_user


async def get_superadmin(
    current_user: PublicUser = Depends(get_current_user)
) -> PublicUser:
    """Require superadmin role."""
    if current_user.user_type != UserType.SUPERADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superadmin access required"
        )
    return current_user


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[PublicUser]:
    """Get user if authenticated, None otherwise."""
    if not credentials:
        return None
    
    try:
        token = credentials.credentials
        payload = verify_token(token, "access")
        user_id = payload.get("sub")
        if user_id:
            return db.query(PublicUser).filter(PublicUser.id == int(user_id)).first()
    except HTTPException:
        pass
    
    return None


class RoleChecker:
    """Dependency class to check for specific roles."""
    
    def __init__(self, allowed_roles: list):
        self.allowed_roles = allowed_roles
    
    async def __call__(
        self, 
        current_user: PublicUser = Depends(get_current_user)
    ) -> PublicUser:
        if current_user.user_type.value not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role {current_user.user_type.value} not allowed"
            )
        return current_user


# Pre-built role checkers
require_admin = RoleChecker([UserType.SUPERADMIN.value, UserType.COMPANY_ADMIN.value])
require_superadmin = RoleChecker([UserType.SUPERADMIN.value])
