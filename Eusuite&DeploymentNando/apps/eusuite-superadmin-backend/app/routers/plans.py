from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from ..database import get_db
from ..models import Plan, PlanTier, AdminUser
from ..schemas import PlanCreate, PlanUpdate, PlanResponse, PaginatedResponse
from ..auth import get_current_admin, require_admin, require_superadmin
from ..services import stripe_service

router = APIRouter(prefix="/plans", tags=["Plans"])


@router.get("", response_model=PaginatedResponse)
async def list_plans(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    tier: Optional[PlanTier] = None,
    is_active: Optional[bool] = None,
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all subscription plans"""
    query = select(Plan)
    count_query = select(func.count(Plan.id))
    
    if tier:
        query = query.where(Plan.tier == tier)
        count_query = count_query.where(Plan.tier == tier)
    
    if is_active is not None:
        query = query.where(Plan.is_active == is_active)
        count_query = count_query.where(Plan.is_active == is_active)
    
    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Get paginated results
    offset = (page - 1) * page_size
    query = query.order_by(Plan.sort_order, Plan.price_monthly).offset(offset).limit(page_size)
    result = await db.execute(query)
    plans = result.scalars().all()
    
    return PaginatedResponse(
        items=[PlanResponse.model_validate(p) for p in plans],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.post("", response_model=PlanResponse, status_code=status.HTTP_201_CREATED)
async def create_plan(
    plan_data: PlanCreate,
    current_admin: AdminUser = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new subscription plan (superadmin only)"""
    # Check if slug already exists
    result = await db.execute(
        select(Plan).where(Plan.slug == plan_data.slug)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Plan slug already exists",
        )
    
    # Create Stripe product if not provided
    stripe_product_id = plan_data.stripe_product_id
    if not stripe_product_id and stripe_service:
        stripe_product_id = await stripe_service.create_product(
            name=plan_data.name,
            description=plan_data.description,
            metadata={"slug": plan_data.slug, "tier": plan_data.tier.value},
        )
    
    # Create Stripe prices if product exists and prices not provided
    stripe_monthly_price_id = plan_data.stripe_monthly_price_id
    stripe_yearly_price_id = plan_data.stripe_yearly_price_id
    
    if stripe_product_id and plan_data.price_monthly > 0:
        if not stripe_monthly_price_id:
            stripe_monthly_price_id = await stripe_service.create_price(
                product_id=stripe_product_id,
                amount=int(plan_data.price_monthly * 100),
                currency=plan_data.currency.lower(),
                interval="month",
            )
        if not stripe_yearly_price_id and plan_data.price_yearly > 0:
            stripe_yearly_price_id = await stripe_service.create_price(
                product_id=stripe_product_id,
                amount=int(plan_data.price_yearly * 100),
                currency=plan_data.currency.lower(),
                interval="year",
            )
    
    plan = Plan(
        name=plan_data.name,
        slug=plan_data.slug,
        tier=plan_data.tier,
        description=plan_data.description,
        price_monthly=plan_data.price_monthly,
        price_yearly=plan_data.price_yearly,
        currency=plan_data.currency,
        max_users=plan_data.max_users,
        max_storage_gb=plan_data.max_storage_gb,
        max_apps=plan_data.max_apps,
        features=plan_data.features,
        stripe_product_id=stripe_product_id,
        stripe_monthly_price_id=stripe_monthly_price_id,
        stripe_yearly_price_id=stripe_yearly_price_id,
    )
    
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    
    return plan


@router.get("/{plan_id}", response_model=PlanResponse)
async def get_plan(
    plan_id: int,
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get plan by ID"""
    result = await db.execute(
        select(Plan).where(Plan.id == plan_id)
    )
    plan = result.scalar_one_or_none()
    
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found",
        )
    
    return plan


@router.patch("/{plan_id}", response_model=PlanResponse)
async def update_plan(
    plan_id: int,
    update_data: PlanUpdate,
    current_admin: AdminUser = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    """Update a subscription plan (superadmin only)"""
    result = await db.execute(
        select(Plan).where(Plan.id == plan_id)
    )
    plan = result.scalar_one_or_none()
    
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found",
        )
    
    if update_data.name is not None:
        plan.name = update_data.name
    if update_data.description is not None:
        plan.description = update_data.description
    if update_data.price_monthly is not None:
        plan.price_monthly = update_data.price_monthly
    if update_data.price_yearly is not None:
        plan.price_yearly = update_data.price_yearly
    if update_data.max_users is not None:
        plan.max_users = update_data.max_users
    if update_data.max_storage_gb is not None:
        plan.max_storage_gb = update_data.max_storage_gb
    if update_data.max_apps is not None:
        plan.max_apps = update_data.max_apps
    if update_data.features is not None:
        plan.features = update_data.features
    if update_data.is_active is not None:
        plan.is_active = update_data.is_active
    if update_data.is_featured is not None:
        plan.is_featured = update_data.is_featured
    if update_data.sort_order is not None:
        plan.sort_order = update_data.sort_order
    
    await db.commit()
    await db.refresh(plan)
    
    return plan


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_plan(
    plan_id: int,
    current_admin: AdminUser = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a subscription plan (superadmin only)"""
    result = await db.execute(
        select(Plan).where(Plan.id == plan_id)
    )
    plan = result.scalar_one_or_none()
    
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found",
        )
    
    # Check if any tenants are using this plan
    from ..models import Tenant
    tenant_result = await db.execute(
        select(func.count(Tenant.id)).where(Tenant.plan_id == plan_id)
    )
    tenant_count = tenant_result.scalar()
    
    if tenant_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete plan with {tenant_count} active tenants",
        )
    
    await db.delete(plan)
    await db.commit()
