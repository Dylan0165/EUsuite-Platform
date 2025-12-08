from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import settings
from app.database import get_db
from app.models import CompanyUser, UserRole


# Password hashing
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# JWT Bearer
security = HTTPBearer()


def hash_password(password: str) -> str:
    """Hash a password using Argon2."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.jwt_access_token_expire_minutes))
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(data: dict) -> str:
    """Create a JWT refresh token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.jwt_refresh_token_expire_days)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> Dict[str, Any]:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


class CurrentUser:
    """Dependency for getting the current authenticated user."""
    
    def __init__(self, required_roles: Optional[list] = None):
        self.required_roles = required_roles or []
    
    async def __call__(
        self,
        request: Request,
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: AsyncSession = Depends(get_db),
    ) -> CompanyUser:
        token = credentials.credentials
        payload = decode_token(token)
        
        # Validate token type
        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )
        
        # Get user
        user_id = payload.get("sub")
        company_id = payload.get("company_id")
        
        if not user_id or not company_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )
        
        # Fetch user from database
        result = await db.execute(
            select(CompanyUser).where(
                CompanyUser.id == int(user_id),
                CompanyUser.company_id == int(company_id),
            )
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is deactivated",
            )
        
        # Check required roles
        if self.required_roles and user.role not in self.required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required roles: {self.required_roles}",
            )
        
        # Store in request state for audit logging
        request.state.user = user
        
        return user


# Role-based dependencies
get_current_user = CurrentUser()
get_admin_user = CurrentUser(required_roles=[UserRole.ADMIN])
get_manager_user = CurrentUser(required_roles=[UserRole.ADMIN, UserRole.MANAGER])


async def get_company_id(user: CompanyUser = Depends(get_current_user)) -> int:
    """Get the company ID from the current user."""
    return user.company_id


def check_same_company(user: CompanyUser, target_company_id: int):
    """Check if the user belongs to the specified company."""
    if user.company_id != target_company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You can only access resources in your own company",
        )
