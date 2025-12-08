"""
EUAdmin Backend - Company Users API Routes
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..tenant_database import get_tenant_db
from ..services.user_manager import UserManager
from ..models import UserRole
from ..schemas_tenant import (
    CompanyUserCreate, CompanyUserUpdate,
    CompanyUserResponse, CompanyUserListResponse, UserCreatedResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/companies/{company_id}/users", tags=["Company Users"])


def get_user_manager(db: Session = Depends(get_tenant_db)) -> UserManager:
    return UserManager(db)


@router.post("", response_model=UserCreatedResponse, status_code=201)
async def create_user(
    company_id: int,
    data: CompanyUserCreate,
    manager: UserManager = Depends(get_user_manager),
):
    """
    Create a new user for a company.
    Email and password are auto-generated if not provided.
    """
    try:
        user, generated_email, generated_password = manager.create_user(
            company_id=company_id,
            first_name=data.first_name,
            last_name=data.last_name,
            email=data.email,
            password=data.password,
            role=UserRole(data.role) if data.role else UserRole.USER,
            department=data.department,
            job_title=data.job_title,
            storage_quota=data.storage_quota,
        )
        
        return UserCreatedResponse(
            user=CompanyUserResponse(
                id=user.id,
                company_id=user.company_id,
                first_name=user.first_name,
                last_name=user.last_name,
                email=user.email,
                role=user.role.value,
                is_active=user.is_active,
                is_verified=user.is_verified,
                department=user.department,
                job_title=user.job_title,
                phone=user.phone,
                storage_quota=user.storage_quota,
                storage_used=user.storage_used,
                last_login=user.last_login,
                created_at=user.created_at,
            ),
            generated_email=generated_email,
            generated_password=generated_password,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=CompanyUserListResponse)
async def list_users(
    company_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    manager: UserManager = Depends(get_user_manager),
):
    """List users for a company with pagination and filters."""
    role_enum = UserRole(role) if role else None
    
    users, total = manager.list_users(
        company_id=company_id,
        page=page,
        page_size=page_size,
        search=search,
        role=role_enum,
        is_active=is_active,
    )
    
    return CompanyUserListResponse(
        users=[
            CompanyUserResponse(
                id=u.id,
                company_id=u.company_id,
                first_name=u.first_name,
                last_name=u.last_name,
                email=u.email,
                role=u.role.value,
                is_active=u.is_active,
                is_verified=u.is_verified,
                department=u.department,
                job_title=u.job_title,
                phone=u.phone,
                storage_quota=u.storage_quota,
                storage_used=u.storage_used,
                last_login=u.last_login,
                created_at=u.created_at,
            )
            for u in users
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{user_id}", response_model=CompanyUserResponse)
async def get_user(
    company_id: int,
    user_id: int,
    manager: UserManager = Depends(get_user_manager),
):
    """Get user by ID."""
    user = manager.get_user(user_id)
    if not user or user.company_id != company_id:
        raise HTTPException(status_code=404, detail="User not found")
    
    return CompanyUserResponse(
        id=user.id,
        company_id=user.company_id,
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        role=user.role.value,
        is_active=user.is_active,
        is_verified=user.is_verified,
        department=user.department,
        job_title=user.job_title,
        phone=user.phone,
        storage_quota=user.storage_quota,
        storage_used=user.storage_used,
        last_login=user.last_login,
        created_at=user.created_at,
    )


@router.patch("/{user_id}", response_model=CompanyUserResponse)
async def update_user(
    company_id: int,
    user_id: int,
    data: CompanyUserUpdate,
    manager: UserManager = Depends(get_user_manager),
):
    """Update user details."""
    user = manager.get_user(user_id)
    if not user or user.company_id != company_id:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = data.dict(exclude_unset=True)
    if 'role' in update_data and update_data['role']:
        update_data['role'] = UserRole(update_data['role'])
    
    user = manager.update_user(user_id, **update_data)
    
    return CompanyUserResponse(
        id=user.id,
        company_id=user.company_id,
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        role=user.role.value,
        is_active=user.is_active,
        is_verified=user.is_verified,
        department=user.department,
        job_title=user.job_title,
        phone=user.phone,
        storage_quota=user.storage_quota,
        storage_used=user.storage_used,
        last_login=user.last_login,
        created_at=user.created_at,
    )


@router.post("/{user_id}/reset-password", response_model=dict)
async def reset_password(
    company_id: int,
    user_id: int,
    manager: UserManager = Depends(get_user_manager),
):
    """Reset user password and return new password."""
    user = manager.get_user(user_id)
    if not user or user.company_id != company_id:
        raise HTTPException(status_code=404, detail="User not found")
    
    user, new_password = manager.reset_password(user_id)
    
    return {
        "user_id": user.id,
        "email": user.email,
        "new_password": new_password,
        "message": "Password has been reset",
    }


@router.delete("/{user_id}", status_code=204)
async def delete_user(
    company_id: int,
    user_id: int,
    manager: UserManager = Depends(get_user_manager),
):
    """Delete a user."""
    user = manager.get_user(user_id)
    if not user or user.company_id != company_id:
        raise HTTPException(status_code=404, detail="User not found")
    
    success = manager.delete_user(user_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete user")
