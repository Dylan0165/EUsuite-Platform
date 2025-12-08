"""
EUAdmin Backend - System Router
System monitoring and control endpoints.
"""
from fastapi import APIRouter, HTTPException, status, Depends
from typing import Optional
from datetime import datetime

from ..auth import get_current_admin
from ..database import get_system_stats, get_total_storage
from ..kubernetes_client import k8s_client
from ..schemas import (
    SystemStats,
    PodInfo,
    PodMetrics,
    DeploymentInfo,
    SystemUsageResponse,
    SystemStorageResponse,
    ActionResponse
)

router = APIRouter(prefix="/admin/system", tags=["system"])


@router.get("/stats", response_model=SystemStats)
async def get_system_statistics(admin: dict = Depends(get_current_admin)):
    """
    Get overall system statistics.
    Includes user counts, storage usage, and activity metrics.
    """
    stats = get_system_stats()
    return SystemStats(**stats)


@router.get("/usage", response_model=SystemUsageResponse)
async def get_system_usage(admin: dict = Depends(get_current_admin)):
    """
    Get system resource usage (CPU/RAM) from Kubernetes metrics.
    """
    pod_metrics = k8s_client.get_pod_metrics()
    node_metrics = k8s_client.get_node_metrics()
    
    total_cpu = sum(p.get("cpu_millicores", 0) for p in pod_metrics)
    total_memory = sum(p.get("memory_mb", 0) for p in pod_metrics)
    
    return SystemUsageResponse(
        pods=[PodMetrics(**p) for p in pod_metrics],
        nodes=node_metrics,
        total_cpu_millicores=total_cpu,
        total_memory_mb=round(total_memory, 2)
    )


@router.get("/storage", response_model=SystemStorageResponse)
async def get_system_storage(admin: dict = Depends(get_current_admin)):
    """
    Get total storage usage across the system.
    Includes both database storage and Kubernetes PVCs.
    """
    total_storage = get_total_storage()
    pvcs = k8s_client.get_persistent_volumes()
    
    return SystemStorageResponse(
        total_storage=total_storage,
        persistent_volumes=pvcs
    )


@router.get("/pods")
async def get_pods(admin: dict = Depends(get_current_admin)):
    """
    Get all pods in the EUCloud namespace.
    """
    pods = k8s_client.get_pods()
    return {
        "pods": pods,
        "total": len(pods),
        "running": len([p for p in pods if p.get("status") == "Running"]),
        "not_ready": len([p for p in pods if not p.get("ready")])
    }


@router.get("/deployments")
async def get_deployments(admin: dict = Depends(get_current_admin)):
    """
    Get all deployments in the EUCloud namespace.
    """
    deployments = k8s_client.get_deployments()
    return {
        "deployments": deployments,
        "total": len(deployments)
    }


@router.get("/logs")
async def get_system_logs(
    pod_name: Optional[str] = None,
    lines: int = 100,
    admin: dict = Depends(get_current_admin)
):
    """
    Get logs from pods.
    If pod_name is specified, returns logs from that pod.
    Otherwise, returns a summary of recent logs from all pods.
    """
    if pod_name:
        logs = k8s_client.get_pod_logs(pod_name, lines)
        return {
            "pod": pod_name,
            "logs": logs,
            "lines": lines
        }
    
    # Get logs from all pods (last 10 lines each)
    pods = k8s_client.get_pods()
    all_logs = {}
    
    for pod in pods[:10]:  # Limit to first 10 pods
        pod_name = pod.get("name")
        if pod_name:
            logs = k8s_client.get_pod_logs(pod_name, 10)
            all_logs[pod_name] = logs
    
    return {
        "pods_count": len(all_logs),
        "logs": all_logs
    }


@router.post("/restart/{deployment_name}", response_model=ActionResponse)
async def restart_deployment(
    deployment_name: str,
    admin: dict = Depends(get_current_admin)
):
    """
    Restart a deployment by triggering a rollout restart.
    """
    success = k8s_client.restart_deployment(deployment_name)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to restart deployment {deployment_name}"
        )
    
    return ActionResponse(
        success=True,
        message=f"Deployment {deployment_name} restart initiated",
        details={"deployment": deployment_name, "timestamp": datetime.utcnow().isoformat()}
    )


@router.get("/health")
async def system_health():
    """
    Get overall system health status.
    No authentication required for health checks.
    """
    pods = k8s_client.get_pods()
    running_pods = [p for p in pods if p.get("status") == "Running" and p.get("ready")]
    
    health_status = "healthy" if len(running_pods) == len(pods) else "degraded"
    if len(running_pods) == 0 and len(pods) > 0:
        health_status = "unhealthy"
    
    return {
        "status": health_status,
        "pods_total": len(pods),
        "pods_healthy": len(running_pods),
        "timestamp": datetime.utcnow().isoformat()
    }
