"""
EUSuite Public Backend - Main Application
Marketing website API for registration, licensing, and payments
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import init_db
from .routers import (
    auth_router,
    users_router,
    companies_router,
    plans_router,
    subscriptions_router,
    payments_router,
    public_router
)

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
    logger.info("🚀 Starting EUSuite Public Backend...")
    init_db()
    logger.info("✅ Database initialized")
    yield
    logger.info("👋 Shutting down EUSuite Public Backend...")


app = FastAPI(
    title="EUSuite Public API",
    description="Marketing website API - Registration, Licensing, Payments",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(companies_router, prefix="/api")
app.include_router(plans_router, prefix="/api")
app.include_router(subscriptions_router, prefix="/api")
app.include_router(payments_router, prefix="/api")
app.include_router(public_router, prefix="/api")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "EUSuite Public API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for Kubernetes."""
    return {"status": "healthy", "service": "eusuite-public-backend"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
