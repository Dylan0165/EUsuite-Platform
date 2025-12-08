"""
EUAdmin Backend - Platform Stats API Routes
"""
import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..tenant_database import get_tenant_db
from ..models import (
    Company, CompanyUser, DeploymentHistory,
    DeploymentStatus
)
from ..schemas_tenant import PlatformStatsResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/platform", tags=["Platform"])


@router.get("/stats", response_model=PlatformStatsResponse)
async def get_platform_stats(
    db: Session = Depends(get_tenant_db),
):
    """Get platform-wide statistics."""
    # Company stats
    total_companies = db.query(func.count(Company.id)).scalar() or 0
    active_companies = db.query(func.count(Company.id)).filter(
        Company.is_active == True,
        Company.is_approved == True
    ).scalar() or 0
    pending_approval = db.query(func.count(Company.id)).filter(
        Company.is_approved == False
    ).scalar() or 0
    
    # User stats
    total_users = db.query(func.count(CompanyUser.id)).scalar() or 0
    
    # Deployment stats
    total_deployments = db.query(func.count(DeploymentHistory.id)).scalar() or 0
    successful_deployments = db.query(func.count(DeploymentHistory.id)).filter(
        DeploymentHistory.status == DeploymentStatus.COMPLETED
    ).scalar() or 0
    failed_deployments = db.query(func.count(DeploymentHistory.id)).filter(
        DeploymentHistory.status == DeploymentStatus.FAILED
    ).scalar() or 0
    
    # Storage stats
    total_storage_used = db.query(func.sum(CompanyUser.storage_used)).scalar() or 0
    
    # Active namespaces (deployed companies)
    active_namespaces = db.query(func.count(Company.id)).filter(
        Company.namespace.isnot(None),
        Company.is_active == True
    ).scalar() or 0
    
    return PlatformStatsResponse(
        total_companies=total_companies,
        active_companies=active_companies,
        pending_approval=pending_approval,
        total_users=total_users,
        total_deployments=total_deployments,
        successful_deployments=successful_deployments,
        failed_deployments=failed_deployments,
        total_storage_used=total_storage_used,
        total_storage_used_gb=round(total_storage_used / (1024**3), 2) if total_storage_used else 0,
        active_namespaces=active_namespaces,
    )


@router.get("/health")
async def platform_health(
    db: Session = Depends(get_tenant_db),
):
    """Platform health check."""
    # Basic DB check
    try:
        db.execute("SELECT 1")
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {e}"
    
    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "components": {
            "database": db_status,
            "api": "healthy",
        }
    }
