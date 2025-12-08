"""
EUAdmin Backend - Authentication utilities
Handles admin JWT token creation and validation.
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHash
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from .config import get_settings

settings = get_settings()
ph = PasswordHasher()
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against an Argon2 hash."""
    try:
        ph.verify(hashed_password, plain_password)
        return True
    except (VerifyMismatchError, InvalidHash):
        return False


def get_password_hash(password: str) -> str:
    """Generate an Argon2 password hash."""
    return ph.hash(password)


def create_admin_token(email: str) -> str:
    """Create a JWT token for the admin user."""
    expire = datetime.utcnow() + timedelta(hours=settings.ADMIN_JWT_EXPIRE_HOURS)
    to_encode = {
        "sub": email,
        "exp": expire,
        "type": "admin",
        "iat": datetime.utcnow()
    }
    return jwt.encode(to_encode, settings.ADMIN_JWT_SECRET, algorithm=settings.ADMIN_JWT_ALGORITHM)


def verify_admin_token(token: str) -> Optional[dict]:
    """Verify an admin JWT token and return the payload."""
    try:
        payload = jwt.decode(token, settings.ADMIN_JWT_SECRET, algorithms=[settings.ADMIN_JWT_ALGORITHM])
        if payload.get("type") != "admin":
            return None
        return payload
    except JWTError:
        return None


async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Dependency to get the current authenticated admin user."""
    token = credentials.credentials
    payload = verify_admin_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired admin token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return payload


def authenticate_admin(email: str, password: str) -> Optional[str]:
    """Authenticate admin and return a token if successful."""
    if email != settings.ADMIN_EMAIL:
        return None
    
    # Support both hashed and plain passwords for flexibility
    admin_pass = settings.ADMIN_PASSWORD_HASH
    
    # Check if it's a plain password (for development)
    if not admin_pass.startswith('$argon2'):
        if password != admin_pass:
            return None
    else:
        # It's an Argon2 hash
        if not verify_password(password, admin_pass):
            return None
    
    return create_admin_token(email)
