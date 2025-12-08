"""
EUSuite Public Backend - Payment Routes
Stripe payments and webhooks
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Payment, Subscription, PublicUser, PaymentStatus
from ..schemas import CreatePaymentIntent, PaymentResponse, BaseResponse
from ..auth import get_current_user
from ..services.payment_service import PaymentService
from ..config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("/create-payment-intent")
async def create_payment_intent(
    data: CreatePaymentIntent,
    current_user: PublicUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a Stripe payment intent."""
    subscription = db.query(Subscription).filter(
        Subscription.id == data.subscription_id,
        Subscription.user_id == current_user.id
    ).first()
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )
    
    # Calculate amount
    if data.amount:
        amount = data.amount
    else:
        # Use plan pricing
        plan = subscription.plan
        if subscription.billing_cycle == "yearly":
            amount = plan.price_yearly * subscription.user_count
        else:
            amount = plan.price_monthly * subscription.user_count
    
    if amount == 0:
        return {"client_secret": None, "message": "Free plan, no payment required"}
    
    payment_service = PaymentService(db)
    
    try:
        intent = payment_service.create_payment_intent(
            amount=amount,
            customer_id=subscription.stripe_customer_id,
            metadata={
                "subscription_id": str(subscription.id),
                "user_id": str(current_user.id),
                "plan_id": str(subscription.plan_id)
            }
        )
        
        # Create pending payment record
        payment = Payment(
            user_id=current_user.id,
            subscription_id=subscription.id,
            amount=amount,
            status=PaymentStatus.PENDING,
            stripe_payment_intent_id=intent.id
        )
        db.add(payment)
        db.commit()
        
        return {
            "client_secret": intent.client_secret,
            "payment_id": payment.id
        }
        
    except Exception as e:
        logger.error(f"Payment intent creation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create payment"
        )


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="Stripe-Signature"),
    db: Session = Depends(get_db)
):
    """Handle Stripe webhooks."""
    if not stripe_signature:
        raise HTTPException(status_code=400, detail="Missing signature")
    
    payload = await request.body()
    
    payment_service = PaymentService(db)
    
    try:
        result = payment_service.handle_webhook_event(payload, stripe_signature)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Webhook processing failed: {e}")
        raise HTTPException(status_code=500, detail="Webhook processing failed")


@router.get("/history", response_model=list[PaymentResponse])
async def get_payment_history(
    current_user: PublicUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get payment history for current user."""
    payments = db.query(Payment).filter(
        Payment.user_id == current_user.id
    ).order_by(Payment.created_at.desc()).all()
    
    return [PaymentResponse(**p.to_dict()) for p in payments]


@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get payment by ID."""
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.user_id == current_user.id
    ).first()
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    return PaymentResponse(**payment.to_dict())


@router.get("/{payment_id}/invoice")
async def get_invoice_url(
    payment_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get invoice URL for a payment."""
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.user_id == current_user.id
    ).first()
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    if payment.invoice_url:
        return {"invoice_url": payment.invoice_url}
    
    if payment.stripe_invoice_id:
        payment_service = PaymentService(db)
        url = payment_service.get_invoice_url(payment.stripe_invoice_id)
        
        # Cache for next time
        payment.invoice_url = url
        db.commit()
        
        return {"invoice_url": url}
    
    return {"invoice_url": None}
