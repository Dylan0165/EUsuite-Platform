from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import uuid

from app.database import get_db
from app.models import CompanyUser, Department, AuditLog
from app.schemas import (
    DepartmentCreate, DepartmentUpdate, DepartmentResponse, DepartmentListResponse
)
from app.auth import get_current_user, get_admin_user


router = APIRouter(prefix="/departments", tags=["Departments"])


@router.get("/", response_model=DepartmentListResponse)
async def list_departments(
    current_user: CompanyUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all departments for the company."""
    result = await db.execute(
        select(Department)
        .where(
            Department.company_id == current_user.company_id,
            Department.is_active == True,
        )
        .order_by(Department.name)
    )
    departments = result.scalars().all()
    
    return DepartmentListResponse(
        departments=[DepartmentResponse.model_validate(d) for d in departments],
        total=len(departments),
    )


@router.post("/", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
async def create_department(
    department_data: DepartmentCreate,
    request: Request,
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new department."""
    # Check for duplicate name
    result = await db.execute(
        select(Department).where(
            Department.company_id == current_user.company_id,
            Department.name == department_data.name,
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Department with this name already exists",
        )
    
    # Validate parent if provided
    if department_data.parent_id:
        result = await db.execute(
            select(Department).where(
                Department.id == department_data.parent_id,
                Department.company_id == current_user.company_id,
            )
        )
        if not result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Parent department not found",
            )
    
    department = Department(
        company_id=current_user.company_id,
        name=department_data.name,
        description=department_data.description,
        parent_id=department_data.parent_id,
        manager_id=department_data.manager_id,
    )
    
    db.add(department)
    
    # Audit log
    audit_log = AuditLog(
        company_id=current_user.company_id,
        user_id=current_user.id,
        action="department_created",
        resource_type="department",
        resource_id=str(department.id),
        details={"name": department_data.name},
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit_log)
    
    await db.commit()
    await db.refresh(department)
    
    return DepartmentResponse.model_validate(department)


@router.get("/{department_id}", response_model=DepartmentResponse)
async def get_department(
    department_id: uuid.UUID,
    current_user: CompanyUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific department."""
    result = await db.execute(
        select(Department).where(
            Department.id == department_id,
            Department.company_id == current_user.company_id,
        )
    )
    department = result.scalar_one_or_none()
    
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    
    return DepartmentResponse.model_validate(department)


@router.put("/{department_id}", response_model=DepartmentResponse)
async def update_department(
    department_id: uuid.UUID,
    department_data: DepartmentUpdate,
    request: Request,
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a department."""
    result = await db.execute(
        select(Department).where(
            Department.id == department_id,
            Department.company_id == current_user.company_id,
        )
    )
    department = result.scalar_one_or_none()
    
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    
    update_data = department_data.model_dump(exclude_unset=True)
    
    # Check for duplicate name
    if "name" in update_data:
        result = await db.execute(
            select(Department).where(
                Department.company_id == current_user.company_id,
                Department.name == update_data["name"],
                Department.id != department_id,
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Department with this name already exists",
            )
    
    # Validate parent if changing
    if "parent_id" in update_data and update_data["parent_id"]:
        if update_data["parent_id"] == department_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Department cannot be its own parent",
            )
        
        result = await db.execute(
            select(Department).where(
                Department.id == update_data["parent_id"],
                Department.company_id == current_user.company_id,
            )
        )
        if not result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Parent department not found",
            )
    
    for field, value in update_data.items():
        setattr(department, field, value)
    
    # Audit log
    audit_log = AuditLog(
        company_id=current_user.company_id,
        user_id=current_user.id,
        action="department_updated",
        resource_type="department",
        resource_id=str(department_id),
        details=update_data,
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit_log)
    
    await db.commit()
    await db.refresh(department)
    
    return DepartmentResponse.model_validate(department)


@router.delete("/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_department(
    department_id: uuid.UUID,
    request: Request,
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Deactivate a department (soft delete)."""
    result = await db.execute(
        select(Department).where(
            Department.id == department_id,
            Department.company_id == current_user.company_id,
        )
    )
    department = result.scalar_one_or_none()
    
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    
    # Check for child departments
    result = await db.execute(
        select(Department).where(
            Department.parent_id == department_id,
            Department.is_active == True,
        )
    )
    if result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete department with child departments",
        )
    
    # Check for users in department
    result = await db.execute(
        select(CompanyUser).where(
            CompanyUser.department_id == department_id,
            CompanyUser.is_active == True,
        )
    )
    if result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete department with active users",
        )
    
    department.is_active = False
    
    # Audit log
    audit_log = AuditLog(
        company_id=current_user.company_id,
        user_id=current_user.id,
        action="department_deleted",
        resource_type="department",
        resource_id=str(department_id),
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit_log)
    
    await db.commit()


@router.get("/{department_id}/users", response_model=list)
async def get_department_users(
    department_id: uuid.UUID,
    current_user: CompanyUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all users in a department."""
    result = await db.execute(
        select(Department).where(
            Department.id == department_id,
            Department.company_id == current_user.company_id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Department not found")
    
    result = await db.execute(
        select(CompanyUser).where(
            CompanyUser.department_id == department_id,
            CompanyUser.is_active == True,
        )
    )
    users = result.scalars().all()
    
    return [
        {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value,
        }
        for user in users
    ]


@router.get("/{department_id}/tree")
async def get_department_tree(
    department_id: uuid.UUID,
    current_user: CompanyUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get department hierarchy tree starting from this department."""
    result = await db.execute(
        select(Department).where(
            Department.id == department_id,
            Department.company_id == current_user.company_id,
        )
    )
    department = result.scalar_one_or_none()
    
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    
    async def build_tree(dept_id: uuid.UUID) -> dict:
        result = await db.execute(
            select(Department).where(Department.id == dept_id)
        )
        dept = result.scalar_one()
        
        result = await db.execute(
            select(Department).where(
                Department.parent_id == dept_id,
                Department.is_active == True,
            )
        )
        children = result.scalars().all()
        
        return {
            "id": str(dept.id),
            "name": dept.name,
            "description": dept.description,
            "children": [await build_tree(child.id) for child in children],
        }
    
    return await build_tree(department_id)
