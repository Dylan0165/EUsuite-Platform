from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.models import CompanyUser, AppDeployment, AuditLog, DeploymentStatus, AppType
from app.schemas import (
    DeploymentCreate, DeploymentUpdate, DeploymentResponse, DeploymentListResponse
)
from app.auth import get_admin_user
from app.services import k8s_service, port_manager


router = APIRouter(prefix="/deployments", tags=["Deployments"])


@router.get("/", response_model=DeploymentListResponse)
async def list_deployments(
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """List all deployments for the company."""
    result = await db.execute(
        select(AppDeployment)
        .where(AppDeployment.company_id == current_user.company_id)
        .order_by(AppDeployment.created_at.desc())
    )
    deployments = result.scalars().all()
    
    return DeploymentListResponse(
        deployments=[DeploymentResponse.model_validate(d) for d in deployments],
        total=len(deployments),
    )


@router.post("/", response_model=DeploymentResponse, status_code=status.HTTP_201_CREATED)
async def create_deployment(
    deployment_data: DeploymentCreate,
    request: Request,
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Deploy an EUSuite app for the company."""
    # Check if already deployed
    result = await db.execute(
        select(AppDeployment).where(
            AppDeployment.company_id == current_user.company_id,
            AppDeployment.app_type == deployment_data.app_type,
        )
    )
    existing = result.scalar_one_or_none()
    
    if existing and existing.status not in [DeploymentStatus.FAILED, DeploymentStatus.STOPPED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{deployment_data.app_type.value} is already deployed",
        )
    
    # Allocate port
    node_port = await port_manager.allocate_port(
        current_user.company_id,
        deployment_data.app_type.value,
    )
    
    # Create K8s namespace if needed
    await k8s_service.create_namespace(current_user.company_id)
    
    # Create deployment in K8s
    try:
        k8s_result = await k8s_service.create_deployment(
            company_id=current_user.company_id,
            app_type=deployment_data.app_type.value,
            node_port=node_port,
            replicas=deployment_data.replicas,
            cpu_request=deployment_data.cpu_request,
            cpu_limit=deployment_data.cpu_limit,
            memory_request=deployment_data.memory_request,
            memory_limit=deployment_data.memory_limit,
            env_vars={
                "COMPANY_ID": str(current_user.company_id),
                "BRANDING_URL": f"/api/v1/branding/{current_user.company_id}",
            },
        )
    except Exception as e:
        # Release port on failure
        await port_manager.release_port(current_user.company_id, deployment_data.app_type.value)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create deployment: {str(e)}",
        )
    
    # Save to database
    if existing:
        deployment = existing
        deployment.status = DeploymentStatus.DEPLOYING
        deployment.node_port = node_port
        deployment.namespace = k8s_result["namespace"]
        deployment.deployment_name = k8s_result["deployment_name"]
        deployment.service_name = k8s_result["service_name"]
        deployment.internal_url = k8s_result["internal_url"]
        deployment.replicas = deployment_data.replicas
        deployment.cpu_request = deployment_data.cpu_request
        deployment.cpu_limit = deployment_data.cpu_limit
        deployment.memory_request = deployment_data.memory_request
        deployment.memory_limit = deployment_data.memory_limit
    else:
        deployment = AppDeployment(
            company_id=current_user.company_id,
            app_type=deployment_data.app_type,
            namespace=k8s_result["namespace"],
            deployment_name=k8s_result["deployment_name"],
            service_name=k8s_result["service_name"],
            node_port=node_port,
            internal_url=k8s_result["internal_url"],
            status=DeploymentStatus.DEPLOYING,
            replicas=deployment_data.replicas,
            cpu_request=deployment_data.cpu_request,
            cpu_limit=deployment_data.cpu_limit,
            memory_request=deployment_data.memory_request,
            memory_limit=deployment_data.memory_limit,
        )
        db.add(deployment)
    
    # Audit log
    audit_log = AuditLog(
        company_id=current_user.company_id,
        user_id=current_user.id,
        action="deployment_created",
        resource_type="deployment",
        resource_id=deployment_data.app_type.value,
        details={
            "app_type": deployment_data.app_type.value,
            "node_port": node_port,
            "replicas": deployment_data.replicas,
        },
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit_log)
    
    await db.commit()
    await db.refresh(deployment)
    
    return DeploymentResponse.model_validate(deployment)


@router.get("/{app_type}", response_model=DeploymentResponse)
async def get_deployment(
    app_type: AppType,
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get deployment details for a specific app."""
    result = await db.execute(
        select(AppDeployment).where(
            AppDeployment.company_id == current_user.company_id,
            AppDeployment.app_type == app_type,
        )
    )
    deployment = result.scalar_one_or_none()
    
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")
    
    # Update status from K8s
    try:
        k8s_status = await k8s_service.get_deployment_status(
            current_user.company_id,
            app_type.value,
        )
        
        if "error" not in k8s_status:
            deployment.ready_replicas = k8s_status["ready_replicas"]
            if k8s_status["ready_replicas"] == k8s_status["replicas"]:
                deployment.status = DeploymentStatus.RUNNING
            elif k8s_status["ready_replicas"] == 0:
                deployment.status = DeploymentStatus.FAILED
            else:
                deployment.status = DeploymentStatus.DEPLOYING
            
            await db.commit()
    except Exception:
        pass  # Keep existing status
    
    return DeploymentResponse.model_validate(deployment)


@router.put("/{app_type}", response_model=DeploymentResponse)
async def update_deployment(
    app_type: AppType,
    deployment_data: DeploymentUpdate,
    request: Request,
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a deployment configuration."""
    result = await db.execute(
        select(AppDeployment).where(
            AppDeployment.company_id == current_user.company_id,
            AppDeployment.app_type == app_type,
        )
    )
    deployment = result.scalar_one_or_none()
    
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")
    
    # Update K8s deployment
    update_data = deployment_data.model_dump(exclude_unset=True)
    
    if "replicas" in update_data:
        await k8s_service.scale_deployment(
            current_user.company_id,
            app_type.value,
            update_data["replicas"],
        )
    
    # Update database
    for field, value in update_data.items():
        setattr(deployment, field, value)
    
    deployment.status = DeploymentStatus.UPDATING
    
    # Audit log
    audit_log = AuditLog(
        company_id=current_user.company_id,
        user_id=current_user.id,
        action="deployment_updated",
        resource_type="deployment",
        resource_id=app_type.value,
        details=update_data,
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit_log)
    
    await db.commit()
    await db.refresh(deployment)
    
    return DeploymentResponse.model_validate(deployment)


@router.post("/{app_type}/restart")
async def restart_deployment(
    app_type: AppType,
    request: Request,
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Restart a deployment."""
    result = await db.execute(
        select(AppDeployment).where(
            AppDeployment.company_id == current_user.company_id,
            AppDeployment.app_type == app_type,
        )
    )
    deployment = result.scalar_one_or_none()
    
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")
    
    await k8s_service.restart_deployment(current_user.company_id, app_type.value)
    
    deployment.status = DeploymentStatus.DEPLOYING
    
    # Audit log
    audit_log = AuditLog(
        company_id=current_user.company_id,
        user_id=current_user.id,
        action="deployment_restarted",
        resource_type="deployment",
        resource_id=app_type.value,
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit_log)
    
    await db.commit()
    
    return {"status": "restarting"}


@router.delete("/{app_type}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_deployment(
    app_type: AppType,
    request: Request,
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a deployment."""
    result = await db.execute(
        select(AppDeployment).where(
            AppDeployment.company_id == current_user.company_id,
            AppDeployment.app_type == app_type,
        )
    )
    deployment = result.scalar_one_or_none()
    
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")
    
    # Delete from K8s
    await k8s_service.delete_deployment(current_user.company_id, app_type.value)
    
    # Release port
    await port_manager.release_port(current_user.company_id, app_type.value)
    
    # Audit log
    audit_log = AuditLog(
        company_id=current_user.company_id,
        user_id=current_user.id,
        action="deployment_deleted",
        resource_type="deployment",
        resource_id=app_type.value,
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit_log)
    
    await db.delete(deployment)
    await db.commit()
