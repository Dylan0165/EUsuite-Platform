from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
from ..database import get_db
from ..models import SystemSetting, AdminUser
from ..schemas import SystemSettingBase, SystemSettingUpdate, SystemSettingResponse
from ..auth import get_current_admin, require_superadmin

router = APIRouter(prefix="/settings", tags=["System Settings"])


@router.get("", response_model=List[SystemSettingResponse])
async def list_settings(
    is_public: Optional[bool] = None,
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all system settings"""
    query = select(SystemSetting)
    
    if is_public is not None:
        query = query.where(SystemSetting.is_public == is_public)
    
    result = await db.execute(query.order_by(SystemSetting.key))
    settings = result.scalars().all()
    
    return settings


@router.post("", response_model=SystemSettingResponse, status_code=status.HTTP_201_CREATED)
async def create_setting(
    setting_data: SystemSettingBase,
    current_admin: AdminUser = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new system setting (superadmin only)"""
    # Check if key already exists
    result = await db.execute(
        select(SystemSetting).where(SystemSetting.key == setting_data.key)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Setting key already exists",
        )
    
    setting = SystemSetting(
        key=setting_data.key,
        value=setting_data.value,
        value_type=setting_data.value_type,
        description=setting_data.description,
        is_public=setting_data.is_public,
    )
    
    db.add(setting)
    await db.commit()
    await db.refresh(setting)
    
    return setting


@router.get("/{key}", response_model=SystemSettingResponse)
async def get_setting(
    key: str,
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get a system setting by key"""
    result = await db.execute(
        select(SystemSetting).where(SystemSetting.key == key)
    )
    setting = result.scalar_one_or_none()
    
    if not setting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Setting not found",
        )
    
    return setting


@router.patch("/{key}", response_model=SystemSettingResponse)
async def update_setting(
    key: str,
    update_data: SystemSettingUpdate,
    current_admin: AdminUser = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    """Update a system setting (superadmin only)"""
    result = await db.execute(
        select(SystemSetting).where(SystemSetting.key == key)
    )
    setting = result.scalar_one_or_none()
    
    if not setting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Setting not found",
        )
    
    setting.value = update_data.value
    if update_data.description is not None:
        setting.description = update_data.description
    
    await db.commit()
    await db.refresh(setting)
    
    return setting


@router.delete("/{key}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_setting(
    key: str,
    current_admin: AdminUser = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a system setting (superadmin only)"""
    result = await db.execute(
        select(SystemSetting).where(SystemSetting.key == key)
    )
    setting = result.scalar_one_or_none()
    
    if not setting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Setting not found",
        )
    
    await db.delete(setting)
    await db.commit()


# Public settings endpoint (no auth required)
public_router = APIRouter(prefix="/public/settings", tags=["Public Settings"])


@public_router.get("")
async def get_public_settings(
    db: AsyncSession = Depends(get_db),
):
    """Get public system settings (no authentication required)"""
    result = await db.execute(
        select(SystemSetting).where(SystemSetting.is_public == True)
    )
    settings = result.scalars().all()
    
    return {setting.key: setting.value for setting in settings}
