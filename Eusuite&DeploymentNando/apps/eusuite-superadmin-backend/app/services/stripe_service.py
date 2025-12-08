import stripe
from typing import Optional, Dict, Any, List
import logging
from datetime import datetime, timedelta
from ..config import settings

logger = logging.getLogger(__name__)

# Configure Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


class StripeService:
    """Service for Stripe payment integration"""
    
    async def create_customer(
        self,
        email: str,
        name: str,
        metadata: Dict[str, str] = None,
    ) -> Optional[str]:
        """Create a Stripe customer"""
        try:
            customer = stripe.Customer.create(
                email=email,
                name=name,
                metadata=metadata or {},
            )
            logger.info(f"Created Stripe customer: {customer.id}")
            return customer.id
        except stripe.error.StripeError as e:
            logger.error(f"Failed to create Stripe customer: {e}")
            return None
    
    async def update_customer(
        self,
        customer_id: str,
        email: Optional[str] = None,
        name: Optional[str] = None,
        metadata: Dict[str, str] = None,
    ) -> bool:
        """Update a Stripe customer"""
        try:
            update_data = {}
            if email:
                update_data["email"] = email
            if name:
                update_data["name"] = name
            if metadata:
                update_data["metadata"] = metadata
            
            stripe.Customer.modify(customer_id, **update_data)
            logger.info(f"Updated Stripe customer: {customer_id}")
            return True
        except stripe.error.StripeError as e:
            logger.error(f"Failed to update Stripe customer: {e}")
            return False
    
    async def delete_customer(self, customer_id: str) -> bool:
        """Delete a Stripe customer"""
        try:
            stripe.Customer.delete(customer_id)
            logger.info(f"Deleted Stripe customer: {customer_id}")
            return True
        except stripe.error.StripeError as e:
            logger.error(f"Failed to delete Stripe customer: {e}")
            return False
    
    async def create_subscription(
        self,
        customer_id: str,
        price_id: str,
        trial_days: int = 14,
        metadata: Dict[str, str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Create a subscription for a customer"""
        try:
            subscription_data = {
                "customer": customer_id,
                "items": [{"price": price_id}],
                "metadata": metadata or {},
                "payment_behavior": "default_incomplete",
                "expand": ["latest_invoice.payment_intent"],
            }
            
            if trial_days > 0:
                subscription_data["trial_period_days"] = trial_days
            
            subscription = stripe.Subscription.create(**subscription_data)
            
            logger.info(f"Created subscription: {subscription.id}")
            return {
                "subscription_id": subscription.id,
                "status": subscription.status,
                "trial_end": datetime.fromtimestamp(subscription.trial_end) if subscription.trial_end else None,
                "current_period_end": datetime.fromtimestamp(subscription.current_period_end),
                "client_secret": subscription.latest_invoice.payment_intent.client_secret if subscription.latest_invoice and subscription.latest_invoice.payment_intent else None,
            }
        except stripe.error.StripeError as e:
            logger.error(f"Failed to create subscription: {e}")
            return None
    
    async def cancel_subscription(
        self,
        subscription_id: str,
        at_period_end: bool = True,
    ) -> bool:
        """Cancel a subscription"""
        try:
            if at_period_end:
                stripe.Subscription.modify(
                    subscription_id,
                    cancel_at_period_end=True,
                )
            else:
                stripe.Subscription.delete(subscription_id)
            
            logger.info(f"Cancelled subscription: {subscription_id}")
            return True
        except stripe.error.StripeError as e:
            logger.error(f"Failed to cancel subscription: {e}")
            return False
    
    async def update_subscription(
        self,
        subscription_id: str,
        price_id: str,
        proration_behavior: str = "create_prorations",
    ) -> bool:
        """Update subscription to a new plan"""
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
            
            stripe.Subscription.modify(
                subscription_id,
                items=[{
                    "id": subscription["items"]["data"][0].id,
                    "price": price_id,
                }],
                proration_behavior=proration_behavior,
            )
            
            logger.info(f"Updated subscription {subscription_id} to price {price_id}")
            return True
        except stripe.error.StripeError as e:
            logger.error(f"Failed to update subscription: {e}")
            return False
    
    async def get_subscription(self, subscription_id: str) -> Optional[Dict[str, Any]]:
        """Get subscription details"""
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
            return {
                "id": subscription.id,
                "status": subscription.status,
                "current_period_start": datetime.fromtimestamp(subscription.current_period_start),
                "current_period_end": datetime.fromtimestamp(subscription.current_period_end),
                "cancel_at_period_end": subscription.cancel_at_period_end,
                "trial_end": datetime.fromtimestamp(subscription.trial_end) if subscription.trial_end else None,
            }
        except stripe.error.StripeError as e:
            logger.error(f"Failed to get subscription: {e}")
            return None
    
    async def create_checkout_session(
        self,
        customer_id: str,
        price_id: str,
        success_url: str,
        cancel_url: str,
        trial_days: int = 14,
        metadata: Dict[str, str] = None,
    ) -> Optional[str]:
        """Create a Stripe Checkout session"""
        try:
            session_data = {
                "customer": customer_id,
                "payment_method_types": ["card", "ideal", "bancontact"],
                "line_items": [{"price": price_id, "quantity": 1}],
                "mode": "subscription",
                "success_url": success_url,
                "cancel_url": cancel_url,
                "metadata": metadata or {},
            }
            
            if trial_days > 0:
                session_data["subscription_data"] = {
                    "trial_period_days": trial_days,
                }
            
            session = stripe.checkout.Session.create(**session_data)
            logger.info(f"Created checkout session: {session.id}")
            return session.url
        except stripe.error.StripeError as e:
            logger.error(f"Failed to create checkout session: {e}")
            return None
    
    async def create_billing_portal_session(
        self,
        customer_id: str,
        return_url: str,
    ) -> Optional[str]:
        """Create a Stripe Billing Portal session"""
        try:
            session = stripe.billing_portal.Session.create(
                customer=customer_id,
                return_url=return_url,
            )
            logger.info(f"Created billing portal session for customer: {customer_id}")
            return session.url
        except stripe.error.StripeError as e:
            logger.error(f"Failed to create billing portal session: {e}")
            return None
    
    async def list_invoices(
        self,
        customer_id: str,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """List invoices for a customer"""
        try:
            invoices = stripe.Invoice.list(customer=customer_id, limit=limit)
            return [
                {
                    "id": inv.id,
                    "number": inv.number,
                    "status": inv.status,
                    "amount_due": inv.amount_due / 100,
                    "amount_paid": inv.amount_paid / 100,
                    "currency": inv.currency.upper(),
                    "created": datetime.fromtimestamp(inv.created),
                    "due_date": datetime.fromtimestamp(inv.due_date) if inv.due_date else None,
                    "paid_at": datetime.fromtimestamp(inv.status_transitions.paid_at) if inv.status_transitions.paid_at else None,
                    "invoice_pdf": inv.invoice_pdf,
                }
                for inv in invoices.data
            ]
        except stripe.error.StripeError as e:
            logger.error(f"Failed to list invoices: {e}")
            return []
    
    async def create_product(
        self,
        name: str,
        description: str = None,
        metadata: Dict[str, str] = None,
    ) -> Optional[str]:
        """Create a Stripe product"""
        try:
            product = stripe.Product.create(
                name=name,
                description=description,
                metadata=metadata or {},
            )
            logger.info(f"Created Stripe product: {product.id}")
            return product.id
        except stripe.error.StripeError as e:
            logger.error(f"Failed to create Stripe product: {e}")
            return None
    
    async def create_price(
        self,
        product_id: str,
        amount: int,  # In cents
        currency: str = "eur",
        interval: str = "month",
        metadata: Dict[str, str] = None,
    ) -> Optional[str]:
        """Create a Stripe price"""
        try:
            price = stripe.Price.create(
                product=product_id,
                unit_amount=amount,
                currency=currency,
                recurring={"interval": interval},
                metadata=metadata or {},
            )
            logger.info(f"Created Stripe price: {price.id}")
            return price.id
        except stripe.error.StripeError as e:
            logger.error(f"Failed to create Stripe price: {e}")
            return None
    
    def construct_webhook_event(
        self,
        payload: bytes,
        signature: str,
    ) -> Optional[stripe.Event]:
        """Construct and verify a webhook event"""
        try:
            event = stripe.Webhook.construct_event(
                payload,
                signature,
                settings.STRIPE_WEBHOOK_SECRET,
            )
            return event
        except (ValueError, stripe.error.SignatureVerificationError) as e:
            logger.error(f"Failed to verify webhook: {e}")
            return None


# Global instance
stripe_service = StripeService()
