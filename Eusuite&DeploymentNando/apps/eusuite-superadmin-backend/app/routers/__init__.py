from .auth import router as auth_router
from .admins import router as admins_router
from .plans import router as plans_router
from .tenants import router as tenants_router
from .deployments import router as deployments_router
from .invoices import router as invoices_router
from .tickets import router as tickets_router
from .audit import router as audit_router
from .dashboard import router as dashboard_router
from .settings import router as settings_router, public_router as public_settings_router

__all__ = [
    "auth_router",
    "admins_router",
    "plans_router",
    "tenants_router",
    "deployments_router",
    "invoices_router",
    "tickets_router",
    "audit_router",
    "dashboard_router",
    "settings_router",
    "public_settings_router",
]
