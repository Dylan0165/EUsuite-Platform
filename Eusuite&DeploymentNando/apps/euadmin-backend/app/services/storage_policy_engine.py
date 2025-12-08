"""
EUAdmin Backend - Storage Policy Engine Service
Handles storage policies and file upload validation.
"""
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..models import CompanyStoragePolicy, Company, CompanyUser, StoragePolicyType

logger = logging.getLogger(__name__)


class StoragePolicyEngine:
    """Service for managing storage policies."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_policy(self, company_id: int) -> Optional[CompanyStoragePolicy]:
        """Get storage policy for a company."""
        return self.db.query(CompanyStoragePolicy).filter(
            CompanyStoragePolicy.company_id == company_id
        ).first()
    
    def get_policy_by_namespace(self, namespace: str) -> Optional[CompanyStoragePolicy]:
        """Get storage policy by Kubernetes namespace."""
        company = self.db.query(Company).filter(Company.namespace == namespace).first()
        if not company:
            return None
        return self.get_policy(company.id)
    
    def update_policy(
        self,
        company_id: int,
        policy_type: Optional[StoragePolicyType] = None,
        total_storage_quota: Optional[int] = None,
        max_file_size: Optional[int] = None,
        default_user_quota: Optional[int] = None,
        file_retention_days: Optional[int] = None,
        trash_retention_days: Optional[int] = None,
        backup_enabled: Optional[bool] = None,
        backup_frequency_hours: Optional[int] = None,
        backup_retention_days: Optional[int] = None,
        encryption_enabled: Optional[bool] = None,
        allowed_file_types: Optional[List[str]] = None,
        blocked_file_types: Optional[List[str]] = None,
        company_storage_endpoint: Optional[str] = None,
        company_storage_bucket: Optional[str] = None,
        company_storage_access_key: Optional[str] = None,
        company_storage_secret_key: Optional[str] = None,
        company_storage_region: Optional[str] = None,
    ) -> Optional[CompanyStoragePolicy]:
        """Update company storage policy."""
        policy = self.get_policy(company_id)
        if not policy:
            # Create new policy
            policy = CompanyStoragePolicy(company_id=company_id)
            self.db.add(policy)
        
        if policy_type is not None:
            policy.policy_type = policy_type
        if total_storage_quota is not None:
            policy.total_storage_quota = total_storage_quota
        if max_file_size is not None:
            policy.max_file_size = max_file_size
        if default_user_quota is not None:
            policy.default_user_quota = default_user_quota
        if file_retention_days is not None:
            policy.file_retention_days = file_retention_days
        if trash_retention_days is not None:
            policy.trash_retention_days = trash_retention_days
        if backup_enabled is not None:
            policy.backup_enabled = backup_enabled
        if backup_frequency_hours is not None:
            policy.backup_frequency_hours = backup_frequency_hours
        if backup_retention_days is not None:
            policy.backup_retention_days = backup_retention_days
        if encryption_enabled is not None:
            policy.encryption_enabled = encryption_enabled
        if allowed_file_types is not None:
            policy.allowed_file_types = allowed_file_types
        if blocked_file_types is not None:
            policy.blocked_file_types = blocked_file_types
        if company_storage_endpoint is not None:
            policy.company_storage_endpoint = company_storage_endpoint
        if company_storage_bucket is not None:
            policy.company_storage_bucket = company_storage_bucket
        if company_storage_access_key is not None:
            policy.company_storage_access_key = company_storage_access_key
        if company_storage_secret_key is not None:
            policy.company_storage_secret_key = company_storage_secret_key
        if company_storage_region is not None:
            policy.company_storage_region = company_storage_region
        
        policy.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(policy)
        
        logger.info(f"Updated storage policy for company: {company_id}")
        return policy
    
    def validate_file_upload(
        self,
        company_id: int,
        user_id: int,
        file_size: int,
        file_type: str,
        target_storage: str = "eusuite",  # "eusuite", "company", "local"
    ) -> Dict[str, Any]:
        """
        Validate if a file upload is allowed based on policy.
        Returns validation result with details.
        """
        policy = self.get_policy(company_id)
        if not policy:
            return {
                "allowed": False,
                "reason": "No storage policy configured for company",
            }
        
        # Check policy type restrictions
        if policy.policy_type == StoragePolicyType.COMPANY_ONLY and target_storage == "eusuite":
            return {
                "allowed": False,
                "reason": "Company policy prohibits storage on EUSuite cloud",
                "policy_type": policy.policy_type.value,
            }
        
        if policy.policy_type == StoragePolicyType.EUSUITE_ONLY and target_storage == "company":
            return {
                "allowed": False,
                "reason": "Company policy requires storage on EUSuite cloud",
                "policy_type": policy.policy_type.value,
            }
        
        # Check file size
        if file_size > policy.max_file_size:
            return {
                "allowed": False,
                "reason": f"File size exceeds maximum allowed ({self._format_size(policy.max_file_size)})",
                "max_size": policy.max_file_size,
            }
        
        # Check file type
        file_ext = file_type.lower().lstrip('.')
        
        if policy.blocked_file_types and file_ext in policy.blocked_file_types:
            return {
                "allowed": False,
                "reason": f"File type '{file_ext}' is blocked by company policy",
            }
        
        if policy.allowed_file_types and file_ext not in policy.allowed_file_types:
            return {
                "allowed": False,
                "reason": f"File type '{file_ext}' is not in allowed types",
            }
        
        # Check user quota
        user = self.db.query(CompanyUser).filter(CompanyUser.id == user_id).first()
        if user:
            if user.storage_used + file_size > user.storage_quota:
                return {
                    "allowed": False,
                    "reason": "User storage quota exceeded",
                    "storage_used": user.storage_used,
                    "storage_quota": user.storage_quota,
                }
        
        # Check company quota
        total_used = self.db.query(func.sum(CompanyUser.storage_used)) \
            .filter(CompanyUser.company_id == company_id).scalar() or 0
        
        if total_used + file_size > policy.total_storage_quota:
            return {
                "allowed": False,
                "reason": "Company storage quota exceeded",
                "company_storage_used": total_used,
                "company_storage_quota": policy.total_storage_quota,
            }
        
        # All checks passed
        return {
            "allowed": True,
            "policy_type": policy.policy_type.value,
            "encryption_enabled": policy.encryption_enabled,
            "target_storage": target_storage,
        }
    
    def get_storage_options(self, company_id: int) -> Dict[str, Any]:
        """Get available storage options for a company based on policy."""
        policy = self.get_policy(company_id)
        if not policy:
            return {
                "options": ["eusuite"],
                "default": "eusuite",
                "policy_type": "eusuite_only",
            }
        
        options = []
        default = "eusuite"
        
        if policy.policy_type == StoragePolicyType.COMPANY_ONLY:
            options = ["company", "local"]
            default = "company"
        elif policy.policy_type == StoragePolicyType.EUSUITE_ONLY:
            options = ["eusuite"]
            default = "eusuite"
        elif policy.policy_type == StoragePolicyType.HYBRID:
            options = ["eusuite", "company", "local"]
            default = "eusuite"
            if policy.company_storage_endpoint:
                default = "company"
        
        return {
            "options": options,
            "default": default,
            "policy_type": policy.policy_type.value,
            "has_company_storage": bool(policy.company_storage_endpoint),
        }
    
    def get_storage_stats(self, company_id: int) -> Dict[str, Any]:
        """Get storage statistics for a company."""
        policy = self.get_policy(company_id)
        if not policy:
            return {}
        
        total_used = self.db.query(func.sum(CompanyUser.storage_used)) \
            .filter(CompanyUser.company_id == company_id).scalar() or 0
        
        user_count = self.db.query(func.count(CompanyUser.id)) \
            .filter(CompanyUser.company_id == company_id).scalar() or 0
        
        return {
            "total_quota": policy.total_storage_quota,
            "total_quota_gb": round(policy.total_storage_quota / (1024**3), 2),
            "total_used": total_used,
            "total_used_gb": round(total_used / (1024**3), 2),
            "percentage_used": round((total_used / policy.total_storage_quota) * 100, 1) if policy.total_storage_quota > 0 else 0,
            "available": policy.total_storage_quota - total_used,
            "available_gb": round((policy.total_storage_quota - total_used) / (1024**3), 2),
            "user_count": user_count,
            "default_user_quota": policy.default_user_quota,
            "default_user_quota_gb": round(policy.default_user_quota / (1024**3), 2),
            "max_file_size": policy.max_file_size,
            "max_file_size_mb": round(policy.max_file_size / (1024**2), 1),
        }
    
    def _format_size(self, size_bytes: int) -> str:
        """Format bytes to human readable string."""
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size_bytes < 1024:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024
        return f"{size_bytes:.1f} PB"
