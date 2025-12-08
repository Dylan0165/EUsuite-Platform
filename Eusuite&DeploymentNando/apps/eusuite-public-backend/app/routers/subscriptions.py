"""
EUSuite Public Backend - Subscription Routes
"""
import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Subscription, Plan, PublicUser, SubscriptionStatus
from ..schemas import (
    CreateSubscription, SubscriptionResponse, 
    UpdateSubscription, CancelSubscription, BaseResponse
)
from ..auth import get_current_user
from ..services.payment_service import PaymentService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


@router.post("", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED)
async def create_subscription(
    data: CreateSubscription,
    current_user: PublicUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new subscription for the current user."""
    # Get plan
    plan = db.query(Plan).filter(Plan.slug == data.plan_slug).first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan: {data.plan_slug}"
        )
    
    # Check for existing active subscription
    existing = db.query(Subscription).filter(
        Subscription.user_id == current_user.id,
        Subscription.status.in_([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL])
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have an active subscription"
        )
    
    # Create subscription with trial
    trial_days = 14
    subscription = Subscription(
        user_id=current_user.id,
        plan_id=plan.id,
        status=SubscriptionStatus.TRIAL,
        billing_cycle=data.billing_cycle,
        user_count=data.user_count,
        trial_ends_at=datetime.utcnow() + timedelta(days=trial_days),
        current_period_start=datetime.utcnow(),
        current_period_end=datetime.utcnow() + timedelta(days=trial_days)
    )
    
    db.add(subscription)
    db.commit()
    db.refresh(subscription)
    
    logger.info(f"Subscription created: {subscription.id} for user {current_user.email}")
    
    return SubscriptionResponse(**subscription.to_dict())


@router.get("/{subscription_id}", response_model=SubscriptionResponse)
async def get_subscription(
    subscription_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get subscription by ID."""
    subscription = db.query(Subscription).filter(
        Subscription.id == subscription_id,
        Subscription.user_id == current_user.id
    ).first()
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )
    
    return SubscriptionResponse(**subscription.to_dict())


@router.patch("/{subscription_id}", response_model=SubscriptionResponse)
async def update_subscription(
    subscription_id: int,
    data: UpdateSubscription,
    current_user: PublicUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update subscription (change plan, billing cycle, etc.)."""
    subscription = db.query(Subscription).filter(
        Subscription.id == subscription_id,
        Subscription.user_id == current_user.id
    ).first()
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )
    
    if data.plan_slug:
        plan = db.query(Plan).filter(Plan.slug == data.plan_slug).first()
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid plan: {data.plan_slug}"
            )
        subscription.plan_id = plan.id
    
    if data.billing_cycle:
        subscription.billing_cycle = data.billing_cycle
    
    if data.user_count:
        subscription.user_count = data.user_count
    
    db.commit()
    db.refresh(subscription)
    
    logger.info(f"Subscription updated: {subscription.id}")
    
    return SubscriptionResponse(**subscription.to_dict())


@router.post("/{subscription_id}/cancel", response_model=BaseResponse)
async def cancel_subscription(
    subscription_id: int,
    data: CancelSubscription,
    current_user: PublicUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel a subscription."""
    subscription = db.query(Subscription).filter(
        Subscription.id == subscription_id,
        Subscription.user_id == current_user.id
    ).first()
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )
    
    if data.cancel_immediately:
        subscription.status = SubscriptionStatus.CANCELLED
        subscription.current_period_end = datetime.utcnow()
    else:
        # Cancel at end of period
        subscription.status = SubscriptionStatus.CANCELLED
    
    subscription.cancelled_at = datetime.utcnow()
    subscription.cancel_reason = data.reason
    
    # Cancel in Stripe if applicable
    if subscription.stripe_subscription_id:
        payment_service = PaymentService(db)
        payment_service.cancel_subscription(subscription.stripe_subscription_id)
    
    db.commit()
    
    logger.info(f"Subscription cancelled: {subscription.id}")
    
    return BaseResponse(success=True, message="Subscription cancelled")


@router.post("/{subscription_id}/reactivate", response_model=SubscriptionResponse)
async def reactivate_subscription(
    subscription_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reactivate a cancelled subscription."""
    subscription = db.query(Subscription).filter(
        Subscription.id == subscription_id,
        Subscription.user_id == current_user.id,
        Subscription.status == SubscriptionStatus.CANCELLED
    ).first()
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cancelled subscription not found"
        )
    
    # Check if within cancellation grace period
    if subscription.current_period_end and subscription.current_period_end < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subscription has expired. Please create a new subscription."
        )
    
    subscription.status = SubscriptionStatus.ACTIVE
    subscription.cancelled_at = None
    subscription.cancel_reason = None
    
    db.commit()
    db.refresh(subscription)
    
    logger.info(f"Subscription reactivated: {subscription.id}")
    
    return SubscriptionResponse(**subscription.to_dict())
