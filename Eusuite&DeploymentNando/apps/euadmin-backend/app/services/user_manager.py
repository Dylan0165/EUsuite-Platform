"""
EUAdmin Backend - User Manager Service
Handles company user CRUD operations.
"""
import logging
import secrets
import string
from datetime import datetime
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from ..models import CompanyUser, Company, UserRole

logger = logging.getLogger(__name__)


class UserManager:
    """Service for managing company users."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_user(
        self,
        company_id: int,
        first_name: str,
        last_name: str,
        email: Optional[str] = None,
        password: Optional[str] = None,
        role: UserRole = UserRole.USER,
        department: Optional[str] = None,
        job_title: Optional[str] = None,
        storage_quota: Optional[int] = None,
    ) -> Tuple[CompanyUser, str, str]:
        """
        Create a new company user.
        Returns (user, generated_email, generated_password)
        """
        # Generate email if not provided
        generated_email = email or self._generate_email(first_name, last_name)
        
        # Check for existing user with same email in company
        existing = self.db.query(CompanyUser).filter(
            CompanyUser.company_id == company_id,
            CompanyUser.email == generated_email
        ).first()
        
        if existing:
            # Add number suffix to make unique
            base_email = generated_email.replace('@EUmail.eu', '')
            counter = 1
            while existing:
                generated_email = f"{base_email}{counter}@EUmail.eu"
                existing = self.db.query(CompanyUser).filter(
                    CompanyUser.company_id == company_id,
                    CompanyUser.email == generated_email
                ).first()
                counter += 1
        
        # Generate password if not provided
        generated_password = password or self._generate_password()
        
        # Get company for default quota
        company = self.db.query(Company).filter(Company.id == company_id).first()
        if not company:
            raise ValueError(f"Company {company_id} not found")
        
        default_quota = 5 * 1024 * 1024 * 1024  # 5GB
        if company.storage_policy:
            default_quota = company.storage_policy.default_user_quota
        
        user = CompanyUser(
            company_id=company_id,
            first_name=first_name,
            last_name=last_name,
            email=generated_email,
            password_hash=self._hash_password(generated_password),
            role=role,
            department=department,
            job_title=job_title,
            storage_quota=storage_quota or default_quota,
            is_active=True,
            is_verified=False,
        )
        
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        logger.info(f"Created user: {generated_email} for company: {company_id}")
        return user, generated_email, generated_password
    
    def get_user(self, user_id: int) -> Optional[CompanyUser]:
        """Get user by ID."""
        return self.db.query(CompanyUser).filter(CompanyUser.id == user_id).first()
    
    def get_user_by_email(self, email: str, company_id: Optional[int] = None) -> Optional[CompanyUser]:
        """Get user by email, optionally within a specific company."""
        query = self.db.query(CompanyUser).filter(CompanyUser.email == email)
        if company_id:
            query = query.filter(CompanyUser.company_id == company_id)
        return query.first()
    
    def list_users(
        self,
        company_id: int,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        role: Optional[UserRole] = None,
        is_active: Optional[bool] = None,
    ) -> Tuple[List[CompanyUser], int]:
        """List users for a company with pagination and filters."""
        query = self.db.query(CompanyUser).filter(CompanyUser.company_id == company_id)
        
        if search:
            search_filter = f"%{search}%"
            query = query.filter(
                or_(
                    CompanyUser.first_name.ilike(search_filter),
                    CompanyUser.last_name.ilike(search_filter),
                    CompanyUser.email.ilike(search_filter),
                )
            )
        
        if role:
            query = query.filter(CompanyUser.role == role)
        
        if is_active is not None:
            query = query.filter(CompanyUser.is_active == is_active)
        
        total = query.count()
        
        users = query.order_by(CompanyUser.created_at.desc()) \
            .offset((page - 1) * page_size) \
            .limit(page_size) \
            .all()
        
        return users, total
    
    def update_user(
        self,
        user_id: int,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        role: Optional[UserRole] = None,
        department: Optional[str] = None,
        job_title: Optional[str] = None,
        phone: Optional[str] = None,
        is_active: Optional[bool] = None,
        storage_quota: Optional[int] = None,
    ) -> Optional[CompanyUser]:
        """Update user details."""
        user = self.get_user(user_id)
        if not user:
            return None
        
        if first_name is not None:
            user.first_name = first_name
        if last_name is not None:
            user.last_name = last_name
        if role is not None:
            user.role = role
        if department is not None:
            user.department = department
        if job_title is not None:
            user.job_title = job_title
        if phone is not None:
            user.phone = phone
        if is_active is not None:
            user.is_active = is_active
        if storage_quota is not None:
            user.storage_quota = storage_quota
        
        user.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(user)
        
        logger.info(f"Updated user: {user_id}")
        return user
    
    def reset_password(self, user_id: int) -> Tuple[Optional[CompanyUser], str]:
        """Reset user password and return new password."""
        user = self.get_user(user_id)
        if not user:
            return None, ""
        
        new_password = self._generate_password()
        user.password_hash = self._hash_password(new_password)
        user.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(user)
        
        logger.info(f"Reset password for user: {user_id}")
        return user, new_password
    
    def delete_user(self, user_id: int) -> bool:
        """Delete a user."""
        user = self.get_user(user_id)
        if not user:
            return False
        
        self.db.delete(user)
        self.db.commit()
        
        logger.info(f"Deleted user: {user_id}")
        return True
    
    def verify_password(self, user: CompanyUser, password: str) -> bool:
        """Verify user password."""
        from argon2 import PasswordHasher
        from argon2.exceptions import VerifyMismatchError
        
        ph = PasswordHasher()
        try:
            ph.verify(user.password_hash, password)
            return True
        except VerifyMismatchError:
            return False
    
    def record_login(self, user_id: int) -> Optional[CompanyUser]:
        """Record a successful login."""
        user = self.get_user(user_id)
        if not user:
            return None
        
        user.last_login = datetime.utcnow()
        user.login_count = (user.login_count or 0) + 1
        user.failed_login_attempts = 0
        
        self.db.commit()
        self.db.refresh(user)
        
        return user
    
    def record_failed_login(self, user_id: int) -> Optional[CompanyUser]:
        """Record a failed login attempt."""
        user = self.get_user(user_id)
        if not user:
            return None
        
        user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
        
        # Lock account after 5 failed attempts
        if user.failed_login_attempts >= 5:
            from datetime import timedelta
            user.locked_until = datetime.utcnow() + timedelta(minutes=30)
        
        self.db.commit()
        self.db.refresh(user)
        
        return user
    
    def get_company_admins(self, company_id: int) -> List[CompanyUser]:
        """Get all admins for a company."""
        return self.db.query(CompanyUser).filter(
            CompanyUser.company_id == company_id,
            CompanyUser.role == UserRole.COMPANY_ADMIN,
            CompanyUser.is_active == True
        ).all()
    
    # =========================================================================
    # HELPER METHODS
    # =========================================================================
    
    def _generate_email(self, first_name: str, last_name: str) -> str:
        """Generate email in format voornaam.achternaam@EUmail.eu"""
        first = first_name.lower().replace(' ', '').replace('.', '')
        last = last_name.lower().replace(' ', '').replace('.', '')
        # Remove special characters
        first = ''.join(c for c in first if c.isalnum())
        last = ''.join(c for c in last if c.isalnum())
        return f"{first}.{last}@EUmail.eu"
    
    def _generate_password(self, length: int = 12) -> str:
        """Generate a secure random password."""
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        # Ensure at least one of each type
        password = [
            secrets.choice(string.ascii_uppercase),
            secrets.choice(string.ascii_lowercase),
            secrets.choice(string.digits),
            secrets.choice("!@#$%^&*"),
        ]
        password += [secrets.choice(alphabet) for _ in range(length - 4)]
        secrets.SystemRandom().shuffle(password)
        return ''.join(password)
    
    def _hash_password(self, password: str) -> str:
        """Hash password using argon2."""
        from argon2 import PasswordHasher
        ph = PasswordHasher()
        return ph.hash(password)
