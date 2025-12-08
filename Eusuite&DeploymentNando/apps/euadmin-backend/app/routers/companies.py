"""
EUAdmin Backend - Company API Routes
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..tenant_database import get_tenant_db
from ..services.company_manager import CompanyManager
from ..schemas_tenant import (
    CompanyCreate, CompanyUpdate, CompanyRegister,
    CompanyResponse, CompanyListResponse, CompanyStatsResponse,
    ErrorResponse
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/companies", tags=["Companies"])


def get_company_manager(db: Session = Depends(get_tenant_db)) -> CompanyManager:
    return CompanyManager(db)


@router.post("", response_model=CompanyResponse, status_code=201)
async def create_company(
    data: CompanyCreate,
    manager: CompanyManager = Depends(get_company_manager),
):
    """Create a new company (admin only)."""
    try:
        company = manager.create_company(data, approved=True)
        return CompanyResponse(
            **{
                **company.__dict__,
                "user_count": 0,
                "storage_used": 0,
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/register", response_model=dict, status_code=201)
async def register_company(
    data: CompanyRegister,
    manager: CompanyManager = Depends(get_company_manager),
):
    """Self-registration for a new company."""
    try:
        company, admin_user, password = manager.register_company(data)
        return {
            "company": CompanyResponse(
                **{
                    **company.__dict__,
                    "user_count": 1,
                    "storage_used": 0,
                }
            ).dict(),
            "admin": {
                "id": admin_user.id,
                "email": admin_user.email,
                "first_name": admin_user.first_name,
                "last_name": admin_user.last_name,
            },
            "message": "Registration successful. Awaiting approval.",
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=CompanyListResponse)
async def list_companies(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    is_approved: Optional[bool] = None,
    manager: CompanyManager = Depends(get_company_manager),
):
    """List all companies with pagination and filters."""
    companies, total = manager.list_companies(
        page=page,
        page_size=page_size,
        search=search,
        is_active=is_active,
        is_approved=is_approved,
    )
    
    return CompanyListResponse(
        companies=[
            CompanyResponse(
                **{
                    **c.__dict__,
                    "user_count": len(c.users) if c.users else 0,
                    "storage_used": sum(u.storage_used or 0 for u in c.users) if c.users else 0,
                }
            )
            for c in companies
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{company_id}", response_model=CompanyResponse)
async def get_company(
    company_id: int,
    manager: CompanyManager = Depends(get_company_manager),
):
    """Get company by ID."""
    company = manager.get_company(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    return CompanyResponse(
        **{
            **company.__dict__,
            "user_count": len(company.users) if company.users else 0,
            "storage_used": sum(u.storage_used or 0 for u in company.users) if company.users else 0,
        }
    )


@router.patch("/{company_id}", response_model=CompanyResponse)
async def update_company(
    company_id: int,
    data: CompanyUpdate,
    manager: CompanyManager = Depends(get_company_manager),
):
    """Update company details."""
    company = manager.update_company(company_id, data)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    return CompanyResponse(
        **{
            **company.__dict__,
            "user_count": len(company.users) if company.users else 0,
            "storage_used": sum(u.storage_used or 0 for u in company.users) if company.users else 0,
        }
    )


@router.post("/{company_id}/approve", response_model=CompanyResponse)
async def approve_company(
    company_id: int,
    approved_by: int = Query(..., description="User ID of approver"),
    manager: CompanyManager = Depends(get_company_manager),
):
    """Approve a company registration."""
    company = manager.approve_company(company_id, approved_by)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    return CompanyResponse(
        **{
            **company.__dict__,
            "user_count": len(company.users) if company.users else 0,
            "storage_used": 0,
        }
    )


@router.post("/{company_id}/suspend", response_model=CompanyResponse)
async def suspend_company(
    company_id: int,
    reason: str = Query(..., description="Suspension reason"),
    manager: CompanyManager = Depends(get_company_manager),
):
    """Suspend a company."""
    company = manager.suspend_company(company_id, reason)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    return CompanyResponse(**company.__dict__)


@router.post("/{company_id}/unsuspend", response_model=CompanyResponse)
async def unsuspend_company(
    company_id: int,
    manager: CompanyManager = Depends(get_company_manager),
):
    """Remove suspension from a company."""
    company = manager.unsuspend_company(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    return CompanyResponse(**company.__dict__)


@router.delete("/{company_id}", status_code=204)
async def delete_company(
    company_id: int,
    manager: CompanyManager = Depends(get_company_manager),
):
    """Delete a company."""
    success = manager.delete_company(company_id)
    if not success:
        raise HTTPException(status_code=404, detail="Company not found")


@router.get("/{company_id}/stats", response_model=CompanyStatsResponse)
async def get_company_stats(
    company_id: int,
    manager: CompanyManager = Depends(get_company_manager),
):
    """Get statistics for a company."""
    stats = manager.get_company_stats(company_id)
    if not stats:
        raise HTTPException(status_code=404, detail="Company not found")
    
    return CompanyStatsResponse(**stats)
