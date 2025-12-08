from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from ..database import get_db
from ..models import (
    Tenant, TenantStatus, SubscriptionStatus, TenantDeployment,
    Invoice, InvoiceStatus, SupportTicket, AdminUser, Plan, PlatformMetrics
)
from ..schemas import DashboardStats, RevenueByMonth, TenantGrowth
from ..auth import get_current_admin, require_admin
from datetime import datetime, timedelta

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get dashboard statistics"""
    # Total tenants
    total_tenants_result = await db.execute(select(func.count(Tenant.id)))
    total_tenants = total_tenants_result.scalar()
    
    # Active tenants
    active_tenants_result = await db.execute(
        select(func.count(Tenant.id)).where(Tenant.status == TenantStatus.ACTIVE)
    )
    active_tenants = active_tenants_result.scalar()
    
    # Total users (sum of current_users from all tenants)
    total_users_result = await db.execute(
        select(func.sum(Tenant.current_users))
    )
    total_users = total_users_result.scalar() or 0
    
    # Calculate MRR (Monthly Recurring Revenue)
    mrr_result = await db.execute(
        select(func.sum(Plan.price_monthly))
        .join(Tenant, Tenant.plan_id == Plan.id)
        .where(
            (Tenant.subscription_status == SubscriptionStatus.ACTIVE) |
            (Tenant.subscription_status == SubscriptionStatus.TRIAL)
        )
    )
    mrr = mrr_result.scalar() or 0
    
    # ARR is MRR * 12
    arr = mrr * 12
    
    # Total storage
    storage_result = await db.execute(
        select(func.sum(Tenant.current_storage_bytes))
    )
    total_storage_bytes = storage_result.scalar() or 0
    total_storage_gb = total_storage_bytes / (1024 ** 3)
    
    # Open tickets
    open_tickets_result = await db.execute(
        select(func.count(SupportTicket.id)).where(
            SupportTicket.status.in_(["open", "in_progress", "waiting"])
        )
    )
    open_tickets = open_tickets_result.scalar()
    
    # Pending invoices
    pending_invoices_result = await db.execute(
        select(func.count(Invoice.id)).where(
            Invoice.status.in_([InvoiceStatus.PENDING, InvoiceStatus.OVERDUE])
        )
    )
    pending_invoices = pending_invoices_result.scalar()
    
    return DashboardStats(
        total_tenants=total_tenants,
        active_tenants=active_tenants,
        total_users=total_users,
        mrr=mrr,
        arr=arr,
        total_storage_gb=round(total_storage_gb, 2),
        open_tickets=open_tickets,
        pending_invoices=pending_invoices,
    )


@router.get("/revenue-by-month")
async def get_revenue_by_month(
    months: int = Query(12, ge=1, le=24),
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get revenue breakdown by month"""
    # This would typically aggregate from invoices
    # For now, return mock data structure
    result = []
    now = datetime.utcnow()
    
    for i in range(months - 1, -1, -1):
        month_date = now - timedelta(days=30 * i)
        month_str = month_date.strftime("%Y-%m")
        
        # Get paid invoices for this month
        start_of_month = month_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if month_date.month == 12:
            end_of_month = start_of_month.replace(year=start_of_month.year + 1, month=1)
        else:
            end_of_month = start_of_month.replace(month=start_of_month.month + 1)
        
        revenue_result = await db.execute(
            select(func.sum(Invoice.total)).where(
                (Invoice.status == InvoiceStatus.PAID) &
                (Invoice.paid_at >= start_of_month) &
                (Invoice.paid_at < end_of_month)
            )
        )
        revenue = revenue_result.scalar() or 0
        
        result.append(RevenueByMonth(month=month_str, revenue=revenue))
    
    return result


@router.get("/tenant-growth")
async def get_tenant_growth(
    months: int = Query(12, ge=1, le=24),
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get tenant growth by month"""
    result = []
    now = datetime.utcnow()
    
    for i in range(months - 1, -1, -1):
        month_date = now - timedelta(days=30 * i)
        month_str = month_date.strftime("%Y-%m")
        
        start_of_month = month_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if month_date.month == 12:
            end_of_month = start_of_month.replace(year=start_of_month.year + 1, month=1)
        else:
            end_of_month = start_of_month.replace(month=start_of_month.month + 1)
        
        # New tenants this month
        new_result = await db.execute(
            select(func.count(Tenant.id)).where(
                (Tenant.created_at >= start_of_month) &
                (Tenant.created_at < end_of_month)
            )
        )
        new_tenants = new_result.scalar()
        
        # Churned tenants (terminated this month)
        churned_result = await db.execute(
            select(func.count(Tenant.id)).where(
                (Tenant.status == TenantStatus.TERMINATED) &
                (Tenant.updated_at >= start_of_month) &
                (Tenant.updated_at < end_of_month)
            )
        )
        churned_tenants = churned_result.scalar()
        
        result.append(TenantGrowth(
            month=month_str,
            new_tenants=new_tenants,
            churned_tenants=churned_tenants,
        ))
    
    return result


@router.get("/subscription-breakdown")
async def get_subscription_breakdown(
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get breakdown of subscriptions by status and plan"""
    # By subscription status
    status_result = await db.execute(
        select(Tenant.subscription_status, func.count(Tenant.id))
        .group_by(Tenant.subscription_status)
    )
    by_status = {str(row[0].value): row[1] for row in status_result.fetchall()}
    
    # By plan
    plan_result = await db.execute(
        select(Plan.name, func.count(Tenant.id))
        .join(Tenant, Tenant.plan_id == Plan.id, isouter=True)
        .group_by(Plan.name)
    )
    by_plan = {row[0] or "No Plan": row[1] for row in plan_result.fetchall()}
    
    return {
        "by_status": by_status,
        "by_plan": by_plan,
    }


@router.get("/deployment-stats")
async def get_deployment_stats(
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get deployment statistics"""
    # Total deployments
    total_result = await db.execute(select(func.count(TenantDeployment.id)))
    total_deployments = total_result.scalar()
    
    # By status
    status_result = await db.execute(
        select(TenantDeployment.status, func.count(TenantDeployment.id))
        .group_by(TenantDeployment.status)
    )
    by_status = {row[0]: row[1] for row in status_result.fetchall()}
    
    # By app
    app_result = await db.execute(
        select(TenantDeployment.app_name, func.count(TenantDeployment.id))
        .group_by(TenantDeployment.app_name)
    )
    by_app = {row[0]: row[1] for row in app_result.fetchall()}
    
    return {
        "total_deployments": total_deployments,
        "by_status": by_status,
        "by_app": by_app,
    }


@router.get("/recent-activity")
async def get_recent_activity(
    limit: int = Query(20, ge=1, le=100),
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get recent platform activity"""
    from ..models import AuditLog
    
    result = await db.execute(
        select(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
    )
    logs = result.scalars().all()
    
    return [
        {
            "id": log.id,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "admin_user_id": log.admin_user_id,
            "status": log.status,
            "created_at": log.created_at,
        }
        for log in logs
    ]
