from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from ..database import get_db
from ..models import AdminUser, AuditLog
from ..schemas import (
    LoginRequest, Token, AdminUserResponse, AdminUserCreate, AdminUserUpdate
)
from ..auth import (
    verify_password, hash_password, create_access_token, create_refresh_token,
    decode_token, get_current_admin, require_superadmin, require_admin
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=Token)
async def login(
    request: Request,
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate admin user and return tokens"""
    result = await db.execute(
        select(AdminUser).where(AdminUser.email == login_data.email)
    )
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(login_data.password, user.hashed_password):
        # Log failed attempt
        audit_log = AuditLog(
            action="login_failed",
            resource_type="auth",
            details={"email": login_data.email},
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            status="failed",
        )
        db.add(audit_log)
        await db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    
    # Create tokens
    token_data = {"sub": str(user.id), "role": user.role.value}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    
    # Log successful login
    audit_log = AuditLog(
        admin_user_id=user.id,
        action="login",
        resource_type="auth",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        status="success",
    )
    db.add(audit_log)
    await db.commit()
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_token: str,
    db: AsyncSession = Depends(get_db),
):
    """Refresh access token using refresh token"""
    payload = decode_token(refresh_token)
    
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )
    
    user_id = payload.get("sub")
    result = await db.execute(
        select(AdminUser).where(AdminUser.id == int(user_id))
    )
    user = result.scalar_one_or_none()
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or disabled",
        )
    
    token_data = {"sub": str(user.id), "role": user.role.value}
    new_access_token = create_access_token(token_data)
    new_refresh_token = create_refresh_token(token_data)
    
    return Token(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
    )


@router.get("/me", response_model=AdminUserResponse)
async def get_current_user(
    current_admin: AdminUser = Depends(get_current_admin),
):
    """Get current authenticated admin user"""
    return current_admin


@router.patch("/me", response_model=AdminUserResponse)
async def update_current_user(
    update_data: AdminUserUpdate,
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update current admin user profile"""
    if update_data.email:
        current_admin.email = update_data.email
    if update_data.first_name:
        current_admin.first_name = update_data.first_name
    if update_data.last_name:
        current_admin.last_name = update_data.last_name
    if update_data.password:
        current_admin.hashed_password = hash_password(update_data.password)
    
    await db.commit()
    await db.refresh(current_admin)
    return current_admin


@router.post("/logout")
async def logout(
    request: Request,
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Logout current admin user"""
    # Log logout
    audit_log = AuditLog(
        admin_user_id=current_admin.id,
        action="logout",
        resource_type="auth",
        ip_address=request.client.host if request.client else None,
        status="success",
    )
    db.add(audit_log)
    await db.commit()
    
    return {"message": "Logged out successfully"}
