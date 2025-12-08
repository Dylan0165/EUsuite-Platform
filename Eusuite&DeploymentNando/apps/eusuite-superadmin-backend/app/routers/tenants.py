from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional
from datetime import datetime, timedelta
from ..database import get_db
from ..models import (
    Tenant, TenantStatus, SubscriptionStatus, Plan, TenantDeployment,
    Invoice, AdminUser, AuditLog
)
from ..schemas import (
    TenantCreate, TenantUpdate, TenantResponse, TenantDetailResponse,
    PaginatedResponse, DeploymentResponse, InvoiceResponse
)
from ..auth import get_current_admin, require_admin, require_superadmin
from ..services import k8s_service, stripe_service

router = APIRouter(prefix="/tenants", tags=["Tenants"])


@router.get("", response_model=PaginatedResponse)
async def list_tenants(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[TenantStatus] = Query(None, alias="status"),
    subscription_status: Optional[SubscriptionStatus] = None,
    search: Optional[str] = None,
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all tenants with pagination and filtering"""
    query = select(Tenant)
    count_query = select(func.count(Tenant.id))
    
    if status_filter:
        query = query.where(Tenant.status == status_filter)
        count_query = count_query.where(Tenant.status == status_filter)
    
    if subscription_status:
        query = query.where(Tenant.subscription_status == subscription_status)
        count_query = count_query.where(Tenant.subscription_status == subscription_status)
    
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            (Tenant.name.ilike(search_filter)) |
            (Tenant.slug.ilike(search_filter)) |
            (Tenant.contact_email.ilike(search_filter))
        )
        count_query = count_query.where(
            (Tenant.name.ilike(search_filter)) |
            (Tenant.slug.ilike(search_filter)) |
            (Tenant.contact_email.ilike(search_filter))
        )
    
    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Get paginated results
    offset = (page - 1) * page_size
    query = query.order_by(Tenant.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    tenants = result.scalars().all()
    
    return PaginatedResponse(
        items=[TenantResponse.model_validate(t) for t in tenants],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.post("", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
async def create_tenant(
    request: Request,
    tenant_data: TenantCreate,
    current_admin: AdminUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new tenant"""
    # Check if slug already exists
    result = await db.execute(
        select(Tenant).where(Tenant.slug == tenant_data.slug)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant slug already exists",
        )
    
    # Check domain if provided
    if tenant_data.domain:
        result = await db.execute(
            select(Tenant).where(Tenant.domain == tenant_data.domain)
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Domain already in use",
            )
    
    # Create Stripe customer
    stripe_customer_id = None
    if stripe_service:
        stripe_customer_id = await stripe_service.create_customer(
            email=tenant_data.contact_email,
            name=tenant_data.name,
            metadata={"tenant_slug": tenant_data.slug},
        )
    
    # Calculate trial end date
    trial_ends_at = datetime.utcnow() + timedelta(days=14)
    
    tenant = Tenant(
        name=tenant_data.name,
        slug=tenant_data.slug,
        domain=tenant_data.domain,
        contact_email=tenant_data.contact_email,
        contact_phone=tenant_data.contact_phone,
        contact_name=tenant_data.contact_name,
        address_line1=tenant_data.address_line1,
        address_line2=tenant_data.address_line2,
        city=tenant_data.city,
        state=tenant_data.state,
        postal_code=tenant_data.postal_code,
        country=tenant_data.country,
        company_registration=tenant_data.company_registration,
        vat_number=tenant_data.vat_number,
        plan_id=tenant_data.plan_id,
        status=TenantStatus.PENDING,
        subscription_status=SubscriptionStatus.TRIAL,
        trial_ends_at=trial_ends_at,
        stripe_customer_id=stripe_customer_id,
        k8s_namespace=f"tenant-{tenant_data.slug}",
    )
    
    db.add(tenant)
    await db.commit()
    await db.refresh(tenant)
    
    # Log action
    audit_log = AuditLog(
        admin_user_id=current_admin.id,
        action="tenant.create",
        resource_type="tenant",
        resource_id=str(tenant.id),
        details={"name": tenant.name, "slug": tenant.slug},
        ip_address=request.client.host if request.client else None,
        status="success",
    )
    db.add(audit_log)
    await db.commit()
    
    return tenant


@router.get("/{tenant_id}", response_model=TenantDetailResponse)
async def get_tenant(
    tenant_id: int,
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get tenant details by ID"""
    result = await db.execute(
        select(Tenant)
        .options(
            selectinload(Tenant.plan),
            selectinload(Tenant.deployments),
        )
        .where(Tenant.id == tenant_id)
    )
    tenant = result.scalar_one_or_none()
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found",
        )
    
    # Get recent invoices
    invoice_result = await db.execute(
        select(Invoice)
        .where(Invoice.tenant_id == tenant_id)
        .order_by(Invoice.created_at.desc())
        .limit(5)
    )
    invoices = invoice_result.scalars().all()
    
    response = TenantDetailResponse.model_validate(tenant)
    response.deployments = [DeploymentResponse.model_validate(d) for d in tenant.deployments]
    response.recent_invoices = [InvoiceResponse.model_validate(i) for i in invoices]
    
    return response


@router.patch("/{tenant_id}", response_model=TenantResponse)
async def update_tenant(
    tenant_id: int,
    request: Request,
    update_data: TenantUpdate,
    current_admin: AdminUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a tenant"""
    result = await db.execute(
        select(Tenant).where(Tenant.id == tenant_id)
    )
    tenant = result.scalar_one_or_none()
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found",
        )
    
    # Check domain uniqueness if changing
    if update_data.domain and update_data.domain != tenant.domain:
        result = await db.execute(
            select(Tenant).where(
                (Tenant.domain == update_data.domain) &
                (Tenant.id != tenant_id)
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Domain already in use",
            )
    
    update_fields = update_data.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        setattr(tenant, field, value)
    
    await db.commit()
    await db.refresh(tenant)
    
    # Log action
    audit_log = AuditLog(
        admin_user_id=current_admin.id,
        action="tenant.update",
        resource_type="tenant",
        resource_id=str(tenant.id),
        details=update_fields,
        ip_address=request.client.host if request.client else None,
        status="success",
    )
    db.add(audit_log)
    await db.commit()
    
    return tenant


@router.post("/{tenant_id}/activate", response_model=TenantResponse)
async def activate_tenant(
    tenant_id: int,
    request: Request,
    current_admin: AdminUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Activate a tenant and create K8s namespace"""
    result = await db.execute(
        select(Tenant).where(Tenant.id == tenant_id)
    )
    tenant = result.scalar_one_or_none()
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found",
        )
    
    if tenant.status == TenantStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant is already active",
        )
    
    # Create K8s namespace
    namespace_created = await k8s_service.create_tenant_namespace(tenant.slug)
    
    tenant.status = TenantStatus.ACTIVE
    tenant.activated_at = datetime.utcnow()
    tenant.k8s_deployed = namespace_created
    
    await db.commit()
    await db.refresh(tenant)
    
    # Log action
    audit_log = AuditLog(
        admin_user_id=current_admin.id,
        action="tenant.activate",
        resource_type="tenant",
        resource_id=str(tenant.id),
        details={"namespace_created": namespace_created},
        ip_address=request.client.host if request.client else None,
        status="success",
    )
    db.add(audit_log)
    await db.commit()
    
    return tenant


@router.post("/{tenant_id}/suspend", response_model=TenantResponse)
async def suspend_tenant(
    tenant_id: int,
    request: Request,
    reason: Optional[str] = None,
    current_admin: AdminUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Suspend a tenant"""
    result = await db.execute(
        select(Tenant).where(Tenant.id == tenant_id)
    )
    tenant = result.scalar_one_or_none()
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found",
        )
    
    tenant.status = TenantStatus.SUSPENDED
    tenant.suspended_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(tenant)
    
    # Log action
    audit_log = AuditLog(
        admin_user_id=current_admin.id,
        action="tenant.suspend",
        resource_type="tenant",
        resource_id=str(tenant.id),
        details={"reason": reason},
        ip_address=request.client.host if request.client else None,
        status="success",
    )
    db.add(audit_log)
    await db.commit()
    
    return tenant


@router.delete("/{tenant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tenant(
    tenant_id: int,
    request: Request,
    current_admin: AdminUser = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a tenant (superadmin only)"""
    result = await db.execute(
        select(Tenant).where(Tenant.id == tenant_id)
    )
    tenant = result.scalar_one_or_none()
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found",
        )
    
    # Delete K8s namespace
    if tenant.k8s_deployed:
        await k8s_service.delete_tenant_namespace(tenant.slug)
    
    # Delete Stripe customer
    if tenant.stripe_customer_id and stripe_service:
        await stripe_service.delete_customer(tenant.stripe_customer_id)
    
    # Log action before deletion
    audit_log = AuditLog(
        admin_user_id=current_admin.id,
        action="tenant.delete",
        resource_type="tenant",
        resource_id=str(tenant.id),
        details={"name": tenant.name, "slug": tenant.slug},
        ip_address=request.client.host if request.client else None,
        status="success",
    )
    db.add(audit_log)
    
    await db.delete(tenant)
    await db.commit()
