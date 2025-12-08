from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
from sqlalchemy import select

from .config import settings
from .database import init_db, AsyncSessionLocal
from .models import AdminUser, AdminRole, Plan, PlanTier
from .auth import hash_password
from .routers import (
    auth_router, admins_router, plans_router, tenants_router,
    deployments_router, invoices_router, tickets_router, audit_router,
    dashboard_router, settings_router, public_settings_router
)
from .routes.kubernetes import router as kubernetes_router
from .services import port_manager

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle management"""
    logger.info("Starting EUSuite Superadmin Backend...")
    
    # Initialize database
    await init_db()
    logger.info("Database initialized")
    
    # Connect Redis port manager
    await port_manager.connect()
    logger.info("Port manager connected")
    
    # Create default superadmin if not exists
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(AdminUser).where(AdminUser.email == settings.SUPERADMIN_EMAIL)
        )
        if not result.scalar_one_or_none():
            superadmin = AdminUser(
                email=settings.SUPERADMIN_EMAIL,
                hashed_password=hash_password(settings.SUPERADMIN_PASSWORD),
                first_name="Super",
                last_name="Admin",
                role=AdminRole.SUPERADMIN,
                is_active=True,
            )
            db.add(superadmin)
            await db.commit()
            logger.info(f"Created default superadmin: {settings.SUPERADMIN_EMAIL}")
        
        # Create default plans if not exist
        result = await db.execute(select(Plan).limit(1))
        if not result.scalar_one_or_none():
            default_plans = [
                Plan(
                    name="Free",
                    slug="free",
                    tier=PlanTier.FREE,
                    description="Perfect for trying out EUSuite",
                    price_monthly=0,
                    price_yearly=0,
                    max_users=3,
                    max_storage_gb=5,
                    max_apps=2,
                    features=["Basic support", "2 apps", "5GB storage"],
                    is_active=True,
                    sort_order=0,
                ),
                Plan(
                    name="Starter",
                    slug="starter",
                    tier=PlanTier.STARTER,
                    description="Great for small teams",
                    price_monthly=29,
                    price_yearly=290,
                    max_users=10,
                    max_storage_gb=50,
                    max_apps=4,
                    features=["Email support", "All apps", "50GB storage", "Custom branding"],
                    is_active=True,
                    is_featured=True,
                    sort_order=1,
                ),
                Plan(
                    name="Professional",
                    slug="professional",
                    tier=PlanTier.PROFESSIONAL,
                    description="For growing businesses",
                    price_monthly=79,
                    price_yearly=790,
                    max_users=50,
                    max_storage_gb=200,
                    max_apps=4,
                    features=["Priority support", "All apps", "200GB storage", "Custom domain", "Advanced analytics"],
                    is_active=True,
                    sort_order=2,
                ),
                Plan(
                    name="Enterprise",
                    slug="enterprise",
                    tier=PlanTier.ENTERPRISE,
                    description="For large organizations",
                    price_monthly=199,
                    price_yearly=1990,
                    max_users=0,  # Unlimited
                    max_storage_gb=1000,
                    max_apps=4,
                    features=["24/7 support", "All apps", "1TB storage", "Custom domain", "SSO", "SLA", "Dedicated support"],
                    is_active=True,
                    sort_order=3,
                ),
            ]
            for plan in default_plans:
                db.add(plan)
            await db.commit()
            logger.info("Created default plans")
    
    logger.info("EUSuite Superadmin Backend started successfully")
    
    yield
    
    # Cleanup
    await port_manager.disconnect()
    logger.info("EUSuite Superadmin Backend shutdown complete")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Superadmin portal for managing the EUSuite multi-tenant platform",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "eusuite-superadmin-backend"}


# Ready check endpoint
@app.get("/ready")
async def ready_check():
    return {"status": "ready"}


# Include routers
app.include_router(auth_router, prefix="/api")
app.include_router(admins_router, prefix="/api")
app.include_router(plans_router, prefix="/api")
app.include_router(tenants_router, prefix="/api")
app.include_router(deployments_router, prefix="/api")
app.include_router(invoices_router, prefix="/api")
app.include_router(tickets_router, prefix="/api")
app.include_router(audit_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(settings_router, prefix="/api")
app.include_router(public_settings_router, prefix="/api")
app.include_router(kubernetes_router, prefix="/api")


# Root endpoint
@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
    }
