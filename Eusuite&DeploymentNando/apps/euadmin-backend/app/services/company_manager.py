"""
EUAdmin Backend - Company Manager Service
Handles company/tenant CRUD operations.
"""
import logging
import re
import secrets
import string
from datetime import datetime
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from ..models import (
    Company, CompanyUser, CompanyBranding, CompanyStoragePolicy,
    CompanyService, DeploymentTarget, UserRole, StoragePolicyType, ServiceType
)
from ..schemas_tenant import (
    CompanyCreate, CompanyUpdate, CompanyRegister,
    CompanyUserCreate, CompanyUserUpdate
)

logger = logging.getLogger(__name__)


class CompanyManager:
    """Service for managing companies/tenants."""
    
    def __init__(self, db: Session):
        self.db = db
    
    # =========================================================================
    # COMPANY OPERATIONS
    # =========================================================================
    
    def create_company(self, data: CompanyCreate, approved: bool = False) -> Company:
        """Create a new company."""
        # Generate slug if not provided
        slug = data.slug or self._generate_slug(data.name)
        
        # Check for existing slug
        existing = self.db.query(Company).filter(Company.slug == slug).first()
        if existing:
            raise ValueError(f"Company with slug '{slug}' already exists")
        
        # Generate namespace
        namespace = f"tenant-{slug}"
        
        company = Company(
            name=data.name,
            slug=slug,
            description=data.description,
            contact_email=data.contact_email,
            contact_phone=data.contact_phone,
            billing_email=data.billing_email,
            deployment_target=DeploymentTarget(data.deployment_target),
            namespace=namespace,
            is_approved=approved,
            approved_at=datetime.utcnow() if approved else None,
        )
        
        self.db.add(company)
        self.db.flush()  # Get the ID
        
        # Create default branding
        self._create_default_branding(company)
        
        # Create default storage policy
        self._create_default_storage_policy(company)
        
        # Create default services
        self._create_default_services(company)
        
        self.db.commit()
        self.db.refresh(company)
        
        logger.info(f"Created company: {company.name} (id={company.id}, namespace={company.namespace})")
        return company
    
    def register_company(self, data: CompanyRegister) -> Tuple[Company, CompanyUser, str]:
        """
        Self-registration for a new company.
        Creates company + admin user, returns generated password.
        """
        # Create company
        company_data = CompanyCreate(
            name=data.company_name,
            contact_email=data.contact_email,
            contact_phone=data.contact_phone,
            description=data.description,
        )
        company = self.create_company(company_data, approved=False)
        
        # Create admin user
        admin_email = data.admin_email or self._generate_email(data.admin_first_name, data.admin_last_name)
        
        admin_user = CompanyUser(
            company_id=company.id,
            first_name=data.admin_first_name,
            last_name=data.admin_last_name,
            email=admin_email,
            password_hash=self._hash_password(data.password),
            role=UserRole.COMPANY_ADMIN,
            is_verified=True,  # Admin is pre-verified
        )
        
        self.db.add(admin_user)
        self.db.commit()
        self.db.refresh(admin_user)
        
        logger.info(f"Registered company: {company.name} with admin: {admin_email}")
        return company, admin_user, data.password
    
    def get_company(self, company_id: int) -> Optional[Company]:
        """Get company by ID."""
        return self.db.query(Company).filter(Company.id == company_id).first()
    
    def get_company_by_slug(self, slug: str) -> Optional[Company]:
        """Get company by slug."""
        return self.db.query(Company).filter(Company.slug == slug).first()
    
    def get_company_by_namespace(self, namespace: str) -> Optional[Company]:
        """Get company by Kubernetes namespace."""
        return self.db.query(Company).filter(Company.namespace == namespace).first()
    
    def list_companies(
        self,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        is_active: Optional[bool] = None,
        is_approved: Optional[bool] = None,
    ) -> Tuple[List[Company], int]:
        """List companies with pagination and filters."""
        query = self.db.query(Company)
        
        if search:
            search_filter = f"%{search}%"
            query = query.filter(
                or_(
                    Company.name.ilike(search_filter),
                    Company.slug.ilike(search_filter),
                    Company.contact_email.ilike(search_filter),
                )
            )
        
        if is_active is not None:
            query = query.filter(Company.is_active == is_active)
        
        if is_approved is not None:
            query = query.filter(Company.is_approved == is_approved)
        
        total = query.count()
        
        companies = query.order_by(Company.created_at.desc()) \
            .offset((page - 1) * page_size) \
            .limit(page_size) \
            .all()
        
        return companies, total
    
    def update_company(self, company_id: int, data: CompanyUpdate) -> Optional[Company]:
        """Update company details."""
        company = self.get_company(company_id)
        if not company:
            return None
        
        update_data = data.dict(exclude_unset=True)
        for field, value in update_data.items():
            if value is not None:
                if field == 'deployment_target':
                    value = DeploymentTarget(value)
                setattr(company, field, value)
        
        company.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(company)
        
        logger.info(f"Updated company: {company.id}")
        return company
    
    def approve_company(self, company_id: int, approved_by: int) -> Optional[Company]:
        """Approve a company registration."""
        company = self.get_company(company_id)
        if not company:
            return None
        
        company.is_approved = True
        company.approved_at = datetime.utcnow()
        company.approved_by = approved_by
        company.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(company)
        
        logger.info(f"Approved company: {company.id} by user: {approved_by}")
        return company
    
    def suspend_company(self, company_id: int, reason: str) -> Optional[Company]:
        """Suspend a company."""
        company = self.get_company(company_id)
        if not company:
            return None
        
        company.is_suspended = True
        company.suspension_reason = reason
        company.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(company)
        
        logger.info(f"Suspended company: {company.id}, reason: {reason}")
        return company
    
    def unsuspend_company(self, company_id: int) -> Optional[Company]:
        """Remove suspension from a company."""
        company = self.get_company(company_id)
        if not company:
            return None
        
        company.is_suspended = False
        company.suspension_reason = None
        company.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(company)
        
        logger.info(f"Unsuspended company: {company.id}")
        return company
    
    def delete_company(self, company_id: int) -> bool:
        """Delete a company and all related data."""
        company = self.get_company(company_id)
        if not company:
            return False
        
        self.db.delete(company)
        self.db.commit()
        
        logger.info(f"Deleted company: {company_id}")
        return True
    
    def get_company_stats(self, company_id: int) -> dict:
        """Get statistics for a company."""
        company = self.get_company(company_id)
        if not company:
            return {}
        
        user_count = self.db.query(func.count(CompanyUser.id)) \
            .filter(CompanyUser.company_id == company_id).scalar() or 0
        
        active_users = self.db.query(func.count(CompanyUser.id)) \
            .filter(CompanyUser.company_id == company_id, CompanyUser.is_active == True).scalar() or 0
        
        storage_used = self.db.query(func.sum(CompanyUser.storage_used)) \
            .filter(CompanyUser.company_id == company_id).scalar() or 0
        
        storage_quota = company.storage_policy.total_storage_quota if company.storage_policy else 0
        
        deployed_services = self.db.query(func.count(CompanyService.id)) \
            .filter(CompanyService.company_id == company_id, CompanyService.is_deployed == True).scalar() or 0
        
        total_services = self.db.query(func.count(CompanyService.id)) \
            .filter(CompanyService.company_id == company_id, CompanyService.is_enabled == True).scalar() or 0
        
        return {
            "company_id": company_id,
            "company_name": company.name,
            "user_count": user_count,
            "active_users": active_users,
            "storage_used": storage_used,
            "storage_quota": storage_quota,
            "storage_percentage": (storage_used / storage_quota * 100) if storage_quota > 0 else 0,
            "deployed_services": deployed_services,
            "total_services": total_services,
        }
    
    # =========================================================================
    # HELPER METHODS
    # =========================================================================
    
    def _generate_slug(self, name: str) -> str:
        """Generate URL-friendly slug from company name."""
        slug = name.lower()
        slug = re.sub(r'[^a-z0-9\s-]', '', slug)
        slug = re.sub(r'[\s_]+', '-', slug)
        slug = re.sub(r'-+', '-', slug)
        slug = slug.strip('-')
        return slug[:100]  # Max 100 chars
    
    def _generate_email(self, first_name: str, last_name: str) -> str:
        """Generate email in format voornaam.achternaam@EUmail.eu"""
        first = first_name.lower().replace(' ', '').replace('.', '')
        last = last_name.lower().replace(' ', '').replace('.', '')
        return f"{first}.{last}@EUmail.eu"
    
    def _generate_password(self, length: int = 12) -> str:
        """Generate a secure random password."""
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        return ''.join(secrets.choice(alphabet) for _ in range(length))
    
    def _hash_password(self, password: str) -> str:
        """Hash password using argon2."""
        from argon2 import PasswordHasher
        ph = PasswordHasher()
        return ph.hash(password)
    
    def _create_default_branding(self, company: Company):
        """Create default branding for a company."""
        branding = CompanyBranding(
            company_id=company.id,
            company_display_name=company.name,
        )
        self.db.add(branding)
    
    def _create_default_storage_policy(self, company: Company):
        """Create default storage policy for a company."""
        policy = CompanyStoragePolicy(
            company_id=company.id,
            policy_type=StoragePolicyType.EUSUITE_ONLY,
        )
        self.db.add(policy)
    
    def _create_default_services(self, company: Company):
        """Create default service configurations for a company."""
        default_services = [
            (ServiceType.DASHBOARD, "dashboard", 80, "dylan016504/dashboard"),
            (ServiceType.LOGIN, "login", 80, "dylan016504/login"),
            (ServiceType.EUCLOUD, "eucloud-frontend", 80, "dylan016504/eucloud-frontend"),
            (ServiceType.EUTYPE, "eutype", 80, "dylan016504/eutype"),
            (ServiceType.EUMAIL, "eumail-frontend", 80, "dylan016504/eumail-frontend"),
            (ServiceType.EUGROUPS, "eugroups-frontend", 80, "dylan016504/eugroups-frontend"),
        ]
        
        for svc_type, name_suffix, port, image in default_services:
            service = CompanyService(
                company_id=company.id,
                service_type=svc_type,
                service_name=f"{company.slug}-{name_suffix}",
                internal_port=port,
                image_repository=image,
                is_enabled=True,
            )
            self.db.add(service)
