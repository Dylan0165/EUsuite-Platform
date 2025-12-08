from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from app.database import get_db
from app.models import CompanyUser, BrandingConfig, AuditLog
from app.schemas import BrandingUpdate, BrandingResponse
from app.auth import get_admin_user
from app.services import branding_service


router = APIRouter(prefix="/branding", tags=["Branding"])


@router.get("/", response_model=BrandingResponse)
async def get_branding(
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the company's branding configuration."""
    result = await db.execute(
        select(BrandingConfig).where(BrandingConfig.company_id == current_user.company_id)
    )
    branding = result.scalar_one_or_none()
    
    if not branding:
        # Create default branding config
        branding = BrandingConfig(company_id=current_user.company_id)
        db.add(branding)
        await db.commit()
        await db.refresh(branding)
    
    return BrandingResponse.model_validate(branding)


@router.put("/", response_model=BrandingResponse)
async def update_branding(
    branding_data: BrandingUpdate,
    request: Request,
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the company's branding configuration."""
    result = await db.execute(
        select(BrandingConfig).where(BrandingConfig.company_id == current_user.company_id)
    )
    branding = result.scalar_one_or_none()
    
    if not branding:
        branding = BrandingConfig(company_id=current_user.company_id)
        db.add(branding)
    
    # Update fields
    update_data = branding_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(branding, field, value)
    
    # Audit log
    audit_log = AuditLog(
        company_id=current_user.company_id,
        user_id=current_user.id,
        action="branding_updated",
        resource_type="branding",
        details=update_data,
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit_log)
    
    await db.commit()
    await db.refresh(branding)
    
    return BrandingResponse.model_validate(branding)


@router.post("/logo")
async def upload_logo(
    file: UploadFile = File(...),
    is_dark: bool = False,
    request: Request = None,
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a company logo."""
    # Validate file type
    allowed_types = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed types: {allowed_types}",
        )
    
    # Validate file size (max 2MB)
    content = await file.read()
    if len(content) > 2 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Maximum size is 2MB.",
        )
    
    # Save logo
    url = await branding_service.save_logo(
        company_id=current_user.company_id,
        file_content=content,
        filename=file.filename,
        is_dark=is_dark,
    )
    
    # Update branding config
    result = await db.execute(
        select(BrandingConfig).where(BrandingConfig.company_id == current_user.company_id)
    )
    branding = result.scalar_one_or_none()
    
    if not branding:
        branding = BrandingConfig(company_id=current_user.company_id)
        db.add(branding)
    
    if is_dark:
        branding.logo_dark_url = url
    else:
        branding.logo_url = url
    
    # Audit log
    audit_log = AuditLog(
        company_id=current_user.company_id,
        user_id=current_user.id,
        action="logo_uploaded",
        resource_type="branding",
        details={"is_dark": is_dark, "url": url},
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit_log)
    
    await db.commit()
    
    return {"url": url}


@router.post("/favicon")
async def upload_favicon(
    file: UploadFile = File(...),
    request: Request = None,
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a company favicon."""
    # Validate file type
    allowed_types = ["image/png", "image/x-icon", "image/vnd.microsoft.icon", "image/ico"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File type not allowed. Use PNG or ICO format.",
        )
    
    # Validate file size (max 500KB)
    content = await file.read()
    if len(content) > 500 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Maximum size is 500KB.",
        )
    
    # Save favicon
    url = await branding_service.save_favicon(
        company_id=current_user.company_id,
        file_content=content,
        filename=file.filename,
    )
    
    # Update branding config
    result = await db.execute(
        select(BrandingConfig).where(BrandingConfig.company_id == current_user.company_id)
    )
    branding = result.scalar_one_or_none()
    
    if not branding:
        branding = BrandingConfig(company_id=current_user.company_id)
        db.add(branding)
    
    branding.favicon_url = url
    
    await db.commit()
    
    return {"url": url}


@router.post("/login-background")
async def upload_login_background(
    file: UploadFile = File(...),
    request: Request = None,
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a login background image."""
    # Validate file type
    allowed_types = ["image/png", "image/jpeg", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File type not allowed. Use PNG, JPEG or WebP format.",
        )
    
    # Validate file size (max 5MB)
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Maximum size is 5MB.",
        )
    
    # Save background
    url = await branding_service.save_login_background(
        company_id=current_user.company_id,
        file_content=content,
        filename=file.filename,
    )
    
    # Update branding config
    result = await db.execute(
        select(BrandingConfig).where(BrandingConfig.company_id == current_user.company_id)
    )
    branding = result.scalar_one_or_none()
    
    if not branding:
        branding = BrandingConfig(company_id=current_user.company_id)
        db.add(branding)
    
    branding.login_background_url = url
    
    await db.commit()
    
    return {"url": url}


@router.delete("/logo")
async def delete_logo(
    is_dark: bool = False,
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete the company logo."""
    asset_type = "logo_dark" if is_dark else "logo"
    await branding_service.delete_asset(current_user.company_id, asset_type)
    
    # Update branding config
    result = await db.execute(
        select(BrandingConfig).where(BrandingConfig.company_id == current_user.company_id)
    )
    branding = result.scalar_one_or_none()
    
    if branding:
        if is_dark:
            branding.logo_dark_url = None
        else:
            branding.logo_url = None
        await db.commit()
    
    return {"status": "deleted"}


@router.get("/css")
async def get_branding_css(
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get CSS variables for the company's branding."""
    result = await db.execute(
        select(BrandingConfig).where(BrandingConfig.company_id == current_user.company_id)
    )
    branding = result.scalar_one_or_none()
    
    if not branding:
        branding = BrandingConfig(company_id=current_user.company_id)
    
    css = branding_service.generate_css_variables(branding)
    
    return {"css": css}
