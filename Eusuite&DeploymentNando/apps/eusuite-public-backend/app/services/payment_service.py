"""
EUSuite Public Backend - Payment Service (Stripe Integration)
"""
import logging
from typing import Optional, Dict, Any
from datetime import datetime
import stripe
from sqlalchemy.orm import Session

from ..config import get_settings
from ..models import (
    Payment, Subscription, PublicUser, Company, Plan,
    PaymentStatus, SubscriptionStatus
)

logger = logging.getLogger(__name__)
settings = get_settings()

# Configure Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


class PaymentService:
    """Payment processing service with Stripe."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_customer(self, user: PublicUser, company: Optional[Company] = None) -> str:
        """Create Stripe customer."""
        try:
            customer = stripe.Customer.create(
                email=user.email,
                name=user.full_name,
                metadata={
                    "user_id": str(user.id),
                    "company_id": str(company.id) if company else "",
                    "company_name": company.name if company else "",
                }
            )
            return customer.id
        except stripe.error.StripeError as e:
            logger.error(f"Stripe customer creation failed: {e}")
            raise
    
    def create_subscription(
        self,
        customer_id: str,
        price_id: str,
        quantity: int = 1,
        trial_days: int = 14
    ) -> stripe.Subscription:
        """Create Stripe subscription."""
        try:
            subscription = stripe.Subscription.create(
                customer=customer_id,
                items=[{
                    "price": price_id,
                    "quantity": quantity
                }],
                trial_period_days=trial_days,
                payment_behavior="default_incomplete",
                expand=["latest_invoice.payment_intent"]
            )
            return subscription
        except stripe.error.StripeError as e:
            logger.error(f"Stripe subscription creation failed: {e}")
            raise
    
    def create_payment_intent(
        self,
        amount: int,
        currency: str = "eur",
        customer_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> stripe.PaymentIntent:
        """Create Stripe payment intent."""
        try:
            intent = stripe.PaymentIntent.create(
                amount=amount,
                currency=currency,
                customer=customer_id,
                metadata=metadata or {},
                automatic_payment_methods={"enabled": True}
            )
            return intent
        except stripe.error.StripeError as e:
            logger.error(f"Stripe payment intent creation failed: {e}")
            raise
    
    def cancel_subscription(self, stripe_subscription_id: str) -> bool:
        """Cancel Stripe subscription."""
        try:
            stripe.Subscription.delete(stripe_subscription_id)
            return True
        except stripe.error.StripeError as e:
            logger.error(f"Stripe subscription cancellation failed: {e}")
            return False
    
    def update_subscription(
        self,
        stripe_subscription_id: str,
        new_price_id: Optional[str] = None,
        quantity: Optional[int] = None
    ) -> stripe.Subscription:
        """Update Stripe subscription."""
        try:
            subscription = stripe.Subscription.retrieve(stripe_subscription_id)
            items = []
            
            if new_price_id or quantity:
                items.append({
                    "id": subscription["items"]["data"][0].id,
                    "price": new_price_id or subscription["items"]["data"][0].price.id,
                    "quantity": quantity or subscription["items"]["data"][0].quantity
                })
            
            updated = stripe.Subscription.modify(
                stripe_subscription_id,
                items=items if items else None
            )
            return updated
        except stripe.error.StripeError as e:
            logger.error(f"Stripe subscription update failed: {e}")
            raise
    
    def get_invoice_url(self, invoice_id: str) -> str:
        """Get Stripe invoice URL."""
        try:
            invoice = stripe.Invoice.retrieve(invoice_id)
            return invoice.hosted_invoice_url or ""
        except stripe.error.StripeError as e:
            logger.error(f"Stripe invoice retrieval failed: {e}")
            return ""
    
    def handle_webhook_event(self, payload: bytes, sig_header: str) -> Dict[str, Any]:
        """Handle Stripe webhook event."""
        try:
            event = stripe.Webhook.construct_event(
                payload,
                sig_header,
                settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError as e:
            logger.error(f"Invalid webhook payload: {e}")
            raise
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Invalid webhook signature: {e}")
            raise
        
        event_type = event["type"]
        data = event["data"]["object"]
        
        logger.info(f"Processing Stripe webhook: {event_type}")
        
        if event_type == "customer.subscription.created":
            self._handle_subscription_created(data)
        elif event_type == "customer.subscription.updated":
            self._handle_subscription_updated(data)
        elif event_type == "customer.subscription.deleted":
            self._handle_subscription_deleted(data)
        elif event_type == "invoice.paid":
            self._handle_invoice_paid(data)
        elif event_type == "invoice.payment_failed":
            self._handle_invoice_payment_failed(data)
        elif event_type == "payment_intent.succeeded":
            self._handle_payment_succeeded(data)
        elif event_type == "payment_intent.payment_failed":
            self._handle_payment_failed(data)
        
        return {"event_type": event_type, "processed": True}
    
    def _handle_subscription_created(self, data: Dict[str, Any]):
        """Handle subscription created webhook."""
        stripe_subscription_id = data["id"]
        customer_id = data["customer"]
        status = data["status"]
        
        # Find subscription in our DB
        subscription = self.db.query(Subscription).filter(
            Subscription.stripe_subscription_id == stripe_subscription_id
        ).first()
        
        if subscription:
            subscription.status = self._map_stripe_status(status)
            self.db.commit()
            logger.info(f"Subscription {subscription.id} created with status {status}")
    
    def _handle_subscription_updated(self, data: Dict[str, Any]):
        """Handle subscription updated webhook."""
        stripe_subscription_id = data["id"]
        status = data["status"]
        
        subscription = self.db.query(Subscription).filter(
            Subscription.stripe_subscription_id == stripe_subscription_id
        ).first()
        
        if subscription:
            subscription.status = self._map_stripe_status(status)
            
            # Update period dates
            if data.get("current_period_start"):
                subscription.current_period_start = datetime.fromtimestamp(data["current_period_start"])
            if data.get("current_period_end"):
                subscription.current_period_end = datetime.fromtimestamp(data["current_period_end"])
            
            self.db.commit()
            logger.info(f"Subscription {subscription.id} updated to status {status}")
    
    def _handle_subscription_deleted(self, data: Dict[str, Any]):
        """Handle subscription deleted webhook."""
        stripe_subscription_id = data["id"]
        
        subscription = self.db.query(Subscription).filter(
            Subscription.stripe_subscription_id == stripe_subscription_id
        ).first()
        
        if subscription:
            subscription.status = SubscriptionStatus.CANCELLED
            subscription.cancelled_at = datetime.utcnow()
            self.db.commit()
            logger.info(f"Subscription {subscription.id} cancelled")
    
    def _handle_invoice_paid(self, data: Dict[str, Any]):
        """Handle invoice paid webhook."""
        invoice_id = data["id"]
        subscription_id = data.get("subscription")
        amount = data["amount_paid"]
        
        subscription = self.db.query(Subscription).filter(
            Subscription.stripe_subscription_id == subscription_id
        ).first() if subscription_id else None
        
        # Create payment record
        payment = Payment(
            user_id=subscription.user_id if subscription else None,
            subscription_id=subscription.id if subscription else None,
            amount=amount,
            currency=data.get("currency", "eur").upper(),
            status=PaymentStatus.COMPLETED,
            stripe_invoice_id=invoice_id,
            invoice_number=data.get("number"),
            invoice_url=data.get("hosted_invoice_url"),
            paid_at=datetime.utcnow()
        )
        self.db.add(payment)
        self.db.commit()
        
        logger.info(f"Invoice {invoice_id} paid, payment {payment.id} created")
    
    def _handle_invoice_payment_failed(self, data: Dict[str, Any]):
        """Handle invoice payment failed webhook."""
        invoice_id = data["id"]
        subscription_id = data.get("subscription")
        
        subscription = self.db.query(Subscription).filter(
            Subscription.stripe_subscription_id == subscription_id
        ).first() if subscription_id else None
        
        if subscription:
            # After multiple failures, Stripe will cancel the subscription
            # For now, just log it
            logger.warning(f"Payment failed for subscription {subscription.id}, invoice {invoice_id}")
    
    def _handle_payment_succeeded(self, data: Dict[str, Any]):
        """Handle payment intent succeeded."""
        payment_intent_id = data["id"]
        amount = data["amount"]
        
        # Find and update payment if exists
        payment = self.db.query(Payment).filter(
            Payment.stripe_payment_intent_id == payment_intent_id
        ).first()
        
        if payment:
            payment.status = PaymentStatus.COMPLETED
            payment.paid_at = datetime.utcnow()
            self.db.commit()
            logger.info(f"Payment {payment.id} succeeded")
    
    def _handle_payment_failed(self, data: Dict[str, Any]):
        """Handle payment intent failed."""
        payment_intent_id = data["id"]
        
        payment = self.db.query(Payment).filter(
            Payment.stripe_payment_intent_id == payment_intent_id
        ).first()
        
        if payment:
            payment.status = PaymentStatus.FAILED
            self.db.commit()
            logger.warning(f"Payment {payment.id} failed")
    
    @staticmethod
    def _map_stripe_status(stripe_status: str) -> SubscriptionStatus:
        """Map Stripe subscription status to our status."""
        mapping = {
            "trialing": SubscriptionStatus.TRIAL,
            "active": SubscriptionStatus.ACTIVE,
            "canceled": SubscriptionStatus.CANCELLED,
            "incomplete": SubscriptionStatus.SUSPENDED,
            "incomplete_expired": SubscriptionStatus.EXPIRED,
            "past_due": SubscriptionStatus.SUSPENDED,
            "unpaid": SubscriptionStatus.SUSPENDED,
        }
        return mapping.get(stripe_status, SubscriptionStatus.SUSPENDED)
