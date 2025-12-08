from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.database import engine, Base
from app.routers import (
    users_router,
    branding_router,
    deployments_router,
    departments_router,
    storage_router,
    settings_router,
    audit_router,
    notifications_router,
)


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    logger.info("Starting EUSuite Company Admin Backend...")
    
    # Create database tables (in production, use Alembic migrations)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    logger.info("Database tables created/verified")
    
    yield
    
    # Shutdown
    logger.info("Shutting down EUSuite Company Admin Backend...")
    await engine.dispose()


# Create FastAPI application
app = FastAPI(
    title="EUSuite Company Admin API",
    description="Company administration portal API for EUSuite multi-tenant platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Tenant extraction middleware
@app.middleware("http")
async def tenant_middleware(request: Request, call_next):
    """Extract tenant from subdomain or header."""
    # Get tenant from header (for API calls) or subdomain
    tenant_id = request.headers.get("X-Tenant-ID")
    
    if not tenant_id:
        # Try to extract from host subdomain
        host = request.headers.get("host", "")
        if ".company.eusuite.eu" in host:
            tenant_id = host.split(".company.eusuite.eu")[0]
        elif ".company.eusuite.local" in host:
            tenant_id = host.split(".company.eusuite.local")[0]
    
    # Store tenant in request state
    request.state.tenant_id = tenant_id
    
    response = await call_next(request)
    return response


# Exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )


# Include routers
app.include_router(users_router, prefix="/api/v1")
app.include_router(branding_router, prefix="/api/v1")
app.include_router(deployments_router, prefix="/api/v1")
app.include_router(departments_router, prefix="/api/v1")
app.include_router(storage_router, prefix="/api/v1")
app.include_router(settings_router, prefix="/api/v1")
app.include_router(audit_router, prefix="/api/v1")
app.include_router(notifications_router, prefix="/api/v1")


# Health check endpoints
@app.get("/health")
async def health_check():
    """Basic health check endpoint."""
    return {"status": "healthy", "service": "eusuite-company-backend"}


@app.get("/health/ready")
async def readiness_check():
    """Readiness check - verifies database connectivity."""
    try:
        from sqlalchemy import text
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "ready", "database": "connected"}
    except Exception as e:
        logger.error(f"Database readiness check failed: {e}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "not ready", "database": "disconnected"},
        )


@app.get("/health/live")
async def liveness_check():
    """Liveness check - basic service availability."""
    return {"status": "alive"}


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "service": "EUSuite Company Admin API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }


# API info endpoint
@app.get("/api/v1")
async def api_info():
    """API version info."""
    return {
        "version": "1.0.0",
        "endpoints": {
            "users": "/api/v1/users",
            "branding": "/api/v1/branding",
            "deployments": "/api/v1/deployments",
            "departments": "/api/v1/departments",
            "storage": "/api/v1/storage",
            "settings": "/api/v1/settings",
            "audit": "/api/v1/audit",
            "notifications": "/api/v1/notifications",
        },
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8001,
        reload=settings.DEBUG,
        log_level="info",
    )
