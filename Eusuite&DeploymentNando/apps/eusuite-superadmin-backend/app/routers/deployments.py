from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from datetime import datetime
from ..database import get_db
from ..models import Tenant, TenantDeployment, AdminUser, AuditLog
from ..schemas import (
    DeploymentCreate, DeploymentUpdate, DeploymentResponse, PaginatedResponse
)
from ..auth import get_current_admin, require_admin
from ..services import k8s_service, port_manager

router = APIRouter(prefix="/deployments", tags=["Deployments"])


@router.get("", response_model=PaginatedResponse)
async def list_deployments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    tenant_id: Optional[int] = None,
    app_name: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all deployments with pagination"""
    query = select(TenantDeployment)
    count_query = select(func.count(TenantDeployment.id))
    
    if tenant_id:
        query = query.where(TenantDeployment.tenant_id == tenant_id)
        count_query = count_query.where(TenantDeployment.tenant_id == tenant_id)
    
    if app_name:
        query = query.where(TenantDeployment.app_name == app_name)
        count_query = count_query.where(TenantDeployment.app_name == app_name)
    
    if status_filter:
        query = query.where(TenantDeployment.status == status_filter)
        count_query = count_query.where(TenantDeployment.status == status_filter)
    
    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Get paginated results
    offset = (page - 1) * page_size
    query = query.order_by(TenantDeployment.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    deployments = result.scalars().all()
    
    return PaginatedResponse(
        items=[DeploymentResponse.model_validate(d) for d in deployments],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.post("", response_model=DeploymentResponse, status_code=status.HTTP_201_CREATED)
async def create_deployment(
    request: Request,
    deployment_data: DeploymentCreate,
    current_admin: AdminUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new app deployment for a tenant"""
    # Verify tenant exists
    tenant_result = await db.execute(
        select(Tenant).where(Tenant.id == deployment_data.tenant_id)
    )
    tenant = tenant_result.scalar_one_or_none()
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found",
        )
    
    # Check if deployment already exists
    existing_result = await db.execute(
        select(TenantDeployment).where(
            (TenantDeployment.tenant_id == deployment_data.tenant_id) &
            (TenantDeployment.app_name == deployment_data.app_name)
        )
    )
    if existing_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Deployment for {deployment_data.app_name} already exists for this tenant",
        )
    
    # Allocate a NodePort
    node_port = await port_manager.allocate_port(tenant.id, deployment_data.app_name)
    
    # Create deployment record
    deployment = TenantDeployment(
        tenant_id=deployment_data.tenant_id,
        app_name=deployment_data.app_name,
        status="pending",
        replicas=deployment_data.replicas,
        cpu_limit=deployment_data.cpu_limit,
        memory_limit=deployment_data.memory_limit,
        storage_limit=deployment_data.storage_limit,
        node_port=node_port,
        config=deployment_data.config,
        k8s_deployment_name=f"{tenant.slug}-{deployment_data.app_name}",
        k8s_service_name=f"{tenant.slug}-{deployment_data.app_name}-svc",
    )
    
    db.add(deployment)
    await db.commit()
    await db.refresh(deployment)
    
    # Deploy to Kubernetes
    deployment.status = "deploying"
    await db.commit()
    
    k8s_result = await k8s_service.deploy_app(
        tenant_slug=tenant.slug,
        app_name=deployment_data.app_name,
        node_port=node_port,
        replicas=deployment_data.replicas,
        cpu_limit=deployment_data.cpu_limit,
        memory_limit=deployment_data.memory_limit,
        storage_limit=deployment_data.storage_limit,
        env_vars=deployment_data.config,
    )
    
    if k8s_result.get("success"):
        deployment.status = "running"
        deployment.deployed_at = datetime.utcnow()
        deployment.internal_url = k8s_result.get("internal_url")
        deployment.external_url = k8s_result.get("external_url")
    else:
        deployment.status = "failed"
    
    # Update tenant app count
    tenant.current_apps = tenant.current_apps + 1
    
    await db.commit()
    await db.refresh(deployment)
    
    # Log action
    audit_log = AuditLog(
        admin_user_id=current_admin.id,
        action="deployment.create",
        resource_type="deployment",
        resource_id=str(deployment.id),
        details={
            "tenant_id": tenant.id,
            "app_name": deployment_data.app_name,
            "node_port": node_port,
            "k8s_result": k8s_result,
        },
        ip_address=request.client.host if request.client else None,
        status="success" if k8s_result.get("success") else "failed",
    )
    db.add(audit_log)
    await db.commit()
    
    return deployment


@router.get("/{deployment_id}", response_model=DeploymentResponse)
async def get_deployment(
    deployment_id: int,
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get deployment by ID"""
    result = await db.execute(
        select(TenantDeployment).where(TenantDeployment.id == deployment_id)
    )
    deployment = result.scalar_one_or_none()
    
    if not deployment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deployment not found",
        )
    
    return deployment


@router.get("/{deployment_id}/status")
async def get_deployment_status(
    deployment_id: int,
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get real-time deployment status from Kubernetes"""
    result = await db.execute(
        select(TenantDeployment)
        .join(Tenant)
        .where(TenantDeployment.id == deployment_id)
    )
    deployment = result.scalar_one_or_none()
    
    if not deployment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deployment not found",
        )
    
    # Get tenant for slug
    tenant_result = await db.execute(
        select(Tenant).where(Tenant.id == deployment.tenant_id)
    )
    tenant = tenant_result.scalar_one_or_none()
    
    k8s_status = await k8s_service.get_deployment_status(tenant.slug, deployment.app_name)
    
    return {
        "deployment_id": deployment.id,
        "app_name": deployment.app_name,
        "db_status": deployment.status,
        "k8s_status": k8s_status,
    }


@router.patch("/{deployment_id}", response_model=DeploymentResponse)
async def update_deployment(
    deployment_id: int,
    request: Request,
    update_data: DeploymentUpdate,
    current_admin: AdminUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a deployment"""
    result = await db.execute(
        select(TenantDeployment).where(TenantDeployment.id == deployment_id)
    )
    deployment = result.scalar_one_or_none()
    
    if not deployment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deployment not found",
        )
    
    update_fields = update_data.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        setattr(deployment, field, value)
    
    await db.commit()
    await db.refresh(deployment)
    
    # Log action
    audit_log = AuditLog(
        admin_user_id=current_admin.id,
        action="deployment.update",
        resource_type="deployment",
        resource_id=str(deployment.id),
        details=update_fields,
        ip_address=request.client.host if request.client else None,
        status="success",
    )
    db.add(audit_log)
    await db.commit()
    
    return deployment


@router.post("/{deployment_id}/scale")
async def scale_deployment(
    deployment_id: int,
    request: Request,
    replicas: int = Query(..., ge=0, le=10),
    current_admin: AdminUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Scale a deployment"""
    result = await db.execute(
        select(TenantDeployment).where(TenantDeployment.id == deployment_id)
    )
    deployment = result.scalar_one_or_none()
    
    if not deployment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deployment not found",
        )
    
    # Get tenant
    tenant_result = await db.execute(
        select(Tenant).where(Tenant.id == deployment.tenant_id)
    )
    tenant = tenant_result.scalar_one_or_none()
    
    # Scale in Kubernetes
    success = await k8s_service.scale_app(tenant.slug, deployment.app_name, replicas)
    
    if success:
        deployment.replicas = replicas
        if replicas == 0:
            deployment.status = "stopped"
        else:
            deployment.status = "running"
        
        await db.commit()
    
    # Log action
    audit_log = AuditLog(
        admin_user_id=current_admin.id,
        action="deployment.scale",
        resource_type="deployment",
        resource_id=str(deployment.id),
        details={"replicas": replicas, "success": success},
        ip_address=request.client.host if request.client else None,
        status="success" if success else "failed",
    )
    db.add(audit_log)
    await db.commit()
    
    return {"success": success, "replicas": replicas}


@router.delete("/{deployment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_deployment(
    deployment_id: int,
    request: Request,
    current_admin: AdminUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a deployment"""
    result = await db.execute(
        select(TenantDeployment).where(TenantDeployment.id == deployment_id)
    )
    deployment = result.scalar_one_or_none()
    
    if not deployment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deployment not found",
        )
    
    # Get tenant
    tenant_result = await db.execute(
        select(Tenant).where(Tenant.id == deployment.tenant_id)
    )
    tenant = tenant_result.scalar_one_or_none()
    
    # Delete from Kubernetes
    await k8s_service.delete_app(tenant.slug, deployment.app_name)
    
    # Release port
    await port_manager.release_port(tenant.id, deployment.app_name)
    
    # Update tenant app count
    if tenant.current_apps > 0:
        tenant.current_apps = tenant.current_apps - 1
    
    # Log action
    audit_log = AuditLog(
        admin_user_id=current_admin.id,
        action="deployment.delete",
        resource_type="deployment",
        resource_id=str(deployment.id),
        details={"tenant_id": tenant.id, "app_name": deployment.app_name},
        ip_address=request.client.host if request.client else None,
        status="success",
    )
    db.add(audit_log)
    
    await db.delete(deployment)
    await db.commit()
