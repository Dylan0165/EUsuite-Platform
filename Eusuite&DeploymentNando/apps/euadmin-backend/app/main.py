"""
EUAdmin Backend - Admin Monitoring and Control Dashboard
Multi-tenant platform for EUSuite ecosystem management.
"""
import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .tenant_database import init_tenant_db

# Import existing routers
from .routers import auth, users, system

# Import new tenant management routers
from .routers import companies, company_users, branding, storage_policy, deployments, platform

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle events."""
    logger.info("Starting EUAdmin Backend...")
    logger.info(f"Admin email: {settings.ADMIN_EMAIL}")
    logger.info(f"Kubernetes namespace: {settings.KUBE_NAMESPACE}")
    
    # Initialize tenant database
    init_tenant_db()
    logger.info("Tenant database initialized")
    
    yield
    logger.info("Shutting down EUAdmin Backend...")


app = FastAPI(
    title="EUAdmin API",
    description="Multi-tenant Admin Platform for EUSuite - Manage companies, users, deployments, branding, and storage policies",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS + [
        "http://localhost:5180",
        "http://192.168.124.50:30090",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with /api prefix
# Existing monitoring routers
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(system.router, prefix="/api")

# Multi-tenant platform routers
app.include_router(companies.router, prefix="/api")
app.include_router(company_users.router, prefix="/api")
app.include_router(branding.router, prefix="/api")
app.include_router(storage_policy.router, prefix="/api")
app.include_router(deployments.router, prefix="/api")
app.include_router(platform.router, prefix="/api")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "EUAdmin",
        "version": "2.0.0",
        "description": "Multi-tenant Admin Platform for EUSuite",
        "docs": "/docs",
        "features": [
            "Company/Tenant Management",
            "User Management",
            "Branding Engine",
            "Storage Policies",
            "Kubernetes Deployments",
            "Real-time Deployment Logs"
        ]
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for Kubernetes."""
    return {"status": "healthy", "service": "euadmin-backend"}


@app.get("/api/health")
async def api_health_check():
    """Health check endpoint (alternative path)."""
    return {"status": "healthy", "service": "euadmin-backend"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
