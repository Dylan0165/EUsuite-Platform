from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, func
from datetime import datetime, timedelta
from typing import Optional, List
import uuid

from app.database import get_db
from app.models import CompanyUser, AuditLog
from app.schemas import AuditLogResponse, AuditLogListResponse
from app.auth import get_admin_user


router = APIRouter(prefix="/audit", tags=["Audit Logs"])


@router.get("/", response_model=AuditLogListResponse)
async def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    user_id: Optional[uuid.UUID] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    search: Optional[str] = None,
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """List audit logs with filtering and pagination."""
    query = select(AuditLog).where(
        AuditLog.company_id == current_user.company_id
    )
    
    # Apply filters
    if action:
        query = query.where(AuditLog.action == action)
    
    if resource_type:
        query = query.where(AuditLog.resource_type == resource_type)
    
    if user_id:
        query = query.where(AuditLog.user_id == user_id)
    
    if start_date:
        query = query.where(AuditLog.created_at >= start_date)
    
    if end_date:
        query = query.where(AuditLog.created_at <= end_date)
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination and ordering
    query = query.order_by(desc(AuditLog.created_at))
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query)
    logs = result.scalars().all()
    
    return AuditLogListResponse(
        logs=[AuditLogResponse.model_validate(log) for log in logs],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/actions")
async def get_available_actions(
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get list of available action types for filtering."""
    result = await db.execute(
        select(AuditLog.action)
        .where(AuditLog.company_id == current_user.company_id)
        .distinct()
    )
    actions = result.scalars().all()
    
    return {"actions": sorted(actions)}


@router.get("/resource-types")
async def get_available_resource_types(
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get list of available resource types for filtering."""
    result = await db.execute(
        select(AuditLog.resource_type)
        .where(AuditLog.company_id == current_user.company_id)
        .distinct()
    )
    resource_types = result.scalars().all()
    
    return {"resource_types": sorted(resource_types)}


@router.get("/stats")
async def get_audit_stats(
    days: int = Query(30, ge=1, le=365),
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get audit log statistics."""
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Total events in period
    result = await db.execute(
        select(func.count()).where(
            AuditLog.company_id == current_user.company_id,
            AuditLog.created_at >= start_date,
        )
    )
    total_events = result.scalar()
    
    # Events by action
    result = await db.execute(
        select(AuditLog.action, func.count())
        .where(
            AuditLog.company_id == current_user.company_id,
            AuditLog.created_at >= start_date,
        )
        .group_by(AuditLog.action)
    )
    by_action = {row[0]: row[1] for row in result.all()}
    
    # Events by resource type
    result = await db.execute(
        select(AuditLog.resource_type, func.count())
        .where(
            AuditLog.company_id == current_user.company_id,
            AuditLog.created_at >= start_date,
        )
        .group_by(AuditLog.resource_type)
    )
    by_resource = {row[0]: row[1] for row in result.all()}
    
    # Most active users
    result = await db.execute(
        select(AuditLog.user_id, func.count())
        .where(
            AuditLog.company_id == current_user.company_id,
            AuditLog.created_at >= start_date,
        )
        .group_by(AuditLog.user_id)
        .order_by(desc(func.count()))
        .limit(10)
    )
    active_users_raw = result.all()
    
    # Get user details
    active_users = []
    for user_id, count in active_users_raw:
        if user_id:
            user_result = await db.execute(
                select(CompanyUser).where(CompanyUser.id == user_id)
            )
            user = user_result.scalar_one_or_none()
            if user:
                active_users.append({
                    "user_id": str(user_id),
                    "email": user.email,
                    "full_name": user.full_name,
                    "event_count": count,
                })
    
    return {
        "period_days": days,
        "total_events": total_events,
        "by_action": by_action,
        "by_resource_type": by_resource,
        "most_active_users": active_users,
    }


@router.get("/user/{user_id}")
async def get_user_audit_history(
    user_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get audit history for a specific user."""
    # Verify user belongs to company
    result = await db.execute(
        select(CompanyUser).where(
            CompanyUser.id == user_id,
            CompanyUser.company_id == current_user.company_id,
        )
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    query = select(AuditLog).where(
        AuditLog.company_id == current_user.company_id,
        AuditLog.user_id == user_id,
    )
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    query = query.order_by(desc(AuditLog.created_at))
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query)
    logs = result.scalars().all()
    
    return {
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
        },
        "logs": [AuditLogResponse.model_validate(log) for log in logs],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/resource/{resource_type}/{resource_id}")
async def get_resource_audit_history(
    resource_type: str,
    resource_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get audit history for a specific resource."""
    query = select(AuditLog).where(
        AuditLog.company_id == current_user.company_id,
        AuditLog.resource_type == resource_type,
        AuditLog.resource_id == resource_id,
    )
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    query = query.order_by(desc(AuditLog.created_at))
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query)
    logs = result.scalars().all()
    
    return {
        "resource_type": resource_type,
        "resource_id": resource_id,
        "logs": [AuditLogResponse.model_validate(log) for log in logs],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/export")
async def export_audit_logs(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    format: str = Query("json", regex="^(json|csv)$"),
    current_user: CompanyUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Export audit logs (max 10,000 records)."""
    query = select(AuditLog).where(
        AuditLog.company_id == current_user.company_id
    )
    
    if start_date:
        query = query.where(AuditLog.created_at >= start_date)
    
    if end_date:
        query = query.where(AuditLog.created_at <= end_date)
    
    query = query.order_by(desc(AuditLog.created_at)).limit(10000)
    
    result = await db.execute(query)
    logs = result.scalars().all()
    
    if format == "csv":
        # Return CSV format
        import io
        import csv
        
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["timestamp", "user_id", "action", "resource_type", "resource_id", "ip_address", "details"])
        
        for log in logs:
            writer.writerow([
                log.created_at.isoformat(),
                str(log.user_id) if log.user_id else "",
                log.action,
                log.resource_type,
                log.resource_id or "",
                log.ip_address or "",
                str(log.details) if log.details else "",
            ])
        
        from fastapi.responses import Response
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=audit_logs_{datetime.utcnow().strftime('%Y%m%d')}.csv"
            }
        )
    else:
        # Return JSON format
        return {
            "export_date": datetime.utcnow().isoformat(),
            "total_records": len(logs),
            "logs": [AuditLogResponse.model_validate(log) for log in logs],
        }
