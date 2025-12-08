from app.routers.users import router as users_router
from app.routers.branding import router as branding_router
from app.routers.deployments import router as deployments_router
from app.routers.departments import router as departments_router
from app.routers.storage import router as storage_router
from app.routers.settings import router as settings_router
from app.routers.audit import router as audit_router
from app.routers.notifications import router as notifications_router

__all__ = [
    "users_router",
    "branding_router",
    "deployments_router",
    "departments_router",
    "storage_router",
    "settings_router",
    "audit_router",
    "notifications_router",
]
