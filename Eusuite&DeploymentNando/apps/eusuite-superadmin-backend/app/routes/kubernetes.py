"""
Kubernetes Routes - Admin endpoints for K8s management
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, List
from pydantic import BaseModel

from ..dependencies import get_current_admin
from ..services.kubernetes_service import kubernetes_service, EUSUITE_APPS

router = APIRouter(prefix="/kubernetes", tags=["Kubernetes"])


# ==================== SCHEMAS ====================

class NamespaceCreate(BaseModel):
    company_slug: str


class DeploymentCreate(BaseModel):
    namespace: str
    name: str
    image: str
    port: int = 80
    replicas: int = 1
    env_vars: Optional[dict] = None


class EUSuiteDeployRequest(BaseModel):
    namespace: str
    company_slug: str
    apps: Optional[List[str]] = None  # None = deploy all


class ScalingConfig(BaseModel):
    min_replicas: int = 1
    max_replicas: int = 5
    cpu_threshold: int = 70


class StorageConfig(BaseModel):
    size: str = "1Gi"


# ==================== PLATFORM OVERVIEW ====================

@router.get("/status")
async def get_kubernetes_status(admin = Depends(get_current_admin)):
    """Check if Kubernetes is available"""
    return {
        "available": kubernetes_service.is_available,
        "message": "Kubernetes connected" if kubernetes_service.is_available else "Kubernetes not available"
    }


@router.get("/stats")
async def get_platform_stats(admin = Depends(get_current_admin)):
    """Get platform-wide Kubernetes statistics"""
    stats = await kubernetes_service.get_platform_stats()
    if "error" in stats:
        raise HTTPException(status_code=500, detail=stats["error"])
    return stats


# ==================== NAMESPACE MANAGEMENT ====================

@router.post("/namespaces")
async def create_namespace(data: NamespaceCreate, admin = Depends(get_current_admin)):
    """Create a new tenant namespace"""
    result = await kubernetes_service.create_tenant_namespace(data.company_slug)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    return result


@router.delete("/namespaces/{company_slug}")
async def delete_namespace(company_slug: str, admin = Depends(get_current_admin)):
    """Delete a tenant namespace and all resources"""
    result = await kubernetes_service.delete_tenant_namespace(company_slug)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    return result


# ==================== POD MANAGEMENT ====================

@router.get("/namespaces/{namespace}/pods")
async def list_pods(namespace: str, admin = Depends(get_current_admin)):
    """List all pods in a namespace"""
    pods = await kubernetes_service.list_pods(namespace)
    return {"pods": pods, "total": len(pods)}


@router.get("/namespaces/{namespace}/pods/{pod_name}/logs")
async def get_pod_logs(
    namespace: str, 
    pod_name: str, 
    tail_lines: int = 100,
    admin = Depends(get_current_admin)
):
    """Get logs for a pod"""
    logs = await kubernetes_service.get_pod_logs(namespace, pod_name, tail_lines)
    return {"logs": logs}


@router.get("/namespaces/{namespace}/pods/{pod_name}/metrics")
async def get_pod_metrics(namespace: str, pod_name: str, admin = Depends(get_current_admin)):
    """Get CPU and memory metrics for a pod"""
    metrics = await kubernetes_service.get_pod_metrics(namespace, pod_name)
    return metrics


@router.delete("/namespaces/{namespace}/pods/{pod_name}")
async def delete_pod(namespace: str, pod_name: str, admin = Depends(get_current_admin)):
    """Delete a pod and its related resources"""
    result = await kubernetes_service.delete_pod(namespace, pod_name)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    return result


# ==================== DEPLOYMENT MANAGEMENT ====================

@router.post("/deployments")
async def create_deployment(data: DeploymentCreate, admin = Depends(get_current_admin)):
    """Create a new deployment"""
    result = await kubernetes_service.create_deployment(
        namespace=data.namespace,
        name=data.name,
        image=data.image,
        port=data.port,
        env_vars=data.env_vars,
        replicas=data.replicas
    )
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    return result


@router.post("/namespaces/{namespace}/deployments/{deployment_name}/scale")
async def scale_deployment(
    namespace: str, 
    deployment_name: str, 
    replicas: int,
    admin = Depends(get_current_admin)
):
    """Scale a deployment"""
    result = await kubernetes_service.scale_deployment(namespace, deployment_name, replicas)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    return result


# ==================== MONITORING ====================

@router.get("/namespaces/{namespace}/monitoring")
async def get_namespace_monitoring(namespace: str, admin = Depends(get_current_admin)):
    """Get comprehensive monitoring data for a namespace"""
    data = await kubernetes_service.get_namespace_monitoring(namespace)
    if "error" in data:
        raise HTTPException(status_code=500, detail=data["error"])
    return data


# ==================== STORAGE ====================

@router.post("/namespaces/{namespace}/deployments/{deployment_name}/storage")
async def add_storage(
    namespace: str, 
    deployment_name: str, 
    config: StorageConfig,
    admin = Depends(get_current_admin)
):
    """Add persistent storage to a deployment"""
    result = await kubernetes_service.add_storage(namespace, deployment_name, config.size)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    return result


# ==================== AUTOSCALING ====================

@router.post("/namespaces/{namespace}/deployments/{deployment_name}/autoscaling")
async def configure_autoscaling(
    namespace: str, 
    deployment_name: str, 
    config: ScalingConfig,
    admin = Depends(get_current_admin)
):
    """Configure horizontal pod autoscaler for a deployment"""
    result = await kubernetes_service.configure_autoscaling(
        namespace=namespace,
        deployment_name=deployment_name,
        min_replicas=config.min_replicas,
        max_replicas=config.max_replicas,
        cpu_threshold=config.cpu_threshold
    )
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    return result


# ==================== EUSUITE DEPLOYMENT ====================

@router.get("/eusuite/apps")
async def get_eusuite_apps(admin = Depends(get_current_admin)):
    """Get list of available EUSUITE apps"""
    return {
        "suite_name": "EUSUITE - European Office Suite",
        "description": "A complete Office 365 alternative by Dylan0165",
        "apps": [
            {
                "id": app_id,
                "name": app_info["name"],
                "description": app_info["description"],
                "image": app_info["image"],
                "port": app_info["port"],
                "type": app_info["type"]
            }
            for app_id, app_info in EUSUITE_APPS.items()
        ]
    }


@router.post("/eusuite/deploy")
async def deploy_eusuite(data: EUSuiteDeployRequest, admin = Depends(get_current_admin)):
    """Deploy EUSUITE apps to a tenant namespace"""
    result = await kubernetes_service.deploy_full_eusuite(
        namespace=data.namespace,
        company_slug=data.company_slug,
        apps=data.apps
    )
    return result


@router.post("/eusuite/deploy/{app_id}")
async def deploy_single_eusuite_app(
    app_id: str, 
    data: EUSuiteDeployRequest,
    admin = Depends(get_current_admin)
):
    """Deploy a single EUSUITE app"""
    result = await kubernetes_service.deploy_eusuite_app(
        namespace=data.namespace,
        app_id=app_id,
        company_slug=data.company_slug
    )
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    return result


@router.delete("/namespaces/{namespace}/eusuite")
async def undeploy_eusuite(namespace: str, admin = Depends(get_current_admin)):
    """Remove all EUSUITE apps from a namespace"""
    result = await kubernetes_service.undeploy_eusuite(namespace)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    return result
