"""
EUAdmin Backend - Deployment API Routes
"""
import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
import asyncio
import json

from ..tenant_database import get_tenant_db
from ..services.deployment_engine import DeploymentEngine
from ..services.port_manager import PortManager
from ..services.yaml_generator import generate_tenant_combined_yaml
from ..models import Company, ServiceType, DeploymentStatus
from ..schemas_tenant import (
    DeploymentRequest, DeploymentResponse, DeploymentHistoryResponse,
    DeploymentConfigPreview, DeploymentYAMLPreview,
    AvailablePortsResponse, PortAllocationResponse
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Deployments"])


def get_deployment_engine(db: Session = Depends(get_tenant_db)) -> DeploymentEngine:
    return DeploymentEngine(db)


def get_port_manager(db: Session = Depends(get_tenant_db)) -> PortManager:
    return PortManager(db)


# ============================================================================
# DEPLOYMENT OPERATIONS
# ============================================================================

@router.post("/companies/{company_id}/deploy", response_model=DeploymentResponse)
async def deploy_company(
    company_id: int,
    data: DeploymentRequest,
    initiated_by: int = Query(None, description="User ID who initiated deployment"),
    initiated_by_email: str = Query(None, description="Email of user who initiated"),
    engine: DeploymentEngine = Depends(get_deployment_engine),
):
    """
    Deploy a company's ecosystem to Kubernetes.
    """
    try:
        services = None
        if data.services:
            services = [ServiceType(s) for s in data.services]
        
        deployment = engine.deploy_tenant(
            company_id=company_id,
            deployment_type=data.deployment_type,
            services=services,
            force=data.force,
            initiated_by=initiated_by,
            initiated_by_email=initiated_by_email,
        )
        
        return DeploymentResponse(
            id=deployment.id,
            company_id=deployment.company_id,
            deployment_id=deployment.deployment_id,
            deployment_type=deployment.deployment_type,
            target=deployment.target.value,
            namespace=deployment.namespace,
            services_deployed=deployment.services_deployed,
            status=deployment.status.value,
            status_message=deployment.status_message,
            started_at=deployment.started_at,
            completed_at=deployment.completed_at,
            duration_seconds=deployment.duration_seconds,
            can_rollback=deployment.can_rollback,
            created_at=deployment.created_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Deployment failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/companies/{company_id}/deployments", response_model=DeploymentHistoryResponse)
async def get_deployment_history(
    company_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    engine: DeploymentEngine = Depends(get_deployment_engine),
):
    """Get deployment history for a company."""
    deployments, total = engine.get_deployment_history(
        company_id=company_id,
        page=page,
        page_size=page_size,
    )
    
    return DeploymentHistoryResponse(
        deployments=[
            DeploymentResponse(
                id=d.id,
                company_id=d.company_id,
                deployment_id=d.deployment_id,
                deployment_type=d.deployment_type,
                target=d.target.value,
                namespace=d.namespace,
                services_deployed=d.services_deployed,
                status=d.status.value,
                status_message=d.status_message,
                started_at=d.started_at,
                completed_at=d.completed_at,
                duration_seconds=d.duration_seconds,
                can_rollback=d.can_rollback,
                created_at=d.created_at,
            )
            for d in deployments
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/deployments/{deployment_id}", response_model=DeploymentResponse)
async def get_deployment(
    deployment_id: str,
    engine: DeploymentEngine = Depends(get_deployment_engine),
):
    """Get deployment by ID."""
    deployment = engine.get_deployment_status(deployment_id)
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")
    
    return DeploymentResponse(
        id=deployment.id,
        company_id=deployment.company_id,
        deployment_id=deployment.deployment_id,
        deployment_type=deployment.deployment_type,
        target=deployment.target.value,
        namespace=deployment.namespace,
        services_deployed=deployment.services_deployed,
        status=deployment.status.value,
        status_message=deployment.status_message,
        started_at=deployment.started_at,
        completed_at=deployment.completed_at,
        duration_seconds=deployment.duration_seconds,
        can_rollback=deployment.can_rollback,
        created_at=deployment.created_at,
    )


@router.get("/deployments/{deployment_id}/logs")
async def get_deployment_logs(
    deployment_id: str,
    engine: DeploymentEngine = Depends(get_deployment_engine),
):
    """Get logs for a deployment."""
    deployment = engine.get_deployment_status(deployment_id)
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")
    
    return {
        "deployment_id": deployment_id,
        "status": deployment.status.value,
        "logs": deployment.logs or "",
    }


@router.get("/deployments/{deployment_id}/yaml")
async def get_deployment_yaml(
    deployment_id: str,
    engine: DeploymentEngine = Depends(get_deployment_engine),
):
    """Get generated YAML for a deployment (for download)."""
    deployment = engine.get_deployment_status(deployment_id)
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")
    
    if not deployment.generated_yaml:
        raise HTTPException(status_code=404, detail="No YAML generated for this deployment")
    
    return {
        "deployment_id": deployment_id,
        "namespace": deployment.namespace,
        "yaml": deployment.generated_yaml,
    }


@router.post("/companies/{company_id}/rollback")
async def rollback_deployment(
    company_id: int,
    target_deployment_id: str = Query(..., description="Deployment ID to rollback to"),
    initiated_by: int = Query(None, description="User ID who initiated rollback"),
    engine: DeploymentEngine = Depends(get_deployment_engine),
):
    """Rollback to a previous deployment."""
    try:
        deployment = engine.rollback_deployment(
            company_id=company_id,
            target_deployment_id=target_deployment_id,
            initiated_by=initiated_by,
        )
        
        return DeploymentResponse(
            id=deployment.id,
            company_id=deployment.company_id,
            deployment_id=deployment.deployment_id,
            deployment_type=deployment.deployment_type,
            target=deployment.target.value,
            namespace=deployment.namespace,
            services_deployed=deployment.services_deployed,
            status=deployment.status.value,
            status_message=deployment.status_message,
            started_at=deployment.started_at,
            completed_at=deployment.completed_at,
            duration_seconds=deployment.duration_seconds,
            can_rollback=deployment.can_rollback,
            created_at=deployment.created_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/companies/{company_id}/deployment", status_code=204)
async def delete_deployment(
    company_id: int,
    engine: DeploymentEngine = Depends(get_deployment_engine),
):
    """Delete all resources for a tenant deployment."""
    try:
        success = engine.delete_tenant_deployment(company_id)
        if not success:
            raise HTTPException(status_code=404, detail="Deployment not found")
    except Exception as e:
        logger.error(f"Failed to delete deployment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# PREVIEW & PLANNING
# ============================================================================

@router.get("/companies/{company_id}/deploy/preview")
async def preview_deployment(
    company_id: int,
    db: Session = Depends(get_tenant_db),
    port_manager: PortManager = Depends(get_port_manager),
):
    """Preview deployment configuration before deploying."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Get enabled services
    services = [s for s in company.services if s.is_enabled]
    service_types = [s.service_type for s in services]
    
    # Get available ports (preview, don't actually allocate)
    available_ports = port_manager.get_available_ports(len(services))
    port_preview = {
        service_types[i].value: available_ports[i]
        for i in range(min(len(services), len(available_ports)))
    }
    
    # Calculate estimated resources
    total_cpu = sum(int(s.cpu_limit.replace('m', '')) for s in services)
    total_memory = sum(int(s.memory_limit.replace('Mi', '')) for s in services)
    
    return {
        "company_id": company_id,
        "company_name": company.name,
        "namespace": company.namespace,
        "target": company.deployment_target.value,
        "services": [
            {
                "type": s.service_type.value,
                "name": s.service_name,
                "port": port_preview.get(s.service_type.value),
                "replicas": s.replicas,
            }
            for s in services
        ],
        "estimated_resources": {
            "cpu": f"{total_cpu}m",
            "memory": f"{total_memory}Mi",
        },
        "branding": company.branding.to_branding_json() if company.branding else None,
    }


@router.get("/companies/{company_id}/deploy/yaml-preview")
async def preview_yaml(
    company_id: int,
    db: Session = Depends(get_tenant_db),
    port_manager: PortManager = Depends(get_port_manager),
):
    """Generate and preview YAML without deploying."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Get enabled services and preview ports
    services = [s for s in company.services if s.is_enabled]
    service_types = [s.service_type for s in services]
    available_ports = port_manager.get_available_ports(len(services))
    
    port_mapping = {
        service_types[i]: available_ports[i]
        for i in range(min(len(services), len(available_ports)))
    }
    
    # Generate YAML
    combined_yaml = generate_tenant_combined_yaml(company, port_mapping)
    
    return {
        "company_id": company_id,
        "namespace": company.namespace,
        "yaml": combined_yaml,
        "ports": {k.value: v for k, v in port_mapping.items()},
    }


# ============================================================================
# PORT MANAGEMENT
# ============================================================================

@router.get("/ports/available", response_model=AvailablePortsResponse)
async def get_available_ports(
    count: int = Query(10, ge=1, le=50),
    port_manager: PortManager = Depends(get_port_manager),
):
    """Get list of available ports."""
    available = port_manager.get_available_ports(count)
    allocated = port_manager.get_all_allocations()
    
    return AvailablePortsResponse(
        available_ports=available,
        allocated_ports=[
            PortAllocationResponse(
                port=a.port,
                company_id=a.company_id,
                service_type=a.service_type.value if a.service_type else None,
                namespace=a.namespace,
                is_allocated=a.is_allocated,
                allocated_at=a.allocated_at,
            )
            for a in allocated
        ],
        port_range={"min": 30100, "max": 32767},
    )


@router.get("/companies/{company_id}/ports")
async def get_company_ports(
    company_id: int,
    port_manager: PortManager = Depends(get_port_manager),
):
    """Get ports allocated to a company."""
    ports = port_manager.get_company_ports(company_id)
    return {"company_id": company_id, "ports": ports}


# ============================================================================
# WEBSOCKET FOR REAL-TIME LOGS
# ============================================================================

class ConnectionManager:
    """Manages WebSocket connections for deployment logs."""
    
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, deployment_id: str):
        await websocket.accept()
        if deployment_id not in self.active_connections:
            self.active_connections[deployment_id] = []
        self.active_connections[deployment_id].append(websocket)
    
    def disconnect(self, websocket: WebSocket, deployment_id: str):
        if deployment_id in self.active_connections:
            self.active_connections[deployment_id].remove(websocket)
    
    async def send_log(self, deployment_id: str, message: str, data: dict = None):
        if deployment_id in self.active_connections:
            payload = json.dumps({
                "type": "log",
                "deployment_id": deployment_id,
                "message": message,
                "data": data or {},
            })
            for connection in self.active_connections[deployment_id]:
                await connection.send_text(payload)


manager = ConnectionManager()


@router.websocket("/ws/deployments/{deployment_id}/logs")
async def websocket_deployment_logs(
    websocket: WebSocket,
    deployment_id: str,
    db: Session = Depends(get_tenant_db),
):
    """
    WebSocket endpoint for real-time deployment logs.
    Connect to receive live updates during deployment.
    """
    await manager.connect(websocket, deployment_id)
    
    try:
        # Send initial status
        engine = DeploymentEngine(db)
        deployment = engine.get_deployment_status(deployment_id)
        
        if deployment:
            await websocket.send_json({
                "type": "status",
                "deployment_id": deployment_id,
                "status": deployment.status.value,
                "message": deployment.status_message or "Connected",
            })
        
        # Keep connection alive and wait for messages
        while True:
            try:
                # Receive any client messages (ping/pong, etc.)
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30)
                
                if data == "ping":
                    await websocket.send_text("pong")
                    
            except asyncio.TimeoutError:
                # Send keepalive
                await websocket.send_json({"type": "keepalive"})
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, deployment_id)
