from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List
from ..database import get_db
from ..models import AdminUser, AdminRole
from ..schemas import (
    AdminUserCreate, AdminUserUpdate, AdminUserResponse, PaginatedResponse
)
from ..auth import hash_password, get_current_admin, require_superadmin, require_admin

router = APIRouter(prefix="/admins", tags=["Admin Users"])


@router.get("", response_model=PaginatedResponse)
async def list_admin_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    role: Optional[AdminRole] = None,
    search: Optional[str] = None,
    current_admin: AdminUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all admin users with pagination"""
    query = select(AdminUser)
    count_query = select(func.count(AdminUser.id))
    
    if role:
        query = query.where(AdminUser.role == role)
        count_query = count_query.where(AdminUser.role == role)
    
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            (AdminUser.email.ilike(search_filter)) |
            (AdminUser.first_name.ilike(search_filter)) |
            (AdminUser.last_name.ilike(search_filter))
        )
        count_query = count_query.where(
            (AdminUser.email.ilike(search_filter)) |
            (AdminUser.first_name.ilike(search_filter)) |
            (AdminUser.last_name.ilike(search_filter))
        )
    
    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Get paginated results
    offset = (page - 1) * page_size
    query = query.order_by(AdminUser.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    admins = result.scalars().all()
    
    return PaginatedResponse(
        items=[AdminUserResponse.model_validate(a) for a in admins],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.post("", response_model=AdminUserResponse, status_code=status.HTTP_201_CREATED)
async def create_admin_user(
    admin_data: AdminUserCreate,
    current_admin: AdminUser = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new admin user (superadmin only)"""
    # Check if email already exists
    result = await db.execute(
        select(AdminUser).where(AdminUser.email == admin_data.email)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    admin = AdminUser(
        email=admin_data.email,
        hashed_password=hash_password(admin_data.password),
        first_name=admin_data.first_name,
        last_name=admin_data.last_name,
        role=admin_data.role,
    )
    
    db.add(admin)
    await db.commit()
    await db.refresh(admin)
    
    return admin


@router.get("/{admin_id}", response_model=AdminUserResponse)
async def get_admin_user(
    admin_id: int,
    current_admin: AdminUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get admin user by ID"""
    result = await db.execute(
        select(AdminUser).where(AdminUser.id == admin_id)
    )
    admin = result.scalar_one_or_none()
    
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin user not found",
        )
    
    return admin


@router.patch("/{admin_id}", response_model=AdminUserResponse)
async def update_admin_user(
    admin_id: int,
    update_data: AdminUserUpdate,
    current_admin: AdminUser = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    """Update admin user (superadmin only)"""
    result = await db.execute(
        select(AdminUser).where(AdminUser.id == admin_id)
    )
    admin = result.scalar_one_or_none()
    
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin user not found",
        )
    
    # Prevent modifying own role
    if admin.id == current_admin.id and update_data.role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify your own role",
        )
    
    if update_data.email:
        # Check if email is taken by another user
        result = await db.execute(
            select(AdminUser).where(
                (AdminUser.email == update_data.email) &
                (AdminUser.id != admin_id)
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
        admin.email = update_data.email
    
    if update_data.first_name is not None:
        admin.first_name = update_data.first_name
    if update_data.last_name is not None:
        admin.last_name = update_data.last_name
    if update_data.role is not None:
        admin.role = update_data.role
    if update_data.is_active is not None:
        admin.is_active = update_data.is_active
    if update_data.password:
        admin.hashed_password = hash_password(update_data.password)
    
    await db.commit()
    await db.refresh(admin)
    
    return admin


@router.delete("/{admin_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_admin_user(
    admin_id: int,
    current_admin: AdminUser = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    """Delete admin user (superadmin only)"""
    if admin_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account",
        )
    
    result = await db.execute(
        select(AdminUser).where(AdminUser.id == admin_id)
    )
    admin = result.scalar_one_or_none()
    
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin user not found",
        )
    
    await db.delete(admin)
    await db.commit()
