from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models import CompanyUser, UserAppPermission, AuditLog, UserRole, AppType
from app.schemas import (
    UserCreate, UserBulkCreate, UserUpdate, UserResponse, UserListResponse,
    AppPermissionBase, AppPermissionUpdate, AppPermissionResponse
)
from app.auth import (
    get_current_user, get_admin_user, get_manager_user,
    hash_password, get_company_id
)


router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[UserRole] = None,
    is_active: Optional[bool] = None,
    current_user: CompanyUser = Depends(get_manager_user),
    db: AsyncSession = Depends(get_db),
):
    """List all users in the company."""
    query = select(CompanyUser).where(CompanyUser.company_id == current_user.company_id)
    
    # Apply filters
    if search:
        query = query.where(
            (CompanyUser.email.ilike(f"%{search}%")) |
            (CompanyUser.first_name.ilike(f"%{search}%")) |
            (CompanyUser.last_name.ilike(f"%{search}%"))
        )
    if role:
        query = query.where(CompanyUser.role == role)
    if is_active is not None:
        query = query.where(CompanyUser.is_active == is_active)
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)
    
    # Apply pagination
    query = query.offset((page - 1) * per_page).limit(per_page)
    query = query.order_by(CompanyUser.created_at.desc())
    
    result = await db.execute(query)
    users = result.scalars().all()
    
    return UserListResponse(
        users=[UserResponse.model_validate(u) for u in users],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    request: Request,
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new user in the company."""
    # Check if email exists
    existing = await db.execute(
        select(CompanyUser).where(CompanyUser.email == user_data.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    # Create user
    new_user = CompanyUser(
        company_id=current_user.company_id,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        phone=user_data.phone,
        role=user_data.role,
        storage_quota_bytes=user_data.storage_quota_bytes,
        is_verified=True,  # Company-created users are auto-verified
        created_by=current_user.id,
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    # Create default app permissions
    for app_type in AppType:
        permission = UserAppPermission(
            user_id=new_user.id,
            app_type=app_type,
            can_access=True,
            can_upload=True,
            can_download=True,
            can_share=True,
            can_delete=user_data.role in [UserRole.ADMIN, UserRole.MANAGER],
        )
        db.add(permission)
    
    # Audit log
    audit_log = AuditLog(
        company_id=current_user.company_id,
        user_id=current_user.id,
        action="user_created",
        resource_type="user",
        resource_id=str(new_user.id),
        details={"email": new_user.email, "role": new_user.role.value},
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit_log)
    
    await db.commit()
    
    return UserResponse.model_validate(new_user)


@router.post("/bulk", response_model=List[UserResponse], status_code=status.HTTP_201_CREATED)
async def bulk_create_users(
    bulk_data: UserBulkCreate,
    request: Request,
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Bulk create users in the company."""
    created_users = []
    errors = []
    
    for idx, user_data in enumerate(bulk_data.users):
        # Check if email exists
        existing = await db.execute(
            select(CompanyUser).where(CompanyUser.email == user_data.email)
        )
        if existing.scalar_one_or_none():
            errors.append({"index": idx, "email": user_data.email, "error": "Email already exists"})
            continue
        
        # Create user
        new_user = CompanyUser(
            company_id=current_user.company_id,
            email=user_data.email,
            password_hash=hash_password(user_data.password),
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            phone=user_data.phone,
            role=user_data.role,
            storage_quota_bytes=user_data.storage_quota_bytes,
            is_verified=True,
            created_by=current_user.id,
        )
        
        db.add(new_user)
        await db.flush()  # Get ID without committing
        
        # Create default app permissions
        for app_type in AppType:
            permission = UserAppPermission(
                user_id=new_user.id,
                app_type=app_type,
                can_access=True,
                can_upload=True,
                can_download=True,
                can_share=True,
                can_delete=user_data.role in [UserRole.ADMIN, UserRole.MANAGER],
            )
            db.add(permission)
        
        created_users.append(new_user)
    
    # Audit log
    audit_log = AuditLog(
        company_id=current_user.company_id,
        user_id=current_user.id,
        action="bulk_users_created",
        resource_type="users",
        details={
            "created_count": len(created_users),
            "error_count": len(errors),
            "errors": errors,
        },
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit_log)
    
    await db.commit()
    
    return [UserResponse.model_validate(u) for u in created_users]


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: CompanyUser = Depends(get_manager_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific user."""
    result = await db.execute(
        select(CompanyUser).where(
            CompanyUser.id == user_id,
            CompanyUser.company_id == current_user.company_id,
        )
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse.model_validate(user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    request: Request,
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a user."""
    result = await db.execute(
        select(CompanyUser).where(
            CompanyUser.id == user_id,
            CompanyUser.company_id == current_user.company_id,
        )
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update fields
    update_data = user_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    # Audit log
    audit_log = AuditLog(
        company_id=current_user.company_id,
        user_id=current_user.id,
        action="user_updated",
        resource_type="user",
        resource_id=str(user_id),
        details=update_data,
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit_log)
    
    await db.commit()
    await db.refresh(user)
    
    return UserResponse.model_validate(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    request: Request,
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a user."""
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete yourself",
        )
    
    result = await db.execute(
        select(CompanyUser).where(
            CompanyUser.id == user_id,
            CompanyUser.company_id == current_user.company_id,
        )
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Audit log
    audit_log = AuditLog(
        company_id=current_user.company_id,
        user_id=current_user.id,
        action="user_deleted",
        resource_type="user",
        resource_id=str(user_id),
        details={"email": user.email},
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit_log)
    
    await db.delete(user)
    await db.commit()


@router.get("/{user_id}/permissions", response_model=List[AppPermissionResponse])
async def get_user_permissions(
    user_id: int,
    current_user: CompanyUser = Depends(get_manager_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's app permissions."""
    # Verify user exists in company
    result = await db.execute(
        select(CompanyUser).where(
            CompanyUser.id == user_id,
            CompanyUser.company_id == current_user.company_id,
        )
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    result = await db.execute(
        select(UserAppPermission).where(UserAppPermission.user_id == user_id)
    )
    permissions = result.scalars().all()
    
    return [AppPermissionResponse.model_validate(p) for p in permissions]


@router.put("/{user_id}/permissions/{app_type}", response_model=AppPermissionResponse)
async def update_user_permission(
    user_id: int,
    app_type: AppType,
    permission_data: AppPermissionUpdate,
    request: Request,
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Update user's permission for a specific app."""
    # Verify user exists in company
    result = await db.execute(
        select(CompanyUser).where(
            CompanyUser.id == user_id,
            CompanyUser.company_id == current_user.company_id,
        )
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get or create permission
    result = await db.execute(
        select(UserAppPermission).where(
            UserAppPermission.user_id == user_id,
            UserAppPermission.app_type == app_type,
        )
    )
    permission = result.scalar_one_or_none()
    
    if not permission:
        permission = UserAppPermission(
            user_id=user_id,
            app_type=app_type,
        )
        db.add(permission)
    
    # Update fields
    update_data = permission_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(permission, field, value)
    
    # Audit log
    audit_log = AuditLog(
        company_id=current_user.company_id,
        user_id=current_user.id,
        action="permission_updated",
        resource_type="permission",
        resource_id=f"{user_id}:{app_type.value}",
        details=update_data,
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit_log)
    
    await db.commit()
    await db.refresh(permission)
    
    return AppPermissionResponse.model_validate(permission)
