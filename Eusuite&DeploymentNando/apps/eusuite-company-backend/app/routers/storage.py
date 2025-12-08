from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import uuid

from app.database import get_db
from app.models import CompanyUser, StoragePolicy, AuditLog, UserRole
from app.schemas import (
    StoragePolicyCreate, StoragePolicyUpdate, StoragePolicyResponse,
    StoragePolicyListResponse
)
from app.auth import get_admin_user


router = APIRouter(prefix="/storage", tags=["Storage Policies"])


@router.get("/policies", response_model=StoragePolicyListResponse)
async def list_storage_policies(
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """List all storage policies for the company."""
    result = await db.execute(
        select(StoragePolicy)
        .where(StoragePolicy.company_id == current_user.company_id)
        .order_by(StoragePolicy.name)
    )
    policies = result.scalars().all()
    
    return StoragePolicyListResponse(
        policies=[StoragePolicyResponse.model_validate(p) for p in policies],
        total=len(policies),
    )


@router.post("/policies", response_model=StoragePolicyResponse, status_code=status.HTTP_201_CREATED)
async def create_storage_policy(
    policy_data: StoragePolicyCreate,
    request: Request,
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new storage policy."""
    # Check for duplicate name
    result = await db.execute(
        select(StoragePolicy).where(
            StoragePolicy.company_id == current_user.company_id,
            StoragePolicy.name == policy_data.name,
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Storage policy with this name already exists",
        )
    
    policy = StoragePolicy(
        company_id=current_user.company_id,
        name=policy_data.name,
        description=policy_data.description,
        max_file_size_mb=policy_data.max_file_size_mb,
        max_storage_gb=policy_data.max_storage_gb,
        allowed_extensions=policy_data.allowed_extensions,
        retention_days=policy_data.retention_days,
        is_default=policy_data.is_default,
    )
    
    # If this is default, unset other defaults
    if policy_data.is_default:
        result = await db.execute(
            select(StoragePolicy).where(
                StoragePolicy.company_id == current_user.company_id,
                StoragePolicy.is_default == True,
            )
        )
        for existing_policy in result.scalars():
            existing_policy.is_default = False
    
    db.add(policy)
    
    # Audit log
    audit_log = AuditLog(
        company_id=current_user.company_id,
        user_id=current_user.id,
        action="storage_policy_created",
        resource_type="storage_policy",
        resource_id=str(policy.id),
        details={"name": policy_data.name},
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit_log)
    
    await db.commit()
    await db.refresh(policy)
    
    return StoragePolicyResponse.model_validate(policy)


@router.get("/policies/{policy_id}", response_model=StoragePolicyResponse)
async def get_storage_policy(
    policy_id: uuid.UUID,
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific storage policy."""
    result = await db.execute(
        select(StoragePolicy).where(
            StoragePolicy.id == policy_id,
            StoragePolicy.company_id == current_user.company_id,
        )
    )
    policy = result.scalar_one_or_none()
    
    if not policy:
        raise HTTPException(status_code=404, detail="Storage policy not found")
    
    return StoragePolicyResponse.model_validate(policy)


@router.put("/policies/{policy_id}", response_model=StoragePolicyResponse)
async def update_storage_policy(
    policy_id: uuid.UUID,
    policy_data: StoragePolicyUpdate,
    request: Request,
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a storage policy."""
    result = await db.execute(
        select(StoragePolicy).where(
            StoragePolicy.id == policy_id,
            StoragePolicy.company_id == current_user.company_id,
        )
    )
    policy = result.scalar_one_or_none()
    
    if not policy:
        raise HTTPException(status_code=404, detail="Storage policy not found")
    
    update_data = policy_data.model_dump(exclude_unset=True)
    
    # Check for duplicate name
    if "name" in update_data:
        result = await db.execute(
            select(StoragePolicy).where(
                StoragePolicy.company_id == current_user.company_id,
                StoragePolicy.name == update_data["name"],
                StoragePolicy.id != policy_id,
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Storage policy with this name already exists",
            )
    
    # If setting as default, unset other defaults
    if update_data.get("is_default", False):
        result = await db.execute(
            select(StoragePolicy).where(
                StoragePolicy.company_id == current_user.company_id,
                StoragePolicy.is_default == True,
                StoragePolicy.id != policy_id,
            )
        )
        for existing_policy in result.scalars():
            existing_policy.is_default = False
    
    for field, value in update_data.items():
        setattr(policy, field, value)
    
    # Audit log
    audit_log = AuditLog(
        company_id=current_user.company_id,
        user_id=current_user.id,
        action="storage_policy_updated",
        resource_type="storage_policy",
        resource_id=str(policy_id),
        details=update_data,
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit_log)
    
    await db.commit()
    await db.refresh(policy)
    
    return StoragePolicyResponse.model_validate(policy)


@router.delete("/policies/{policy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_storage_policy(
    policy_id: uuid.UUID,
    request: Request,
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a storage policy."""
    result = await db.execute(
        select(StoragePolicy).where(
            StoragePolicy.id == policy_id,
            StoragePolicy.company_id == current_user.company_id,
        )
    )
    policy = result.scalar_one_or_none()
    
    if not policy:
        raise HTTPException(status_code=404, detail="Storage policy not found")
    
    if policy.is_default:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete default storage policy",
        )
    
    # Check if any users are using this policy
    result = await db.execute(
        select(CompanyUser).where(
            CompanyUser.storage_policy_id == policy_id,
        )
    )
    if result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete storage policy assigned to users",
        )
    
    # Audit log
    audit_log = AuditLog(
        company_id=current_user.company_id,
        user_id=current_user.id,
        action="storage_policy_deleted",
        resource_type="storage_policy",
        resource_id=str(policy_id),
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit_log)
    
    await db.delete(policy)
    await db.commit()


@router.post("/policies/{policy_id}/assign")
async def assign_policy_to_users(
    policy_id: uuid.UUID,
    user_ids: List[uuid.UUID],
    request: Request,
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Assign a storage policy to multiple users."""
    result = await db.execute(
        select(StoragePolicy).where(
            StoragePolicy.id == policy_id,
            StoragePolicy.company_id == current_user.company_id,
        )
    )
    policy = result.scalar_one_or_none()
    
    if not policy:
        raise HTTPException(status_code=404, detail="Storage policy not found")
    
    # Update users
    result = await db.execute(
        select(CompanyUser).where(
            CompanyUser.id.in_(user_ids),
            CompanyUser.company_id == current_user.company_id,
        )
    )
    users = result.scalars().all()
    
    updated_count = 0
    for user in users:
        user.storage_policy_id = policy_id
        updated_count += 1
    
    # Audit log
    audit_log = AuditLog(
        company_id=current_user.company_id,
        user_id=current_user.id,
        action="storage_policy_assigned",
        resource_type="storage_policy",
        resource_id=str(policy_id),
        details={"user_ids": [str(uid) for uid in user_ids], "updated_count": updated_count},
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit_log)
    
    await db.commit()
    
    return {"message": f"Policy assigned to {updated_count} users"}


@router.get("/usage")
async def get_storage_usage(
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get storage usage statistics for the company."""
    # In a real implementation, this would query actual storage usage
    # For now, return mock data structure
    return {
        "total_storage_gb": 100,
        "used_storage_gb": 42.5,
        "available_storage_gb": 57.5,
        "usage_percentage": 42.5,
        "by_app": {
            "eucloud": {
                "used_gb": 25.0,
                "file_count": 1234,
            },
            "eumail": {
                "used_gb": 10.5,
                "file_count": 5678,
            },
            "eugroups": {
                "used_gb": 7.0,
                "file_count": 890,
            },
        },
        "by_user_top_10": [],  # Would be populated with actual data
    }


@router.get("/usage/users")
async def get_user_storage_usage(
    limit: int = 10,
    offset: int = 0,
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get storage usage by user."""
    # In a real implementation, this would query actual storage usage per user
    result = await db.execute(
        select(CompanyUser).where(
            CompanyUser.company_id == current_user.company_id,
            CompanyUser.is_active == True,
        )
        .offset(offset)
        .limit(limit)
    )
    users = result.scalars().all()
    
    # Return mock data structure - real implementation would calculate actual usage
    return {
        "users": [
            {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "storage_used_gb": 0,  # Would be calculated
                "storage_limit_gb": user.storage_policy.max_storage_gb if user.storage_policy else 10,
            }
            for user in users
        ],
        "total": len(users),
    }
