from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import CompanyUser, CompanySettings, AuditLog
from app.schemas import CompanySettingsUpdate, CompanySettingsResponse
from app.auth import get_admin_user


router = APIRouter(prefix="/settings", tags=["Company Settings"])


@router.get("/", response_model=CompanySettingsResponse)
async def get_settings(
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get company settings."""
    result = await db.execute(
        select(CompanySettings).where(
            CompanySettings.company_id == current_user.company_id
        )
    )
    settings = result.scalar_one_or_none()
    
    if not settings:
        # Create default settings
        settings = CompanySettings(company_id=current_user.company_id)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    
    return CompanySettingsResponse.model_validate(settings)


@router.put("/", response_model=CompanySettingsResponse)
async def update_settings(
    settings_data: CompanySettingsUpdate,
    request: Request,
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Update company settings."""
    result = await db.execute(
        select(CompanySettings).where(
            CompanySettings.company_id == current_user.company_id
        )
    )
    settings = result.scalar_one_or_none()
    
    if not settings:
        settings = CompanySettings(company_id=current_user.company_id)
        db.add(settings)
    
    update_data = settings_data.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(settings, field, value)
    
    # Audit log
    audit_log = AuditLog(
        company_id=current_user.company_id,
        user_id=current_user.id,
        action="settings_updated",
        resource_type="company_settings",
        resource_id=str(current_user.company_id),
        details=update_data,
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit_log)
    
    await db.commit()
    await db.refresh(settings)
    
    return CompanySettingsResponse.model_validate(settings)


@router.get("/security")
async def get_security_settings(
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get security-related settings."""
    result = await db.execute(
        select(CompanySettings).where(
            CompanySettings.company_id == current_user.company_id
        )
    )
    settings = result.scalar_one_or_none()
    
    if not settings:
        settings = CompanySettings(company_id=current_user.company_id)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    
    return {
        "mfa_required": settings.mfa_required,
        "session_timeout_minutes": settings.session_timeout_minutes,
        "password_min_length": settings.password_min_length,
        "password_require_uppercase": settings.password_require_uppercase,
        "password_require_lowercase": settings.password_require_lowercase,
        "password_require_numbers": settings.password_require_numbers,
        "password_require_symbols": settings.password_require_symbols,
        "max_login_attempts": settings.max_login_attempts,
        "lockout_duration_minutes": settings.lockout_duration_minutes,
        "allowed_ip_ranges": settings.allowed_ip_ranges,
    }


@router.put("/security")
async def update_security_settings(
    security_data: dict,
    request: Request,
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Update security settings."""
    result = await db.execute(
        select(CompanySettings).where(
            CompanySettings.company_id == current_user.company_id
        )
    )
    settings = result.scalar_one_or_none()
    
    if not settings:
        settings = CompanySettings(company_id=current_user.company_id)
        db.add(settings)
    
    allowed_fields = {
        "mfa_required", "session_timeout_minutes", "password_min_length",
        "password_require_uppercase", "password_require_lowercase",
        "password_require_numbers", "password_require_symbols",
        "max_login_attempts", "lockout_duration_minutes", "allowed_ip_ranges",
    }
    
    update_data = {k: v for k, v in security_data.items() if k in allowed_fields}
    
    for field, value in update_data.items():
        setattr(settings, field, value)
    
    # Audit log
    audit_log = AuditLog(
        company_id=current_user.company_id,
        user_id=current_user.id,
        action="security_settings_updated",
        resource_type="company_settings",
        resource_id=str(current_user.company_id),
        details=update_data,
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit_log)
    
    await db.commit()
    
    return {"message": "Security settings updated"}


@router.get("/notifications")
async def get_notification_settings(
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get notification settings."""
    result = await db.execute(
        select(CompanySettings).where(
            CompanySettings.company_id == current_user.company_id
        )
    )
    settings = result.scalar_one_or_none()
    
    if not settings:
        settings = CompanySettings(company_id=current_user.company_id)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    
    return {
        "email_notifications_enabled": settings.email_notifications_enabled,
        "webhook_url": settings.webhook_url,
        "notify_on_user_created": settings.notify_on_user_created,
        "notify_on_storage_warning": settings.notify_on_storage_warning,
        "notify_on_deployment_status": settings.notify_on_deployment_status,
        "storage_warning_threshold": settings.storage_warning_threshold,
    }


@router.put("/notifications")
async def update_notification_settings(
    notification_data: dict,
    request: Request,
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Update notification settings."""
    result = await db.execute(
        select(CompanySettings).where(
            CompanySettings.company_id == current_user.company_id
        )
    )
    settings = result.scalar_one_or_none()
    
    if not settings:
        settings = CompanySettings(company_id=current_user.company_id)
        db.add(settings)
    
    allowed_fields = {
        "email_notifications_enabled", "webhook_url",
        "notify_on_user_created", "notify_on_storage_warning",
        "notify_on_deployment_status", "storage_warning_threshold",
    }
    
    update_data = {k: v for k, v in notification_data.items() if k in allowed_fields}
    
    for field, value in update_data.items():
        setattr(settings, field, value)
    
    # Audit log
    audit_log = AuditLog(
        company_id=current_user.company_id,
        user_id=current_user.id,
        action="notification_settings_updated",
        resource_type="company_settings",
        resource_id=str(current_user.company_id),
        details=update_data,
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit_log)
    
    await db.commit()
    
    return {"message": "Notification settings updated"}


@router.get("/features")
async def get_feature_flags(
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get feature flags for the company."""
    result = await db.execute(
        select(CompanySettings).where(
            CompanySettings.company_id == current_user.company_id
        )
    )
    settings = result.scalar_one_or_none()
    
    if not settings:
        settings = CompanySettings(company_id=current_user.company_id)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    
    return {
        "features": settings.feature_flags or {},
        "enabled_apps": settings.enabled_apps or ["eucloud", "eumail", "eugroups", "eutype"],
    }


@router.put("/features")
async def update_feature_flags(
    feature_data: dict,
    request: Request,
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Update feature flags."""
    result = await db.execute(
        select(CompanySettings).where(
            CompanySettings.company_id == current_user.company_id
        )
    )
    settings = result.scalar_one_or_none()
    
    if not settings:
        settings = CompanySettings(company_id=current_user.company_id)
        db.add(settings)
    
    if "features" in feature_data:
        settings.feature_flags = feature_data["features"]
    
    if "enabled_apps" in feature_data:
        settings.enabled_apps = feature_data["enabled_apps"]
    
    # Audit log
    audit_log = AuditLog(
        company_id=current_user.company_id,
        user_id=current_user.id,
        action="feature_flags_updated",
        resource_type="company_settings",
        resource_id=str(current_user.company_id),
        details=feature_data,
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit_log)
    
    await db.commit()
    
    return {"message": "Feature flags updated"}
