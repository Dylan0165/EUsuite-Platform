from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from ..database import get_db
from ..models import AuditLog, AdminUser
from ..schemas import AuditLogResponse, PaginatedResponse
from ..auth import get_current_admin, require_admin

router = APIRouter(prefix="/audit", tags=["Audit Logs"])


@router.get("", response_model=PaginatedResponse)
async def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    admin_user_id: Optional[int] = None,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    current_admin: AdminUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List audit logs with pagination and filtering"""
    query = select(AuditLog)
    count_query = select(func.count(AuditLog.id))
    
    if admin_user_id:
        query = query.where(AuditLog.admin_user_id == admin_user_id)
        count_query = count_query.where(AuditLog.admin_user_id == admin_user_id)
    
    if action:
        query = query.where(AuditLog.action.ilike(f"%{action}%"))
        count_query = count_query.where(AuditLog.action.ilike(f"%{action}%"))
    
    if resource_type:
        query = query.where(AuditLog.resource_type == resource_type)
        count_query = count_query.where(AuditLog.resource_type == resource_type)
    
    if status_filter:
        query = query.where(AuditLog.status == status_filter)
        count_query = count_query.where(AuditLog.status == status_filter)
    
    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Get paginated results
    offset = (page - 1) * page_size
    query = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    logs = result.scalars().all()
    
    return PaginatedResponse(
        items=[AuditLogResponse.model_validate(log) for log in logs],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/actions")
async def list_action_types(
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get list of unique action types"""
    result = await db.execute(
        select(AuditLog.action).distinct().order_by(AuditLog.action)
    )
    actions = [row[0] for row in result.fetchall()]
    return {"actions": actions}


@router.get("/resource-types")
async def list_resource_types(
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get list of unique resource types"""
    result = await db.execute(
        select(AuditLog.resource_type).distinct().order_by(AuditLog.resource_type)
    )
    types = [row[0] for row in result.fetchall()]
    return {"resource_types": types}


@router.get("/stats")
async def get_audit_stats(
    current_admin: AdminUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get audit log statistics"""
    # Total logs
    total_result = await db.execute(select(func.count(AuditLog.id)))
    total_logs = total_result.scalar()
    
    # Logs by status
    success_result = await db.execute(
        select(func.count(AuditLog.id)).where(AuditLog.status == "success")
    )
    success_count = success_result.scalar()
    
    failed_result = await db.execute(
        select(func.count(AuditLog.id)).where(AuditLog.status == "failed")
    )
    failed_count = failed_result.scalar()
    
    # Most common actions
    actions_result = await db.execute(
        select(AuditLog.action, func.count(AuditLog.id).label("count"))
        .group_by(AuditLog.action)
        .order_by(func.count(AuditLog.id).desc())
        .limit(10)
    )
    top_actions = [{"action": row[0], "count": row[1]} for row in actions_result.fetchall()]
    
    return {
        "total_logs": total_logs,
        "success_count": success_count,
        "failed_count": failed_count,
        "top_actions": top_actions,
    }
