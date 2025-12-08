"""
EUAdmin Backend - Storage Policy API Routes
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..tenant_database import get_tenant_db
from ..services.storage_policy_engine import StoragePolicyEngine
from ..models import StoragePolicyType
from ..schemas_tenant import (
    StoragePolicyCreate, StoragePolicyResponse
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/companies/{company_id}/storage-policy", tags=["Storage Policy"])


def get_storage_engine(db: Session = Depends(get_tenant_db)) -> StoragePolicyEngine:
    return StoragePolicyEngine(db)


@router.get("", response_model=StoragePolicyResponse)
async def get_storage_policy(
    company_id: int,
    engine: StoragePolicyEngine = Depends(get_storage_engine),
):
    """Get storage policy for a company."""
    policy = engine.get_policy(company_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Storage policy not found")
    
    response = StoragePolicyResponse(
        id=policy.id,
        company_id=policy.company_id,
        policy_type=policy.policy_type.value,
        total_storage_quota=policy.total_storage_quota,
        storage_used=policy.storage_used,
        max_file_size=policy.max_file_size,
        default_user_quota=policy.default_user_quota,
        file_retention_days=policy.file_retention_days,
        trash_retention_days=policy.trash_retention_days,
        backup_enabled=policy.backup_enabled,
        backup_frequency_hours=policy.backup_frequency_hours,
        backup_retention_days=policy.backup_retention_days,
        encryption_enabled=policy.encryption_enabled,
        encryption_algorithm=policy.encryption_algorithm,
        allowed_file_types=policy.allowed_file_types,
        blocked_file_types=policy.blocked_file_types,
        has_company_storage=bool(policy.company_storage_endpoint),
        created_at=policy.created_at,
        updated_at=policy.updated_at,
    )
    return response


@router.put("", response_model=StoragePolicyResponse)
async def update_storage_policy(
    company_id: int,
    data: StoragePolicyCreate,
    engine: StoragePolicyEngine = Depends(get_storage_engine),
):
    """Update storage policy for a company."""
    policy = engine.update_policy(
        company_id=company_id,
        policy_type=StoragePolicyType(data.policy_type) if data.policy_type else None,
        total_storage_quota=data.total_storage_quota,
        max_file_size=data.max_file_size,
        default_user_quota=data.default_user_quota,
        file_retention_days=data.file_retention_days,
        trash_retention_days=data.trash_retention_days,
        backup_enabled=data.backup_enabled,
        backup_frequency_hours=data.backup_frequency_hours,
        backup_retention_days=data.backup_retention_days,
        encryption_enabled=data.encryption_enabled,
        allowed_file_types=data.allowed_file_types,
        blocked_file_types=data.blocked_file_types,
        company_storage_endpoint=data.company_storage_endpoint,
        company_storage_bucket=data.company_storage_bucket,
        company_storage_access_key=data.company_storage_access_key,
        company_storage_secret_key=data.company_storage_secret_key,
        company_storage_region=data.company_storage_region,
    )
    
    if not policy:
        raise HTTPException(status_code=404, detail="Company not found")
    
    return StoragePolicyResponse(
        id=policy.id,
        company_id=policy.company_id,
        policy_type=policy.policy_type.value,
        total_storage_quota=policy.total_storage_quota,
        storage_used=policy.storage_used,
        max_file_size=policy.max_file_size,
        default_user_quota=policy.default_user_quota,
        file_retention_days=policy.file_retention_days,
        trash_retention_days=policy.trash_retention_days,
        backup_enabled=policy.backup_enabled,
        backup_frequency_hours=policy.backup_frequency_hours,
        backup_retention_days=policy.backup_retention_days,
        encryption_enabled=policy.encryption_enabled,
        encryption_algorithm=policy.encryption_algorithm,
        allowed_file_types=policy.allowed_file_types,
        blocked_file_types=policy.blocked_file_types,
        has_company_storage=bool(policy.company_storage_endpoint),
        created_at=policy.created_at,
        updated_at=policy.updated_at,
    )


@router.get("/stats")
async def get_storage_stats(
    company_id: int,
    engine: StoragePolicyEngine = Depends(get_storage_engine),
):
    """Get storage statistics for a company."""
    stats = engine.get_storage_stats(company_id)
    if not stats:
        raise HTTPException(status_code=404, detail="Storage policy not found")
    
    return stats


@router.get("/options")
async def get_storage_options(
    company_id: int,
    engine: StoragePolicyEngine = Depends(get_storage_engine),
):
    """Get available storage options based on policy."""
    options = engine.get_storage_options(company_id)
    return options


@router.post("/validate-upload")
async def validate_file_upload(
    company_id: int,
    user_id: int = Query(..., description="User ID"),
    file_size: int = Query(..., description="File size in bytes"),
    file_type: str = Query(..., description="File extension"),
    target_storage: str = Query("eusuite", description="Target storage: eusuite, company, local"),
    engine: StoragePolicyEngine = Depends(get_storage_engine),
):
    """
    Validate if a file upload is allowed based on storage policy.
    Call this before uploading to check policy compliance.
    """
    result = engine.validate_file_upload(
        company_id=company_id,
        user_id=user_id,
        file_size=file_size,
        file_type=file_type,
        target_storage=target_storage,
    )
    return result
